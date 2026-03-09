"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WandIcon, CheckIcon, XIcon } from "lucide-react";
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
    <Card className="border-l-2 border-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">AI Enrichment</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => enrich.mutate(contactId)}
            disabled={enrich.isPending}
          >
            {enrich.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <WandIcon data-icon="inline-start" />
            )}
            {enrich.isPending ? "Enriching..." : "Enrich Contact"}
          </Button>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {suggestions ? (
          <div className="flex flex-col gap-3">
            <div className="text-sm flex flex-col gap-1">
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
              className="w-fit"
            >
              Confidence: {suggestions.confidence}
            </Badge>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleApply}
                disabled={updateContact.isPending}
              >
                {updateContact.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <CheckIcon data-icon="inline-start" />
                )}
                Apply Suggestions
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSuggestions(null)}
              >
                <XIcon data-icon="inline-start" />
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
