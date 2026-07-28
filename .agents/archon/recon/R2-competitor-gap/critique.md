# CRITIQUE of R2-competitor-gap dossier — completeness critic, PASS 2, read-only, 2026-07-28

Scope: what the dossier MISSED and which claims are NOT backed. No re-doing of the recon, no praise.
Every number below carries the command that produced it, run by me between 15:45 and 16:00 local.

**A pass-1 critique already existed at this path (written 15:18).** I did not inherit it. I re-ran its
three headline measurements myself; two reproduce, one is wrong in its explanation. Where I keep a
pass-1 finding I say so and give my own command. Pass-1's unique findings that I independently
verified are preserved below, because ARCHON reads only this file.

Verdict: **USABLE_WITH_GAPS**, but downgraded from pass 1 for one reason pass 1 also missed: the
dossier's entire empirical spine — PART C, «Three of these numbers are the report» — is a read of a
**screenshot fixture** that a sibling script created five minutes before the dossier was published,
and one of those three numbers is a join across two different organizations.

---

## 1. THE FATAL FINDING: PART C MEASURES A SCREENSHOT FIXTURE, NOT A CLINIC

The dossier's most persuasive material is its live-DB evidence. It is not evidence.

`apps/api/src/scripts/seedOpsScreenshotDemo.ts:1-16` — its own header:

> Временные данные **для съёмки рабочих панелей** … В рабочей базе **одна организация с тремя
> пациентами и нулём приёмов** … `--clean` сносит организацию целиком.

That script creates organization `d0000000-0000-4000-8000-00000000d001` («Демо-клиника для снимков»).
Measured (read-only `pg`, `select … group by organization_id`):

```
organizations rows  :: 4a3420d1-…-f5e191 | Стоматология, 1 кабинет   | created 2026-07-27 04:57:13
                       d0000000-…-00d001 | Демо-клиника для снимков  | created 2026-07-28 15:01:16
appointments by org :: [{d001, 27}]                 <- 100% fixture
visits by org       :: [{d001, 10}]                 <- 100% fixture
payments by org     :: [{d001,  8}]  first=last=2026-07-28T11:01:16Z  (same second)
outbox by org       :: [{d001,  6}]  all created 2026-07-28T11:01:16Z (same second)
treatment_items     :: [{d001, 10}]
patients by org     :: [{4a3420d1, 3}, {d001, 14}]
tooth_states by org :: [{4a3420d1, 25}]             <- the REAL org
generated_documents :: [{4a3420d1,  4}]             <- the REAL org
```

The dossier was written at 15:06. The fixture was created at 15:01:16. **Every row it read as clinic
behaviour is 5-minute-old machine output from a screenshot script, deletable with one flag.**

Consequences, claim by claim:

**1.1 «0 of 8 payments carry a fiscal receipt number → Empirically nobody fills them» — NOT EVIDENCE.**
The dossier states this in finding 2's body («Empirically nobody fills them»), in PART C
(«the empirical case for the KKT integration») and in P2 («Evidence this is the right target … Nobody
types those five numbers»). All 8 payments were inserted by the seeder in one second with amounts
hardcoded at `seedOpsScreenshotDemo.ts:389` `amountRub: [7200, 5400, 14800, 26500][index % 4]` and no
fiscal fields written at all. The 0% is a property of the seeder's column list. No human ever declined
to type anything. The recommendation may still be right; the stated proof does not exist.

**1.2 «6 messages queued with the dispatch worker off» — FALSE, and its statuses are hardcoded.**
```
select status, count(*) from communication_outbox group by status
→ delivered 2 | sent 1 | queued 1 | failed 1 | suppressed 1
```
**One** row is queued, not six. Pass 1 found this and concluded «the transport demonstrably ran on
this host at some point». That is also wrong. The statuses are literals in the fixture —
`seedOpsScreenshotDemo.ts:434-439` writes exactly `delivered / sent / failed / queued / suppressed /
delivered`, and `:452-453` back-dates `sentAt`/`deliveredAt` directly. The transport never ran.
Nothing is stuck. P7 would print «6 сообщений ждут отправки» on a dentist's screen from a number that
is wrong six ways in a campaign whose named disease is exactly that.

