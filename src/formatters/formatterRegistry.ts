import type { IFormatter } from './types';

/**
 * Maps fence language labels (including aliases) to their canonical language ID.
 * E.g. "py" → "python", "bash" → "shell".
 */
export const LANGUAGE_ALIASES: ReadonlyMap<string, string> = new Map([
  ['js', 'javascript'],
  ['jsx', 'javascript'],
  ['ts', 'typescript'],
  ['tsx', 'typescript'],
  ['py', 'python'],
  ['python3', 'python'],
  ['sh', 'shell'],
  ['bash', 'shell'],
  ['zsh', 'shell'],
  ['jsonc', 'json'],
  ['yml', 'yaml'],
  ['scss', 'css'],
  ['less', 'css'],
  ['gql', 'graphql'],
  ['md', 'markdown'],
]);

/** Registry that maps canonical language IDs to formatter instances. */
export class FormatterRegistry {
  private readonly registry = new Map<string, IFormatter>();

  register(formatter: IFormatter): void {
    for (const lang of formatter.supportedLanguages) {
      this.registry.set(lang, formatter);
    }
  }

  getFormatter(language: string): IFormatter | undefined {
    return this.registry.get(language);
  }

  getSupportedLanguages(): string[] {
    return [...this.registry.keys()];
  }
}

/** Singleton registry — populated in extension.ts or lazily on first use. */
export const formatterRegistry = new FormatterRegistry();
