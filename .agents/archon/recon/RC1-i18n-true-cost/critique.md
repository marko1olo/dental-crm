# CRITIQUE — RC1-i18n-true-cost (adversarial re-measure)

Critic did NOT write the dossier. Read-only on source. Written incrementally.

## 0. TREE DRIFT — the dossier is 14 commits stale

- Dossier states `git rev-parse HEAD -> 9bcacf957df9a3883eac4d4b8f3d945baab6089d`.
- Actual HEAD now: `39a72952336614e3394c5743ae510f90dd5f313c`.
- `git log --oneline 9bcacf957..HEAD | wc -l` -> **14 commits**, all dated 2026-07-28 20:56 -> 21:18,
  i.e. the tree moved 14 commits in the ~55 min while the dossier was being written.
- Consequence: repo-wide Cyrillic recount now **70584 lines / 1218 files** vs dossier's 69601 / 1211
  (+983 lines / +7 files). The dossier's own blind-spot list admits this ("любой мой номер строки мог
  сдвинуться"). Drift is disclosed, not concealed. Numbers below are measured at 39a72952.
- `git status --short | wc -l` -> 423 modified/untracked paths. Three builders are live in the tree.

## 1. Headline defect #1 — Odontogram "Выбрано: 2 зубов" — REPRODUCED, reachability CONFIRMED
   (and the dossier under-verified one link, plus one small overreach)

Literal reproduces, at :686-689 (dossier said 687-689; +1 line drift):

    apps/web/src/components/odontogram/OdontogramModule.tsx:686
      {selectedTeeth.length > 1
        ? `Выбрано: ${selectedTeeth.length} зубов`
        : `Зуб ${menuConfig.toothNumber}`}

Reachability chain I verified myself, link by link — the dossier asserted only "ветка достигается
при length >= 2" and did NOT show that `menuConfig` can be non-null at the same time. It can:

1. `isMultiSelectMode` — real control, two entry points: checkbox «Групповой выбор (Shift)» at
   :570-582, AND a window keydown/keyup listener at :348-356 (`if (e.key === "Shift")`).
2. In multi-select mode `handleToothClick` :469-476 pushes teeth into `selectedTeeth` and forces
   `setMenuConfig(null)` — so the header does NOT render while Shift is held.
3. Release Shift (or uncheck). Selection is NOT cleared: :576-578 clears the menu only when
   `selectedTeeth.length === 0`.
4. Click an **already-selected** tooth. `!selectedTeeth.includes(toothNumber)` is false, so the
   reset-to-one branch (:487-489) is skipped, `activeSelection` keeps length 2, and
   `setMenuConfig({...})` fires at :541. Header renders "Выбрано: 2 зубов".
5. This is the feature's designed flow — :710 `onClick={() => updateToothState(selectedTeeth, ...)}`
   applies a state to the whole selection. Select several, then click one to apply.
6. Mounted: `apps/web/src/PatientsView.tsx:497` and
   `apps/web/src/components/visit/VisitOdontogramTab.tsx:45`.

VERDICT: real, user-reachable, grammatically wrong. Dossier is right.

OVERREACH (small, inside a CONFIRMED item): the dossier enumerates the wrong-agreement counts as
"2, 3, 4 (и 22-24, 32-34, 42-44)". `selectedTeeth.length` is a COUNT, and the tooth universe is
`ToothChart.tsx:49-53` TOP_TEETH 16 + BOTTOM_TEETH 16 = **32 max** (pediatric 10+10=20).
So 33, 34, 42, 43, 44 are unreachable ceilings. Reachable wrong counts: 2, 3, 4, 22, 23, 24, 32.
Looks like FDI tooth-number ranges (11-18/21-28/31-38/41-48) were pasted in where counts belong.

## 1b. Headline defect #2 — ScheduleView "1 записей" — literal REPRODUCES, but the dossier
   mis-attributes one line and the real org has ZERO appointments

Reproduces at the exact stated lines:

    apps/web/src/ScheduleView.tsx:551
      ? `${busiestDoctorLoad.title}: ${busiestDoctorLoad.appointmentCount} записей, ...`
    apps/web/src/ScheduleView.tsx:559
      ? `${busiestChairLoad.title}: ${busiestChairLoad.appointmentCount} записей, ...`

Gate reproduces exactly: `showShiftAnalytics` useState at :191, button «Показать аналитику» :584-587,
card `<p>{card.detail}</p>` at :730 inside `{showShiftAnalytics && (` :724. No role/clinicMode gate.

