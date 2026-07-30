# ADVERSARIAL REVIEW — W3-unreachable-views

Commit under attack: `41a22b63dec9291ce6e539a47f44102cda8d44c3`
Reviewer: adversarial (did not write this code). Posture: disbelief.
Status: IN PROGRESS — written incrementally.

## 0. Preconditions

- `git status --porcelain`: `apps/web/src/App.tsx` is **NOT** in the dirty list. App.tsx is CLEAN. Precondition satisfied, no second author to stop for.
- Dirty at review time (unrelated to this packet): `.agents/AGENTS.md`, `apps/api/.data/*.json`, `apps/web/tsconfig.tsbuildinfo`, `packages/shared/dist/*`, `scratch/audit-settings-props.mjs`. None are packet files.
- HEAD is `54db1c590`, i.e. 3 commits AFTER the packet commit. Any HEAD-level check must be read as "HEAD, not the packet commit".

## 1. Commit stat re-derived (CONFIRMED)

`git show --stat` = 13 files, **+792 / -2966**. Matches the claim exactly.

(sections below appended as work proceeds)

## 2. Was the defect REAL at the parent? — CONFIRMED

Reproduced at `41a22b63d^`:
- `workspaceShell.tsx:29` `appViews` = 11 entries, none of `inventory`/`scanner`/`leads`.
- `AppHelpers.tsx viewFromHash()` validates `hash.split("/")[0]` against `appViews` and returns `"shift"` otherwise. So `#inventory` really did land on Смена.
- `git grep -n "AppRouter" 41a22b63d^ -- apps/` returns only: the file's own `export function AppRouter()`, two prose comments, and the old test. **No module imported it.** Dead code confirmed by re-derivation, not by trusting its header.

The defect was real. Three complete views were unreachable by menu and by URL.

## 3. Deletions — CONFIRMED CLEAN

- `git grep -n "PayrollView" HEAD -- apps/` → no output.
- `git grep -n "OmnichannelInboxView" HEAD -- apps/` → no output.
- `git grep -n "AppRouter" HEAD -- apps/` → 10 hits, **all** prose comments (App.tsx x4, workspaceShell x1, test x4) plus the `existsSync` guard at `panelsAreMounted.test.ts:211`. No import, no JSX, no path reference. Matches the claim exactly.
- Negative API claim CONFIRMED live: `/api/billing/payouts` 404, `/api/communications/inbox` 404, `/api/communications/patients/search?q=a` 404, while `/api/inventory/<org>` 401, `/api/sterilization/logs` 401, `/api/leads` 401. 401 vs 404 is the right discriminator and it holds.

## 4. UNIT proof — CONFIRMED, reproduced verbatim

`node --import tsx --test src/tests/panelsAreMounted.test.ts src/__tests__/workspaceShellNav.test.ts` (cwd `apps/web`)
→ `tests 12 / pass 12 / fail 0`, **TRUE_EXIT=0**. Exactly as claimed.

## 5. "GUARD PROVEN TO BITE" — CONFIRMED by independent mutation

I did not trust this. I copied `apps/web/src` to `scratch/w3rev/src` (source untouched) and mutated the copy.

Removing only `analytics: () => import("./pages/AnalyticsDashboardView"),`:
```
✖ каждый раздел из реестра умеет предзагружаться
AssertionError: ... не зарегистрированы в workspacePreload.ts: analytics
    actual: [ 'analytics' ], expected: []
TRUE_EXIT=1
```
Byte-for-byte the failure the builder claimed. The `analytics` preload gap was a real pre-existing defect and the new guard really is what found it.

Removing the `currentView === "scanner"` branch from App.tsx:
```
✖ каждый раздел из реестра отрисовывается в App.tsx
    actual: [ 'scanner' ]
TRUE_EXIT=1
```
Both new couplings bite. Old test file had **2** tests, new has **5** — claim confirmed.

## 6. HOLE IN THE NEW GUARD — the one test that asserts what it does not check

`panelsAreMounted.test.ts:178` — test named **"модуль каждого предзагружаемого раздела действительно существует"**, error text: *"Опечатка в пути молчит: import() внутри void-вызова только отклоняет промис."*

