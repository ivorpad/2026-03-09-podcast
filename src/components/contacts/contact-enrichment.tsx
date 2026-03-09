"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { ContactEnrichment } from "@/shared/schemas";

export function ContactEnrichmentCard({ contactId }: { contactId: number }) {
  const [suggestions, setSuggestions] = useState<ContactEnrichment | null>(
    null
  );
  const utils = trpc.useUtils();

  const enrich = trpc.ai.enrichContact.useMutation({
    onSuccess: (data) => {
      setSuggestions(data);
      toast.success("Enrichment suggestions ready — review before applying");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const updateContact = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success("Contact updated with enrichment data");
      setSuggestions(null);
      utils.contacts.getById.invalidate(contactId);
    },
  });

  const handleApply = () => {
    if (!suggestions) return;
    updateContact.mutate({
      id: contactId,
      notes: `[AI Enriched] Title: ${suggestions.suggestedTitle} | Industry: ${suggestions.suggestedIndustry} | ${suggestions.suggestedNotes}`,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">AI Enrichment</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => enrich.mutate(contactId)}
          disabled={enrich.isPending}
        >
          {enrich.isPending ? "Enriching..." : "Enrich Contact"}
        </Button>
      </CardHeader>
      <CardContent>
        {suggestions ? (
          <div className="space-y-3">
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">Suggested Title:</span>{" "}
                {suggestions.suggestedTitle}
              </p>
              <p>
                <span className="font-medium">Suggested Industry:</span>{" "}
                {suggestions.suggestedIndustry}
              </p>
              <p>
                <span className="font-medium">Additional Notes:</span>{" "}
                {suggestions.suggestedNotes}
              </p>
            </div>
            <Badge
              variant={
                suggestions.confidence === "high"
                  ? "default"
                  : suggestions.confidence === "low"
                    ? "destructive"
                    : "outline"
              }
            >
              Confidence: {suggestions.confidence}
            </Badge>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleApply}>
                Apply Suggestions
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSuggestions(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click &quot;Enrich Contact&quot; to get AI-suggested professional
            details. You must confirm before any changes are saved.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
