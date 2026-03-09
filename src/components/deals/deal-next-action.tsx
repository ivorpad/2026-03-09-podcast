"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LightbulbIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { dealNextActionSchema, type DealNextAction } from "@/shared/schemas";

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
    ? dealNextActionSchema.parse(JSON.parse(existingAction))
    : null;

  return (
    <Card className="border-l-2 border-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">AI Next Action</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => suggest.mutate(dealId)}
            disabled={suggest.isPending}
          >
            {suggest.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <LightbulbIcon data-icon="inline-start" />
            )}
            {suggest.isPending ? "Thinking..." : "Suggest Next Action"}
          </Button>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        {parsed ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{parsed.action}</p>
            <p className="text-sm text-muted-foreground">{parsed.reasoning}</p>
            <Badge
              variant={
                parsed.priority === "urgent"
                  ? "destructive"
                  : parsed.priority === "high"
                    ? "default"
                    : "outline"
              }
              className="w-fit"
            >
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
