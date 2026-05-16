import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { runCli } from '../utils/cliRunner';
import { Logger } from '../utils/logger';
import type { CodeBlock } from '../parser/types';

const SHELLCHECK_EXTENSION_ID = 'timonwong.shellcheck';
const DIAG_TIMEOUT_MS = 8_000;
const DEBOUNCE_MS = 400;

/**
 * Cached result of the upfront binary probe (null = not yet checked).
 * Avoids repeated 5-second timeouts on each block when the binary is blocked.
 */
let shellCheckBinaryAvailable: boolean | null = null;

/**
 * Resolve the shellcheck executable path: user config first, then the binary
 * bundled inside the timonwong.shellcheck extension, or undefined if not found.
 */
function getShellCheckBinaryPath(): string | undefined {
  const ext = vscode.extensions.getExtension(SHELLCHECK_EXTENSION_ID);
  if (!ext) return undefined;

  const configured = vscode.workspace.getConfiguration('shellcheck').get<string>('executablePath');
  if (configured && configured.trim()) {
    return configured.trim();
  }

  // Bundled binary structure: binaries/{platform}/{arch}/shellcheck[.exe]
  const platform =
    process.platform === 'win32' ? 'win32' : process.platform === 'darwin' ? 'darwin' : 'linux';
  const binaryName = process.platform === 'win32' ? 'shellcheck.exe' : 'shellcheck';
  const bundled = path.join(ext.extensionPath, 'binaries', platform, process.arch, binaryName);
  return fs.existsSync(bundled) ? bundled : undefined;
}

/**
 * Returns true if the shellcheck binary responds within 2 seconds.
 * Result is cached for the lifetime of the extension host process so only
 * one probe per session is performed.
 */
async function probeShellCheckBinary(): Promise<boolean> {
  if (shellCheckBinaryAvailable !== null) {
    return shellCheckBinaryAvailable;
  }
  const binaryPath = getShellCheckBinaryPath();
  if (!binaryPath) {
    shellCheckBinaryAvailable = false;
    return false;
  }
  try {
    const result = await runCli(binaryPath, ['--version'], undefined, 2_000);
    shellCheckBinaryAvailable = result.exitCode === 0;
  } catch {
    shellCheckBinaryAvailable = false;
    Logger.warn(
      'shellcheck binary did not respond within 2 s (possible antivirus block). ' +
        'Shell diagnostics via the timonwong.shellcheck extension are disabled for this session.',
    );
  }
  return shellCheckBinaryAvailable;
}

/**
 * SC2148: "Tips depend on target shell and target shell is unknown — add a shebang."
 * Code snippets in Markdown won't have a shebang, so suppress this false positive.
 */
const SUPPRESSED_CODES = new Set(['2148']);

/**
 * Returns true if the timonwong.shellcheck extension is installed AND its
 * shellcheck binary actually responds (checked once per session, then cached).
 */
export async function isShellCheckExtensionAvailable(): Promise<boolean> {
  if (!vscode.extensions.getExtension(SHELLCHECK_EXTENSION_ID)) {
    return false;
  }
  return probeShellCheckBinary();
}

/**
 * Run ShellCheck diagnostics on a single shell code block by delegating to the
 * timonwong.shellcheck VS Code extension (no system shellcheck install required).
 *
 * Returns diagnostics in block-relative line coordinates (line 0 = first content line).
 */
