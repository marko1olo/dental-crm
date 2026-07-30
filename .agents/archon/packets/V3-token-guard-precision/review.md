> **SUPERSEDED IN PART BY A SECOND ADVERSARIAL PASS — see `review-pass2.md` in this directory.**
> Pass 2 (HEAD `545d2e02d`) re-derived every number independently and confirms this pass's core
> result: the anchor and the AST swap are correct, postcss agrees at 147, the gate goes red against
> the parent blob. It changes the verdict to **NEEDS_REWORK** on one finding this pass missed:
> the guard scans `var()` in `.css` files only and never reads the 1016 `var()` uses in `.ts/.tsx`,
> of which **34 names / 102 occurrences are declared nowhere and carry no fallback** in live
> `style={{…}}` props — so «неизвестных имён без запаса ТРИ» written into `token-aliases.css:19`
> is U3 §4.2 recurring at 11× magnitude, and the blind-spot section added by this very commit
> omits it. Pass 2 also refutes this pass's N3 claim about `dente-redesign.css:688`: that line is
> inside a `/* … */` comment, which the guard blanks, so the builder's fallback list was complete.

# ADVERSARIAL REVIEW — V3-token-guard-precision

Commits attacked: `1d5fdc3de` (parser + token-aliases.css comments) + `a0ee75eba` (fixture test).
Specification: `.agents/archon/packets/U3-undefined-tokens/review.md` — read complete, all 6 numbered
items in §7 plus §4 consequences and §5 nits worked item by item below.
Reviewer did not write this code. Posture: disbelief. Every claim re-run; every number re-derived.
HEAD at review start `93c0a54b1`, at review end `0d728da9d` — the tree moved four more times under
this review. No measurement here was taken across time; all comparisons are paired against one snapshot.

Nothing in this packet loads `apps/api/dist`. The guard reads `apps/web/src/**` off disk only, so the
stale-dist trap does not apply and no rebuild was needed. Stated because the standing order demands it.

## VERDICT: SOUND_WITH_NITS

Both parsing defects were real, both reproduce at the parent commit, both are closed, and the fix is
correct by an **independent oracle the builder never used**: `postcss` — a real CSS parser — finds
**exactly the same 147 declaration names** as the shipped anchored regex, with zero missed and zero
extra. The 7 removed names are phantoms by that oracle too. This is the best-substantiated packet I
have audited in this campaign: I could not break the fix, and I tried four different ways.

Three nits, none blocking, all record-accuracy or robustness rather than behaviour. Details in §7.

---

## 1. GIT HYGIENE — clean

| check | result |
|---|---|
| `1d5fdc3de --numstat` | `apps/web/src/styles/token-aliases.css` 22/4, `scripts/check-css-tokens.mjs` 93/14 → **+115/-18**, exactly as claimed |
| `a0ee75eba --numstat` | `scripts/tests/check-css-tokens.test.mjs` **187/0**, exactly as claimed |
| foreign work swept in? | **No.** 3 files across 2 commits, all three claimed. No `apps/api/dist`, no `tsbuildinfo`, no `.data/*.json`, no `scratch/**`, nothing from the neighbouring dirty authors |
| `git status --porcelain -- scripts/` | **empty** — the claimed temp artefact `scripts/.v3-baseline.mjs` is genuinely gone; `node_modules/.cache` fixtures are removed in `finally` (verified by running the suite and listing the directory: empty) |
| subjects | Both Russian, Conventional Commits with the `[ARCHON]` prefix, and both name the **defect**, not the activity |
| gitleaks | re-ran `gitleaks detect --log-opts="1d5fdc3de^..a0ee75eba"` → **`no leaks found`, TRUE_EXIT=0** |
| encoding | all 4 committed/packet files + both commit bodies checked **as characters**: 0 mojibake lines, no BOM, 0 U+FFFD, Cyrillic present, subjects clean |
| commitmsg files | `commitmsg.txt` / `commitmsg-test.txt` are **byte-identical** to the actual commit messages — no post-hoc editing of the record |
| working tree vs commits | `git diff a0ee75eba -- <the 3 files>` **empty** — what I reviewed is what was committed |

`token-aliases.css` shows CRLF on disk; both the parent blob and the committed blob are LF, so that is
`core.autocrlf` on checkout, not a line-ending rewrite by the builder.

Packet docs (`state.md`, `handoff.md`, `commitmsg*.txt`) are untracked, matching every other packet in
this campaign. They are **not** in the commits, contrary to a flat reading of the FILES CHANGED list.

