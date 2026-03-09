"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: "◆" },
  { href: "/contacts", label: "Contacts", icon: "◇" },
  { href: "/companies", label: "Companies", icon: "□" },
  { href: "/deals", label: "Deals", icon: "○" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 flex flex-col">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-sm font-semibold tracking-tight">Harness CRM</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Demo Dashboard</p>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === item.href
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            <span className="text-xs">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