**1.3 «visit_diaries = 0 against 10 visits and 25 tooth_states» — a CROSS-TENANT JOIN.**
This is the sharpest defect in the dossier. The 10 visits are org `d001` (fixture, which has **0**
tooth_states). The 25 tooth_states are org `4a3420d1` (real, which has **0** visits). The sentence
«teeth get marked, the medical record does not get written» correlates two **disjoint** datasets
belonging to different organizations. It cannot mean what it says at any sample size. The dossier
caveated it as a possible seeding artefact — the correct caveat is that the comparison is invalid.

**1.4 «inventory_items = 0 … nobody has entered stock» and «appointment_waitlists = 0 is a UI
problem»** — both are inferences about human behaviour drawn from tables the fixture does not
populate and the real 3-patient org has never used. Neither is measured.

**Standing risk for the whole campaign, not just this packet:** `seedOpsScreenshotDemo.ts` is
idempotent-by-org and `--clean`-able, so row counts on this host swing by tens between agent runs.
Any packet that quotes a `count(*)` without splitting by `organization_id` is quoting noise.

---

## 2. RE-DERIVED: THE THREE MOST LOAD-BEARING NUMBERS

### 2.1 «organizations = 4» — the dossier's own flagship CORRECTION does not reproduce. It is 2.

The dossier files this as `correctionsToRecord`: «My briefing's ground truth says organizations = 2.
Measured live 2026-07-28: organizations = 4 … something created two more organizations.»

```
select count(*) from organizations → 2
```
The briefing was right. Two transient orgs existed when the dossier looked (the screenshot fleet
creates and `--clean`s demo orgs) and are gone. `patients` is **17**, not 18. The dossier told ARCHON
to record, as a correction to ground truth, a number that was an artefact of another agent's fixture
lifecycle — and attached an alarming interpretation to it. To its credit it also said «Re-measure
before quoting». Recording it as a correction contradicts that instruction.

### 2.2 «14 orphaned components / 10,188 lines» — a 3.2x undercount. Independently reproduced.

I ran the walk the dossier said should be run, replicating the repo's own `reachableFromEntry()`
(`apps/web/src/tests/panelsAreMounted.test.ts:70-103`) — BFS from `main.tsx`, both `from "…"` and
`import("…")`:

```
node /tmp/crit2/reach.mjs
→ sources=328  reachable=257  UNREACHABLE=71
  unreachable .tsx: 45 files, 16,300 lines
  unreachable .ts : 26 files,  4,779 lines
```

**45 unreachable components, not 14. 16,300 lines, not 10,188.** Plus 4,779 lines of unreachable
`.ts` the dossier never treated as a category. All 14 of its files are inside my set and every
per-file `wc -l` it published is correct — the arithmetic is honest, the population is a third of the
truth. Pass 1 reported 46 files / 16,736 lines; the difference is exactly `WaitlistDrawer.tsx` (436),
which the build fleet mounted at 15:39 (see §4). Two independent walks agreeing to one file is the
strongest cross-check in this critique.

The dossier's PART H then over-claims: «My PART B census does not undercount … The "14 components /
10188 lines" figure stands as measured» — directly contradicting its own methodLimit #3 («my figure is
therefore a floor»). The floor statement was right; the PART H retraction of it was wrong.

Capabilities in my 45 that the 27-row matrix never mentions:

