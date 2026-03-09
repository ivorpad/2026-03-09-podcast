"use client";

import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const contacts = trpc.contacts.list.useQuery();
  const companies = trpc.companies.list.useQuery();
  const deals = trpc.deals.list.useQuery();

  const stats = [
    {
      label: "Contacts",
      value: contacts.data?.total ?? "...",
      href: "/contacts",
    },
    {
      label: "Companies",
      value: companies.data?.total ?? "...",
      href: "/companies",
    },
    { label: "Deals", value: deals.data?.total ?? "...", href: "/deals" },
    {
      label: "Pipeline Value",
      value: deals.data
        ? `$${(deals.data.items.reduce((sum, d) => sum + (d.value ?? 0), 0) / 1000).toFixed(0)}k`
        : "...",
    },
  ];

  const recentDeals = deals.data?.items.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          CRM overview with AI-powered harness engineering features
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Deals</CardTitle>
        </CardHeader>
        <CardContent>
          {recentDeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No deals yet. Create one to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {recentDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{deal.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {deal.companyName ?? "No company"} &middot;{" "}
                      {deal.contactName ?? "No contact"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      ${deal.value?.toLocaleString() ?? 0}
                    </span>
                    <Badge variant="outline">{deal.stage}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
