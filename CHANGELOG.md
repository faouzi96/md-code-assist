# Changelog

All notable changes to MD Code Assist will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.1.0] — 2026-05-09

### Added

#### Formatting

- **Format All Code Blocks** command (`mdCodeAssist.formatAllBlocks`) — formats every fenced code block in the active Markdown file in parallel.
- **Format Current Code Block** command (`mdCodeAssist.formatCurrentBlock`) — formats only the block the cursor is inside.
- **`DocumentFormattingEditProvider`** registration — the standard `Format Document` shortcut (`Shift+Alt+F`) now formats all code blocks.
- **Format on Save** — optional `mdCodeAssist.formatOnSave` setting to auto-format on every Markdown save.
- **Prettier integration** (bundled, no install required) for JavaScript, TypeScript, JSON, JSONC, YAML, HTML, CSS, SCSS, Less, GraphQL, and Markdown.
- **Black integration** (external CLI) for Python code blocks, invoked via stdin (`black - --quiet`).
- **shfmt integration** (external CLI) for Shell/Bash/Zsh code blocks, invoked via stdin (`shfmt -`).
- **Tool detection** with session-level caching — graceful informational message when Black or shfmt are not installed.
- **Language aliases** — fence labels such as `js`, `ts`, `py`, `bash`, `yml`, `gql` are automatically resolved to their canonical formatter language.

#### Diagnostics

- **Inline diagnostics** for code blocks using VS Code language services — errors and warnings appear as squiggly underlines and in the Problems panel.
- **Virtual document provider** — code blocks are projected into in-memory documents at `md-code-assist://block/<hash>` so the active language server (TypeScript, Pylance, etc.) can analyze them.
- **Diagnostic mapper** — converts virtual document positions back to their exact line/character in the originating Markdown file.
- **Show Code Block Diagnostics** command (`mdCodeAssist.showDiagnostics`) — triggers a manual diagnostic refresh.
- **Debounced refresh** (500 ms) on every document change to avoid hammering language services on every keypress.
- `mdCodeAssist.diagnostics.enabledLanguages` setting to control which languages receive diagnostics.
- `mdCodeAssist.diagnostics.severityLevel` setting to filter out diagnostics below a threshold.

#### Decorations

- **Gutter icons** — colored SVG circle indicators for Error, Warning, Information, and Hint severity levels.
- **Inline error text** — italic after-line annotations surfacing the diagnostic message without leaving the Markdown file, truncated at 120 characters.
- `mdCodeAssist.decorations.showGutterIcons` and `mdCodeAssist.decorations.showInlineErrors` settings to toggle each decoration type independently.

#### Infrastructure

- TypeScript strict-mode codebase with esbuild bundling.
- Jest + ts-jest test suite with manual VS Code API mock.
- GitHub Actions CI matrix across Ubuntu, macOS, and Windows.
- Automatic `.vsix` artifact upload on push to `main`; marketplace publish on version tags (`v*`).
- `MD Code Assist` output channel for structured diagnostic and error logging.

[Unreleased]: https://github.com/md-code-assist/md-code-assist/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/md-code-assist/md-code-assist/releases/tag/v0.1.0
