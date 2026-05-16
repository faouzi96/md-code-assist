import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { runCli } from '../utils/cliRunner';
import { isToolAvailable } from '../utils/toolDetector';
import { Logger } from '../utils/logger';
import type { CodeBlock } from '../parser/types';
import * as jsYaml from 'js-yaml';
import postcss from 'postcss';

import * as parse5 from 'parse5';
import {
  isShellCheckExtensionAvailable,
  diagnoseShellBlockWithExtension,
} from './shellCheckExtensionDiagnostics';
import { diagnoseJsBlock } from './eslintExtensionDiagnostics';
import { diagnosePythonBlockWithRuffWasm } from './ruffWasmDiagnostics';
import { Parser as SqlParser } from 'node-sql-parser';

/**
 * Run CLI-based diagnostics for a single code block.
 * Returns diagnostics in block-relative line coordinates (line 0 = first line of content).
 */
export async function diagnoseBlock(block: CodeBlock): Promise<vscode.Diagnostic[]> {
  switch (block.language) {
    case 'javascript':
      return runNodeCheck(block);
    case 'typescript':
      return runNodeCheck(block); // type-stripped via ts.transpileModule() in diagnoseJsBlock
    case 'python':
      return runPyCompile(block);
    case 'shell':
      return runShellCheck(block);
    case 'json':
      return runJsonCheck(block);
    case 'yaml':
      return runYamlCheck(block);
    case 'css':
      return runCssCheck(block);
    case 'html':
      return runHtmlCheck(block);
    case 'sql':
      return runSqlCheck(block);
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Temp file helpers
// ---------------------------------------------------------------------------

function writeTempFile(content: string, ext: string): string {
  const tmpPath = path.join(
    os.tmpdir(),
    `mdca_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`,
  );
  fs.writeFileSync(tmpPath, content, 'utf8');
  return tmpPath;
}

function deleteTempFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore — temp file cleanup is best-effort
  }
}

// ---------------------------------------------------------------------------
// JavaScript / TypeScript — ESLint Node API (in-process, no workspace config)
// ---------------------------------------------------------------------------

function runNodeCheck(block: CodeBlock): Promise<vscode.Diagnostic[]> {
  return diagnoseJsBlock(block);
}

// ---------------------------------------------------------------------------
// Python — python -m py_compile
// ---------------------------------------------------------------------------

async function runPyCompile(block: CodeBlock): Promise<vscode.Diagnostic[]> {
  // 1. Ruff WASM — runs fully in-process, no system install required.
  //    Catches undefined names, style issues, and more.
  //    Falls back to pyflakes/py_compile only if Ruff throws unexpectedly.
  try {
    return diagnosePythonBlockWithRuffWasm(block);
  } catch {
    // Ruff WASM failed (unlikely) — fall through to CLI tools.
  }

  const pythonCmd = (await isToolAvailable('python3')) ? 'python3' : 'python';
  if (!(await isToolAvailable(pythonCmd))) {
    return [];
  }

  // 2. Try pyflakes — catches undefined names without needing imports to resolve.
  if (await isToolAvailable('pyflakes')) {
    const tmpFile = writeTempFile(block.content, '.py');
    try {
      const result = await runCli('pyflakes', [tmpFile]);
      // pyflakes exits 1 when issues are found — that is expected
      return parsePyflakesErrors(result.stdout || result.stderr);
    } catch (err) {
      Logger.warn(`pyflakes failed: ${String(err)}`);
    } finally {
      deleteTempFile(tmpFile);
    }
  }

  // 3. Last resort: py_compile for syntax errors only.
  const tmpFile = writeTempFile(block.content, '.py');
  try {
    const result = await runCli(pythonCmd, ['-m', 'py_compile', tmpFile]);
    if (result.exitCode === 0) {
      return [];
    }
    return parsePyCompileErrors(result.stderr);
  } catch (err) {
    Logger.warn(`py_compile failed: ${String(err)}`);
    return [];
  } finally {
    deleteTempFile(tmpFile);
  }
}

/**
 * Parse `pyflakes` output.
 * Format: 'filename.py:line:col: message'
 */
function parsePyflakesErrors(output: string): vscode.Diagnostic[] {
  const diags: vscode.Diagnostic[] = [];
  for (const raw of output.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    // Format: path:line:col: message
    const m = /^[^:]+:(\d+):(\d+):\s+(.+)$/.exec(line);
    if (m) {
      const lineNum = Math.max(0, parseInt(m[1], 10) - 1);
      const col = Math.max(0, parseInt(m[2], 10) - 1);
      const range = new vscode.Range(lineNum, col, lineNum, Number.MAX_SAFE_INTEGER);
      diags.push(new vscode.Diagnostic(range, m[3], vscode.DiagnosticSeverity.Warning));
    } else {
      // Some messages omit the column: path:line: message
      const m2 = /^[^:]+:(\d+):\s+(.+)$/.exec(line);
      if (m2) {
        const lineNum = Math.max(0, parseInt(m2[1], 10) - 1);
        const range = new vscode.Range(lineNum, 0, lineNum, Number.MAX_SAFE_INTEGER);
        diags.push(new vscode.Diagnostic(range, m2[2], vscode.DiagnosticSeverity.Warning));
      }
    }
  }
  return diags;
}

