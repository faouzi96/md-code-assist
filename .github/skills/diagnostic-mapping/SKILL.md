---
name: diagnostic-mapping
description: >
  Expertise in mapping diagnostics from virtual documents back to original
  Markdown positions. Use when working on virtual document providers, LSP
  integration, diagnostic position translation, or inline error display.
---

# Diagnostic Mapping

## When to Use This Skill

- Creating virtual documents for code blocks
- Mapping LSP diagnostics to Markdown positions
- Handling position offsets between documents
- Integrating with VS Code's diagnostic system
- Displaying inline errors in Markdown files

## Architecture Overview

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Markdown File     │────▶│  Virtual Document    │────▶│  Language Server │
│   (source.md)       │     │  (virtual://...)     │     │  (LSP)           │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
         ▲                                                        │
         │                                                        │
         │              ┌──────────────────────┐                  │
         └──────────────│  Diagnostic Mapper   │◀─────────────────┘
                        │  (position mapping)  │    Diagnostics
                        └──────────────────────┘
```

## Virtual Document Provider

```typescript
import * as vscode from 'vscode';

interface VirtualDocument {
  uri: vscode.Uri;
  languageId: string;
  content: string;
  sourceUri: vscode.Uri;
  codeBlock: CodeBlock;
}

const virtualDocuments = new Map<string, VirtualDocument>();

export class VirtualDocumentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  provideTextDocumentContent(uri: vscode.Uri): string {
    const doc = virtualDocuments.get(uri.toString());
    return doc?.content ?? '';
  }

  createVirtualDocument(
    sourceUri: vscode.Uri,
    codeBlock: CodeBlock,
    index: number
  ): VirtualDocument {
    const virtualUri = vscode.Uri.parse(
      `md-code-assist://virtual/${sourceUri.fsPath}/${index}.${codeBlock.language}`
    );

    const doc: VirtualDocument = {
      uri: virtualUri,
      languageId: codeBlock.language!,
      content: codeBlock.code,
      sourceUri,
      codeBlock,
    };

    virtualDocuments.set(virtualUri.toString(), doc);
    this._onDidChange.fire(virtualUri);

    return doc;
  }

  updateVirtualDocument(uri: vscode.Uri, content: string): void {
    const doc = virtualDocuments.get(uri.toString());
    if (doc) {
      doc.content = content;
      this._onDidChange.fire(uri);
    }
  }

  deleteVirtualDocument(uri: vscode.Uri): void {
    virtualDocuments.delete(uri.toString());
  }

  getVirtualDocument(uri: vscode.Uri): VirtualDocument | undefined {
    return virtualDocuments.get(uri.toString());
  }
}
```

## Position Mapping

### Understanding the Offset

````markdown
Line 1: # Header
Line 2:
Line 3: ```javascript     ← codeBlock.startLine (fence)
Line 4: const x = 1;      ← First line of code (startLine + 1)
Line 5: const y = 2;      ← Second line of code (startLine + 2)
Line 6: ```               ← codeBlock.endLine (fence)
Line 7:
````

```typescript
// Virtual document (0-indexed):
// Line 0: const x = 1;
// Line 1: const y = 2;

// Mapping formula:
// markdownLine = codeBlock.startLine + virtualLine + 1
// (startLine is the fence, +1 to get to first code line)
```

### Diagnostic Mapper Implementation

```typescript
import * as vscode from 'vscode';

export interface MappedDiagnostic {
  original: vscode.Diagnostic;
  mappedRange: vscode.Range;
  sourceUri: vscode.Uri;
}

export class DiagnosticMapper {
  /**
   * Map a diagnostic from virtual document coordinates
   * to Markdown document coordinates
   */
  mapDiagnostic(
    diagnostic: vscode.Diagnostic,
    virtualDoc: VirtualDocument
  ): MappedDiagnostic {
    const { codeBlock } = virtualDoc;
    const fenceLine = codeBlock.startLine; // 0-indexed

    // Map the range
    const mappedRange = new vscode.Range(
      this.mapPosition(diagnostic.range.start, fenceLine),
      this.mapPosition(diagnostic.range.end, fenceLine)
    );

    return {
      original: diagnostic,
      mappedRange,
      sourceUri: virtualDoc.sourceUri,
    };
  }

  private mapPosition(
    position: vscode.Position,
    fenceLine: number
  ): vscode.Position {
    // Virtual line 0 = Markdown line (fenceLine + 1)
    const markdownLine = fenceLine + position.line + 1;
    
    // Column stays the same (code block content is not indented in virtual doc)
    // But if the code block itself is indented, we'd need to add that offset
    const markdownColumn = position.character;

    return new vscode.Position(markdownLine, markdownColumn);
  }

