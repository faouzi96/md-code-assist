# Markdown Code Assistant — v1.0.0 Release Plan

> **Target version:** `1.0.0`  
> **Current version in `package.json`:** `0.1.0`  
> **Target channels:** VS Code Marketplace + Open VSX Registry

---

## 1. What Ships in v1.0.0

This is the feature-complete first public release. Everything below is already implemented and passing lint/tests/build.

### Formatting

| Capability                                                                  | Implementation                                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| JS / TS / JSON / YAML / HTML / CSS / SCSS / Less / GraphQL / Markdown / SQL | Prettier (bundled)                                                          |
| Python                                                                      | `ms-python.black-formatter` extension (auto-installed) → Black CLI fallback |
| Shell / Bash / Zsh                                                          | `mkhl.shfmt` extension (auto-installed) → shfmt CLI fallback                |
| Format All Blocks command                                                   | `mdCodeAssist.formatAllBlocks`                                              |
| Format Current Block command                                                | `mdCodeAssist.formatCurrentBlock`                                           |
| Format Document (`Shift+Alt+F`)                                             | `DocumentFormattingEditProvider`                                            |
| Trigger modes                                                               | `onCommand` (default) / `onSave` / `onType`                                 |
| Ignore directive                                                            | `@md-assistant-ignore` in fence info string                                 |

### Diagnostics

| Capability                     | Implementation                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| JavaScript                     | Bundled ESLint + espree (no external extension required)                                |
| TypeScript                     | Type-strip via `ts.transpileModule()` → ESLint pipeline                                 |
| Python                         | Ruff WASM (`@astral-sh/ruff-wasm-nodejs`, bundled) → pyflakes CLI → py_compile fallback |
| Shell / Bash                   | `timonwong.shellcheck` extension (auto-installed) → shellcheck CLI fallback             |
| YAML                           | `js-yaml` (bundled)                                                                     |
| CSS                            | `postcss` (bundled)                                                                     |
| HTML                           | `parse5` (bundled)                                                                      |
| SQL                            | `prettier-plugin-sql` parse errors (bundled)                                            |
| Show Diagnostics command       | `mdCodeAssist.showDiagnostics`                                                          |
| Diagnose Current Block command | `mdCodeAssist.diagnoseCurrentBlock`                                                     |
| Trigger modes                  | `onCommand` (default) / `onSave` / `onType`                                             |

### UX

- Status bar: `✓ Markdown Code Assist` / `⚠ N issues` / `✓ Formatted N blocks`
- Gutter icons + inline error text (both toggleable)
- Output channel: `Markdown Code Assistant`
- Graceful degradation on missing tools

---

## 2. Pre-Release Checklist

Work through these in order. Each section is a gate — do not proceed to the next until it is complete.

### 2.1 Code Quality Gate

- [ ] `npm run lint` — zero errors
- [ ] `npm test` — all tests pass
- [ ] `npm run build` — clean build, no warnings
- [ ] `npx tsc --noEmit` — zero TypeScript errors

### 2.2 Version Bump

- [ ] Bump `"version"` in `package.json` from `"0.1.0"` to `"1.0.0"`
- [ ] Add the `[1.0.0]` section to `CHANGELOG.md` with today's date, moving everything from `[Unreleased]` into it
- [ ] Update the comparison URLs at the bottom of `CHANGELOG.md`:
  ```
  [Unreleased]: https://github.com/md-code-assist/md-code-assist/compare/v1.0.0...HEAD
  [1.0.0]: https://github.com/md-code-assist/md-code-assist/compare/v0.1.0...v1.0.0
  [0.1.0]: https://github.com/md-code-assist/md-code-assist/releases/tag/v0.1.0
  ```
- [ ] Remove `"private": true` from `package.json` (vsce requires this to be absent for publishing)

### 2.3 Marketplace Metadata

