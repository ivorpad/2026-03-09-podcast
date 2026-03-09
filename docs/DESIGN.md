# Design System — Harness CRM

## Aesthetic Direction: Industrial Precision

Harness CRM takes visual cues from **engineering instrumentation panels** — precise, information-dense, confident. Think: a well-organized cockpit where every element has purpose. Not soft SaaS pastels. Not generic dashboards. This is a tool that looks like it was built by someone who cares about data density and legibility.

**Tone:** Utilitarian refinement. Dense but never cluttered. Every pixel justified.

**What makes it memorable:** The tension between raw data density and meticulous typographic hierarchy. It should feel like a Bloomberg terminal designed by someone who also reads Monocle magazine.

## Typography

### Font Stack

- **Display/Headings:** `Geist Sans` at heavier weights (600-700). Tight tracking (`tracking-tight`). Large contrast between heading sizes.
- **Body/Data:** `Geist Sans` at regular weight (400). Default tracking.
- **Monospace/Values:** `Geist Mono` for currency values, counts, IDs, timestamps. This is the signature detail — numerical data always in mono.

### Type Scale

| Element | Size | Weight | Font | Tracking |
|---|---|---|---|---|
| Page title | `text-xl` | `font-semibold` | Sans | `tracking-tight` |
| Section title | `text-sm` | `font-medium` | Sans | `tracking-tight` |
| Table header | `text-xs` | `font-medium` | Sans | `uppercase tracking-wider` |
| Table cell | `text-sm` | `font-normal` | Sans | default |
| Currency/numbers | `text-sm` | `font-medium` | Mono | default |
| Label/caption | `text-xs` | `font-medium` | Sans | default |
| Muted/secondary | `text-xs` | `font-normal` | Sans | default |

### Rules
- Page titles are `text-xl`, not `text-2xl` — keep it controlled
- Never use `text-3xl` or larger anywhere
- Uppercase is reserved for table headers and stage labels only
- Currency always uses `font-mono` — `$12,500` not `$12,500`

## Color System

Uses shadcn/ui CSS variables. No raw color values (`bg-blue-500`) anywhere.

### Semantic Palette

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | Pure white | Near-black | Page background |
| `--foreground` | Near-black | Off-white | Primary text |
| `--muted` | Warm gray-50 | Gray-900 | Card backgrounds, subtle fills |
| `--muted-foreground` | Gray-500 | Gray-400 | Secondary text, labels |
| `--primary` | Near-black | Off-white | Active nav, primary buttons |
| `--accent` | Gray-100 | Gray-800 | Hover states, highlights |
| `--destructive` | Red-600 | Red-400 | Delete actions, closed-lost |
| `--border` | Gray-200 | White/10% | All borders, dividers |

### Stage Colors (via Badge variants, NOT raw colors)

| Stage | Badge Variant | Rationale |
|---|---|---|
| lead | `outline` | Low commitment, open |
| qualified | `secondary` | Progressing |
| proposal | `secondary` | Active work |
| negotiation | `default` | High engagement |
| closed-won | `default` | Success (primary emphasis) |
| closed-lost | `destructive` | Loss |

### AI Feature Accent

AI features are distinguished by a subtle visual cue, NOT a garish gradient:
- AI cards use the same `Card` component but with a `border-l-2 border-primary` left accent
- AI action buttons use `variant="outline"` with `SparklesIcon` or `WandIcon`
- No purple gradients. No glowing effects. No "AI magic" visual clichés.

## Layout System

### App Shell

```
┌─────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────────────────┐ │
│ │ Sidebar  │ │ Content Area                       │ │
│ │ w-56     │ │ max-w-6xl mx-auto                  │ │
│ │          │ │ p-6                                 │ │
│ │ Logo     │ │ ┌────────────────────────────────┐  │ │
│ │ ───────  │ │ │ Page Header                    │  │ │
│ │ Nav      │ │ │ title + actions                │  │ │
│ │          │ │ ├────────────────────────────────┤  │ │
│ │          │ │ │ Content                        │  │ │
│ │          │ │ │ (table / cards / detail)       │  │ │
│ │          │ │ └────────────────────────────────┘  │ │
│ └──────────┘ └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

- Sidebar: `w-56`, fixed, `border-r`, `bg-muted/30`
- Content: `flex-1 overflow-y-auto p-6`
- Content max-width: `max-w-6xl` for tables/lists, `max-w-5xl` for forms/detail
- All spacing uses `gap-*` (flex) or `grid gap-*`. Never `space-y-*`.

### Page Header Pattern

Every page has this structure:

```tsx
<div className="flex items-center justify-between">
  <div>
    <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
    <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
  </div>
  <Button>
    <PlusIcon data-icon="inline-start" />
    Add {Entity}
  </Button>
