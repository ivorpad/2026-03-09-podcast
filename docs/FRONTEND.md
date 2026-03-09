# Frontend Architecture — Harness CRM

## Stack

- **Framework:** Next.js 16 (App Router), React 19
- **State:** tRPC React Query hooks (no global state)
- **Styling:** Tailwind CSS v4, shadcn/ui (base-nova), CSS variables
- **Icons:** Lucide React (via shadcn `iconLibrary: "lucide"`)
- **Fonts:** Geist Sans + Geist Mono (via `next/font/google`)
- **Toasts:** sonner
- **Animations:** tw-animate-css (Tailwind plugin)

## Project Config (shadcn)

```json
{
  "style": "base-nova",
  "base": "base",
  "rsc": true,
  "iconLibrary": "lucide",
  "tailwindVersion": "v4",
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

**Important:** This project uses Base UI primitives (`base`), not Radix. Use `render` prop for custom triggers, not `asChild`.

## Component Directory

```
src/components/
├── ui/                 # shadcn/ui primitives — never modify internals
│   ├── badge.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── field.tsx       # FieldGroup, Field, FieldLabel, FieldError
│   ├── input.tsx
│   ├── label.tsx
│   ├── native-select.tsx
│   ├── select.tsx
│   ├── separator.tsx
│   ├── skeleton.tsx
│   ├── sonner.tsx
│   ├── spinner.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   └── textarea.tsx
├── layout/
│   └── sidebar.tsx     # App navigation sidebar
├── contacts/
│   ├── contact-form.tsx       # Create/edit form (used in Dialog)
│   ├── contact-summary.tsx    # AI summary Card
│   └── contact-enrichment.tsx # AI enrichment Card
├── companies/
│   └── company-form.tsx       # Create/edit form (used in Dialog)
├── deals/
│   ├── deal-form.tsx          # Create/edit form (used in Dialog)
│   └── deal-next-action.tsx   # AI next-action Card
└── providers.tsx              # tRPC + QueryClient + ThemeProvider
```

### Naming Convention

- Entity components: `{entity}-{feature}.tsx` (e.g. `contact-form.tsx`, `deal-next-action.tsx`)
- One component per file, exported as named export
- UI primitives never modified directly — override via className or wrapper

## Client Data Layer

All pages are `"use client"`. Data fetched via tRPC React Query hooks.

### Query Pattern

```tsx
const contacts = trpc.contacts.list.useQuery();         // list
const contact = trpc.contacts.getById.useQuery(id, {    // detail
  enabled: id !== null,
});
```

### Mutation Pattern

```tsx
const utils = trpc.useUtils();

const createMutation = trpc.contacts.create.useMutation({
  onSuccess: () => {
    toast.success("Contact created");
    setDialogOpen(false);
    utils.contacts.list.invalidate();
  },
  onError: (err) => toast.error(err.message),
});
```

Rules:
- Always invalidate the list query after create/update/delete
- Toast success/error in mutation callbacks
- Close dialog on success
- Detail queries use `enabled: id !== null` to prevent fetching with null IDs
- No optimistic updates — wait for server confirmation

## Provider Stack

```tsx
// providers.tsx
QueryClientProvider → trpc.Provider → ThemeProvider → children
```

- `httpBatchLink` with `superjson` transformer
- API endpoint: `/api/trpc`
- QueryClient created once with `useState` (React 19 pattern)

## Routing

| Route | Component | Description |
|---|---|---|
| `/` | `app/page.tsx` | Dashboard: stats + recent deals |
| `/contacts` | `app/contacts/page.tsx` | Contacts table + create/edit/view dialogs |
| `/companies` | `app/companies/page.tsx` | Companies table + create/edit dialogs |
| `/deals` | `app/deals/page.tsx` | Deals table + pipeline kanban + create/edit/view dialogs |
| `/api/trpc/[trpc]` | `app/api/trpc/[trpc]/route.ts` | tRPC HTTP handler |

## Page Structure Template

Every entity page follows this structure:

```tsx
export default function EntityPage() {
  // 1. State: dialog open, editing entity, viewing ID
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Entity | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);

  // 2. Queries
  const utils = trpc.useUtils();
  const entities = trpc.entity.list.useQuery();
  const entityDetail = trpc.entity.getById.useQuery(viewingId!, {
    enabled: viewingId !== null,
  });

  // 3. Mutations (create, update, delete)

  // 4. Render: header + table + create dialog + detail dialog
  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Page header with title + Add button */}
      {/* Loading skeleton or Table */}
      {/* Create/Edit Dialog with EntityForm */}
      {/* View Detail Dialog */}
    </div>
  );
}
```

## Form Architecture

Forms use controlled state + Zod validation on submit.

```tsx
interface EntityFormProps {
  initialData?: EntityCreate & { id?: number };
  onSubmit: (data: EntityCreate) => void;
  onCancel: () => void;
  isPending?: boolean;
}
```

- Local `useState` for form data — no form library
- Validate with `schema.safeParse(form)` on submit
- Errors stored in `Record<string, string>`, rendered via `FieldError`
- `isPending` prop disables submit button and shows `Spinner`

### Form Layout Rules (shadcn)

```tsx
// CORRECT: FieldGroup + Field
<FieldGroup>
  <Field data-invalid={!!errors.name || undefined}>
    <FieldLabel htmlFor="name">Name</FieldLabel>
    <Input id="name" aria-invalid={!!errors.name || undefined} />
    {errors.name && <FieldError>{errors.name}</FieldError>}
  </Field>
