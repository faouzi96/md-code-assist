# JSON & JSONC — Formatter Test

Press `Shift+Alt+F` to format all blocks with Prettier (bundled — no install required).

---

## Formatting — compact JSON (Prettier will pretty-print)

```json
{
  "name": "md-code-assist",
  "version": "0.1.0",
  "description": "Language-aware formatting for Markdown code blocks",
  "keywords": ["markdown", "formatter", "vscode"],
  "author": "md-code-assist",
  "license": "MIT"
}
```

## Formatting — nested objects

```json
{
  "server": {
    "host": "localhost",
    "port": 8080,
    "tls": {
      "enabled": true,
      "cert": "/etc/ssl/cert.pem",
      "key": "/etc/ssl/key.pem"
    }
  },
  "database": {
    "url": "postgresql://user:pass@localhost:5432/mydb",
    "pool": { "min": 2, "max": 10, "idleTimeout": 30000 }
  },
  "logging": { "level": "info", "format": "json", "output": ["stdout", "file"] }
}
```

## Formatting — arrays

```json
[
  { "id": 1, "name": "Alice", "role": "admin", "active": true },
  { "id": 2, "name": "Bob", "role": "viewer", "active": true },
  { "id": 3, "name": "Charlie", "role": "editor", "active": false }
]
```

## Formatting — package.json style

```json
{
  "scripts": {
    "build": "node esbuild.config.js",
    "watch": "node esbuild.config.js --watch",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "dependencies": { "prettier": "^3.2.5", "unified": "^11.0.5" },
  "devDependencies": {
    "typescript": "^5.5.3",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.5",
    "esbuild": "^0.21.5"
  }
}
```

## JSONC — comments allowed (VS Code settings style)

```jsonc
{
  // Editor settings
  "editor.formatOnSave": true,
  "editor.tabSize": 2,
  "editor.rulers": [100, 120],

  // Extension settings
  "mdCodeAssist.formatOnSave": true,
  "mdCodeAssist.format.enabledLanguages": [
    "javascript",
    "typescript",
    "python",
    "json" /* and jsonc */,
    "yaml",
    "shell"
  ],

  // Diagnostics
  "mdCodeAssist.diagnostics.enabledLanguages": ["javascript", "typescript"],
  "mdCodeAssist.diagnostics.severityLevel": "warning" // "error" | "warning" | "info" | "hint"
}
```

## Formatting — deeply nested

```json
{
  "level1": {
    "level2": {
      "level3": {
        "level4": { "value": "deep", "array": [1, 2, 3], "flag": true }
      }
    }
  }
}
```
