# Build vs. buy vs. hybrid: Devin-built internal tools or Power Apps

Written after the prototype, from observed results. Scenario: Series C fintech, ~60 engineers,
$250K/yr internal-tools platform bill, 3 Power Apps in production (KYC queue, refunds dashboard,
feature-flag admin), 10+ more planned.

## Recommendation in one sentence

**Keep the three existing Power Apps; build the new tools with Devin on one shared internal-tools
foundation, gated by a four-week production pilot; decide at contract renewal whether to migrate
the existing three.** This is a hybrid as a *transition*, not a permanent two-platform estate.

It flips to **"stay fully on Power Apps"** if the pilot shows either (a) operations teams need to
change tools themselves without engineering, or (b) a representative integration costs more than a
week of engineering to build and keep working.

It flips to **"replace Power Apps"** only if, after the pilot, the contract review shows the bill is
actually removable (not bundled into an E5/Dynamics agreement) and measured ownership effort stays
below ~1 FTE.

## What the prototype showed (facts)

| Measure | Observed |
| --- | --- |
| Build time, start to verified + pushed | 9m 42s of a 120-minute limit (VM clock; see EVIDENCE.md) |
| Time to first working end-to-end decision | ~6.5 minutes |
| Scope delivered | Refunds queue with filters, detail, approve/reject with reason, 3 roles enforced server-side, transactional audit with before/after state, append-only triggers, read-only KYC queue, 21 tests, README, fresh-clone verified |
| Human code edits | 0 |
| Human interventions | 4, all direction/status (plan review, repo name, "what are you doing", add the evaluation) |
| Agent self-fixes | 3 (framework default, dependency resolution ×2) |
| Defects caught only by verification | 1 — plain `npm install` failed on a fresh clone; would have shipped a broken README |
| Usage cost (ACUs) | Unknown at time of writing — read from billing |
| Human active review time | Not instrumented; estimate from session transcript |

Context that matters as much as the numbers: **planning took longer than building.** Research, the
written plan, and the plan critique consumed more wall-clock than the implementation. The agent did
not need the 120 minutes; it needed a precise specification and someone to check the result.

## What it does *not* establish

- Annual maintenance cost. One build, no subsequent change request, no incident.
- Security assurance. Demo identity, not SSO; SQLite; no secrets handling; no pen test.
- Integration cost. Zero external systems touched. Power Apps' connectors are its core value and
  were not represented at all.
- Operations/BA self-service. Every change to this app goes through a pull request. That is the
  opposite of the Power Apps maker model.
- Scale of reuse. One second queue, ~60 lines, same shape as the first. Says nothing about a
  feature-flag admin panel, approval chains, or document-heavy KYC.

## Evaluation across the four axes

### Build cost

Observed: low. A spec-complete CRUD-with-permissions tool in under ten minutes of agent time plus
~30 minutes of human planning and review. Extrapolating linearly to ten tools is wrong — the first
tool absorbed the framework setup — but the direction is clear: **initial build is not where the
cost lives.** Power Apps would also take hours, not weeks, for the same shape.

Where build cost *will* appear: identity (SSO/OIDC wiring, group→role mapping), one shared
deployment target, and the first integration per external system. Budget those as platform work,
once, not per tool.

### Maintenance burden

Unknown and the decisive variable. What the prototype changes about the question:

- The shared foundation (`permissions`, `audit`, `DataTable`, `FilterBar`) means a fix lands once.
  With Power Apps, the same control fix is often per-app.
- Every change is a PR with tests. That is a *cost* for small tweaks ("add a column") and a
  *benefit* for anything touching money or audit.
- Framework churn is real and already showed up: Next.js 16 changed a default and broke every route
  for two minutes. On Power Apps, Microsoft absorbs that class of change; here the team does.

Realistic ownership estimate for a 10–13 tool estate on one foundation: 0.5–1.0 FTE, *if*
integrations are few and identity/deployment are already solved. Treat that as a hypothesis for
the pilot to test, not a finding.

### Security implications

- Server-side enforcement was trivial to get right because the agent was told exactly what "right"
  meant (role from DB, never from client; permission check before validation before state). The
  risk is not that Devin can't do it; it's that nobody writes the requirement and nobody checks.
  **Review discipline is the control.**
