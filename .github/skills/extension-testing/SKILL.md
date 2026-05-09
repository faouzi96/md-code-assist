---
name: extension-testing
description: >
  Guide for writing Jest tests for VS Code extensions, including mocking
  VS Code APIs, testing commands, and integration testing. Use when creating
  tests, debugging test failures, or setting up test infrastructure.
---

# VS Code Extension Testing with Jest

## When to Use This Skill

- Writing unit tests for extension modules
- Mocking VS Code APIs
- Testing commands and event handlers
- Setting up Jest for VS Code extensions
- Debugging test failures

## Jest Configuration

### jest.config.js

```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  moduleNameMapper: {
    '^vscode$': '<rootDir>/test/__mocks__/vscode.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
};
```

### test/setup.ts

```typescript
import { jest } from '@jest/globals';

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Global timeout for async tests
jest.setTimeout(10000);
```

## Mocking VS Code API

### test/**mocks**/vscode.ts

```typescript
import { jest } from '@jest/globals';

// URI mock
export class Uri {
  static parse(value: string): Uri {
    return new Uri(value);
  }
  static file(path: string): Uri {
    return new Uri(`file://${path}`);
  }
  constructor(public readonly fsPath: string) {}
  toString(): string {
    return this.fsPath;
  }
}

// Position mock
export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number,
  ) {}
}

// Range mock
export class Range {
  constructor(
    public readonly start: Position,
    public readonly end: Position,
  ) {}
}

// Diagnostic mock
export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export class Diagnostic {
  constructor(
    public range: Range,
    public message: string,
    public severity: DiagnosticSeverity = DiagnosticSeverity.Error,
  ) {}
}

// EventEmitter mock
export class EventEmitter<T> {
  private listeners: ((e: T) => void)[] = [];
  event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return { dispose: () => {} };
  };
  fire(data: T): void {
    this.listeners.forEach((l) => l(data));
  }
  dispose(): void {
    this.listeners = [];
  }
}

// Window mock
export const window = {
  activeTextEditor: undefined as any,
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  createTextEditorDecorationType: jest.fn(() => ({
    dispose: jest.fn(),
  })),
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn(),
  })),
};

// Workspace mock
export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
    update: jest.fn(),
  })),
  workspaceFolders: [],
  onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  onDidChangeTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
  onDidOpenTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
  onDidSaveTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
  openTextDocument: jest.fn(),
  applyEdit: jest.fn(() => Promise.resolve(true)),
  registerTextDocumentContentProvider: jest.fn(() => ({ dispose: jest.fn() })),
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
};

// Languages mock
export const languages = {
  createDiagnosticCollection: jest.fn(() => ({
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn(),
  })),
  getDiagnostics: jest.fn(() => []),
  registerDocumentFormattingEditProvider: jest.fn(() => ({ dispose: jest.fn() })),
};

// Commands mock
export const commands = {
  registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
  executeCommand: jest.fn(),
};

// WorkspaceEdit mock
export class WorkspaceEdit {
  private edits: Array<{ uri: Uri; range: Range; newText: string }> = [];
  replace(uri: Uri, range: Range, newText: string): void {
    this.edits.push({ uri, range, newText });
  }
  getEdits() {
    return this.edits;
  }
}
```

## Test Patterns

### Testing a Formatter Adapter

```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PrettierFormatter } from '../../src/formatters/adapters/prettierFormatter';

jest.mock('prettier', () => ({
  format: jest.fn(),
  resolveConfig: jest.fn(() => Promise.resolve({})),
}));

import * as prettier from 'prettier';