| Missed orphan | lines | why it belongs in THIS packet |
| :-- | --: | :-- |
| `components/plan/ComparativePlannerDashboard.tsx` | 1189 | **Largest single omission.** Treatment-plan variants with `PlanStatus Draft/Active/Approved/Rejected`, print and export (read `:23-40`). This is competitor case-presentation / «варианты плана лечения» — a capability with **no matrix row and no TAKE/CUT/ALREADY verdict at all**. `treatment_plans` = 0 rows. |
| onboarding cluster: `OnboardingSetupWizard.tsx` + 7 `steps/Step*.tsx` + `WorkspaceOnboardingInline.tsx` + 8 `inline/InlineStep*.tsx` + `SharedOnboardingUI.tsx` + `WorkspaceOnboardingNoticeBars.tsx` + `OnboardingPreview.tsx` + `useOnboardingLogic.ts` + `store/onboardingStore.ts` | ~3958 / 22 files | Capability #19 «Онбординг / обучение» is answered with «TourEngine.tsx (343 L) orphaned» and P10 «mount TourEngine». A complete onboarding wizard 11x larger is sitting unreachable. P10's smallest-honest-version is wrong because the population was wrong. |
| imaging/3D cluster: `DicomToolbar.tsx` 606, `hooks/useMprLogic.ts` 624, `mprMath.ts` 462, `utils/math/toothGeometry.ts` 966, `components/dicom/ViewportOverlays.tsx` 215, `utils/dicom/{clinicalImplants,fdiMapper,toolsInit,pdfExport,drillSequenceGenerator}.ts` 615, `mprWorker.ts` 46 | 3534 | The brief's loop step «look at the X-ray» has **no matrix row and no verdict**. The dossier names `DicomToolbar` as «Dentrix's praised strength» in the orphan table and never grades it. A viewer IS reachable (`components/dicom/Cornerstone3DViewer.tsx`, `ImagingView.tsx:103`, `VisitDiagnosticsTab.tsx:4`), so the honest verdict is ALREADY HAVE-partial — but it was never issued. |
| `components/visit/VisitDictation.tsx` | 399 | Sits beside the flagship ALREADY-HAVE. Dictation is genuinely live via reachable `VisitDiaryEditor`, so the verdict survives — but 399 lines next to it are dead and uncounted. |
| `utils/unifiedPdfGenerator.ts` + `utils/pdf/unifiedPdfGenerator.ts` | 277 + 234 | Two dead copies of one generator. P4 ends «render `signature_svg` into the PDF» without noticing two abandoned web-side PDF generators. |
| `components/Odontogram.tsx` 241, `components/analytics/LostPatientsFiltersWidget.tsx` 143, `pages/DoctorPayoutDashboard.tsx` 111, `components/HelpHUD.tsx` 131, `components/workspace/shift/RoleFocusStrip.tsx` 73, `hooks/useOfflineQueue.ts` 115 | | Day-screen surface, patient reactivation (Dikidi's «кто давно не был»), an offline queue nothing reaches. |

Method note against myself: my walk resolves imports by **basename**, copied from the repo's guard, so
a basename collision can mark a wrong file reachable. 45 is itself a floor. Error direction is toward
under-counting.

### 2.3 The remaining PART C counts — reproduce, but see §1.

`visits 10`, `visit_diaries 0`, `payments 8` all `card`, `fiscal_receipt_number` non-empty `0`,
`generated_documents 4`, `tooth_states 25`, `appointment_waitlists 0`, `treatment_plans 0`,
`inventory_items 0`, `communication_settings 0`, `communication_templates 3`, `clinics 1`, `users 7`,
`imaging_studies 1`, `egisz_logs 0`, `rebooking_conversion_rules 0`, `pricelist_doctor_payrolls 0`.
Money columns `numeric(12,2)` — **CORRECTION 1 to `RECON_DOSSIER.md:335-337` is right and is the
dossier's single best contribution.** DB is `dental_crm` on PostgreSQL 18.4, confirming the standing
note that this is native PG, not PGlite.

One measurement it should have taken: `select count(*) from generated_documents where signature_svg is
not null` → **0**. That is the one clean piece of live proof for finding 6 and it was left on the table.

---

## 3. THE TREE MOVED UNDER THE DOSSIER — AND IT CARRIES NO TIMESTAMPS

`stat` on the files it cites, against its 15:06 publication:

```
15:39  apps/web/src/ScheduleView.tsx        775 L   (P3's target)
15:32  apps/web/src/PaymentCapture.tsx      759 L
15:32  apps/api/src/routes/clinical.ts      477 L   (dossier says 444 L)
15:31  apps/web/src/pages/AnalyticsDashboardView.tsx 752 L
15:28  apps/api/src/services/schedule/waitlistMatching.ts 307 L (dossier says 222 L)
15:15  apps/api/src/db/schema.ts           2619 L
15:12  apps/web/src/tests/panelsAreMounted.test.ts 217 L
15:02  apps/api/src/routes/waitlistMatches.ts 179 L (dossier says 85 L)
```

**3.1 P3 is already done.** `apps/web/src/ScheduleView.tsx:3` now imports `WaitlistDrawer`, `:177`
holds its state, `:681` opens it, `:759-761` renders it, and `:668-669` documents the fix. The
dossier's finding 5 («the only waitlist UI is itself unmounted») and P3 («Mount WaitlistDrawer inside
ScheduleView») were true at 15:06 and are obsolete 33 minutes later. ARCHON must not schedule P3 as
written.