  /**
   * Map multiple diagnostics for a code block
   */
  mapDiagnostics(
    diagnostics: vscode.Diagnostic[],
    virtualDoc: VirtualDocument
  ): MappedDiagnostic[] {
    return diagnostics.map((d) => this.mapDiagnostic(d, virtualDoc));
  }
}
```

## Diagnostic Manager

```typescript
import * as vscode from 'vscode';

export class DiagnosticManager {
  private collection: vscode.DiagnosticCollection;
  private mapper: DiagnosticMapper;
  private documentDiagnostics = new Map<string, vscode.Diagnostic[]>();

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection('mdCodeAssist');
    this.mapper = new DiagnosticMapper();
  }

  /**
   * Update diagnostics for a Markdown document
   */
  updateDiagnostics(
    markdownUri: vscode.Uri,
    virtualDocs: VirtualDocument[],
    diagnosticsPerBlock: Map<string, vscode.Diagnostic[]>
  ): void {
    const allMappedDiagnostics: vscode.Diagnostic[] = [];

    for (const virtualDoc of virtualDocs) {
      const blockDiagnostics = diagnosticsPerBlock.get(virtualDoc.uri.toString());
      if (!blockDiagnostics) continue;

      const mapped = this.mapper.mapDiagnostics(blockDiagnostics, virtualDoc);
      
      for (const { original, mappedRange } of mapped) {
        allMappedDiagnostics.push(
          new vscode.Diagnostic(
            mappedRange,
            original.message,
            original.severity
          )
        );
      }
    }

    this.collection.set(markdownUri, allMappedDiagnostics);
    this.documentDiagnostics.set(markdownUri.toString(), allMappedDiagnostics);
  }

  /**
   * Clear diagnostics for a document
   */
  clearDiagnostics(uri: vscode.Uri): void {
    this.collection.delete(uri);
    this.documentDiagnostics.delete(uri.toString());
  }

  dispose(): void {
    this.collection.dispose();
  }
}
```

## Handling Indented Code Blocks

````markdown
- List item:
  ```javascript
  const x = 1;
  ```
````

```typescript
interface CodeBlock {
  // ... other fields
  indentation: number; // Number of spaces before the fence
}

private mapPosition(
  position: vscode.Position,
  fenceLine: number,
  indentation: number
): vscode.Position {
  const markdownLine = fenceLine + position.line + 1;
  // Add indentation offset to column
  const markdownColumn = position.character + indentation;
  return new vscode.Position(markdownLine, markdownColumn);
}
```

## Triggering Diagnostics

```typescript
export class DiagnosticTrigger {
  private debounceTimer: NodeJS.Timeout | undefined;
  private readonly debounceMs = 500;

  constructor(
    private virtualDocProvider: VirtualDocumentProvider,
    private diagnosticManager: DiagnosticManager
  ) {}

  /**
   * Trigger diagnostic refresh for a Markdown document
   */
  triggerDiagnostics(document: vscode.TextDocument): void {
    if (document.languageId !== 'markdown') return;

    // Debounce to avoid excessive processing
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.runDiagnostics(document);
    }, this.debounceMs);
  }

  private async runDiagnostics(document: vscode.TextDocument): Promise<void> {
    // 1. Parse Markdown and extract code blocks
    const codeBlocks = extractCodeBlocks(document.getText());

    // 2. Create/update virtual documents
    const virtualDocs = codeBlocks
      .filter((block) => block.language)
      .map((block, index) =>
        this.virtualDocProvider.createVirtualDocument(
          document.uri,
          block,
          index
        )
      );

    // 3. Request diagnostics from language services
    const diagnosticsPerBlock = await this.collectDiagnostics(virtualDocs);

    // 4. Map and display
    this.diagnosticManager.updateDiagnostics(
      document.uri,
      virtualDocs,
      diagnosticsPerBlock
    );
  }

  private async collectDiagnostics(
    virtualDocs: VirtualDocument[]
  ): Promise<Map<string, vscode.Diagnostic[]>> {
    const result = new Map<string, vscode.Diagnostic[]>();

    for (const doc of virtualDocs) {
      // Open the virtual document to trigger language services
      const textDoc = await vscode.workspace.openTextDocument(doc.uri);
      
      // Get diagnostics (may need to wait for language server)
      const diagnostics = vscode.languages.getDiagnostics(doc.uri);
      result.set(doc.uri.toString(), diagnostics);
    }

    return result;
  }
}
```

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Off-by-one line errors | Fence line not accounted for | Add +1 when mapping from virtual to Markdown |
| Wrong column positions | Indented code blocks | Track and add indentation offset |
| Stale diagnostics | Document changed | Clear and re-run on `onDidChangeTextDocument` |
| Missing diagnostics | Language server not activated | Ensure language extension is installed and activated |
| Duplicate diagnostics | Multiple virtual docs for same block | Use unique URIs per code block |
