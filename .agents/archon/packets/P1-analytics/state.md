# P1-analytics — black box

PACKET: P1-analytics
LANE: WEB
CLAIM: apps/web/src/pages/AnalyticsDashboardView.tsx (+ new pure module + node:test file)
GATE: npm run typecheck -w @dental/web
HEAD at start: 0b208ef17edba4b8e145bbdbb3e42ea68cd87267 (NOT f09869601 from the brief — tree moved)

## Milestones
- STARTED 2026-07-28 — packet dir created.
- AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, .agents/UI_STANDARDS.md read complete.
  Also read: benchmark ManagerReportsPanel.tsx, EmptyState.tsx, dente-redesign.css:1-161 tokens,
  apps/api/src/routes/analytics.ts (full handler).
- DEFECT CONFIRMED — dossier citations for AnalyticsDashboardView.tsx are ACCURATE at all 5 sites.

## Confirmed defects (my own eyes, HEAD 0b208ef17)
apps/web/src/pages/AnalyticsDashboardView.tsx
- :45-46  `margin: number; completionRate: number` — type lie. API returns null. CONFIRMED.
- :50-54  formatRub(n) -> `${n} ₽`, no null guard; also no sign handling (neg 5000 -> "-5000 ₽"
          while pos 5000 -> "5K ₽"). CONFIRMED.
- :437-439 `<td className="margin-positive">+{formatRub(doc.margin)}</td>` -> "+null ₽" GREEN. CONFIRMED.
          .margin-positive is `color:#10b981` hardcoded (AnalyticsDashboardView.css:93-95, NOT my claim).
- :444-452 completionRate >= 80 / >= 60 ternary -> null fails both -> RED "null%". CONFIRMED.
- :88-90  `await res.json()` unguarded -> empty body throws; :93 puts err.message straight into
          state; :132 renders it. English exception text in a Russian product. CONFIRMED (static).
- :87     `throw new Error('Ошибка сервера: ' + res.status)` DISCARDS the API's ready-made Russian
          message. API 503 body already carries {message:"Не удалось построить аналитику..."}.
- :89     `if (mounted && json.success)` — success:false sets NEITHER data NOR error. loading=false,
          error=null, data=null -> view renders header and NOTHING else. Silent blank screen.
- :100    setInterval(fetchData,60_000) and fetchData does setLoading(true) -> the whole dashboard is
          replaced by the "Загрузка" box every 60s. Background poll must not flip the loading state.

## Found in passing, SAME defect class, in my claimed file
- :39 type declares cohortLtvJson `"Month 1": number` but analytics.ts:214-218 builds ONLY
      {cohort, "Month 12"} (`void m1;` at :213). :260-267 renders `<Area dataKey="Month 1"
      name="1-й месяц">` — a phantom series + legend entry for a field the server never sends.
      DECISION: fixing it, same disease, same file.
- API already returns `isEmpty` (analytics.ts:267-271) — the empty-but-ok signal EXISTS server-side
      and the client type does not declare it and the view never reads it.

- EDIT WRITTEN 2026-07-28
  - NEW  apps/web/src/pages/analyticsDoctorMetrics.ts (pure: formatRub/formatMarginCell/
         formatCompletionRate/metricToneClass/parseDashboardPayload + honest types)
  - EDIT apps/web/src/pages/AnalyticsDashboardView.tsx (types, 4 states, retry, no res.json())
  - NEW  apps/web/src/tests/analyticsDoctorMetrics.test.ts
- UNIT PASSED 2026-07-28 — `node --import tsx --test apps/web/src/tests/analyticsDoctorMetrics.test.ts`
  -> tests 16 / pass 16 / fail 0, duration 183ms.
- NEXT: running the SLOW compile gate `npm run typecheck -w @dental/web` (tsc over all of apps/web,
  minutes). If I die during it: the three files above are written and the unit test is green;
  just re-run the gate and commit. Nothing else is dirty by me.

- GATE PASSED 2026-07-28 — `npm run typecheck -w @dental/web` EXIT=0, no output.
- COMMITTED 2cb0787d417defbaf22a561311876e09c3349e13
  subject: [ARCHON] fix(аналитика): «+null ₽» зелёным как прибыль и «null%» красным
  3 files, only mine. Russian subject intact, no mojibake. Iron Gate pre-commit hook passed
  (gitleaks: no leaks; Biome skipped, not in PATH).
- NEXT: API probe of GET /api/analytics/dashboard on 127.0.0.1:4100 to see whether margin /
  completionRate really come back null on the live DB. Code is already committed; this proof
  cannot lose work.

- PROVEN 2026-07-28
  - API VERIFIED: org d0000000-…-d001, GET /api/analytics/dashboard?range=all -> 200, 844 bytes,
    two REAL doctors with margin:null completionRate:null. Live payload has NO "Month 1" field.
    Org 4a3420d1-… -> isEmpty:true. Same bytes through shipped client code render "—" neutral
    class=text-[var(--muted)]. Empty body -> Russian message, no English exception.
  - DB VERIFIED: 8 paid payments, 67400.00 RUB, org d0000000-…-d001. payments.amount_rub = numeric
    (the brief said INTEGER — brief is WRONG).
  - UNIT VERIFIED: 16/16 pass.
  - TYPECHECK VERIFIED: EXIT=0 twice (pre-commit, and again on the current tree).
  - Auth gotcha for the next agent: AUTH_TOKEN_SECRET lives in apps/api/.env, NOT root .env.
    Use `node --env-file=apps/api/.env --import tsx <script>` or you get 401 AuthRequired forever.
- COLLISION 2026-07-28: another agent edited MY claimed file AFTER my commit (swapped
  LostPatientsFiltersWidget -> RecallListPanel) and deleted that widget. I did NOT touch it.
  Their edit is uncommitted; tree still typechecks 0. Reported in handoff.md.
- DONE 2026-07-28 — handoff.md written. Nothing of mine left dirty.

## Plan
Extract pure logic to apps/web/src/pages/analyticsDoctorMetrics.ts (new file, no React/CSS import so
node:test can load it), test at apps/web/src/tests/analyticsDoctorMetrics.test.ts (new file).
Both NEW files -> zero collision risk with the other three agents.
