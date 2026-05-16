# Pending Bugs

## 1. Screenshot not visible in extension detail pane

- README uses absolute `https://raw.githubusercontent.com/faouzi96/md-code-assist/main/images/Screenshot.png`
- Image is in the VSIX (`extension/images/Screenshot.png`) and on GitHub (`main` branch)
- Reinstalling the VSIX didn't help — image still doesn't appear in VS Code's extension detail view
- Likely cause: VS Code's extension detail webview CSP blocks external `https:` images for locally-installed (non-Marketplace) extensions
- Fix to investigate: embed image as base64 data URI, or find a VS Code-approved way to reference bundled images

## 2. Python formatting opens tens of files on save — ✅ FIXED

- Root cause: `openTextDocument({ content, language })` created a new untitled doc per block on every save
- Fix: single shared `scratchDoc` reused across all calls; content updated via `WorkspaceEdit`; concurrent calls serialized via `pendingFormat` promise chain
- File: `src/formatters/blackExtensionFormatter.ts`