- [ ] Confirm `"publisher"` field in `package.json` matches your registered publisher ID on [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)
- [ ] Verify `"icon": "images/icon.png"` — the file must exist and be a 128×128 PNG
- [ ] Add a `"galleryBanner"` entry to `package.json` (controls the banner color in the marketplace listing):
  ```json
  "galleryBanner": {
    "color": "#1e1e2e",
    "theme": "dark"
  }
  ```
- [ ] Expand `"keywords"` in `package.json` — currently too narrow. Add:
      `"documentation"`, `"lint"`, `"python"`, `"javascript"`, `"typescript"`, `"shell"`, `"format on save"`, `"code quality"`, `"ruff"`, `"prettier"`
- [ ] Review `.vscodeignore` — confirm `dist/extension.js` is **included** and `src/`, `test/`, `docs/`, `node_modules/` dev-only directories are excluded

### 2.4 Documentation

- [ ] Add at least one screenshot or demo GIF to `images/` and reference it at the top of `README.md` — this is the single highest-impact action for install conversion
- [ ] Create `docs/SUPPORTED_LANGUAGES.md` (referenced in `copilot-instructions.md` but missing)
- [ ] Add a **FAQ / Troubleshooting** section to `README.md` covering:
  - "ShellCheck isn't picking up errors" → check the `timonwong.shellcheck` extension is active
  - "Python formatting doesn't work" → check `ms-python.black-formatter` is installed
  - "A block I want to skip keeps getting formatted" → use `@md-assistant-ignore`
- [ ] Add CI badge to `README.md` (from `.github/workflows/ci.yml`)

### 2.5 Local VSIX Smoke Test

- [ ] Build the VSIX: `npm run package` → produces `md-code-assist-1.0.0.vsix`
- [ ] Install it locally: `code --install-extension md-code-assist-1.0.0.vsix`
- [ ] Manually verify in a fresh VS Code window (no other extensions active for the test):
  - Open a Markdown file with JS, Python, and shell blocks
  - Run **Format All Code Blocks** → blocks are formatted
  - Run **Show Code Block Diagnostics** → errors appear in Problems panel and inline
  - Introduce a Python syntax error → run diagnostics → Ruff WASM reports it
  - Add `@md-assistant-ignore` to a block → confirm it is skipped
  - Change `format.triggerMode` to `"onSave"` → save the file → auto-format fires
  - Verify the status bar item updates correctly
- [ ] Test on Windows AND macOS/Linux (temp-file paths differ for ShellCheck)

---

## 3. Publisher Account Setup

If you do not yet have a publisher account:

