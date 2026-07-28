# R3-i18n-route — DOSSIER

Read-only reconnaissance. Every finding below carries the command that produced it.
Repo: C:\Clinic_MVP\dental-crm . Date 2026-07-28.

## F1 — There is no i18n runtime of any kind, and none is even installed transitively. CONFIRMED

Command:
```
fd -t f -g package.json -E node_modules -E dist . | while read f; do jq -r ... keys|select(test("i18n|intl|lingui|formatjs|globalize|polyglot|translat";"i"))
```
Output: 4 package.json files (root, apps/api, apps/web, packages/shared), match column EMPTY for all four.

```
fd -t d -d 3 "^(i18next|react-i18next|react-intl|@lingui|@formatjs|intl-messageformat|node-polyglot|globalize|vue-i18n|next-intl|typesafe-i18n|@intlify)$" node_modules
```
Output: zero directories. Not even a transitive copy exists.

```
rg -n -g "!node_modules" -g "!dist" -e "useTranslation|<Trans[ >]|FormattedMessage|defineMessages|i18n\.t\(|\bi18next\b|IntlProvider" apps packages scripts
```
Output: zero matches.

Verdict: the previously recorded claim "no i18n library, zero useTranslation" is CORRECT. Nothing to migrate FROM;
any i18n work is greenfield.

## F2 — The language selector is decoration by construction, rendered in 3 places, prop-drilled into 6 more that never use it. CONFIRMED

The option list has exactly one element and the type system forbids a second:
- `packages/shared/src/index.ts:7449` — `export const uiLanguageSchema = z.enum(["ru"]);`
- `apps/web/src/AppHelpers.tsx:2894-2896` — `uiLanguageLabels: Record<UiLanguage,string> = { ru: "Русский" }`
- `apps/web/src/AppHelpers.tsx:2906` — `export const uiLanguageOptions: UiLanguageOption[] = [defaultUiLanguageOption];` (array literal, length 1)
- `apps/web/src/AppHelpers.tsx:3620-3622` — `normalizeUiLanguageInput` returns `"ru"` for every input, so the onChange handler is a
  provable no-op: the only value the <select> can emit is already the current value.

Three real render sites:
- `apps/web/src/App.tsx:2614-2623` (onboarding clinic form, label "Язык интерфейса")
- `apps/web/src/components/settings/SettingsClinicTab.tsx:442` (Settings > Клиника)
- `apps/web/src/components/workspace/onboarding/inline/InlineStepClinic.tsx:75-90`
Verified: `rg -n "value=\{uiLanguage\}"` returns exactly those three.

The subtitle under the control actively promises a capability that does not exist —
`AppHelpers.tsx:2903`: "Русский интерфейс включен сейчас. Выбор сохраняется автоматически и остается до смены языка."
"до смены языка" = "until you change the language". There is no language to change to.

Dead prop drilling — 6 files destructure `setUiLanguage`/`normalizeUiLanguageInput`/`uiLanguageOptions` and render no selector:
SettingsImportsTab.tsx:993,1224-1225,1287 / SettingsAuditTab.tsx:996 / LegacyMigrationStudio.tsx:1087 /
SmartImportStudio.tsx:1091,1322-1323,1386 (the variable is literally named `_typedUiLanguageOptions`, underscore-prefixed
to silence the unused warning) / SettingsView.tsx:622,853-854,917 / useSettingsDerivations.tsx:1085,1316-1317,1384.
Verified per-file: `rg -c "value=\{uiLanguage\}" <file>` = 0 for all six while `rg -c setUiLanguage` = 1.

Nothing anywhere reads `uiLanguage` to choose a string. Its only non-render consumers are
`useAppLogic.tsx:3117` (writes it into the UiPreferences payload) and `useAppLogic.tsx:3566` (reads it back), i.e. it
persists itself and nothing else. 94 total textual occurrences across 26 files (`rg -o uiLanguage | wc -l` = 94).

Matters for a solo dentist: mildly negative. A dentist who opens Settings, sees "Язык интерфейса", opens the dropdown
and finds one entry learns that the product ships controls that do nothing. Constitution §1 forbids exactly this.

## F3 — THE TRUE SIZE. Comments are 29% of web / 46% of api Cyrillic lines, not "enormous". CONFIRMED, two instruments agree.

