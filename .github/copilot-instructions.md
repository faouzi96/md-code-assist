# MD Code Assist — VS Code Extension

## Project Overview

MD Code Assist is a VS Code extension that brings language-aware formatting and inline diagnostics to fenced code blocks in Markdown files. It bridges the gap between documentation and real code tooling by treating code examples as first-class citizens.

### Core Goals

1. **Format Code Blocks** — Parse Markdown, extract fenced blocks, route them to native formatters (Prettier, Black, shfmt), and write formatted output back while preserving Markdown structure.
2. **Inline Diagnostics** — Project code blocks into virtual documents, run language services/LSPs, and map errors back to original Markdown positions with inline decorations.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript (strict mode) |
| Runtime | Node.js (VS Code extension host) |
| Bundler | esbuild |
| Testing | Jest with ts-jest |
| Linting | ESLint with TypeScript parser |
| Formatting | Prettier |
| Markdown Parsing | unified + remark + mdast |
| VS Code API | @types/vscode |

---

## Project Structure

```
md-code-assist/
├── src/
│   ├── extension.ts              # Extension entry point (activate/deactivate)
│   ├── parser/
│   │   ├── markdownParser.ts     # Markdown AST parsing with remark
│   │   ├── codeBlockExtractor.ts # Extract fenced blocks with positions
│   │   └── types.ts              # AST and code block type definitions
│   ├── formatters/
│   │   ├── formatterDispatcher.ts    # Routes blocks to appropriate formatter
│   │   ├── prettierFormatter.ts      # Prettier integration (JS/TS/JSON/YAML/HTML/CSS)
│   │   ├── blackFormatter.ts         # Python formatting via Black CLI
│   │   ├── shfmtFormatter.ts         # Shell/Bash formatting via shfmt CLI
│   │   ├── formatterRegistry.ts      # Language-to-formatter mapping
│   │   └── types.ts                  # Formatter interfaces
│   ├── diagnostics/
│   │   ├── virtualDocumentManager.ts # Create in-memory documents per language
│   │   ├── diagnosticMapper.ts       # Map LSP diagnostics to Markdown positions
│   │   ├── diagnosticProvider.ts     # VS Code DiagnosticCollection integration
│   │   └── types.ts                  # Diagnostic type definitions
│   ├── decorations/
│   │   ├── decorationManager.ts      # Custom editor decorations
│   │   ├── gutterDecorations.ts      # Colored gutter indicators
│   │   └── inlineDecorations.ts      # Inline error/warning text
│   ├── commands/
│   │   ├── formatAllBlocks.ts        # Format all code blocks in document
│   │   ├── formatCurrentBlock.ts     # Format block at cursor position
│   │   └── commandRegistry.ts        # Register all commands
│   ├── config/
│   │   ├── settings.ts               # Extension settings management
│   │   ├── formatterPaths.ts         # Custom formatter path resolution
│   │   └── defaults.ts               # Default configuration values
│   └── utils/
│       ├── cliRunner.ts              # Shell out to external CLI tools
│       ├── toolDetector.ts           # Detect installed formatters
│       ├── positionMapping.ts        # Offset/line/column conversions
│       └── logger.ts                 # Output channel logging
├── test/
│   ├── unit/
│   │   ├── parser/
│   │   ├── formatters/
│   │   └── diagnostics/
│   ├── integration/
│   │   └── extension.test.ts
│   ├── fixtures/
│   │   └── sample-markdown/          # Test Markdown files
│   └── setup.ts                      # Jest setup
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   └── SUPPORTED_LANGUAGES.md
├── .vscode/
│   ├── launch.json                   # Extension debugging config
│   ├── tasks.json                    # Build tasks
│   └── settings.json                 # Workspace settings
├── package.json
├── tsconfig.json
├── esbuild.config.js
├── jest.config.js
├── .eslintrc.json
├── .prettierrc
├── CHANGELOG.md
├── README.md
└── ROADMAP.md
```

---

## Supported Languages

### Prettier (Bundled Node API)

- JavaScript / TypeScript (`js`, `ts`, `jsx`, `tsx`)
- JSON / JSONC (`json`, `jsonc`)
- YAML (`yaml`, `yml`)
- HTML (`html`)
- CSS / SCSS / Less (`css`, `scss`, `less`)
- Markdown (`markdown`, `md`) — nested formatting
- GraphQL (`graphql`)

### External CLI Tools

| Language | Formatter | Detection Command |
|----------|-----------|-------------------|
| Python | Black | `black --version` |
| Shell/Bash | shfmt | `shfmt --version` |

**Strategy:** CLI-first with graceful fallback. Detect if tools are installed; if not, show actionable message to user.

---

## Commands

| Command ID | Title | Description |
|------------|-------|-------------|
| `mdCodeAssist.formatAllBlocks` | Format All Code Blocks | Format every fenced code block in the active Markdown file |
| `mdCodeAssist.formatCurrentBlock` | Format Current Code Block | Format the code block at cursor position |
| `mdCodeAssist.showDiagnostics` | Show Code Block Diagnostics | Trigger diagnostic analysis for all blocks |

### Integration with VS Code Format Document

The extension registers a `DocumentFormattingEditProvider` for Markdown files, so `Format Document` (Shift+Alt+F) automatically formats all code blocks.

---

