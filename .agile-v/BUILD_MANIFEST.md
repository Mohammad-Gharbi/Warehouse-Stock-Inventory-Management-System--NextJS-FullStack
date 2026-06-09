# Build Manifest — Cycle C1

**Cycle:** C1 | **Risk:** R2 | **Stack:** Next.js 16 / Prisma / MongoDB

## Artifacts (selected)

| ART-ID | REQ-ID | Location | Notes |
|--------|--------|----------|-------|
| ART-0001 | REQ-0001 | `hooks/use-deferred-radix-select.ts` | Defer Radix Select mount |
| ART-0002 | REQ-0001 | `components/shared/DeferredSelectGate.tsx` | Reusable gate |
| ART-0003 | REQ-0001 | `components/shared/PaginationSelector.tsx` | Table page-size |
| ART-0004 | REQ-0001 | `components/orders/OrderDialog.tsx` | Dialog Select gates |
| ART-0005 | REQ-0001 | `components/products/ProductFormDialog.tsx` | Dialog Select gates |
| ART-0006 | REQ-0001 | `components/invoices/InvoiceDialog.tsx` | Dialog Select gates |
| ART-0007 | REQ-0002 | `lib/ai/openrouter.ts` | OpenRouter client |
| ART-0008 | REQ-0005 | `lib/ai/groq.ts` | Groq client + resolveGroqModel |
| ART-0009 | REQ-0005 | `lib/ai/create-chat-completion.ts` | Orchestrator |
| ART-0010 | REQ-0005 | `lib/ai/types.ts` | Shared LLM types |
| ART-0011 | REQ-0002, REQ-0005 | `app/api/ai/insights/route.ts` | Insights API |
| ART-0012 | REQ-0005 | `app/api/forecasting/route.ts` | Forecasting AI helper |
| ART-0013 | REQ-0003 | `lib/auth/unique-username.ts` | OAuth username |
| ART-0014 | REQ-0003 | `app/api/auth/oauth/google/callback/route.ts` | P2002 recovery |
| ART-0015 | REQ-0004 | `app/page.tsx` | SSR home, no Suspense |
| ART-0016 | REQ-0007 | `components/shared/NotificationBell.tsx` | DropdownMenu portal |
| ART-0017 | REQ-0007 | `components/shared/NotificationDropdown.tsx` | Panel content |
| ART-0018 | REQ-0007 | `components/layouts/Navbar.tsx` | overflow fix |
| ART-0019 | REQ-0008 | `.agile-v/*` | Agile V state |
| ART-0020 | REQ-0008 | `.cursor/rules/agile-v-core.mdc` | Cursor rule |

## Tests

| TC-ID | REQ-ID | Location |
|-------|--------|----------|
| TC-0001 | REQ-0002 | `lib/ai/openrouter.test.ts` |
| TC-0002 | REQ-0005 | `lib/ai/groq.test.ts` |
| TC-0003 | REQ-0005 | `lib/ai/create-chat-completion.test.ts` |
| TC-0004 | REQ-0003 | `lib/auth/unique-username.test.ts` |
