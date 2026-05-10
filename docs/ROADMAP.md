# Markdown Code Assistant — Roadmap & Deployment Plan

## Overview

This document outlines the development phases, milestones, and deployment strategy for Markdown Code Assistant, a VS Code extension that brings formatting and diagnostics to fenced code blocks in Markdown.

---

## Development Phases

### Phase 1: Foundation (Weeks 1–2)

**Goal:** Project scaffolding and core parsing infrastructure

| Task | Description | Priority |
|------|-------------|----------|
| Project setup | Initialize with TypeScript, esbuild, Jest, ESLint, Prettier | High |
| VS Code extension scaffold | `package.json` manifest, activation events, basic commands | High |
| Markdown parser | Integrate unified/remark for AST parsing | High |
| Code block extractor | Extract fenced blocks with language, content, and positions | High |
| Unit tests for parser | Test various Markdown structures and edge cases | High |
| CI/CD setup | GitHub Actions for build, test, lint on PR | Medium |

**Deliverable:** Extension loads, parses Markdown, and logs detected code blocks.

---

### Phase 2: Formatting Engine (Weeks 3–4)

**Goal:** Implement formatting for all supported languages

| Task | Description | Priority |
|------|-------------|----------|
| Formatter interface | Define `IFormatter` contract | High |
| Prettier integration | Format JS/TS/JSON/YAML/HTML/CSS via Prettier API | High |
| Black integration | Shell out to Black CLI for Python | High |
| shfmt integration | Shell out to shfmt CLI for Shell/Bash | High |
| Tool detection | Detect installed CLI tools, provide fallback messages | High |
| Formatter dispatcher | Route blocks to correct formatter by language | High |
| Format all blocks command | Implement `mdCodeAssist.formatAllBlocks` | High |
| Format current block command | Implement `mdCodeAssist.formatCurrentBlock` | High |
| Document formatting provider | Integrate with VS Code's Format Document | Medium |
| Configuration settings | User settings for paths, enabled languages | Medium |
| Unit & integration tests | Test each formatter and dispatcher logic | High |

**Deliverable:** Users can format code blocks via commands and Format Document.

---

### Phase 3: Diagnostics Engine (Weeks 5–6)

**Goal:** Inline diagnostics for code blocks using language services

| Task | Description | Priority |
|------|-------------|----------|
| Virtual document manager | Create in-memory documents per code block | High |
| Language service integration | Leverage VS Code's built-in TS/JS diagnostics | High |
| Diagnostic mapper | Map virtual doc positions back to Markdown | High |
| DiagnosticCollection provider | Push diagnostics to VS Code Problems panel | High |
| Python diagnostics | Integrate with Pylance/Pyright if available | Medium |
| Shell diagnostics | Basic syntax checking via shellcheck if available | Low |
| Debounced updates | Throttle diagnostic refresh on document change | Medium |
| Unit tests for mapping | Verify position translation accuracy | High |

**Deliverable:** Errors in code blocks appear as squiggly underlines with Problems panel integration.

---

### Phase 4: Decorations & UX Polish (Week 7)

**Goal:** Enhanced visual feedback and user experience

| Task | Description | Priority |
|------|-------------|----------|
| Gutter decorations | Colored icons in gutter for errors/warnings | Medium |
| Inline decorations | Inline error text after problematic lines | Medium |
| Progress indicators | Show progress during multi-block formatting | Medium |
| Output channel logging | Detailed logs in "Markdown Code Assistant" output | Medium |
| Error notifications | User-friendly messages for missing tools | High |
| Format on save option | Optional auto-format on Markdown save | Low |
| Keyboard shortcuts | Default keybindings for commands | Low |

**Deliverable:** Polished UX with clear visual feedback and helpful messages.

---

### Phase 5: Testing & Hardening (Week 8)

**Goal:** Comprehensive testing and edge case handling

| Task | Description | Priority |
|------|-------------|----------|
| Edge case testing | Nested blocks, empty blocks, unknown languages | High |
| Large file testing | Performance with 100+ code blocks | High |
| Cross-platform testing | Verify on Windows, macOS, Linux | High |
| Error recovery | Graceful handling of formatter crashes | High |
| Memory leak testing | Ensure virtual documents are disposed | Medium |
| Accessibility review | Verify decorations work with screen readers | Low |
| Documentation | README, CONTRIBUTING, ARCHITECTURE docs | High |

**Deliverable:** Stable, well-tested extension ready for release.

---

### Phase 6: Release & Deployment (Week 9)

**Goal:** Publish to VS Code Marketplace

| Task | Description | Priority |
|------|-------------|----------|
| Marketplace publisher | Create/configure publisher account | High |
| Extension icon & branding | Design icon, banner, screenshots | Medium |
| README polish | Clear feature list, GIFs, installation instructions | High |
| CHANGELOG | Document initial release features | High |
| Package extension | Build `.vsix` with `vsce package` | High |
| Pre-release testing | Install `.vsix` locally, final verification | High |
| Publish to Marketplace | `vsce publish` | High |
| Announcement | Blog post, social media, Reddit/HN | Low |

**Deliverable:** Extension live on VS Code Marketplace.

---

## Post-Launch Roadmap

### Version 1.1 — Self-Contained Formatting (Completed)

**Goal:** Zero external tool requirements for shell/bash and Python. Users get working formatting and diagnostics out of the box without installing Black, shfmt, shellcheck, or anything else.

All items below have been shipped by delegating to VS Code extensions instead of system CLIs:

| Language | Formatter extension | Diagnostic extension |
|----------|--------------------|-----------------------|
| Python | `ms-python.black-formatter` (auto-installed) | `python -m py_compile` (requires Python runtime) |
| Shell / Bash / Zsh | `mkhl.shfmt` (auto-installed) | `timonwong.shellcheck` (auto-installed) |

All three extensions are auto-installed on activation if not already present, and the extension falls back gracefully to the system CLI tools if extensions are unavailable.

---

### Version 1.2 (Month 3)

- [ ] Additional language support (Go, Rust, Ruby)
- [ ] Workspace-level formatter configuration
- [ ] "Fix all" code action for auto-fixable diagnostics
- [ ] Telemetry (opt-in) for usage insights

### Version 1.2 (Month 3)

- [ ] Custom formatter plugins (user-defined formatters)
- [ ] Markdown preview integration (show formatted blocks in preview)
- [ ] Multi-root workspace support
- [ ] Localization (i18n)

### Version 2.0 (Month 6)

- [ ] LSP-based architecture for better language support
- [ ] Remote development support (SSH, Containers, WSL)
- [ ] Web extension support (vscode.dev)
- [ ] AI-assisted code block fixes (Copilot integration)

---

## Deployment Strategy

### Versioning

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR:** Breaking changes to settings or behavior
- **MINOR:** New features, new language support
- **PATCH:** Bug fixes, performance improvements

### Release Channels

| Channel | Purpose | Audience |
|---------|---------|----------|
| **Stable** | Production-ready releases | All users |
| **Pre-release** | Beta features for early feedback | Opt-in testers |

Use VS Code's pre-release flag in `package.json`:

```json
{
  "version": "1.1.0",
  "preview": true
}
```

### CI/CD Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Commit    │────▶│   Build &   │────▶│    Test     │────▶│   Publish   │
│   to main   │     │    Lint     │     │  (Jest)     │     │  (on tag)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

**GitHub Actions Workflow:**

1. **On Pull Request:**
   - Build TypeScript
   - Run ESLint
   - Run Jest tests
   - Check formatting with Prettier

2. **On Push to `main`:**
   - All PR checks
   - Build `.vsix` artifact
   - Upload as GitHub release artifact

3. **On Git Tag (`v*`):**
   - All main checks
   - Publish to VS Code Marketplace via `vsce`

### Marketplace Publishing

#### Prerequisites

1. **Create Publisher:**
   ```bash
   npx vsce create-publisher <publisher-name>
   ```

2. **Generate Personal Access Token (PAT):**
   - Go to [Azure DevOps](https://dev.azure.com/)
   - Create PAT with `Marketplace > Manage` scope

3. **Login:**
   ```bash
   npx vsce login <publisher-name>
   ```

#### Manual Publish

```bash
# Package extension
npm run package

# Publish to marketplace
npm run publish
```

#### Automated Publish (GitHub Actions)

```yaml
# .github/workflows/publish.yml
name: Publish Extension

on:
  push:
    tags:
      - "v*"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Publish to Marketplace
        run: npx vsce publish
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
```

---

## Quality Gates

### Before Each Release

- [ ] All tests passing
- [ ] No ESLint errors
- [ ] Code formatted with Prettier
- [ ] CHANGELOG updated
- [ ] README reflects current features
- [ ] Manual testing on Windows, macOS, Linux
- [ ] Extension size < 5MB (bundled)

### Metrics to Track

| Metric | Target | Tool |
|--------|--------|------|
| Test coverage | > 80% | Jest |
| Bundle size | < 2MB | esbuild |
| Activation time | < 100ms | VS Code profiler |
| Weekly active users | Growth | Marketplace stats |
| Issue response time | < 48 hours | GitHub |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| External formatter breaking changes | Medium | Pin versions, test against multiple versions |
| VS Code API deprecation | Medium | Monitor release notes, use stable APIs |
| Performance issues with large files | High | Implement caching, lazy parsing, debouncing |
| Cross-platform CLI differences | Medium | Abstract CLI execution, test on all platforms |
| Language service unavailability | Low | Graceful degradation, clear user messaging |

---

## Success Criteria

### MVP (v1.0)

- ✅ Format code blocks with Prettier, Black, shfmt
- ✅ Inline diagnostics for JS/TS code blocks
- ✅ Integration with Format Document command
- ✅ Clear error messages for missing tools
- ✅ Published on VS Code Marketplace

### Growth (v1.x)

- 1,000+ installs within first month
- < 5 critical bugs reported
- 4+ star rating on Marketplace
- Active community contributions

### Maturity (v2.0)

- 10,000+ installs
- Support for 10+ languages
- Featured in VS Code documentation or blog
- Used by major open-source projects

---

## Timeline Summary

```
Week 1-2   ████████░░░░░░░░░░░░░░░░░░░░░░  Foundation
Week 3-4   ░░░░░░░░████████░░░░░░░░░░░░░░  Formatting Engine
Week 5-6   ░░░░░░░░░░░░░░░░████████░░░░░░  Diagnostics Engine
Week 7     ░░░░░░░░░░░░░░░░░░░░░░░░████░░  UX Polish
Week 8     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░██  Testing & Hardening
Week 9     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█  Release
```

**Estimated Total:** 9 weeks to v1.0 release

---

## Resources

- [VS Code Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce CLI Documentation](https://github.com/microsoft/vscode-vsce)
- [VS Code Marketplace](https://marketplace.visualstudio.com/vscode)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
