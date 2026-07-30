# U2-behavioural-guard-gate — ADVERSARIAL REVIEW (complete)

Commits: e8be281d9765e06e25842939fdd387a4c5dfd37b (rewrite) + 637a837897c9c1b36bc19230356c73fd86aebeb4 (log/exit fix)
HEAD at review: e14c09862. Reviewer did not write this code.
Files touched by both commits, verified via `git show --stat`: ONLY
`scripts/smoke-clinical-mutation-guard.mjs` and `scripts/lib/api-route-census.mjs`.

VERDICT: NEEDS_REWORK. The central claim reproduces and is stronger than the packet
proved. One measured claim is wrong by ~11x. Two real holes the packet does not know about.

---

## 1. PROOF AUDIT — every claimed command re-run, true exit code captured

| Claim | My result | Verdict |
|---|---|---|
| Defect real pre-packet: exit 1 at line 125 | Ran `e8be281d9^` copy: `OLD_GATE_EXIT=1`, `Error: apps/api/src/routes/patients.ts must guard 3 protected route(s), found 0` at gate.mjs:125 | CONFIRMED |
| Behavioural block never executed | Old file 788 lines; first `app.inject` at line 569; died at 125 | CONFIRMED |
| Hardcoded list rotted: `protectedRequests[0]` = POST /api/patients expects 403, route answers 401 | Old line 623 `{ method: "POST", url: "/api/patients", payload: {} }`; assert at 681 `statusCode === 403`; live + injected both answer 401 AuthRequired | CONFIRMED |
| `npm run typecheck -w @dental/api` exit 0 | `TYPECHECK_API_EXIT=0` | CONFIRMED |
| Gate exit 0; 481/479/186/292/450/172; probeElapsedMs ~580 | `TRUE_EXIT=0`; 481/479/186/292/450/172 identical on 4 separate runs; probeElapsedMs 543/585 | CONFIRMED (exact) |
| `npm run smoke:all -- --only=clinical-mutation-guard` PASS 1810 ms | `SUITE_EXIT=0`, `PASS smoke:clinical-mutation-guard 1824ms`, `SUMMARY total=1 failed=0` | CONFIRMED |
| Regression demo: guard neutralised in untracked dist, name left in a comment | `EXIT_GUARD_REMOVED=1`, ok:false, challengedMutatingRoutes 171, verbatim `НЕ ЗАЩИЩЁН: POST /api/billing/payments без учётных данных ответил 400 (BillingValidationError), ожидались 401 или 403` | CONFIRMED verbatim |
| Restore byte-identical, md5 d696c686f9a2c890c1b79ebd7ece50a6, zero git churn | md5 matched before/after twice; `git status --porcelain -- apps/api/dist` empty | CONFIRMED |
| Both auth idioms pass in one run | 401 AuthRequired ×100 (hand-rolled) vs 403 ClinicalReadSecretRequired ×100 + ClinicalAdminSecretRequired ×59 + Settings ×14 + Telegram ×14 + DicomWeb ×1 (shared helpers) | CONFIRMED |
| patients.ts hand-rolls auth, stricter | patients.ts:120-127/139-145/163-170: reads `x-dente-clinic-token`, `verifyToken(TOKEN_SECRET())`, 401 AuthRequired/AuthExpired, `orgId = payload.organizationId` | CONFIRMED |
| Live 4100: health 200, POST /api/patients 401, POST /api/billing/payments 400 | 200 / 401 `{"error":"AuthRequired"}` / 400 BillingValidationError | CONFIRMED |
| appSource: 9 of 24 needles false at HEAD | 24 needles, 9 missing (#4,5,6,7,10,11,12,15,19) | CONFIRMED exact |
| appSource: 4 of 17 assertion groups false | 4 failing — exact. Denominator: I count 10 appSource assert groups (38 asserts in the file), not 17 | CONFIRMED (numerator); denominator unreproducible |
| Perf 12 060 ms -> 1 963 ms | Boot+close then natural drain: `NATURAL_EXIT_WALL_MS=11395` (boot 1217, close at 1218, ~10.2 s of pool/timers). Post-fix wall: 1895 / 1633 ms | CONFIRMED |
| Debt stubs mutate nothing | settings.ts:637 and :641 each `return { success: true, message: ... }`. No db call in the handler body | CONFIRMED by source (I did NOT POST reset-zero at a live DB — correctly refused) |
| Dropped CSP source assertions live in smoke-document-html-preview-source.mjs:128-153 | That file asserts `reply.header("Content-Security-Policy", contentSecurityPolicy)`, `contentType.includes("text/html")`, and the exact `default-src 'none'; style-src 'unsafe-inline'; ...` string | CONFIRMED |
| Allowlist arithmetic (479-450=29=27+2; 186=172+12+2; 20 entries/27 pairs) | Counted by hand from the source: 20 entries, 27 method+path pairs, 12 mutating public pairs, 2 debt. Both identities close | CONFIRMED |
| 24 routes move 503 -> 401/403 when secrets are configured | **276.** See §2 | DISPROVED |

## 2. DISPROVED MEASUREMENT — "24" is really 276

Independent sweep of all 479 probeable routes, booting the same app, NODE_ENV=production,
escape flags cleared, secrets withheld:

```
no secrets            503= 276  challenged= 172  {"200":8,"400":19,"401":167,"403":5,"404":4,"503":276}
+clinical only        503=  49  challenged= 399
+settings             503=  32  challenged= 416
+telegram admin       503=  10  challenged= 438
+all webhook secrets  503=   0  challenged= 448
```

276, not 24. Provenance of the wrong number found: in the LEAKY dev configuration
(NODE_ENV=development with the three `.env` escape flags left at "1" — the configuration the
gate deliberately does NOT use) the figure is **26**:

```
NODE_ENV=development CLIN_MUT=1 CLIN_READ=1 SET_MUT=1
DEV-WITH-ESCAPES-NO-SECRETS {"200":35,"400":62,"401":334,"403":18,"404":4,"503":26}
```

Why it matters: 276 of 479 probed routes (58%) are counted as "challenged" only because the
gate itself assigns `DENTE_CLINICAL_ADMIN_SECRET` et al. The handoff's "24" makes the
synthetic-secret setup look like a footnote. It is the dominant factor in the 450 figure. The
security posture is still fail-closed (503) and the gate proves that — but the number is wrong.

## 3. NEW DEFECT — FALSE GREEN when a guard replies but stops short-circuiting

The gate's pass criterion is the status code. A guard that sends 403 and then lets the handler
body run on produces the same 403. Reproduced in the untracked dist:

```
-  if (!(await requireClinicalMutationAccess(request, reply, "billing payment create"))) return;
+  await requireClinicalMutationAccess(request, reply, "billing payment create");
+  <marker file write>
```

Result: `EXIT_MISSING_RETURN=0`, `"ok": true`, `challengedMutatingRoutes: 172` — completely
unchanged — while the marker file proves the handler body executed:
`handler body continued past the guard at 2026-07-28T03:38:27.248Z`.

Worse: commit 637a83789 removed the one signal that catches this. With the logger at its normal
level, the same request emits

```
level 40 FST_ERR_REP_ALREADY_SENT
"Reply was already sent, did you forget to \"return reply\" in \"/api/billing/payments\" (POST)?"
at apps/api/dist/routes/billing.js:174
```

`scripts/lib/api-route-census.mjs:68` sets `app.log.level = "silent"`, so the gate never sees it.
The `if (!(await requireX(...))) return;` idiom is used across every route file, so a dropped
`return` is a live risk, and the packet's own noise fix deleted the detector.

## 4. NEW DEFECT — stale-dist blindness (the documented disease, unguarded)

`api-route-census.mjs:48` checks only `existsSync(apps/api/dist/server.js)`. No freshness check,
no build. `scripts/run-smoke-suite.mjs` does not build either. At review start dist WAS stale:

```
STALE_DIST: apps/api/dist/routes/system.js    (src 06:14:56 > dist 06:04:33)
STALE_DIST: apps/api/dist/routes/telegram.js  (src 06:15:52 > dist 06:04:33)
STALE_DIST: apps/api/dist/security/identity.js (src 07:06:30 > dist 06:04:33)
```

`npm run build -w @dental/api` (exit 0) changed the content of all three:

```
telegram.js  df2d9ff70736e21d40f3e8c2881f6e4b -> cc43bcf476f36645fa35c005b9777b8c
system.js    b1559d8272e9e14fe1bff12d863d084d -> ed1b7a7a63e2bca3e288f6f2d000c29a
identity.js  a0f994c75daf761cf92fc0476d67acf7 -> 13cf8970a522b985f2d421ba6e7046c3
```

`security/identity.js` is the tenant-identity guard that sibling commits dfe75e1bb / feb39fe35
had just fixed — the gate was probing it compiled from older source. Mitigating: the route SET
was byte-for-byte identical before and after the rebuild (diff of 481 keys empty), and the gate
still exits 0 with the same 481/479/186/172 on a fresh build, so no reported number is invalid.
But the structural hole is exactly "a smoke passed because it loaded a dist built before the fix".

## 5. NEW DEFECT — the reachability claim is overstated for one guard

`apps/api/src/security/identity.ts:98-115`: `serverAcceptsNetworkConnections()` returns
`request.server.server.listening`, and `unverifiedOrganizationUsable()` allows an unverified
(header-supplied) organization to MUTATE when the server is not listening. Under `app.inject`
it never is. The repo documents this itself — `apps/api/src/tests/security/unverifiedOrganizationMutation.test.ts:199`
is named `app.inject без слушающего порта: заголовок организации работает и на POST`.

So "every guard the gate probes is the guard a real user's browser hits" is false for that guard.
Direction of error is toward false RED, not false green (I confirmed: with no headers there is no
unverified org, so 401 fires first) — but the claim must be corrected, not repeated.

## 6. Smaller findings

- **Escape-flag inventory incomplete.** `developmentEscapeFlagNames` lists 6; the codebase has at
  least 8 — `DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS` (schedule.ts:134) and
  `DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE` (telegram.ts:1491) are missing. Verified harmless
  today: I ran the gate with both set to 1 and got exit 0 / ok:true / 172, because every escape is
  `NODE_ENV !== "production" && flag === "1"` and the gate forces production. Redundancy gap only.
- **Ambient NODE_ENV=production crashes the gate.** `NODE_ENV=production node scripts/smoke-clinical-mutation-guard.mjs`
  -> exit 1, `Error: AUTH_TOKEN_SECRET обязателен в production` thrown at import
  (api-route-census.mjs:53). A CI job exporting NODE_ENV=production gets a crash, not a verdict.
- **Two passing web-side regression assertions deleted without a stated home.** The commit message
  justifies the App.tsx deletion entirely by "9 of 24 needles and 4 of 17 groups already false".
  Measured at HEAD: `!/function denteClinical(Read|Mutation)Headers[^{]*\{[^}]*telegramControlPlaneHeaders/`
  and `!appSource.includes('fetch("/api/health"')` both still PASS and exist nowhere else.
  (The third, the DICOMweb `settingsAccessHeaders` regex, is genuinely already false — deletion fine.)
- **Second owner of a security string.** `adminSecretHeader = "x-dente-admin-secret"`
  (smoke-clinical-mutation-guard.mjs:81) hand-copies `denteAdminSecretHeader`, which
  `apps/api/dist/accessGuard.js` already exports. Against the anti-hardcode doctrine.
- **Unlock probe accepts any change of error code as "opened".** `GET /api/settings/telegram` opens
  to a full **200** with only the global ops secret and no tenant identity; the gate prints that in
  `guardUnlockProbes` and asserts nothing. Pre-existing app property, not this packet's defect, but
  the lead should see it.
- **Wrong-secret and mutating-escape-hatch assertions dropped** vs the old (never-executed) block.
  Mitigated: `apps/api/src/tests/accessGuard.test.ts` covers `secret configured, incorrect header -> 403`
  and `unguarded allowed but env is production -> 503` for both guards. Not a real loss.

## 7. Attacks that FAILED (the code held)

- **Route-tree parser.** Independent verification: 481 parsed entries vs an independently computed
  method-sum of 481 from the raw `printRoutes` text; 288 tree lines, all carrying a method group, none
  dropped; `app.hasRoute()` confirms 480 of 481 exist in the router. The single miss is `OPTIONS *`,
  a `hasRoute` wildcard limitation, not a parse error. No duplicates, no empty paths.
- **New unguarded routes must be caught** — the packet's central architectural claim, which the
  builder never actually tested. I added two brand-new unguarded mutating routes to dist
  (`POST /api/billing/reviewer-scratch-hole`, `DELETE /api/billing/reviewer-scratch-wipe/:id`):
  `routeTableEntries` 481 -> 483, `EXIT=1`, and the gate named both with the real status:
  `НЕ ЗАЩИЩЁН: POST /api/billing/reviewer-scratch-hole без учётных данных ответил 200, ожидались 401 или 403`.
  Stronger than the shipped demo. The "route the gate does not know about is impossible" claim holds.
- **Bypass battery** (injected app, production, secrets set):

  | credentials | POST /api/patients | POST /api/billing/payments | POST /api/ai/recognition-jobs | PUT /api/patients/:id |
  |---|---|---|---|---|
  | none | 401 AuthRequired | 403 ClinicalAdminSecretRequired | 403 ClinicalAdminSecretRequired | 401 AuthRequired |
  | x-organization-id nonexistent UUID | 401 | 403 | 403 | 401 |
  | x-organization-id garbage | 401 | 403 | 403 | 401 |
  | garbage clinic token | 401 AuthExpired | 403 | 403 | 401 AuthExpired |
  | wrong admin secret | 401 | 403 | 403 | 401 |
  | CORRECT admin secret | 401 AuthRequired | 400 BillingValidationError | 401 AuthRequired | 401 AuthRequired |

  Nothing got through. The last row also partially closes a NOT-PROVEN item: the guard does open on
  a MUTATING route (403 -> 400 validation), with no DB write.
  Live curl agrees: no creds 401 AuthRequired, garbage token 401 AuthExpired, wrong secret 401.
- **Rate-limit flakiness.** `security/rateLimit.ts` uses a module-level in-memory `Map`, no Redis, so
  buckets are per-process and fresh every run. I only saw 429s on the 5th consecutive sweep inside one
  process. No cross-run false red.
- **Post-import env fixups ineffective?** No — verified they are load-bearing: at boot the root `.env`
  puts the app in `NODE_ENV=development` with all three escape flags at "1"; the gate's post-boot
  `NODE_ENV=production` + `clearDevelopmentEscapes()` demonstrably take effect (all guards read env
  per-request; `clinicalAdminSecret()` re-reads every call).
- **.data / git churn from a gate run.** md5 of `apps/api/.data/*.json` identical before and after a
  run (state file is redirected outside the repo by `.env.local`). No churn.
- **Second owner of the census.** No pre-existing `printRoutes` parser anywhere in `scripts/`.
- **Mojibake / encoding / commit form.** Repo detector: 0 hits in both files, no BOM, LF endings.
  Both subjects are clean Russian Conventional Commits naming the defect, `Co-Authored-By` present.
- **Hollow facade.** No `{success:true}` no-op added, no fabricated 0/default. The two `{success:true}`
  routes are pre-existing and are named as debt with file:line. The one hardcoded UUID
  (`syntheticParamValue`) is a documented probe placeholder that the guard answers before any handler
  reads it.

## 8. Required rework (numbered, all cheap)

1. Correct "24" to 276 in the handoff, measured in the gate's own configuration.
2. Add a dist-freshness gate to `createRealApiApp()`: fail (or build) when any
   `apps/api/src/**/*.ts` is newer than its `apps/api/dist/**/*.js`.
3. Replace `app.log.level = "silent"` with a capturing logger that suppresses `request completed`
   noise but FAILS the run on `FST_ERR_REP_ALREADY_SENT` / any level>=40 record.
4. State the app.inject vs listening-socket divergence (identity.ts:98-115) as a named limitation
   next to the WebSocket one, and stop claiming full equivalence with the browser path.
5. Add `DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS` and
   `DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE` to `developmentEscapeFlagNames`.
6. Assign a synthetic `AUTH_TOKEN_SECRET` (and force NODE_ENV) BEFORE importing dist/server.js so an
   ambient `NODE_ENV=production` does not crash the gate at import.
7. Re-home or drop-with-reason the two still-passing web-side assertions in §6.
8. Import `denteAdminSecretHeader` from `apps/api/dist/accessGuard.js` instead of re-typing it.

## 9. Git hygiene

Clean. Both commits touch only the two claimed files. No `apps/api/.data/*.json`, no tsbuildinfo,
no `scratch/**`, no neighbouring author's work swept in. Working tree dirt
(`apps/web/src/DocumentsView.tsx`, `documentStore.ts`, `main.css`, `tsconfig.tsbuildinfo`,
`apps/api/.data/*.json`, `scratch/audit-settings-props.mjs`) is identical before and after my
review and belongs to other authors. `apps/api/dist` restored byte-identically (md5 verified
twice); `git status --porcelain -- apps/api/dist` empty (dist is gitignored, `.gitignore:2`).
No file was deleted, so no dangling-reference check applies.
