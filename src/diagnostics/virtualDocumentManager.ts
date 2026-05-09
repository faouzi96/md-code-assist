import * as vscode from 'vscode';
import * as crypto from 'crypto';
import type { CodeBlock } from '../parser/types';
import type { VirtualDocument } from './types';
import { VIRTUAL_DOCUMENT_SCHEME } from '../config/defaults';

export class VirtualDocumentManager implements vscode.TextDocumentContentProvider {
  private readonly documents = new Map<string, VirtualDocument>();
  private readonly emitter = new vscode.EventEmitter<vscode.Uri>();

  readonly onDidChange = this.emitter.event;

  /**
   * Returns a virtual URI for a code block.
   * URI is deterministic: same block content + index + source path → same URI.
   */
  getUri(block: CodeBlock, blockIndex: number, sourceFilePath: string): vscode.Uri {
    const hash = crypto
      .createHash('sha1')
      .update(`${sourceFilePath}:${blockIndex}:${block.content}`)
      .digest('hex')
      .slice(0, 12);
    const ext = languageExtension(block.language);
    return vscode.Uri.parse(`${VIRTUAL_DOCUMENT_SCHEME}://block/${hash}${ext}`);
  }

  /**
   * Register (or update) a virtual document for a code block.
   * Fires onDidChange so VS Code re-reads the content and refreshes diagnostics.
   */
  upsert(uri: vscode.Uri, block: CodeBlock): void {
    const existing = this.documents.get(uri.toString());
    if (existing) {
      existing.content = block.content;
    } else {
      this.documents.set(uri.toString(), {
        uri,
        block,
        language: block.language,
        content: block.content,
      });
    }
    this.emitter.fire(uri);
  }

  /** Remove all virtual documents associated with a specific Markdown source file. */
  clearForSource(sourceKey: string): void {
    for (const [key, doc] of this.documents.entries()) {
      if (doc.uri.path.includes(sourceKey)) {
        this.documents.delete(key);
      }
    }
  }

  /** VS Code calls this to get the content of a virtual document. */
  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.documents.get(uri.toString())?.content ?? '';
  }

  dispose(): void {
    this.emitter.dispose();
    this.documents.clear();
  }
}

function languageExtension(language: string): string {
  const map: Record<string, string> = {
    javascript: '.js',
    typescript: '.ts',
    python: '.py',
    json: '.json',
    yaml: '.yaml',
    html: '.html',
    css: '.css',
    shell: '.sh',
    graphql: '.graphql',
    markdown: '.md',
  };
  return map[language] ?? '.txt';
}
