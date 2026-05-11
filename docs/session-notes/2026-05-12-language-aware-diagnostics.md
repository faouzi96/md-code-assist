# Session Notes — Language-Aware Diagnostics (2026-05-12)

Branch: `language-aware-diagnostics`

---

## What Was Done

### 1. TypeScript & JavaScript — `no-undef` via ESLint (`eslintExtensionDiagnostics.ts`)

- Added `'no-undef': 'error'` to `SNIPPET_RULES` — catches undeclared variable references in JS blocks.
- TypeScript blocks are now **type-stripped first** via `ts.transpileModule()` (TypeScript compiler API, bundled by esbuild, so no disk access needed) then linted as plain JS with the same ESLint pipeline.
- `filePath` is always `'snippet.js'` after stripping so ESLint's parser stays in JS mode.
- `ts.transpileModule()` is type-strip only — it does **not** type-check. Type mismatches are not reported (by design — JS-style analysis only).

### 2. Python — pyflakes CLI fallback (`cliDiagnostics.ts`)

- `runPyCompile()` now tries `pyflakes` before falling back to `python -m py_compile`.
- pyflakes catches undefined names (`F821`) without needing imports to resolve.
- `parsePyflakesErrors()` handles both `path:line:col: msg` and `path:line: msg` formats.
- Chain: pyflakes CLI → py_compile (syntax only).

### 3. `typescriptDiagnostics.ts` — dead code

- TypeScript now routes to `runNodeCheck()` (same as JS). The old `typescriptDiagnostics.ts` file is no longer imported anywhere.
- It contains an `INLINE_AMBIENT_LIB` approach (full semantic checking via `getSemanticDiagnostics()`) that was explored but abandoned because the TypeScript lib files aren't available at runtime in a bundled VSIX.
- Can be deleted when convenient.

---

## What Was Attempted but Left Out of Commit

### ShellCheck extension delegation (`shellCheckExtensionDiagnostics.ts`)

**Goal**: ShellCheck is installed on the machine but wasn't triggering because `isShellCheckExtensionAvailable()` checked `ext.isActive` — ShellCheck activates lazily and isn't active until a shell file is opened.

**Fixes tried (in order)**:
1. Changed `isShellCheckExtensionAvailable()` to check only `ext !== undefined` (not `isActive`), and call `ext.activate()` before opening the document.
2. Used `openTextDocument({content, language})` + `waitForDiagnostics` + `closeTabByUri` — avoids `showTextDocument` opening a visible tab. But untitled documents still appeared as tabs.
3. Switched to temp file + `file:` URI — no tabs, but `waitForDiagnostics` silently failed on Windows because VS Code normalizes `file:` URIs with a lowercase drive letter / encoded colon, breaking the `uri.toString()` comparison. Result: always returned `[]`.
4. Back to `openTextDocument({content, language})` + `closeTabByUri()` using `tabGroups` API (closes tab by exact URI match with `preserveFocus: true`).

**Status**: Still not working reliably. Changes are left unstaged on `language-aware-diagnostics` branch. Same applies to the Ruff extension adapter for Python.

### Ruff extension adapter (`ruffExtensionDiagnostics.ts`) — new file, unstaged

- Same pattern as ShellCheck: `openTextDocument({content, language:'python'})` → `waitForDiagnostics` → `closeTabByUri`.
- `ensureRuffExtension()` auto-installs `charliermarsh.ruff` at activation (same pattern as Black/shfmt).
- `isRuffExtensionAvailable()` checks installed only (not `isActive`); `activate()` called before opening doc.
- Suppressed codes: `F401` (unused import — false positive in snippets), `E401` (style rule).
- File exists at `src/diagnostics/ruffExtensionDiagnostics.ts` but **not committed**.

---

## Key Technical Facts

| Area | Detail |
|------|--------|
| esbuild bundling | `typescript` compiler is bundled into `dist/extension.js`. `prettier`, `espree`, `eslint` are external (shipped in VSIX `node_modules/`). |
| `ts.transpileModule()` | Pure in-memory, no host/lib needed. Works reliably in bundled VSIX. |
| `getSemanticDiagnostics()` | Needs TypeScript lib files from disk — not available in bundled VSIX. Abandoned. |
| `openTextDocument({content})` | Creates untitled doc, triggers language server analysis, but VS Code may show it as a tab. |
| `openTextDocument(fileUri)` | No tab shown, but `file:` URI normalization on Windows breaks `toString()` comparisons. |
| `tabGroups.close(tab, true)` | Closes tab by URI without stealing focus — correct approach once the URI round-trip issue is solved. |
| ShellCheck `onDidChangeDiagnostics` | Fires asynchronously after a debounce delay. The `waitForDiagnostics` listener must be subscribed **before** the document content is set. |

---

## Uncommitted Files (working tree, branch `language-aware-diagnostics`)

```
 M src/diagnostics/shellCheckExtensionDiagnostics.ts   (multiple approaches tried)
 M docs/sample-test/python.md                          (updated test blocks)
 M docs/sample-test/shell.md                           (updated test blocks)
?? src/diagnostics/ruffExtensionDiagnostics.ts         (new, complete but broken)
```

---

## Next Steps

1. **Fix the tab-opening issue for ShellCheck and Ruff** — the core problem is that no VS Code API creates an in-memory document that:
   - (a) triggers a language extension's diagnostics provider, AND
   - (b) never shows a tab.
   
   Possible approach to investigate: use a `vscode.workspace.registerTextDocumentContentProvider` with a custom scheme (e.g. `mdca-shell://`) so ShellCheck/Ruff see an open document but VS Code doesn't render it as an editable tab.

2. **Delete `typescriptDiagnostics.ts`** — it has no callers and is dead code.

3. **Merge `language-aware-diagnostics` → main** once Shell/Python extension delegation is resolved.
