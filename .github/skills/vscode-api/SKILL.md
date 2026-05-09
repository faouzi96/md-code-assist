---
name: vscode-api
description: >
  Deep knowledge of VS Code Extension API for commands, decorations, diagnostics,
  text documents, editors, and workspace management. Use when working with VS Code
  extension development, registering commands, creating decorations, or managing
  the extension lifecycle.
---

# VS Code Extension API

## When to Use This Skill

- Registering or implementing commands
- Creating editor decorations (squiggles, gutters, inline text)
- Working with the Diagnostics API
- Managing text documents and editors
- Handling workspace and configuration
- Extension activation and lifecycle

## Core API Patterns

### Extension Lifecycle

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Register disposables
  context.subscriptions.push(
    vscode.commands.registerCommand('ext.command', handler),
    vscode.languages.registerDocumentFormattingEditProvider('markdown', provider),
  );
}

export function deactivate() {
  // Cleanup if needed
}
```

### Commands

```typescript
// Register
const disposable = vscode.commands.registerCommand('mdCodeAssist.formatBlocks', async () => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  // Implementation
});

// Execute programmatically
await vscode.commands.executeCommand('mdCodeAssist.formatBlocks');
```

### Diagnostics

```typescript
// Create collection
const diagnosticCollection = vscode.languages.createDiagnosticCollection('mdCodeAssist');

// Set diagnostics for a document
const diagnostics: vscode.Diagnostic[] = [
  new vscode.Diagnostic(
    new vscode.Range(startLine, startCol, endLine, endCol),
    'Error message',
    vscode.DiagnosticSeverity.Error
  ),
];
diagnosticCollection.set(document.uri, diagnostics);

// Clear
diagnosticCollection.clear();
```

### Decorations

```typescript
// Create decoration type
const errorDecoration = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255, 0, 0, 0.1)',
  border: '1px solid red',
  after: {
    contentText: ' ← Error here',
    color: 'red',
  },
});

// Apply decorations
editor.setDecorations(errorDecoration, [range1, range2]);

// Dispose when done
errorDecoration.dispose();
```

### Text Documents & Edits

```typescript
// Get active document
const document = vscode.window.activeTextEditor?.document;

// Read content
const text = document.getText();
const lineText = document.lineAt(lineNumber).text;

// Apply edits
const edit = new vscode.WorkspaceEdit();
edit.replace(document.uri, range, newText);
await vscode.workspace.applyEdit(edit);

// Or use editor.edit for active editor
await editor.edit((editBuilder) => {
  editBuilder.replace(range, newText);
});
```

### Virtual Documents

```typescript
// Register provider
const provider = new (class implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(uri: vscode.Uri): string {
    // Return virtual document content
    return extractedCodeBlock;
  }
})();

context.subscriptions.push(
  vscode.workspace.registerTextDocumentContentProvider('md-virtual', provider)
);

// Open virtual document
const uri = vscode.Uri.parse('md-virtual://authority/path.js');
const doc = await vscode.workspace.openTextDocument(uri);
```

### Configuration

```typescript
// Read settings
const config = vscode.workspace.getConfiguration('mdCodeAssist');
const enabled = config.get<boolean>('python.enabled', true);
const path = config.get<string>('python.path', '');

// Watch for changes
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration('mdCodeAssist')) {
    reloadSettings();
  }
});
```

### Document Events

```typescript
// Document opened
vscode.workspace.onDidOpenTextDocument((doc) => {
  if (doc.languageId === 'markdown') {
    analyzeDocument(doc);
  }
});

// Document changed
vscode.workspace.onDidChangeTextDocument((e) => {
  if (e.document.languageId === 'markdown') {
    debounceAnalyze(e.document);
  }
});

// Document saved
vscode.workspace.onDidSaveTextDocument((doc) => {
  // Post-save actions
});
```

## Best Practices

1. **Always dispose resources** — Add to `context.subscriptions`
2. **Check for active editor** — It can be `undefined`
3. **Use async/await** — Most APIs return Promises
4. **Debounce document changes** — Avoid excessive processing
5. **Respect cancellation tokens** — For long-running operations
6. **Use `vscode.workspace.fs`** — For file system operations (not Node's `fs`)

## Common Gotchas

| Issue | Solution |
|-------|----------|
| Decorations disappear | Re-apply after document changes |
| Commands not found | Check activation events in package.json |
| Settings not updating | Listen to `onDidChangeConfiguration` |
| Extension not activating | Verify `activationEvents` in package.json |
