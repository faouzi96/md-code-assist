# Architecture

## Formatting pipeline

```
Markdown file
    │
    ▼
┌─────────────────────┐
│  Markdown Parser    │  unified + remark-parse → mdast Root
└──────────┬──────────┘
           │ visit("code") nodes
           ▼
┌─────────────────────┐
│  Code Block         │  Extract fenced blocks with 0-based
│  Extractor          │  start/end lines, content lines, language
└──────────┬──────────┘
           │ one block per formatter call
           ▼
┌─────────────────────┐
│  Formatter          │  Language → formatter lookup via registry
│  Dispatcher         │  Checks enabled languages, tool availability
└──────┬──────┬───────┘
       │      │
       ▼      ▼
  Prettier   Black / shfmt
  (Node API) (CLI via stdin)
       │      │
       └──────┘
           │ formatted code string
           ▼
┌─────────────────────┐
│  TextEdit           │  Replace only the content lines (not fences)
│  Application        │  via VS Code WorkspaceEdit / TextEdit[]
└─────────────────────┘
```

## Diagnostics pipeline

```
Markdown file (on change, debounced 500 ms)
    │
    ▼
┌──────────────────────────────┐
│  Code Block Extractor        │  same parser as above
└──────────────┬───────────────┘
               │ filter by diagnostics.enabledLanguages
               ▼
┌──────────────────────────────┐
│  CLI Diagnostics             │  node --check (JS/TS)
│                              │  python -m py_compile (Python)
│                              │  shellcheck --format=json (Shell)
│                              │  JSON.parse (JSON)
└──────────────┬───────────────┘
               │ block-relative Diagnostic[]
               ▼
┌──────────────────────────────┐
│  Diagnostic Mapper           │  relative position + contentStartLine
│                              │  → absolute Markdown position
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
DiagnosticCollection  DecorationManager
(Problems panel)      (gutter + inline text)
```

## Module layout

```
src/
├── extension.ts              # activate() / deactivate() — wires everything together
│
├── parser/
│   ├── markdownParser.ts     # unified + remark-parse → Root AST
│   ├── codeBlockExtractor.ts # visit("code") → CodeBlock[]
│   ├── types.ts              # CodeBlock interface
│   └── index.ts              # Barrel export
│
├── formatters/
│   ├── types.ts              # IFormatter, FormatOptions, FormatResult
│   ├── formatterRegistry.ts  # Language-to-formatter map + LANGUAGE_ALIASES
│   ├── prettierFormatter.ts  # Prettier Node API (JS/TS/JSON/YAML/HTML/CSS/…)
│   ├── blackFormatter.ts     # Black CLI via stdin
│   ├── shfmtFormatter.ts     # shfmt CLI via stdin
│   ├── formatterDispatcher.ts# Routes a CodeBlock to the right formatter
│   └── index.ts
│
├── commands/
│   ├── formatAllBlocks.ts    # Format all blocks; also the FormattingEditProvider impl
│   ├── formatCurrentBlock.ts # Format block at cursor
│   └── commandRegistry.ts    # registerCommands(context, provider)
│
├── diagnostics/
│   ├── types.ts              # MappedDiagnostic, VirtualDocument
│   ├── cliDiagnostics.ts     # Per-language CLI check runners
│   ├── diagnosticMapper.ts   # Map relative → absolute positions
│   ├── diagnosticProvider.ts # Orchestrates refresh / refreshBlock
│   └── index.ts
│
├── decorations/
│   ├── decorationManager.ts  # Creates + applies gutter and inline types
│   ├── gutterDecorations.ts  # SVG circle data-URI gutter icons
│   └── inlineDecorations.ts  # After-line italic error text
│
├── config/
│   ├── defaults.ts           # Shared constants (timeouts, scheme name, …)
│   ├── settings.ts           # getSettings() — reads mdCodeAssist.* config
│   └── formatterPaths.ts     # getBlackPath(), getShfmtPath()
│
└── utils/
    ├── cliRunner.ts          # spawn() wrapper — shell:false, stdin pipe, timeout
    ├── toolDetector.ts       # isToolAvailable() with session-level cache
    ├── positionMapping.ts    # Offset ↔ line/char conversions
    └── logger.ts             # "MD Code Assist" output channel
```

## Key design decisions

| Decision                                                               | Rationale                                                                                                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `shell: false` in all `spawn()` calls                                  | Prevents shell injection from formatter paths or code content                                                                     |
| `prettier` marked external in esbuild, shipped in VSIX `node_modules/` | Prettier 3 uses `import.meta.url` in its ESM plugins; bundling it to CJS causes `fileURLToPath(undefined)` at startup             |
| Language aliases duplicated in `parser/` and `formatters/`             | Avoids a circular import between the two layers                                                                                   |
| 0-based positions internally                                           | Matches VS Code API; remark's 1-based positions are converted on extraction                                                       |
| Debounced diagnostic refresh (500 ms)                                  | Avoids re-running checks on every keypress                                                                                        |
| CLI-based diagnostics (not virtual documents + LSP)                    | Virtual documents on a custom URI scheme cannot receive language-server diagnostics; VS Code only provides them for real files    |
| `FormatSummary` returned from `formatDocument`                         | Allows the command to show specific feedback (already formatted / skipped / formatted N) instead of a generic "nothing to format" |
