# JavaScript & JSX — Formatter Test

Open this file with Markdown Code Assistant installed, then press `Shift+Alt+F` to format all blocks,
or place your cursor inside a block and run **Markdown Code Assistant: Format Current Code Block**.

---

## Formatting — messy JS (Prettier will fix this)

```js
const greet = (name) => {
  return "Hello, " + name + "!";
};

const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map((n) => n * 2);

if (doubled.length > 0) {
  console.log(doubled);
}
```

## Formatting — arrow functions and objects

```javascript
const config = { host: "localhost", port: 3000, debug: true, timeout: 5000 };

async function fetchData(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  return data;
}

fetchData("https://api.example.com/users", {
  method: "GET",
  headers: { "Content-Type": "application/json" },
})
  .then((data) => console.log(data))
  .catch((err) => console.error(err));
```

## Diagnostics — intentional errors (should show squiggles)

```js
// ReferenceError: undeclaredVariable is not defined
console.log(undeclaredVariable);

// SyntaxError-like: calling a non-function
const x = 42;
x();
```

## JSX formatting

```jsx
const Button = ({ label, onClick }) => (
  <button onClick={onClick} className="btn">
    {label}
  </button>
);

const App = () => (
  <div className="app">
    <Button label="Click me" onClick={() => console.log("clicked")} />
    <Button label="Reset" onClick={() => console.log("reset")} />
  </div>
);
```

## Classes and modern syntax

```js
class EventEmitter {
  #listeners = new Map();
  on(event, fn) {
    const list = this.#listeners.get(event) ?? [];
    list.push(fn);
    this.#listeners.set(event, list);
  }
  emit(event, ...args) {
    for (const fn of this.#listeners.get(event) ?? []) {
      fn(...args);
    }
  }
}
```
