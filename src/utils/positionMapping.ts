import * as vscode from 'vscode';

/**
 * Convert a 0-based line/character pair to a character offset within `text`.
 */
export function positionToOffset(text: string, line: number, character: number): number {
  let offset = 0;
  let currentLine = 0;
  for (let i = 0; i < text.length; i++) {
    if (currentLine === line) {
      return offset + character;
    }
    if (text[i] === '\n') {
      currentLine++;
    }
    offset++;
  }
  return offset;
}

/**
 * Convert a character offset within `text` to a 0-based VS Code Position.
 */
export function offsetToPosition(text: string, offset: number): vscode.Position {
  let line = 0;
  let character = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      character = 0;
    } else {
      character++;
    }
  }
  return new vscode.Position(line, character);
}

/**
 * Map a position relative to a code block back to an absolute Markdown position.
 *
 * @param relativePosition - 0-based position inside the code block content
 * @param contentStartLine - 0-based line in the Markdown document where block content starts
 */
export function mapRelativePosition(
  relativePosition: vscode.Position,
  contentStartLine: number,
): vscode.Position {
  return new vscode.Position(contentStartLine + relativePosition.line, relativePosition.character);
}

/**
 * Map a range relative to a code block back to an absolute Markdown range.
 */
export function mapRelativeRange(
  relativeRange: vscode.Range,
  contentStartLine: number,
): vscode.Range {
  return new vscode.Range(
    mapRelativePosition(relativeRange.start, contentStartLine),
    mapRelativePosition(relativeRange.end, contentStartLine),
  );
}