## 2. WAS THE DEFECT REAL AT THE PARENT? — YES, reproduced at `1d5fdc3de^`

`git rev-parse 1d5fdc3de^` = `6aade173f`, which is what the builder used as the baseline. Correct blob.

I did **not** trust the builder's delete-after-run baseline. I built an isolated fake repo root in
`%TEMP%` whose `apps/web/src` and `node_modules` were NTFS junctions to the real repo, dropped both
parser versions into its `scripts/`, and ran them minutes apart against **the same live tree** — so
`repoRoot` resolved to the fake root while the files read were real. Read-only on the repo throughout;
junctions removed afterwards and repo integrity re-verified (475 `node_modules` entries, 15 files in
`styles/`, guard still runs).

```
BEFORE (blob 6aade173f)                 AFTER (working tree at HEAD)
css-файлов проверено:            52     css-файлов проверено:            52
объявлено переменных в css:     154     объявлено переменных в css:     147
имён выставляется из js:          9     имён выставляется из js:          9
использований var():           2945     использований var():           2945   (с запасом 369 / 369)
имён использовано через var():  178     имён использовано через var():  178
НЕ РАЗРЕШАЕТСЯ:      2 имён, 10 вх.     НЕ РАЗРЕШАЕТСЯ:      3 имён, 12 вх.
TRUE_EXIT=1                             TRUE_EXIT=1
```

Offender-list diff, computed mechanically, is **exactly one added entry**:

```
> 2x  --danger
>      apps/web/src/styles/main.css:2251
>      apps/web/src/styles/main.css:4090
```

The count moved. Defect 1 was real. My `var()` figures are 2945/369 where the handoff quotes 2946/370 —
that drift is **declared in the handoff itself** (`2938 -> 2946 -> 2945`, `366 -> 370 -> 369`) and my
BEFORE and AFTER agree with each other, which is the only thing the comparison rests on.

## 3. PROOF AUDIT — every claimed command re-run, true exit codes captured

| Claim | Result |
|---|---|
| `node scripts/check-css-tokens.mjs` red by design, 3 names / 12 occurrences | **REPRODUCED. TRUE_EXIT=1.** 52 / 147 / 9 / 2945 (369) / 178 / `3 имён, 12 вхождений`; `--brand-400` ×5, `--glass-bg` ×5, `--danger` ×2 at `main.css:2251` and `:4090`. Not weakened to green |
| runtime 0.83 s | **REPRODUCED**: 791 / 813 / 828 ms over three runs |
| 383 `.ts/.tsx`, 5.55 MB | **REPRODUCED**: 383 files, 5.60 MB (tree grew under me) |
| `node --test scripts/tests/check-css-tokens.test.mjs` → 5/5 | **REPRODUCED**: `tests 5 / pass 5 / fail 0`, **TRUE_EXIT=0**, 1539 ms. No fixture left behind |
| MUTATION: fixture bites | **REPRODUCED AND EXCEEDED** — see §4 |
| anchor sweep: unanchored 154, `[{;]` 147, `[{;}]` 147, `[{;}]`+`m` 147, LOST=7, GAINED=0 | **REPRODUCED number-for-number** in one process over one snapshot, with file:line for every match site |
| the 8 phantom match sites (`auth.css:362,371`, `dente-operations.css:168,172,356,363,370,377`) | **REPRODUCED exactly** — all 8, `--button` twice as claimed |
| 6 of 7 phantoms inert: `rg 'var\(\s*--(ok\|warn\|bad\|info\|button\|secondary)\s*[,)]' apps/web/src` | **REPRODUCED**: exit 1, zero hits |
| `--danger` declared nowhere | **REPRODUCED THREE WAYS**: postcss finds no `--danger` declaration in any of the 52 files; the unanchored regex's only match is the phantom `auth.css:362`; it is in neither the old nor the new JS name set; the only `--danger:` text outside `apps/web/src` is the guard's own header comment and the test fixture |
| contrast 1.0740, L 0.013572 / 0.009189 | **REPRODUCED to six decimals** with an independent WCAG implementation. The 1.02 in `b05e18f79`'s body (line 13) and in the old `token-aliases.css:86` was wrong |
| 6 names declared only outside a theme block, `--corner-dock-*` at `cornerDock.css:20-37` | **REPRODUCED exactly**, including all six line numbers (20, 21, 26, 27, 31, 37). 141 in-theme + 6 outside = 147 |
| `.gitignore` first line excludes the fixture dir | **TRUE**: line 1 is `node_modules/` |
| `.gitignore:60-61` are `scratch_*.cjs` / `scratch_*.js`, so `scratch/…mjs` is unignored | **TRUE**, verbatim |
| `scratch/scan-undefined-tokens.mjs` exists, untracked, unignored | **TRUE**: on disk, `git ls-files` → nothing, `git status` → `?? scratch/scan-undefined-tokens.mjs`. The builder's self-caught correction is accurate |
| `typescript` is a declared root dep; `pg` precedent in `check-schema-type-drift.mjs` | **TRUE**: root `devDependencies.typescript ^5.8.3`, installed 5.9.3; `check-schema-type-drift.mjs:22` is `import pg from "pg"` |
| `apps/web/tsconfig.json` includes only `["src","vite.config.ts"]` | **TRUE** — `scripts/**` is in no typecheck gate |
| fixture test wired into no gate | **TRUE**: root `test` delegates to workspaces only; `@dental/web`'s is `node --import tsx --test "src/**/*.test.ts" "src/**/*.test.tsx"`. Honestly declared as NOT PROVEN |
| typecheck | `npm run typecheck -w @dental/web` is now **GREEN, TRUE_EXIT=0, 0 errors** — and green with `npx tsc -b --noEmit --force`, so this is not a `tsbuildinfo` no-op. The handoff's "5 foreign errors" was a moment in time that the foreign author has since fixed; direction of the claim was honest (it claimed red, not green) |

