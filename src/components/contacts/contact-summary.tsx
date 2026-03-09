"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SparklesIcon } from "lucide-react";
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
    <Card className="border-l-2 border-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">AI Summary</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateSummary.mutate(contactId)}
            disabled={generateSummary.isPending}
          >
            {generateSummary.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <SparklesIcon data-icon="inline-start" />
            )}
            {generateSummary.isPending ? "Generating..." : "Generate"}
          </Button>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {parsed ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">{parsed.summary}</p>
            <div className="flex flex-wrap gap-1">
              {parsed.keyInsights.map((insight, i) => (
                <Badge key={i} variant="secondary">
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
              className="w-fit"
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
