import * as vscode from 'vscode';
import type { CodeBlock } from '../parser/types';
import { Logger } from '../utils/logger';

// TypeScript is bundled into extension.js by esbuild (not marked as external).
// Using require() so esbuild statically resolves and inlines it.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const ts = require('typescript') as typeof import('typescript');

/**
 * Syntax-check a TypeScript code snippet using the TypeScript compiler API.
 *
 * Only syntactic diagnostics are checked — no type resolution is performed,
 * so there are no false positives about missing imports or unknown types in
 * isolated markdown snippets.
 */
export function diagnoseTypescriptBlock(block: CodeBlock): vscode.Diagnostic[] {
  try {
    const fileName = 'snippet.ts';
    const sourceFile = ts.createSourceFile(
      fileName,
      block.content,
      ts.ScriptTarget.Latest,
      /* setParentNodes */ true,
      ts.ScriptKind.TS,
    );

    // Minimal compiler host — serves only our in-memory snippet.
    // Returning undefined for the default lib prevents TypeScript from trying
    // to load any .d.ts files, which is correct for syntax-only checking.
    const host: ts.CompilerHost = {
      getSourceFile: (name) => (name === fileName ? sourceFile : undefined),
      getDefaultLibFileName: () => '',
      writeFile: () => {},
      getCurrentDirectory: () => '/',
      getCanonicalFileName: (f) => f,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (name) => name === fileName,
      readFile: (name) => (name === fileName ? block.content : undefined),
    };

    const program = ts.createProgram([fileName], { noEmit: true, skipLibCheck: true }, host);
    const syntaxDiags = program.getSyntacticDiagnostics(sourceFile);

    return [...syntaxDiags].map((d) => {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(d.start ?? 0);
      const range = new vscode.Range(line, character, line, character + (d.length ?? 1));
      const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
      return new vscode.Diagnostic(range, msg, vscode.DiagnosticSeverity.Error);
    });
  } catch (err) {
    Logger.warn(`TypeScript syntax check failed: ${String(err)}`);
    return [];
  }
}
