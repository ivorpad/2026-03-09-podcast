"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Star, Edit, Trash2 } from "lucide-react";

interface Contact {
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  department: string;
}

const contacts: Contact[] = [
  { name: "Sarah Chen", email: "sarah@acme.co", role: "VP Engineering", avatarUrl: "/avatars/sarah.jpg", department: "Engineering" },
  { name: "Marcus Johnson", email: "marcus@acme.co", role: "Product Manager", avatarUrl: "/avatars/marcus.jpg", department: "Product" },
  { name: "Priya Patel", email: "priya@acme.co", role: "Lead Designer", avatarUrl: "/avatars/priya.jpg", department: "Design" },
  { name: "James Wilson", email: "james@acme.co", role: "Sales Director", avatarUrl: "/avatars/james.jpg", department: "Sales" },
];

export default function ContactDirectoryPage() {
  const [query, setQuery] = useState("");
  const [starred, setStarred] = useState<Set<string>>(new Set());

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.department.toLowerCase().includes(query.toLowerCase())
  );

  const toggleStar = (email: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen p-8 bg-muted">
      <h1 className="text-2xl font-bold mb-1 text-foreground">
        Contacts
      </h1>
      <p className="text-muted-foreground mb-6">Manage your team directory</p>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search contacts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
        />
      </div>

      <div className="grid gap-4">
        {filtered.map((contact, i) => (
          <div
            key={i}
            className="bg-background rounded-lg border border-l-[3px] border-l-primary p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => console.log("open", contact.email)}
          >
            <Image src={contact.avatarUrl} alt={contact.name} width={48} height={48} className="rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{contact.name}</p>
              <p className="text-sm text-muted-foreground">{contact.role}</p>
              <p className="text-xs text-muted-foreground">{contact.email}</p>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded hover:bg-accent" onClick={(e) => { e.stopPropagation(); toggleStar(contact.email); }}>
                <Star className="h-4 w-4" fill={starred.has(contact.email) ? "currentColor" : "none"} />
              </button>
              <button className="p-2 rounded hover:bg-accent" onClick={(e) => { e.stopPropagation(); }}>
                <Edit className="h-4 w-4" />
              </button>
              <button className="p-2 rounded hover:bg-accent" onClick={(e) => { e.stopPropagation(); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-12 text-muted-foreground">No contacts found.</p>
      )}
    </div>
  );
}
