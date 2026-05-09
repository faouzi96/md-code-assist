import { extractCodeBlocks } from '../../../src/parser';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES = path.join(__dirname, '../../fixtures/sample-markdown');

function fixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf8');
}

describe('extractCodeBlocks', () => {
  it('extracts all blocks from basic.md with correct languages', () => {
    const blocks = extractCodeBlocks(fixture('basic.md'));
    const langs = blocks.map((b) => b.language);
    expect(langs).toEqual(['javascript', 'python', 'shell', 'json', 'yaml', 'typescript']);
  });

  it('returns correct startLine for the first block', () => {
    const text = '# Title\n\nSome text.\n\n```js\nconst x = 1;\n```\n';
    const blocks = extractCodeBlocks(text);
    expect(blocks).toHaveLength(1);
    // Opening fence is on line 4 (0-based)
    expect(blocks[0].startLine).toBe(4);
  });

  it('returns correct contentStartLine and contentEndLine', () => {
    const text = '```ts\nconst a = 1;\nconst b = 2;\n```\n';
    const blocks = extractCodeBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].contentStartLine).toBe(1);
    expect(blocks[0].contentEndLine).toBe(2);
  });

  it('handles multiple blocks with correct positions', () => {
    const text = '```js\nlet a = 1;\n```\n\n```py\nprint(1)\n```\n';
    const blocks = extractCodeBlocks(text);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].language).toBe('javascript');
    expect(blocks[1].language).toBe('python');
    expect(blocks[1].startLine).toBeGreaterThan(blocks[0].endLine);
  });

  it('returns empty array for text with no code blocks', () => {
    const blocks = extractCodeBlocks('# Just a heading\n\nSome prose.\n');
    expect(blocks).toHaveLength(0);
  });

  it('handles an empty code block', () => {
    const text = '```javascript\n```\n';
    const blocks = extractCodeBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toBe('');
  });

  it('handles a block with no language specifier', () => {
    const text = '```\nsome code\n```\n';
    const blocks = extractCodeBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].language).toBe('');
  });

  it('resolves language aliases', () => {
    const text = '```py\nprint("hi")\n```\n```bash\necho hi\n```\n```ts\nlet x: number = 1;\n```\n';
    const blocks = extractCodeBlocks(text);
    expect(blocks.map((b) => b.language)).toEqual(['python', 'shell', 'typescript']);
  });

  it('handles blocks at end of file without trailing newline', () => {
    const text = '```js\nconsole.log(1);\n```';
    const blocks = extractCodeBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toBe('console.log(1);');
  });

  it('returns content without the fence lines', () => {
    const text = '```js\nconst x = 1;\nconst y = 2;\n```\n';
    const blocks = extractCodeBlocks(text);
    expect(blocks[0].content).toBe('const x = 1;\nconst y = 2;');
  });
});