It claims to catch a silent path typo. It cannot. `:187` resolves by **basename only**, discarding the directory:
```ts
const base = path.basename(specifier);
if (!reachableNames.has(`${base}.tsx`) && !reachableNames.has(`${base}.ts`)) broken.push(...)
```
Proof on the copy — I changed `leads: () => import("./components/leads/LeadsKanbanView")` to `import("./totally/wrong/LeadsKanbanView")`, a directory that does not exist:
```
pass 5  fail 0   TRUE_EXIT=0
```
Green. The exact failure mode the test is named after passes.

Second, weaker point: `reachableFromEntry()` walks `import("…")` strings, and `workspacePreload.ts` is itself reachable, so **its own** `import()` lines are what make those modules "reachable". The reachability half of that assertion is circular and can only ever fail if no file with that basename exists anywhere in `src`.

Not shipped-broken: I verified all four real targets resolve (`components/InventoryView.tsx`, `ScannerView.tsx`, `components/leads/LeadsKanbanView.tsx`, `pages/AnalyticsDashboardView.tsx`). This is a latent defect in a guard, in a packet whose thesis is that guards must bite.

## 7. ★ BUILD-BREAKING DEFECT — the named closing gate is RED, and this packet made it red

`npm run typecheck -w @dental/web` → **TRUE_EXIT=1**, three errors, all three of this packet's new branches:

```
src/App.tsx(4775,40): error TS2769: Type '"inventory"' is not assignable to type 'LazyWorkspaceView'.
src/App.tsx(4789,40): error TS2769: Type '"scanner"' is not assignable to type 'LazyWorkspaceView'.
src/App.tsx(4797,40): error TS2769: Type '"leads"' is not assignable to type 'LazyWorkspaceView'.
```

Root cause — `apps/web/src/workspaceRouteErrorBoundary.tsx:3` is a hand-written duplicate of the view registry:
```ts
export type LazyWorkspaceView = "schedule" | "patients" | "documents" | "finance" | "communications" | "settings" | "visit" | "imaging" | "marketing" | "analytics";
```
Ten names. Not `inventory`, not `scanner`, not `leads`. The packet wrapped all three new routes in `<WorkspaceRouteErrorBoundary view="inventory" …>` and never extended the union.

Proof it is packet-introduced, not pre-existing:
- `git show 41a22b63d^:apps/web/src/workspaceRouteErrorBoundary.tsx | sed -n 3p` → **byte-identical** union at the parent.
- `workspaceRouteErrorBoundary.tsx` is **NOT in the commit's file list**.
- `git grep -c 'view="inventory"\|view="scanner"\|view="leads"' 41a22b63d^ -- apps/web/src` → **zero** call sites at the parent.
- The only three call sites at HEAD are `App.tsx:4775 / 4789 / 4797`, all added by `41a22b63d`.
- These three are the **only** errors tsc reports. The gate was green; this packet turned it red.

Runtime blast radius is small — `view` is used only at `:114` (`console.error`) and `:118` (prop comparison), so the dev server renders fine. That is exactly the trap AGENTS.md §10 exists for: **the production compile gate is broken while the screen looks right.** `npm run build` cannot pass.

### Why this is the packet's central failure, not a nit

The packet's thesis is *"a view exists only if it is in THREE places, and I rewrote the guard from a name list to the actual coupling."* There is a **FOURTH** place — `LazyWorkspaceView` — and the rewritten guard does not check it. So the new `panelsAreMounted.test.ts` goes **12/12 green on a tree that does not compile.** The guard was rebuilt around an incomplete model of the coupling it was built to protect.

Mitigating, and it counts: the builder did **not** claim types. It listed TYPES under CLAIMED NOT PROVEN, named `npm run typecheck -w @dental/web` as the closing command, and named *"the three new App.tsx branches"* as a highest-risk spot. The brief also explicitly forbade it from running the gate (§7a shared `.tsbuildinfo`). So this is honest reporting of a real risk that then materialised — not fabricated proof. It is still a red gate at HEAD and the packet cannot close.

`npm run build -w @dental/web` (`tsc -b && vite build`) → **BUILD_TRUE_EXIT=1**, same three errors. No dist is produced. The production build is broken at HEAD.

## 8. Other claimed proofs re-run — all CONFIRMED

