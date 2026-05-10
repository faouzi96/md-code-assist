import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import type { CodeBlock } from '../parser/types';

const SHELLCHECK_EXTENSION_ID = 'timonwong.shellcheck';
const DIAG_TIMEOUT_MS = 8_000;

/**
 * SC2148: "Tips depend on target shell and target shell is unknown — add a shebang."
 * Code snippets in Markdown won't have a shebang, so suppress this false positive.
 */
const SUPPRESSED_CODES = new Set(['2148']);

export function isShellCheckExtensionAvailable(): boolean {
  const ext = vscode.extensions.getExtension(SHELLCHECK_EXTENSION_ID);
  return ext !== undefined && ext.isActive;
}

/**
 * Run ShellCheck diagnostics on a single shell code block by delegating to the
 * timonwong.shellcheck VS Code extension (no system shellcheck install required).
 *
 * Returns diagnostics in block-relative line coordinates (line 0 = first content line).
 */
export async function diagnoseShellBlockWithExtension(
  block: CodeBlock,
): Promise<vscode.Diagnostic[]> {
  // Use a stable untitled URI so VS Code reuses the same document slot across calls.
  const uri = vscode.Uri.parse(`untitled:__mdca_shellcheck_tmp__.sh`);

  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, {
      preserveFocus: true,
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });

    // Subscribe to diagnostic changes BEFORE editing so we don't miss a fast response.
    const diagPromise = waitForDiagnostics(uri, DIAG_TIMEOUT_MS);

    await editor.edit((eb) => {
      const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
      eb.replace(fullRange, block.content);
    });

    const diags = await diagPromise;

    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

    return diags.filter((d) => {
      // d.code can be a number, string, or { value, target } object
      const code = String(
        typeof d.code === 'object' && d.code !== null ? d.code.value : (d.code ?? ''),
      );
      return !SUPPRESSED_CODES.has(code);
    });
  } catch (err) {
    Logger.warn(`ShellCheck extension diagnostics failed: ${String(err)}`);
    return [];
  }
}

/**
 * Returns a promise that resolves with the current diagnostics for `uri` as soon as
 * the ShellCheck extension fires onDidChangeDiagnostics for that URI, or after
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
 * Attempt to auto-install the ShellCheck extension if it is not present.
 * Returns true if the extension is available after the attempt.
 */
export async function ensureShellCheckExtension(): Promise<boolean> {
  if (vscode.extensions.getExtension(SHELLCHECK_EXTENSION_ID)) {
    return true;
  }

  Logger.info('timonwong.shellcheck not found — attempting auto-install...');

  try {
    await vscode.commands.executeCommand(
      'workbench.extensions.installExtension',
      SHELLCHECK_EXTENSION_ID,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    const installed = vscode.extensions.getExtension(SHELLCHECK_EXTENSION_ID) !== undefined;
    if (installed) {
      Logger.info('timonwong.shellcheck installed successfully.');
    } else {
      Logger.warn('timonwong.shellcheck install completed but extension not yet active.');
    }
    return installed;
  } catch (err) {
    Logger.warn(`Failed to auto-install timonwong.shellcheck: ${String(err)}`);
    return false;
  }
}
