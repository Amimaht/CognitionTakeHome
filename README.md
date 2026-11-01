# CognitionTakeHome — Refunds Review (internal tool prototype)

A small internal review tool built with Devin in a hard 120-minute timebox, to test whether
Devin-built custom software can stand in for a Power Apps-style internal tool. It implements one
complete operational decision — approving or rejecting a refund request — with server-enforced
permissions, explicit state transitions, and transactional audit history. A second, read-only KYC
queue shows how much of the foundation a new queue reuses.

**Approval only changes the local review record. No money moves.** All data is synthetic.

## Run it

Requires Node 20+ (built and tested with Node 22).

```bash
npm install
npm run seed     # creates data/app.db with 24 refund requests, 12 KYC cases, 3 demo users
npm run dev      # http://localhost:3000
npm test         # 21 Vitest tests
```

`npm run seed` is idempotent. Delete `data/app.db` to reset.

## Demo identities

The yellow banner at the top lets you pick a demo identity. **This is not authentication.** The
browser stores only a user id in a cookie; the server looks the role up in the `users` table on
every request and never trusts a role sent by the client. It exists to show role enforcement, not
login.

| Identity | Role | Can |
| --- | --- | --- |
| Vera Viewer | `viewer` | read refunds, read KYC |
| Oscar Operator | `operator` | read refunds, **decide pending refunds**, read KYC |
| Audrey Auditor | `auditor` | read refunds, read KYC, **read audit log** |

## The workflow

1. Operator filters pending requests (`/refunds`), opens one (`/refunds/rf_0002`).
2. Enters a reason and clicks Approve or Reject.
3. `POST /api/refunds/:id/decision` resolves the actor from the session, then calls
   `decideRefund()` which checks permission → validates input → runs one transaction:
   conditional `UPDATE ... WHERE id = ? AND status = 'pending'` + audit event insert.
4. The page re-renders from the database; refreshing shows the saved decision.

| Case | Response | Data changed? |
| --- | --- | --- |
| Operator, valid reason, pending request | 200 | yes — status + one audit event |
| Viewer or auditor attempts a decision | 403 | no |
| No identity | 401 | no |
| Missing/blank/too-long reason, invalid decision | 422 | no |
| Request already decided (repeat or competing) | 409 | no |
| Unknown request id | 404 | no |

Try the forbidden path directly:

```bash
# pick viewer, then try to decide
curl -s -c jar -X POST -d "userId=u_viewer" http://localhost:3000/api/demo-session -o /dev/null
curl -s -b jar -X POST -H 'content-type: application/json' \
  -d '{"decision":"approved","reason":"viewer try"}' http://localhost:3000/api/refunds/rf_0002/decision
# -> {"error":"Missing permission: refund:decide"}  (403)
```

## Layout

```
src/lib/
  schema.sql        tables + append-only triggers on audit_events
  db.ts             better-sqlite3 connection, schema apply
  seed.ts           deterministic synthetic data
  permissions.ts    role -> permission map, requirePermission()
  session.ts        demo cookie -> user row -> Actor (server-side lookup)
  audit.ts          writeAuditEvent() (called inside the decision transaction)
  refunds.ts        listRefunds / getRefund / decideRefund + typed domain errors
  kyc.ts            read-only KYC query
  http.ts           domain error -> HTTP response, formatters
src/components/     DataTable, DetailPanel, FilterBar, StatusBadge, DecisionForm, DemoIdentityBanner
src/app/
  refunds/          queue + detail (decision form rendered only for roles with refund:decide)
  kyc/              second queue; reuses DataTable, FilterBar, StatusBadge, permissions
  audit/            auditor-only log with before/after state
  api/refunds/[id]/decision   POST decision
  api/demo-session            demo identity switcher
tests/              Vitest: permissions, validation, transitions, lock contention, append-only audit
```

## What the tests verify

- Operator approve/reject persists and writes exactly one audit event with before/after state.
- Viewer, auditor, and anonymous decisions fail (403/401) with no data change.
- Missing, blank, non-string, over-length reasons and invalid decisions fail (422) with no change.
- Repeated decision on a decided request fails (409); still exactly one audit event.
- Competing connection: while one connection holds the write lock mid-decision, a second
  connection's decision is blocked (`database is locked`), and after the first commits the second
  gets 409. Only one decision and one audit event survive.
- `UPDATE`/`DELETE` on `audit_events` are rejected by triggers.

## Limitations (deliberate, for a 2-hour prototype)

- **No real authentication.** Demo identity cookie is unsigned; anyone can pick "operator".
- **Audit log is append-only at the SQL layer, not immutable.** Anyone with the database file can edit it.
- **SQLite, single process.** Moving to Postgres needs migrations, a connection pool, and re-verification
  of the locking behavior; it is not a drop-in swap.
- **No integrations.** Power Apps' connector ecosystem (payments, CRM, Dataverse) is not represented.
- **No payment execution, no PII, no deployment, no monitoring.**
- The lock-contention test proves the conditional update holds under a held lock; it is not a
  load test.

## Reuse evidence

The KYC queue (`src/app/kyc/page.tsx` + `src/lib/kyc.ts`) is ~60 lines and adds no new components:
it declares a column list and a query against the shared `DataTable`, `FilterBar`, `StatusBadge`
and `requirePermission`. See `EVIDENCE.md` for timings.
