# KK2-default-permissive-rework — adversarial review (reviewer #2, post-rework)

Commits under review: 9ed20ce03 (source), 4dff1110f (test + packet state)
HEAD at review time: 71692b19c

## 0. BRIEF SCHEMA MISMATCH — CONFIRMED, second reviewer to report it

My five mandated checks name guards.ts and money interpolation ('11 raw / 4 already correct').
Independently verified: neither commit touches any money file.
  git show --name-only 9ed20ce03 -> apps/api/src/accessGuard.ts
  git show --name-only 4dff1110f -> apps/api/src/tests/accessGuard.test.ts + 3 packet files
  git grep -nE 'kopeck|toFixed|formatKopecks|rub|epsilon' over both touched source files -> exit 1, ZERO hits
apps/api/src/documents/guards.ts EXISTS in the tree but is NOT in either commit.
The agent's refusal to invent 11 money rows is CORRECT and I reproduce its basis.
I re-map each check to the defect class actually shipped (NODE_ENV default-permissive).

## 5. ATTRIBUTION — CLEAN (ran first, cheapest)

  git log -1 --format='%(trailers)' 9ed20ce03 | od -c  ->  0000000  \n   (single newline, EMPTY)
  git log -1 --format='%(trailers)' 4dff1110f | od -c  ->  0000000  \n   (single newline, EMPTY)
  git log -2 --format='%B..%an %ae %cn %ce' | grep -inE 'co-authored|anthropic|generated with|claude' -> exit 1, 0 matches
  Author/committer on both: marko1olo <marko1olo@users.noreply.github.com>
VERDICT: attribution clean, claim reproduced.

## 1. DID IT MISS A SITE? — YES. The inventory undercounts the defect class.

My greps at HEAD (71692b19c), not the brief's numbers, not the agent's.

Exact `&&` shape — I reproduce the agent's 4 exactly, no more, no fewer:
  git grep -nE 'NODE_ENV !== "production" && process\.env\.DENTE_' HEAD -- apps/
    imaging.ts:149  schedule.ts:134  settings.ts:556  telegram.ts:1491
  accessGuard.ts is NOT among them -> its 2 sites are genuinely already converted. Claim REPRODUCED.

