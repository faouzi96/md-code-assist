import type { IFormatter, FormatOptions, FormatResult } from './types';
import { runCli } from '../utils/cliRunner';
import { isToolAvailable } from '../utils/toolDetector';
import { Logger } from '../utils/logger';

export class BlackFormatter implements IFormatter {
  readonly supportedLanguages: readonly string[] = ['python'];

  private readonly executablePath: string;

  constructor(executablePath: string = 'black') {
    this.executablePath = executablePath;
  }

  async isAvailable(): Promise<boolean> {
    return isToolAvailable(this.executablePath);
  }

  async format(code: string, _options: FormatOptions): Promise<FormatResult> {
    try {
      // `-` tells Black to read from stdin; `--quiet` suppresses "reformatted" messages
      const result = await runCli(this.executablePath, ['-', '--quiet'], code);
      if (result.exitCode === 0) {
        const trimmed = result.stdout.endsWith('\n') ? result.stdout.slice(0, -1) : result.stdout;
        return { success: true, formatted: trimmed };
      }
      const error = result.stderr.trim() || `Black exited with code ${result.exitCode}`;
      Logger.warn(`Black formatter error: ${error}`);
      return { success: false, error };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.error('Black formatter threw', err instanceof Error ? err : undefined);
      return { success: false, error: message };
    }
  }
}
