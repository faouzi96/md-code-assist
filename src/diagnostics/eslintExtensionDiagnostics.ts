/* eslint-disable @typescript-eslint/no-unsafe-assignment,
                  @typescript-eslint/no-unsafe-call,
                  @typescript-eslint/no-unsafe-member-access,
                  @typescript-eslint/no-unsafe-argument,
                  @typescript-eslint/no-unsafe-return,
                  @typescript-eslint/no-redundant-type-constituents,
                  @typescript-eslint/no-var-requires */
// The rules above are disabled for this file because the ESLint Node API
// (v8) ships types that include `any` in several public members, causing
// false-positive unsafe-* violations that cannot be resolved without
// wholesale casting everything to `unknown`.
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import type { CodeBlock } from '../parser/types';
import type { ESLint } from 'eslint';

// ESLint and @typescript-eslint/parser are esbuild externals shipped in the
// VSIX node_modules. Use require() at module load so they are resolved once.
const ESLintCtor: typeof ESLint = (require('eslint') as { ESLint: typeof ESLint }).ESLint;

/**
 * ESLint rules focused on real logic errors only.
 * - No style rules (avoid noise on opinionated formatting choices)
 * - No missing-import rules (snippets intentionally lack import statements)
 * - All rules work without type information (no tsconfig/project needed)
 */
const SNIPPET_RULES: Record<string, 'error' | 'warn'> = {
  'no-unreachable': 'error',
  'no-duplicate-case': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
  'no-const-assign': 'error',
  'no-func-assign': 'error',
  'no-redeclare': 'error',
  'getter-return': 'error',
  'no-obj-calls': 'error',
  'no-import-assign': 'error',
  'no-setter-return': 'error',
  'for-direction': 'error',
  'no-compare-neg-zero': 'error',
  'no-unsafe-finally': 'error',
  'no-unexpected-multiline': 'error',
};

// Lazy-cached ESLint instance — synchronous creation, reused across calls.
// A single espree-based instance is used for both JS and TS. The TS parser
// (@typescript-eslint/parser) requires its full dependency tree (typescript,
// typescript-estree, etc.) which are not shipped in the VSIX. Espree correctly
// lints JS-compatible TS snippets; TS-specific syntax produces fatal parse
// errors which are suppressed for TypeScript blocks (see diagnoseJsTsBlock).
let _eslintJs: ESLint | undefined;

function getEslintJs(): ESLint {
  if (!_eslintJs) {
    _eslintJs = new ESLintCtor({
      useEslintrc: false,
      overrideConfig: {
        env: { browser: true, node: true, es2022: true },
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
        rules: SNIPPET_RULES,
      },
    });
  }
  return _eslintJs;
}

/**
 * Lint a JS or TS code block using ESLint's Node API directly.
 *
 * - No workspace `.eslintrc` is loaded (`useEslintrc: false`)
 * - No temp files are written; no editor documents are opened
 * - Only real logic-error rules are enabled — no style, no false import errors
 *
 * Returns diagnostics in block-relative line coordinates (line 0 = first content line).
 */
export async function diagnoseJsBlock(block: CodeBlock): Promise<vscode.Diagnostic[]> {
  try {
    const eslint = getEslintJs();
    const filePath = block.language === 'typescript' ? 'snippet.ts' : 'snippet.js';
    const results = await eslint.lintText(block.content, { filePath });

    const diags: vscode.Diagnostic[] = [];
    for (const result of results) {
      for (const msg of result.messages) {
        const line = Math.max(0, msg.line - 1);
        const col = Math.max(0, msg.column - 1);

        if (msg.fatal === true) {
          // For TypeScript, espree cannot parse TS-specific syntax (type
          // annotations, interfaces, etc.) — suppress these parse errors to
          // avoid false positives on valid TypeScript code.
          if (block.language === 'typescript') {
            continue;
          }
          // For JavaScript, a fatal parse error is a real syntax error.
          const range = new vscode.Range(line, col, line, Number.MAX_SAFE_INTEGER);
          diags.push(new vscode.Diagnostic(range, msg.message, vscode.DiagnosticSeverity.Error));
          continue;
        }

        const endLine = msg.endLine !== undefined ? Math.max(0, msg.endLine - 1) : line;
        const endCol = msg.endColumn !== undefined ? Math.max(0, msg.endColumn - 1) : col + 1;
        const range = new vscode.Range(line, col, endLine, endCol);
        const severity =
          msg.severity === 2 ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
        const label = msg.ruleId !== null ? `${msg.ruleId}: ${msg.message}` : msg.message;
        diags.push(new vscode.Diagnostic(range, label, severity));
      }
    }
    return diags;
  } catch (err) {
    Logger.warn(`ESLint diagnostics failed: ${String(err)}`);
    return [];
  }
}
