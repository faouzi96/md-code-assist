# MD Code Assist

**Language-aware formatting and inline diagnostics for fenced code blocks in Markdown files.**

MD Code Assist treats the code examples inside your `.md` files as first-class citizens — routing them through the same formatters you use for standalone source files, and surfacing errors directly in the Markdown editor.

---

## Features

- **Format code blocks** — sends each fenced block through Prettier, prettier-plugin-sh, or Black and writes the result back, leaving all surrounding Markdown untouched.
- **Inline diagnostics** — runs syntax and lint checks on code blocks and maps errors back to their exact lines in the Markdown file (Problems panel + gutter icons + inline text).
- **Format on Save** — optional auto-format whenever you save a Markdown file.
- **Format Document** — `Shift+Alt+F` formats all code blocks via VS Code's built-in shortcut.
- **Graceful degradation** — if a required tool is not available, the extension shows a clear message and skips those blocks without affecting others.

---

## Requirements

| Requirement | Notes |
|-------------|-------|
| VS Code ≥ 1.85 | |
| Python runtime | Only for Python block **diagnostics** (`python -m py_compile`) |
| Python + Black | Only for Python block **formatting** — installed automatically via the [ms-python.black-formatter](https://marketplace.visualstudio.com/items?itemName=ms-python.black-formatter) extension, or manually with `pip install black` |
| [shellcheck](https://www.shellcheck.net/) | Optional — enhances Shell/Bash diagnostics (basic syntax errors work without it) |

**Prettier, prettier-plugin-sh, js-yaml, postcss, and parse5 are all bundled — no installation required.**

---

## Installation

### VS Code Marketplace

Search for **MD Code Assist** in the Extensions view (`Ctrl+Shift+X`).

### From a `.vsix` file

```bash
code --install-extension md-code-assist-0.1.0.vsix
```

---

## Commands

Open a Markdown file, then use the Command Palette (`Ctrl+Shift+P`):

| Command | Description |
|---------|-------------|
| `MD Code Assist: Format All Code Blocks` | Format every fenced block in the file |
| `MD Code Assist: Format Current Code Block` | Format only the block the cursor is inside |
| `MD Code Assist: Show Code Block Diagnostics` | Run diagnostics on all blocks |
| `MD Code Assist: Diagnose Current Code Block` | Run diagnostics on the block at cursor |

---

## Supported Languages

### Prettier (bundled)

| Language | Fence labels |
|----------|-------------|
| JavaScript | `js`, `jsx`, `javascript` |
| TypeScript | `ts`, `tsx`, `typescript` |
| JSON / JSONC | `json`, `jsonc` |
| YAML | `yaml`, `yml` |
| HTML | `html` |
| CSS / SCSS / Less | `css`, `scss`, `less` |
| GraphQL | `graphql`, `gql` |
| Markdown (nested) | `markdown`, `md` |

### External CLI (optional)

| Language | Tool | Install |
|----------|------|---------|
| Python | Black | `pip install black` |
| Shell / Bash / Zsh | shfmt | `brew install shfmt` |

---

## Configuration

All settings are under `mdCodeAssist.*` and can be set at User, Workspace, or Folder scope.

| Setting | Default | Description |
|---------|---------|-------------|
| `format.enabledLanguages` | `["javascript","typescript","python","json","yaml","html","css","shell","graphql","markdown"]` | Languages to format |
| `diagnostics.enabledLanguages` | `["javascript","typescript","python","json","yaml","css","html","shell"]` | Languages to diagnose |
| `formatters.blackPath` | `"black"` | Path to Black CLI executable (fallback) |
| `formatters.shfmtPath` | `"shfmt"` | Path to shfmt CLI executable (fallback) |
| `decorations.showGutterIcons` | `true` | Colored gutter icons for diagnostics |
| `decorations.showInlineErrors` | `true` | Inline error text after affected lines |
| `formatOnSave` | `false` | Auto-format all blocks on save |

Example — enable all languages and format on save:

```jsonc
{
  "mdCodeAssist.format.enabledLanguages": [
    "javascript", "typescript", "python", "json", "yaml", "html", "css", "shell", "graphql"
  ],
  "mdCodeAssist.diagnostics.enabledLanguages": [
    "javascript", "typescript", "json", "yaml", "css", "html", "shell", "python"
  ],
  "mdCodeAssist.formatOnSave": true
}
```

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — pipeline diagrams, module layout, design decisions
- [Contributing](docs/CONTRIBUTING.md) — dev setup, code style, adding formatters, test guidelines

---

## License

[MIT](LICENSE)
