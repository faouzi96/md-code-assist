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
  Prettier          Black CLI    shfmt CLI   BlackExtension  ShfmtExtension
  (Node API +       (stdin)      (stdin)     (ms-python.     (mkhl.shfmt
   plugin-sh WASM)                            black-formatter) extension
                                              extension        delegate)
       │                │            │              │               │
       └────────────────┴────────────┴──────────────┴───────────────┘
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
│                              │  ShellCheck extension → shellcheck CLI → prettier-plugin-sh (Shell)
│                              │  JSON.parse (JSON)
│                              │  js-yaml (YAML, bundled)
│                              │  PostCSS (CSS, bundled)
│                              │  parse5 (HTML, bundled)
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
│   ├── prettierFormatter.ts        # Prettier Node API + prettier-plugin-sh (shell)
│   ├── blackFormatter.ts          # Black CLI via stdin
│   ├── shfmtFormatter.ts          # shfmt CLI via stdin (fallback)
│   ├── blackExtensionFormatter.ts # Python via ms-python.black-formatter extension
│   ├── shfmtExtensionFormatter.ts # Shell via mkhl.shfmt extension
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
│   ├── shellCheckExtensionDiagnostics.ts # Shell diagnostics via timonwong.shellcheck extension
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
    └── logger.ts             # "Markdown Code Assistant" output channel
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
| `prettier-plugin-sh` (WASM) instead of `mvdan-sh`                     | `mvdan-sh` is deprecated; `prettier-plugin-sh` is the maintained replacement and integrates directly with the Prettier pipeline   |
| `ShfmtExtensionFormatter` delegates to `mkhl.shfmt`              | Avoids requiring a system `shfmt` install; the extension bundles the binary and integrates with VS Code's formatter pipeline |
| `BlackExtensionFormatter` delegates to `ms-python.black-formatter`     | Avoids bundling a Python runtime; the extension is auto-installed and provides a proper VS Code `TextEdit[]` response             |
| In-process YAML/CSS/HTML diagnostics via js-yaml/PostCSS/parse5       | These parsers throw structured errors with line/column; no external CLI needed for baseline syntax checking                       |