/**
 * Parse `python -m py_compile` stderr.
 * Format: '  File "file.py", line N\n    code\nSyntaxError: message'
 */
function parsePyCompileErrors(stderr: string): vscode.Diagnostic[] {
  const lineMatch = /line\s+(\d+)/.exec(stderr);
  const errorMatch = /^(SyntaxError|IndentationError|TabError|NameError):\s*(.+)$/m.exec(stderr);

  const line = lineMatch ? Math.max(0, parseInt(lineMatch[1], 10) - 1) : 0;
  const message = errorMatch ? `${errorMatch[1]}: ${errorMatch[2]}` : stderr.trim();

  if (!message) {
    return [];
  }
  const range = new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER);
  return [new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error)];
}

// ---------------------------------------------------------------------------
// Shell — shellcheck --format=json
// ---------------------------------------------------------------------------

interface ShellCheckItem {
  line: number;
  col: number;
  endLine: number;
  endCol: number;
  level: string;
  code: number;
  message: string;
}

async function runShellCheck(block: CodeBlock): Promise<vscode.Diagnostic[]> {
  // 1. Prefer the ShellCheck VS Code extension (no system install required).
  if (await isShellCheckExtensionAvailable()) {
    return diagnoseShellBlockWithExtension(block);
  }

  // 2. Fall back to the shellcheck CLI for rich diagnostics.
  if (await isToolAvailable('shellcheck')) {
    const tmpFile = writeTempFile(block.content, '.sh');
    try {
      // shellcheck exits non-zero when issues are found — that is expected
      const result = await runCli('shellcheck', ['--format=json', tmpFile]);
      return parseShellCheckJson(result.stdout);
    } catch (err) {
      Logger.warn(`shellcheck failed: ${String(err)}`);
      return [];
    } finally {
      deleteTempFile(tmpFile);
    }
  }
  // Fallback: use prettier-plugin-sh to catch hard syntax errors.
  return runShellSyntaxCheck(block);
}

async function runShellSyntaxCheck(block: CodeBlock): Promise<vscode.Diagnostic[]> {
  // zsh uses features (e.g. `for k v in`) unsupported by sh-syntax — skip to avoid false positives.
  if (block.rawLanguage === 'zsh') {
    return [];
  }
  // Map fence label → sh-syntax variant number: 0=LangBash, 1=LangPOSIX (default).
  const variant = block.rawLanguage === 'bash' ? 0 : 1;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import('prettier-plugin-sh');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const plugin: any = (mod as any).default ?? mod;
    const prettier = (await import('prettier')) as typeof import('prettier');
    await prettier.format(block.content, {
      parser: 'sh',
      plugins: [plugin],
      variant,
    } as Parameters<typeof prettier.format>[1]);
    return [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // prettier-plugin-sh error format: "... (N:M)"
    const posMatch = /\((\d+):(\d+)\)/.exec(msg);
    const line = posMatch ? Math.max(0, parseInt(posMatch[1], 10) - 1) : 0;
    const col = posMatch ? Math.max(0, parseInt(posMatch[2], 10) - 1) : 0;
    const range = new vscode.Range(line, col, line, Number.MAX_SAFE_INTEGER);
    return [new vscode.Diagnostic(range, `Syntax error: ${msg}`, vscode.DiagnosticSeverity.Error)];
  }
}

function parseShellCheckJson(stdout: string): vscode.Diagnostic[] {
  if (!stdout.trim()) {
    return [];
  }
  try {
    const items: ShellCheckItem[] = JSON.parse(stdout) as ShellCheckItem[];
    return items.map((item) => {
      const range = new vscode.Range(
        Math.max(0, item.line - 1),
        Math.max(0, item.col - 1),
        Math.max(0, item.endLine - 1),
        Math.max(0, item.endCol - 1),
      );
      return new vscode.Diagnostic(
        range,
        `SC${item.code}: ${item.message}`,
        shellCheckSeverity(item.level),
      );
    });
  } catch {
    return [];
  }
}

function shellCheckSeverity(level: string): vscode.DiagnosticSeverity {
  switch (level) {
    case 'error':
      return vscode.DiagnosticSeverity.Error;
    case 'warning':
      return vscode.DiagnosticSeverity.Warning;
    case 'info':
      return vscode.DiagnosticSeverity.Information;
    default:
      return vscode.DiagnosticSeverity.Hint;
  }
}

