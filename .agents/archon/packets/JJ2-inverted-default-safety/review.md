# Adversarial review — JJ2-inverted-default-safety

Reviewer: adversarial reviewer (did not write the code). READ-ONLY.
Commits: f97acbe3d (fix) + f91d8b1f4 (test).

## 0. BRIEF SCHEMA MISMATCH — confirmed, and it is the brief's fault, not the author's

My five mandated checks are written for a **money-rounding / money-in-text packet**:
"grep over guards.ts", "count interpolations of a money value into text", "money COMPARISON is
REVERT-grade", "`${index + 1}` is a line number", "`руб. ₽`", "second money helper beside
@dental/shared".

The commits under review contain **zero money code**. `git show --stat` for both:

```
f97acbe3d  apps/api/src/accessGuard.ts        34 ++++++++++++++++++++--   (+33 -2 incl. state.md)
f91d8b1f4  apps/api/src/tests/accessGuard.test.ts  105 +++++++++++++++++++
```

The author's own state.md flagged this same mismatch first. That is a point in the author's
favour, not against: they refused to fabricate an "11 sites / CONVERTED" inventory for a packet
that has none. I independently confirm the mismatch and re-map each check to its real analogue
below. Every verdict is from something I ran.

## 1. Attribution — CLEAN (ran it)

```
$ git log -1 --format='%(trailers)' f97acbe3d1eba73cbb9117bce6f2cc0973e225d5 | od -c
0000000  \n            <- 1 byte, empty
$ git log -1 --format='%(trailers)' f91d8b1f4c7ef6dad75b42fb1a0693e51b612b70 | od -c
0000000  \n            <- 1 byte, empty
```

Body grep both commits for `co-authored|anthropic|generated with|claude`: **0 matches.**
Only hits for `noreply` are the author's own `marko1olo@users.noreply.github.com` in author and
committer fields. Author/committer identical on both commits. Nothing to fix.

## 2. Money comparison touched? — NO. Nothing money-shaped is in the diff at all.

The entire source change is one boolean predicate plus its extraction into a helper. Full diff
body of the non-comment source change:

```diff
-  return process.env.NODE_ENV !== "production" && process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS === "1";
+  return namedDevelopmentModeActive() && process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS === "1";
-  return process.env.NODE_ENV !== "production" && process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS === "1";
+  return namedDevelopmentModeActive() && process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS === "1";
+const namedDevelopmentModes = new Set(["development", "test"]);
+function namedDevelopmentModeActive(): boolean {
+  const mode = process.env.NODE_ENV?.trim().toLowerCase();
+  return mode !== undefined && namedDevelopmentModes.has(mode);
+}
```

No kopeck arithmetic, no `<`/`>`/`===` on a money value, no epsilon, no tolerance, no
`Math.abs(a - b) < eps`. REVERT is not on the table.

## 3. Would the test fail on revert? — YES, PROVEN BY RUNNING IT. Not ceremony.

I did not take this on deduction. I restored the pre-fix predicate **in memory** with an ESM loader
hook living outside the repo (`%TEMP%/jj2rev/revert-loader.mjs`), so nothing in the working tree was
touched, and ran the real suite:

```
$ node --import tsx --import file:///C:/.../jj2rev/register-revert.mjs --test src/tests/accessGuard.test.ts
REVERT-LOADER: pre-fix predicate restored in memory at 2 call sites
EXIT=1    tests 25   pass 22   fail 3
```

At HEAD, unmodified: `EXIT=0  tests 25  pass 25  fail 0`.

The three that break under revert, and the exact assertion:

`apps/api/src/tests/accessGuard.test.ts:259`
```
assert.strictEqual(decisions.mutation, false,
  'ДЕФЕКТ: пустое окружение разрешило изменение защищённых данных без секрета администратора');
  -> actual: true, expected: false, operator: 'strictEqual'
```
plus `:275` (empty-string NODE_ENV) and `:284` (`режим staging разрешил изменение защищённых данных`).

Two of the five new tests (`названный режим разработки плюс флаг`, `флаг чтения не открывает запись`)
pass either way — they pin behaviour that the fix deliberately preserves. That is correct
regression-pinning, not padding.

Also worth stating: under the revert **all 20 pre-existing tests still pass** (22 pass = 20 old + 2 new
mode-preserving). That independently confirms the author's coverage claim — the old suite tested only
`test` and `production`, both explicitly set, so it could never have caught this. The defect class was
genuinely invisible to the prior suite.

