# Technical Debt Tracker

| Item | Priority | Domain | Notes |
|---|---|---|---|
| No test coverage | High | All | Need at minimum tRPC router tests |
| No global error boundary | Medium | Frontend | Add React error boundary at layout level |
| No mobile responsiveness | Medium | Frontend | Sidebar doesn't collapse |
| Delete cascading | Low | Database | Deleting company leaves orphan contacts |
| No loading skeletons on all pages | Low | Frontend | Dashboard has them, entity pages don't |
| AI retry logic | Low | AI | API failures not retried |
| Stale `updatedAt` on related entities | Low | Database | Updating a deal doesn't touch the contact's `updatedAt` |
