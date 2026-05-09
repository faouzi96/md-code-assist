import * as vscode from 'vscode';
import { extractCodeBlocks } from '../parser';
import { dispatchFormat } from '../formatters/formatterDispatcher';
import { Logger } from '../utils/logger';

/**
 * Format the single fenced code block that contains the cursor position.
 * If the cursor is not inside a code block, shows a notification.
 */
export async function formatCurrentBlockCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    void vscode.window.showWarningMessage('MD Code Assist: Open a Markdown file to format.');
    return;
  }

  const document = editor.document;
  const cursorLine = editor.selection.active.line;
  const blocks = extractCodeBlocks(document.getText());

  const block = blocks.find(
    (b) => cursorLine >= b.contentStartLine && cursorLine <= b.contentEndLine,
  );

  if (!block) {
    void vscode.window.showInformationMessage('MD Code Assist: Cursor is not inside a code block.');
    return;
  }

  const result = await dispatchFormat(block);

  if (!result.success || result.formatted === undefined) {
    void vscode.window.showErrorMessage(
      `MD Code Assist: Could not format block — ${result.error ?? 'unknown error'}`,
    );
    return;
  }

  if (result.formatted === block.content) {
    void vscode.window.showInformationMessage(
      `MD Code Assist: Block already correctly formatted (${block.language}).`,
    );
    return;
  }

  const contentRange = new vscode.Range(
    block.contentStartLine,
    0,
    block.contentEndLine,
    document.lineAt(block.contentEndLine).text.length,
  );

  const workspaceEdit = new vscode.WorkspaceEdit();
  workspaceEdit.set(document.uri, [vscode.TextEdit.replace(contentRange, result.formatted)]);
  await vscode.workspace.applyEdit(workspaceEdit);

  Logger.info(`Formatted current block (${block.language}) in ${document.fileName}`);
}
