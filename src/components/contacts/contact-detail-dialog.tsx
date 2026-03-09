"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ContactSummaryCard } from "@/components/contacts/contact-summary";
import { ContactEnrichmentCard } from "@/components/contacts/contact-enrichment";

interface DealInfo {
  id: number;
  title: string;
  value: number | null;
  stage: string;
}

export interface ContactDetailData {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  notes: string | null;
  aiSummary: string | null;
  deals: DealInfo[];
}

interface ContactDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactDetailData | null | undefined;
  isLoading: boolean;
}

export function ContactDetailDialog({
  open,
  onOpenChange,
  contact,
  isLoading,
}: ContactDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contact
              ? `${contact.firstName} ${contact.lastName}`
              : "Loading..."}
          </DialogTitle>
          <DialogDescription>Contact details and AI features</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : contact ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Email
                </p>
                <p>{contact.email ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Phone
                </p>
                <p>{contact.phone ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Company
                </p>
                <p>{contact.companyName ?? "-"}</p>
              </div>
              {contact.notes && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Notes
                  </p>
                  <p>{contact.notes}</p>
                </div>
              )}
            </div>

            {contact.deals && contact.deals.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Related Deals</h4>
                  <div className="flex flex-col gap-1">
                    {contact.deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="text-sm flex justify-between"
                      >
                        <span>{deal.title}</span>
                        <span className="text-muted-foreground">
                          {deal.stage} &middot;{" "}
                          <span className="font-mono">
                            ${deal.value ?? 0}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <ContactSummaryCard
              contactId={contact.id}
              existingSummary={contact.aiSummary}
            />
            <ContactEnrichmentCard contactId={contact.id} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
