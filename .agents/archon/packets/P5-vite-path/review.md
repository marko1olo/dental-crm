# ADVERSARIAL REVIEW — PACKET P5-vite-path

Reviewer: adversarial reviewer (did not write this code). Posture: disbelief.
Commit under attack: `2646c8064a8272b7cb23b53e89c78529b2a05f24`
Follow-up doc commit: `4d9e0cd54fc5e54dcb0d25488a48d9b1400afd32`
Repo HEAD during review: `3ad6d4614`
**VERDICT: SOUND_WITH_NITS**

Every one of the six `BUILDER CLAIMED PROVEN` items was re-run by me and reproduced.
No fabricated proof was found in this packet. The one substantive problem is in the
**handoff's causal model**, not in the committed code: the builder's stated (and
correctly self-labelled "INFERENCE, not proof") root cause for the
`smoke-workspace-live-routes` failure is **wrong**, and I have replaced it with a
proven one below.

---

## 1. WHAT THE COMMIT ACTUALLY CONTAINS

`git show 2646c806 --stat`:

```
.agents/archon/packets/P5-vite-path/commitmsg.txt | 23 ++++++++
.agents/archon/packets/P5-vite-path/state.md      | 39 +++++++++++++
scripts/lib/resolveViteBin.mjs                    | 71 +++++++++++++++++++++++
scripts/smoke-workspace-live-core-actions.mjs     |  8 +--
scripts/smoke-workspace-live-routes.mjs           |  8 +--
scripts/smoke-workspace-live-settings-actions.mjs |  8 +--
6 files changed, 139 insertions(+), 18 deletions(-)
```

Six files: the three claimed smokes, the declared fourth file (`scripts/lib/resolveViteBin.mjs`),
and the packet's own two bookkeeping files. Nothing else.

Diff to product source is three identical 8-line edits: delete `const vitePath = path.resolve(...)`
plus the 5-line `existsSync` guard, add `import { resolveViteBin }` and one call. No UI, no API,
no schema, no config.

---

## 2. THE DEFECT WAS REAL (CONFIRMED)

`git show 2646c806^:<path>` on each script:

```
routes.mjs:36           const vitePath = path.resolve("apps/web/node_modules/vite/bin/vite.js");
core-actions.mjs:44     same
settings-actions.mjs:43 same
```

Exactly the lines the packet brief cited. Filesystem, re-run by me:

```
$ ls -d apps/web/node_modules/vite
ls: cannot access 'apps/web/node_modules/vite': No such file or directory
$ ls -d node_modules/vite/bin/vite.js
node_modules/vite/bin/vite.js
```

Direct boolean proof that the pre-commit guard threw unconditionally:

```
OLD hardcoded path: C:\Clinic_MVP\dental-crm\apps\web\node_modules\vite\bin\vite.js
existsSync(OLD): false => pre-commit guard would throw: true
```

`vite` is declared in exactly one manifest in the whole monorepo — `apps/web/package.json`
(`"vite": "^6.3.5"`); root and `apps/api` declare none; workspaces are `["apps/*","packages/*"]`.
npm hoisted the installed 6.4.3 to root. The cited path could never have existed.
**The defect was real, not manufactured.**

---

## 3. PROOF AUDIT — EVERY CLAIM RE-RUN, SAME COMMAND

| # | Builder claim | I re-ran | Result |
|---|---|---|---|
| 1 | `node --check` on 4 files, exit 0, SYNTAX OK x4 | same loop | **REPRODUCES** — 4x `SYNTAX OK`, `EXIT=0` |
| 2 | Filesystem: `apps/web/node_modules/vite` absent, root `vite/bin/vite.js` present | same two `ls` | **REPRODUCES** verbatim |
| 3 | `resolveViteBin()` returns root path, exists on disk, roots = repo + apps/web | direct import | **REPRODUCES** verbatim (see below) |
| 4 | Failure path with `C:/nowhere-a` / `C:/nowhere-b` lists 4 attempted paths, no "run dependency install" | same roots | **REPRODUCES** verbatim (see below) |
| 5 | All three smokes get past the vite gate; vite actually boots | ran all three | **REPRODUCES** — `VITE v6.4.3 ready in 382 ms` / `391 ms` |
| 6 | `GET /api/dashboard` unauthenticated -> 401 `AuthRequired` | curl 127.0.0.1:4100 | **REPRODUCES** verbatim |

### Claim 3 + 4, my run:

```
RESOLVED: C:\Clinic_MVP\dental-crm\node_modules\vite\bin\vite.js
EXISTS: true
ROOTS: C:\Clinic_MVP\dental-crm | C:\Clinic_MVP\dental-crm\apps\web
THROWN MESSAGE:
Vite could not be resolved from any workspace root. Attempted:
  require.resolve("vite/package.json") from C:/nowhere-a -> MODULE_NOT_FOUND
  C:\nowhere-a\node_modules\vite\package.json -> not on disk
  require.resolve("vite/package.json") from C:/nowhere-b -> MODULE_NOT_FOUND
  C:\nowhere-b\node_modules\vite\package.json -> not on disk
```

The old lie ("Run dependency install before this smoke test") is gone from all three scripts
(`rg "dependency install" scripts/` -> no hits). Brief item 3 satisfied.

### Claim 5, my run of `npm run smoke:workspace-live-core-actions` (EXIT=1):

```
--- WEB PROCESS STDOUT ---
  VITE v6.4.3  ready in 382 ms
  Local:   http://127.0.0.1:52556/
--- API PROCESS STDOUT --- (excerpt, x10)
{"reqId":"req-15","req":{"method":"GET","url":"/api/dashboard","host":"127.0.0.1:52555"...
{"reqId":"req-15","res":{"statusCode":401},"responseTime":0.80,"msg":"request completed"}
SMOKE TEST FAILED: Error: HTTP 401
    at async .../smoke-workspace-live-core-actions.mjs:301:27
```

Line 301 is `const initialDashboard = await dashboard();` — which sits **after** the
`waitForHttp(webBaseUrl, "isolated web")` gate at line 296. Execution passing line 301 is
positive proof the vite gate opened and the dev server actually served HTTP. Builder's "319 ms"
vs my "382 ms" is timing noise on the same event, not a discrepancy.

`npm run smoke:workspace-live-settings-actions` (EXIT=1): `VITE v6.4.3 ready in 391 ms`,
`SMOKE TEST FAILED: Error: HTTP 401`, 10 x `"statusCode":401` in the isolated API log.

`npm run smoke:workspace-live-routes` (EXIT=1):
```
Error: shift app shell did not become ready: false
    at waitFor (.../scripts/lib/cdp.mjs:13:8)
    at async .../smoke-workspace-live-routes.mjs:381:3
```
Line 381 is inside the CDP loop, i.e. past vite, past the browser launch, past CDP attach.

### Claim 6, my run:

```
$ curl -s -w "HTTP %{http_code}" http://127.0.0.1:4100/api/dashboard
HTTP 401
{"error":"AuthRequired","message":"Требуется авторизация рабочего кабинета клиники."}
$ curl http://127.0.0.1:4100/api/health
{"ok":true,"service":"dental-crm-api",...} HTTP 200
```

Source-confirmed: `apps/api/src/routes/dashboard.ts:12` -> `requireOrganizationId`;
`apps/api/src/security/identity.ts:133-142` sends the 401. The built `apps/api/dist/routes/dashboard.js:10`
carries the same call, so the isolated smoke API really is running the guarded code.

**Verdict on the proof audit: zero fabrications. Every claim survives.**

---

## 4. THE ONE REAL FINDING — THE HANDOFF'S ROOT CAUSE IS WRONG

The builder wrote (and correctly flagged as unproven):

> "The root cause of the workspace-live-routes failure is INFERENCE, not proof ... It configures
> the API identically and .app-shell does render in the web app (App.tsx:2032, App.tsx:2299), so
> the app never reached render."

Implied mechanism: 401 -> `dashboard` stays null -> the `if (!dashboard)` early return at
`App.tsx:2294` -> no `.app-shell`. **That is not what happens.** I proved it two ways.

**(a)** Ran `smoke-workspace-live-routes.mjs` in external-URL mode against the *shared* dev
server (`node scripts/smoke-workspace-live-routes.mjs http://127.0.0.1:5173`, screenshots
redirected outside the repo). Identical failure: `Error: shift app shell did not become ready: false`.
So the failure is not specific to the isolated stack — and, incidentally, this is direct runtime
proof that the external-URL branch needs no vite, exactly as the builder claimed.

**(b)** Attached CDP to a fresh headless Edge profile pointed at `http://127.0.0.1:5173/#shift`
and dumped the DOM:

```json
{"hasAppShell":false,"readyState":"complete","loadingEl":false,
 "bodyText":"DENTE CRM-MIS\n\nВХОД В ЛИЧНЫЙ КАБИНЕТ ВРАЧА\n\nEMAIL\nПАРОЛЬ\nВойти в профиль\nЗарегистрировать клинику · Общий терминал клиники"}
```

