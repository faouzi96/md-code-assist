# Session Notes — Language-Aware Diagnostics (2026-05-12)

Branch: `language-aware-diagnostics`

---

## What Was Done

### 1. TypeScript & JavaScript — `no-undef` via ESLint (`eslintExtensionDiagnostics.ts`)

- Added `'no-undef': 'error'` to `SNIPPET_RULES` — catches undeclared variable references in JS blocks.
- TypeScript blocks are now **type-stripped first** via `ts.transpileModule()` (TypeScript compiler API, bundled by esbuild, so no disk access needed) then linted as plain JS with the same ESLint pipeline.
- `filePath` is always `'snippet.js'` after stripping so ESLint's parser stays in JS mode.
- `ts.transpileModule()` is type-strip only — it does **not** type-check. Type mismatches are not reported (by design — JS-style analysis only).

### 2. Python — Ruff WASM (`ruffWasmDiagnostics.ts`) + CLI fallback

- New file `src/diagnostics/ruffWasmDiagnostics.ts` — uses `@astral-sh/ruff-wasm-nodejs` (official Ruff WASM package).
- `getRuffWorkspace()` lazy-initialises a `Workspace({})` instance on first call.
- `ws.check(source)` returns `{code, message, start_location: {row, column}, end_location}` (1-based); converted to 0-based VS Code ranges.
- Suppressed codes: `F401` (unused import), `E401` (style — false positives in snippets).
- `cliDiagnostics.ts` `runPyCompile()` tries Ruff WASM first, then falls back to `pyflakes` CLI → `python -m py_compile`.
- `@astral-sh/ruff-wasm-nodejs` marked as esbuild **external** (WASM file path breaks when bundled) and whitelisted in `.vscodeignore`.
- **Status: working (confirmed by user).**

### 3. `typescriptDiagnostics.ts` — deleted

- Deleted (never committed to main; removed in commit `ff91868`). TypeScript routes to `runNodeCheck()` (ESLint pipeline, same as JS).

---

## ShellCheck Extension — Final Working Approach (`shellCheckExtensionDiagnostics.ts`)

After several approaches (see below), the following combination works:

1. **`isShellCheckExtensionAvailable()`** — checks `ext !== undefined` only. `isActive` is always `false` for lazily-loaded extensions when diagnosing from a Markdown context.
2. **Temp file with `file:` URI** — writes block content to `os.tmpdir()` with a `.sh`/`.bash` extension. No visible tab. CRLF normalised before write (Windows produced "Literal carriage return" errors otherwise).
3. **`normalizeUri()`** — round-trips the URI through `vscode.Uri.file(uri.fsPath).toString()` so Windows drive-letter casing / percent-encoding is consistent.
4. **`waitForDiagnostics()`** — subscribes to `onDidChangeDiagnostics` **before** `openTextDocument()`. Uses a 400 ms debounce (multi-pass analysis) with an 8 s hard cap. Compares URIs via `normalizeUri()`.
5. **`setTextDocumentLanguage(doc, langId)`** — sets `'bash'` for `bash` blocks, `'shellscript'` for others. Needed so ShellCheck's provider registers on the correct language.
6. **Temp file deleted in `finally`.**

**Status: bash blocks working (confirmed by user). `sh` blocks mostly working (minor gaps accepted for now).**

---

## Removed Packages

- `shellcheck` and `shfmt` npm packages removed from `package.json` — these download binaries at install time and are not VSIX-safe.

---

## Key Technical Facts

| Area                              | Detail                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| esbuild bundling                  | `typescript` compiler is bundled into `dist/extension.js`. `prettier`, `espree`, `eslint`, `@astral-sh/ruff-wasm-nodejs` are external (shipped in VSIX `node_modules/`). |
| `ts.transpileModule()`            | Pure in-memory, no host/lib needed. Works reliably in bundled VSIX.                                                                                                      |
| `getSemanticDiagnostics()`        | Needs TypeScript lib files from disk — not available in bundled VSIX. Abandoned.                                                                                         |
| Ruff WASM `Workspace.check()`     | Returns 1-based `{row, column}` positions. Converted to 0-based VS Code ranges.                                                                                          |
| ShellCheck temp file URI          | `vscode.Uri.joinPath(vscode.Uri.file(os.tmpdir()), tmpName)`. Normalized via `normalizeUri()` for Windows drive-letter consistency.                                      |
| `onDidChangeDiagnostics` debounce | 400 ms debounce / 8 s hard cap. Listener subscribed **before** `openTextDocument`.                                                                                       |
| CRLF normalization                | `.replace(/\r\n/g, '\n')` before writing temp file — Windows line endings caused ShellCheck SC1017.                                                                      |

---

## Uncommitted Files at End of Session

All changes committed (see commit history on `language-aware-diagnostics` branch).

---

## Next Steps

1. **Merge `language-aware-diagnostics` → main** — core Python and shell diagnostics are working.
2. **`sh` block gap** — ShellCheck occasionally misses diagnostics on plain `sh` blocks; acceptable for now.
3. **TypeScript semantic diagnostics** — explore alternatives to the abandoned `getSemanticDiagnostics()` approach (e.g. `tsc --strict` via CLI with a temp project).