MIS-ATTRIBUTION: the dossier says ":551 и :559 — `${busiestDoctorLoad.appointmentCount} записей`".
:559 is **busiestChairLoad**, a different resource (chairs, not doctors). The proposed fix still
works (both fields are `appointmentCount`), but the dossier's own §-text is wrong about what :559 is,
and its "самый загруженный врач — всегда он сам" argument does not apply to the chair card at all.

REACHABILITY, traced further than the dossier did:
- `busiestDoctorLoad = highestUtilizationLoad(dashboard?.shiftIntelligence?.doctorLoads)` (:504-505).
- `highestUtilizationLoad` (:499-503) `reduce`s and returns the FIRST element when all utilizations
  tie, because the seed is null and the test is strictly `>`. So it is NON-null whenever
  `doctorLoads` is non-empty — it does not require any load at all.
- `doctorLoads` is DERIVED, not hardcoded: `apps/api/src/sampleData.ts:3107-3135 buildDoctorLoads()`
  filters `appointments` by doctor and shift date. And `appointments` is replaced from Postgres per
  organization: `apps/api/src/db/domainStateHydration.ts:771 replaceAll(appointments, appointmentRecords)`.
- **The real organization has 0 appointments in the database** (my probe below). So today this card
  renders `«<врач>: 0 записей, 0 мин.»` — and "0 записей" is CORRECT Russian (genitive plural).
- HONEST CHARACTERISATION the dossier does not give: this is a **latent** template bug, currently
  printing a correct string, that becomes wrong the moment the dentist books their FIRST appointment
  ("1 записей"), and stays wrong for 2-4, 21-24, etc. That is still worth fixing — it is wrong on the
  most likely small numbers — but the dossier's "врач читает «1 записей»" is a source-level
  prediction, not an observation, and its framing "1-4 записи в день это норма" reads as if the
  practice's pattern had been measured. Its own blind-spot list does own this ("рассуждение о
  соло-практике, а не измерение"), so this is imprecise framing rather than fabrication.

## 1c. DATABASE — the "ЧЕТЫРЕ организации" demolition does not reproduce. There are TWO.

The dossier DEMOLISHED its own brief's claim «в базе 2 организации», asserting: "В базе 4. Две сверх
названных фикстур созданы 2026-07-28T17:02: dce70000-...-0902 «Клиника диктовки Б» и
dce70000-...-0901 «Клиника личного кабинета»."

My probe (own `node -e`, `pg`, read-only, split by organization_id):

    ### orgs
    4a3420d1 "Стоматология, 1 кабинет"      one_chair     created 2026-07-27T00:57:13.748Z
    d0000000 "Демо-клиника для снимков"     small_clinic  created 2026-07-28T13:30:33.756Z
    ### any dce70000 org ever  ->  [{"n":"0"}]

**Zero rows matching `id::text like 'dce70000%'`.** Both extra organizations are gone. They existed
for a window around 17:02 and were torn down — they were a transient test-run artefact, not a
standing fact about the database. The dossier used them to overturn the brief and stated the result
as a flat present-tense fact ("Организаций в базе ЧЕТЫРЕ"). At my measurement time the BRIEF's
number (2) is the correct one and the dossier's demolition is the error.

This is the exact failure mode this critic role was created for — the previously-burned
«4 organizations» number, made of seeder/fixture rows, published as a finding. It recurred.

Per-organization counts (fixture `d0000000` excluded from any conclusion):

    id8       users pats audits appts
    4a3420d1    4     3   1015    0     <- the only real clinic
    d0000000    3    14      0   27     <- screenshot fixture

Reproduces from the dossier: real org 4 users / 3 patients / 1015 audit_events, fixture 0 audits.
NEW and material: the real clinic has **0 appointments**; all 27 appointments belong to the fixture.

`users.ui_preferences` claim reproduces EXACTLY — and its honest caveat holds:

    4a3420d1 8356141b doctor  blob=true  savedAt 2026-05-20T10:59:00.000Z
    4a3420d1 e44d32ca owner   blob=true  savedAt 2026-05-20T11:00:00.000Z
    4a3420d1 93bca14f administrator blob=false
    4a3420d1 f365da0c assistant     blob=false

2 of 4 users carry the blob; both `savedAt` (2026-05-20) precede the organization's `created_at`
(2026-07-27), so they are seeded constants and prove nothing about runtime drift. The dossier said
precisely that. Credit where due — this is the discipline the campaign's earlier failures lacked.

