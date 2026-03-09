"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
import { CompanyForm } from "@/components/companies/company-form";
import type { CompanyCreate } from "@/shared/schemas";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react";

export default function CompaniesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<
    (CompanyCreate & { id: number }) | null
  >(null);
  const utils = trpc.useUtils();
  const companies = trpc.companies.list.useQuery();

  const createMutation = trpc.companies.create.useMutation({
    onSuccess: () => {
      toast.success("Company created");
      setDialogOpen(false);
      utils.companies.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.companies.update.useMutation({
    onSuccess: () => {
      toast.success("Company updated");
      setEditing(null);
      setDialogOpen(false);
      utils.companies.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.companies.delete.useMutation({
    onSuccess: () => {
      toast.success("Company deleted");
      utils.companies.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (data: CompanyCreate) => {
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
          {companies.data?.total ?? 0} companies
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <PlusIcon data-icon="inline-start" />
          Add Company
        </Button>
      </div>

      {companies.isLoading ? (
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
              <TableHead className="text-xs uppercase tracking-wider">Industry</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Website</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Size</TableHead>
              <TableHead className="text-xs uppercase tracking-wider w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.data?.items.map((company) => (
              <TableRow key={company.id} className="group">
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell className="text-muted-foreground">{company.industry ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{company.website ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{company.size ?? "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing({
                          id: company.id,
                          name: company.name,
                          industry: company.industry ?? "",
                          website: company.website ?? "",
                          size: company.size ?? "",
                          notes: company.notes ?? "",
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
                        if (confirm("Delete this company?"))
                          deleteMutation.mutate(company.id);
                      }}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {companies.data?.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  No companies yet. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

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
              {editing ? "Edit Company" : "New Company"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the company details below."
                : "Fill in the details to create a new company."}
            </DialogDescription>
          </DialogHeader>
          <CompanyForm
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
    </div>
  );
}
