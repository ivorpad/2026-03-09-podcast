"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { DealNextAction } from "@/shared/schemas";

export function DealNextActionCard({
  dealId,
  existingAction,
}: {
  dealId: number;
  existingAction: string | null;
}) {
  const utils = trpc.useUtils();
  const suggest = trpc.ai.suggestDealNextAction.useMutation({
    onSuccess: () => {
      toast.success("Next action suggested");
      utils.deals.getById.invalidate(dealId);
      utils.deals.list.invalidate();
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const parsed: DealNextAction | null = existingAction
    ? JSON.parse(existingAction)
    : null;

  const priorityColor = (p: string) => {
    switch (p) {
      case "urgent":
        return "destructive" as const;
      case "high":
        return "default" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">AI Next Action</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => suggest.mutate(dealId)}
          disabled={suggest.isPending}
        >
          {suggest.isPending ? "Thinking..." : "Suggest Next Action"}
        </Button>
      </CardHeader>
      <CardContent>
        {parsed ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{parsed.action}</p>
            <p className="text-xs text-muted-foreground">{parsed.reasoning}</p>
            <Badge variant={priorityColor(parsed.priority)}>
              {parsed.priority} priority
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No action suggested yet. Click &quot;Suggest Next Action&quot; to
            get AI-powered guidance.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
