---
description: 'Scaffold a new VS Code command with registration'
agent: 'agent'
tools: ['search/codebase', 'editFiles']
---

# Create New VS Code Command

Your goal is to scaffold a new VS Code command for md-code-assist.

## Required Information

Ask the user for:
1. **Command name** (e.g., "formatCurrentBlock")
2. **Command title** (shown in Command Palette, e.g., "Format Current Code Block")
3. **Description** of what the command does
4. **Keybinding** (optional, e.g., `Ctrl+Shift+F`)
5. **When clause** (optional, e.g., `editorLangId == markdown`)

## Tasks

### 1. Create Command Handler
Create `src/commands/<commandName>.ts`:
```typescript
import * as vscode from 'vscode';

export async function <commandName>(context: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  // Implementation here
}
```

### 2. Register in package.json
Add to `contributes.commands`:
```json
{
  "command": "mdCodeAssist.<commandName>",
  "title": "<Command Title>",
  "category": "MD Code Assist"
}
```

### 3. Add Keybinding (if provided)
Add to `contributes.keybindings`:
```json
{
  "command": "mdCodeAssist.<commandName>",
  "key": "<keybinding>",
  "when": "<whenClause>"
}
```

### 4. Register in Extension Entry Point
Update `src/extension.ts`:
```typescript
import { <commandName> } from './commands/<commandName>';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'mdCodeAssist.<commandName>',
      () => <commandName>(context)
    )
  );
}
```

### 5. Add Menu Contribution (optional)
For editor context menu, add to `contributes.menus`:
```json
"editor/context": [
  {
    "command": "mdCodeAssist.<commandName>",
    "when": "editorLangId == markdown",
    "group": "mdCodeAssist"
  }
]
```

### 6. Create Test
Create `test/commands/<commandName>.test.ts`.

## Checklist

- [ ] Command handler created
- [ ] Registered in package.json commands
- [ ] Keybinding added (if applicable)
- [ ] Registered in extension.ts
- [ ] Menu contribution added (if applicable)
- [ ] Test file created
- [ ] Manually tested in Extension Development Host
