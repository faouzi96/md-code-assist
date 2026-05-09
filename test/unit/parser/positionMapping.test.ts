import * as vscode from 'vscode';
import {
  positionToOffset,
  offsetToPosition,
  mapRelativePosition,
  mapRelativeRange,
} from '../../../src/utils/positionMapping';

describe('positionToOffset', () => {
  it('returns 0 for line 0, character 0', () => {
    expect(positionToOffset('hello\nworld', 0, 0)).toBe(0);
  });

  it('returns correct offset for line 1, character 0', () => {
    // "hello\n" is 6 chars, so line 1 starts at offset 6
    expect(positionToOffset('hello\nworld', 1, 0)).toBe(6);
  });

  it('returns correct offset for character within a line', () => {
    expect(positionToOffset('hello\nworld', 1, 3)).toBe(9);
  });
});

describe('offsetToPosition', () => {
  it('returns position 0,0 for offset 0', () => {
    const pos = offsetToPosition('hello\nworld', 0);
    expect(pos.line).toBe(0);
    expect(pos.character).toBe(0);
  });

  it('returns correct position for offset past newline', () => {
    const pos = offsetToPosition('hello\nworld', 6);
    expect(pos.line).toBe(1);
  });
});

describe('mapRelativePosition', () => {
  it('adds contentStartLine to the relative line', () => {
    const rel = new vscode.Position(2, 5);
    const mapped = mapRelativePosition(rel, 10);
    expect(mapped.line).toBe(12);
    expect(mapped.character).toBe(5);
  });

  it('preserves character when mapping', () => {
    const rel = new vscode.Position(0, 7);
    const mapped = mapRelativePosition(rel, 3);
    expect(mapped.line).toBe(3);
    expect(mapped.character).toBe(7);
  });
});

describe('mapRelativeRange', () => {
  it('maps both start and end of a range', () => {
    const range = new vscode.Range(new vscode.Position(1, 2), new vscode.Position(1, 8));
    const mapped = mapRelativeRange(range, 5);
    expect(mapped.start.line).toBe(6);
    expect(mapped.end.line).toBe(6);
    expect(mapped.start.character).toBe(2);
    expect(mapped.end.character).toBe(8);
  });
});