**3.2 The mount guard has SEVEN entries, not six — and the seventh is the backfill panel.**
```
rg -n 'component: "' apps/web/src/tests/panelsAreMounted.test.ts
→ 39 DayConfirmationsPanel  40 ManagerReportsPanel  41 MessageDeliveryConsole
  42 CampaignPanel  43 PatientDuplicateAlert  44 RecallListPanel  45 FreedSlotsPanel
```
`FreedSlotsPanel.tsx` (222 L, created 15:10) is mounted at `pages/AnalyticsDashboardView.tsx:26,565`.
That is a freed-slot / cancellation surface — i.e. the dossier's capability #9 acquired a second UI,
buried in Analytics, after publication. The dossier's «6-entry guard» claim was true at 15:06; pass 1
repeated «the 6 panels» without re-running the command and inherited the stale count. I re-ran it.

**3.3 Line numbers in the moved files no longer resolve.** `schema.ts:481-484` (fiscal columns) → now
`:495`; `schema.ts:526` (`signature_svg`) → now `:540`; `schema.ts:1021` → now `:1035`;
`clinical.ts:272-280` (payroll comment) → now `:306-312`; `waitlistMatches.ts:31` → now `:125`;
`waitlistMatching.ts:191/201/215` → file grew by 85 lines. **The substance survives in every case I
checked** — the enum at `schema.ts:99` still has no `sbp`/`qr`, `PaymentCapture.tsx` still has no QR
scanner, the payroll comment is verbatim including «ДОЛГ: расчёт зарплаты врача требует поля процента
у сотрудника». The defect is that the dossier stamps no per-claim measurement time, so ARCHON cannot
tell a stale line from a wrong one.

**3.4 Unmoved files verify exactly.** `packages/shared/src/index.ts` (mtime 10:02, before the recon):
`:155` «Информированное добровольное согласие», `:164`, `:436` «Приказ N 1051н…», `:640-642` the real
ФНС XSD and order URLs, `:851` the payment enum, `:1966` `fiscalReceiptDetailsSchema` — all verbatim.
`sed -n '128,398p' … | rg -c 'title: "'` → **31**, so the 31-template count is correct.
`AppShell.tsx` is 96 lines with `AppShell()` at `:79-96` — P1's insertion anchor is real.
Live GETs reproduce: `/api/clinical/egisz/integration-status` → `capabilities {cdaGeneration:true,
ukepSigning:false, remdTransmission:false}` HTTP 200; public-booking doctors → `[]` HTTP 200.

Minor: «73 route files» reproduces (`find apps/api/src/routes -name '*.ts' | wc -l` → 73) but **9 are
test files**; the real route-module count is 64. Presented as a capability inventory, it is inflated.

---

## 4. WHAT IS NOT BACKED

