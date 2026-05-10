import { visit } from 'unist-util-visit';
import type { Code, Root } from 'mdast';
import { parseMarkdown } from './markdownParser';
import type { CodeBlock } from './types';
// Language aliases are defined here (not imported from formatters) to avoid a circular dependency.
const LANGUAGE_ALIASES: ReadonlyMap<string, string> = new Map([
  ['js', 'javascript'],
  ['jsx', 'javascript'],
  ['ts', 'typescript'],
  ['tsx', 'typescript'],
  ['py', 'python'],
  ['python3', 'python'],
  ['sh', 'shell'],
  ['bash', 'shell'],
  ['zsh', 'shell'],
  ['jsonc', 'json'],
  ['yml', 'yaml'],
  ['scss', 'css'],
  ['less', 'css'],
  ['gql', 'graphql'],
  ['md', 'markdown'],
]);

/**
 * Extract all fenced code blocks from a Markdown document text.
 * Positions are 0-based to match VS Code's convention.
 */
export function extractCodeBlocks(markdownText: string): CodeBlock[] {
  const root: Root = parseMarkdown(markdownText);
  const blocks: CodeBlock[] = [];

  visit(root, 'code', (node: Code) => {
    const pos = node.position;
    if (!pos) {
      return;
    }

    // Honour the md-assistant-ignore directive: ```js md-assistant-ignore skips this block.
    const meta = node.meta ?? '';
    if (meta.split(/\s+/).includes('md-assistant-ignore')) {
      return;
    }

    // remark positions are 1-based; convert to 0-based for VS Code
    const startLine = pos.start.line - 1;
    const endLine = pos.end.line - 1;
    const startOffset = pos.start.offset ?? 0;
    const endOffset = (pos.end.offset ?? 0) - 1;

    // Content lines sit between the fences
    const contentStartLine = startLine + 1;
    const contentEndLine = endLine - 1;

    const rawLang = node.lang ?? '';
    const language = resolveLanguage(rawLang.toLowerCase().trim());

    blocks.push({
      language,
      rawLanguage: rawLang.toLowerCase().trim(),
      content: node.value,
      startLine,
      endLine,
      startOffset,
      endOffset,
      contentStartLine,
      contentEndLine,
    });
  });

  return blocks;
}

function resolveLanguage(raw: string): string {
  return LANGUAGE_ALIASES.get(raw) ?? raw;
}
