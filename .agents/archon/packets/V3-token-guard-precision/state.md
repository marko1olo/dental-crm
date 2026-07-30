# V3-token-guard-precision — state

STATUS: DONE
HEAD at finish: a0ee75ebaabb9c5a284697ca270d66a34dde7fdb (moved under me twice: started at
8ff0ba18e, foreign 6aade173f landed mid-packet — never reasoned from a remembered hash)
MY COMMITS: 1d5fdc3de3f26ab67c1d122637efb5edff97b103 (парсер + шапка token-aliases.css)
            a0ee75ebaabb9c5a284697ca270d66a34dde7fdb (фикстуры на разбор)

## Claim (respected)
- scripts/check-css-tokens.mjs                -> edited, committed
- apps/web/src/styles/token-aliases.css       -> comments only, committed
- scripts/tests/check-css-tokens.test.mjs     -> NEW, required by the packet's PROOF EXPECTED
  (a fixture test cannot exist without a new file; declared openly in handoff.md)
- NOT main.css (foreign-dirty, and --danger deliberately left unfixed), NOT App.tsx,
  NOT package.json, NOT apps/api/**.

## Both defects were REAL. Both closed.
1. Declaration regex was unanchored — at line **119**, not :129 as the review says.
   `.auth-pin-btn--danger:hover` was read as a declaration of `--danger`.
2. .ts/.tsx harvest read comments — at lines **132-136**, not :143-149 as the review says.
   File was byte-identical to its only commit a6a6f019b, so the review measured this blob
   and mis-cited the lines.

## SAME-INSTANT before/after over the real tree (the tree moves; two runs minutes apart
   would have been confounded — the pre-fix blob was run from scripts/ so it resolved the
   same repo root, then deleted)
  BEFORE (blob 6aade173f): 52 css / **154** declared / 9 js / 2946 var() (370 fallback) /
                           178 names / **2 имён, 10 вхождений**   TRUE_EXIT=1
  AFTER  (working tree):   52 css / **147** declared / 9 js / 2946 var() (370 fallback) /
                           178 names / **3 имён, 12 вхождений**   TRUE_EXIT=1
  Offender-list diff = exactly one added line: `2x  --danger`. Every other number identical.

## Accounting for all 7 removed phantoms
--danger --secondary --button --ok --warn --bad --info. Only --danger became a new offender;
the other six are never used via var() at all (`rg 'var\(\s*--(ok|warn|bad|info|button|secondary)\s*[,)]'`
-> no hits), so removing their phantom declarations changed nothing observable. GAINED = [].

## MUTATION (does the fixture bite?) — same fixture, two parser versions
  pre-fix blob:  `1 имён, 1 вхождений` (only the control --definitely-missing-xyz)
  post-fix:      `3 имён, 3 вхождений` (+ --danger eaten by a class name, + --commented-token
                 eaten by a TS comment). Reproduces the reviewer's numbers exactly.

## Proofs run
- SMOKE: node scripts/check-css-tokens.mjs -> TRUE_EXIT=1, RED BY DESIGN, 0.83 s.
- UNIT: node --test scripts/tests/check-css-tokens.test.mjs -> tests 5 / pass 5 / fail 0,
  TRUE_EXIT=0.
- Contrast recomputed: 1.0740, not 1.02 (L 0.013572 / 0.009189). Review §5/§7.5 confirmed.
- TYPECHECK: `npm run typecheck -w @dental/web` is RED with 5 errors, ALL FOREIGN and dirty
  (useAppLogic.tsx:3696-3697 `recordedPatientViewRef`, cornerDockLayout.test.ts:11/14/17
  missing exports; both files ` M` and not mine). apps/web/tsconfig.json includes only
  ["src","vite.config.ts"], so scripts/** cannot affect any typecheck gate.
  => The packet's «Both typecheck gates are GREEN right now» is NO LONGER TRUE. Not mine.

## Log
STARTED -> AUTHORITY READ -> DEFECT CONFIRMED (measured) -> EDIT WRITTEN -> GATE PASSED ->
COMMITTED 1d5fdc3de -> PROVEN (same-instant + mutation + 5/5 fixtures) ->
COMMITTED a0ee75eba -> DONE