</div>
```

## Component Patterns

### Dashboard Stats

Four stat cards in a row. Each card is compact:

```tsx
<Card>
  <CardHeader className="pb-2">
    <CardDescription className="text-xs">{label}</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold font-mono">{value}</div>
  </CardContent>
</Card>
```

- Stat values use `font-mono` for numbers
- Pipeline value formatted as `$12.5k` (compact)
- No icons inside stat cards — the number IS the content

### Entity List Tables

Tables are the primary list view. Dense but readable.

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
      ...
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="group">
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell className="font-mono text-muted-foreground">{value}</TableCell>
      <TableCell>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* action buttons */}
        </div>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

Key details:
- Table headers: `text-xs uppercase tracking-wider text-muted-foreground`
- Row actions hidden by default, shown on hover via `group` / `group-hover:opacity-100`
- Currency values always `font-mono`
- Use `truncate` on name/title cells to prevent wrapping
- Empty state: centered `text-muted-foreground` message, NOT a custom component

### Pipeline Kanban (Deals Only)

Six columns, one per stage. Cards are compact:

```tsx
<div className="grid grid-cols-6 gap-3">
  {stages.map(stage => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {stage}
        </h3>
        <Badge variant="secondary" className="font-mono text-xs">{count}</Badge>
      </div>
      {/* deal cards */}
    </div>
  ))}
</div>
```

### Detail Views (Dialog)

Entity details shown in a `Dialog` (`max-w-2xl`). Layout:

```
┌──────────────────────────────────────┐
│ DialogTitle: Entity Name             │
│ DialogDescription: subtitle          │
├──────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────┐  │
│ │ Email: ...  │ │ Phone: ...      │  │
│ │ Company: .. │ │ Stage: [badge]  │  │
│ └─────────────┘ └─────────────────┘  │
│                                      │
│ ── separator ──                      │
│                                      │
│ Related Deals (if any)               │
│ - Deal 1  stage · $value            │
│ - Deal 2  stage · $value            │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ▌ AI Summary Card                │ │
│ │ │ [Generate Summary]  [outline]  │ │
│ │ ├────────────────────────────────│ │
│ │ │ Summary text...                │ │
│ │ │ [badge] [badge] [badge]        │ │
│ │ │ Sentiment: [badge]             │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ ▌ AI Enrichment Card             │ │
│ │ │ ...                            │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

- Detail fields in a `grid grid-cols-2 gap-4 text-sm`
- AI cards distinguished with `border-l-2 border-primary`
- Related entities listed inline, not in a sub-table

### Form Pattern

All forms use `FieldGroup` + `Field` from shadcn. Forms live inside `DialogContent`.

```tsx
<form onSubmit={handleSubmit}>
  <FieldGroup>
    <div className="grid grid-cols-2 gap-4">
      <Field data-invalid={!!errors.field || undefined}>
        <FieldLabel htmlFor="field-id">Label</FieldLabel>
        <Input id="field-id" aria-invalid={!!errors.field || undefined} />
        {errors.field && <FieldError>{errors.field}</FieldError>}
      </Field>
    </div>
    {/* more fields */}
    <div className="flex gap-2 justify-end">
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      <Button type="submit" disabled={isPending}>
        {isPending && <Spinner data-icon="inline-start" />}
        {isEditing ? "Update" : "Create"} {Entity}
      </Button>
    </div>
  </FieldGroup>
</form>
```

Rules:
- Name fields (first/last) always side-by-side in `grid grid-cols-2`
- Company select uses `NativeSelect` (simple, no JS overhead)
- Validation via Zod `safeParse` on submit, errors in `FieldError`
- Submit button shows `Spinner` when pending, not text change

