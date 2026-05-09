# Basic Markdown fixture

Some prose before the first block.

```javascript
const x = 1;
const y = 2;
console.log(x + y);
```

A paragraph between blocks.

```python
def hello(name):
    print(  "Hello, "+name  )
```

```shell
echo   "hello world"
ls -la
```

```json
{ "name": "test", "version": "1.0.0", "scripts": { "build": "node build.js" } }
```

```yaml
name: test
version: '1.0.0'
scripts:
  build: node build.js
```

```typescript
interface User {
  name: string;
  age: number;
}
const greet = (u: User) => `Hello ${u.name}`;
```

Trailing prose after the last block.
