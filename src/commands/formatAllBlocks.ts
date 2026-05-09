import * as vscode from 'vscode';
import { extractCodeBlocks } from '../parser';
import { dispatchFormat } from '../formatters/formatterDispatcher';
import { Logger } from '../utils/logger';

export interface FormatSummary {
  edits: vscode.TextEdit[];
  /** Total fenced blocks found. */
  blockCount: number;
  /** Blocks where a formatter ran and produced a change. */
  formattedCount: number;
  /** Blocks where a formatter ran but output was identical. */
  alreadyFormattedCount: number;
  /** Blocks skipped: language disabled, no formatter, or formatter unavailable. */
  skippedCount: number;
}

/**
 * Format all fenced code blocks in the given document.
 * Returns a FormatSummary with edits and counters for user feedback.
 */
export async function formatDocument(
  document: vscode.TextDocument,
  token: vscode.CancellationToken,
): Promise<FormatSummary> {
  const text = document.getText();
  const blocks = extractCodeBlocks(text);

  const summary: FormatSummary = {
    edits: [],
    blockCount: blocks.length,
    formattedCount: 0,
    alreadyFormattedCount: 0,
    skippedCount: 0,
  };

  if (blocks.length === 0) {
    return summary;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: 'MD Code Assist: Formatting code blocks…',
      cancellable: false,
    },
    async (progress) => {
      const results = await Promise.all(
        blocks.map(async (block, i) => {
          if (token.isCancellationRequested) {
            return null;
          }
          progress.report({ message: `Block ${i + 1}/${blocks.length}` });
          const result = await dispatchFormat(block);
          return { block, result };
        }),
      );

      for (const entry of results) {
        if (!entry) {
          continue;
        }
        if (!entry.result.success || entry.result.formatted === undefined) {
          summary.skippedCount++;
          continue;
        }
        if (entry.result.formatted === entry.block.content) {
          summary.alreadyFormattedCount++;
          continue;
        }

        // Replace only the content lines inside the fences (not the fences themselves)
        const contentRange = new vscode.Range(
          entry.block.contentStartLine,
          0,
          entry.block.contentEndLine,
          document.lineAt(entry.block.contentEndLine).text.length,
        );
        summary.edits.push(vscode.TextEdit.replace(contentRange, entry.result.formatted));
        summary.formattedCount++;
      }
    },
  );

  Logger.info(
    `Formatted ${summary.formattedCount} block(s) in ${document.fileName}` +
      ` (${summary.alreadyFormattedCount} already formatted, ${summary.skippedCount} skipped)`,
  );
  return summary;
}

/** VS Code command handler — applies edits directly via WorkspaceEdit. */
export async function formatAllBlocksCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    void vscode.window.showWarningMessage('MD Code Assist: Open a Markdown file to format.');
    return;
  }

  const tokenSource = new vscode.CancellationTokenSource();
  const summary = await formatDocument(editor.document, tokenSource.token);
  tokenSource.dispose();

  if (summary.blockCount === 0) {
    void vscode.window.showInformationMessage('MD Code Assist: No fenced code blocks found.');
    return;
  }

  if (summary.formattedCount === 0) {
    if (summary.alreadyFormattedCount > 0 && summary.skippedCount === 0) {
      void vscode.window.showInformationMessage(
        `MD Code Assist: ${summary.alreadyFormattedCount} block(s) already correctly formatted.`,
      );
    } else if (summary.skippedCount > 0 && summary.alreadyFormattedCount === 0) {
      void vscode.window.showWarningMessage(
        `MD Code Assist: ${summary.skippedCount} block(s) skipped — language not enabled or formatter unavailable. Check the Output panel for details.`,
      );
    } else {
      void vscode.window.showInformationMessage(
        `MD Code Assist: Nothing to format (${summary.alreadyFormattedCount} already formatted, ${summary.skippedCount} skipped).`,
      );
    }
    return;
  }

  const workspaceEdit = new vscode.WorkspaceEdit();
  workspaceEdit.set(editor.document.uri, summary.edits);
  await vscode.workspace.applyEdit(workspaceEdit);

  void vscode.window.showInformationMessage(
    `MD Code Assist: Formatted ${summary.formattedCount} block(s).` +
      (summary.alreadyFormattedCount > 0
        ? ` (${summary.alreadyFormattedCount} already formatted)`
        : ''),
  );
}
