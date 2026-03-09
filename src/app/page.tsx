"use client";

import { trpc } from "@/lib/trpc";
import { SectionCards } from "@/components/section-cards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  const deals = trpc.deals.list.useQuery();
  const recentDeals = deals.data?.items.slice(0, 5) ?? [];

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards />
        <div className="px-4 lg:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Deals</CardTitle>
              <CardDescription>Latest deals in your pipeline</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {deals.isLoading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentDeals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No deals yet. Create one to get started.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between pb-3 border-b border-border last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{deal.title}</p>
                        <p className="text-sm text-muted-foreground">
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
      </div>
    </div>
  );
}
