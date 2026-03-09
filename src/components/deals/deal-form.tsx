"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dealCreateSchema, dealStages, type DealCreate } from "@/shared/schemas";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DealFormProps {
  initialData?: DealCreate & { id?: number };
  onSubmit: (data: DealCreate) => void;
  onCancel: () => void;
}

export function DealForm({ initialData, onSubmit, onCancel }: DealFormProps) {
  const [form, setForm] = useState<DealCreate>({
    title: initialData?.title ?? "",
    value: initialData?.value ?? 0,
    stage: initialData?.stage ?? "lead",
    contactId: initialData?.contactId,
    companyId: initialData?.companyId,
    notes: initialData?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const contacts = trpc.contacts.list.useQuery();
  const companies = trpc.companies.list.useQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = dealCreateSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please fix the validation errors");
      return;
    }
    setErrors({});
    onSubmit(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Title *</label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Deal title"
        />
        {errors.title && (
          <p className="text-xs text-red-500 mt-1">{errors.title}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Value ($)</label>
          <Input
            type="number"
            value={form.value ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                value: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Stage</label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
            value={form.stage}
            onChange={(e) =>
              setForm({ ...form, stage: e.target.value as DealCreate["stage"] })
            }
          >
            {dealStages.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Contact</label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
            value={form.contactId ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                contactId: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          >
            <option value="">No contact</option>
            {contacts.data?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Company</label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
            value={form.companyId ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                companyId: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          >
            <option value="">No company</option>
            {companies.data?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Notes</label>
        <Textarea
          value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Notes about this deal"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData?.id ? "Update" : "Create"} Deal
        </Button>
      </div>
    </form>
  );
}
