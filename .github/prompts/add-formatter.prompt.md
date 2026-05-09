---
description: 'Scaffold a new formatter adapter for a language'
agent: 'agent'
tools: ['search/codebase', 'editFiles']
---

# Add New Formatter Adapter

Your goal is to scaffold a new formatter adapter for md-code-assist.

## Required Information

Ask the user for:
1. **Language name** (e.g., "rust", "go", "ruby")
2. **Formatter tool** (e.g., "rustfmt", "gofmt", "rubocop")
3. **CLI command pattern** (e.g., `rustfmt --edition 2021`)
4. **File extension(s)** (e.g., `.rs`, `.go`, `.rb`)

## Tasks

1. Create a new formatter adapter file at `src/formatters/adapters/<language>Formatter.ts`
2. Implement the `FormatterAdapter` interface:
   ```typescript
   interface FormatterAdapter {
     readonly languageId: string;
     readonly supportedExtensions: string[];
     isAvailable(): Promise<boolean>;
     format(code: string, options?: FormatterOptions): Promise<FormatterResult>;
   }
   ```
3. Register the formatter in `src/formatters/registry.ts`
4. Add configuration options in `package.json` under `contributes.configuration`:
   - `mdCodeAssist.<language>.enabled`
   - `mdCodeAssist.<language>.path` (custom binary path)
   - `mdCodeAssist.<language>.args` (additional CLI arguments)
5. Update `src/config/settings.ts` to include the new config options
6. Create a basic test file at `test/formatters/<language>Formatter.test.ts`

## Implementation Pattern

Follow the existing adapter pattern in `src/formatters/adapters/`. Reference:
- `pythonFormatter.ts` for CLI-based formatters
- `prettierFormatter.ts` for API-based formatters

## Checklist

- [ ] Adapter implements `FormatterAdapter` interface
- [ ] Graceful handling when CLI tool is not installed
- [ ] Respects user's config files (e.g., `.rustfmt.toml`)
- [ ] Proper error handling with meaningful messages
- [ ] Registered in formatter registry
- [ ] Configuration options added
- [ ] Basic test coverage
