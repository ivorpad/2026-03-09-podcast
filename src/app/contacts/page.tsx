"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import { ContactForm } from "@/components/contacts/contact-form";
import { ContactSummaryCard } from "@/components/contacts/contact-summary";
import { ContactEnrichmentCard } from "@/components/contacts/contact-enrichment";
import type { ContactCreate } from "@/shared/schemas";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from "lucide-react";

export default function ContactsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<
    (ContactCreate & { id: number }) | null
  >(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const contacts = trpc.contacts.list.useQuery();
  const contactDetail = trpc.contacts.getById.useQuery(viewingId!, {
    enabled: viewingId !== null,
  });

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Contact created");
      setDialogOpen(false);
      utils.contacts.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => {
      toast.success("Contact updated");
      setEditing(null);
      setDialogOpen(false);
      utils.contacts.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      toast.success("Contact deleted");
      utils.contacts.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (data: ContactCreate) => {
    if (editing) {
      updateMutation.mutate({ ...data, id: editing.id });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {contacts.data?.total ?? 0} contacts
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <PlusIcon data-icon="inline-start" />
          Add Contact
        </Button>
      </div>

      {contacts.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Email</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Phone</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Company</TableHead>
              <TableHead className="text-xs uppercase tracking-wider w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.data?.items.map((contact) => (
              <TableRow key={contact.id} className="group">
                <TableCell className="font-medium">
                  {contact.firstName} {contact.lastName}
                </TableCell>
                <TableCell className="text-muted-foreground">{contact.email ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{contact.phone ?? "-"}</TableCell>
                <TableCell>{contact.companyName ?? "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setViewingId(contact.id)}
                    >
                      <EyeIcon />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing({
                          id: contact.id,
                          firstName: contact.firstName,
                          lastName: contact.lastName,
                          email: contact.email ?? "",
                          phone: contact.phone ?? "",
                          companyId: contact.companyId ?? undefined,
                          notes: contact.notes ?? "",
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
                        if (confirm("Delete this contact?"))
                          deleteMutation.mutate(contact.id);
                      }}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {contacts.data?.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  No contacts yet. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
            <DialogTitle>
              {editing ? "Edit Contact" : "New Contact"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the contact details below."
                : "Fill in the details to create a new contact."}
            </DialogDescription>
          </DialogHeader>
          <ContactForm
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

      {/* View Contact Detail Dialog */}
      <Dialog
        open={viewingId !== null}
        onOpenChange={(open) => {
          if (!open) setViewingId(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {contactDetail.data
                ? `${contactDetail.data.firstName} ${contactDetail.data.lastName}`
                : "Loading..."}
            </DialogTitle>
            <DialogDescription>Contact details and AI features</DialogDescription>
          </DialogHeader>
          {contactDetail.isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : contactDetail.data ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{contactDetail.data.email ?? "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p>{contactDetail.data.phone ?? "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Company</p>
                  <p>{contactDetail.data.companyName ?? "-"}</p>
                </div>
                {contactDetail.data.notes && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p>{contactDetail.data.notes}</p>
                  </div>
                )}
              </div>

              {contactDetail.data.deals &&
                contactDetail.data.deals.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Related Deals
                      </h4>
                      <div className="flex flex-col gap-1">
                        {contactDetail.data.deals.map((deal) => (
                          <div
                            key={deal.id}
                            className="text-sm flex justify-between"
                          >
                            <span>{deal.title}</span>
                            <span className="text-muted-foreground">
                              {deal.stage} &middot; <span className="font-mono">${deal.value ?? 0}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

              <ContactSummaryCard
                contactId={contactDetail.data.id}
                existingSummary={contactDetail.data.aiSummary}
              />
              <ContactEnrichmentCard contactId={contactDetail.data.id} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
