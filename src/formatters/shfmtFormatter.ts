import type { IFormatter, FormatOptions, FormatResult } from './types';
import { runCli } from '../utils/cliRunner';
import { isToolAvailable } from '../utils/toolDetector';
import { Logger } from '../utils/logger';

export class ShfmtFormatter implements IFormatter {
  readonly supportedLanguages: readonly string[] = ['shell'];

  private readonly executablePath: string;

  constructor(executablePath: string = 'shfmt') {
    this.executablePath = executablePath;
  }

  async isAvailable(): Promise<boolean> {
    return isToolAvailable(this.executablePath);
  }

  async format(code: string, options: FormatOptions): Promise<FormatResult> {
    const exe = options.executablePath ?? this.executablePath;
    try {
      // `-` reads from stdin
      const result = await runCli(exe, ['-'], code);
      if (result.exitCode === 0) {
        const trimmed = result.stdout.endsWith('\n') ? result.stdout.slice(0, -1) : result.stdout;
        return { success: true, formatted: trimmed };
      }
      const error = result.stderr.trim() || `shfmt exited with code ${result.exitCode}`;
      Logger.warn(`shfmt formatter error: ${error}`);
      return { success: false, error };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.error('shfmt formatter threw', err instanceof Error ? err : undefined);
      return { success: false, error: message };
    }
  }
}