**4.1 The single load-bearing legal claim was asserted, and it is TRUE — with a caveat the dossier
missed that changes the product.** «ЕГИСЗ transmission is a licence requirement for every medical
organisation regardless of specialisation» is why P5 «cannot be dropped», and its only support was
«market research is unambiguous» plus aggregator pages. I checked it: it holds — ст. 91.1 of 323-ФЗ,
Постановление № 852, Постановление № 140 п.44 (all licence-holders, incl. private, from 01.09.2022),
Приказ Минздрава № 529н, and Приказ Минздрава № 947н requiring registration **within one working day**
of formation. Two things the dossier never surfaced and that change P5's scope:
- **The one-working-day SLA.** A manual «export XML and upload it elsewhere» workflow cannot satisfy
  it. That makes P5(b)'s «leave `remdTransmission:false` until a gateway contract exists» a compliance
  hole with a clock on it, not a deferrable nicety.
- **Consent.** For paid private services ст. 91.1 conditions transmission on patient consent; Минздрав
  letter № 18-5/И/2-7401 (19.04.2024) pushes private clinics to transmit anyway and the conflict is
  unresolved. So the honest minimum includes a **consent-to-transmit flag**, which belongs in the
  consent-template layer the dossier grades ALREADY HAVE. Neither appears anywhere in the packet.
- Unverified downstream: the CDA generator emits «Протокол стоматологического осмотра»
  (`egiszCdaGenerator.ts`). Whether that СЭМД type is in the registrable set (справочник OID
  1.2.643.5.1.13.13.11.1520) is never checked, and «CDA generation is real» is graded on structure
  alone.

**4.2 ЕГИСЗ is not «honestly labelled»: a mounted UI promises РЭМД submission and always 404s.**
Verified independently: `apps/web/src/components/EgiszMonitor.tsx` is imported at
`apps/web/src/components/visit/VisitOdontogramTab.tsx:4` and rendered at `:76`, and calls
`EgiszMonitor.tsx:37 fetch('/api/egisz/logs/…')` and `:73 fetch('/api/egisz/send', {method:'POST'})`.
Neither route exists — both are debt entries at `apps/api/src/tests/webCallsExistingRoutes.test.ts:78-79`,
and `select count(*) from egisz_logs` → 0. So on the visit screen, inside the daily loop, a dentist
has a «send to ЕГИСЗ» button that can never succeed. `VisitOdontogramTab.tsx` is the very file the
dossier opened to prove `VisitDiaryEditor` is mounted (`:6,70`); it did not see the import two lines
above. (Pass-1 finding; reproduced by me.)

**4.3 Capability #17 payroll is contradicted by a live file.** The dossier says the route was «removed
together with its screen». `apps/web/src/pages/DoctorPayoutDashboard.tsx` (111 L) is still there,
imported and rendered by `apps/web/src/pages/FinancialDashboard.tsx` — the orphan the dossier listed
as «owner's money view» without opening. It fetches `/api/billing/payouts`, which does not exist
(`KNOWN_MISSING`, `webCallsExistingRoutes.test.ts`). A textbook transitive orphan, in a file the
dossier had already opened. (Pass-1 finding; reproduced.)

**4.4 Vendor quantities with no fetch behind them.** «125 000+ businesses» (DIKIDI), «Curve cites 95%
of patients preferring to book online», «IDENT quotes implementation up to 20 days», «switching МИС
costs 150–300k ₽», «1С base licence ≈45 300 ₽», «StomX 1000 ₽ vs 6700 ₽». PART F names domains; no
fetch is shown for any specific figure. methodLimit #4 covers the category honestly; the individual
numbers remain unsourced quantities.

**4.5 «No Russian competitor in this sweep advertises comparable depth» (dictation)** — an absence
claim over a set never systematically enumerated for that feature.

**4.6 Trivia.** Dossier is 723 lines by `wc -l`, self-reported as 724. `waitlistMatching.ts` reported
at 222 L is now 307. `clinical.ts` reported at 444 L is now 477.

**4.7 Inherited numbers — genuinely clean on the disqualifying source.** `rg -n 'competitive-audit'
dossier.md` → two hits, both declaring it is NOT used as evidence (`:5`, `:630`). PART H reads
`RECON_DOSSIER.md` *after* measuring and corrects four of its claims with fresh commands, including
one it nearly inherited (the stale `AppRouter.tsx` line counts). No smuggled numbers from documents.
The two numbers that came from a document rather than a measurement are the briefing's
`organizations = 2` — which the dossier «corrected» to a transient 4 and was thereby wrong (§2.1) —
and pass 1's own inherited «6-entry guard» (§3.2), which is my finding against pass 1, not the dossier.

