# Contributing

## Getting started

```bash
git clone https://github.com/md-code-assist/md-code-assist.git
cd md-code-assist
npm install
```

Press **F5** in VS Code to open the Extension Development Host with the extension loaded.

## Development commands

```bash
npm run compile      # Type-check without emitting (fast feedback)
npm run build        # Build the extension bundle (esbuild)
npm run watch        # Watch mode — rebuilds on every save
npm test             # Run the full test suite
npm run test:watch   # Tests in watch mode
npm run lint         # ESLint
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format source files with Prettier
npm run package      # Package as .vsix
```

## Code style

- **TypeScript strict mode** — `"strict": true`, no `any`, use `unknown` and narrow types.
- **Interfaces over types** for object shapes; prefix with `I` (e.g. `IFormatter`).
- **`readonly`** on all immutable properties.
- **Explicit return types** on all public functions.
- **`async/await`** over raw Promises.
- **UPPER_SNAKE_CASE** for module-level constants, **camelCase** for files and functions, **PascalCase** for classes.
- Files use **LF** line endings.

## Adding a new formatter

1. Implement `IFormatter` from `src/formatters/types.ts`.
2. Register it in `activate()` in `src/extension.ts` via `formatterRegistry.register(new MyFormatter())`.
3. Add language aliases to the `LANGUAGE_ALIASES` map in **both** `src/formatters/formatterRegistry.ts` and `src/parser/codeBlockExtractor.ts` (the duplication avoids a circular dependency between the two layers).
4. If it uses a CLI tool, call `isToolAvailable()` from `src/utils/toolDetector.ts` inside `isAvailable()`.
5. Add the language to the `mdCodeAssist.format.enabledLanguages` default in `package.json`.
6. Write unit tests in `test/unit/formatters/`.

## Adding a new diagnostic checker

1. Add a case to `diagnoseBlock()` in `src/diagnostics/cliDiagnostics.ts`.
2. Return `vscode.Diagnostic[]` in block-relative line coordinates (line 0 = first content line).
3. The mapper in `src/diagnostics/diagnosticMapper.ts` will shift positions to the Markdown document automatically.
4. Add the language to the `mdCodeAssist.diagnostics.enabledLanguages` default in `package.json`.

## Writing tests

- Unit tests live in `test/unit/`, grouped by module.
- Use test fixtures from `test/fixtures/sample-markdown/` for Markdown input.
- The `vscode` module is mocked via `test/__mocks__/vscode.ts` — extend the mock if your code uses new VS Code APIs.
- Target **>80% coverage** on core modules (`src/parser/`, `src/formatters/`, `src/diagnostics/`).

## Pull request checklist

- [ ] `npm run compile` passes with zero errors
- [ ] `npm test` passes with zero failures
- [ ] `npm run lint` reports no new errors
- [ ] New formatter/feature has unit tests
- [ ] `CHANGELOG.md` entry added under `[Unreleased]`