## 4. THE GATE ACTUALLY GOES RED — proven harder than claimed

The builder proved the mutation by diffing guard **output** between parser versions. That is not the
gate. The gate is the test file. So I installed the **pre-fix blob under the production filename** in
an isolated tree and ran the **committed test suite, byte-for-byte**, against it:

```
node --test scripts/tests/check-css-tokens.test.mjs     # guard = 6aade173f blob
TRUE_EXIT=1   tests 5 / pass 1 / fail 4
```

And the failures are **real assertion failures with the right numbers**, not spawn errors:

| fixture | pre-fix failure |
|---|---|
| BEM suffix | `AssertionError: селектор не объявляет токенов` — `2 !== 0` |
| TS comments | `AssertionError: комментарий не выставляет токенов` — `2 !== 0` |
| all legal declaration positions | `AssertionError: setProperty, обычный и вычисляемый ключ` — `2 !== 3` |
| both misses on one input | `actual { names: 1, occurrences: 1 }` vs `expected { names: 3, occurrences: 3 }` |

The fifth (per-site fallback) passes on both versions — correct, it is a declared regression pin, not a
mutation target.

Independently, running each fixture through both parsers side by side:

```
                              PRE-FIX                       POST-FIX
F1 bem-suffix        exit=0  decl=2 js=0  0n/0occ    exit=1  decl=0 js=0  1n/1occ [--danger]
F2 ts-comments       exit=0  decl=0 js=2  0n/0occ    exit=1  decl=0 js=0  2n/2occ
F3 all-positions     exit=1  decl=6 js=2  1n/1occ    exit=0  decl=6 js=3  0n/0occ
F4 per-site-fallback exit=1  decl=0 js=0  1n/1occ    exit=1  decl=0 js=0  1n/1occ
F5 reviewer-4-line   exit=1  decl=1 js=1  1n/1occ    exit=1  decl=0 js=0  3n/3occ
```

Two things the handoff does not claim and should have:
- On F1 and F2 the **pre-fix guard exits 0** — it was not merely printing a short list, it was
  reporting *all clear* on a file with an undefined token. That is the strongest statement of the defect.