Instrument A: `.agents/archon/recon/R3-i18n-route/scan_cyrillic.mjs` — a hand-written lexical scanner that walks each
file character by character tracking line-comment / block-comment / single-quote / double-quote / template-literal /
regex-literal / bare-code state, and attributes every Cyrillic CHARACTER to the state it was found in.
Instrument B: `rg -c "[\x{0400}-\x{04FF}]"`.

They agree exactly on the totals, which is why I trust the split:

    rg -c "[\x{0400}-\x{04FF}]" apps/web/src | wc -l        -> 362   (scanner: 362)
    rg -c "[\x{0400}-\x{04FF}]" apps/web/src | awk -F: sum  -> 20004 (scanner: 20004)
    rg -c "[\x{0400}-\x{04FF}]" apps/api/src | wc -l        -> 283   (scanner: 283)
    rg -c "[\x{0400}-\x{04FF}]" apps/api/src | awk -F: sum  -> 19743 (scanner: 19743)

### Cyrillic-bearing files and lines, by area (8750 files scanned; node_modules, dist, .git excluded)

| area | files | Cyrillic lines | Cyrillic chars |
|---|---|---|---|
| apps/web/src | 362 | 20 004 | 610 186 |
| apps/api/src | 283 | 19 743 | 841 851 |
| packages/shared/src | 8 | 1 286 | 36 011 |
| **SHIPPING TOTAL** | **653** | **41 033** | **1 488 048** |
| scripts/ (smoke) | 126 | 4 950 | 147 620 |
| docs + .agents | 459 | 18 819 | 821 217 |
| scratch/ | 244 | 11 523 | 316 837 |
| migrations + *.sql | 33 | 773 | 33 321 |
| other (test snapshots, .data backups, artifacts) | 1040 | 44 967 | 1 801 623 |

**CORRECTION TO THE BRIEF.** The inherited figure "roughly 314 files and ~14,814 Cyrillic-bearing lines" undercounts
the shipping surface by about a factor of 2. Real: **653 files / 41 033 Cyrillic-bearing lines** across web+api+shared.
`apps/web/src` alone is already 362 files / 20 004 lines.

### The comment split — the measurement the packet called the most important one

Characters, code files only:

| area | comment | string | template | JSX text | regex | bare code |
|---|---|---|---|---|---|---|
| apps/web/src | 247 781 | 228 463 | 22 724 | 70 217 | 5 452 | 66 |
| apps/api/src | 378 662 | 336 269 | 83 478 | 0 | 7 480 | 653 |
| packages/shared | 6 756 | 23 545 | 3 726 | 0 | 1 981 | 0 |

Lines whose only Cyrillic is in one bucket (mixed = line carries two kinds):

| area | comment-only | string-only | tpl-only | jsx-only | regex-only | bare-only | mixed |
|---|---|---|---|---|---|---|---|
| apps/web/src | 5 605 | 8 923 | 828 | 3 404 | 126 | 8 | 157 |
| apps/api/src | 8 331 | 8 327 | 1 160 | 0 | 292 | 78 | 76 |
| packages/shared | 159 | 926 | 83 | 0 | 50 | 68 | 68 |

So: comments are **5 605 of 19 051 Cyrillic-bearing web code lines = 29.4%**, and **8 331 of 18 264 api lines = 45.6%**.
The brief predicted comments would "inflate a naive count enormously". They inflate it by about a third in the web app
and by about half in the API — real, but the majority of the Cyrillic is genuine string content. Anyone who assumed
comments were the bulk of it was wrong.

### Translation units — the number that actually costs money

    node .agents/archon/recon/R3-i18n-route/scan_cyrillic.mjs
      literal occurrences (web+api+shared, non-comment) : 26 926
      distinct strings                                  : 17 508
      interpolated template literals                    :  2 032   <- need ICU arg/plural handling, not a flat map

And the honest subdivision, because a large slice of this Cyrillic is Russian *data* that must never be translated:

