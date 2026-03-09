import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "sqlite.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Companies
const insertCompany = sqlite.prepare(
  `INSERT INTO companies (name, industry, website, size, notes) VALUES (?, ?, ?, ?, ?)`
);
const companies = [
  ["Acme Corp", "Technology", "https://acme.com", "100-500", "Enterprise SaaS customer"],
  ["Globex Inc", "Manufacturing", "https://globex.com", "500-1000", "Long-term partner"],
  ["Initech", "Finance", "https://initech.io", "50-100", "Growing fintech startup"],
  ["Umbrella Co", "Healthcare", "https://umbrella.co", "1000+", "Pharmaceutical division interested"],
  ["Stark Industries", "Energy", "https://stark.dev", "500-1000", "Renewable energy focus"],
];
for (const c of companies) {
  insertCompany.run(...c);
}

// Contacts
const insertContact = sqlite.prepare(
  `INSERT INTO contacts (first_name, last_name, email, phone, company_id, notes) VALUES (?, ?, ?, ?, ?, ?)`
);
const contacts = [
  ["Sarah", "Chen", "sarah@acme.com", "+1 (555) 100-2000", 1, "VP of Engineering, key decision maker"],
  ["Marcus", "Johnson", "marcus@globex.com", "+1 (555) 200-3000", 2, "Procurement lead, prefers email"],
  ["Elena", "Rodriguez", "elena@initech.io", "+1 (555) 300-4000", 3, "CTO, technical evaluator"],
  ["James", "Wilson", "james@umbrella.co", "+1 (555) 400-5000", 4, "Head of IT, budget holder"],
  ["Priya", "Patel", "priya@stark.dev", "+1 (555) 500-6000", 5, "Director of Operations"],
  ["Alex", "Kim", "alex@acme.com", "+1 (555) 600-7000", 1, "Software architect, champion internally"],
  ["Maria", "Santos", "maria@globex.com", "+1 (555) 700-8000", 2, "CFO, final budget approval"],
];
for (const c of contacts) {
  insertContact.run(...c);
}

// Deals
const insertDeal = sqlite.prepare(
  `INSERT INTO deals (title, value, stage, contact_id, company_id, notes) VALUES (?, ?, ?, ?, ?, ?)`
);
const deals = [
  ["Acme Enterprise License", 120000, "negotiation", 1, 1, "Annual license for 200 seats. Negotiating volume discount."],
  ["Globex Platform Migration", 85000, "proposal", 2, 2, "Migration from legacy system. Sent proposal last week."],
  ["Initech Pilot Program", 25000, "qualified", 3, 3, "3-month pilot with 20 users. Technical evaluation ongoing."],
  ["Umbrella Data Analytics", 200000, "lead", 4, 4, "Initial interest in analytics dashboard. Discovery call scheduled."],
  ["Stark Green Energy Dashboard", 95000, "closed-won", 5, 5, "Signed! Implementation starting next quarter."],
  ["Acme Team Expansion", 45000, "proposal", 6, 1, "Additional 50 seats for engineering team."],
  ["Globex Support Contract", 30000, "closed-lost", 7, 2, "Lost to competitor on price. Maintain relationship."],
  ["Initech Full Rollout", 75000, "lead", 3, 3, "Contingent on successful pilot completion."],
];
for (const d of deals) {
  insertDeal.run(...d);
}

console.log("Seeded: 5 companies, 7 contacts, 8 deals");
sqlite.close();