- On F3 the pre-fix parser produced a **false alarm** (`--from-computed-key`): the old text regex
  `/["'`](--[\w-]+)["'`]\s*:/` cannot match a computed key `["--x"]: v` because of the `]`. The AST swap
  fixed a false-positive as well as a false-negative. The builder undersold its own change.

## 5. DID THE FIX BREAK ANYTHING? — no, and I attacked it four ways

**(a) Independent parser oracle.** `postcss` over all 52 files:

```
unanchored regex        154 names
anchor [{;]             147
anchor [{;}]  (shipped) 147
anchor [{;}] + m        147
postcss (real parser)   147     parse failures: 0

REAL declarations postcss has that the shipped regex lacks : 0
Names the shipped regex has that postcss does not          : 0
Names the OLD regex has that postcss does not              : 7  (--bad --button --danger --info --ok --secondary --warn)
```

Zero divergence from a real CSS parser. The builder's regex-vs-regex comparison could only prove the
sets differ by 7; this proves the *survivors are exactly right*.

**(b) Anchor stress gauntlet, 22 constructed cases, postcss as truth.** Declaration at file start; three
declarations adjacent with no whitespace (`{--a:1;--b:2;--c:3}` — the classic anchor-consumption bug);
empty value followed by another declaration; after a nested rule's `}`; after a comment; `@property`;
inside `@media` / `@supports` / `@layer` / `@container`; `}` inside a string value; `;` inside a
`data:` URL; after `!important`; after an `&:hover` nested block; after a `var()` value; multi-line
indented; declaration after an at-rule block closes inside a rule; CRLF file; leading-whitespace
fragment. Plus four must-NOT-match traps: BEM suffix + pseudo-class, BEM suffix + pseudo-element,
attribute selector containing `--fake:1`, and a comment containing a fake declaration.

**Result: 22/22 OK, missed = 0, phantom = 0.** I could not construct a legal position the anchor loses.

**(c) The AST swap, as sets rather than counts.** The handoff only claims "9 names before, 9 after".
Equal counts do not prove equal sets, so I computed both:

```
old text regex: --ab --abr --af --glow --mpr-axis-deg --mpr-slab-width --mpr-slice-position --sa-viewer-filter --sa-viewer-transform
new AST       : (identical, 9)
ONLY OLD (lost by the AST -> false-alarm risk): []
ONLY NEW: []
```

**(d) Are those 9 genuine, or is the guard forgiving a lookup table?** The AST accepts *any* string
key starting with `--`, so a `Record` of labels would count as a declaration. I traced every site:
`--ab/--abr/--af` are keys of real `style={{…}}` props on `._ccm-btn` buttons (`VisitView.tsx:1330`,
`:1337`, `:1352`); `--glow` is a real `style` key (`WorkspaceFeaturesSelector.tsx:262`); the three
`--mpr-*` are 14 sites each, matched `PropertySignature` in the style type plus `PropertyAssignment` in
the object; `--sa-viewer-filter/-transform` are real style keys
(`ShadowAnalystImageSlider.tsx:68-69`). **All 9 genuinely set a custom property.** The claim "все 9
имён настоящие" holds under inspection, not just under assertion.

**(e) `token-aliases.css` really is comment-only.** Proven two ways rather than by eye: the postcss
node skeleton of the file is **identical** before and after (41 nodes, no diff), and the guard's own
`blankComments` view of the two blobs is **byte-identical** — so the `.auth-pin-btn--danger:hover` text
the builder wrote into that comment is invisible to the guard, as claimed. Confirmed independently:
the unanchored regex's only `--danger` match anywhere is `auth.css:362`, never `token-aliases.css`.

**Reachability.** The guard is a developer/CI tool: no import from `apps/**`, no bundle, no user
surface, in no npm script, in no tsconfig. Nothing user-visible could regress. What IS reachable is the
defect the guard now reports — see §6.

## 6. THE DEFECT THE GUARD NOW REPORTS — confirmed, correctly left unfixed

`--danger` is declared nowhere and consumed with no fallback at `main.css:2251`
(`.imaging-upload-status.cancelled`) and `:4090` (`.dicom-series-blocked`). I read both rules: each is
`border-left-color: var(--danger)` over a base that sets `border-left: … solid var(--teal)`. The
mechanism the builder describes (invalid at computed-value time → initial value; `border-left-color`
does not inherit, so its initial value is `currentColor`) is spec-correct reasoning and the builder
labels it **NOT PROVEN in pixels** — which is the honest label. It remains the lead's item; the U3
review explicitly ordered "Do not fix it in this packet", and it was not fixed. Correct obedience.

## 7. NITS (do not block)

**N1 — a false reference-frame explanation, repeated three times.** The handoff says
`main.css:4090` "в рабочем дереве = `main.css:4065` в HEAD (main.css грязный от второго автора, выше
4065 добавлено ~25 строк)" — repeated at §7.4 and in Долг §1. That explanation is wrong. The ~25 lines
came from **commit `6aade173f`**, which `git show --numstat` confirms added exactly `25 0` to
`main.css` and which `git merge-base --is-ancestor` confirms is an **ancestor of `1d5fdc3de`**. So at
the builder's own HEAD, the *committed* `main.css` already had the rule at 4090; `4065` was only ever
true in the U3-era frame (`a6a6f019b`, where I measured it at 4064/4065). `main.css` is clean in the
worktree now. Measured line numbers per commit: `a6a6f019b` → 4064, everything from `6aade173f`
onward → 4089. **The shipped numbers (2251, 4090) are right at HEAD; only the reason attached to them
is wrong.** No measurement or fix depends on it. Since the standing charge for this campaign is
fabricated proof, I name it: this is a guess presented as a fact, in a handoff otherwise free of them.

