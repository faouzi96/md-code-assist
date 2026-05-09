import { runCli } from './cliRunner';

/** Cache availability results to avoid repeated `--version` probes per session. */
const cache = new Map<string, boolean>();

/**
 * Returns true if `command` is found and executable (determined by `--version`).
 * Results are cached for the lifetime of the extension host process.
 */
export async function isToolAvailable(command: string): Promise<boolean> {
  const cached = cache.get(command);
  if (cached !== undefined) {
    return cached;
  }
  try {
    const result = await runCli(command, ['--version'], undefined, 5_000);
    const available = result.exitCode === 0;
    cache.set(command, available);
    return available;
  } catch {
    cache.set(command, false);
    return false;
  }
}

/** Clear the availability cache (useful in tests). */
export function clearToolCache(): void {
  cache.clear();
}
