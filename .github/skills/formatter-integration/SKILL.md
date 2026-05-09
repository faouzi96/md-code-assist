---
name: formatter-integration
description: >
  Guide for integrating code formatters (Prettier, Black, shfmt, etc.) into
  md-code-assist. Use when adding new formatter adapters, debugging formatter
  execution, or handling CLI tool integration.
---

# Formatter Integration

## When to Use This Skill

- Adding a new formatter adapter
- Debugging formatter execution issues
- Handling CLI tool detection and invocation
- Working with Prettier API
- Managing formatter configuration files

## Formatter Adapter Interface

```typescript
export interface FormatterOptions {
  tabWidth?: number;
  useTabs?: boolean;
  printWidth?: number;
  configPath?: string;
}

export interface FormatterResult {
  success: boolean;
  formatted?: string;
  error?: string;
}

export interface FormatterAdapter {
  readonly languageId: string;
  readonly supportedExtensions: string[];
  
  /**
   * Check if the formatter is available (installed)
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Format the given code
   */
  format(code: string, options?: FormatterOptions): Promise<FormatterResult>;
}
```

## Prettier Integration (API-based)

```typescript
import * as prettier from 'prettier';

export class PrettierFormatter implements FormatterAdapter {
  readonly languageId: string;
  readonly supportedExtensions: string[];

  constructor(languageId: string, extensions: string[]) {
    this.languageId = languageId;
    this.supportedExtensions = extensions;
  }

  async isAvailable(): Promise<boolean> {
    return true; // Bundled with extension
  }

  async format(code: string, options?: FormatterOptions): Promise<FormatterResult> {
    try {
      // Resolve config from workspace
      const config = await prettier.resolveConfig(process.cwd());
      
      const formatted = await prettier.format(code, {
        ...config,
        parser: this.getParser(),
        tabWidth: options?.tabWidth ?? config?.tabWidth ?? 2,
        useTabs: options?.useTabs ?? config?.useTabs ?? false,
      });

      return { success: true, formatted };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private getParser(): string {
    const parserMap: Record<string, string> = {
      javascript: 'babel',
      typescript: 'typescript',
      json: 'json',
      html: 'html',
      css: 'css',
      yaml: 'yaml',
      markdown: 'markdown',
    };
    return parserMap[this.languageId] || this.languageId;
  }
}
```

## CLI-based Formatter (Black, shfmt, etc.)

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as which from 'which';

const execFileAsync = promisify(execFile);

export class CliFormatter implements FormatterAdapter {
  readonly languageId: string;
  readonly supportedExtensions: string[];
  private readonly command: string;
  private readonly args: string[];

  constructor(
    languageId: string,
    extensions: string[],
    command: string,
    args: string[] = []
  ) {
    this.languageId = languageId;
    this.supportedExtensions = extensions;
    this.command = command;
    this.args = args;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await which(this.command);
      return true;
    } catch {
      return false;
    }
  }

  async format(code: string, options?: FormatterOptions): Promise<FormatterResult> {
    try {
      const { stdout, stderr } = await execFileAsync(
        this.command,
        [...this.args, '-'],
        {
          input: code,
          timeout: 10000,
          maxBuffer: 1024 * 1024,
        }
      );

      if (stderr && !stdout) {
        return { success: false, error: stderr };
      }

      return { success: true, formatted: stdout };
    } catch (error: any) {
      return {
        success: false,
        error: error.stderr || error.message || String(error),
      };
    }
  }
}
```

## Specific Formatter Examples

### Python (Black)

```typescript
export class BlackFormatter extends CliFormatter {
  constructor() {
    super('python', ['.py'], 'black', ['--code']);
  }

  async format(code: string, options?: FormatterOptions): Promise<FormatterResult> {
    const args = ['--code', code];
    
    if (options?.printWidth) {
      args.unshift('--line-length', String(options.printWidth));
    }

    try {
      const { stdout } = await execFileAsync('black', args, {
        timeout: 10000,
      });
      return { success: true, formatted: stdout };
    } catch (error: any) {
      return { success: false, error: error.stderr || error.message };
    }
  }
}
```

### Shell (shfmt)

```typescript
export class ShfmtFormatter extends CliFormatter {
  constructor() {
    super('shellscript', ['.sh', '.bash'], 'shfmt', []);
  }

  async format(code: string, options?: FormatterOptions): Promise<FormatterResult> {
    const args: string[] = [];
    
    if (options?.tabWidth) {
      args.push('-i', String(options.tabWidth));
    }
    if (options?.useTabs) {
      args.push('-i', '0'); // 0 means tabs
    }

    args.push('-'); // Read from stdin

    try {
      const { stdout } = await execFileAsync('shfmt', args, {
        input: code,
        timeout: 10000,
      });
      return { success: true, formatted: stdout };
    } catch (error: any) {
      return { success: false, error: error.stderr || error.message };
    }
  }
}
```

## Formatter Registry

```typescript
export class FormatterRegistry {
  private formatters = new Map<string, FormatterAdapter>();

  register(formatter: FormatterAdapter): void {
    this.formatters.set(formatter.languageId, formatter);
  }

  get(languageId: string): FormatterAdapter | undefined {
    return this.formatters.get(languageId);
  }

  async getAvailable(languageId: string): Promise<FormatterAdapter | undefined> {
    const formatter = this.formatters.get(languageId);
    if (formatter && await formatter.isAvailable()) {
      return formatter;
    }
    return undefined;
  }

  getSupportedLanguages(): string[] {
    return Array.from(this.formatters.keys());
  }
}

// Initialize registry
export const formatterRegistry = new FormatterRegistry();
formatterRegistry.register(new PrettierFormatter('javascript', ['.js', '.jsx']));
formatterRegistry.register(new PrettierFormatter('typescript', ['.ts', '.tsx']));
formatterRegistry.register(new BlackFormatter());
formatterRegistry.register(new ShfmtFormatter());
```

## Configuration Integration

```typescript
import * as vscode from 'vscode';

export function getFormatterConfig(languageId: string): FormatterOptions {
  const config = vscode.workspace.getConfiguration('mdCodeAssist');
  const editorConfig = vscode.workspace.getConfiguration('editor');

  return {
    tabWidth: editorConfig.get('tabSize', 2),
    useTabs: editorConfig.get('insertSpaces', true) === false,
    printWidth: config.get(`${languageId}.printWidth`, 80),
    configPath: config.get(`${languageId}.configPath`, ''),
  };
}
```

## Error Handling Patterns

```typescript
async function formatWithFallback(
  code: string,
  languageId: string
): Promise<FormatterResult> {
  const formatter = await formatterRegistry.getAvailable(languageId);

  if (!formatter) {
    // No formatter available - return original
    return {
      success: true,
      formatted: code,
    };
  }

  const result = await formatter.format(code);

  if (!result.success) {
    // Log error but don't fail
    console.warn(`Formatter error for ${languageId}: ${result.error}`);
    vscode.window.showWarningMessage(
      `Could not format ${languageId} code: ${result.error}`
    );
    return { success: true, formatted: code };
  }

  return result;
}
```

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "command not found" | Tool not installed | Check `isAvailable()` first, show install prompt |
| Timeout | Large code block | Increase timeout, add progress indicator |
| Wrong formatting | Missing config | Resolve config from workspace root |
| Encoding issues | Non-UTF8 input | Ensure UTF-8 encoding in execFile |