**N2 — the guard now hard-fails without `node_modules`.** `import ts from "typescript"` makes a
previously dependency-free script die with `ERR_MODULE_NOT_FOUND` in a tree without installed
dev-dependencies. Verified: same minimal tree, one CSS file with `var(--nope)` — the pre-fix blob
prints its inventory and exits 1; the post-fix guard prints a Node stack trace and exits 1. The failure
direction is safe (red, never falsely green) and the exit code is unchanged, but a consumer reading
only the exit code cannot tell a crash from a finding. `typescript` is a **devDependency**, so
`npm ci --omit=dev` would break it. This requirement is documented in the *test* file's header, where
nobody running the guard will look — **not** in the guard's own header, which has a detailed "ЧЕГО
ПРОВЕРКА НЕ ВИДИТ" section that would have been the right home for it.

**N3 — two stale/incomplete citations on foreign dirty files.** `CornerDock.tsx:213/230/267/272` is now
`:220/237/274/279` (constants at `:44-46`) — the file was being edited underneath the builder, and the
handoff does declare the tree moves, so this is drift rather than invention. And the fallback
enumeration "`cornerDock.css:44,47`, `dente-redesign.css:844`" misses a fourth site,
`dente-redesign.css:688` (`var(--corner-dock-reserve-block, 100px)`). All four sites do carry a
fallback, so the substantive claim — no false alarm today — holds; the list was just short by one.

## 8. HOLLOW-FACADE / STANDARDS SWEEP — nothing found

- No `{success:true}` over a no-op, no placeholder, no `// TODO`, no mock. The exit code is honest:
  1 with a real, now-complete list.
- No hardcoded hex, port, UUID or endpoint introduced. No static `px` where a relative unit belongs.
  The only hex in the diff is inside a CSS comment quoting `#16211f`/`#111827` as measured values.
- `useAppLogic.tsx` untouched; no return field deleted; no listener, interval, or handle created, so no
  teardown is owed. No file deleted. No second owner of any state.
- New Russian text lives in CSS comments, a CLI script's `console` output, and test assertion
  messages — no user-facing UI literal, so no i18n obligation.
- §11 `madge` and the biome orders: not penalised per the review brief (`madge` absent; biome would
  reformat the repo).
- The `}` in the anchor is the *stricter*, not the looser, choice: it is required for legal CSS nesting
  and, as the gauntlet shows, buys no phantom.

## 9. ITEM-BY-ITEM AGAINST THE SPECIFICATION (U3 review §7 + §4 + §5)