</FieldGroup>

// WRONG: div + Label
<div className="space-y-4">
  <Label>Name</Label>
  <Input />
</div>
```

## AI Feature Components

Three AI features, each a standalone Card component:

| Component | tRPC Mutation | Stores Result | Human-in-the-loop |
|---|---|---|---|
| `ContactSummaryCard` | `ai.generateContactSummary` | Yes (`aiSummary`) | No (explicit request) |
| `ContactEnrichmentCard` | `ai.enrichContact` | Only on "Apply" | Yes (review + confirm) |
| `DealNextActionCard` | `ai.suggestDealNextAction` | Yes (`aiNextAction`) | No (explicit request) |

### AI Card Visual Pattern

All AI cards share this structure:
- `Card` with `border-l-2 border-primary` left accent
- `CardHeader`: title + action button (outline variant)
- `Separator`
- `CardContent`: result or empty state text
- Action button: icon + text, shows `Spinner` when pending

### Enrichment Flow (Human-in-the-loop)

1. User clicks "Enrich Contact"
2. AI returns suggestions (displayed but NOT saved)
3. User reviews suggestions + confidence badge
4. User clicks "Apply Suggestions" (saves to DB) or "Dismiss" (discards)

## CSS / Theme

Global styles in `src/app/globals.css`:
- Tailwind v4 `@theme inline` block maps CSS variables
- Light/dark themes via `:root` and `.dark` selectors
- Uses `oklch` color space for all values
- Border radius: `--radius: 0.625rem`
- Custom variant: `@custom-variant dark (&:is(.dark *))`

### Tailwind Rules

| Do | Don't |
|---|---|
| `flex flex-col gap-4` | `space-y-4` |
| `size-10` | `w-10 h-10` |
| `truncate` | `overflow-hidden text-ellipsis whitespace-nowrap` |
| `cn("base", conditional && "extra")` | Template literal ternaries |
| `bg-primary`, `text-muted-foreground` | `bg-blue-500`, `text-gray-400` |
| `<Separator />` | `<hr />`, `<div className="border-t">` |
| `<Skeleton />` | `<div className="animate-pulse">` |
| `<Badge variant="secondary">` | `<span className="text-green-600">` |

## Installed shadcn Components

```
badge, button, card, dialog, field, input, label,
native-select, select, separator, skeleton, sonner,
spinner, table, tabs, textarea
```

See [DESIGN.md](./DESIGN.md) for the list of additional components to install.

## File Conventions

- All page components: `"use client"` (data fetched client-side via tRPC)
- Root layout (`app/layout.tsx`): server component, wraps in `<Providers>`
- API route (`api/trpc/[trpc]/route.ts`): tRPC HTTP handler
- No server actions — all mutations go through tRPC
