# Markdown Code Assistant — Improvement Plan & Gap Analysis

## Current State Assessment

The architecture is solid and well-thought-out. The pipeline (parse → extract → format/diagnose → map back) is clean, the code style is consistent, and the separation of concerns is good. This is a strong foundation.

---

## What's Missing

### 1. Marketplace Presence & Discoverability

- **No screenshots/GIFs in README** — This is the #1 killer for extensions. Users won't install what they can't see working. The `images/` folder has only an icon — no demo GIFs.
- **No Open VSX listing** — Many users (especially on VSCodium or Gitpod) use the Open VSX Registry, not the Microsoft Marketplace. Missing out on that audience.
- **Keywords are too narrow** — Add `"documentation"`, `"lint"`, `"python"`, `"javascript"`, `"format on save"`, `"code quality"` to `package.json` keywords.

### 2. Zero-Friction First Run

- Users must install Black and shfmt separately for Python and Shell **only if** the VS Code extension delegates (`ms-python.black-formatter`, `mkhl.shfmt`, `timonwong.shellcheck`) are unavailable. These extensions are now auto-installed on activation, eliminating the friction wall for most users.
- The `node --check` diagnostic for JS/TS is very limited — no linting, no type errors. It only catches parse errors. Users will expect ESLint-level feedback.

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
- **No "ignore block" directive** — e.g., ` ```js <!-- md-code-assist-ignore --> ` to skip a block.
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

- `ARCHITECTURE.md` and `CONTRIBUTING.md` are excellent — rare for an early-stage extension.
- Missing: `SUPPORTED_LANGUAGES.md` (referenced in project instructions but not present in the repo).
- Missing: a **FAQ / troubleshooting** section in README (e.g., "Why isn't Python formatting working?").
- Missing: a **changelog with dates** in `CHANGELOG.md`.

---

## Priority Ranking for Maximum Impact

### 1. Ship the WASM Formatters (Python + Shell)

Zero-install is the difference between "I tried it" and "I kept it". Removing the Black and shfmt dependencies alone would eliminate the biggest adoption barrier. Already planned in the v1.1 roadmap — should be treated as a pre-launch blocker.

### 2. Make a 60-Second Demo GIF

Put it at the top of the README. Show: open a Markdown file with messy code blocks → run Format All → watch it clean up. This single asset will drive more installs than any individual feature.

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

The extension is architecturally ready to be great. The core gap is:

1. **Breadth of language support** — add Go, Rust, SQL at minimum
2. **Zero-friction first run** — WASM formatters to eliminate CLI dependencies
3. **Discoverability assets** — demo GIFs, CI badges, Open VSX listing
4. **Power UX features** — code action lightbulbs, status bar item, ignore directives
