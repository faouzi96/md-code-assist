import * as vscode from 'vscode';
import type { IFormatter, FormatOptions, FormatResult } from './types';
import { Logger } from '../utils/logger';

const SHFMT_EXTENSION_ID = 'mkhl.shfmt';

/**
 * Formats shell/bash code by delegating to the mkhl.shfmt VS Code extension.
 * This requires no system installation of shfmt — the extension bundles the binary.
 */
export class ShfmtExtensionFormatter implements IFormatter {
  readonly supportedLanguages: readonly string[] = ['shell'];

  isAvailable(): Promise<boolean> {
    const ext = vscode.extensions.getExtension(SHFMT_EXTENSION_ID);
    return Promise.resolve(ext !== undefined && ext.isActive);
  }

  async format(code: string, _options: FormatOptions): Promise<FormatResult> {
    try {
      // Open an untitled .sh document — VS Code auto-detects shellscript from the extension,
      // which causes the shfmt extension to register as its formatter.
      const uri = vscode.Uri.parse(`untitled:__mdca_shfmt_tmp__.sh`);
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc, {
        preserveFocus: true,
        preview: true,
        viewColumn: vscode.ViewColumn.Beside,
      });

      // Replace entire document content with the block code.
      await editor.edit((eb) => {
        const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
        eb.replace(fullRange, code);
      });

      // Ask VS Code to run the document formatter (shfmt extension hooks here).
      const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
        'vscode.executeFormatDocumentProvider',
        uri,
        { insertSpaces: false, tabSize: 4 },
      );

      // Close the temporary document without saving.
      await closeTempDocByUri(uri);

      if (!edits || edits.length === 0) {
        return { success: true, formatted: code };
      }

      const formatted = applyEdits(code, edits);
      const trimmed = formatted.endsWith('\n') ? formatted.slice(0, -1) : formatted;
      return { success: true, formatted: trimmed };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.warn(`shfmt extension formatter failed: ${message}`);
      return { success: false, error: message };
    }
  }
}

/** Close a specific temp document by URI without disturbing the active editor. */
async function closeTempDocByUri(uri: vscode.Uri): Promise<void> {
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      if (tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === uri.toString()) {
        await vscode.window.tabGroups.close(tab, true);
        return;
      }
    }
  }
}

/**
 * Manually apply an array of TextEdits to a string.
 * Edits are applied from bottom to top to preserve offset validity.
 */
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

    const before =
      lines.slice(0, startLine).join('\n') +
      (startLine > 0 ? '\n' : '') +
      (lines[startLine] ?? '').slice(0, startChar);

    const after =
      (lines[endLine] ?? '').slice(endChar) +
      (endLine < lines.length - 1 ? '\n' : '') +
      lines.slice(endLine + 1).join('\n');

    const result = before + edit.newText + after;
    const newLines = result.split('\n');
    lines.splice(0, lines.length, ...newLines);
  }

  return lines.join('\n');
}

/**
 * Attempt to auto-install the shfmt extension if it is not present.
 * Returns true if the extension is available after the attempt.
 */
export async function ensureShfmtExtension(): Promise<boolean> {
  if (vscode.extensions.getExtension(SHFMT_EXTENSION_ID)) {
    return true;
  }

  Logger.info('mkhl.shfmt not found — attempting auto-install...');

  try {
    await vscode.commands.executeCommand(
      'workbench.extensions.installExtension',
      SHFMT_EXTENSION_ID,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    const installed = vscode.extensions.getExtension(SHFMT_EXTENSION_ID) !== undefined;
    if (installed) {
      Logger.info('mkhl.shfmt installed successfully.');
    } else {
      Logger.warn('mkhl.shfmt install completed but extension not yet active.');
    }
    return installed;
  } catch (err) {
    Logger.warn(`Failed to auto-install mkhl.shfmt: ${String(err)}`);
    return false;
  }
}
