// Manual mock for the 'vscode' module used in Jest tests.
// Add stubs here as needed when new VS Code APIs are used.

const vscode = {
  window: {
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      dispose: jest.fn(),
      show: jest.fn(),
    })),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    withProgress: jest.fn((_opts: unknown, task: (progress: unknown) => Promise<unknown>) =>
      task({ report: jest.fn() }),
    ),
    activeTextEditor: undefined,
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn(),
    })),
    onDidChangeTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
    onDidSaveTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
    onDidCloseTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
    registerTextDocumentContentProvider: jest.fn(() => ({ dispose: jest.fn() })),
    applyEdit: jest.fn(() => Promise.resolve(true)),
    fs: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
    },
  },
  languages: {
    registerDocumentFormattingEditProvider: jest.fn(() => ({ dispose: jest.fn() })),
    getDiagnostics: jest.fn(() => []),
    createDiagnosticCollection: jest.fn(() => ({
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn(),
    })),
  },
  commands: {
    registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
    executeCommand: jest.fn(),
  },
  Uri: {
    parse: jest.fn((s: string) => ({ toString: () => s, fsPath: s, scheme: s.split(':')[0] })),
    file: jest.fn((s: string) => ({ toString: () => `file://${s}`, fsPath: s, scheme: 'file' })),
  },
  Range: jest.fn(function (
    startLineOrStart: number | { line: number; character: number },
    startCharOrEnd: number | { line: number; character: number },
    endLine?: number,
    endChar?: number,
  ) {
    if (typeof startLineOrStart === 'number') {
      return {
        start: { line: startLineOrStart, character: startCharOrEnd as number },
        end: { line: endLine as number, character: endChar as number },
      };
    }
    // Called as new Range(startPosition, endPosition)
    return { start: startLineOrStart, end: startCharOrEnd };
  }),
  Position: jest.fn((line: number, character: number) => ({ line, character })),
  TextEdit: {
    replace: jest.fn((range: unknown, newText: string) => ({ range, newText })),
  },
  WorkspaceEdit: jest.fn(() => ({
    replace: jest.fn(),
    set: jest.fn(),
  })),
  Diagnostic: jest.fn((range: unknown, message: string, severity: number) => ({
    range,
    message,
    severity,
  })),
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
  ProgressLocation: {
    Notification: 15,
    Window: 10,
    SourceControl: 1,
  },
  EventEmitter: jest.fn(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn(),
  })),
  CancellationTokenSource: jest.fn(() => ({
    token: { isCancellationRequested: false, onCancellationRequested: jest.fn() },
    cancel: jest.fn(),
    dispose: jest.fn(),
  })),
  window_createTextEditorDecorationType: jest.fn(() => ({ dispose: jest.fn() })),
};

(vscode.window as unknown as Record<string, unknown>)['createTextEditorDecorationType'] =
  vscode.window_createTextEditorDecorationType;

module.exports = vscode;
