---
description: 'Generate Jest test for a module'
agent: 'agent'
tools: ['search/codebase', 'editFiles']
---

# Create Jest Test

Your goal is to generate a comprehensive Jest test file for a module in md-code-assist.

## Required Information

Ask the user for:
1. **Module path** (e.g., `src/formatters/adapters/pythonFormatter.ts`)
2. **Test focus** (unit, integration, or both)

## Tasks

1. Analyze the target module to understand:
   - Exported functions/classes
   - Dependencies that need mocking
   - Edge cases to cover

2. Create test file at `test/<mirrored-path>/<module>.test.ts`

3. Structure the test file:
   ```typescript
   import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
   
   // Mock VS Code API
   jest.mock('vscode', () => ({
     // ... mocks
   }), { virtual: true });
   
   describe('<ModuleName>', () => {
     describe('<functionName>', () => {
       it('should <expected behavior>', () => {
         // Arrange
         // Act
         // Assert
       });
     });
   });
   ```

## Test Categories to Include

- **Happy path** — Normal expected usage
- **Edge cases** — Empty input, malformed data, boundary conditions
- **Error handling** — Missing dependencies, CLI failures, timeouts
- **VS Code integration** — Mock workspace, configuration, documents

## Mocking Patterns

For VS Code APIs:
```typescript
const mockWorkspace = {
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue(defaultValue),
  }),
};
```

For CLI tools:
```typescript
jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));
```

## Checklist

- [ ] All public functions/methods have tests
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Mocks are properly typed
- [ ] Tests are isolated (no shared state)
- [ ] Descriptive test names
