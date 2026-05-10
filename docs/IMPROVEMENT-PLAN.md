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
| JS/TS diagnostics limited to parse errors | `eslintExtensionDiagnostics.ts` delegates to `dbaeumer.vscode-eslint`; auto-installed on activation; falls back to `node --check` when no ESLint config present; snippet false-positive rules suppressed (`no-undef`, `no-unused-vars`, `import/no-unresolved`, etc.) |
| SQL — no formatting or diagnostics | `prettierFormatter.ts` now loads `prettier-plugin-sql` (bundled npm package) for formatting; `cliDiagnostics.ts` surfaces Prettier parse errors as diagnostics (line/col extracted from error message) — no extra tools required |
| Dockerfile — no formatting or diagnostics | `dockerExtensionFormatter.ts` delegates formatting to `ms-azuretools.vscode-docker` (auto-installed); `dockerExtensionDiagnostics.ts` delegates Hadolint-powered diagnostics through the same extension via `onDidChangeDiagnostics`; `docker` fence label aliased to `dockerfile` |

---

## What's Missing

### 1. Marketplace Presence & Discoverability

- **No screenshots/GIFs in README** — This is the #1 killer for extensions. Users won't install what they can't see working. The `images/` folder has only an icon — no demo GIFs.
- **No Open VSX listing** — Many users (especially on VSCodium or Gitpod) use the Open VSX Registry, not the Microsoft Marketplace. Missing out on that audience.
- **Keywords are too narrow** — Add `"documentation"`, `"lint"`, `"python"`, `"javascript"`, `"format on save"`, `"code quality"` to `package.json` keywords.

### 2. Zero-Friction First Run ✅ (Resolved)

- **Python and Shell formatting/diagnostics: resolved.** The extension now auto-installs `ms-python.black-formatter`, `mkhl.shfmt`, and `timonwong.shellcheck` via `vscode.commands.executeCommand('workbench.extensions.installExtension', ...)` on first activation. No manual CLI installation required. Diagnostic priority chain: extension → CLI fallback → `prettier-plugin-sh` (shell only).
- **JS/TS diagnostics: resolved.** `eslintExtensionDiagnostics.ts` delegates to `dbaeumer.vscode-eslint` (auto-installed on activation), providing full lint feedback. Falls back to `node --check` when no ESLint config exists in the workspace. Snippet-only false-positive rules are suppressed.

### 3. Missing Languages (High Demand)

| Language   | Current Support | Gap                                            |
| ---------- | --------------- | ---------------------------------------------- |
| Rust       | None            | `rustfmt` is trivial to add via CLI            |
| Go         | None            | `gofmt` is always available if Go is installed |
| C/C++      | None            | `clang-format`                                 |
| Java       | None            | No great bundled option, but users want it     |
| SQL        | ✅ Resolved      | `prettier-plugin-sql` bundled; parse errors surfaced as diagnostics |
| Dockerfile | ✅ Resolved      | `ms-azuretools.vscode-docker` extension delegate; Hadolint diagnostics |
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

### ✅ ~~2. Add ESLint Extension Diagnostics for JS/TS~~ — Resolved

Achieved via `eslintExtensionDiagnostics.ts`. `dbaeumer.vscode-eslint` auto-installs on activation. Diagnostic priority: ESLint extension → `node --check` fallback (parse errors when no ESLint config). Snippet false-positive rules suppressed.

### ✅ ~~3. Add SQL Formatting~~ — Resolved

Achieved via `prettier-plugin-sql` (pure npm package, bundled as an esbuild external shipped in the VSIX `node_modules/`). Formatting is handled by `PrettierFormatter` with `parser: 'sql'`. Parse errors are surfaced as diagnostics with line/col extraction in `cliDiagnostics.ts`. No external tools required.

### ✅ ~~Dockerfile Support~~ — Resolved

Formatting delegated to `ms-azuretools.vscode-docker` (auto-installed) via `DockerExtensionFormatter`. Hadolint-powered diagnostics retrieved through the same extension via `onDidChangeDiagnostics` in `dockerExtensionDiagnostics.ts`. Fence labels `dockerfile` and `docker` both handled.

### 2. Add the Code Action Lightbulb

When a diagnostic fires, offer "Format this block" as a quick fix. This is an extremely discoverable workflow that makes the extension feel native to VS Code. Implement via `vscode.languages.registerCodeActionsProvider`.

### 3. Add Go and Rust Support

Both `gofmt` and `rustfmt` are bundled with their respective toolchains — always available if the user has the language installed. These communities write a **lot** of documentation with code blocks.

### 4. Set Up GitHub Actions CI

Required before asking anyone to contribute. Without it, external PRs stall. A basic workflow: lint → compile → test on push/PR, targeting Windows, macOS, and Linux.

### 6. Add a Status Bar Item

Costs ~20 lines of code, makes the extension feel alive and trustworthy. Show the count of formatted/diagnosed blocks, or a spinner during long operations.

---

## Summary

The extension is architecturally ready to be great. Zero-friction first-run and full-fidelity diagnostics are now solved for all supported languages via extension delegates. The remaining gaps are:

1. **Discoverability assets** — demo GIFs, CI badges, Open VSX listing
2. **Breadth of language support** — add Go, Rust, TOML (SQL and Dockerfile are now resolved)
3. **Power UX features** — code action lightbulbs, status bar item, ignore directives
