import * as vscode from 'vscode';
import { formatAllBlocksCommand } from './formatAllBlocks';
import { formatCurrentBlockCommand } from './formatCurrentBlock';
import type { DiagnosticProvider } from '../diagnostics/diagnosticProvider';

export function registerCommands(
  context: vscode.ExtensionContext,
  provider: DiagnosticProvider,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('mdCodeAssist.formatAllBlocks', formatAllBlocksCommand),
    vscode.commands.registerCommand('mdCodeAssist.formatCurrentBlock', formatCurrentBlockCommand),

    vscode.commands.registerCommand('mdCodeAssist.showDiagnostics', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor?.document.languageId === 'markdown') {
        void provider.refresh(editor.document);
      } else {
        void vscode.window.showWarningMessage(
          'MD Code Assist: Open a Markdown file to show diagnostics.',
        );
      }
    }),

    vscode.commands.registerCommand('mdCodeAssist.diagnoseCurrentBlock', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor?.document.languageId === 'markdown') {
        void provider.refreshBlock(editor.document, editor.selection.active.line);
      } else {
        void vscode.window.showWarningMessage(
          'MD Code Assist: Open a Markdown file to diagnose a block.',
        );
      }
    }),
  );
}
