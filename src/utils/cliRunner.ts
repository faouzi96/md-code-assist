import { spawn } from 'child_process';

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Run an external CLI command, piping `stdin` to its standard input.
 * Returns stdout, stderr, and exit code.
 *
 * Security: `command` must be an absolute or PATH-resolved binary name —
 * never build it from untrusted user input. `args` are passed as an array
 * (not a shell string) so no shell injection is possible.
 */
export function runCli(
  command: string,
  args: readonly string[],
  stdin?: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false, // never use shell:true — prevents injection
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
      reject(new Error(`CLI command "${command}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (!timedOut) {
        reject(err);
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (!timedOut) {
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      }
    });

    if (stdin !== undefined && child.stdin) {
      child.stdin.write(stdin, 'utf8');
      child.stdin.end();
    }
  });
}
