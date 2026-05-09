import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { Root } from 'mdast';

/**
 * Parse a Markdown string into an mdast Root node.
 * The returned tree is immutable — do not mutate it.
 */
export function parseMarkdown(text: string): Root {
  const processor = unified().use(remarkParse);
  return processor.parse(text) as Root;
}
