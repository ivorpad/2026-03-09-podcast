"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { ContactSummary } from "@/shared/schemas";

export function ContactSummaryCard({
  contactId,
  existingSummary,
}: {
  contactId: number;
  existingSummary: string | null;
}) {
  const utils = trpc.useUtils();
  const generateSummary = trpc.ai.generateContactSummary.useMutation({
    onSuccess: () => {
      toast.success("AI summary generated");
      utils.contacts.getById.invalidate(contactId);
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const parsed: ContactSummary | null = existingSummary
    ? JSON.parse(existingSummary)
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">AI Summary</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => generateSummary.mutate(contactId)}
          disabled={generateSummary.isPending}
        >
          {generateSummary.isPending ? "Generating..." : "Generate Summary"}
        </Button>
      </CardHeader>
      <CardContent>
        {parsed ? (
          <div className="space-y-3">
            <p className="text-sm">{parsed.summary}</p>
            <div className="flex flex-wrap gap-1">
              {parsed.keyInsights.map((insight, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {insight}
                </Badge>
              ))}
            </div>
            <Badge
              variant={
                parsed.sentiment === "positive"
                  ? "default"
                  : parsed.sentiment === "negative"
                    ? "destructive"
                    : "outline"
              }
            >
              {parsed.sentiment}
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No AI summary yet. Click &quot;Generate Summary&quot; to create one.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
