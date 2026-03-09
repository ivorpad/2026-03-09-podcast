"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
import { ContactForm } from "@/components/contacts/contact-form";
import { ContactSummaryCard } from "@/components/contacts/contact-summary";
import { ContactEnrichmentCard } from "@/components/contacts/contact-enrichment";
import type { ContactCreate } from "@/shared/schemas";
import { toast } from "sonner";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Contacts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {contacts.data?.total ?? 0} contacts
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Add Contact
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Company</TableHead>
            <TableHead className="w-[140px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.data?.items.map((contact) => (
            <TableRow key={contact.id}>
              <TableCell className="font-medium">
                {contact.firstName} {contact.lastName}
              </TableCell>
              <TableCell>{contact.email ?? "-"}</TableCell>
              <TableCell>{contact.phone ?? "-"}</TableCell>
              <TableCell>{contact.companyName ?? "-"}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setViewingId(contact.id)}
                  >
                    View
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
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500"
                    onClick={() => {
                      if (confirm("Delete this contact?"))
                        deleteMutation.mutate(contact.id);
                    }}
                  >
                    Del
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {contacts.data?.items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                No contacts yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

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
          </DialogHeader>
          <ContactForm
            initialData={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
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
          </DialogHeader>
          {contactDetail.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Email:</span>{" "}
                  {contactDetail.data.email ?? "-"}
                </div>
                <div>
                  <span className="font-medium">Phone:</span>{" "}
                  {contactDetail.data.phone ?? "-"}
                </div>
                <div>
                  <span className="font-medium">Company:</span>{" "}
                  {contactDetail.data.companyName ?? "-"}
                </div>
                <div>
                  <span className="font-medium">Notes:</span>{" "}
                  {contactDetail.data.notes ?? "-"}
                </div>
              </div>

              {contactDetail.data.deals &&
                contactDetail.data.deals.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Related Deals</h4>
                    <div className="space-y-1">
                      {contactDetail.data.deals.map((deal) => (
                        <div
                          key={deal.id}
                          className="text-sm flex justify-between"
                        >
                          <span>{deal.title}</span>
                          <span className="text-muted-foreground">
                            {deal.stage} &middot; ${deal.value ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <ContactSummaryCard
                contactId={contactDetail.data.id}
                existingSummary={contactDetail.data.aiSummary}
              />
              <ContactEnrichmentCard contactId={contactDetail.data.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