| # | Requirement | Builder's label | My verdict |
|---|---|---|---|
| §7.1 | Anchor the declaration regex; re-run and quote new totals | CLOSED | **CLOSED.** `CSS_DECLARATION = /(?:^\|[{;}])\s*(--[\w-]+)\s*:/g`. Totals quoted and reproduced: 154→147, `2/10`→`3/12`. postcss agrees at 147 |
| §7.2 | Strip comments from `.ts/.tsx` or narrow the pattern; prove with a fixture | CLOSED | **CLOSED, and better than ordered.** TypeScript AST instead of hand-rolled comment stripping — the builder's stated reason (a regex literal `/https?:\/\//` looks like a comment opener to a naive stripper) is correct. Fixture covers line and block comments and fails against the old parser |
| §7.3 | Replace «осталось ДВА»; add `--danger` to the list | CLOSED | **CLOSED.** `token-aliases.css:19-31` now reads «ТРИ», names all three offenders, names all seven forgiven phantoms and the cause, and adds a drift caveat. Comment-only, proven by postcss |
| §7.4 | Record `--danger` as an open inventory item with real usage sites; do not fix | CLOSED (by record) | **CLOSED.** Recorded in `token-aliases.css`, the commit body, and Долг §1 with both sites and the consequence. Rule untouched, as ordered. Line-frame explanation is wrong — see N1 |
| §7.5 | Correct 1.02 → 1.07 in the handoff and at `token-aliases.css:86` | CLOSED | **CLOSED.** 1.0740 reproduced to six decimals. `b05e18f79`'s body still says 1.02 and genuinely cannot be rewritten; `progress.md` is clean of the figure, so no false record is left anywhere that *can* be edited |
| §7.6 | *Optional*: flag a name whose only definition sits outside a `:root`/`[data-theme]` block | DISPUTED with a number | **DISPUTE UPHELD, and I re-measured it.** Exactly 6 such names, all one family (`--corner-dock-gutter/-gap/-z/-control/-control-primary/-bar-floor`, `cornerDock.css:20-37`), and **every `var()` of all six is inside `cornerDock.css` and nowhere else** (`rg -l` returns that one file). As written the rule would emit 6 false alarms and 0 real finds. The builder's restatement — "declared on a component but read outside its subtree" — is the correct requirement and genuinely needs selector-nesting analysis. Legitimate dispute, not a dodge |
| §4.1 | "The claimed true count is false" | CLOSED | **CLOSED** — 3 names / 12 occurrences |
| §4.2 | "The wrong number was written into source" | CLOSED | **CLOSED** — see §7.3 |
| §4.3 | "150 declared is inflated; real is 143" | CLOSED | **CLOSED and confirmed in the new frame**: 154→147, same −7. The review's 150/143 was measured on a smaller tree |
| §4.4 | "The delivered guard is looser than the ordered guard" | DISPUTED in general, CLOSED in the decisive case | **Accepted.** `--danger` — the case that distinguishes the two specs — is closed. The general part reduces to §7.6 and is correctly rejected with a number |
| §5 nit | contrast 1.02 does not reproduce | CLOSED | **CLOSED** |
| §5 nit | "39 names" reproduces as 40 | cause confirmed, no fix | **Accepted.** `scratch/scan-undefined-tokens.mjs` verified on disk, untracked and unignored; the builder self-caught a false first draft that claimed it was gone. Correcting your own unshipped draft before shipping is the behaviour this campaign has been trying to install |
| §5 nit | guard wired into no npm script | DECLARED DEBT | **Accepted** — verified true for the guard *and* the new test. Both suggested script lines are in the handoff. `package.json` is a shared file outside the claim; leaving it to the lead is defensible |
| §6 | no guard that a class cannot outrank `[data-theme]` for the same property | DECLARED DEBT, not this packet | **Accepted** — genuinely U3's open debt, not V3's |

**Nothing was silently ignored.** Every numbered item is labelled and every label survives checking.

## 10. RECORD CORRECTIONS CLAIMED — all four verified

1. «осталось ДВА» → three names. **Verified**: the third is `--danger`, and the file now says so.
2. U3 handoff «Настоящее: 2 имени, 10 вхождений» → 3 / 12, and «Оба имени проверены вручную» is
   incomplete because the third was never printed. **Verified and fair.**
3. «Контраст 1.02» → 1.0740. **Verified** in `b05e18f79`'s body (line 13) and recomputed independently.
4. The builder's own first draft falsely claimed `scratch/scan-undefined-tokens.mjs` was gone.
   **Verified false, and verified self-corrected before shipping.**

Plus a fifth, unlisted but real: the U3 review's line citations `:129` and `:143-149`. **The builder is
right and the review was wrong.** In blob `a6a6f019b`, line 129 is the comment
`// 2. Имена, которые выставляет JS…`; the declaration regex is at **119** and the JS harvest block at
**132-136**. Correcting the reviewer, with the blob quoted, is the right instinct.

## 11. REQUIRED REWORK

None. The three nits in §7 are worth one round of record hygiene, not a rework cycle:

1. (N1) Drop the "= `main.css:4065` в HEAD / main.css грязный" explanation from the handoff and Долг §1.
   The true frame is: `4065` at `a6a6f019b`, `4090` from `6aade173f` (a committed ancestor of this
   packet) onward. The shipped numbers need no change.
2. (N2) Move the "requires installed dependencies" note from the test header into the guard's own
   «ЧЕГО ПРОВЕРКА НЕ ВИДИТ» section, since `typescript` is a devDependency and the guard now dies
   without it.
3. (N3) `CornerDock.tsx` constants are at `:44-46` with `setProperty` at `:220/237/274/279`, and the
   fallback list needs `dente-redesign.css:688` added.
