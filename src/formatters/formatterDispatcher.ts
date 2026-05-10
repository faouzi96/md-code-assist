import type { CodeBlock } from '../parser/types';
import type { FormatResult } from './types';
import { formatterRegistry } from './formatterRegistry';
import { getSettings } from '../config/settings';
import { Logger } from '../utils/logger';
import * as vscode from 'vscode';

/**
 * Dispatch formatting for a single code block.
 * Returns a successful result with the same content if no formatter is registered
 * or the formatter is unavailable (graceful no-op).
 */
export async function dispatchFormat(block: CodeBlock): Promise<FormatResult> {
  if (!block.language) {
    return { success: true, formatted: block.content };
  }

  const settings = getSettings();
  if (!settings.format.enabledLanguages.includes(block.language)) {
    return { success: true, formatted: block.content };
  }

  const formatter = formatterRegistry.getFormatter(block.language);
  if (!formatter) {
    Logger.info(`No formatter registered for language: ${block.language}`);
    return { success: true, formatted: block.content };
  }

  const available = await formatter.isAvailable();
  if (!available) {
    void vscode.window.showWarningMessage(
      `Markdown Code Assistant: Formatter for "${block.language}" is not available. ` +
        `Please install the required tool and try again.`,
    );
    return { success: false, error: `Formatter for "${block.language}" not available` };
  }

  const executablePath = settings.formatters[block.language as keyof typeof settings.formatters];
  return formatter.format(block.content, {
    language: block.language,
    rawLanguage: block.rawLanguage,
    executablePath: typeof executablePath === 'string' ? executablePath : undefined,
  });
}
