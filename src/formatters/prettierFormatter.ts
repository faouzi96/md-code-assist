import type { IFormatter, FormatOptions, FormatResult } from './types';
import { Logger } from '../utils/logger';

// Prettier is NOT bundled (it is external in esbuild) — loaded from node_modules/prettier
// at runtime so its ESM import.meta.url usage resolves correctly in Node.js.
type PrettierModule = typeof import('prettier');
let prettierCache: PrettierModule | undefined;
async function getPrettier(): Promise<PrettierModule> {
  if (!prettierCache) {
    prettierCache = (await import('prettier')) as PrettierModule;
  }
  return prettierCache;
}

const PRETTIER_PARSERS: ReadonlyMap<string, string> = new Map([
  ['javascript', 'babel'],
  ['typescript', 'typescript'],
  ['json', 'json'],
  ['yaml', 'yaml'],
  ['html', 'html'],
  ['css', 'css'],
  ['graphql', 'graphql'],
  ['markdown', 'markdown'],
]);

export class PrettierFormatter implements IFormatter {
  readonly supportedLanguages: readonly string[] = [...PRETTIER_PARSERS.keys()];

  async isAvailable(): Promise<boolean> {
    try {
      await getPrettier();
      return true;
    } catch {
      return false;
    }
  }

  async format(code: string, options: FormatOptions): Promise<FormatResult> {
    const parser = PRETTIER_PARSERS.get(options.language);
    if (!parser) {
      return { success: false, error: `No Prettier parser for language "${options.language}"` };
    }
    try {
      const prettier = await getPrettier();
      const formatted = await prettier.format(code, { parser, endOfLine: 'lf' });
      const trimmed = formatted.endsWith('\n') ? formatted.slice(0, -1) : formatted;
      return { success: true, formatted: trimmed };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.warn(`Prettier failed for ${options.language}: ${message}`);
      return { success: false, error: message };
    }
  }
}