1. Go to [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage) and sign in with a Microsoft account
2. Create a publisher with the ID that matches `"publisher"` in `package.json` (currently `"md-code-assist"`)
3. Generate a Personal Access Token (PAT):
   - Go to [dev.azure.com](https://dev.azure.com) → User Settings → Personal Access Tokens
   - New token → **All accessible organizations** → Scope: **Marketplace → Manage**
   - Copy the token — you won't see it again
4. Authenticate vsce: `npx vsce login md-code-assist` (paste the PAT when prompted)

---

## 4. Publish to VS Code Marketplace

```bash
# 1. Final clean build
npm run build

# 2. Package
npx vsce package
# → md-code-assist-1.0.0.vsix

# 3. Publish
npx vsce publish
# or publish the pre-built VSIX directly:
npx vsce publish --packagePath md-code-assist-1.0.0.vsix
```

After publishing, the extension appears in the Marketplace within ~5 minutes. Check:

- [marketplace.visualstudio.com/items?itemName=md-code-assist.md-code-assist](https://marketplace.visualstudio.com/items?itemName=md-code-assist.md-code-assist)

---

## 5. Publish to Open VSX Registry

Open VSX serves VSCodium, Gitpod, CodeSandbox, and Eclipse Theia users — a meaningful second audience.

1. Create an account at [open-vsx.org](https://open-vsx.org) (GitHub login)
2. Generate a token: Account → Settings → Access Tokens
3. Publish:
   ```bash
   npx ovsx publish md-code-assist-1.0.0.vsix -p <YOUR_OPEN_VSX_TOKEN>
   ```
   Or install `ovsx` globally: `npm install -g ovsx`

---

## 6. Git Tag & GitHub Release

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.0.0"
git tag v1.0.0
git push origin main --tags
```

On GitHub, create a Release from the `v1.0.0` tag:

- Title: `v1.0.0 — First Public Release`
- Body: paste the `[1.0.0]` section from `CHANGELOG.md`
- Attach: `md-code-assist-1.0.0.vsix`

The CI workflow (`.github/workflows/ci.yml`) should automatically upload the VSIX artifact on the tag push if the publish step is wired up. Verify this before relying on it.

---

## 7. CI/CD Pipeline Verification

Check `.github/workflows/ci.yml` covers:

| Step                                           | Should exist                                         |
| ---------------------------------------------- | ---------------------------------------------------- |
| Build (`npm run build`)                        | ✅                                                   |
| Lint (`npm run lint`)                          | verify                                               |
| Tests (`npm test`) on ubuntu + windows + macos | verify matrix                                        |
| VSIX artifact upload on push to `main`         | verify                                               |
| Marketplace publish on `v*` tag                | verify — requires `VSCE_PAT` secret in repo settings |

If the publish step is missing, add it:

```yaml
- name: Publish to Marketplace
  if: startsWith(github.ref, 'refs/tags/v')
  run: npx vsce publish --packagePath *.vsix
  env:
    VSCE_PAT: ${{ secrets.VSCE_PAT }}
```

Add `VSCE_PAT` (your PAT) as a repository secret at:  
`https://github.com/md-code-assist/md-code-assist/settings/secrets/actions`

---

## 8. Post-Release Monitoring (First 48 Hours)

- Watch the Marketplace listing for install counts and reviews
- Monitor the GitHub repository Issues tab for first-user bug reports
- Check the `Markdown Code Assistant` output channel on the smoke-test machine for unexpected errors

### Common first-week issues to watch for

| Symptom                                 | Likely cause                                                              |
| --------------------------------------- | ------------------------------------------------------------------------- |
| Python formatting silently does nothing | `ms-python.black-formatter` auto-install failed (firewall/proxy)          |
| ShellCheck diagnostics empty            | Extension installed but not yet active — user needs to reload window once |
| VSIX too large (> 20 MB)                | A large binary leaked into the bundle — check `.vscodeignore`             |
| "Cannot find module" on activation      | An esbuild external is missing from VSIX `node_modules/`                  |

---

## 9. Blocked Items (Not in v1.0.0)

These are known gaps intentionally deferred:

| Item                                                  | Reason deferred                                                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Demo GIF in README                                    | Requires screen recording; ship listing first, add GIF in v1.0.1 patch                            |
| Code Action Lightbulb ("Format this block" quick fix) | v1.1.0                                                                                            |
| Go (`gofmt`) + Rust (`rustfmt`) support               | v1.1.0                                                                                            |
| TypeScript semantic diagnostics                       | Technically blocked — `getSemanticDiagnostics()` needs TS lib files not available in bundled VSIX |
| `SUPPORTED_LANGUAGES.md`                              | Pre-release doc task (section 2.4)                                                                |
| Open VSX listing                                      | Post-publish task (section 5)                                                                     |
| TOML / Ruby / PHP formatting                          | v1.2.0                                                                                            |

---

## 10. v1.1.0 Preview (After v1.0.0 is Stable)

Once v1.0.0 has been in the wild for 2–4 weeks and no critical issues are open:

- [ ] Code Action provider — "Format this block" lightbulb on diagnostics
- [ ] Go formatting via `gofmt` CLI
- [ ] Rust formatting via `rustfmt` CLI
- [ ] Demo GIF at the top of README
- [ ] `SUPPORTED_LANGUAGES.md`
- [ ] Telemetry decision (opt-in vs. intentionally excluded — document the decision)
