"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { companyCreateSchema, type CompanyCreate } from "@/shared/schemas";
import { toast } from "sonner";

interface CompanyFormProps {
  initialData?: CompanyCreate & { id?: number };
  onSubmit: (data: CompanyCreate) => void;
  onCancel: () => void;
}

export function CompanyForm({
  initialData,
  onSubmit,
  onCancel,
}: CompanyFormProps) {
  const [form, setForm] = useState<CompanyCreate>({
    name: initialData?.name ?? "",
    industry: initialData?.industry ?? "",
    website: initialData?.website ?? "",
    size: initialData?.size ?? "",
    notes: initialData?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = companyCreateSchema.safeParse(form);
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
        <label className="text-sm font-medium">Name *</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Company name"
        />
        {errors.name && (
          <p className="text-xs text-red-500 mt-1">{errors.name}</p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium">Industry</label>
        <Input
          value={form.industry ?? ""}
          onChange={(e) => setForm({ ...form, industry: e.target.value })}
          placeholder="e.g. Technology"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Website</label>
        <Input
          value={form.website ?? ""}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="e.g. https://example.com"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Size</label>
        <Input
          value={form.size ?? ""}
          onChange={(e) => setForm({ ...form, size: e.target.value })}
          placeholder="e.g. 50-100 employees"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Notes</label>
        <Textarea
          value={form.notes ?? ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Notes about this company"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData?.id ? "Update" : "Create"} Company
        </Button>
      </div>
    </form>
  );
}