| Claim | My re-run | Verdict |
|---|---|---|
| `node scripts/check-css-tokens.mjs` exit 0, `0 имён, 0 вхождений` | `НЕ РАЗРЕШАЕТСЯ НИ В ОДНОЙ ТЕМЕ: 0 имён, 0 вхождений`, 178 var() names, TRUE_EXIT=0 | CONFIRMED |
| `npm run smoke:web-text-encoding` exit 0, 416 files, 0 mojibake | `"ok": true, "checkedFiles": 416, "mojibakeHits": 0, "garbledQuestionHits": 0`, TRUE_EXIT=0 | CONFIRMED |
| REST OF THE WEB SUITE — declared NOT PROVEN | I ran it: `npm test -w @dental/web` → `tests 567 / pass 567 / fail 0`, TRUE_EXIT=0 | **GREEN — closed in the packet's favour** |

## 9. Red smokes that are NOT this packet's — checked before blaming

I refuse to charge the packet for pre-existing rot, so I established the baseline instead of assuming:

- `smoke:workspace-shell-source` → TRUE_EXIT=1 (`.nav-copy small { display: none;`, ScheduleView smooth scroll). Both inputs are `apps/web/src/styles/main.css` and ScheduleView. `git diff 41a22b63d^ HEAD` on both → **empty, byte-identical**. Neither file is in the commit. **Already red at the parent.** Not this packet.
- `smoke:web-render-gating-source` → TRUE_EXIT=1. Its `missingRequired` snippets (`["schedule","patients",…].includes(currentView)`, `className="compliance-bar"`) count **0 at the parent and 0 at HEAD**. **Already red at the parent.** Not this packet.
- `smoke:web-code-split-source` → TRUE_EXIT=0, green.
- `smoke:core-route-validation` → TRUE_EXIT=1, live-API assertion, unrelated files. Not attributed.

## 10. IS THE FIX REACHABLE BY A REAL USER? — CONFIRMED

I ran the packet's own reachability walker (copied verbatim out of its new guard) over `apps/web/src` from `main.tsx`:

```
REACHABLE     InventoryView.tsx
REACHABLE     ScannerView.tsx
REACHABLE     LeadsKanbanView.tsx
REACHABLE     AnalyticsDashboardView.tsx
total reachable: 245 of 318
```

Chain verified end to end: `appViews` (14) → `viewFromHash()` validates against it → hashchange listener `useAppLogic.tsx:4346` → **hard route guard `useAppLogic.tsx:4359` `getFilteredAppViews(selectedWorkspaceRole)` with forced `setCurrentView("shift")`** → `App.tsx` branch. The builder's claim that the role list is a hard route guard the dossier missed is correct — I read the effect.

Who can actually open each (re-derived by executing the real functions):
```
inventory  doctor, assistant, administrator, owner
scanner    doctor, assistant, owner
leads      administrator, manager, owner
```
Not dead code sold as a fix. This is real.

## 11. MEASUREMENTS RE-DERIVED — one is FALSE

| Claim | Re-derived | Verdict |
|---|---|---|
| 13 files, +792 / -2966 | numstat sums to exactly +792 / -2966 | CONFIRMED |
| appViews 11 to 14 | 11 to 14 | CONFIRMED |
| doctor 8-10, assistant 6-8, admin 7-9, manager 6-7, owner 11-14 | executed the real functions: 10 / 8 / 9 / 7 / 14; parent 8/6/7/6/11 | CONFIRMED |
| **"13 for solo_doctor"** | `getVisibleRailViews("owner","solo_doctor").length` = **12** | **WRONG** — the same function drops `marketing` too, not only `leads`; the builder counted one removal |
| leads 6/6, sterilization 3/3 endpoints | `routes/leads.ts` = 6, `routes/sterilization.ts` = 3 | CONFIRMED |
| payroll 0/1, inbox 0/4 | live 404 on all four; `payouts` appears in `apps/api/src` only in the debt list | CONFIRMED |
| `.sidebar{min-height:100vh}` no overflow at `dente-redesign.css:281`; `.sidebar nav{gap:2px}`; `.nav-item{padding:9px 10px}` | line 281 exact, gap:2px line 300, padding 9px 10px line 303, no overflow rule anywhere on `.sidebar` | CONFIRMED to the line number |
| **"Deleted 4,689 lines of unreachable view code and 359 lines of dead router"** | **FALSE — see below** | **FALSE** |

### The 4,689 figure is not a deletion count

Whole-file deletions in the commit: `PayrollView 871` + `OmnichannelInboxView.tsx 1306` + `OmnichannelInboxView.css 275` + `AppRouter 359` = **2,811**.

