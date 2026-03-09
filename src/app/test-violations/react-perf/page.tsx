"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

function DealCard({
  name,
  value,
  onSelect,
}: {
  name: string;
  value: number;
  onSelect: (name: string) => void;
}) {
  return (
    <button onClick={() => onSelect(name)} className="rounded border p-3">
      <p className="font-medium">{name}</p>
      <p className="text-sm text-muted-foreground">${value.toLocaleString()}</p>
    </button>
  );
}

export default function DealSearchPage() {
  const [query, setQuery] = useState("");
  const [minValue, setMinValue] = useState(0);
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);
  const [filteredDeals, setFilteredDeals] = useState<
    { id: number; name: string; value: number }[]
  >([]);

  const { data: deals = [] } = trpc.deals.list.useQuery();

  useEffect(() => {
    const result = deals.filter(
      (d) =>
        d.name.toLowerCase().includes(query.toLowerCase()) &&
        d.value >= minValue
    );
    setFilteredDeals(result);
  }, [deals, query, minValue]);

  const count = filteredDeals.length;

  return (
    <div style={{ padding: "1.5rem", maxWidth: "960px", margin: "0 auto" }}>
      <h1 className="mb-4 text-2xl font-bold">Deal Search</h1>

      <div className="mb-4 flex gap-3">
        <input
          className="rounded border px-3 py-2"
          placeholder="Search deals..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input
          type="number"
          className="w-32 rounded border px-3 py-2"
          placeholder="Min value"
          value={minValue}
          onChange={(e) => setMinValue(Number(e.target.value))}
        />
      </div>

      {count && (
        <p style={{ color: "red", display: "flex", gap: "0.25rem" }}>
          Showing {count} deals
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {filteredDeals.map((deal) => (
          <DealCard
            key={deal.id}
            name={deal.name}
            value={deal.value}
            onSelect={(name) => setSelectedDeal(name)}
          />
        ))}
      </div>

      {selectedDeal && (
        <p className="mt-4 text-sm">Selected: {selectedDeal}</p>
      )}
    </div>
  );
}