### AI Feature Cards

AI cards are visually distinct but not garish:

```tsx
<Card className="border-l-2 border-primary">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="text-sm font-medium">AI Summary</CardTitle>
      <Button size="sm" variant="outline" disabled={isPending}>
        {isPending ? <Spinner data-icon="inline-start" /> : <SparklesIcon data-icon="inline-start" />}
        {isPending ? "Generating..." : "Generate"}
      </Button>
    </div>
  </CardHeader>
  <Separator />
  <CardContent className="pt-4">
    {/* content or empty state */}
  </CardContent>
</Card>
```

- Left border accent (`border-l-2 border-primary`) signals "AI-powered"
- Title is `text-sm font-medium`, NOT `text-base` — keep it compact
- Empty state: single line of `text-muted-foreground` text explaining what the button does
- AI insights shown as `Badge variant="secondary"` pills
- Sentiment/confidence shown as a single `Badge` with appropriate variant

### Empty States

Keep empty states minimal. No illustrations. No large icons. Just text.

```tsx
<TableRow>
  <TableCell colSpan={N} className="text-center text-muted-foreground py-8">
    No {entities} yet. Add one to get started.
  </TableCell>
</TableRow>
```

For cards/dashboard:
```tsx
<p className="text-sm text-muted-foreground">
  No data yet. {action hint}.
</p>
```

### Loading States

- List views: stack of `Skeleton` bars (`h-12 w-full`)
- Detail dialogs: `Skeleton` blocks matching content shape
- AI generation: `Spinner` inside button + disabled state
- Never show a full-page loader

## Icons

All from `lucide-react`. Used sparingly.

| Context | Icon | Usage |
|---|---|---|
| Nav: Dashboard | `LayoutDashboardIcon` | Sidebar |
| Nav: Contacts | `UsersIcon` | Sidebar |
| Nav: Companies | `BuildingIcon` | Sidebar |
| Nav: Deals | `HandshakeIcon` | Sidebar |
| Action: Create | `PlusIcon` | Primary CTA button |
| Action: Edit | `PencilIcon` | Row action |
| Action: Delete | `TrashIcon` | Row action |
| Action: View | `EyeIcon` | Row action |
| AI: Summary | `SparklesIcon` | Generate button |
| AI: Enrichment | `WandIcon` | Enrich button |
| AI: Accept | `CheckIcon` | Apply suggestions |
| AI: Dismiss | `XIcon` | Dismiss suggestions |
| View: Table | `TableIcon` | Tab trigger |
| View: Kanban | `KanbanIcon` | Tab trigger |

Rules:
- Icons in buttons use `data-icon="inline-start"`. Never apply sizing classes.
- Row action icons: no `data-icon` attribute, just the icon as button children
- No decorative icons. Every icon is functional.

## Components to Add

Components currently installed: badge, button, card, dialog, field, input, label, native-select, select, separator, skeleton, sonner, spinner, table, tabs, textarea.

### Needed for redesign:

| Component | Why |
|---|---|
| `avatar` | Contact initials in list/detail views |
| `tooltip` | Row action button labels on hover |
| `scroll-area` | Dialog content overflow, sidebar nav |
| `dropdown-menu` | Row action overflow menu (3+ actions) |
| `alert` | Destructive action warnings |
| `empty` | Structured empty states |
| `progress` | Pipeline stage progress indicator on dashboard |
| `chart` | Dashboard pipeline value chart |

Install with: `pnpm dlx shadcn@latest add avatar tooltip scroll-area dropdown-menu alert empty progress chart`

## Anti-Patterns (Do NOT)

- No raw color values (`bg-blue-500`, `text-emerald-600`). Use semantic tokens only.
- No `space-y-*` or `space-x-*`. Use `flex gap-*`.
- No `w-4 h-4` on icons. Use `size-4` or let the component handle it.
- No custom `animate-pulse` divs. Use `Skeleton`.
- No `<hr>` or `<div className="border-t">`. Use `Separator`.
- No purple gradients, glowing effects, or "AI magic" visual clichés.
- No `text-2xl` or larger for page titles. Keep it `text-xl`.
- No full-page loading spinners.
