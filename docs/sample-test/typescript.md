# TypeScript & TSX — Formatter + Diagnostics Test

Press `Shift+Alt+F` to format all blocks. Diagnostics refresh automatically after you stop typing.
Check the **Problems** panel (`Ctrl+Shift+M`) and the **MD Code Assist** Output channel.

---

## Formatting — interfaces and generics (Prettier will fix spacing)

```ts
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'viewer' | 'editor';
}

function getUser<T extends User>(id: number, users: T[]): T | undefined {
  return users.find((u) => u.id === id);
}

const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'viewer' },
];
```

## Formatting — async/await and error handling

```typescript
async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data: unknown = await response.json();
  if (typeof data !== 'object' || data === null || !('id' in data)) {
    throw new Error('Invalid response');
  }
  return data as User;
}
```

## Formatting — decorators and classes

```ts
class UserService {
  private readonly cache = new Map<number, User>();

  async get(id: number): Promise<User> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    const user = await fetchUser(id);
    this.cache.set(id, user);
    return user;
  }

  invalidate(id: number): void {
    this.cache.delete(id);
  }
}
```

## Diagnostics — type errors (should show squiggles in Problems panel)

```ts
// Type 'string' is not assignable to type 'number'
const count: number = 'not a number';

// Property 'missing' does not exist on type '{ name: string }'
const obj = { name: 'Alice' };
console.log(obj.missing);

// Argument of type 'string' is not assignable to parameter of type 'number'
function double(n: number): number {
  return n * 2;
}
double('hello');
```

## Diagnostics — unused variables (warning)

```ts
const unusedConst = 'I am never used';

function unusedParam(x: number, y: number): number {
  return x + 1;
}
```

## TSX formatting

```tsx
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
  onClick: () => void;
}

const Button: React.FC<ButtonProps> = ({ label, variant = 'primary', onClick }) => (
  <button className={`btn btn--${variant}`} onClick={onClick} type="button">
    {label}
  </button>
);

export default Button;
```

## Enums and mapped types

```ts
enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}

type Readonly<T> = { readonly [K in keyof T]: T[K] };
type Partial<T> = { [K in keyof T]?: T[K] };

const config: Readonly<{ host: string; port: number }> = { host: 'localhost', port: 8080 };
```