| category | occurrences | distinct | translatable? |
|---|---|---|---|
| web UI (screens, buttons, toasts, empty states) | 13 497 | 8 620 | YES — the real i18n job |
| api runtime user-visible errors + notifications | 2 238 | 2 031 | YES |
| packages/shared (labels, doc metadata, money errors) | 1 528 | 949 | YES |
| tests (`**/tests/**`, `*.test.ts`) | 3 273 | 2 617 | no, not shipped |
| seed/demo data (`sampleData.ts`, `sampleData_opt.ts`) | 2 298 | 1 068 | no, demo content |
| import matchers (`migration/**`, `routes/smartImports.ts`) | 1 832 | 1 499 | **NO — they match Russian column headers inside competitor exports; translating them breaks import** |
| Russian speech/AI language data (`speech/**`, `ai/**`) | 989 | 904 | **NO — Russian phonetics and vocabulary; another locale needs a different data set, not a translation** |
| legal document templates (`documents/**`) | 636 | 570 | **NO — Roszdravnadzor forms stay Russian whatever the UI language is** |
| api dev scripts (`api/src/scripts/**`) | 635 | 563 | no |

**Real user-facing translation surface: about 11 600 distinct strings (8 620 + 2 031 + 949).** About 5 755 of the
Cyrillic occurrences are Russian-as-data that must stay Russian permanently.

## F4 — THE SEAMS. Dictionaries exist and are the right attach point, but they cover only 17.9% of the UI. CONFIRMED

The four named files are real, well-shaped, single-language `Record<Enum, string>` maps:

| file | lines | shape | Cyrillic literals |
|---|---|---|---|
| `apps/web/src/workspaceUiLabels.ts` | 522 | 17 flat `Record<..., string>` + 1 `Record<ClinicMode,{title,detail}>` at :345 + 5 pure functions + 4 `Set<DocumentKind>` | 170 |
| `apps/web/src/imagingUiLabels.ts` | 411 | 20 `Record<...>` maps + `dicomLabel()` lookup helper at :145 + `mprClinicalPresets` at :158 | 200 |
| `apps/web/src/pricelistUiMeta.ts` | 359 | 3 `Record<...>` + 3 text-building functions (`pricelistWarningsText` :151) + 2 recognition group arrays | 144 |
| `apps/web/src/workspaceStaticOptions.ts` | 242 | 2 `Record<DenteTelegramFeature,string>` (labels at :8, help at :26) + 4 field arrays | 79 |

Note `workspaceUiLabels.ts:35-47` already re-exports `documentKindMetadata` labels from `@dental/shared`, i.e. a second
seam already exists in `packages/shared/src/index.ts` and the web layer consumes it rather than duplicating it. That is
the pattern any i18n work should follow.

Measured coverage (`.agents/archon/recon/R3-i18n-route/scan_dicts.mjs`, brace-matched over every
`const X: Record<...> = {` and every `{ ... label ... }[] = [` block in web-src .ts/.tsx):

    translatable literal occurrences : 14586
    inside a dictionary-shaped block : 2610   (17.9%)
    bare inline                      : 11976  (82.1%)
    distinct Cyrillic dictionary ids : 229

The four NAMED files hold only **593 of 14 586 = 4.1%**. The remaining ~13.8 points sit in 225 further dictionaries
scattered across the tree: `rg -o "Record<[^>]*, *string>" apps/web/src | wc -l` = **361 declarations**, concentrated in
`AppHelpers.tsx` (37), `SettingsImportsTab.tsx` (32), `SettingsAuditTab.tsx` (32), `SmartImportStudio.tsx` (26),
`LegacyMigrationStudio.tsx` (26), `SettingsViewHelpers.tsx` (25), `CommunicationsView.tsx` (19), `imagingUiLabels.ts` (20),
`workspaceUiLabels.ts` (17).

Worst files by BARE literal count — where a migration would actually burn its time:

     767 bare /  767 total  apps/web/src/DocumentsView.tsx        (no dictionary use at all)
     647 bare /  841 total  apps/web/src/components/settings/SettingsImportsTab.tsx
     610 bare /  612 total  apps/web/src/useAppLogic.tsx
     460 bare /  654 total  apps/web/src/components/settings/SmartImportStudio.tsx
     335 bare /  335 total  apps/web/src/documentValidators.ts    (no dictionary use)
     273 bare /  273 total  apps/web/src/App.tsx                  (no dictionary use)
     253 bare /  447 total  apps/web/src/components/settings/SettingsAuditTab.tsx
     195 bare /  195 total  apps/web/src/components/settings/sources/SourcesDicomCapability.tsx
     159 bare /  159 total  apps/web/src/components/settings/SettingsTelegramTab.tsx
     124 bare /  124 total  apps/web/src/ctPlanningCatalog.ts

