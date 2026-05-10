import * as vscode from 'vscode';
import { createGutterDecorationType } from './gutterDecorations';
import { createInlineDecorationType, buildInlineDecoration } from './inlineDecorations';
import { getSettings } from '../config/settings';

type SeverityKey = 'error' | 'warning' | 'info' | 'hint';

/** Manages all editor decorations for Markdown Code Assistant. */
export class DecorationManager implements vscode.Disposable {
  private gutterTypes = new Map<vscode.DiagnosticSeverity, vscode.TextEditorDecorationType>();
  private inlineTypes = new Map<vscode.DiagnosticSeverity, vscode.TextEditorDecorationType>();

  constructor() {
    const severities = [
      vscode.DiagnosticSeverity.Error,
      vscode.DiagnosticSeverity.Warning,
      vscode.DiagnosticSeverity.Information,
      vscode.DiagnosticSeverity.Hint,
    ];
    for (const s of severities) {
      this.gutterTypes.set(s, createGutterDecorationType(s));
      this.inlineTypes.set(s, createInlineDecorationType(s));
    }
  }

  /**
   * Apply decorations for the given list of diagnostics to an editor.
   * Call this after updating the DiagnosticCollection.
   */
  update(editor: vscode.TextEditor, diagnostics: vscode.Diagnostic[]): void {
    const settings = getSettings();
    this.clearEditor(editor);

    if (!settings.decorations.showGutterIcons && !settings.decorations.showInlineErrors) {
      return;
    }

    // Group by severity
    const bySeverity = new Map<vscode.DiagnosticSeverity, vscode.Diagnostic[]>();
    for (const diag of diagnostics) {
      const group = bySeverity.get(diag.severity) ?? [];
      group.push(diag);
      bySeverity.set(diag.severity, group);
    }

    for (const [severity, diags] of bySeverity) {
      if (settings.decorations.showGutterIcons) {
        const gutterType = this.gutterTypes.get(severity);
        if (gutterType) {
          editor.setDecorations(
            gutterType,
            diags.map((d) => ({ range: d.range })),
          );
        }
      }

      if (settings.decorations.showInlineErrors) {
        const inlineType = this.inlineTypes.get(severity);
        if (inlineType) {
          editor.setDecorations(
            inlineType,
            diags.map((d) => buildInlineDecoration(d)),
          );
        }
      }
    }
  }

  /** Clear all decorations from an editor without disposing the types. */
  clearEditor(editor: vscode.TextEditor): void {
    for (const t of this.gutterTypes.values()) {
      editor.setDecorations(t, []);
    }
    for (const t of this.inlineTypes.values()) {
      editor.setDecorations(t, []);
    }
  }

  dispose(): void {
    for (const t of this.gutterTypes.values()) {
      t.dispose();
    }
    for (const t of this.inlineTypes.values()) {
      t.dispose();
    }
    this.gutterTypes.clear();
    this.inlineTypes.clear();
  }
}

// Suppress unused import warning — SeverityKey is exported for external use
export type { SeverityKey };