## 4. Did it narrow something it should not have? — No, and I proved the change is strictly one-way

Analogue of the brief's "did it convert something that is NOT money". The risk here is the mirror
image: a whitelist that is too narrow breaks a legitimate mode.

Measured old-vs-new over every mode value in play (read-only `node -e`, printing booleans only):
there is **no** NODE_ENV value for which NEW is more permissive than OLD. `production` was closed
before and stays closed; `development` and `test` were open and stay open; unset / `""` / `staging` /
`prod` / `qa` / `developement` / `PRODUCTION` flip from OPEN to CLOSED. The change is monotone
fail-closed, which is the correct shape.

`?.trim().toLowerCase()` is a genuine tightening, not a loosening: `"PRODUCTION"` used to satisfy
`!== "production"` and grant bypass; it now normalises to `production` and is refused.

## 5. Did it miss a site? — YES. My own grep finds FOUR more, two of them armed right now.

The author's inventory says "NO OTHER SITES IN MY FILE". That is true and I reproduced it: inside
`accessGuard.ts` there are exactly 2 call sites, both converted. But the packet is named for a
**defect class**, not a file, and the class is alive elsewhere. My grep, not the brief's:

```
$ rg 'NODE_ENV !== "production" && process\.env\.DENTE_'
apps/api/src/routes/imaging.ts:149   dicomWebSettingsUnguardedAllowed()        DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS
apps/api/src/routes/schedule.ts:134  scheduleUnguardedMutationsAllowed()       DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS
apps/api/src/routes/settings.ts:556  settingsUnguardedMutationsAllowed()       DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS
apps/api/src/routes/telegram.ts:1491 isExplicitlyUnguardedControlPlaneAllowed() DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE
```

**Count: 2 converted, 4 of the identical class left raw.** All four sit in the same fail-open shape —
`if (!adminSecret) { if (unguardedAllowed()) hasAccess = true; else 503; }` (verified at
`settings.ts:559-571` and `imaging.ts:162`). Each one grants an admin-secret bypass.

Two of the four are **armed by a file that is tracked in git**. Booleans only, no values echoed:

```
$ git show HEAD:.env | (probe)          # 477 bytes, TRACKED
NODE_ENV                                       development
DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS       SET_TO_1
DENTE_CLINICAL_ALLOW_UNGUARDED_READS           SET_TO_1
DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS       SET_TO_1     <-- arms settings.ts AND imaging.ts
DENTE_SETTINGS_ADMIN_SECRET                    ABSENT       <-- so !adminSecret is true
```

## 6. THE BIG ONE: the fix does not close the scenario its own commit message invokes

This is the finding I would hold the packet on. The commit message justifies severity with
"пустое окружение — типовое состояние настоящего развёртывания" — NODE_ENV unset on a real server.
I verified the two supporting facts and both hold: `apps/api/package.json` `"start": "node dist/server.js"`
sets no NODE_ENV, and neither `apps/api/Dockerfile` nor `apps/web/Dockerfile` sets it.

But on that very server, `import "dotenv/config"` (accessGuard.ts line 1) immediately fills NODE_ENV
from the **tracked** `.env` — with `development`. Measured, post-fix predicate, cwd-independent:

```
NODE_ENV supplied by tracked .env : "development"
namedDevelopmentModeActive        : true
clinical admin secret configured  : false
POST-FIX bypass STILL GRANTED     : true
```

So on a bare `node dist/server.js` deploy of this repo, patient-record reads and mutations are still
served without `x-dente-admin-secret` **after** the fix. The door the packet set out to close is still
open; the fix moved the lock, not the door. Also measured: dotenv does **not** override a real env var
(`NODE_ENV=production` preset survives), which is why the docker-compose path is safe.

What the fix genuinely does close, and this is real value, not nothing:
- flags injected as real env vars with NODE_ENV unset and no `.env` shipped (injected-env container);
- `NODE_ENV=staging` / `prod` / `qa` / `PRODUCTION` / a typo — a plausible ops mistake that used to
  grant the bypass and now refuses it.

`docker-compose.yml:38` sets `NODE_ENV=production` for the api service and marks
`DENTE_CLINICAL_ADMIN_SECRET` required — that path was already fail-closed before this commit. The
commit message does not mention it, which overstates the blast radius by omission.

