import type { IFormatter, FormatOptions, FormatResult } from './types';
import { Logger } from '../utils/logger';

// Prettier is NOT bundled (it is external in esbuild) - loaded from node_modules/prettier
// at runtime so its ESM import.meta.url usage resolves correctly in Node.js.
type PrettierModule = typeof import('prettier');
let prettierCache: PrettierModule | undefined;
async function getPrettier(): Promise<PrettierModule> {
  if (!prettierCache) {
    prettierCache = (await import('prettier')) as PrettierModule;
  }
  return prettierCache;
}

// prettier-plugin-sh is loaded lazily so its WASM initialises only when needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pluginShCache: Record<string, unknown> | undefined;
async function getPluginSh(): Promise<Record<string, unknown>> {
  if (!pluginShCache) {
    const mod = await import('prettier-plugin-sh');
    pluginShCache = (mod.default ?? mod) as Record<string, unknown>;
  }
  return pluginShCache;
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
  // Shell/Bash via prettier-plugin-sh (no external CLI required)
  ['shell', 'sh'],
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
    // zsh uses features unsupported by sh-syntax — skip formatting to avoid garbled output.
    if (options.rawLanguage === 'zsh') {
      return { success: true, formatted: code };
    }
    try {
      const prettier = await getPrettier();
      // Shell formatting requires the prettier-plugin-sh plugin.
      // variant: 0=LangBash, 1=LangPOSIX (default per sh-syntax enum)
      const plugins = parser === 'sh' ? [await getPluginSh()] : [];
      const variant = parser === 'sh' && options.rawLanguage === 'bash' ? { variant: 0 } : {};
      const formatted = await prettier.format(code, {
        parser,
        endOfLine: 'lf',
        plugins,
        ...variant,
      });
      const trimmed = formatted.endsWith('\n') ? formatted.slice(0, -1) : formatted;
      return { success: true, formatted: trimmed };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Logger.warn(`Prettier failed for ${options.language}: ${message}`);
      return { success: false, error: message };
    }
  }
}
