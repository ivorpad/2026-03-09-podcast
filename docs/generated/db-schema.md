# Database Schema

Auto-generated from `src/db/schema.ts`. SQLite via Drizzle ORM.

## Tables

### companies

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| name | TEXT | NOT NULL |
| industry | TEXT | |
| website | TEXT | |
| size | TEXT | |
| notes | TEXT | |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |
| updated_at | TEXT | NOT NULL, DEFAULT datetime('now') |

### contacts

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| first_name | TEXT | NOT NULL |
| last_name | TEXT | NOT NULL |
| email | TEXT | |
| phone | TEXT | |
| company_id | INTEGER | FK → companies.id |
| notes | TEXT | |
| ai_summary | TEXT | JSON string |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |
| updated_at | TEXT | NOT NULL, DEFAULT datetime('now') |

### deals

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT |
| title | TEXT | NOT NULL |
| value | REAL | |
| stage | TEXT | NOT NULL, DEFAULT 'lead'. Enum: lead, qualified, proposal, negotiation, closed-won, closed-lost |
| contact_id | INTEGER | FK → contacts.id |
| company_id | INTEGER | FK → companies.id |
| notes | TEXT | |
| ai_next_action | TEXT | JSON string |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') |
| updated_at | TEXT | NOT NULL, DEFAULT datetime('now') |

## Relationships

```
companies.id ←── contacts.company_id
companies.id ←── deals.company_id
contacts.id  ←── deals.contact_id
```
