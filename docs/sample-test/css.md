# CSS / SCSS / Less — Formatter Test

Press `Shift+Alt+F` to format all blocks with Prettier (bundled — no install required).

---

## Formatting — plain CSS (Prettier will normalize spacing and order)

```css
.card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease;
}
.card:hover {
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.06);
}
.card__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 0.5rem;
}
.card__body {
  flex: 1;
  color: #4a5568;
  font-size: 0.9rem;
  line-height: 1.6;
}
.card__footer {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}
```

## Formatting — CSS custom properties and media queries

```css
:root {
  --color-primary: #3b82f6;
  --color-primary-dark: #1d4ed8;
  --color-text: #1e293b;
  --color-bg: #f8fafc;
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --font-sans: 'Inter', system-ui, sans-serif;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #f1f5f9;
    --color-bg: #0f172a;
  }
}

@media (max-width: 768px) {
  .container {
    padding: var(--spacing-md);
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
```

## Formatting — SCSS with nesting and mixins

```scss
$breakpoints: (
  sm: 640px,
  md: 768px,
  lg: 1024px,
  xl: 1280px,
);

@mixin respond-to($breakpoint) {
  @if map-has-key($breakpoints, $breakpoint) {
    @media (min-width: map-get($breakpoints,$breakpoint)) {
      @content;
    }
  } @else {
    @warn "Unknown breakpoint: #{$breakpoint}";
  }
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  &--primary {
    background: var(--color-primary);
    color: #fff;
    &:hover {
      background: var(--color-primary-dark);
    }
  }
  &--secondary {
    background: transparent;
    border: 1px solid var(--color-primary);
    color: var(--color-primary);
    &:hover {
      background: var(--color-primary);
      color: #fff;
    }
  }
  &--sm {
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
  }
  &--lg {
    padding: 0.75rem 1.5rem;
    font-size: 1.125rem;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
  @include respond-to(md) {
    min-width: 120px;
  }
}
```

## Formatting — SCSS variables and functions

```scss
@use 'sass:math';
@use 'sass:color';

$base-font-size: 16px;

@function rem($px) {
  @return math.div($px, $base-font-size) * 1rem;
}

@function shade($color, $amount) {
  @return color.mix(black, $color, $amount);
}
@function tint($color, $amount) {
  @return color.mix(white, $color, $amount);
}

$palette: (
  primary: (
    base: #3b82f6,
    dark: shade(#3b82f6, 20%),
    light: tint(#3b82f6, 20%),
  ),
  danger: (
    base: #ef4444,
    dark: shade(#ef4444, 20%),
    light: tint(#ef4444, 20%),
  ),
);
```

## Formatting — Less variables and mixins

```less
@primary: #3b82f6;
@font-size-base: 16px;
@border-radius: 8px;

.flex-center() {
  display: flex;
  align-items: center;
  justify-content: center;
}
.transition(@prop:all,@duration:0.2s,@easing:ease) {
  transition: @prop @duration @easing;
}

.modal {
  .flex-center();
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  &__content {
    background: #fff;
    border-radius: @border-radius;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    .transition(transform);
  }
  &__title {
    font-size: 1.25rem;
    font-weight: 600;
    color: darken(@primary, 30%);
    margin: 0 0 1rem;
  }
}
```
