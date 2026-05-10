# Markdown Code Assistant — Improvement Plan & Gap Analysis

## Current State Assessment

The architecture is solid and well-thought-out. The pipeline (parse → extract → format/diagnose → map back) is clean, the code style is consistent, and the separation of concerns is good. This is a strong foundation.

### Resolved Since Initial Assessment

| Item | Resolution |
| ---- | ---------- |
| Zero-friction Python formatting | `ms-python.black-formatter` extension auto-installed on activation via `ensureBlackExtension()` |
| Zero-friction Shell formatting | `mkhl.shfmt` extension auto-installed on activation via `ensureShfmtExtension()` |
| Zero-friction Shell diagnostics | `timonwong.shellcheck` extension auto-installed on activation via `ensureShellCheckExtension()` |
| Broken Jest globals (`it`/`expect`) | Added `types: ['node', 'jest']` to ts-jest tsconfig override in `jest.config.js` |
| `CodeBlock` fixture missing `rawLanguage` | Fixed `makeBlock()` in `diagnosticMapper.test.ts` |
| Pre-existing ESLint `no-unsafe-*` errors | Extended disable comment in `cliDiagnostics.ts` to cover the dynamic import |
| Extension name inconsistency | Renamed from "MD Code Assist" to "Markdown Code Assistant" across all source, config, and docs |

---

## What's Missing

### 1. Marketplace Presence & Discoverability

- **No screenshots/GIFs in README** — This is the #1 killer for extensions. Users won't install what they can't see working. The `images/` folder has only an icon — no demo GIFs.
- **No Open VSX listing** — Many users (especially on VSCodium or Gitpod) use the Open VSX Registry, not the Microsoft Marketplace. Missing out on that audience.
- **Keywords are too narrow** — Add `"documentation"`, `"lint"`, `"python"`, `"javascript"`, `"format on save"`, `"code quality"` to `package.json` keywords.

### 2. Zero-Friction First Run ✅ (Partially Resolved)

- **Python and Shell formatting/diagnostics: resolved.** The extension now auto-installs `ms-python.black-formatter`, `mkhl.shfmt`, and `timonwong.shellcheck` via `vscode.commands.executeCommand('workbench.extensions.installExtension', ...)` on first activation. No manual CLI installation required. Diagnostic priority chain: extension → CLI fallback → `prettier-plugin-sh` (shell only).
- **JS/TS diagnostics: still limited.** The `node --check` diagnostic only catches parse errors. Users will expect ESLint-level feedback. Next step: delegate to the `dbaeumer.vscode-eslint` extension using the same pattern as `ShfmtExtensionFormatter` and `ShellCheckExtensionDiagnostics`.

### 3. Missing Languages (High Demand)

| Language   | Current Support | Gap                                            |
| ---------- | --------------- | ---------------------------------------------- |
| Rust       | None            | `rustfmt` is trivial to add via CLI            |
| Go         | None            | `gofmt` is always available if Go is installed |
| C/C++      | None            | `clang-format`                                 |
| Java       | None            | No great bundled option, but users want it     |
| SQL        | None            | `sql-formatter` npm package — could be bundled |
| Dockerfile | None            | `hadolint` for diagnostics                     |
| TOML       | None            | Popular in Rust/Python projects                |
| Ruby       | None            | `rubocop`                                      |
| PHP        | None            | `php-cs-fixer`                                 |

Every missing language is a user who installs once and uninstalls.

### 4. Missing UX Features

