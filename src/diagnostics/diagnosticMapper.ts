import * as vscode from 'vscode';
import type { CodeBlock } from '../parser/types';
import { mapRelativeRange } from '../utils/positionMapping';

/**
 * Map a diagnostic from a virtual document's coordinate space back to the
 * position in the original Markdown document.
 */
export function mapDiagnostic(diagnostic: vscode.Diagnostic, block: CodeBlock): vscode.Diagnostic {
  const mappedRange = mapRelativeRange(diagnostic.range, block.contentStartLine);
  const mapped = new vscode.Diagnostic(mappedRange, diagnostic.message, diagnostic.severity);
  mapped.code = diagnostic.code;
  mapped.source = diagnostic.source ?? 'Markdown Code Assistant';
  mapped.relatedInformation = diagnostic.relatedInformation;
  mapped.tags = diagnostic.tags;
  return mapped;
}
