"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { DealForm } from "@/components/deals/deal-form";
import { DealNextActionCard } from "@/components/deals/deal-next-action";
import { dealStages, type DealCreate, type DealStage } from "@/shared/schemas";
import { toast } from "sonner";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  TableIcon,
  KanbanIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const stageBadgeVariant: Record<
  DealStage,
  "default" | "secondary" | "outline" | "destructive"
> = {
  lead: "outline",
  qualified: "secondary",
  proposal: "secondary",
  negotiation: "default",
  "closed-won": "default",
  "closed-lost": "destructive",
};

export default function DealsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<
    (DealCreate & { id: number }) | null
  >(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const deals = trpc.deals.list.useQuery();
  const dealDetail = trpc.deals.getById.useQuery(viewingId!, {
    enabled: viewingId !== null,
  });

  const createMutation = trpc.deals.create.useMutation({
    onSuccess: () => {
      toast.success("Deal created");
      setDialogOpen(false);
      utils.deals.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.deals.update.useMutation({
    onSuccess: () => {
      toast.success("Deal updated");
      setEditing(null);
      setDialogOpen(false);
      utils.deals.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.deals.delete.useMutation({
    onSuccess: () => {
      toast.success("Deal deleted");
      utils.deals.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (data: DealCreate) => {
    if (editing) {
      updateMutation.mutate({ ...data, id: editing.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const allDeals = deals.data?.items ?? [];
  const pipelineValue = allDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {deals.data?.total ?? 0} deals &middot; Pipeline: $
          {pipelineValue.toLocaleString()}
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <PlusIcon data-icon="inline-start" />
          Add Deal
        </Button>
      </div>

      {deals.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="table">
          <TabsList>
            <TabsTrigger value="table">
              <TableIcon />
              Table
            </TabsTrigger>
            <TabsTrigger value="pipeline">
              <KanbanIcon />
              Pipeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wider">Title</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Value</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Stage</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Contact</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Company</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allDeals.map((deal) => (
                  <TableRow key={deal.id} className="group">
                    <TableCell className="font-medium">{deal.title}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">${deal.value?.toLocaleString() ?? 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          stageBadgeVariant[deal.stage as DealStage] ?? "outline"
                        }
                      >
                        {deal.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>{deal.contactName ?? "-"}</TableCell>
                    <TableCell>{deal.companyName ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewingId(deal.id)}
                        >
                          <EyeIcon />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing({
                              id: deal.id,
                              title: deal.title,
                              value: deal.value ?? undefined,
                              stage: deal.stage as DealCreate["stage"],
                              contactId: deal.contactId ?? undefined,
                              companyId: deal.companyId ?? undefined,
                              notes: deal.notes ?? "",
                            });
                            setDialogOpen(true);
                          }}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Delete this deal?"))
                              deleteMutation.mutate(deal.id);
                          }}
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {allDeals.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No deals yet. Add one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="pipeline">
            <div className="grid grid-cols-6 gap-3">
              {dealStages.map((stage) => {
                const stageDeals = allDeals.filter((d) => d.stage === stage);
                return (
                  <div key={stage} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {stage}
                      </h3>
                      <Badge variant="secondary" className="font-mono text-xs">{stageDeals.length}</Badge>
                    </div>
                    <div className="flex flex-col gap-2">
                      {stageDeals.map((deal) => (
                        <Card
                          key={deal.id}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-accent"
                          )}
                          onClick={() => setViewingId(deal.id)}
                        >
                          <CardContent className="p-2">
                            <p className="text-sm font-medium truncate">
                              {deal.title}
                            </p>
                            <p className="text-sm text-muted-foreground font-mono mt-0.5">
                              ${deal.value?.toLocaleString() ?? 0}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                      {stageDeals.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No deals
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Deal" : "New Deal"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the deal details below."
                : "Fill in the details to create a new deal."}
            </DialogDescription>
          </DialogHeader>
          <DealForm
            initialData={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* View Deal Detail Dialog */}
      <Dialog
        open={viewingId !== null}
        onOpenChange={(open) => {
          if (!open) setViewingId(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dealDetail.data?.title ?? "Loading..."}
            </DialogTitle>
            <DialogDescription>Deal details and AI features</DialogDescription>
          </DialogHeader>
          {dealDetail.isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : dealDetail.data ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Value</p>
                  <p className="font-mono">${dealDetail.data.value?.toLocaleString() ?? 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Stage</p>
                  <Badge
                    variant={
                      stageBadgeVariant[dealDetail.data.stage as DealStage] ??
                      "outline"
                    }
                  >
                    {dealDetail.data.stage}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact</p>
                  <p>{dealDetail.data.contactName ?? "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company</p>
                  <p>{dealDetail.data.companyName ?? "-"}</p>
                </div>
                {dealDetail.data.notes && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p>{dealDetail.data.notes}</p>
                  </div>
                )}
              </div>

              <DealNextActionCard
                dealId={dealDetail.data.id}
                existingAction={dealDetail.data.aiNextAction}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
