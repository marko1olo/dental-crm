# U3-undefined-tokens — state

STATUS: DONE
HEAD at finish: e8be281d9765e06e25842939fdd387a4c5dfd37b (moved under me; re-read, never remembered)
MY COMMITS: b05e18f79cfa54e702d062b0decad34498e27e76 (fix)
            a6a6f019b2ec45941f1784cc95dd9287e5347745 (guard + test + stale-count correction)

## Claim (respected)
- apps/web/src/styles/token-aliases.css   -> edited, committed
- scripts/check-css-tokens.mjs            -> new guard
- apps/web/src/tests/themeTokenSpecificity.test.ts -> new node:test
- NOT DocumentsView.tsx. NOT main.css (dirty from the foreign author at ~11241) — never
  touched, never staged.

## Element
Black bar = `strong.patient-next-action`, apps/web/src/PatientsView.tsx:293.
Painted by apps/web/src/styles/main.css:9555-9568
  `.patient-next-action { background: var(--srf-chip-soft); color: var(--ink) }`

## MEASURED (pngjs; probe-pixels.mjs / probe-theme.mjs in this dir)
bar fill #16211f (= DARK --srf-chip-soft, token-aliases.css:85; the ONLY occurrence of that
hex in all of apps/web) | bar text #111827 (--ink, main.css:138) | h3 #0f1e1b
(--text-primary, premium.css:27) | phone #64748b (--muted, main.css:139 -> proves
data-theme="light" WAS set) | card #ffffff | page #fdfefd. Text/fill contrast 1.02.

## ROOT CAUSE — packet hypothesis REFUTED
Token was NOT undefined. An undefined var() in `background` is invalid at computed-value
time; background-color does not inherit, so it becomes `transparent`, NEVER black. The
dossier's stated mechanism is physically impossible.
Real cause = selector specificity in token-aliases.css:
  light `:root, [data-theme="light"], html.light` -> only (0,1,0) when html.light absent
  dark  `[data-theme="dark"], html.dark`          -> html.dark is (0,1,1) and WINS
apps/web/index.html:2 hardcodes `<html lang="ru" class="dark">`, so the state is real.
main.css survives it via `:root[data-theme="light"]` (0,2,0). token-aliases.css did not.
Same trap already documented in apps/web/src/lib/themeClasses.ts:17-22. Night was equally
exposed: html.dark (0,1,1) also beat [data-theme="night"] (0,1,0).

## TRIGGER + honest reachability
scripts/ops-panels-shots.mjs at ab2097921 (live at the 22:19 capture) set ONLY the attribute,
never the classes -> index.html's class="dark" stayed. Fixed later at b41b117ff (22:46).
CONTROL EXPERIMENT: patients_light_full.png (05:55 today, fixed harness, CSS unchanged since
1978ac517) has ZERO dark boxes in the left column. Same CSS, two plates, only variable = the
`dark` class.
=> Live steady state does NOT reproduce it (ThemeController, AppShell.tsx:60-74, sets
   attribute + both classes in one action). I did NOT claim users see it.

## FIX
All three themes at (0,2,0); `html.dark:not([data-theme])` keeps the cold-load first frame
dark, matching main.css in that same state. No hex at any call site. Theme values unchanged.

## PROOFS RUN
- SMOKE: node scripts/check-css-tokens.mjs -> exit 1, RED BY DESIGN.
  TRUE COUNT = 2 names / 10 occurrences (--brand-400 x5, --glass-bg x5), NOT 19/56.
  The 19/56 in token-aliases.css was STALE -> corrected in the file.
- UNIT: 7/7 pass. MUTATION-TESTED: old selectors -> 3 fail, actual '#16211f' vs '#f7fbf9'
  — the exact pixel-measured colour, reached by an independent method.
- UNIT: npm test -w @dental/web -> 461/461 pass, 0 fail.
- TYPECHECK: zero errors in my files; only the 6 pre-existing AnamnesisField errors in the
  foreign author's dirty DocumentsView.tsx.
- HTTP 200 from the shared dev server on 5173 serving the fixed selectors (no restart).
- Encoding guard names none of my three files.

## NOT VERIFIED
Rendered pixels (lead owns screenshots) and live-browser computed value. Exact closing
commands are in handoff.md.

## Log
STARTED -> AUTHORITY READ -> DEFECT CONFIRMED (measured) -> EDIT WRITTEN -> GATE PASSED ->
COMMITTED b05e18f79 -> PROVEN -> COMMITTED a6a6f019b -> DONE
