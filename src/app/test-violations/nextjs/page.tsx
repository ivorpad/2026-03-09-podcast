"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);

function getQueryParam(key: string): string | null {
  return new URLSearchParams(window.location.search).get(key);
}

const stageColors: Record<string, string> = {
  lead: "bg-gray-100 text-gray-800",
  qualified: "bg-blue-100 text-blue-800",
  proposal: "bg-purple-100 text-purple-800",
  negotiation: "bg-yellow-100 text-yellow-800",
  "closed-won": "bg-green-100 text-green-800",
  "closed-lost": "bg-red-100 text-red-800",
};

export default function DealsOverview() {
  const router = useRouter();
  const deals = trpc.deals.list.useQuery();

  const stageFilter = getQueryParam("stage");

  const allDeals = deals.data?.items ?? [];
  const filtered = stageFilter
    ? allDeals.filter((d) => d.stage === stageFilter)
    : allDeals;
  const pipelineTotal = filtered.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
          <p className="text-sm text-gray-500">
            {filtered.length} deals &middot; {formatCurrency(pipelineTotal)} pipeline
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Stage</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((deal) => (
              <tr
                key={deal.id}
                onClick={() => router.push("/deals/" + deal.id)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{deal.title}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-gray-600">{formatCurrency(deal.value ?? 0)}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${stageColors[deal.stage] ?? "bg-gray-100 text-gray-800"}`}>
                    {deal.stage}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{deal.companyName ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