`4,689` = `1366 + 867 + 996 + 1306 + 154` — the **brief's** per-file counts for all **five** views, three of which were **kept and routed**. The line therefore claims as deleted 2,237 lines that are still in the tree, and its own next clause (`-2966`) contradicts it. Claimed 5,048 deleted vs 2,811 actual: overstated 80%.

It also uses stale per-file counts the builder itself corrected elsewhere: real parent counts are InventoryView **1487** (not 1366), PayrollView **871** (not 867), ScannerView **192** (not 154) — five-view total **4,852**. The commit body writes 1487; the MEASUREMENTS line writes 1366. Internally inconsistent.

"Five views, 4,689 lines, reachable by nobody" is defensible as scope. "**Deleted** 4,689 lines" is not.

## 12. THE PACKET WEAKENED AN EXISTING ANTI-REGRESSION RATCHET

`apps/api/src/tests/webCallsExistingRoutes.test.ts` is a live ratchet with the doctrine written into the file:

> "Список долга обязан быть правдой: адрес, которого никто не зовёт, — не долг, а мусор в списке."
> "Число ставится по фактической длине списка, а не «с запасом»: свободная единица означает, что одну строку долга можно добавить молча, а ради запрета ровно такого добавления проверка и написана."

The file carries three prior comment blocks recording exactly this chore: widget deleted, its `KNOWN_MISSING` line removed, cap lowered.

This packet deleted `OmnichannelInboxView`, the **only** web caller of `/api/communications/inbox` and `/api/communications/patients/search`. I verified: **zero** callers remain in `apps/web/src`. Both lines are still in `KNOWN_MISSING`, and the cap is still `<= 25` with `KNOWN_MISSING.length === 25`.

Consequence, measured: **slack went from 0 to an effective 2.** Two new dead endpoints can now be introduced silently without failing the ratchet — the precise thing the file says it exists to forbid. The test still passes (TRUE_EXIT=0, 3/3), so nothing goes red; the guard just got quieter.

I nearly reported three stale entries. `/api/billing/payouts` is **still called** — see §13 — so the correct numbers are **2 stale lines** and a cap that should read `<= 23`. Re-deriving mattered.

## 13. A SECOND PAYROLL FACADE, SAME DEAD ENDPOINT, LEFT STANDING

The packet's ground for deleting `PayrollView` was that `/api/billing/payouts` returns 404. It did not census `apps/web` for other callers of the endpoint it condemned. There is one:

`apps/web/src/pages/DoctorPayoutDashboard.tsx:23`
```ts
fetch("/api/billing/payouts", { headers: denteAdminSecretRequestHeaders() })
```

- Imported and rendered by `apps/web/src/pages/FinancialDashboard.tsx:3,57`.
- `FinancialDashboard` is imported by **nobody** (grep outside itself: zero hits).
- Both are **UNREACHABLE** from `main.tsx` by the packet's own walker, plus an orphaned `DoctorPayoutDashboard.css`.

So a second unreachable payroll subtree, feeding on the same 404 the packet used as its deletion justification, is still in the "neither real nor gone" state the brief named as **the defect**. Out of the packet's claimed file scope — but squarely inside its own thesis and its own §1 self-check ("No stub left").

## 14. §3 REGRESSION — the packet fixed this exact pattern in one file and shipped it in another

In `InventoryView.tsx` the packet is exemplary: it splits "not loaded" from "empty" because a storekeeper reading "Склад пуст" over real balances would re-enter stock.

`LeadsKanbanView.tsx` does not do this for staff/chairs, **and the correct signal is already in the function**:
- `:153` `const visitMinutes = dashboard?.clinicSettings?.profile?.defaultVisitMinutes ?? null;`
- `staff` / `chairs` come from `dashboard?.clinicSettings?.staff ?? []` — the **same object**. So while settings are unloaded, `!visitMinutes` is true *and* `staff.length === 0` is true.
- `:842` renders unconditionally on `staff.length === 0`: "В клинике нет ни одного активного врача. **Добавьте врача в разделе «Настройки» → «Сотрудники»**" — a false instruction during load, sending the user off to create a duplicate doctor.
- `:873` same for chairs.
- `:938` the button tooltip cascade puts `staff.length === 0` / "Нет активного врача — записать некому" **before** `:942 !visitMinutes` / "Настройки клиники ещё не загружены". The accurate diagnosis exists and is ordered second, so it can never display in the state it describes.