`select left(id::text,8) from users where organization_id::text like '4a3420d1%' limit 1` -> `e44d32ca`,
matching its result. Correctly filed under NOT ESTABLISHED rather than claimed as a live bug.

No language/locale column exists: `information_schema.columns` filtered on `%lang%`/`%locale%`
-> **0 rows**. Reproduces.

Live API probe reproduces byte-for-byte, and still fires with only 2 orgs:

    curl -s -i --max-time 8 http://127.0.0.1:4100/api/settings/preferences
    HTTP/1.1 401 Unauthorized
    {"error":"AuthRequired","message":"В базе несколько клиник — войдите в кабинет, чтобы изменить настройки."}

The wording defect on the READ path is real (a GET is told to log in "чтобы ИЗМЕНИТЬ настройки").

## 1d. Language selector — every claim reproduces exactly, zero line drift

    packages/shared/src/index.ts:7620   export const uiLanguageSchema = z.enum(["ru"]);
    apps/web/src/AppHelpers.tsx:2894    uiLanguageLabels: Record<UiLanguage,string> = { ru: "Русский" }
    apps/web/src/AppHelpers.tsx:2903    detail: "...Выбор сохраняется автоматически и остается до смены языка."
    apps/web/src/AppHelpers.tsx:2906    uiLanguageOptions: UiLanguageOption[] = [defaultUiLanguageOption]
    apps/web/src/AppHelpers.tsx:3620-22 normalizeUiLanguageInput -> isUiLanguage(value) ? value : "ru"
    rg -n 'value=\{uiLanguage\}' -g '*.tsx' apps/web/src -> exactly 2: App.tsx:2615, SettingsClinicTab.tsx:446

`normalizeUiLanguageInput` is provably total onto `"ru"` because the label record has one key, so the
onChange cannot change state. The §3 "control that cannot keep its promise" framing is earned.
R3's `:7449` is indeed stale (now :7620) and R3's third render point
`components/workspace/onboarding/inline/InlineStepClinic.tsx` genuinely does not exist:

    ls .../SmartImportStudio.tsx .../LegacyMigrationStudio.tsx .../inline/InlineStepClinic.tsx
    -> "No such file or directory" on all three

All three DEMOLISHED-by-deletion claims hold.

## 1e. Pluralisation infrastructure — reproduces

    rg -n 'Intl\.PluralRules' -g '*.ts' -g '*.tsx' apps packages   -> zero
    rg -n 'pluralRu'          -g '*.ts' -g '*.tsx' apps packages   -> 3, all in
      components/patients/PatientCommunicationTimelineWidget.tsx (:163 def, :223, :254 use), no export
    ls packages/shared/src/utils/ -> dates.ts money.ts strings.ts   (no plural.ts — packet precedent is real)

## 1f. THE CENSUS — re-derived with a DIFFERENT PARSER. It holds.

The dossier used `@babel/parser`. I rebuilt the census from scratch on the **TypeScript compiler API
5.9.3** (`ts.createSourceFile`, `setParentNodes=true`, real `ScriptKind.TSX`), mirroring its bucket
rules but with one deliberate methodological change: **a template literal counts as ONE unit**, keyed
on its full source text, instead of one occurrence per Cyrillic quasi.

I did NOT run their scripts — they write `ast-census-v2.json` and I am read-only.

| bucket | MINE (occ / distinct) | DOSSIER (occ / distinct) | delta occ |
|---|---|---|---|
| data_not_ui   | 8977 / 5893 | 9608 / 6296 | -631 |
| **a_jsx_visible** | **5251 / 4108** | **5280 / 4084** | **-29** |
| d_test_fixture| 4575 / 3734 | 4711 / 3819 | -136 |
| other         | 4035 / 3431 | 4277 / 3535 | -242 |
| dict_value    | 3028 / 2072 | 3018 / 2062 | +10 |
| b_error_toast | 2208 / 1845 | 2306 / 1898 | -98 |
| log_only      |  124 /  124 |  116 /  115 | +8 |
| dictLookupsInJsx | **265** | **257** | +8 |

