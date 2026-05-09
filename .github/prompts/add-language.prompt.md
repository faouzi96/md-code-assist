---
description: 'Add full language support including formatter, diagnostics, and configuration'
agent: 'agent'
tools: ['search/codebase', 'editFiles', 'runTerminalCommand']
---

# Add Full Language Support

Your goal is to add complete language support to md-code-assist, including formatting, diagnostics, and configuration.

## Required Information

Ask the user for:
1. **Language name** (e.g., "rust")
2. **VS Code language ID** (e.g., "rust" — used for virtual documents)
3. **Fenced code block identifiers** (e.g., `rust`, `rs`)
4. **Formatter tool** (e.g., "rustfmt")
5. **LSP/diagnostic source** (e.g., "rust-analyzer", or "none" for syntax-only)

## Tasks

### 1. Formatter Adapter
Create `src/formatters/adapters/<language>Formatter.ts` implementing `FormatterAdapter`.

### 2. Language Registration
Update `src/parser/languageMap.ts` to map fenced block identifiers to VS Code language IDs:
```typescript
export const languageMap: Record<string, string> = {
  // ... existing
  'rust': 'rust',
  'rs': 'rust',
};
```

### 3. Virtual Document Support
Update `src/diagnostics/virtualDocumentProvider.ts` to handle the new language.

### 4. Diagnostic Mapping
If the language has LSP support, ensure `src/diagnostics/diagnosticMapper.ts` correctly maps diagnostics.

### 5. Configuration
Add to `package.json` contributes.configuration:
```json
"mdCodeAssist.<language>.enabled": {
  "type": "boolean",
  "default": true,
  "description": "Enable formatting and diagnostics for <Language>"
},
"mdCodeAssist.<language>.formatterPath": {
  "type": "string",
  "default": "",
  "description": "Custom path to <formatter> binary"
}
```

### 6. Documentation
Update `README.md` supported languages table.

### 7. Tests
Create:
- `test/formatters/<language>Formatter.test.ts`
- `test/integration/<language>.integration.test.ts`

## Checklist

- [ ] Formatter adapter created and registered
- [ ] Language IDs mapped in languageMap
- [ ] Virtual document provider updated
- [ ] Configuration options added
- [ ] README updated
- [ ] Unit tests added
- [ ] Integration test added
- [ ] Manually tested in VS Code
