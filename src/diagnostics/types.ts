import * as vscode from 'vscode';
import type { CodeBlock } from '../parser/types';

/** A diagnostic that has been mapped back to its Markdown document position. */
export interface MappedDiagnostic {
  readonly original: vscode.Diagnostic;
  readonly mapped: vscode.Diagnostic;
  readonly block: CodeBlock;
}

/** Metadata for a virtual document representing a single code block. */
export interface VirtualDocument {
  readonly uri: vscode.Uri;
  readonly block: CodeBlock;
  readonly language: string;
  content: string;
}
