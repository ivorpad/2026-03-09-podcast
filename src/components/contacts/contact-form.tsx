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
import { contactCreateSchema, type ContactCreate } from "@/shared/schemas";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ContactFormProps {
  initialData?: ContactCreate & { id?: number };
  onSubmit: (data: ContactCreate) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function ContactForm({
  initialData,
  onSubmit,
  onCancel,
  isPending,
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
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.firstName || undefined}>
            <FieldLabel htmlFor="contact-first-name">First Name</FieldLabel>
            <Input
              id="contact-first-name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="First name"
              aria-invalid={!!errors.firstName || undefined}
            />
            {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.lastName || undefined}>
            <FieldLabel htmlFor="contact-last-name">Last Name</FieldLabel>
            <Input
              id="contact-last-name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Last name"
              aria-invalid={!!errors.lastName || undefined}
            />
            {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
          </Field>
        </div>
        <Field data-invalid={!!errors.email || undefined}>
          <FieldLabel htmlFor="contact-email">Email</FieldLabel>
          <Input
            id="contact-email"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@example.com"
            aria-invalid={!!errors.email || undefined}
          />
          {errors.email && <FieldError>{errors.email}</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="contact-phone">Phone</FieldLabel>
          <Input
            id="contact-phone"
            value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="contact-company">Company</FieldLabel>
          <NativeSelect
            id="contact-company"
            className="w-full"
            value={form.companyId ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                companyId: e.target.value ? Number(e.target.value) : undefined,
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
        <Field>
          <FieldLabel htmlFor="contact-notes">Notes</FieldLabel>
          <Textarea
            id="contact-notes"
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes about this contact"
          />
        </Field>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {initialData?.id ? "Update" : "Create"} Contact
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
