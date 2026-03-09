"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { DealForm } from "@/components/deals/deal-form";
import { DealNextActionCard } from "@/components/deals/deal-next-action";
import { dealStages, type DealCreate, type DealStage } from "@/shared/schemas";
import { toast } from "sonner";

const stageColors: Record<DealStage, string> = {
  lead: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  qualified:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  proposal:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  negotiation:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "closed-won":
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "closed-lost":
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Deals</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {deals.data?.total ?? 0} deals &middot; Pipeline: $
            {allDeals
              .reduce((sum, d) => sum + (d.value ?? 0), 0)
              .toLocaleString()}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Add Deal
        </Button>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allDeals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell className="font-medium">{deal.title}</TableCell>
                  <TableCell>${deal.value?.toLocaleString() ?? 0}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stageColors[deal.stage as DealStage] ?? ""}`}
                    >
                      {deal.stage}
                    </span>
                  </TableCell>
                  <TableCell>{deal.contactName ?? "-"}</TableCell>
                  <TableCell>{deal.companyName ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewingId(deal.id)}
                      >
                        View
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
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => {
                          if (confirm("Delete this deal?"))
                            deleteMutation.mutate(deal.id);
                        }}
                      >
                        Del
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {allDeals.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    No deals yet
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
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {stage}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {stageDeals.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        className="rounded-md border p-2 text-xs cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        onClick={() => setViewingId(deal.id)}
                      >
                        <p className="font-medium truncate">{deal.title}</p>
                        <p className="text-muted-foreground mt-0.5">
                          ${deal.value?.toLocaleString() ?? 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

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
          </DialogHeader>
          <DealForm
            initialData={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
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
          </DialogHeader>
          {dealDetail.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Value:</span> $
                  {dealDetail.data.value?.toLocaleString() ?? 0}
                </div>
                <div>
                  <span className="font-medium">Stage:</span>{" "}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stageColors[dealDetail.data.stage as DealStage] ?? ""}`}
                  >
                    {dealDetail.data.stage}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Contact:</span>{" "}
                  {dealDetail.data.contactName ?? "-"}
                </div>
                <div>
                  <span className="font-medium">Company:</span>{" "}
                  {dealDetail.data.companyName ?? "-"}
                </div>
                {dealDetail.data.notes && (
                  <div className="col-span-2">
                    <span className="font-medium">Notes:</span>{" "}
                    {dealDetail.data.notes}
                  </div>
                )}
              </div>

              <DealNextActionCard
                dealId={dealDetail.data.id}
                existingAction={dealDetail.data.aiNextAction}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
