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

// prettier-plugin-sh: loaded via require() so VS Code's patched module resolver
// finds it in the extension's node_modules (dynamic import() can fail in the
// Electron-based extension host due to the ESM→WASM loading chain).
let pluginShCache: Record<string, unknown> | undefined;
function getPluginSh(): Record<string, unknown> {
  if (!pluginShCache) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pluginShCache = require('prettier-plugin-sh') as Record<string, unknown>;
  }
  return pluginShCache;
}

// prettier-plugin-sql: same reason as above.
let pluginSqlCache: Record<string, unknown> | undefined;
function getPluginSql(): Record<string, unknown> {
  if (!pluginSqlCache) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pluginSqlCache = require('prettier-plugin-sql') as Record<string, unknown>;
  }
  return pluginSqlCache;
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
  // SQL via prettier-plugin-sql (no external CLI required)
  ['sql', 'sql'],
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
      // For CSS-family languages, use the more specific Prettier parser when the raw
      // fence label indicates SCSS or Less — the generic CSS parser rejects their syntax
      // (e.g. $variables, @mixin, nesting operators).
      const effectiveParser =
        parser === 'css' && options.rawLanguage === 'scss'
          ? 'scss'
          : parser === 'css' && options.rawLanguage === 'less'
            ? 'less'
            : parser;
      // Shell formatting requires the prettier-plugin-sh plugin.
      // variant: 0=LangBash, 1=LangPOSIX (default per sh-syntax enum)
      const plugins =
        effectiveParser === 'sh'
          ? [getPluginSh()]
          : effectiveParser === 'sql'
            ? [getPluginSql()]
            : [];
      const variant =
        effectiveParser === 'sh' && options.rawLanguage === 'bash' ? { variant: 0 } : {};
      const formatted = await prettier.format(code, {
        parser: effectiveParser,
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