Fix is small: test `!dashboard?.clinicSettings` (or `!visitMinutes`) first and say "Настройки клиники ещё не загружены" in all three places.

## 15. §10 CONTRACT AUDIT — clean, no invented fields

Every field the new code reads exists in the real schema. I checked each:

| Read by the packet | Reality |
|---|---|
| `clinicSettings.profile.organizationId` | `clinicProfileSchema` `organizationId: z.string().uuid()` — required |
| `clinicSettings.profile.defaultVisitMinutes` | required `z.number().int().positive()` |
| `clinicSettings.profile.mode` | required `clinicModeSchema` |
| `clinicSettings.staff` / `.chairs` | required arrays |
| `StaffMember.active` | required `z.boolean()` |
| `useLeadsStore().error` | `leadsStore.ts:15` `error: string \| null` |
| `SterilizationLog.autoclaveId` | `schema.ts` `autoclaveId: text("autoclave_id")`, nullable, no FK, **no `autoclaves` table** — the "free text, no registry" claim holds |
| `var(--rust)`, `var(--rust-soft)` | declared in `main.css` at three theme scopes (27/28, 89/90, 149/150) and `dente-redesign.css:45`. **Not** a repeat of the `--tomato` bug |

Also verified live: 401 bodies are `{"error":"AuthRequired","message":"Требуется авторизация рабочего кабинета клиники."}`, so `bookingFailureMessage` returns Russian, not a raw code. §3 holds there.

`GET /api/sterilization/logs` is `.orderBy(desc(sterilizationLogs.timestamp))` — so `knownAutoclaves[0]` really is the **last used** autoclave. The comment is true.

`ScannerView.css` claim verified exactly: `.scanner-select-group` and `.scanner-select` had **0** occurrences at the parent — the two form controls referenced classes with no CSS at all. Now defined. No hardcoded hex in any added CSS line.

Doctor-filter census: the `active && (role === "doctor" || role === "owner")` pattern appears at **11 other sites in 9 files** (AppHelpers, ScheduleView, NewAppointmentForm, AppointmentCard, useScheduleLogic, smartBookingParser, useAppLogic). The builder claimed "8 мест" — an **undercount**, erring against itself. Substance holds.

## 16. GIT HYGIENE

- All 13 committed files match the claimed FILES CHANGED list exactly. **No unrelated author's file swept in.**
- Conventional Commits followed; body explains the WHY at length (§12).
- No mojibake in diff or subject (`smoke:web-text-encoding` 416 files clean; subject renders correctly).
- **Real violation, self-disclosed:** `workspaceShell.tsx` carries ~50 lines of packet **W2**'s clinicMode work inside this commit — the two new imports, the whole `getVisibleRailViews` function, the `WorkspaceSidebar` clinicMode line, and the `WorkspaceTopbar` `visibleStaffRoles` block (110 added lines total in that file). §7a says never sweep another agent's work in. Mitigating and genuine: the lead region-split one file between two packets, and per-file `git add` cannot split a file. The builder measured it itself and reported it rather than hiding it.
- **Not disclosed:** that contamination carries a **user-visible behaviour change** — solo/one-chair clinics lose the "Маркетинг/SEO" rail entry, and the role switcher stops offering absent roles. The commit body mentions marketing and the role switcher **zero** times. A behaviour change rode in undocumented.
- `clinicCapabilities.ts` symbols (`hasCapability`, `resolveClinicMode`, `visibleStaffRoles`, `ClinicMode`) all exist at `41a22b63d` and were committed earlier (`47c09002a`, `58fabefb3`). The builder's safety check was real.

## 17. NITS

1. `LeadsKanbanView:201` uses `member.active !== false`; the 11 other sites use `member.active &&`. `active` is a required boolean so behaviour matches today, but the local `BookableDoctor` type declares `active?: boolean` — looser than the shared `StaffMember`. A hand-rolled local duplicate of a shared schema type.
2. `isSterilizationLog` validates only `id` and `barcode` as strings, then asserts the whole `SterilizationLog` shape including `status: "passed" | "failed"`. A row with a junk status passes the guard.
3. The §3 self-check quotes "журнал ведётся от имени сотрудника, войдите по PIN" as this packet's work. That wording is at `ScannerView.tsx:54,65` and was added by **e2d41dc74**, not by `41a22b63d`. The commit under review actually shipped "Войдите в кабинет клиники заново" — the clinic-login loop the builder says it avoided. Fixed at HEAD, and the hash was disclosed, so this is imprecise self-crediting, not a false claim.
4. Pre-existing debt, correctly not the packet's: `sterilization_logs.device_name` is `NOT NULL DEFAULT 'Автоклав 1'` and `POST /api/sterilization/scan` never writes it. Every journal row carries a device name the UI neither writes nor displays, in a document shown to inspectors.

