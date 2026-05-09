---
description: 'Add a new extension configuration option'
agent: 'agent'
tools: ['search/codebase', 'editFiles']
---

# Add New Configuration Option

Your goal is to add a new configuration option to md-code-assist.

## Required Information

Ask the user for:
1. **Config key** (e.g., `diagnostics.debounceMs`)
2. **Type** (boolean, string, number, array, object)
3. **Default value**
4. **Description** for the setting
5. **Scope** (window, resource, or machine)

## Tasks

### 1. Add to package.json
Update `contributes.configuration.properties`:
```json
"mdCodeAssist.<configKey>": {
  "type": "<type>",
  "default": <defaultValue>,
  "description": "<description>",
  "scope": "<scope>"
}
```

### 2. Update Settings Interface
In `src/config/settings.ts`, add to the interface:
```typescript
export interface MdCodeAssistSettings {
  // ... existing
  <configKey>: <TypeScriptType>;
}
```

### 3. Update Settings Loader
In `src/config/settings.ts`, update the loader:
```typescript
export function getSettings(): MdCodeAssistSettings {
  const config = vscode.workspace.getConfiguration('mdCodeAssist');
  return {
    // ... existing
    <configKey>: config.get('<configKey>', <defaultValue>),
  };
}
```

### 4. Add Configuration Change Listener (if needed)
If the setting requires runtime updates:
```typescript
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration('mdCodeAssist.<configKey>')) {
    // Handle the change
  }
});
```

### 5. Use the Setting
Show where/how to use the new setting in the codebase.

### 6. Document in README
Add to the Configuration section of README.md:
```markdown
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `mdCodeAssist.<configKey>` | `<type>` | `<default>` | <description> |
```

## Common Setting Patterns

| Pattern | Example | Use Case |
|---------|---------|----------|
| Feature toggle | `python.enabled: true` | Enable/disable features |
| Path override | `python.path: ""` | Custom tool location |
| Numeric tuning | `diagnostics.debounceMs: 500` | Performance tuning |
| Enum selection | `diagnostics.severity: "warning"` | Mode selection |

## Checklist

- [ ] Added to package.json configuration
- [ ] Interface updated in settings.ts
- [ ] Loader updated in settings.ts
- [ ] Change listener added (if runtime updates needed)
- [ ] Setting used in relevant code
- [ ] README documentation updated
- [ ] Tested in Extension Development Host
