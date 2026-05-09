import * as vscode from 'vscode';
import type { IFormatter, FormatOptions, FormatResult } from './types';
import { Logger } from '../utils/logger';

const BLACK_EXTENSION_ID = 'ms-python.black-formatter';

/**
 * Formats Python code by delegating to the ms-python.black-formatter VS Code extension.
 * This requires no pip install — the extension bundles Black itself.
 */
export class BlackExtensionFormatter implements IFormatter {
  readonly supportedLanguages: readonly string[] = ['python'];

  isAvailable(): Promise<boolean> {
    const ext = vscode.extensions.getExtension(BLACK_EXTENSION_ID);
    return Promise.resolve(ext !== undefined && ext.isActive);
  }

  async format(code: string, _options: FormatOptions): Promise<FormatResult> {
    try {
      // Write the code into a virtual in-memory document so VS Code's formatting
      // pipeline (hooked by the Black Formatter extension) can process it.
      const uri = vscode.Uri.parse(`untitled:__mdca_black_tmp__.py`);
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc, {
        preserveFocus: true,
        preview: true,
        viewColumn: vscode.ViewColumn.Beside,
      });

      // Replace entire document content with the block code.
      await editor.edit((eb) => {
        const fullRange = new vscode.Range(
          doc.positionAt(0),
          doc.positionAt(doc.getText().length),
        );
        eb.replace(fullRange, code);
      });

      // Ask VS Code to run the document formatter (Black extension hooks here).
      const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
        'vscode.executeFormatDocumentProvider',
        uri,
        { insertSpaces: true, tabSize: 4 },
      );

      // Close the temporary document without saving.
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

      if (!edits || edits.length === 0) {
        // No edits means already formatted or Black returned nothing — treat as success.
        return { success: true, formatted: code };
      }

      // Apply edits to reconstruct the formatted text.
      const formatted = applyEdits(code, edits);
      const trimmed = formatted.endsWith('\n') ? formatted.slice(0, -1) : formatted;
      return { success: true, formatted: trimmed };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.warn(`Black extension formatter failed: ${message}`);
      return { success: false, error: message };
    }
  }
}

/**
 * Manually apply an array of TextEdits to a string.
 * Edits are applied from bottom to top to preserve offset validity.
 */
function applyEdits(original: string, edits: vscode.TextEdit[]): string {
  const lines = original.split('\n');

  // Sort edits from last to first so earlier offsets stay valid.
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

    const before = lines.slice(0, startLine).join('\n') +
      (startLine > 0 ? '\n' : '') +
      (lines[startLine] ?? '').slice(0, startChar);

    const after = (lines[endLine] ?? '').slice(endChar) +
      (endLine < lines.length - 1 ? '\n' : '') +
      lines.slice(endLine + 1).join('\n');

    const result = before + edit.newText + after;
    const newLines = result.split('\n');
    lines.splice(0, lines.length, ...newLines);
  }

  return lines.join('\n');
}

/**
 * Attempt to auto-install the Black Formatter extension if it is not present.
 * Returns true if the extension is available after the attempt.
 */
export async function ensureBlackExtension(): Promise<boolean> {
  if (vscode.extensions.getExtension(BLACK_EXTENSION_ID)) {
    return true;
  }

  Logger.info('ms-python.black-formatter not found — attempting auto-install...');

  try {
    await vscode.commands.executeCommand(
      'workbench.extensions.installExtension',
      BLACK_EXTENSION_ID,
    );
    // Give VS Code a moment to register the extension after install.
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    const installed = vscode.extensions.getExtension(BLACK_EXTENSION_ID) !== undefined;
    if (installed) {
      Logger.info('ms-python.black-formatter installed successfully.');
    } else {
      Logger.warn('ms-python.black-formatter install completed but extension not yet active.');
    }
    return installed;
  } catch (err) {
    Logger.warn(`Failed to auto-install ms-python.black-formatter: ${String(err)}`);
    return false;
  }
}
