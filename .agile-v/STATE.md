# Agile V — Project State

| Field | Value |
|-------|-------|
| **Cycle** | C1 |
| **Phase** | `phases/01-sentry-groq-select` |
| **Infinity Loop stage** | Verify → Evolve (Human Gate 2 pending) |
| **Last updated** | 2026-05-19 |
| **Active REQ range** | REQ-0001 … REQ-0013 |
| **Prod deploy target** | `9a2e37c` (REQ-0013); docs HEAD `c0e15b3` |
| **Human Gate 1** | APPROVED (retroactive bootstrap) |
| **Human Gate 2** | PENDING — Sentry 24h + manual nav smoke |
| **Resume token** | — |

## Current focus

1. **REQ-0009** — 24h Sentry regression after prod deploy (`docs/SENTRY_ERRORS.md`)
2. **REQ-0001/0006** — manual removeChild nav smoke (optional)
3. **C2** — new work only via new REQ-XXXX + Infinity Loop

## Session resume (every chat)

1. Read `.agile-v/STATE.md` + `.agile-v/REQUIREMENTS.md`
2. Load skill: `.agile-v/skills/SKILLS_INDEX.md` (01 core → task skill)
3. Cursor rule active: `.cursor/rules/agile-v-core.mdc` (`alwaysApply: true`)
4. Red Team: `npm run lint && npm run test && npm run test:invalidate && npm run build`
5. Write-through on material change: `DECISION_LOG.md`, `BUILD_MANIFEST.md`, `VALIDATION_SUMMARY.md`

## Pipeline (V-model)

```
[Specify ✓] → [Constrain ✓] → [Orchestrate ✓] → [Prove ✓] → [Verify ◐] → [Evolve ◐]
```

## C1 completion snapshot

| Area | Status |
|------|--------|
| Sentry/Groq/Select (REQ-0001–0007) | code done; manual QA partial |
| Agile V bootstrap (REQ-0008) | done |
| Zod + 4xx logging (REQ-0010–0013) | done, 284 tests |
| TanStack invalidation | unchanged; 200 audit pass |
