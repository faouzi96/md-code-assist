import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { runCli } from '../utils/cliRunner';
import { isToolAvailable } from '../utils/toolDetector';
import { Logger } from '../utils/logger';
import type { CodeBlock } from '../parser/types';

const LANG_EXT: Record<string, string> = {
  javascript: '.js',
  typescript: '.ts',
  python: '.py',
  shell: '.sh',
  json: '.json',
};

/**
 * Run CLI-based diagnostics for a single code block.
 * Returns diagnostics in block-relative line coordinates (line 0 = first line of content).
 */
export async function diagnoseBlock(block: CodeBlock): Promise<vscode.Diagnostic[]> {
  switch (block.language) {
    case 'javascript':
    case 'typescript':
      return runNodeCheck(block);
    case 'python':
      return runPyCompile(block);
    case 'shell':
      return runShellCheck(block);
    case 'json':
      return runJsonCheck(block);
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
// JavaScript / TypeScript — node --check
// ---------------------------------------------------------------------------

async function runNodeCheck(block: CodeBlock): Promise<vscode.Diagnostic[]> {
  const ext = LANG_EXT[block.language] ?? '.js';
  const tmpFile = writeTempFile(block.content, ext);
  try {
    const result = await runCli('node', ['--check', tmpFile]);
    if (result.exitCode === 0) {
      return [];
    }
    return parseNodeErrors(result.stderr, tmpFile);
  } catch (err) {
    Logger.warn(`node --check failed: ${String(err)}`);
    return [];
  } finally {
    deleteTempFile(tmpFile);
  }
}

/**
 * Parse `node --check` stderr.
 * Format: "/path/to/file.js:3\n  code\n  ^\nSyntaxError: message"
 */
function parseNodeErrors(stderr: string, tmpFile: string): vscode.Diagnostic[] {
  const escapedPath = tmpFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const linePattern = new RegExp(`${escapedPath}:(\\d+)`);
  const lineMatch = linePattern.exec(stderr);

  const errorMatch = /^(SyntaxError|ReferenceError|TypeError|RangeError):\s*(.+)$/m.exec(stderr);
  const message = errorMatch
    ? `${errorMatch[1]}: ${errorMatch[2]}`
    : (stderr.trim().split('\n').pop()?.trim() ?? 'Syntax error');

  const line = lineMatch ? Math.max(0, parseInt(lineMatch[1], 10) - 1) : 0;
  const range = new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER);
  return [new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error)];
}

// ---------------------------------------------------------------------------
// Python — python -m py_compile
// ---------------------------------------------------------------------------

async function runPyCompile(block: CodeBlock): Promise<vscode.Diagnostic[]> {
  const pythonCmd = (await isToolAvailable('python3')) ? 'python3' : 'python';
  if (!(await isToolAvailable(pythonCmd))) {
    return [];
  }

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
  if (!(await isToolAvailable('shellcheck'))) {
    return [];
  }

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