## Configuration Settings

```jsonc
{
  // Enable/disable formatting per language
  "mdCodeAssist.format.enabledLanguages": ["javascript", "typescript", "python", "json", "yaml", "shell"],
  
  // Enable/disable diagnostics per language
  "mdCodeAssist.diagnostics.enabledLanguages": ["javascript", "typescript", "python"],
  
  // Custom formatter paths
  "mdCodeAssist.formatters.blackPath": "black",
  "mdCodeAssist.formatters.shfmtPath": "shfmt",
  
  // Diagnostic severity mapping
  "mdCodeAssist.diagnostics.severityLevel": "warning", // "error" | "warning" | "info" | "hint"
  
  // Decoration styles
  "mdCodeAssist.decorations.showGutterIcons": true,
  "mdCodeAssist.decorations.showInlineErrors": true,
  
  // Format on save for Markdown files
  "mdCodeAssist.formatOnSave": false
}
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Build extension
npm run build

# Watch mode (development)
npm run watch

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format

# Package extension (.vsix)
npm run package

# Publish to marketplace
npm run publish
```

---

## Architecture Principles

### 1. Separation of Concerns

- **Parser layer** handles only Markdown AST traversal and code block extraction
- **Formatter layer** is language-agnostic; each formatter implements a common interface
- **Diagnostic layer** manages virtual documents and position mapping independently
- **VS Code layer** handles only editor integration (commands, decorations, providers)

### 2. Formatter Interface

```typescript
interface IFormatter {
  readonly supportedLanguages: string[];
  isAvailable(): Promise<boolean>;
  format(code: string, language: string, options?: FormatOptions): Promise<FormatResult>;
}

interface FormatResult {
  success: boolean;
  formatted?: string;
  error?: string;
}
```

### 3. Position Mapping

Code blocks exist at an offset within Markdown. All diagnostics must be mapped:

```
Markdown Position = Code Block Start Position + Relative Position in Block
```

Use `positionMapping.ts` utilities for all conversions.

### 4. Error Handling

- Never crash the extension host
- Log errors to output channel (`MD Code Assist` output)
- Show user-friendly notifications for actionable errors
- Gracefully degrade when formatters are unavailable

---

## Code Style Guidelines

### TypeScript

- Use strict TypeScript (`"strict": true`)
- Prefer `interface` over `type` for object shapes
- Use `readonly` for immutable properties
- Explicit return types on public functions
- No `any` — use `unknown` and narrow types
- Async/await over raw Promises
- Use barrel exports (`index.ts`) for each module folder

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | camelCase | `markdownParser.ts` |
| Classes | PascalCase | `FormatterDispatcher` |
| Interfaces | PascalCase with `I` prefix | `IFormatter` |
| Functions | camelCase | `extractCodeBlocks()` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| VS Code commands | dot.notation | `mdCodeAssist.formatAllBlocks` |

### Testing

- Unit tests for all parser, formatter, and mapping logic
- Integration tests for VS Code command execution
- Use fixtures in `test/fixtures/` for sample Markdown files
- Aim for >80% coverage on core modules
- Test both success and failure paths

---

## VS Code Extension Best Practices

### Activation

- Use `onLanguage:markdown` activation event for lazy loading
- Dispose all subscriptions in `deactivate()`
- Register disposables with `context.subscriptions.push()`

### Performance

- Debounce diagnostic updates on document change
- Cache parsed AST when document hasn't changed
- Run formatters in parallel when formatting multiple blocks
- Use `vscode.workspace.fs` for file operations

### User Experience

- Show progress indicator for long-running operations
- Use `vscode.window.showInformationMessage` sparingly
- Provide clear error messages with suggested actions
- Support cancellation tokens where applicable

---

## Dependencies

### Runtime Dependencies

```json
{
  "unified": "^11.x",
  "remark-parse": "^11.x",
  "remark-stringify": "^11.x",
  "unist-util-visit": "^5.x",
  "prettier": "^3.x"
}
```

### Dev Dependencies

```json
{
  "@types/vscode": "^1.85.0",
  "@types/node": "^20.x",
  "typescript": "^5.x",
  "esbuild": "^0.20.x",
  "jest": "^29.x",
  "ts-jest": "^29.x",
  "eslint": "^8.x",
  "@typescript-eslint/eslint-plugin": "^7.x",
  "@typescript-eslint/parser": "^7.x",
  "prettier": "^3.x",
  "@vscode/test-electron": "^2.x",
  "@vscode/vsce": "^2.x"
}
```

---

## Common Pitfalls

1. **Position off-by-one errors** — Markdown positions are 1-based in VS Code, 0-based in most parsers. Always verify coordinate systems.

2. **Formatter not found** — Always check `isAvailable()` before calling `format()`. Never assume CLI tools exist.

3. **Virtual document lifecycle** — Dispose virtual documents when the source Markdown file closes.

4. **Concurrent formatting** — Multiple format requests on the same document should be queued or debounced.

5. **Language identifier mismatch** — Markdown fence labels (`python`, `py`, `python3`) must map to canonical language IDs.

---

## References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [unified / remark](https://unifiedjs.com/)
- [Prettier API](https://prettier.io/docs/en/api.html)
- [Black Formatter](https://black.readthedocs.io/)
- [shfmt](https://github.com/mvdan/sh)
