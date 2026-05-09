import * as vscode from 'vscode';
import { MAX_INLINE_ERROR_LENGTH } from '../config/defaults';

/** Creates a decoration type for inline after-line error/warning text. */
export function createInlineDecorationType(
  severity: vscode.DiagnosticSeverity,
): vscode.TextEditorDecorationType {
  const color = severityColor(severity);
  return vscode.window.createTextEditorDecorationType({
    after: {
      color,
      fontStyle: 'italic',
      margin: '0 0 0 2em',
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
}

/** Build decoration options for a single diagnostic. */
export function buildInlineDecoration(diagnostic: vscode.Diagnostic): vscode.DecorationOptions {
  const message =
    diagnostic.message.length > MAX_INLINE_ERROR_LENGTH
      ? diagnostic.message.slice(0, MAX_INLINE_ERROR_LENGTH - 1) + '…'
      : diagnostic.message;

  return {
    range: new vscode.Range(diagnostic.range.end, diagnostic.range.end),
    renderOptions: {
      after: { contentText: `  ${message}` },
    },
  };
}

function severityColor(severity: vscode.DiagnosticSeverity): string {
  switch (severity) {
    case vscode.DiagnosticSeverity.Error:
      return '#f44747';
    case vscode.DiagnosticSeverity.Warning:
      return '#ff8c00';
    case vscode.DiagnosticSeverity.Information:
      return '#75beff';
    default:
      return '#858585';
  }
}
