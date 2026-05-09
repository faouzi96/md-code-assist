import * as vscode from 'vscode';

/** Creates a gutter decoration type for error/warning/info indicators. */
export function createGutterDecorationType(
  severity: vscode.DiagnosticSeverity,
): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    gutterIconPath: gutterIconPath(severity),
    gutterIconSize: 'contain',
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
}

function gutterIconPath(severity: vscode.DiagnosticSeverity): vscode.Uri {
  // Use VS Code's built-in ThemeIcon codicon names as data URIs.
  // Fallback to colored squares encoded as SVG data URIs.
  const color = severityHex(severity);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="6" fill="${color}"/></svg>`;
  const encoded = Buffer.from(svg).toString('base64');
  return vscode.Uri.parse(`data:image/svg+xml;base64,${encoded}`);
}

function severityHex(severity: vscode.DiagnosticSeverity): string {
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