- Audit trail quality is *higher* than default Dataverse auditing (before/after per decision,
  append-only at SQL layer) — and also entirely the team's problem to protect, retain, and prove.
- Power Apps brings DLP policies, environment isolation, and Microsoft's compliance posture for
  free-ish. A custom stack must reuse the company's existing controls (SSO, secrets manager, log
  retention) or re-create them. For a regulated fintech, that review is a real cost; the prototype
  did none of it.

### Opportunity cost of engineering time

Sixty engineers; internal tools are not the product. The relevant cost is not Devin's build time
but senior engineers' *review and ownership* time, plus on-call. If each new tool needs a
half-day of senior review and the estate needs 0.5–1.0 FTE, that is ~$100–200K/yr of loaded
engineering not spent on the product. Against a $250K bill, the margin is thin unless the bill is
genuinely avoidable.

## The three options

| | Buy (stay on Power Apps) | Build (replace) | Hybrid (recommended) |
| --- | --- | --- | --- |
| Cash | $250K/yr continues, likely grows with users | Removable only if contract allows; often bundled | Full bill continues short-term; licensing review decides later |
| Engineering | Low; but connectors, formulas, ALM still need owners | 0.5–1.0 FTE est. + platform setup + migration of 3 apps | Platform setup once; ~0.3–0.5 FTE for new tools during pilot |
| Risk | Vendor lock-in, per-user cost growth, limited customisation | Migration of working apps; security review from scratch; framework ownership | Two operating models for a period; must set an end date |
| Reversibility | High | Low once migrated | High — pilot can be abandoned without touching production tools |
| What it learns | Nothing new | Everything, expensively | Real maintenance, integration and review cost before committing |

Build-all-ten-now is rejected because the prototype measured only the cheap part. Stay-fully is
rejected because the one measurable axis (build cost) came in far below expectation and the client
has ten tools on the roadmap — not running the experiment leaves money on the table.

## Economics without false precision

From the earlier break-even framing (loaded engineer $200K/yr; ~$40K/yr additional non-labor cost
for hosting, tooling, Devin usage):

| Avoidable license expense | Engineering allowance before savings vanish |
| --- | --- |
| $250K (full bill removable) | ~1.05 FTE |
| $100K (partial) | ~0.30 FTE |
| $0 (bundled, not removable) | none — build is a customisation decision, not a savings decision |

The prototype pushed the *build* half of the FTE estimate down. It left the *integration,
security review and operations* half untouched. So the honest statement is: a full replacement
is **plausibly** inside the 1.05 FTE allowance, and **certainly not** inside the 0.30 FTE
allowance. Find out which row the client is in before anything else — that is a procurement
question, not an engineering one.

Devin usage cost for this session is unknown; do not plug in a fixed annual figure.

## Pilot design (four weeks, one new tool)

1. **Pick a new tool** with low blast radius and at least one real integration (e.g. a
   chargeback-evidence queue that reads from the payment provider's API). Not refunds — it already
   exists in Power Apps.
2. **Platform work first** (one-time): SSO → role mapping, one deployment target, Postgres,
   secrets, log shipping. Use what the company already runs.
3. **Measure**: agent time, human review time per PR, defects found in review vs. after merge,
   time for one *change request* after launch, on-call pages.
4. **Gates at week 4**: integration shipped and stable; one change request completed under a
   day of human time; security review passed with no architectural rework; ops users have not
   asked for self-service.
5. **Procurement in parallel**: get the contract. Identify what is removable at renewal and when.

## What would change the recommendation

- Contract shows the $250K is not removable → hybrid loses its savings leg; keep building only if
  customisation is worth ~0.5 FTE on its own merits.
- Ops teams routinely edit the Power Apps themselves → stay; the PR model will slow them down.
- Pilot integration takes more than ~a week of human time → stay; connectors are the moat.
- Pilot clears every gate and the bill is removable → plan migration of the three existing apps
  over the following two quarters, oldest-contract-first.

## Limits of this evaluation

Written by the same agent that built the prototype, from a single ten-minute build with no
production exposure. The numbers in the economics section are decision thresholds, not forecasts.
The strongest finding is qualitative: **with a precise spec and a verification step, build time is
negligible; the cost of this path is specification, review, integration and ownership.** That is
what the pilot must price.
