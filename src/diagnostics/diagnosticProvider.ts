import * as vscode from 'vscode';
import { extractCodeBlocks } from '../parser';
import { mapDiagnostic } from './diagnosticMapper';
import { DecorationManager } from '../decorations/decorationManager';
import { getSettings } from '../config/settings';
import { Logger } from '../utils/logger';
import { diagnoseBlock } from './cliDiagnostics';

export class DiagnosticProvider {
  private readonly collection: vscode.DiagnosticCollection;
  private readonly decorationManager: DecorationManager;

  constructor(decorationManager: DecorationManager) {
    this.collection = vscode.languages.createDiagnosticCollection('MD Code Assist');
    this.decorationManager = decorationManager;
  }

  /** Run diagnostics on all eligible code blocks in the document. */
  async refresh(document: vscode.TextDocument): Promise<void> {
    const settings = getSettings();
    const blocks = extractCodeBlocks(document.getText()).filter((b) =>
      settings.diagnostics.enabledLanguages.includes(b.language),
    );

    if (blocks.length === 0) {
      this.collection.delete(document.uri);
      return;
    }

    const allDiags: vscode.Diagnostic[] = [];

    await Promise.all(
      blocks.map(async (block) => {
        const blockDiags = await diagnoseBlock(block);
        for (const diag of blockDiags) {
          allDiags.push(mapDiagnostic(diag, block));
        }
      }),
    );

    this.collection.set(document.uri, allDiags);
    this.updateDecorations(document, allDiags);
    Logger.info(`Diagnostics: ${allDiags.length} issue(s) in ${document.fileName}`);
  }

  /** Run diagnostics on the single code block containing `cursorLine`. */
  async refreshBlock(document: vscode.TextDocument, cursorLine: number): Promise<void> {
    const settings = getSettings();
    const blocks = extractCodeBlocks(document.getText());

    const block = blocks.find(
      (b) =>
        cursorLine >= b.contentStartLine &&
        cursorLine <= b.contentEndLine &&
        settings.diagnostics.enabledLanguages.includes(b.language),
    );

    if (!block) {
      void vscode.window.showInformationMessage(
        'MD Code Assist: Cursor is not inside a diagnosable code block.',
      );
      return;
    }

    const blockDiags = await diagnoseBlock(block);
    const mapped = blockDiags.map((d) => mapDiagnostic(d, block));

    // Preserve existing diagnostics for blocks outside the current one
    const existing = Array.from(this.collection.get(document.uri) ?? []);
    const outside = existing.filter(
      (d) =>
        d.range.start.line < block.contentStartLine || d.range.start.line > block.contentEndLine,
    );
    const updated = [...outside, ...mapped];

    this.collection.set(document.uri, updated);
    this.updateDecorations(document, updated);

    const count = mapped.length;
    if (count === 0) {
      void vscode.window.showInformationMessage('MD Code Assist: No issues found in this block.');
    } else {
      void vscode.window.showWarningMessage(
        `MD Code Assist: ${count} issue(s) found in this block.`,
      );
    }
  }

  clearDocument(uri: vscode.Uri): void {
    this.collection.delete(uri);
  }

  dispose(): void {
    this.collection.dispose();
  }

  private updateDecorations(document: vscode.TextDocument, diags: vscode.Diagnostic[]): void {
    const editor = vscode.window.activeTextEditor;
    if (editor?.document.uri.toString() === document.uri.toString()) {
      this.decorationManager.update(editor, diags);
    }
  }
}
