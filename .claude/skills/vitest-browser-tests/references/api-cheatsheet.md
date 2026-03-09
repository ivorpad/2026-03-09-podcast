# Vitest Browser Mode API Cheatsheet

## Imports

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'
```

## Rendering

```tsx
const screen = render(<Component prop="value" />)
// screen has: getByRole, getByText, getByTestId, getByLabelText, getByPlaceholder, getByAltText, getByTitle
```

## Locators (from `page` or `render()` return)

| Method | Example |
|---|---|
| `getByRole(role, opts?)` | `getByRole('button', { name: /submit/i })` |
| `getByText(text)` | `getByText('Hello')` or `getByText(/hello/i)` |
| `getByTestId(id)` | `getByTestId('modal')` |
| `getByLabelText(label)` | `getByLabelText('Email')` |
| `getByPlaceholder(text)` | `getByPlaceholder('Search...')` |
| `getByAltText(text)` | `getByAltText('Logo')` |
| `getByTitle(text)` | `getByTitle('Close')` |

### Chaining & Filtering

```tsx
locator.nth(0)          // zero-based index
locator.first()         // sugar for nth(0)
locator.last()          // sugar for nth(-1)
locator.and(other)      // must match both
locator.or(other)       // match either
locator.filter({ has: page.getByText('X') })        // contains child
locator.filter({ hasNot: page.getByText('X') })     // doesn't contain child
locator.filter({ hasText: 'X' })                     // contains text
locator.filter({ hasNotText: 'X' })                  // doesn't contain text
```

### Element Access

```tsx
locator.query()     // Element | null (throws if multiple)
locator.element()   // Element (throws if 0 or multiple)
locator.elements()  // Element[] (never throws)
locator.all()       // Locator[]
locator.length      // number of matches
```

## User Interactions

All async, all accept `Element | Locator`:

```tsx
await userEvent.click(locator)
await userEvent.dblClick(locator)
await userEvent.tripleClick(locator)
await userEvent.fill(locator, 'text')       // clears first, no keyboard syntax
await userEvent.type(locator, 'text')       // appends, supports {Enter} etc
await userEvent.clear(locator)
await userEvent.keyboard('{Enter}')         // global keyboard
await userEvent.tab()                       // Tab key
await userEvent.tab({ shift: true })        // Shift+Tab
await userEvent.hover(locator)
await userEvent.unhover(locator)
await userEvent.selectOptions(locator, 'value')
await userEvent.upload(locator, file)
await userEvent.dragAndDrop(source, target)
await userEvent.copy()
await userEvent.cut()
await userEvent.paste()
```

Locator shorthand (same effect):

```tsx
await locator.click()
await locator.fill('text')
await locator.clear()
await locator.hover()
await locator.selectOptions('value')
```

## Assertions

Always use `expect.element()` for DOM assertions (auto-retries):

```tsx
await expect.element(locator).toBeVisible()
await expect.element(locator).toBeInTheDocument()
await expect.element(locator).toHaveTextContent('text')
await expect.element(locator).toHaveTextContent(/regex/)
await expect.element(locator).toHaveValue('val')
await expect.element(locator).toHaveAttribute('href', '/path')
await expect.element(locator).toHaveClass('active')
await expect.element(locator).toBeDisabled()
await expect.element(locator).toBeEnabled()
await expect.element(locator).toBeChecked()
await expect.element(locator).toBeRequired()
await expect.element(locator).toBeValid()
await expect.element(locator).toBeInvalid()
await expect.element(locator).toHaveFocus()
await expect.element(locator).toBeEmptyDOMElement()
await expect.element(locator).toHaveAccessibleName('name')
await expect.element(locator).toHaveRole('button')
await expect.element(locator).toContainElement(otherElement)
await expect.element(locator).toHaveStyle({ color: 'red' })
```

Negation:

```tsx
await expect.element(locator).not.toBeVisible()
```

Custom timeout:

```tsx
await expect.element(locator, { timeout: 5000 }).toBeVisible()
```

## Page Utilities

```tsx
page.viewport(1024, 768)    // resize viewport
page.screenshot()            // capture screenshot
```

## Mocking

```tsx
const handler = vi.fn()
render(<Button onClick={handler} />)
await page.getByRole('button').click()
expect(handler).toHaveBeenCalledOnce()
```
