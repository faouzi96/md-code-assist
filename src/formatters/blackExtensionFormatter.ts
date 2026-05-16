import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import type { IFormatter, FormatOptions, FormatResult } from './types';
import { Logger } from '../utils/logger';

const BLACK_EXTENSION_ID = 'ms-python.black-formatter';

/**
 * Serializes concurrent format() calls — each uses its own temp file so
 * correctness isn't affected by parallel execution, but serializing avoids
 * spawning many Black LSP requests simultaneously on format-on-save.
 */
let pendingFormat: Promise<unknown> = Promise.resolve();

/**
 * Formats Python code by delegating to the ms-python.black-formatter VS Code extension.
 * This requires no pip install — the extension bundles Black itself.
 */
export class BlackExtensionFormatter implements IFormatter {
  readonly supportedLanguages: readonly string[] = ['python'];

  isAvailable(): Promise<boolean> {
    const ext = vscode.extensions.getExtension(BLACK_EXTENSION_ID);
    return Promise.resolve(ext !== undefined);
  }

  format(code: string, _options: FormatOptions): Promise<FormatResult> {
    const queued = pendingFormat.then(() => this._doFormat(code));
    pendingFormat = queued.catch(() => {});
    return queued;
  }

  private async _doFormat(code: string): Promise<FormatResult> {
    // Write to a unique temp .py file so Black’s LSP server gets a real file URI.
    // Using a fresh file each call avoids WorkspaceEdit (which navigates to the
    // file) and avoids reusing a single document (which could show stale content).
    const tmpPath = path.join(os.tmpdir(), `__mdca_py_${Date.now()}.py`);
    try {
      const ext = vscode.extensions.getExtension(BLACK_EXTENSION_ID);
      if (ext && !ext.isActive) {
        await ext.activate();
      }

      fs.writeFileSync(tmpPath, code, 'utf8');
      const uri = vscode.Uri.file(tmpPath);
      // openTextDocument opens the file in VS Code’s model without creating a
      // visible tab (no showTextDocument call — file stays invisible to the user).
      await vscode.workspace.openTextDocument(uri);

      const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
        'vscode.executeFormatDocumentProvider',
        uri,
        { insertSpaces: true, tabSize: 4 },
      );

      if (!edits || edits.length === 0) {
        return { success: true, formatted: code };
      }
      const formatted = applyEdits(code, edits);
      const trimmed = formatted.endsWith('\n') ? formatted.slice(0, -1) : formatted;
      return { success: true, formatted: trimmed };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.warn(`Black extension formatter failed: ${message}`);
      return { success: false, error: message };
    } finally {
      // Best-effort cleanup — file is in OS temp dir so it will be collected
      // eventually even if deletion fails (e.g. VS Code still holds a handle).
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        /* ignore */
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
