import { FormatterRegistry, LANGUAGE_ALIASES } from '../../../src/formatters/formatterRegistry';
import type { IFormatter, FormatOptions, FormatResult } from '../../../src/formatters/types';

function makeFormatter(langs: string[]): IFormatter {
  return {
    supportedLanguages: langs,
    isAvailable: async () => true,
    format: async (code: string, _opts: FormatOptions): Promise<FormatResult> => ({
      success: true,
      formatted: code.trim(),
    }),
  };
}

describe('FormatterRegistry', () => {
  it('registers and retrieves a formatter by language', () => {
    const registry = new FormatterRegistry();
    const fmt = makeFormatter(['typescript']);
    registry.register(fmt);
    expect(registry.getFormatter('typescript')).toBe(fmt);
  });

  it('registers multiple languages for one formatter', () => {
    const registry = new FormatterRegistry();
    const fmt = makeFormatter(['javascript', 'typescript']);
    registry.register(fmt);
    expect(registry.getFormatter('javascript')).toBe(fmt);
    expect(registry.getFormatter('typescript')).toBe(fmt);
  });

  it('returns undefined for unregistered language', () => {
    const registry = new FormatterRegistry();
    expect(registry.getFormatter('cobol')).toBeUndefined();
  });

  it('returns all registered languages', () => {
    const registry = new FormatterRegistry();
    registry.register(makeFormatter(['python']));
    registry.register(makeFormatter(['shell']));
    expect(registry.getSupportedLanguages()).toEqual(expect.arrayContaining(['python', 'shell']));
  });
});

describe('LANGUAGE_ALIASES', () => {
  it('maps py to python', () => {
    expect(LANGUAGE_ALIASES.get('py')).toBe('python');
  });

  it('maps bash to shell', () => {
    expect(LANGUAGE_ALIASES.get('bash')).toBe('shell');
  });

  it('maps ts to typescript', () => {
    expect(LANGUAGE_ALIASES.get('ts')).toBe('typescript');
  });

  it('maps js to javascript', () => {
    expect(LANGUAGE_ALIASES.get('js')).toBe('javascript');
  });

  it('maps yml to yaml', () => {
    expect(LANGUAGE_ALIASES.get('yml')).toBe('yaml');
  });
});