// ---------------------------------------------------------------------------
// YAML — in-process parse via js-yaml
// ---------------------------------------------------------------------------

function runYamlCheck(block: CodeBlock): Promise<vscode.Diagnostic[]> {
  try {
    jsYaml.load(block.content);
    return Promise.resolve([]);
  } catch (e) {
    if (e instanceof jsYaml.YAMLException) {
      const line = e.mark ? Math.max(0, e.mark.line) : 0;
      const col = e.mark ? Math.max(0, e.mark.column) : 0;
      const range = new vscode.Range(line, col, line, Number.MAX_SAFE_INTEGER);
      return Promise.resolve([
        new vscode.Diagnostic(range, e.reason, vscode.DiagnosticSeverity.Error),
      ]);
    }
    const msg = e instanceof Error ? e.message : String(e);
    const range = new vscode.Range(0, 0, 0, Number.MAX_SAFE_INTEGER);
    return Promise.resolve([new vscode.Diagnostic(range, msg, vscode.DiagnosticSeverity.Error)]);
  }
}

// ---------------------------------------------------------------------------
// CSS — in-process parse via postcss
// ---------------------------------------------------------------------------

function runCssCheck(block: CodeBlock): vscode.Diagnostic[] {
  try {
    const result = postcss().process(block.content, { from: undefined });
    // Accessing nodes triggers parsing
    void result.root.nodes;
    return [];
  } catch (e) {
    // postcss CssSyntaxError has line/column/reason properties
    const err = e as { line?: number; column?: number; reason?: string; message?: string };
    const line = err.line !== null && err.line !== undefined ? Math.max(0, err.line - 1) : 0;
    const col = err.column !== null && err.column !== undefined ? Math.max(0, err.column - 1) : 0;
    const msg = err.reason ?? err.message ?? String(e);
    const range = new vscode.Range(line, col, line, Number.MAX_SAFE_INTEGER);
    return [new vscode.Diagnostic(range, msg, vscode.DiagnosticSeverity.Error)];
  }
}

// ---------------------------------------------------------------------------
// HTML — in-process parse via parse5
// ---------------------------------------------------------------------------

function runHtmlCheck(block: CodeBlock): Promise<vscode.Diagnostic[]> {
  const diags: vscode.Diagnostic[] = [];
  parse5.parse(block.content, {
    onParseError(err) {
      const line = Math.max(0, err.startLine - 1);
      const col = Math.max(0, err.startCol - 1);
      const endLine = Math.max(0, err.endLine - 1);
      const endCol = Math.max(0, err.endCol);
      const range = new vscode.Range(line, col, endLine, endCol);
      diags.push(new vscode.Diagnostic(range, err.code, vscode.DiagnosticSeverity.Warning));
    },
  });
  return Promise.resolve(diags);
}

// ---------------------------------------------------------------------------
// JSON — in-process parse
// ---------------------------------------------------------------------------

function runJsonCheck(block: CodeBlock): Promise<vscode.Diagnostic[]> {
  try {
    JSON.parse(block.content);
    return Promise.resolve([]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // V8 includes "at position N" or "at line N column M" in the message
    const lineColMatch = /line (\d+) column (\d+)/.exec(msg);
    const line = lineColMatch ? Math.max(0, parseInt(lineColMatch[1], 10) - 1) : 0;
    const col = lineColMatch ? Math.max(0, parseInt(lineColMatch[2], 10) - 1) : 0;
    const range = new vscode.Range(line, col, line, col + 1);
    return Promise.resolve([new vscode.Diagnostic(range, msg, vscode.DiagnosticSeverity.Error)]);
  }
}

// ---------------------------------------------------------------------------
// SQL — parse via prettier-plugin-sql (catches syntax errors)
// ---------------------------------------------------------------------------
// SQL — validate via node-sql-parser (real syntax checker)
// ---------------------------------------------------------------------------

function runSqlCheck(block: CodeBlock): vscode.Diagnostic[] {
  const parser = new SqlParser();
  try {
    parser.parse(block.content);
    return [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // node-sql-parser (PEG.js) errors carry a `location` property with 1-based line/column.
    const loc = (err as { location?: { start?: { line?: number; column?: number } } }).location;
    const line = loc?.start?.line !== undefined ? Math.max(0, loc.start.line - 1) : 0;
    const col = loc?.start?.column !== undefined ? Math.max(0, loc.start.column - 1) : 0;
    const range = new vscode.Range(line, col, line, Number.MAX_SAFE_INTEGER);
    return [
      new vscode.Diagnostic(range, `SQL syntax error: ${msg}`, vscode.DiagnosticSeverity.Error),
    ];
  }
}
