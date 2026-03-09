import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import {
  ContactDetailDialog,
  type ContactDetailData,
} from "./contact-detail-dialog";

vi.mock("@/components/contacts/contact-summary", () => ({
  ContactSummaryCard: ({ contactId }: { contactId: number }) => (
    <div data-testid="contact-summary">Summary for {contactId}</div>
  ),
}));

vi.mock("@/components/contacts/contact-enrichment", () => ({
  ContactEnrichmentCard: ({ contactId }: { contactId: number }) => (
    <div data-testid="contact-enrichment">Enrichment for {contactId}</div>
  ),
}));

const baseContact: ContactDetailData = {
  id: 1,
  firstName: "Alice",
  lastName: "Smith",
  email: "alice@example.com",
  phone: "+1 555-0100",
  companyName: "Acme Corp",
  notes: "Key decision maker",
  aiSummary: null,
  deals: [],
};

describe("ContactDetailDialog", () => {
  const onOpenChange = vi.fn();

  beforeEach(() => {
    onOpenChange.mockClear();
  });

  describe("rendering", () => {
    it("shows contact name in the title", async () => {
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={baseContact}
          isLoading={false}
        />
      );
      await expect
        .element(page.getByRole("heading", { name: "Alice Smith" }))
        .toBeVisible();
    });

    it("shows loading title when contact is null", async () => {
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={null}
          isLoading={true}
        />
      );
      await expect
        .element(page.getByRole("heading", { name: "Loading..." }))
        .toBeVisible();
    });

    it("shows description text", async () => {
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={baseContact}
          isLoading={false}
        />
      );
      await expect
        .element(page.getByText("Contact details and AI features"))
        .toBeVisible();
    });

    it("renders nothing visible when open is false", async () => {
      render(
        <ContactDetailDialog
          open={false}
          onOpenChange={onOpenChange}
          contact={baseContact}
          isLoading={false}
        />
      );
      await expect
        .element(page.getByRole("heading", { name: "Alice Smith" }))
        .not.toBeInTheDocument();
    });
  });

  describe("contact fields", () => {
    it("displays email, phone, and company", async () => {
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={baseContact}
          isLoading={false}
        />
      );
      await expect
        .element(page.getByText("alice@example.com"))
        .toBeVisible();
      await expect
        .element(page.getByText("+1 555-0100"))
        .toBeVisible();
      await expect.element(page.getByText("Acme Corp")).toBeVisible();
    });

    it("shows dash for null email, phone, and company", async () => {
      const contact: ContactDetailData = {
        ...baseContact,
        email: null,
        phone: null,
        companyName: null,
      };
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={contact}
          isLoading={false}
        />
      );
      const dashes = page.getByText("-", { exact: true });
      expect(dashes.elements()).toHaveLength(3);
    });

    it("shows notes when present", async () => {
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={baseContact}
          isLoading={false}
        />
      );
      await expect
        .element(page.getByText("Key decision maker"))
        .toBeVisible();
      await expect.element(page.getByText("Notes")).toBeVisible();
    });

    it("hides notes section when notes is null", async () => {
      const contact: ContactDetailData = { ...baseContact, notes: null };
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={contact}
          isLoading={false}
        />
      );
      await expect.element(page.getByText("Notes")).not.toBeInTheDocument();
    });

    it("hides notes section when notes is empty string", async () => {
      const contact: ContactDetailData = { ...baseContact, notes: "" };
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={contact}
          isLoading={false}
        />
      );
      await expect.element(page.getByText("Notes")).not.toBeInTheDocument();
    });
  });

  describe("deals section", () => {
    it("hides deals section when deals is empty", async () => {
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={{ ...baseContact, deals: [] }}
          isLoading={false}
        />
      );
      await expect
        .element(page.getByText("Related Deals"))
        .not.toBeInTheDocument();
    });

    it("shows deals with title, stage, and value", async () => {
      const contact: ContactDetailData = {
        ...baseContact,
        deals: [
          { id: 10, title: "Big Deal", value: 50000, stage: "proposal" },
          { id: 11, title: "Small Deal", value: 500, stage: "lead" },
        ],
      };
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={contact}
          isLoading={false}
        />
      );
      await expect
        .element(page.getByText("Related Deals"))
        .toBeVisible();
      await expect.element(page.getByText("Big Deal")).toBeVisible();
      await expect.element(page.getByText("Small Deal")).toBeVisible();
      await expect.element(page.getByText("$50000")).toBeVisible();
      await expect.element(page.getByText("$500", { exact: true })).toBeVisible();
    });

    it("shows $0 when deal value is null", async () => {
      const contact: ContactDetailData = {
        ...baseContact,
        deals: [{ id: 10, title: "No Value Deal", value: null, stage: "lead" }],
      };
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={contact}
          isLoading={false}
        />
      );
      await expect.element(page.getByText("$0")).toBeVisible();
    });

    it("renders single deal without error", async () => {
      const contact: ContactDetailData = {
        ...baseContact,
        deals: [{ id: 10, title: "Only Deal", value: 1000, stage: "qualified" }],
      };
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={contact}
          isLoading={false}
        />
      );
      await expect.element(page.getByText("Only Deal")).toBeVisible();
    });
  });

  describe("loading state", () => {
    it("shows skeletons when loading", async () => {
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={null}
          isLoading={true}
        />
      );
      // Should not show contact fields
      await expect
        .element(page.getByText("Email"))
        .not.toBeInTheDocument();
    });

    it("does not show contact data while loading even if contact exists", async () => {
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={baseContact}
          isLoading={true}
        />
      );
      // Loading takes precedence — should show skeletons not data
      await expect
        .element(page.getByText("alice@example.com"))
        .not.toBeInTheDocument();
    });
  });

  describe("AI feature cards", () => {
    it("renders summary and enrichment cards with contact id", async () => {
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={baseContact}
          isLoading={false}
        />
      );
      await expect
        .element(page.getByText("Summary for 1"))
        .toBeVisible();
      await expect
        .element(page.getByText("Enrichment for 1"))
        .toBeVisible();
    });

    it("does not render AI cards when contact is null", async () => {
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={null}
          isLoading={false}
        />
      );
      await expect
        .element(page.getByText(/Summary for/))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByText(/Enrichment for/))
        .not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles contact with empty string fields", async () => {
      const contact: ContactDetailData = {
        ...baseContact,
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        companyName: "",
      };
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={contact}
          isLoading={false}
        />
      );
      // Should still render without crashing
      await expect
        .element(page.getByText("Contact details and AI features"))
        .toBeVisible();
    });

    it("handles very long contact name", async () => {
      const longName = "A".repeat(200);
      const contact: ContactDetailData = {
        ...baseContact,
        firstName: longName,
        lastName: "Z",
      };
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={contact}
          isLoading={false}
        />
      );
      await expect
        .element(page.getByRole("heading", { name: `${longName} Z` }))
        .toBeVisible();
    });

    it("handles special characters in notes", async () => {
      const contact: ContactDetailData = {
        ...baseContact,
        notes: '<script>alert("xss")</script> & "quotes" <b>bold</b>',
      };
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={contact}
          isLoading={false}
        />
      );
      // Should render as text, not HTML
      await expect
        .element(
          page.getByText(
            '<script>alert("xss")</script> & "quotes" <b>bold</b>'
          )
        )
        .toBeVisible();
    });

    it("handles many deals without crashing", async () => {
      const deals = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        title: `Deal ${i}`,
        value: i * 100,
        stage: "lead",
      }));
      const contact: ContactDetailData = { ...baseContact, deals };
      render(
        <ContactDetailDialog
          open={true}
          onOpenChange={onOpenChange}
          contact={contact}
          isLoading={false}
        />
      );
      await expect.element(page.getByText("Deal 0")).toBeVisible();
      await expect.element(page.getByText("Deal 49")).toBeVisible();
    });
  });
});
