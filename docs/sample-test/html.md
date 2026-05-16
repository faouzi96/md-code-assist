# HTML — Formatter Test

Press `Shift+Alt+F` to format all blocks with Prettier (bundled — no install required).

---

## Formatting — compact HTML (Prettier will indent and expand)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MD Code Assist</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script src="main.js"></script>
  </body>
</html>
```

## Formatting — component template

```html
<div class="card">
  <div class="card__header">
    <h2 class="card__title">{{title}}</h2>
    <span class="card__badge card__badge--{{status}}">{{status}}</span>
  </div>
  <div class="card__body">
    <p class="card__description">{{description}}</p>
    <ul class="card__tags">
      {{#each tags}}
      <li class="tag">{{this}}</li>
      {{/each}}
    </ul>
  </div>
  <div class="card__footer">
    <button class="btn btn--primary" type="button" data-action="confirm">
      Confirm</button
    ><button class="btn btn--secondary" type="button" data-action="cancel">
      Cancel
    </button>
  </div>
</div>
```

## Formatting — form

```html
<form class="login-form" method="post" action="/auth/login" novalidate>
  <div class="form-group">
    <label class="form-label" for="email">Email address</label
    ><input
      class="form-control"
      type="email"
      id="email"
      name="email"
      placeholder="you@example.com"
      required
      autocomplete="email"
    />
  </div>
  <div class="form-group">
    <label class="form-label" for="password">Password</label
    ><input
      class="form-control"
      type="password"
      id="password"
      name="password"
      minlength="8"
      required
      autocomplete="current-password"
    /><button
      class="btn-toggle-password"
      type="button"
      aria-label="Show password"
    >
      👁
    </button>
  </div>
  <div class="form-check">
    <input
      class="form-check-input"
      type="checkbox"
      id="remember"
      name="remember"
    /><label class="form-check-label" for="remember">Remember me</label>
  </div>
  <button class="btn btn--primary btn--full" type="submit">Sign in</button>
</form>
```

## Formatting — table

```html
<table class="data-table" role="grid" aria-label="Users">
  <thead>
    <tr>
      <th scope="col" aria-sort="ascending">Name</th>
      <th scope="col">Email</th>
      <th scope="col">Role</th>
      <th scope="col">Status</th>
      <th scope="col"><span class="sr-only">Actions</span></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Alice Johnson</td>
      <td>alice@example.com</td>
      <td><span class="badge badge--admin">Admin</span></td>
      <td><span class="status status--active">Active</span></td>
      <td>
        <a class="btn btn--sm" href="/users/1/edit">Edit</a
        ><button class="btn btn--sm btn--danger" type="button">Delete</button>
      </td>
    </tr>
    <tr>
      <td>Bob Smith</td>
      <td>bob@example.com</td>
      <td><span class="badge badge--viewer">Viewer</span></td>
      <td><span class="status status--inactive">Inactive</span></td>
      <td>
        <a class="btn btn--sm" href="/users/2/edit">Edit</a
        ><button class="btn btn--sm btn--danger" type="button">Delete</button>
      </td>
    </tr>
  </tbody>
</table>
```

## Formatting — SVG inline

```html
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <circle cx="12" cy="12" r="10" />
  <polyline points="12 6 12 12 16 14" />
</svg>
```
