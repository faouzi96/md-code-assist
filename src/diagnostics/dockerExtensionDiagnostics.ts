import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import type { CodeBlock } from '../parser/types';

const DOCKER_EXTENSION_ID = 'ms-azuretools.vscode-docker';
const DIAG_TIMEOUT_MS = 8_000;

export function isDockerExtensionAvailable(): boolean {
  const ext = vscode.extensions.getExtension(DOCKER_EXTENSION_ID);
  return ext !== undefined && ext.isActive;
}

/**
 * Run Dockerfile diagnostics on a single code block by delegating to the
 * ms-azuretools.vscode-docker VS Code extension (powered by Hadolint internally).
 *
 * Returns diagnostics in block-relative line coordinates (line 0 = first content line).
 */
export async function diagnoseDockerBlockWithExtension(
  block: CodeBlock,
): Promise<vscode.Diagnostic[]> {
  // Named "Dockerfile" so VS Code assigns the dockerfile language mode,
  // which causes the Docker extension's Hadolint integration to activate.
  const uri = vscode.Uri.parse(`untitled:__mdca_docker_tmp__Dockerfile`);

  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, {
      preserveFocus: true,
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
    });

    // Subscribe BEFORE editing so a fast response isn't missed.
    const diagPromise = waitForDiagnostics(uri, DIAG_TIMEOUT_MS);

    await editor.edit((eb) => {
      const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
      eb.replace(fullRange, block.content);
    });

    const diags = await diagPromise;

    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

    // Filter to diagnostics produced by the Docker extension only.
    // The extension sets source to 'docker' or 'hadolint'.
    return diags.filter((d) => {
      const src = (d.source ?? '').toLowerCase();
      return src === 'docker' || src === 'hadolint';
    });
  } catch (err) {
    Logger.warn(`Docker extension diagnostics failed: ${String(err)}`);
    return [];
  }
}

/**
 * Returns a promise that resolves with the current diagnostics for `uri` as soon as
 * the Docker extension fires onDidChangeDiagnostics for that URI, or after
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