## 18. VERDICT — NEEDS_REWORK

The defect was real and I reproduced it at the parent. The fix is genuinely reachable — verified with the packet's own walker and by executing the role functions. The deletions are clean. The guard was proven to bite by my own mutation, not by reading the claim. Nearly every proof reproduced verbatim, and the one item the builder left open (the rest of the web suite) is green: 567/567. **There is no fabricated proof in this packet.** Where it could not prove something it said so, and it named the exact spot that then broke.

But **`npm run typecheck -w @dental/web` and `npm run build -w @dental/web` both exit 1**, on three errors this packet introduced and nothing else. HEAD does not compile. That blocks, and it is not a nit.

Not REVERT: the change is far better than the defect it fixed. Reverting would restore three unreachable views, a dead router and thousands of lines of limbo to buy a one-line type fix.

### REQUIRED REWORK (numbered, actionable)

1. **Fix the red build.** `apps/web/src/workspaceRouteErrorBoundary.tsx:3` — extend `LazyWorkspaceView` with `"inventory" | "scanner" | "leads"`. Better: replace the hand-written union with `AppView` from `workspaceShell` so the duplication cannot drift again. Close with `npm run typecheck -w @dental/web` **and** `npm run build -w @dental/web`, both exit 0.
2. **Close the fourth coupling in the guard.** Add an assertion to `panelsAreMounted.test.ts` that every entry of `appViews` appears in the `LazyWorkspaceView` union declaration (text-compare, same style as `registeredAppViews()`). Prove it bites by removing one name from the union and showing the test red. Without this, defect 1 recurs on the next view added.
3. **Fix the preload-path test so it checks what it is named for.** `panelsAreMounted.test.ts:187` resolves by basename and ignores the directory; I made `leads: () => import("./totally/wrong/LeadsKanbanView")` pass 5/5 green. Resolve the specifier against `webSrc` with `existsSync` for `.ts`/`.tsx`. Prove it bites with that same mutation.
4. **Restore the debt ratchet.** Remove `/api/communications/inbox` and `/api/communications/patients/search` from `KNOWN_MISSING` (zero web callers — verified) and lower the cap from `<= 25` to `<= 23`, with a comment naming this packet as the reason, matching the three precedents already in that file. Keep `/api/billing/payouts` — it still has a caller.
5. **Resolve the sixth facade per §1.** `apps/web/src/pages/FinancialDashboard.tsx` + `pages/DoctorPayoutDashboard.tsx` + `DoctorPayoutDashboard.css` are unreachable from `main.tsx` and feed on the same 404 `/api/billing/payouts` used to justify deleting `PayrollView`. Delete them (then `/api/billing/payouts` also leaves `KNOWN_MISSING` and the cap becomes `<= 22`) or state why they are exempt. Prove with `git grep -n "DoctorPayoutDashboard\|FinancialDashboard" HEAD -- apps/` returning nothing.
6. **Fix the §3 loading-vs-empty conflation in leads.** `LeadsKanbanView.tsx:842`, `:873`, and the tooltip cascade at `:938`: test `!dashboard?.clinicSettings` first and say "Настройки клиники ещё не загружены" before ever telling the user the clinic has no doctors or chairs. This is the same defect the packet fixed correctly in `InventoryView.tsx`.
7. **Correct the measurements.** Replace "Deleted 4,689 lines of unreachable view code" with the true figures: **2,452** lines of view files plus **359** of dead router = **2,811** whole-file deletions, commit total `-2966`. Fix "13 for solo_doctor" to **12**. Use the real parent counts (InventoryView 1487, PayrollView 871, ScannerView 192; five-view total 4,852), not the brief's stale ones.
8. **Document the behaviour change that rode in.** Solo/one-chair clinics lose the "Маркетинг/SEO" rail entry and the role switcher stops offering absent roles — neither is mentioned in the commit body. Record it in the W2 handoff or an amend note so the lead's screenshot gate knows to look for it.
