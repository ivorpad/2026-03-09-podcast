"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contactCreateSchema, type ContactCreate } from "@/shared/schemas";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ContactFormProps {
  initialData?: ContactCreate & { id?: number };
  onSubmit: (data: ContactCreate) => void;
  onCancel: () => void;
}

export function ContactForm({
  initialData,
  onSubmit,
  onCancel,
}: ContactFormProps) {
  const [form, setForm] = useState<ContactCreate>({
    firstName: initialData?.firstName ?? "",
    lastName: initialData?.lastName ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    companyId: initialData?.companyId,
    notes: initialData?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const companies = trpc.companies.list.useQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactCreateSchema.safeParse(form);
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">First Name *</label>
          <Input
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            placeholder="First name"
          />
          {errors.firstName && (
            <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Last Name *</label>
          <Input
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            placeholder="Last name"
          />
          {errors.lastName && (
            <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
          )}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          value={form.email ?? ""}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="email@example.com"
        />
        {errors.email && (
          <p className="text-xs text-red-500 mt-1">{errors.email}</p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium">Phone</label>
        <Input
          value={form.phone ?? ""}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+1 (555) 000-0000"
        />
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
      <div>
        <label className="text-sm font-medium">Notes</label>
        <Textarea
          value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Notes about this contact"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData?.id ? "Update" : "Create"} Contact
        </Button>
      </div>
    </form>
  );
}
