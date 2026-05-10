import * as vscode from 'vscode';
import type { IFormatter, FormatOptions, FormatResult } from './types';
import { Logger } from '../utils/logger';

const DOCKER_EXTENSION_ID = 'ms-azuretools.vscode-docker';

/**
 * Formats Dockerfile code blocks by delegating to the ms-azuretools.vscode-docker
 * VS Code extension. No system Docker installation is required for formatting —
 * the extension ships its own Dockerfile language server.
 */
export class DockerExtensionFormatter implements IFormatter {
  readonly supportedLanguages: readonly string[] = ['dockerfile'];

  isAvailable(): Promise<boolean> {
    const ext = vscode.extensions.getExtension(DOCKER_EXTENSION_ID);
    return Promise.resolve(ext !== undefined && ext.isActive);
  }

  async format(code: string, _options: FormatOptions): Promise<FormatResult> {
    try {
      // Open a temp untitled document named "Dockerfile" so VS Code associates
      // the dockerfile language mode, causing the Docker extension to register
      // as its formatter.
      const uri = vscode.Uri.parse(`untitled:__mdca_docker_tmp__Dockerfile`);
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc, {
        preserveFocus: true,
        preview: true,
        viewColumn: vscode.ViewColumn.Beside,
      });

      await editor.edit((eb) => {
        const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
        eb.replace(fullRange, code);
      });

      const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
        'vscode.executeFormatDocumentProvider',
        uri,
        { insertSpaces: true, tabSize: 4 },
      );

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

      if (!edits || edits.length === 0) {
        return { success: true, formatted: code };
      }

      return { success: true, formatted: applyEdits(code, edits) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.warn(`Docker extension formatter failed: ${message}`);
      return { success: false, error: message };
    }
  }
}

/** Apply TextEdit[] bottom-to-top so earlier offsets stay valid. */
function applyEdits(original: string, edits: vscode.TextEdit[]): string {
  const lines = original.split('\n');
  const sorted = [...edits].sort((a, b) => {
    if (b.range.start.line !== a.range.start.line) {
      return b.range.start.line - a.range.start.line;
    }
    return b.range.start.character - a.range.start.character;
  });

  for (const edit of sorted) {
    const startLine = edit.range.start.line;
    const startChar = edit.range.start.character;
    const endLine = edit.range.end.line;
    const endChar = edit.range.end.character;

    const before = (lines[startLine] ?? '').slice(0, startChar);
    const after = (lines[endLine] ?? '').slice(endChar);
    const replacement = `${before}${edit.newText}${after}`;
    lines.splice(startLine, endLine - startLine + 1, ...replacement.split('\n'));
  }

  return lines.join('\n');
}

/**
 * Attempt to auto-install the Docker extension if it is not present.
 * Returns true if the extension is available after the attempt.
 */
export async function ensureDockerExtension(): Promise<boolean> {
  if (vscode.extensions.getExtension(DOCKER_EXTENSION_ID)) {
    return true;
  }

  Logger.info('ms-azuretools.vscode-docker not found — attempting auto-install...');

  try {
    await vscode.commands.executeCommand(
      'workbench.extensions.installExtension',
      DOCKER_EXTENSION_ID,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    const installed = vscode.extensions.getExtension(DOCKER_EXTENSION_ID) !== undefined;
    if (installed) {
      Logger.info('ms-azuretools.vscode-docker installed successfully.');
    } else {
      Logger.warn('ms-azuretools.vscode-docker install completed but extension not yet active.');
    }
    return installed;
  } catch (err) {
    Logger.warn(`Failed to auto-install ms-azuretools.vscode-docker: ${String(err)}`);
    return false;
  }
}
