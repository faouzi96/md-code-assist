import * as vscode from 'vscode';
import { mapDiagnostic } from '../../../src/diagnostics/diagnosticMapper';
import type { CodeBlock } from '../../../src/parser/types';

function makeBlock(contentStartLine: number): CodeBlock {
  return {
    language: 'typescript',
    rawLanguage: 'typescript',
    content: 'const x: string = 1;',
    startLine: contentStartLine - 1,
    endLine: contentStartLine + 1,
    startOffset: 0,
    endOffset: 100,
    contentStartLine,
    contentEndLine: contentStartLine,
  };
}

describe('mapDiagnostic', () => {
  it('offsets diagnostic line by contentStartLine', () => {
    const block = makeBlock(10);
    const range = new vscode.Range(new vscode.Position(0, 6), new vscode.Position(0, 15));
    const original = new vscode.Diagnostic(range, 'Type error', vscode.DiagnosticSeverity.Error);

    const mapped = mapDiagnostic(original, block);

    expect(mapped.range.start.line).toBe(10);
    expect(mapped.range.end.line).toBe(10);
    expect(mapped.message).toBe('Type error');
    expect(mapped.severity).toBe(vscode.DiagnosticSeverity.Error);
  });

  it('preserves character positions', () => {
    const block = makeBlock(5);
    const range = new vscode.Range(new vscode.Position(2, 3), new vscode.Position(2, 9));
    const original = new vscode.Diagnostic(range, 'Warning', vscode.DiagnosticSeverity.Warning);

    const mapped = mapDiagnostic(original, block);

    expect(mapped.range.start.character).toBe(3);
    expect(mapped.range.end.character).toBe(9);
    expect(mapped.range.start.line).toBe(7);
  });

  it('sets source to Markdown Code Assistant when original has no source', () => {
    const block = makeBlock(0);
    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1));
    const original = new vscode.Diagnostic(range, 'msg', vscode.DiagnosticSeverity.Hint);

    const mapped = mapDiagnostic(original, block);
    expect(mapped.source).toBe('Markdown Code Assistant');
  });
});
