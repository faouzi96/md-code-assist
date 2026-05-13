import * as vscode from 'vscode';

export type TriggerMode = 'onCommand' | 'onSave' | 'onType';

export interface ExtensionSettings {
  format: {
    enabledLanguages: string[];
    triggerMode: TriggerMode;
  };
  diagnostics: {
    enabledLanguages: string[];
    severityLevel: 'error' | 'warning' | 'info' | 'hint';
    triggerMode: TriggerMode;
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
}

export function getSettings(): ExtensionSettings {
  const config = vscode.workspace.getConfiguration('mdCodeAssist');
  return {
    format: {
      triggerMode: config.get<TriggerMode>('format.triggerMode') ?? 'onCommand',
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
        'sql',
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
        'sql',
      ],
      severityLevel:
        config.get<'error' | 'warning' | 'info' | 'hint'>('diagnostics.severityLevel') ?? 'warning',
      triggerMode: config.get<TriggerMode>('diagnostics.triggerMode') ?? 'onCommand',
    },
    formatters: {
      blackPath: config.get<string>('formatters.blackPath') ?? 'black',
      shfmtPath: config.get<string>('formatters.shfmtPath') ?? 'shfmt',
    },
    decorations: {
      showGutterIcons: config.get<boolean>('decorations.showGutterIcons') ?? true,
      showInlineErrors: config.get<boolean>('decorations.showInlineErrors') ?? true,
    },
  };
}
