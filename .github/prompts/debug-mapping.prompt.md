---
description: 'Troubleshoot position mapping between virtual documents and Markdown'
agent: 'agent'
tools: ['search/codebase', 'fetch']
---

# Debug Position Mapping

Your goal is to help troubleshoot issues with position mapping between virtual documents and the original Markdown file.

## Common Symptoms

Ask the user which issue they're experiencing:
1. **Diagnostics appear on wrong lines** — Offset calculation error
2. **Diagnostics missing entirely** — Virtual document not created or language mismatch
3. **Squiggles span incorrect columns** — Column mapping issue
4. **Diagnostics disappear after edit** — Document sync issue

## Debugging Steps

### 1. Verify AST Parsing
Check that the Markdown parser correctly identifies code blocks:
```typescript
// In src/parser/markdownParser.ts
// Log the parsed code blocks:
console.log(JSON.stringify(codeBlocks, null, 2));
```

Expected output should include:
- `startLine` / `endLine` in the Markdown file
- `language` identifier
- `code` content

### 2. Check Virtual Document Creation
In `src/diagnostics/virtualDocumentProvider.ts`:
- Verify the language ID matches VS Code's expected ID
- Confirm the virtual document URI scheme is registered
- Check that content is correctly extracted (no fence markers)

### 3. Validate Position Mapping
In `src/diagnostics/diagnosticMapper.ts`:
```typescript
// The mapping formula should be:
markdownLine = codeBlock.startLine + virtualDocLine + 1; // +1 for fence line
markdownColumn = virtualDocColumn; // Usually 1:1 within the block
```

### 4. Test with Minimal Example
Create a test Markdown file:
````markdown
# Test

```javascript
const x = 
```
````

Expected: Diagnostic on line 4 (the `const x =` line).

## Key Files to Inspect

- `src/parser/markdownParser.ts` — AST parsing and block extraction
- `src/diagnostics/virtualDocumentProvider.ts` — Virtual document creation
- `src/diagnostics/diagnosticMapper.ts` — Position translation
- `src/diagnostics/diagnosticManager.ts` — Diagnostic lifecycle

## Common Fixes

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| Off-by-one errors | Fence line not accounted for | Add +1 to line offset |
| Wrong language diagnostics | Language ID mismatch | Check `languageMap.ts` |
| Stale diagnostics | Missing document change listener | Subscribe to `onDidChangeTextDocument` |
