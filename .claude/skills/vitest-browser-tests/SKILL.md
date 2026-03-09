---
name: vitest-browser-tests
description: >
  Write comprehensive Vitest browser mode tests for React components that find real bugs.
  Use when asked to write tests, add test coverage, create a test suite, test edge cases,
  or write failing tests for a component. Triggers on "write tests", "test this component",
  "add tests", "browser tests", "edge case tests", "vitest test", "red-green tests".
---

# Vitest Browser Tests

Write bug-finding test suites for React components using Vitest browser mode + Playwright.

## API Reference

Read [references/api-cheatsheet.md](references/api-cheatsheet.md) before writing tests.

## Test File Convention

Place test files next to the component: `ComponentName.test.tsx`.

## Imports Template

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'
```

## Test Writing Process

1. Read the component code thoroughly
2. List every interactive element, state transition, prop combination, and conditional branch
3. Write tests in this order:
   - **Rendering**: does it render at all? With required props? With optional props?
   - **Empty/zero states**: no data, empty arrays, null/undefined optional props
   - **Boundary values**: max length strings, 0 vs 1 vs many items, negative numbers
   - **User interactions**: click, type, submit, tab, hover — verify state changes
   - **Async flows**: loading states, error states, success transitions
   - **Edge cases**: rapid clicks, empty form submissions, special characters in inputs
   - **Accessibility**: focus order, ARIA attributes, keyboard navigation

## Test Style Rules

- One assertion concept per test (multiple `expect` calls are fine if testing one behavior)
- Use `await expect.element()` for all DOM assertions — it auto-retries
- Use `getByRole` over `getByTestId` — test what users see
- Use `vi.fn()` for callback props, assert call args
- Name tests as behavior descriptions: "shows error when email is empty", not "test error"
- Group related tests in `describe` blocks by feature area
- Intentionally test things likely to break: off-by-one, missing null checks, unhandled empty strings

## Pattern: Testing a Form

```tsx
describe('ContactForm', () => {
  it('renders all fields', async () => {
    const screen = render(<ContactForm onSubmit={vi.fn()} />)
    await expect.element(screen.getByRole('textbox', { name: /name/i })).toBeVisible()
    await expect.element(screen.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect.element(screen.getByRole('button', { name: /submit/i })).toBeVisible()
  })

  it('submits with valid data', async () => {
    const onSubmit = vi.fn()
    const screen = render(<ContactForm onSubmit={onSubmit} />)
    await screen.getByRole('textbox', { name: /name/i }).fill('Alice')
    await screen.getByRole('textbox', { name: /email/i }).fill('a@b.com')
    await screen.getByRole('button', { name: /submit/i }).click()
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice', email: 'a@b.com' })
  })

  it('disables submit when required fields are empty', async () => {
    const screen = render(<ContactForm onSubmit={vi.fn()} />)
    await expect.element(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })

  it('shows validation error for invalid email', async () => {
    const screen = render(<ContactForm onSubmit={vi.fn()} />)
    await screen.getByRole('textbox', { name: /email/i }).fill('not-an-email')
    await screen.getByRole('textbox', { name: /email/i }).blur?.() // if supported
    await expect.element(screen.getByText(/invalid email/i)).toBeVisible()
  })
})
```

## Pattern: Testing a List with Empty State

```tsx
describe('ItemList', () => {
  it('shows empty state when items is empty array', async () => {
    const screen = render(<ItemList items={[]} />)
    await expect.element(screen.getByText(/no items/i)).toBeVisible()
  })

  it('renders correct count of items', async () => {
    const items = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }]
    const screen = render(<ItemList items={items} />)
    expect(screen.getByRole('listitem').elements()).toHaveLength(2)
  })

  it('handles item with empty name', async () => {
    const screen = render(<ItemList items={[{ id: '1', name: '' }]} />)
    await expect.element(screen.getByRole('listitem').first()).toBeVisible()
  })
})
```

## Edge Cases to Always Check

- Empty string `""` vs `undefined` vs `null` for optional text props
- Array with 0, 1, and many items
- Very long strings (200+ chars) — do they overflow or truncate?
- Clicking a button twice rapidly — does it fire twice?
- Submitting a form with only whitespace in required fields
- Special chars in inputs: `<script>`, `"quotes"`, emoji, unicode
- Numeric inputs: 0, negative, NaN, Infinity, very large numbers
- Conditional rendering: toggling show/hide, does cleanup happen?
- Callback props called with correct arguments and correct number of times
