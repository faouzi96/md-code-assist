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
| JS diagnostics limited to parse errors | `eslintExtensionDiagnostics.ts` runs ESLint (bundled into extension.js via esbuild) with espree parser; snippet false-positive rules suppressed (`no-undef`, `no-unused-vars`, etc.); `espree`/`acorn`/`acorn-jsx`/`eslint-visitor-keys` shipped as disk-level externals because espree calls `require.resolve()` at load time |
| TypeScript diagnostics not working | `typescriptDiagnostics.ts` uses `ts.createSourceFile` + `program.getSyntacticDiagnostics` from the bundled TypeScript compiler API; syntax-only (no type resolution) to avoid false positives about missing imports in snippets |
| SQL — no formatting or diagnostics | `prettierFormatter.ts` now loads `prettier-plugin-sql` (bundled npm package) for formatting; `cliDiagnostics.ts` surfaces Prettier parse errors as diagnostics (line/col extracted from error message) — no extra tools required |
| Dockerfile — formatting + diagnostics | **Descoped.** Extension delegation to `ms-azuretools.vscode-docker` was too fragile; `dockerfile` blocks are now silently skipped. Docker extension support may be revisited in a future release. |

---

## What's Missing

### 1. Marketplace Presence & Discoverability

- **No screenshots/GIFs in README** — This is the #1 killer for extensions. Users won't install what they can't see working. The `images/` folder has only an icon — no demo GIFs.
- **No Open VSX listing** — Many users (especially on VSCodium or Gitpod) use the Open VSX Registry, not the Microsoft Marketplace. Missing out on that audience.
- **Keywords are too narrow** — Add `"documentation"`, `"lint"`, `"python"`, `"javascript"`, `"format on save"`, `"code quality"` to `package.json` keywords.

### 2. Zero-Friction First Run ✅ (Resolved)

- **Python and Shell formatting/diagnostics: resolved.** The extension now auto-installs `ms-python.black-formatter`, `mkhl.shfmt`, and `timonwong.shellcheck` via `vscode.commands.executeCommand('workbench.extensions.installExtension', ...)` on first activation. No manual CLI installation required. Diagnostic priority chain: extension → CLI fallback → `prettier-plugin-sh` (shell only).
- **JS diagnostics: resolved.** `eslintExtensionDiagnostics.ts` runs bundled ESLint with espree; snippet false-positive rules suppressed. No external extension required.
- **TypeScript diagnostics: resolved.** `typescriptDiagnostics.ts` uses the bundled TypeScript compiler API for syntax-only checking, with no type resolution to avoid false positives on import statements.

### 3. Missing Languages (High Demand)

| Language   | Current Support | Gap                                            |
| ---------- | --------------- | ---------------------------------------------- |
| Rust       | None            | `rustfmt` is trivial to add via CLI            |
| Go         | None            | `gofmt` is always available if Go is installed |
| C/C++      | None            | `clang-format`                                 |
| Java       | None            | No great bundled option, but users want it     |
| SQL        | ✅ Resolved      | `prettier-plugin-sql` bundled; parse errors surfaced as diagnostics |
| Dockerfile | Descoped         | Extension delegation too fragile; blocks silently skipped for now |
| TOML       | None            | Popular in Rust/Python projects                |
| Ruby       | None            | `rubocop`                                      |
| PHP        | None            | `php-cs-fixer`                                 |

Every missing language is a user who installs once and uninstalls.

### 4. Missing UX Features

- ~~**No status bar item**~~ — **Resolved.** `StatusBarController` in `src/ui/statusBarItem.ts`.
- **No "Format on Type"** — As users finish typing a code block fence (the closing ` ``` `), auto-formatting would feel magical.
- **No block-level quick fixes** — When diagnostics fire, offering a "Format this block" code action (lightbulb) would be a killer feature.
- **No diff preview** — Before applying formatting, showing a diff builds trust with cautious users.
- **No per-block language override** — Some users want a block formatted with different config (e.g., 2-space indent JSON vs. 4-space).
- ~~**No "ignore block" directive**~~ — **Resolved.** `@md-assistant-ignore` in the fence info string skips the block entirely.
- **No telemetry** — Intentionally excluded; the extension makes no outbound network connections.

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

### ✅ ~~Add JS/TS Diagnostics~~ — Resolved

**JS**: bundled ESLint with espree parser in `eslintExtensionDiagnostics.ts`; no external extension required. Snippet false-positive rules suppressed.
**TS**: `typescriptDiagnostics.ts` uses the bundled TypeScript compiler API (`ts.createSourceFile` + `getSyntacticDiagnostics`); syntax-only to avoid false positives on unresolved imports.

### ✅ ~~3. Add SQL Formatting~~ — Resolved

Achieved via `prettier-plugin-sql` (pure npm package, bundled as an esbuild external shipped in the VSIX `node_modules/`). Formatting is handled by `PrettierFormatter` with `parser: 'sql'`. Parse errors are surfaced as diagnostics with line/col extraction in `cliDiagnostics.ts`. No external tools required.

### ~~Dockerfile Support~~ — Descoped

Extension delegation to `ms-azuretools.vscode-docker` proved too fragile in practice. Dockerfile support has been removed from formatters, diagnostics, language aliases, and enabled-language defaults. May be revisited in a future release.

### ✅ ~~Add a Status Bar Item~~ — Resolved

`StatusBarController` in `src/ui/statusBarItem.ts`. Shows `✓ Markdown Code Assist` when a Markdown editor is active, `⚠ N issues` (warning background) after diagnostics, and a transient `✓ Formatted N blocks` message for 3 s after a format operation. Hidden when no Markdown editor is active.

### ✅ ~~Add an Ignore Directive~~ — Resolved

`@md-assistant-ignore` in the fence info string (e.g. ` ```js @md-assistant-ignore `) skips the block entirely — no formatting, no diagnostics. Implemented by checking `Code.meta` in `codeBlockExtractor.ts`.

### 2. Add the Code Action Lightbulb

When a diagnostic fires, offer "Format this block" as a quick fix. This is an extremely discoverable workflow that makes the extension feel native to VS Code. Implement via `vscode.languages.registerCodeActionsProvider`.

### 3. Add Go and Rust Support

Both `gofmt` and `rustfmt` are bundled with their respective toolchains — always available if the user has the language installed. These communities write a **lot** of documentation with code blocks.

### 4. Set Up GitHub Actions CI

---

## Summary

The extension is architecturally ready to be great. Zero-friction first-run and full-fidelity diagnostics are now solved for all supported languages via extension delegates. The remaining gaps are:

1. **Discoverability assets** — demo GIFs, CI badges, Open VSX listing
2. **Breadth of language support** — add Go, Rust, TOML (SQL and Dockerfile are now resolved)
3. **Power UX features** — code action lightbulbs, status bar item, ignore directives