Two independent parsers, written independently, land within **0.5 %** on the headline bucket (a):
5251 vs 5280 occurrences, 4108 vs 4084 distinct. The per-file table matches almost exactly:

    mine  dossier  file
     723    727    apps/web/src/DocumentsView.tsx
     454    460    apps/web/src/components/settings/SettingsImportsTab.tsx
     268    269    apps/web/src/App.tsx
     188    191    apps/web/src/components/settings/sources/SourcesDicomCapability.tsx
     170    171    apps/web/src/VisitView.tsx
     164    165    apps/web/src/ImagingView.tsx
     154    156    apps/web/src/components/settings/SettingsTelegramTab.tsx
     120    120    apps/web/src/components/settings/SettingsClinicTab.tsx
     109    109    apps/web/src/ShiftView.tsx
      91     92    apps/web/src/components/reports/ManagerReportsPanel.tsx
      78     78    apps/web/src/components/InventoryView.tsx
      74     74    apps/web/src/components/settings/MigrationWizard.tsx
      72     72    apps/web/src/components/communications/MessageDeliveryConsole.tsx
      68     69    apps/web/src/MarketingView.tsx

**This is the opposite of the campaign's earlier failures.** The «45 of 50 hollow modules» number was a
regex artefact that collapsed on re-measure. This one does not collapse under a different parser.

### The one real methodological defect I found, and it is fully accounted for

    tplNodes (templates containing Cyrillic): 2386
    sum of Cyrillic quasis inside them:       3605
    babel-style per-quasi inflation:         +1219

Their loop does `raws = n.quasis.map(...).filter(CYR)` and then `bump()` **once per quasi**. So
`` `${d.title}: ${d.appointmentCount} записей, ${d.bookedMinutes} мин.` `` scores **2** occurrences and
inserts two DISTINCT entries — `"записей,"` and `"мин."` — neither of which is a translation unit.

Total occurrences: mine 28198, theirs 29316, gap **+1118** — almost exactly the +1219 I measure as
template fragmentation. Total distinct: mine 21207, theirs 21809, gap +602. **The entire aggregate gap
between the two censuses is template fragmentation, nothing else.** Their occurrence counts are inflated
~4 %, and their distinct sets contain ~600 sentence fragments masquerading as strings.

Effect on the deliverable: none material. Their translatable-surface figure is
(a)+(b)+dict_value distinct = 4084+1898+2062 = **8044**; mine is 4108+1845+2072 = **8025**. The
published "ЧЕСТНЫЙ ДИАПАЗОН 8 000-11 500" survives its own methodological error. And the dossier
already disclosed the adjacent limitation itself ("сумма 8 044 — это ВЕРХНЯЯ граница объединения").

Fragment noise in bucket (a) distinct, measured: of 4108 distinct strings, 41 are <=3 chars and 547
are <=8 chars. So ~13 % of "distinct user-facing strings" are single words or punctuation runs split
across JSX expression boundaries, not translatable sentences. Disclosed in spirit, not quantified.

### Comments — cross-checked with a third method, holds

I counted comments context-correctly (dedup'd `ts.getLeadingCommentRanges` over every token, which
also catches JSX `{/* ... */}`), NOT with `ast.comments`:

    files: 745  allComments: 8959  cyrComments: 7006  filesWithCyrComment: 455
    cyrLines: 17561  cyrChars: 798142

Dossier: 7126 comments / 455 files / 18287 lines / 822738 chars. **`filesWithCyrComment` = 455 is an
exact match.** Lines are 4.0 % apart, chars 3.0 %, comment count 1.7 %. Both instruments agree that
~17.5-18.3k Cyrillic lines live in comments across 455 files, and therefore that ~40 % of any
line-based "translation budget" is untranslatable by construction. That is the dossier's single most
valuable correction and it survives independent measurement.

Note a denominator mismatch in its own arithmetic (18287/44756 = 41 %): the numerator comes from three
`src` dirs, the denominator from all of `apps packages`. Since the numerator's file set is a strict
subset of the denominator's, the true comment share of the scanned source is **higher** than 41 %.
The dossier understated its own strongest point rather than overstating it.

## 2. Self-caught tool artefact (recording it because the role is about tool artefacts)

My first probe used `rg -rn 'shiftIntelligence' ...`. In ripgrep `-r` is `--replace`, so every hit
printed as `dashboard?.n?.doctorLoads` / `nSchema`, which looked like proof that ScheduleView reads
a field that does not exist. It was my flag, not a defect. Re-run without `-r`:
`shiftIntelligence` is a real schema field (`packages/shared/src/index.ts:4384`, defined :1601) and
is populated (`apps/api/src/sampleData.ts:10386`). Retracted before publication.