## 7. A regression I hypothesised, tested, and DISPROVED — reporting it so it is not re-litigated

`npm test` runs `npm run test -w @dental/api`, so cwd = `apps/api`, and dotenv there loads
`apps/api/.env` — which is **NOT tracked** (`git ls-files --error-unmatch` fails; it is local-only,
182 bytes). I expected a fresh clone / CI to have NODE_ENV undefined and the ~9 flag-setting test
files to flip from pass to fail under the new whitelist. I tested it rather than reporting it:

```
$ env -u NODE_ENV DOTENV_CONFIG_PATH=<absent file> node --import tsx --test src/tests/routes/visits.test.ts
EXIT=0   tests 11  pass 11  fail 0
[ENVPROBE] NODE_ENV=undefined CLIN_MUT=undefined CLIN_SECRET_SET=false   <- simulation verified valid
```

It passes. Reason, confirmed by reading `apps/api/src/routes/visits.ts:227-250`: the autosave route
authenticates by signed clinic token only and **never calls `requireClinicalMutationAccess`**. The
`DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1"` line at `visits.test.ts:61` is vestigial for that
route. Of the flag-setting files, only 3 are in the `src/**/*.test.ts` glob; `dicomweb.test.ts` and
`ai.test.ts` both set `DENTE_CLINICAL_ADMIN_SECRET` themselves, so the bypass branch is unreachable
for them. The `*Proof.ts` files are outside the glob and run via `smoke:chains` from the repo root,
where the tracked `.env` supplies NODE_ENV. **No CI regression. Hypothesis dead.**

Side note for the author, not a defect: `visits.test.ts` was a poor choice of "highest-risk file" —
it passes for a reason unrelated to the change, so it was never evidence either way.

## 8. Sweeps requested by the brief

Measured over both diffs (15597 bytes):

| Sweep | Result |
|---|---|
| money COMPARISON altered | none — no money identifiers in the diff |
| epsilon / tolerance / `Math.abs` introduced | 0 |
| `руб.` / `₽` / `kopeck` / `toFixed` / `formatKopecksRu` | 0 |
| second money helper beside `@dental/shared` | none added |
| U+FFFD replacement chars | 0 |
| mojibake signatures (`Ð`, `Ñ`, `вЂ`, `РІ`, `â€`, `Ã`) | 0 each, subject lines included |
| non-money value converted (`${index+1}`, row counts) | none — nothing was converted |
| English string reaching a user | none. All 13 added lines with a >=6-letter Latin word are comments or NODE_ENV mode literals (`development`, `test`, `staging`, `prod`, `qa`, `PRODUCTION`). No user-facing text added; all new assertion messages are Russian. |

Working tree clean on all three claimed paths. `--name-only` confirms neither commit captured
another agent's file: f97acbe3d = accessGuard.ts + state.md, f91d8b1f4 = tests/accessGuard.test.ts +
state.md.

## VERDICT: NEEDS_REWORK

Not REVERT: no comparison was touched, no tolerance introduced, the predicate change is strictly
monotone fail-closed, the test is real, attribution is clean. What shipped is correct and needs no
amendment.

It is not SOUND either, on two things I measured:
1. Four sites of the identical defect class remain raw, two of them armed by a tracked `.env` with no
   corresponding admin secret.
2. The bypass the packet exists to close is **still open** on the deployment shape the commit message
   itself names, because the tracked `.env` supplies `NODE_ENV=development`.

### Required rework
1. Convert `imaging.ts:149`, `schedule.ts:134`, `settings.ts:556`, `telegram.ts:1491` to the same
   named-mode predicate, or export `namedDevelopmentModeActive()` and reuse it. Four copies of a
   security predicate is how the next inversion gets in.
2. Deal with the tracked root `.env`: it ships `NODE_ENV=development` plus three `ALLOW_UNGUARDED_*=1`
   flags and no admin secrets. Until it is untracked or stripped, this packet's fix does not protect a
   bare `node dist/server.js` deploy. This is the dominant risk and outranks item 1.
3. Optional: `authSecret.ts:38` `isProduction()` compares `NODE_ENV === "production"` without the
   `trim().toLowerCase()` this commit introduced, so `"PRODUCTION"` is treated as non-production there
   while accessGuard now refuses it. Pre-existing and lenient-not-open, but the normalisation should
   live in one shared place.

