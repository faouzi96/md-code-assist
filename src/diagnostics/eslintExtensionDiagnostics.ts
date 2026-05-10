import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import type { CodeBlock } from '../parser/types';

const ESLINT_EXTENSION_ID = 'dbaeumer.vscode-eslint';
const DIAG_TIMEOUT_MS = 8_000;

/**
 * ESLint rules that are always false positives for fenced code block snippets.
 * Snippets lack import statements, don't always use declared variables, and
 * freely reference browser/Node globals that aren't in scope.
 */
const SUPPRESSED_RULES = new Set([
  'no-undef',
  'no-unused-vars',
  '@typescript-eslint/no-unused-vars',
  'import/no-unresolved',
  'import/no-extraneous-dependencies',
  'n/no-missing-require',
  'node/no-missing-require',
  'no-console',
]);

export function isEslintExtensionAvailable(): boolean {
  const ext = vscode.extensions.getExtension(ESLINT_EXTENSION_ID);
  return ext !== undefined && ext.isActive;
}

/**
 * Run ESLint diagnostics on a single JS/TS code block by delegating to the
 * dbaeumer.vscode-eslint VS Code extension (no system ESLint install required
 * beyond what the workspace already uses).
 *
 * Returns diagnostics in block-relative line coordinates (line 0 = first content line).
 *
 * Design notes:
 * - Uses a per-language untitled URI so VS Code associates the right language mode.
 * - Filters diagnostics to `source === 'eslint'` to ignore other providers.
 * - Suppresses rules that are always false positives for Markdown code snippets.
 * - Returns an empty array when the extension is inactive or no ESLint config is
 *   found in the workspace — the caller should fall back to `node --check`.
 */
export async function diagnoseJsTsBlockWithExtension(
  block: CodeBlock,
): Promise<vscode.Diagnostic[]> {
  const ext = block.language === 'typescript' ? '.ts' : '.js';
  const tmpName = `__mdca_eslint_tmp__${ext}`;
  const uri = vscode.Uri.parse(`untitled:${tmpName}`);

  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, {
      preserveFocus: true,
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });

    // Subscribe BEFORE editing so a fast ESLint response isn't missed.
    const diagPromise = waitForDiagnostics(uri, DIAG_TIMEOUT_MS);

    await editor.edit((eb) => {
      const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
      eb.replace(fullRange, block.content);
    });

    const diags = await diagPromise;

    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

    return diags
      .filter((d) => d.source === 'eslint')
      .filter((d) => {
        const code = String(
          typeof d.code === 'object' && d.code !== null ? d.code.value : (d.code ?? ''),
        );
        return !SUPPRESSED_RULES.has(code);
      });
  } catch (err) {
    Logger.warn(`ESLint extension diagnostics failed: ${String(err)}`);
    return [];
  }
}

/**
 * Returns a promise that resolves with the current diagnostics for `uri` as soon as
 * the ESLint extension fires onDidChangeDiagnostics for that URI, or after
 * `timeoutMs` milliseconds (whichever comes first).
 */
function waitForDiagnostics(
  uri: vscode.Uri,
  timeoutMs: number,
): Promise<readonly vscode.Diagnostic[]> {
  return new Promise((resolve) => {
    let settled = false;

    const done = (diags: readonly vscode.Diagnostic[]): void => {
      if (!settled) {
        settled = true;
        sub.dispose();
        clearTimeout(timer);
        resolve(diags);
      }
    };

    const timer = setTimeout(() => done(vscode.languages.getDiagnostics(uri)), timeoutMs);

    const sub = vscode.languages.onDidChangeDiagnostics((e) => {
      if (e.uris.some((u) => u.toString() === uri.toString())) {
        done(vscode.languages.getDiagnostics(uri));
      }
    });
  });
}

/**
 * Attempt to auto-install the ESLint extension if it is not present.
 * Returns true if the extension is available after the attempt.
 */
export async function ensureEslintExtension(): Promise<boolean> {
  if (vscode.extensions.getExtension(ESLINT_EXTENSION_ID)) {
    return true;
  }

  Logger.info('dbaeumer.vscode-eslint not found — attempting auto-install...');

  try {
    await vscode.commands.executeCommand(
      'workbench.extensions.installExtension',
      ESLINT_EXTENSION_ID,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    const installed = vscode.extensions.getExtension(ESLINT_EXTENSION_ID) !== undefined;
    if (installed) {
      Logger.info('dbaeumer.vscode-eslint installed successfully.');
    } else {
      Logger.warn('dbaeumer.vscode-eslint install completed but extension not yet active.');
    }
    return installed;
  } catch (err) {
    Logger.warn(`Failed to auto-install dbaeumer.vscode-eslint: ${String(err)}`);
    return false;
  }
}
