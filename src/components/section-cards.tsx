"use client"

import { trpc } from "@/lib/trpc"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function SectionCards() {
  const contacts = trpc.contacts.list.useQuery()
  const companies = trpc.companies.list.useQuery()
  const deals = trpc.deals.list.useQuery()

  const isLoading =
    contacts.isLoading || companies.isLoading || deals.isLoading

  const allDeals = deals.data?.items ?? []
  const pipelineValue = allDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)
  const openDeals = allDeals.filter(
    (d) => d.stage !== "closed-won" && d.stage !== "closed-lost"
  )
  const wonDeals = allDeals.filter((d) => d.stage === "closed-won")
  const wonValue = wonDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)

  const formatCompact = (val: number) => {
    if (val >= 1_000_000)
      return `$${(val / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    if (val >= 1000) return `$${(val / 1000).toFixed(1).replace(/\.0$/, "")}k`
    return `$${val}`
  }

  const stats = [
    {
      label: "Total Contacts",
      value: contacts.data?.total ?? 0,
      footer: `${companies.data?.total ?? 0} companies`,
    },
    {
      label: "Open Deals",
      value: openDeals.length,
      footer: `${allDeals.length} total deals`,
    },
    {
      label: "Pipeline Value",
      value: formatCompact(pipelineValue),
      footer: `${openDeals.length} active deals`,
    },
    {
      label: "Won Revenue",
      value: formatCompact(wonValue),
      footer: `${wonDeals.length} closed-won`,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader>
            <CardDescription>{stat.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums font-mono">
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                stat.value
              )}
            </CardTitle>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-28" />
            ) : (
              stat.footer
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