describe('PrettierFormatter', () => {
  let formatter: PrettierFormatter;

  beforeEach(() => {
    formatter = new PrettierFormatter('javascript', ['.js']);
    jest.clearAllMocks();
  });

  describe('format', () => {
    it('should format valid JavaScript code', async () => {
      const input = 'const x=1';
      const expected = 'const x = 1;\n';

      (prettier.format as jest.Mock).mockResolvedValue(expected);

      const result = await formatter.format(input);

      expect(result.success).toBe(true);
      expect(result.formatted).toBe(expected);
      expect(prettier.format).toHaveBeenCalledWith(
        input,
        expect.objectContaining({ parser: 'babel' }),
      );
    });

    it('should return error for invalid code', async () => {
      const input = 'const x =';

      (prettier.format as jest.Mock).mockRejectedValue(new Error('Unexpected token'));

      const result = await formatter.format(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected token');
    });
  });

  describe('isAvailable', () => {
    it('should always return true (bundled)', async () => {
      const available = await formatter.isAvailable();
      expect(available).toBe(true);
    });
  });
});
```

### Testing the Markdown Parser

```typescript
import { describe, it, expect } from '@jest/globals';
import { extractCodeBlocks } from '../../src/parser/markdownParser';

describe('extractCodeBlocks', () => {
  it('should extract a single code block', () => {
    const markdown = `
# Title

\`\`\`javascript
const x = 1;
\`\`\`
`;

    const blocks = extractCodeBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      language: 'javascript',
      code: 'const x = 1;',
      startLine: 3,
    });
  });

  it('should extract multiple code blocks', () => {
    const markdown = `
\`\`\`python
print("hello")
\`\`\`

\`\`\`typescript
const y: number = 2;
\`\`\`
`;

    const blocks = extractCodeBlocks(markdown);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].language).toBe('python');
    expect(blocks[1].language).toBe('typescript');
  });

  it('should handle code blocks without language', () => {
    const markdown = `
\`\`\`
plain text
\`\`\`
`;

    const blocks = extractCodeBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].language).toBeNull();
  });

  it('should handle empty markdown', () => {
    const blocks = extractCodeBlocks('');
    expect(blocks).toHaveLength(0);
  });
});
```

### Testing Commands

````typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as vscode from 'vscode';
import { formatCurrentBlock } from '../../src/commands/formatCurrentBlock';

describe('formatCurrentBlock', () => {
  let mockEditor: any;
  let mockDocument: any;

  beforeEach(() => {
    mockDocument = {
      languageId: 'markdown',
      getText: jest.fn(() => '# Test\n\n```javascript\nconst x=1\n```'),
      uri: vscode.Uri.file('/test.md'),
      lineAt: jest.fn((line: number) => ({
        text: ['# Test', '', '```javascript', 'const x=1', '```'][line],
      })),
    };

    mockEditor = {
      document: mockDocument,
      selection: { active: new vscode.Position(3, 0) },
      edit: jest.fn(() => Promise.resolve(true)),
    };

    (vscode.window as any).activeTextEditor = mockEditor;
  });

  it('should format the code block at cursor position', async () => {
    await formatCurrentBlock();

    expect(mockEditor.edit).toHaveBeenCalled();
  });

  it('should show warning when no active editor', async () => {
    (vscode.window as any).activeTextEditor = undefined;

    await formatCurrentBlock();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('No active editor'),
    );
  });

  it('should show warning when not in a Markdown file', async () => {
    mockDocument.languageId = 'javascript';

    await formatCurrentBlock();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining('Markdown'),
    );
  });
});
````

### Testing Diagnostic Mapping

```typescript
import { describe, it, expect } from '@jest/globals';
import * as vscode from 'vscode';
import { DiagnosticMapper } from '../../src/diagnostics/diagnosticMapper';

describe('DiagnosticMapper', () => {
  let mapper: DiagnosticMapper;

  beforeEach(() => {
    mapper = new DiagnosticMapper();
  });

  it('should map diagnostic position from virtual to markdown', () => {
    const virtualDoc = {
      uri: vscode.Uri.parse('md-code-assist://virtual/test.js'),
      languageId: 'javascript',
      content: 'const x = 1;',
      sourceUri: vscode.Uri.file('/test.md'),
      codeBlock: {
        language: 'javascript',
        code: 'const x = 1;',
        startLine: 5, // Fence is on line 5 (0-indexed)
        endLine: 7,
      },
    };

    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(
        new vscode.Position(0, 0), // Line 0 in virtual doc
        new vscode.Position(0, 5),
      ),
      'Test error',
    );

    const mapped = mapper.mapDiagnostic(diagnostic, virtualDoc as any);

    // Virtual line 0 + fence line 5 + 1 = Markdown line 6
    expect(mapped.mappedRange.start.line).toBe(6);
    expect(mapped.mappedRange.start.character).toBe(0);
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- markdownParser.test.ts

# Run in watch mode
npm test -- --watch

# Run with verbose output
npm test -- --verbose
```

## Common Issues

| Issue                         | Cause               | Solution                               |
| ----------------------------- | ------------------- | -------------------------------------- |
| "Cannot find module 'vscode'" | Mock not configured | Add moduleNameMapper in jest.config.js |
| Tests hang                    | Unresolved promises | Add timeout, check async/await         |
| Mock not working              | Wrong import order  | Import mock before module under test   |
| Type errors in mocks          | Incomplete mock     | Add missing properties or use `as any` |
