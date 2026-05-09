---
name: markdown-ast
description: >
  Expertise in parsing and manipulating Markdown AST using unified, remark, and mdast.
  Use when working with Markdown parsing, extracting fenced code blocks, or transforming
  Markdown documents programmatically.
---

# Markdown AST Parsing

## When to Use This Skill

- Parsing Markdown documents to AST
- Extracting fenced code blocks with metadata
- Transforming or modifying Markdown content
- Working with unified/remark ecosystem
- Calculating source positions for code blocks

## Core Libraries

```bash
npm install unified remark-parse remark-stringify unist-util-visit
```

| Package | Purpose |
|---------|--------|
| `unified` | Core processor pipeline |
| `remark-parse` | Markdown to AST parser |
| `remark-stringify` | AST to Markdown serializer |
| `unist-util-visit` | AST traversal utility |
| `mdast` | TypeScript types for Markdown AST |

## Parsing Markdown

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Root, Code } from 'mdast';

const processor = unified().use(remarkParse);

function parseMarkdown(content: string): Root {
  return processor.parse(content) as Root;
}
```

## Extracting Fenced Code Blocks

```typescript
import { visit } from 'unist-util-visit';
import type { Root, Code } from 'mdast';

interface CodeBlock {
  language: string | null;
  code: string;
  startLine: number;
  endLine: number;
  startOffset: number;
  endOffset: number;
}

function extractCodeBlocks(ast: Root): CodeBlock[] {
  const blocks: CodeBlock[] = [];

  visit(ast, 'code', (node: Code) => {
    if (node.position) {
      blocks.push({
        language: node.lang || null,
        code: node.value,
        startLine: node.position.start.line - 1, // 0-indexed
        endLine: node.position.end.line - 1,
        startOffset: node.position.start.offset ?? 0,
        endOffset: node.position.end.offset ?? 0,
      });
    }
  });

  return blocks;
}
```

## AST Node Types for Code Blocks

```typescript
// mdast Code node structure
interface Code {
  type: 'code';
  lang?: string;      // Language identifier (e.g., 'javascript')
  meta?: string;      // Additional metadata after language
  value: string;      // The code content (without fences)
  position?: {        // Source location
    start: { line: number; column: number; offset?: number };
    end: { line: number; column: number; offset?: number };
  };
}
```

## Position Mapping

The AST positions point to the fence markers, not the code content:

````markdown
```javascript      <- position.start.line (line 1)
const x = 1;       <- code starts here (line 2)
```                <- position.end.line (line 3)
````

```typescript
// To get the actual code content line:
const codeContentStartLine = node.position.start.line; // Fence line
const firstCodeLine = codeContentStartLine + 1;        // First code line

// To map a line within the code block back to Markdown:
function mapToMarkdownLine(codeBlockStart: number, lineInCode: number): number {
  return codeBlockStart + lineInCode + 1; // +1 for opening fence
}
```

## Modifying Code Blocks

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';

async function formatCodeBlocks(
  markdown: string,
  formatter: (code: string, lang: string) => Promise<string>
): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(() => async (tree: Root) => {
      const promises: Promise<void>[] = [];

      visit(tree, 'code', (node: Code) => {
        if (node.lang) {
          promises.push(
            formatter(node.value, node.lang).then((formatted) => {
              node.value = formatted;
            })
          );
        }
      });

      await Promise.all(promises);
    })
    .use(remarkStringify, {
      fence: '`',
      fences: true,
    });

  const result = await processor.process(markdown);
  return String(result);
}
```

## Handling Language Aliases

```typescript
const languageAliases: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'sh': 'shell',
  'bash': 'shell',
  'zsh': 'shell',
  'yml': 'yaml',
};

function normalizeLanguage(lang: string | null): string | null {
  if (!lang) return null;
  return languageAliases[lang.toLowerCase()] || lang.toLowerCase();
}
```

## Common Patterns

### Selective Processing

```typescript
visit(ast, 'code', (node: Code, index, parent) => {
  // Skip code blocks without language
  if (!node.lang) return;

  // Skip specific languages
  if (['text', 'plaintext', 'txt'].includes(node.lang)) return;

  // Process only supported languages
  if (supportedLanguages.includes(node.lang)) {
    processBlock(node);
  }
});
```

### Preserving Metadata

````markdown
```javascript title="example.js" highlight={[1,3]}
const x = 1;
```
````

```typescript
// node.meta contains: 'title="example.js" highlight={[1,3]}'
// Preserve it when modifying:
const meta = node.meta ? ` ${node.meta}` : '';
```

## Gotchas

| Issue | Cause | Solution |
|-------|-------|----------|
| Position is undefined | Parser option missing | Ensure `remark-parse` is configured correctly |
| Indented code blocks | Not fenced | Filter by checking if `node.lang` exists |
| Fence style changes | Stringify defaults | Configure `remarkStringify` options |
| Trailing newlines | Stringify behavior | Trim or configure output |
