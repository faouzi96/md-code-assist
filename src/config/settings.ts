import * as vscode from 'vscode';

export interface ExtensionSettings {
  format: {
    enabledLanguages: string[];
  };
  diagnostics: {
    enabledLanguages: string[];
    severityLevel: 'error' | 'warning' | 'info' | 'hint';
  };
  formatters: {
    blackPath: string;
    shfmtPath: string;
    [key: string]: string;
  };
  decorations: {
    showGutterIcons: boolean;
    showInlineErrors: boolean;
  };
  formatOnSave: boolean;
}

export function getSettings(): ExtensionSettings {
  const config = vscode.workspace.getConfiguration('mdCodeAssist');
  return {
    format: {
      enabledLanguages: config.get<string[]>('format.enabledLanguages') ?? [
        'javascript',
        'typescript',
        'python',
        'json',
        'yaml',
        'html',
        'css',
        'shell',
        'graphql',
        'markdown',
      ],
    },
    diagnostics: {
      enabledLanguages: config.get<string[]>('diagnostics.enabledLanguages') ?? [
        'javascript',
        'typescript',
        'python',
        'json',
        'yaml',
        'css',
        'html',
        'shell',
      ],
      severityLevel:
        config.get<'error' | 'warning' | 'info' | 'hint'>('diagnostics.severityLevel') ?? 'warning',
    },
    formatters: {
      blackPath: config.get<string>('formatters.blackPath') ?? 'black',
      shfmtPath: config.get<string>('formatters.shfmtPath') ?? 'shfmt',
    },
    decorations: {
      showGutterIcons: config.get<boolean>('decorations.showGutterIcons') ?? true,
      showInlineErrors: config.get<boolean>('decorations.showInlineErrors') ?? true,
    },
    formatOnSave: config.get<boolean>('formatOnSave') ?? false,
  };
}