- **No status bar item** — Users have no ambient feedback that the extension is active or what it's doing. A small `$(check) Markdown Code Assistant` in the status bar would help.
- **No "Format on Type"** — As users finish typing a code block fence (the closing ` ``` `), auto-formatting would feel magical.
- **No block-level quick fixes** — When diagnostics fire, offering a "Format this block" code action (lightbulb) would be a killer feature.
- **No diff preview** — Before applying formatting, showing a diff builds trust with cautious users.
- **No per-block language override** — Some users want a block formatted with different config (e.g., 2-space indent JSON vs. 4-space).
- **No "ignore block" directive** — e.g., ` ```js <!-- markdown-code-assistant-ignore --> ` to skip a block.
- **No telemetry (opt-in)** — You can't improve what you can't measure. Optional telemetry (like `@vscode/extension-telemetry`) would show which languages are used most.

### 5. Testing Gaps

- Only 4 test files exist. The formatter modules (Prettier, Black, shfmt), the diagnostic provider, the decoration manager, and `extension.ts` activation all have **zero tests**.
- No integration tests against real VS Code (the `@vscode/test-electron` is in devDependencies but unused).
- No CI/CD pipeline visible (no `.github/workflows/` folder).

### 6. Missing CI/CD

- No GitHub Actions for automated test runs on PRs. This makes contributions risky.
- No automated publishing on tag push.
- No badges in README (build status, version, installs count).

### 7. Documentation

- `ARCHITECTURE.md`, `CONTRIBUTING.md`, `README.md`, `ROADMAP.md`, and `CHANGELOG.md` have all been updated to reflect the new extension-delegate architecture, the renamed extension, and the auto-install behaviour.
- Missing: `SUPPORTED_LANGUAGES.md` (referenced in project instructions but not present in the repo).
- Missing: a **FAQ / troubleshooting** section in README (e.g., "Why isn't the ShellCheck extension picking up errors?").
- Missing: **dates** on entries in `CHANGELOG.md`.

---

## Priority Ranking for Maximum Impact

### ✅ ~~1. Ship the WASM Formatters (Python + Shell)~~ — Resolved

Achieved via the VS Code extension-delegate pattern instead of WASM. `ms-python.black-formatter`, `mkhl.shfmt`, and `timonwong.shellcheck` are auto-installed on activation. Zero CLI dependencies required from the user.

### 1. Make a 60-Second Demo GIF

Put it at the top of the README. Show: open a Markdown file with messy code blocks → run Format All → watch it clean up. This single asset will drive more installs than any individual feature.

### 2. Add ESLint Extension Diagnostics for JS/TS

Apply the same extension-delegate pattern (`ShfmtExtensionFormatter`, `ShellCheckExtensionDiagnostics`) to `dbaeumer.vscode-eslint`. Open a temp `.js`/`.ts` virtual document, subscribe to `onDidChangeDiagnostics`, and map results back to Markdown positions. This would transform JS/TS diagnostics from "parse errors only" to full lint feedback.

### 3. Add the Code Action Lightbulb

When a diagnostic fires, offer "Format this block" as a quick fix. This is an extremely discoverable workflow that makes the extension feel native to VS Code. Implement via `vscode.languages.registerCodeActionsProvider`.

### 4. Add Go and Rust Support

Both `gofmt` and `rustfmt` are bundled with their respective toolchains — always available if the user has the language installed. These communities write a **lot** of documentation with code blocks.

### 5. Add SQL Formatting

`sql-formatter` is a pure npm package, fully bundleable, and SQL in Markdown is extremely common in data engineering docs. This is an underserved niche with high value.

### 6. Set Up GitHub Actions CI

Required before asking anyone to contribute. Without it, external PRs stall. A basic workflow: lint → compile → test on push/PR, targeting Windows, macOS, and Linux.

### 7. Add a Status Bar Item

Costs ~20 lines of code, makes the extension feel alive and trustworthy. Show the count of formatted/diagnosed blocks, or a spinner during long operations.

---

## Summary

The extension is architecturally ready to be great. Zero-friction first-run is now solved for Python and Shell via extension delegates. The remaining gaps are:

1. **Discoverability assets** — demo GIFs, CI badges, Open VSX listing
2. **JS/TS diagnostics** — extend the extension-delegate pattern to `dbaeumer.vscode-eslint`
3. **Breadth of language support** — add Go, Rust, SQL at minimum
4. **Power UX features** — code action lightbulbs, status bar item, ignore directives