---

## 5. COVERAGE AGAINST THE BRIEF

**Answered.** All seven named RU competitors and all four international ones appear with sources. All
seven named Russian obligations (54-ФЗ, ЕГИСЗ/РЭМД, КНД 1151156, ИДС, маркировка рекламы, МДЛП, СБП/QR)
get a code-verified DENTE state and a verdict. Both mandated artefacts exist: a 27-row
capability × competitor × file:line × verdict matrix, and a ranked top ten with smallest-honest-version
and a target file each. The §7 second half is taken seriously — six capabilities are argued *against*
with a named interface cost.

**Quietly skipped:**

1. **The daily loop is a sort key, not an analysis.** The brief names seven stages and says «where
   competitors make that loop shorter … is worth more than any module». PART E restates the loop in its
   preamble and never walks it. Three stages get no capability row and no verdict:
   - **«look at the X-ray»** — no row at all; 3,534 lines of dead imaging/3D code (§2.2) and a
     reachable viewer, neither graded.
   - **«get the next appointment booked»** — the loop's closing step. No row, no verdict. The repo has
     a rebooking apparatus (`rebooking_conversion_rules`, 0 rows; `RebookingConversionRulesWidget` in
     `AnalyticsDashboardView.tsx` and `MarketingView.tsx`) that is buried in exactly the two screens
     the dossier itself argues a solo dentist never opens — the identical objection it raises for
     recall in P6, unmade here. `rg -in 'записать на следующ|next appointment' apps/web/src` finds no
     chairside re-book action, only prose.
   - **«open the patient»** — card-open time and one-screen history, which is the review complaint the
     dossier itself quotes as the market's #1 pain, gets no row.
2. **Found capabilities left without the mandated verdict.** «A list of features without TAKE/CUT
   verdicts is a shopping catalogue.» Named with a competitor in PART B's orphan table and never graded:
   `DicomToolbar.tsx` (606, «Dentrix's praised strength»), `ShiftIntelligence.tsx` (173, «Open Dental's
   colour-coded day view» — loop stage one), `ConsentTemplateEditor.tsx` (80, «Клиентикс is praised
   precisely for this»). Plus `ComparativePlannerDashboard.tsx` (1189), missing outright.
3. **«What the cheap tiers include» is answered as a price list, not an inclusion list.** The brief's
   reasoning is «the cheap tiers tell you what solo practitioners actually pay for». Row #27 lists
   prices — one self-contradictory and unresolved — and never produces the feature *set* of any free or
   entry tier. Dikidi free is the load-bearing case for P1 and its tier contents are never enumerated.
4. **`VISUAL_VERDICT.md` was never consulted.** 31 KB, written 13:57 — ~70 minutes before the dossier.
   Verified myself: `:188` «views with **no valid desktop capture** are `schedule`, `shift`, `visit`»
   and `:330` «the schedule/shift/visit desktop captures are the fabricated clones». Those three
   screens are the daily loop and the targets of P3 and P6. Every «this would overload the screen» CUT
   and every «mount it here» TAKE is an opinion about surfaces nobody in this campaign has seen.
5. **`webCallsExistingRoutes.test.ts` was never opened** — see §6.

**Correctly declared out of scope, not skipped:** competitor trials, UI testing, the 436-entry route
census (self-blocked on a lead-only build gate; `smoke-guard.out` preserved).

---

## 6. SEVERITY, «mattersForSolo», METHOD LIMITS

**Severity is defensible and not inflated.** HIGH 5 / MEDIUM 7 / LOW 2 / INFO 5. The two absences it
declines to prioritise are LOW *and* CUT with a stated interface cost; its own differentiators are
INFO, not self-congratulatory HIGH. Two corrections: finding 7 (stuck outbox) is MEDIUM on a number
that is 1 and is fixture-generated — it should be LOW-to-INFO; finding 2's HIGH survives on the
capability gap but not on the «empirically nobody fills them» argument, which is void (§1.1).

