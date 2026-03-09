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
import { CompanyForm } from "@/components/companies/company-form";
import type { CompanyCreate } from "@/shared/schemas";
import { toast } from "sonner";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Companies</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {companies.data?.total ?? 0} companies
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Add Company
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Size</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.data?.items.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell>{company.industry ?? "-"}</TableCell>
              <TableCell>{company.website ?? "-"}</TableCell>
              <TableCell>{company.size ?? "-"}</TableCell>
              <TableCell>
                <div className="flex gap-1">
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
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500"
                    onClick={() => {
                      if (confirm("Delete this company?"))
                        deleteMutation.mutate(company.id);
                    }}
                  >
                    Del
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {companies.data?.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No companies yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

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
          </DialogHeader>
          <CompanyForm
            initialData={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