But the defect class is "unset NODE_ENV falls into the permissive branch", not "one regex shape".
Widening to the `=== "production"` early-return form finds sites the inventory NEVER LISTS. The
agent's regex is STRUCTURALLY INCAPABLE of matching them, yet it reported "exactly 4 hits, all
listed in the inventory" as if that closed the inventory.

  (a) apps/api/src/security/identity.ts:69  devHeaderOrgAllowed()
        if (process.env.NODE_ENV === "production") return false;
        return process.env.DENTE_DEV_ALLOW_HEADER_ORG === "1";
      The SAME predicate — named-dev-mode PLUS flag — written as an early return instead of `&&`.
      It gates the x-organization-id tenant-isolation bypass (read any clinic's charts).
      accessGuard.ts:5 IMPORTS FROM THIS VERY FILE. Working tree CLEAN (no other agent in it).
      Its own doc comment at :62-64 makes the identical "npm start does not set NODE_ENV" argument,
      so that file's author already knew the threat model and still left the shape unconverted.
      ABSENT from the handed-in inventory.

  (b) apps/api/src/routes/auth.ts:27  demoLoginAllowed()
        if (process.env.NODE_ENV === "production") return false;
        return process.env.DENTE_ALLOW_DEMO_LOGIN !== "0";
      STRICTLY WORSE than all 4 sites the packet enumerated: default-permissive with NO opt-in flag
      holding the line (`!== "0"`, not `=== "1"`). Unset NODE_ENV -> the in-source demo backdoor
      logins (clinic@example.com / doctor@clinic.com) are ON. The 4 enumerated sites at least
      require someone to set a flag to "1". ABSENT from the inventory. (File dirty in another tree.)

  (c) apps/api/src/security/authSecret.ts:37-39  isProduction()
      Agent's inventory: "I did NOT open or verify this file, so I make no claim". I opened it.
      Unset NODE_ENV -> :97 does NOT throw -> the server boots and signs every clinic/staff/portal
      token with a locally generated `.data/dev-auth-secret` (or an ephemeral one) instead of
      refusing to start. Also :88 -> the >=32-char minimum is SKIPPED, so a 4-character
      AUTH_TOKEN_SECRET is accepted on a real deployment. Same class, larger blast radius.

  (d) apps/api/src/security/webhookAuth.ts:71 — unset NODE_ENV -> webhook accepted with NO secret,
      log warning only.  (e) apps/api/src/routes/portal.ts:145 isProductionRuntime(), consumed at
      :276 for the dev OTP-to-log fallback. Same class.

MY NUMBERS: 4 raw sites of the `&&` shape (agrees with the agent) + at least 5 more of the same
default-permissive class in the `=== "production"` shape that the inventory omits. NOT "6 + 1".
All are outside the packet's owned scope, so this is an inventory-completeness defect for the
lead's next dispatch, NOT a demand that KK2 edit other files.

## 2. DID IT TOUCH A MONEY COMPARISON? — NO. Not REVERT-grade.

Zero money code in either commit (section 0). No comparison of ANY kind changed:
  Q3 of my own probe: pre-refactor inline form vs helper delegation, same env -> equal: true
  Q2 sweep, 15 NODE_ENV values: values where NEW is MORE permissive than OLD -> NONE.
  Old was permissive for "PRODUCTION" and " production " (raw !== "production" is true for both);
  new is false for both. The trim+lowercase whitelist is therefore real hardening BEYOND the unset
  case, and the change is monotone fail-closed. No tolerance/epsilon introduced anywhere.

## 3. DID IT CONVERT SOMETHING THAT IS NOT THE DEFECT? — Yes, benignly, but the subject overstates.

The two clinical predicates were ALREADY CORRECT at HEAD. I verified the hunk myself:
  git show f97acbe3d -- apps/api/src/accessGuard.ts
    +const namedDevelopmentModes = new Set(["development", "test"]);
    -  return process.env.NODE_ENV !== "production" && process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS === "1";
    +  return namedDevelopmentModeActive() && process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS === "1";
JJ2 shipped the fix. Commit 9ed20ce03 therefore contains ZERO behavior change (proven equal, Q3)
and is a pure refactor shipped under a `fix(охрана доступа):` subject. Nothing was fixed by it —
the four still-raw copies are untouched by design. `refactor(...)` is the honest type, and this
repo already uses it (71692b19c is `refactor(настройки)`), so the vocabulary was available.

## 4. WOULD THE TEST FAIL ON REVERT? — Yes, and I proved it independently of the agent's probe.

ASSERTION THAT BREAKS: apps/api/src/tests/accessGuard.test.ts:342-347 (line numbers re-derived by grep)
  test('пустое окружение плюс флаг обхода НЕ даёт')   // :342, assert block :343-347
  assert.strictEqual(bypassWith(undefined), false,
    'ДЕФЕКТ: незаданный NODE_ENV сработал как режим разработки и разрешил обход')

My harness /tmp/rev-kk2-discriminate.mts imports the REAL exported predicate and replays that exact
assertion against the verbatim pre-fix expression (the one still standing at imaging.ts:149):
  Q1 assertion FAILS on pre-fix predicate: "DEFECT: unset NODE_ENV acted as development mode"
  Q1 same assertion PASSES on shipped predicate. discriminates = true
Suite re-run by me at HEAD: node --import tsx --test src/tests/accessGuard.test.ts -> TRUE_EXIT=0,
tests 30 / pass 30 / fail 0. Claim reproduced.
afterEach does `process.env = { ...originalEnv }` (test:29-32), so the new NODE_ENV deletes and
PROBE_FLAG writes do not leak into sibling tests. Checked, not assumed.

TWO HONEST CAVEATS the packet does not state:
 (i) Reverting 9ed20ce03 ITSELF removes the two `export` keywords, so the test file's import on
     line 3 breaks and the suite dies as a module-resolution error, not as a semantic assertion.
     The behavior the assertion pins was already correct before this packet landed.
 (ii) commitmsg2.txt claims «Сам предикат … не был закреплён ничем, и его можно было ослабить, не
     уронив ни одной проверки». FALSE. JJ2 already shipped
     describe('режим обхода определяется по имени, а не по «не production»') at test:230-300, which
     unsets NODE_ENV, sets BOTH clinical flags to '1', and asserts both gates return false with
     codes [503,503] — and at :281 it already sweeps 'staging','prod','qa','developement',
     'PRODUCTION'. Weakening namedDevelopmentModeActive DOES drop those tests, because the gates
     call the predicate directly (accessGuard.ts:87-88 / :117-118). The genuinely NEW coverage in
     KK2's block is the FLAG axis only: unknown flag name (test:368) and values
     '0'/'true'/'yes'/''/' 1 ' (test:373) — and that axis exists solely because KK2 introduced
     the dynamic-key indirection. Real new coverage, materially narrower than the message claims.

## SWEEPS

- «руб.» / «₽» / toFixed / kopeck / epsilon in the diff: 0 hits (grep exit 1). No money helper at all.
- Second helper beside the new one: no money helper, but TWO rival dev-mode helpers survive
  unconsolidated — authSecret.ts:37 isProduction() and portal.ts:145 isProductionRuntime(). The
  comment's «единственная законная форма проверки» is therefore ASPIRATIONAL, not descriptive.
  git grep at HEAD: NOTHING in production code imports either new export — the only consumers are
  the two clinical functions inside the same file, plus the test. New API surface with no adopters.
- Mojibake in diff or subject: 0 hits for Ð / Ñ / â€ / ï¿½ / Â across both commits.
- English string reaching a user: none added. No new user-facing text at all in either commit.

## DEPLOYMENT-REALITY FINDING (largest one; it undermines the commit body's premise)

accessGuard.ts:1 is `import "dotenv/config"`. The repo TRACKS a root `.env` that sets NODE_ENV:
  git ls-files --error-unmatch .env               -> exit 0 (TRACKED, despite .gitignore listing .env)
  git show HEAD:.env | grep -E '^\s*NODE_ENV\s*=' -> NODE_ENV=development
dotenv resolves `.env` from process.cwd(). No DOTENV_CONFIG_PATH override exists anywhere in
apps/api/src (checked). Consequences:
  - started from repo root (`node apps/api/dist/server.js`): the tracked .env loads,
    NODE_ENV=development, namedDevelopmentModeActive() returns TRUE, and the new whitelist gives the
    SAME answer as the old `!== "production"`. The only thing still holding the gate is the `=== "1"`
    flag — precisely the state the commit body condemns («держит второе условие, а не первое»).
  - started from apps/api on a fresh clone (`npm start -w @dental/api`): no tracked apps/api/.env,
    NODE_ENV unset, and the commit body's model holds.
So «режим там не выставляется, ни один Dockerfile его тоже не задаёт» is cwd-dependent and
materially incomplete as written — and it is the load-bearing premise of the entire packet.
There is no root `start` script, so the root-cwd path is a manual/ops invocation rather than a
scripted one; that is why I grade this a threat-model/documentation gap, not a live regression.
CREDIT WHERE DUE: the agent DID find and escalate this in state.md line 2. It is absent from both
commit bodies and from the inventory handed to review. That is exactly where the rework belongs.

## MINOR (hand onward, not blocking)

- imaging.ts:149 `dicomWebSettingsUnguardedAllowed` is keyed on DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS
  — the SETTINGS flag, not an imaging flag. Enabling unguarded settings work silently ALSO opens the
  DICOM-web imaging gate. The agent transcribed the name correctly but never flagged the coupling.
- unguardedBypassAllowed(flagEnvironmentVariable: string): a string param makes a typo a silent
  runtime fail-closed. A union type of the known flag names would catch it at typecheck AND keep the
  fail-closed direction. Fail-closed is the right choice; a silent dev lockout with no diagnostic is
  still worse than a compile error.

## VERDICT: NEEDS_REWORK

Not REVERT: no comparison changed, no tolerance introduced, monotone fail-closed — all proven above.
Not SOUND: `fix(...)` on a zero-behavior-change commit; commitmsg2's "pinned by nothing" claim is
falsified by JJ2's pre-existing test block; both commit bodies omit the tracked .env with
NODE_ENV=development that the agent itself found; and the inventory undercounts the defect class
(identity.ts:69 and auth.ts:27 missing, the latter worse than any of the 4 listed).
All rework is text and inventory. accessGuard.ts source needs NO change.
