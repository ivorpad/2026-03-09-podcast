# New User Onboarding

## Goal

A new user should understand the CRM and create their first contact within 60 seconds.

## Current State

- App opens to dashboard showing stats (all zeros for new user)
- User navigates to Contacts/Companies/Deals via sidebar
- Create forms are in dialog modals

## Desired Flow

1. Dashboard shows empty state with clear CTA: "Add your first company"
2. After first company, prompt: "Add a contact at {company}"
3. After first contact, prompt: "Create a deal for {contact}"
4. Dashboard then shows meaningful data

## Acceptance Criteria

- [ ] Empty state components for dashboard, contacts, companies, deals
- [ ] Guided flow linking company → contact → deal creation
- [ ] Dashboard shows contextual CTAs based on what data exists
