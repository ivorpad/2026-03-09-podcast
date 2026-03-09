"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
} from "@/components/ui/field";
import { companyCreateSchema, type CompanyCreate } from "@/shared/schemas";
import { toast } from "sonner";

interface CompanyFormProps {
  initialData?: CompanyCreate & { id?: number };
  onSubmit: (data: CompanyCreate) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function CompanyForm({
  initialData,
  onSubmit,
  onCancel,
  isPending,
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
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please fix the validation errors");
      return;
    }
    setErrors({});
    onSubmit(result.data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={!!errors.name || undefined}>
          <FieldLabel htmlFor="company-name">Name</FieldLabel>
          <Input
            id="company-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Company name"
            aria-invalid={!!errors.name || undefined}
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="company-industry">Industry</FieldLabel>
          <Input
            id="company-industry"
            value={form.industry ?? ""}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            placeholder="e.g. Technology"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="company-website">Website</FieldLabel>
          <Input
            id="company-website"
            value={form.website ?? ""}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="e.g. https://example.com"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="company-size">Size</FieldLabel>
          <Input
            id="company-size"
            value={form.size ?? ""}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
            placeholder="e.g. 50-100 employees"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="company-notes">Notes</FieldLabel>
          <Textarea
            id="company-notes"
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes about this company"
          />
        </Field>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {initialData?.id ? "Update" : "Create"} Company
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