The app renders the **clinic login screen** (`apps/web/src/components/auth/UserLogin.tsx`), not a
loading state and not an error state. Source:

```
apps/web/src/App.tsx:1916-1917
  const [clinicAuthed, setClinicAuthed] = useState<boolean>(() => {
    return typeof window !== "undefined" && !!localStorage.getItem("dente_clinic_token");

apps/web/src/App.tsx:1999-2001
  // Show clinic login gate if not authed
  if (!clinicAuthed) {
    return <AuthHub onSuccess={...} />;
```

A fresh headless profile has no `dente_clinic_token` in localStorage, so `clinicAuthed` is `false`
on first render and `<AuthHub/>` returns **before** anything touches the dashboard. The
`if (!dashboard)` branch at 2294 and the `if (error && !dashboard)` branch at 2278 are never
reached. There is a second gate too — `if (!staffAuthed || showStaffPinPad)` at 2011 (StaffPinPad)
— also ahead of the dashboard branches.

Consequence for the next packet: **fixing the node-side `x-dente-clinic-token` header alone will
not turn routes.mjs green, and neither will fixing the 401.** The browser must have
`localStorage["dente_clinic_token"]` (and, to clear the PIN gate, `dente_staff_token`) installed
before the SPA's first render. The builder's blocker text does reach the right remedy
("the browser needs the same token installed before app boot via
`Page.addScriptToEvaluateOnNewDocument`") — so the *direction* is right while the *mechanism*
stated above it is wrong. The next packet should work from this section, not from the handoff's
inference.

This is a handoff-accuracy defect, not a defect in the committed code, and it was honestly
labelled unproven. It does not sink the packet; it does cost it a clean SOUND.

---

## 5. ATTACK SURFACE

| # | Hypothesis | Result | Evidence |
|---|---|---|---|
| 1 | The cited defect never existed / was invented | **DISPROVED** | `git show 2646c806^:...` shows the hardcoded path at 36/44/43; `existsSync(apps/web/node_modules/vite/bin/vite.js) === false` |
| 2 | The fix is dead code — nothing consumes `resolveViteBin` on a reachable path | **DISPROVED** | 3 call sites (`routes:72`, `core:68`, `settings:67`); all three executed by me, all three booted `VITE v6.4.3` from the resolved path |
| 3 | Hollow facade — `{success:true}`, no-op, placeholder, fabricated 0 | **DISPROVED** | Resolver has no success object: it returns a real path or `throw`s. No default, no fallback constant, no swallowed error |
| 4 | Swapped one hardcoded path for another (§1 anti-hardcode violation) | **DISPROVED** | `rg "vite/bin\|bin/vite" scripts/ package.json apps/web/package.json` -> zero literal binary paths; exec name comes from the manifest `bin.vite` field |
| 5 | Second owner — duplicate resolver, parallel error vocabulary | **DISPROVED** | Exactly one `resolveViteBin` definition, three importers, zero remaining copies; helper lives next to `findFreePort.mjs`/`sleep.mjs` in `scripts/lib` |
| 6 | Error precedence changed (vite now fails before browser/API checks) | **DISPROVED** | All three: browser check, then `apiServerPath` check, then `resolveViteBin()` — same order as the deleted guard |
| 7 | `vitePath` moved into a block in routes.mjs and is referenced outside it -> ReferenceError | **DISPROVED** | `routes.mjs:72` declares it, `routes.mjs:123` consumes it, both inside `if (!baseTargetUrl)`; external-URL run reached the CDP stage without touching vite |
| 8 | Resolver fails under a nested (non-hoisted) layout — builder called this untestable | **DISPROVED** (builder's gap closed) | Synthetic root in TEMP with `node_modules/vite/{package.json,bin/vite.js}` -> resolver returned `...\p5fake\nested\node_modules\vite\bin\vite.js`. No `npm i` required |
| 9 | Resolver silently accepts a partial install (manifest present, bin missing) | **DISPROVED** | Synthetic partial root -> throws `...\bin\vite.js -> declared by ...\package.json but not on disk`, and with a second root supplied it continues and resolves there |
| 10 | Resolver breaks when cwd is not the repo root | **DISPROVED** | Run from `C:\Users\Admin\AppData\Local\Temp` -> still returns `C:\Clinic_MVP\dental-crm\node_modules\vite\bin\vite.js` (anchored on `import.meta.url`). Strictly better than the old cwd-relative `path.resolve` |
| 11 | `require.resolve("vite/package.json")` is blocked by vite's `exports` map, so the fallback branch is doing all the work and the message is misleading | **DISPROVED** | vite 6.4.3 `exports` includes `"./package.json"`; the `require.resolve` branch succeeds and the fallback never fires on this layout |
| 12 | Claim 5 ("smokes get past the vite gate") is asserted but never observed | **DISPROVED** | My own runs: `VITE v6.4.3 ready in 382 ms` + `Local: http://127.0.0.1:52556/`, execution reaching `core-actions.mjs:301`, past the `waitForHttp(webBaseUrl)` gate at 296 |
| 13 | The three smokes actually pass and the builder under-reported | **DISPROVED** | All three exit 1. `SMOKE VERIFIED` is correctly claimed for none |
| 14 | The 401 blocker is invented to excuse a red smoke | **DISPROVED** | Reproduced by curl on the shared API and in both smokes' isolated API logs; source at `dashboard.ts:12` + `identity.ts:133-142` |
| 15 | The routes.mjs root cause in the handoff is correct | **CONFIRMED as WRONG** | CDP DOM dump shows the clinic login screen, not a loading/error state; `App.tsx:1916-1917` + `App.tsx:1999-2001` gate on `localStorage["dente_clinic_token"]` ahead of every dashboard branch |
| 16 | Deleted/renamed a field in the `useAppLogic.tsx` return block | **DISPROVED** | `useAppLogic.tsx` is not in the commit; no `apps/web` file is |
| 17 | Added a listener/interval/subscription without teardown | **DISPROVED** | Resolver is synchronous and stateless — no timers, no handles. The `setTimeout` watchdogs in the smokes are pre-existing and `.unref()`ed |
| 18 | Leaked a vite/node server or collided with the shared 5173 | **DISPROVED** | All three use `findFreePort()` (ephemeral, e.g. 52555/52556); after my runs `netstat` shows those ports gone and the newest `node` process is the pre-existing shared API (PID 20812, started 01:08, before my runs). 5173 (PID 22280) and 4100 (PID 20812) untouched |
| 19 | Mojibake in the diff, the new file, or the Russian commit subject | **DISPROVED** | `[РС][-ÿ]` scan: 0 broken lines in commit subject, commit body, all 4 code files and all 3 packet docs. Subject renders as `fix(смоук-тесты): три живых теста не запускались — vite искали там, где его нет` |
| 20 | Hardcoded hex colour / undeclared Russian UI literal / static px introduced | **DISPROVED** | Diff adds no colours, no px, no UI text. The one new string is an English developer error message, consistent with the sibling `"Build API first: ..."` message in the same files. Dev scripts are not an i18n surface |
| 21 | The broken idiom survives in other `scripts/` files and was not reported (brief item 4) | **DISPROVED** | `rg "node_modules/vite"` across `scripts/` + manifests -> only `resolveViteBin.mjs:43` (the resolver's own fallback). Builder reported the survey in `state.md:27` and `handoff.md:24` |
| 22 | Commit swept in churn or another agent's work | **DISPROVED** | 6 files, all packet-owned. `scripts/ops-panels-shots.mjs` is dirty in the tree and is NOT in the commit, exactly as the builder said |

---

## 6. GIT HYGIENE

- **Files:** 6, all packet-owned. No `apps/api/.data/*.json`, no `apps/web/tsconfig.tsbuildinfo`,
  no `apps/api/dist/**`, no `scratch/**`. The tree is heavily dirty with other agents' work
  (50+ modified files incl. all of `apps/api/dist`) and **none of it** was swept in.
- **Off-limits dirty files:** `scripts/ops-panels-shots.mjs` remains unstaged and is absent from
  the commit. `git status --porcelain scripts/ .agents/archon/packets/P5-vite-path/` after my
  review shows only that file plus this `review.md`.
- **Subject:** `[ARCHON] fix(смоук-тесты): три живых теста не запускались — vite искали там, где его нет`.
  Conventional Commits, correct type, Russian subject that names the DEFECT ("three live tests did
  not run — vite was looked for where it isn't"), not "improve"/"update"/"cleanup".
- **Body:** explains WHY (npm workspaces hoisting), quotes the misleading message, states what
  replaced it, and justifies the shared-helper placement. Complies with mandate 12.
- **Encoding:** 0 mojibake lines anywhere. The em-dash and Cyrillic survive `git log` intact.
- **Second commit** `4d9e0cd54` is docs only: `handoff.md` (new) + `state.md`. Clean.

---

## 7. NITS (none blocking)

1. **Search-root order is the wrong way round.** `defaultViteSearchRoots = [repoRoot, apps/web]`.
   Since the root always resolves on a hoisted layout, a nested `apps/web/node_modules/vite`
   would be **shadowed** by the root copy — and the vite server is spawned with
   `cwd: apps/web`, so the workspace's own declared copy is the semantically correct winner.
   Today this is theoretical (`vite` is declared in exactly one manifest, one version, so npm has
   nothing to nest), but the brief asked the resolver to survive "hoisted OR nested"; strictly it
   survives nested-*only*, not nested-alongside-hoisted. `[apps/web, repoRoot]` would be correct
   and costs one line.
2. **The builder's own suggested closing command is dangerous.** `npm i vite -w @dental/web`
   would rewrite `package.json` and `package-lock.json` in a repo with a live agent fleet in it.
   Do not run it. The synthetic-root test in Attack Surface #8 closes the same gap in one
   read-only command and I have already done so.
3. **`readManifest` uses an in-band sentinel**: it returns `{ error }` on parse failure, which is
   indistinguishable from a manifest that legitimately has an `error` key. No npm manifest does,
   so this is cosmetic, but a thrown/`null` return would be cleaner.
4. **Anchoring asymmetry (pre-existing, out of scope).** `vitePath` is now anchored to
   `import.meta.url` and is cwd-independent, while `apiServerPath = path.resolve("apps/api/dist/server.js")`
   and `cwd: path.resolve("apps/web")` in the same files remain cwd-relative. The scripts still
   only work from the repo root. Not introduced here; worth a future packet.
5. **Doc debt (out of scope).** `.agents/COMMANDS_AND_TESTS.md` lists 8 `smoke:` keys and none of
   these three. Part of why they rotted unnoticed.

---

## 8. WHAT THE PACKET ASKED FOR vs WHAT LANDED

| Brief item | Status |
|---|---|
| 1. Read all three scripts in full before changing the launcher | Met — the edits are surgical and preserve error precedence and the external-URL branch |
| 2. Real module resolution, not a second hardcoded path | Met — `createRequire(...).resolve("vite/package.json")` + manifest `bin` field + two roots + on-disk fallback |
| 3. Truthful error naming every path tried | Met — verified verbatim |
| 4. Report the same idiom elsewhere, don't fix it | Met — survey run, result "only these three", nothing else touched |
| 5. **The smokes must actually run** | **NOT met** — all three still exit 1. Correctly and loudly declared NOT VERIFIED with exact repro commands. Half the job, honestly labelled as half |

Shared-port discipline: honoured. All three allocate ephemeral ports via `findFreePort()`; 5173
(PID 22280) and 4100 (PID 20812) were never touched by the scripts or by me; teardown verified —
no leaked node process after three full runs.

---

## 9. VERDICT

**SOUND_WITH_NITS.**

The defect was real, the fix is minimal and correct, it has a single owner, it introduces no
hardcode, no facade, no leak and no mojibake, the commit is surgically clean in a filthy tree, and
**every single proof claim reproduced under my own hands.** After three reviewers were beaten by
fabricated evidence on this codebase, this packet's evidence is genuine.

It is not SOUND-without-qualification for two reasons: the packet's stated goal (smokes exit 0)
was not reached, and the handoff hands the next packet a **wrong causal model** for the routes
failure. The builder flagged that model as unproven, which is why this is a nit and not a rework
order — but §4 above must supersede it in the follow-up packet.

### Required rework (all for the FOLLOW-UP packet, not this one)

1. Replace the routes.mjs root cause in `handoff.md` with §4: the blocker is the clinic-login gate
   at `App.tsx:1999-2001`, driven by `localStorage["dente_clinic_token"]` read at `App.tsx:1916-1917`,
   which returns before any dashboard branch. Fixing the 401 alone will not make routes.mjs green.
2. The follow-up must install `dente_clinic_token` **and** `dente_staff_token` in the browser before
   first render (`Page.addScriptToEvaluateOnNewDocument`) in addition to sending
   `x-dente-clinic-token` from the node side. Two gates, not one.
3. Do not run `npm i vite -w @dental/web`. The nested-layout question is already closed
   (Attack Surface #8) by a read-only synthetic-root test.

### Optional, one line each

4. Flip `defaultViteSearchRoots` to `[apps/web, repoRoot]` so a workspace-local vite wins over a
   hoisted one.
