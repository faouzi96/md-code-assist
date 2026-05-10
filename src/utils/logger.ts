import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

export const Logger = {
  initialize(_context: vscode.ExtensionContext): void {
    outputChannel = vscode.window.createOutputChannel('Markdown Code Assistant');
  },

  info(message: string): void {
    outputChannel?.appendLine(`[INFO]  ${timestamp()} ${message}`);
  },

  warn(message: string): void {
    outputChannel?.appendLine(`[WARN]  ${timestamp()} ${message}`);
  },

  error(message: string, err?: unknown): void {
    const detail = err instanceof Error ? ` — ${err.message}` : '';
    outputChannel?.appendLine(`[ERROR] ${timestamp()} ${message}${detail}`);
  },

  dispose(): void {
    outputChannel?.dispose();
    outputChannel = undefined;
  },
};

function timestamp(): string {
  return new Date().toISOString();
}