export async function diagnoseShellBlockWithExtension(
  block: CodeBlock,
): Promise<vscode.Diagnostic[]> {
  try {
    // Activate the extension explicitly — it won't be active until a .sh file
    // is opened normally, so lazy activation would make isActive always false.
    const ext = vscode.extensions.getExtension(SHELLCHECK_EXTENSION_ID);
    if (ext && !ext.isActive) {
      await ext.activate();
    }

    // Use a .bash extension for bash blocks so VS Code assigns the `bash`
    // language ID (which the ShellCheck extension handles most reliably).
    // sh and zsh blocks get .sh — ShellCheck infers the dialect from the shebang.
    const ext2 = block.rawLanguage === 'bash' ? '.bash' : '.sh';
    const tmpName = `mdca_shellcheck_${Date.now()}_${Math.random().toString(36).slice(2)}${ext2}`;
    const uri = vscode.Uri.joinPath(vscode.Uri.file(os.tmpdir()), tmpName);

    await vscode.workspace.fs.writeFile(
      uri,
      Buffer.from(block.content.replace(/\r\n/g, '\n'), 'utf8'),
    );

    try {
      const diagPromise = waitForDiagnostics(uri, DIAG_TIMEOUT_MS);
      const doc = await vscode.workspace.openTextDocument(uri);

      // Force the language ID so the ShellCheck extension's document selector
      // matches regardless of how VS Code auto-detects the file.
      const langId = block.rawLanguage === 'bash' ? 'bash' : 'shellscript';
      await vscode.languages.setTextDocumentLanguage(doc, langId);

      const diags = await diagPromise;

      return diags.filter((d) => {
        // d.code can be a number, string, or { value, target } object
        const code = String(
          typeof d.code === 'object' && d.code !== null ? d.code.value : (d.code ?? ''),
        );
        return !SUPPRESSED_CODES.has(code);
      });
    } finally {
      try {
        await vscode.workspace.fs.delete(uri);
      } catch {
        // ignore — temp file is in OS temp dir
      }
    }
  } catch (err) {
    Logger.warn(`ShellCheck extension diagnostics failed: ${String(err)}`);
    return [];
  }
}

/**
 * Normalize a URI to a canonical string for equality comparisons.
 *
 * On Windows, `file:` URIs can have drive letters in different cases or
 * percent-encoded colons depending on how they were constructed. Round-tripping
 * through `vscode.Uri.file(uri.fsPath)` always produces a consistent form.
 */
function normalizeUri(uri: vscode.Uri): string {
  if (uri.scheme === 'file') {
    return vscode.Uri.file(uri.fsPath).toString();
  }
  return uri.toString();
}

/**
 * Returns a promise that resolves once ShellCheck has settled (no new
 * onDidChangeDiagnostics events for DEBOUNCE_MS), or after `timeoutMs` as a
 * hard cap. Debouncing handles multi-pass analysis (syntax pass then semantic).
 */
function waitForDiagnostics(
  uri: vscode.Uri,
  timeoutMs: number,
): Promise<readonly vscode.Diagnostic[]> {
  const normalized = normalizeUri(uri);
  return new Promise((resolve) => {
    let settled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const done = (diags: readonly vscode.Diagnostic[]): void => {
      if (!settled) {
        settled = true;
        sub.dispose();
        clearTimeout(hardTimer);
        clearTimeout(debounceTimer);
        resolve(diags);
      }
    };

    const rescheduleDebounce = (): void => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => done(vscode.languages.getDiagnostics(uri)), DEBOUNCE_MS);
    };

    const hardTimer = setTimeout(() => done(vscode.languages.getDiagnostics(uri)), timeoutMs);

    const sub = vscode.languages.onDidChangeDiagnostics((e) => {
      if (e.uris.some((u) => normalizeUri(u) === normalized)) {
        rescheduleDebounce();
      }
    });
  });
}

/**
 * Attempt to auto-install the ShellCheck extension if it is not present.
 * Returns true if the extension is available after the attempt.
 */
export async function ensureShellCheckExtension(): Promise<boolean> {
  if (vscode.extensions.getExtension(SHELLCHECK_EXTENSION_ID)) {
    return true;
  }

  Logger.info('timonwong.shellcheck not found — attempting auto-install...');

  try {
    await vscode.commands.executeCommand(
      'workbench.extensions.installExtension',
      SHELLCHECK_EXTENSION_ID,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    const installed = vscode.extensions.getExtension(SHELLCHECK_EXTENSION_ID) !== undefined;
    if (installed) {
      Logger.info('timonwong.shellcheck installed successfully.');
    } else {
      Logger.warn('timonwong.shellcheck install completed but extension not yet active.');
    }
    return installed;
  } catch (err) {
    Logger.warn(`Failed to auto-install timonwong.shellcheck: ${String(err)}`);
    return false;
  }
}
