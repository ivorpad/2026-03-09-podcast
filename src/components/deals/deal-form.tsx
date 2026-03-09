"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
} from "@/components/ui/field";
import {
  dealCreateSchema,
  dealStages,
  type DealCreate,
} from "@/shared/schemas";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DealFormProps {
  initialData?: DealCreate & { id?: number };
  onSubmit: (data: DealCreate) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function DealForm({
  initialData,
  onSubmit,
  onCancel,
  isPending,
}: DealFormProps) {
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
        <Field data-invalid={!!errors.title || undefined}>
          <FieldLabel htmlFor="deal-title">Title</FieldLabel>
          <Input
            id="deal-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Deal title"
            aria-invalid={!!errors.title || undefined}
          />
          {errors.title && <FieldError>{errors.title}</FieldError>}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="deal-value">Value ($)</FieldLabel>
            <Input
              id="deal-value"
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
          </Field>
          <Field>
            <FieldLabel htmlFor="deal-stage">Stage</FieldLabel>
            <NativeSelect
              id="deal-stage"
              className="w-full"
              value={form.stage}
              onChange={(e) =>
                setForm({
                  ...form,
                  stage: e.target.value as DealCreate["stage"],
                })
              }
            >
              {dealStages.map((stage) => (
                <NativeSelectOption key={stage} value={stage}>
                  {stage}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="deal-contact">Contact</FieldLabel>
            <NativeSelect
              id="deal-contact"
              className="w-full"
              value={form.contactId ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  contactId: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            >
              <NativeSelectOption value="">No contact</NativeSelectOption>
              {contacts.data?.items.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="deal-company">Company</FieldLabel>
            <NativeSelect
              id="deal-company"
              className="w-full"
              value={form.companyId ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  companyId: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            >
              <NativeSelectOption value="">No company</NativeSelectOption>
              {companies.data?.items.map((c) => (
                <NativeSelectOption key={c.id} value={c.id}>
                  {c.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="deal-notes">Notes</FieldLabel>
          <Textarea
            id="deal-notes"
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes about this deal"
          />
        </Field>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {initialData?.id ? "Update" : "Create"} Deal
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
