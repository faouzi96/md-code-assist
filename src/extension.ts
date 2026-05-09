import * as vscode from 'vscode';
import { registerCommands } from './commands/commandRegistry';
import { DiagnosticProvider } from './diagnostics/diagnosticProvider';
import { DecorationManager } from './decorations/decorationManager';
import { Logger } from './utils/logger';
import { formatterRegistry } from './formatters/formatterRegistry';
import { PrettierFormatter } from './formatters/prettierFormatter';
import { BlackFormatter } from './formatters/blackFormatter';
import { ShfmtFormatter } from './formatters/shfmtFormatter';

let diagnosticProvider: DiagnosticProvider | undefined;
let decorationManager: DecorationManager | undefined;

export function activate(context: vscode.ExtensionContext): void {
  Logger.initialize(context);
  Logger.info('MD Code Assist activated.');

  // Register formatters
  formatterRegistry.register(new PrettierFormatter());
  formatterRegistry.register(new BlackFormatter());
  formatterRegistry.register(new ShfmtFormatter());

  decorationManager = new DecorationManager();
  diagnosticProvider = new DiagnosticProvider(decorationManager);

  registerCommands(context, diagnosticProvider);

  // DocumentFormattingEditProvider — delegates to formatAllBlocks
  const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
    { language: 'markdown' },
    {
      async provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        _options: vscode.FormattingOptions,
        token: vscode.CancellationToken,
      ): Promise<vscode.TextEdit[]> {
        const { formatDocument } = await import('./commands/formatAllBlocks');
        const summary = await formatDocument(document, token);
        return summary.edits;
      },
    },
  );

  // Debounced diagnostics on document change
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  const onChangeListener = vscode.workspace.onDidChangeTextDocument((e) => {
    if (e.document.languageId !== 'markdown') {
      return;
    }
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      void diagnosticProvider?.refresh(e.document);
    }, 500);
  });

  // Format on save
  const onSaveListener = vscode.workspace.onDidSaveTextDocument((document) => {
    if (document.languageId !== 'markdown') {
      return;
    }
    const config = vscode.workspace.getConfiguration('mdCodeAssist');
    if (config.get<boolean>('formatOnSave')) {
      void vscode.commands.executeCommand('mdCodeAssist.formatAllBlocks');
    }
  });

  // Clean up diagnostics when a Markdown file is closed
  const onCloseListener = vscode.workspace.onDidCloseTextDocument((document) => {
    if (document.languageId === 'markdown') {
      diagnosticProvider?.clearDocument(document.uri);
    }
  });

  context.subscriptions.push(
    formattingProvider,
    onChangeListener,
    onSaveListener,
    onCloseListener,
    decorationManager,
  );
}

export function deactivate(): void {
  diagnosticProvider?.dispose();
  Logger.info('MD Code Assist deactivated.');
}
