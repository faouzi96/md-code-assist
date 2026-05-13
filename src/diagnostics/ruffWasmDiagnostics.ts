import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import type { CodeBlock } from '../parser/types';

/**
 * Ruff rule codes that are false positives for isolated Markdown snippets.
 *
 * F401 — imported but unused: snippets intentionally omit the code that uses
 *         the import, so this is always a false positive.
 * E401 — multiple imports on one line: style rule, not a logic error.
 */
const SUPPRESSED_CODES = new Set(['F401', 'E401']);

interface RuffDiagnostic {
  code: string;
  message: string;
  start_location: { row: number; column: number };
  end_location: { row: number; column: number };
}

// Singleton workspace — Workspace construction loads the WASM module once.
let ruffWorkspace: import('@astral-sh/ruff-wasm-nodejs').Workspace | undefined;

function getRuffWorkspace(): import('@astral-sh/ruff-wasm-nodejs').Workspace {
  if (!ruffWorkspace) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { Workspace } =
      require('@astral-sh/ruff-wasm-nodejs') as typeof import('@astral-sh/ruff-wasm-nodejs');
    ruffWorkspace = new Workspace({});
  }
  return ruffWorkspace;
}

/**
 * Run Ruff diagnostics on a single Python code block entirely in-process via
 * the official `@astral-sh/ruff-wasm-nodejs` package. No system install or
 * VS Code extension required.
 *
 * Returns diagnostics in block-relative line coordinates (line 0 = first content line).
 */
export function diagnosePythonBlockWithRuffWasm(block: CodeBlock): vscode.Diagnostic[] {
  try {
    const ws = getRuffWorkspace();
    const raw = ws.check(block.content) as RuffDiagnostic[];

    const diags: vscode.Diagnostic[] = [];
    for (const item of raw) {
      if (SUPPRESSED_CODES.has(item.code)) {
        continue;
      }
      // Ruff rows/columns are 1-based; VS Code ranges are 0-based.
      const startLine = item.start_location.row - 1;
      const startCol = item.start_location.column - 1;
      const endLine = item.end_location.row - 1;
      const endCol = item.end_location.column - 1;
      const range = new vscode.Range(startLine, startCol, endLine, endCol);
      const diag = new vscode.Diagnostic(
        range,
        `${item.code}: ${item.message}`,
        vscode.DiagnosticSeverity.Warning,
      );
      diag.source = 'ruff';
      diag.code = item.code;
      diags.push(diag);
    }
    return diags;
  } catch (err) {
    Logger.warn(`Ruff WASM diagnostics failed: ${String(err)}`);
    return [];
  }
}