**«mattersForSolo» mostly holds**, and is unusually disciplined about the second half of §7 — it
splits solo-vs-small explicitly on payroll and the lab portal, and prices interface cost on every CUT.
Three places where enterprise thinking survives:
- **P5 (ЕГИСЗ)** is priced for a *licensed medical organisation*, which is not the same audience as
  «solo dentist». The claim is legally sound (§4.1) but the packet never distinguishes a licensed
  cabinet from a sole trader, and it omits the consent obligation that is the solo-specific part.
- **P6 (recall onto the day screen)** is right in spirit and unpriced in practice: it adds permanent
  furniture to a screen that has no valid capture (§5.4).
- **P7** proposes putting a wrong, fixture-derived number in front of a user.

**methodLimits is honest and specific — the best part of the dossier.** Twelve entries, each naming
the command or file that bounds it, including two self-inflicted errors (the `rg -r` artefact, the
near-inheritance of the stale `AppRouter.tsx` claim) that a self-serving report would have deleted.
Not a formality. Three defects: (a) limits #2 and #3 were **resolvable with code already in the repo** —
`reachableFromEntry()` at `panelsAreMounted.test.ts:70-103` is exactly the walk #3 asks for, so P10
recommends building a mechanism the recon should have *run*; (b) #3's «my figure is a floor» is then
contradicted by PART H's «the figure stands as measured»; (c) limit #4 caveats the DB as «a
development database with 18 patients» — the actual problem is not sample size but that the rows are
a screenshot fixture and one comparison spans two tenants (§1). The right caveat was never available
to it because it never asked where the rows came from.

---

## 7. THE SINGLE MOST VALUABLE THING NOBODY HAS LOOKED AT

**Data provenance as a standing gate: nobody in this campaign has asked which organization a row
belongs to or which script wrote it.** That is how this dossier — the most command-disciplined
artefact in the campaign — still shipped three empirical claims that dissolve (§1), including one that
joins two disjoint tenants. `seedOpsScreenshotDemo.ts` exists precisely because the real database is
«одна организация с тремя пациентами и нулём приёмов»; every agent that reads `count(*)` on this host
is reading a screenshot prop and calling it telemetry. The fix is one paragraph of law: **any DB number
in a packet must carry `group by organization_id` and the writer's identity, or it is not a number.**
This costs nothing, it would have caught 49 phantom screenshots and a «56 unique MD5» certification by
the same mechanism, and no other proposed fix in this campaign generalises that far.

**Runner-up — the reverse direction, mounted UI calling routes that do not exist.** The repo already
inventories it and no agent has opened the file. `apps/api/src/tests/webCallsExistingRoutes.test.ts`
is a ratchet whose header states the failure mode exactly: «большинство вызывающих написаны как
`response.ok ? response.json() : []`: отсутствующий маршрут молча превращается в пустой список, и на
экране просто нет раздела. Пользователь не видит ошибки, он видит пустоту и делает вывод, что данных
нет.» `KNOWN_MISSING` still lists live addresses including `/api/egisz/send`, `/api/egisz/logs`,
`/api/billing/payouts`, `/api/communications/inbox`, `/api/clinic/workflows`, `/api/ai/predict-no-show`,
`/api/reporting/token/generate`. An orphan is invisible, so a dentist never learns to distrust it. A
404-backed widget is **visible and lies quietly** — it shows «нет данных» where a competitor shows the
list, which is how a demo is lost. `EgiszMonitor` is the proof case (§4.2): mounted on the visit
screen, offering the one legal capability this dossier calls strategically decisive, wired to two
addresses that do not exist. Nobody has mapped which of those addresses sit on the daily loop.

**Runner-up 2 — the three loop screens have no valid capture at all** (`VISUAL_VERDICT.md:188`, `:330`).
`schedule`, `shift`, `visit`. Those are the daily loop, and they are the targets of P1, P3 and P6.
