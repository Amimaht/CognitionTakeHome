# Evidence log — 120-minute build

All times UTC, taken from the build VM clock. Start recorded before any setup work.

| Time | Elapsed | Event |
| --- | --- | --- |
| 20:32:39 | 0:00 | **Start.** Node not present on VM; installed Node 22. GitHub repo created. |
| 20:34 | 0:02 | `create-next-app` scaffold; `better-sqlite3`, `vitest`, `tsx` installed. First `npm install -D vitest` failed with ERESOLVE (peer conflict) → retried with `--legacy-peer-deps`. |
| 20:35:59 | 0:03 | Schema, seed, domain modules (`permissions`, `session`, `audit`, `refunds`, `kyc`) committed. `npm run seed` → 24 refunds, 12 KYC, 3 users. |
| 20:37:40 | 0:05 | **Self-fix 1:** Next.js 16 enables `cacheComponents` by default; it rejected `export const dynamic = "force-dynamic"` and 500'd every route. Disabled `cacheComponents`, renamed `middleware.ts` → `proxy.ts` (deprecation warning). |
| 20:39:13 | 0:06 | **First running workflow** verified over HTTP: operator approve → 200 + row updated + 1 audit event; repeat → 409; blank reason → 422; viewer → 403; no identity → 401; unknown id → 404. All pages 200. |
| 20:39:29 | 0:07 | First Vitest run: startup error, `vite` missing (`--legacy-peer-deps` had skipped the peer). Installed `vite`. 20/21 pass; 1 failing on error-message regex (`database is locked` vs `SQLITE_BUSY`) — behaviour correct, assertion wrong. Fixed. |
| 20:39:40 | 0:07 | **21/21 tests pass.** `tsc --noEmit` clean, `eslint` clean after removing one stale directive. |
| 20:40 | 0:08 | Browser verification (Chrome): operator rejects `rf_0002` with reason → page refresh shows Rejected + decision panel; auditor sees both events with before/after JSON in `/audit`; viewer on a pending detail sees no decision form. |
| 20:41 | 0:08 | **Fresh-clone check FAILED:** plain `npm install` hit ERESOLVE (`@types/node@20` vs `vitest@5` peer `^22`). Pinned `@types/node@^22`, reinstalled from scratch, re-ran tests. |
| 20:42:21 | 9:42 | Fresh clone → `npm install` → `seed` → `test` → `next build` all green. See table below. |

## Human interventions

| # | What | Type |
| --- | --- | --- |
| 1 | Plan review before coding (user asked for plan + critique; approved with "keep in mind about time") | Review / scope |
| 2 | "Create a new repo, CognitionTakeHome and record start time" | Direction |
| 3 | Mid-build: "can you add what you are doing here" → status update | Status request |
| 4 | Mid-build: request for build/buy/hybrid analysis after the build | Direction (post-build deliverable) |

No human code edits. No human debugging. All fixes above were agent self-fixes.

## Rework

- Next.js 16 default config (`cacheComponents`) — ~2 min.
- Dependency resolution (`vitest` peer deps, `@types/node` pin) — ~3 min total, found by the fresh-clone check. Would have shipped a broken README without that check.
- One test assertion regex — <1 min.

## Verified behaviour

- Operator approve/reject persists; one audit event per decision with actor, action, record, timestamp, reason, before/after state.
- 403 viewer/auditor, 401 anonymous, 422 invalid input, 409 repeat, 404 unknown — all with no data change (asserted by full-table snapshot comparison in tests).
- Held-lock contention: second connection blocked (`database is locked`), then 409 after first commits; exactly one decision and one audit event survive.
- `UPDATE`/`DELETE` on `audit_events` rejected by triggers.
- Filters (status, search, min amount) applied server-side via URL params.
- KYC read-only queue reuses `DataTable`, `FilterBar`, `StatusBadge`, `requirePermission`; ~60 lines of new code, zero new components.

## Not verified / not done

- No real authentication, SSO, or session signing.
- No integration with any external system.
- No load or true multi-process concurrency test.
- No deployment, monitoring, or backup story.
- No Playwright/browser automation; browser checks were manual.
- Usage cost (ACUs) for this session: **unknown** at time of writing — read from the Devin billing view.
- Active human review time: not measured by the agent; estimate from the session transcript.

## Second-queue effort

KYC queue added inside the main build pass (not as a separate phase), because the shared components
made it a column list plus a query. Marginal cost well under 5 minutes. This supports a limited reuse
claim for *list/detail/permission* tooling only; it says nothing about integrations or complex forms.

## Stop

Implementation stopped at **20:42:21 UTC** (elapsed **9:42** of the 120-minute limit). Remaining time was not used; nothing was cut.
