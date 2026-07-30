# ADVERSARIAL REVIEW — packet C1-dicom-wrong-study

Reviewer: adversarial subagent under [ARCHON]. Did not write this code. Posture: disbelief.
Date: 2026-07-28. Read `.agents/AGENTS.md` and `.agents/INDEX.md` complete before judging.
Not penalising: madge (§11, not installed), biome (not installed).

**VERDICT: SOUND_WITH_NITS.** Every central claim reproduced under my own tooling.
Ten findings below, none of which make the change worse than the defect; four are worth
closing before this route ever carries a real patient study.

---

## 0. Commit topology — the packet is THREE commits, not one

The brief names `b78dfc69b` as "the commit to attack". `b78dfc69b` is **docs only**:

```
b78dfc69b [ARCHON] docs(пакет C1): сдача по подмене DICOM-объекта чужим файлом
  A .agents/archon/packets/C1-dicom-wrong-study/commitmsg3.txt
  A .agents/archon/packets/C1-dicom-wrong-study/handoff.md
  M .agents/archon/packets/C1-dicom-wrong-study/state.md
```

The source lives in two earlier commits:

```
f70a47ff2 [ARCHON] fix(снимки): любой UID отдавал один и тот же DICOM-файл
  A .agents/archon/packets/C1-dicom-wrong-study/commitmsg.txt
  A .agents/archon/packets/C1-dicom-wrong-study/state.md
  M apps/api/src/routes/dicomweb.ts                       +271/-18
370fd2933 [ARCHON] test(снимки): доказательство, что чужой UID не отдаёт байты DICOM
  A .agents/archon/packets/C1-dicom-wrong-study/commitmsg2.txt
  M apps/api/src/routes/dicomweb.test.ts                  +238/-17
  M apps/api/src/routes/dicomweb.ts                       +8  (comment-only)
```

Foreign commits `e71445757` (nav rail) and `669c812a5` (clinical task) are interleaved.
All three C1 commits reviewed as one packet.

---

## 1. Was the defect REAL before the fix? — **CONFIRMED**

`git show f70a47ff2^:apps/api/src/routes/dicomweb.ts` — 32 lines, verbatim core:

```ts
const { instanceUid } = request.params;
const fallbackPath = path.resolve(process.cwd(), "../../.data/dicom/test.dcm");
const stat = await fs.stat(fallbackPath);
reply.header("Content-Type", "application/dicom");
return reply.send(createReadStream(fallbackPath));
```

- `studyUid` / `seriesUid` never destructured. `instanceUid` used only inside `app.log.error`.
- No `preHandler`, no `requireClinicalReadAccess`, no `requireOrganizationId`, no token read.
- Exactly one route. No QIDO-RS, no `/metadata`, `/frames`, `/bulkdata`.
  **Builder's route inventory is accurate.**

Dossier §5.6 accurate. Severity as briefed.

---

## 2. Reachability — builder's SPLIT ANSWER independently verified, both halves

**HTTP layer: LIVE.** `apps/api/src/server.ts:43` imports, `:418` calls `registerDicomwebRoutes`.
Not taken on faith — I got real 401/404/200 out of the handler (§4).

Chain-of-custody on the live server, which matters because the API VERIFIED claims depend on it:
- PID 14120 on `127.0.0.1:4100`, `CreationDate 28.07.2026 1:43:23`,
  cmdline `node --require .../tsx/preflight.cjs --import .../tsx/loader.mjs src/server.ts`.
  **No `--watch`** — the process is frozen at its start-time source.
- `apps/api/src/routes/dicomweb.ts` mtime `Jul 28 01:42`, i.e. final content predates process start.
- The only post-`f70a47ff2` change to that file (in `370fd2933`, 01:43:37) is **comment-only**
  (`git diff f70a47ff2 370fd2933 -- apps/api/src/routes/dicomweb.ts` = 8 added comment lines).
- `git diff HEAD -- apps/api/src/routes/dicomweb.ts apps/api/src/routes/dicomweb.test.ts` = empty.

=> the process answering on 4100 is executing HEAD's dicomweb code. The live proofs are valid.

**In-app viewer: DEAD, worse than the builder said.** `apps/web/src/ImagingView.tsx:510`:

```tsx
imageIds={[`wadouri:http://localhost:3000/api/dicomweb/studies/${selectedImagingStudy?.dicomStudyUid}/series/1/instances/1`]}
```

- `netstat -ano | grep LISTENING` -> `4100`, `5173`, `5432` only. **Nothing on 3000.** Confirmed.
- Series and instance are the literal strings `"1"` / `"1"`.
- **Additional fact the builder understated:** that `<Cornerstone3DViewer>` sits inside
  `<div className="opacity-50 pointer-events-none w-full flex-1">` (ImagingView.tsx:508) behind
  `<DicomArchiveUploader>` — it is a ghosted decorative preview, not the working viewer.
- Repo-wide `rg "api/dicomweb"` returns exactly three hits: ImagingView.tsx:510, the route
  registration, and the test's URL builder. **No smoke script and no other client calls this route.**
  (`/api/imaging/dicomweb/check` at imaging.ts:6274 is the external-PACS connectivity probe —
  a different feature; `smoke-dicomweb-connector-boundary.mjs` targets that, not this.)

**Conclusion:** this is NOT dead code sold as a product fix. The endpoint was live and served
medical DICOM bytes to any unauthenticated caller who could reach port 4100; that hole is now
closed and I closed the loop myself. The *product feature* on top of it remains dead, and the
builder said so.

---

## 3. Proof audit — every claimed command RE-RUN, same command, by me

| Claim | My re-run | Result |
|---|---|---|
| TYPECHECK `npm run typecheck -w @dental/api` -> exit 0 | `cd apps/api && npm run typecheck` | **REPRODUCED.** Output = the two npm banner lines only. `EXIT=0`. Zero diagnostics. |
| UNIT `node --import tsx --test src/routes/dicomweb.test.ts` -> 9/9 | same command | **REPRODUCED.** `tests 9 / pass 9 / fail 0 / duration_ms 800.4689`. All nine test names match the quoted list character for character. |
| UNIT, hostile-env rerun (mine, not claimed) | `DENTE_CLINICAL_ADMIN_SECRET="some-real-secret-value-here" node --import tsx --test ...` | **9/9, EXIT=0.** `dicomweb.test.ts:42` `delete process.env.DENTE_CLINICAL_ADMIN_SECRET` beats the ambient var; `clinicalAdminSecret()` (authSecret.ts:111) reads lazily. Test is not fragile to developer env. |
| DB `imaging_studies=1, imaging_series=0, imaging_instances=0, organizations=2` | `pg.Client` direct SQL, `DATABASE_URL` from root `.env` | **REPRODUCED EXACTLY.** Single study row `0abf6cbe-4e1d-4ab6-963c-5f9eee4e02aa`, org `4a3420d1-...`, `dicom_study_uid=null`, `storage_path=null`. |
| ASSET INTEGRITY `.data/dicom/test.dcm` unchanged | `ls -la` + `md5sum` after my test runs | **HOLDS.** `121356  Jul 27 09:25`, md5 `1273d70b0e5bb19fc6c684808e03aaa3`. mtime unchanged by three test runs. The old test's habit of stomping this file with 19 bytes is genuinely gone. |
| ENCODING `brokenLines=0 bom=false` on 3 files | my own scanner over all **7** packet files | **HOLDS, and wider.** dicomweb.ts / dicomweb.test.ts / commitmsg{,2,3}.txt / handoff.md / state.md: `broken=0 bom=false U+FFFD=0`. `git log --format=%s` renders all three Russian subjects intact. No `РљР°СЂ`-class garbage, no `вЂ"`, no `В«`. |

Scanner and probe scripts live outside the repo at
`C:\Users\Admin\.claude\projects\c--hades\work-memory\c1-encoding-scan.cjs` and
`c1-dicom-attack.mjs`. Neither prints the secret or the token.

---

## 4. Live HTTP — I signed my own token and attacked the running server

`node c1-dicom-attack.mjs <orgA> <orgB>`; token = HMAC-SHA256 over `{organizationId,exp,iat}`
with `AUTH_TOKEN_SECRET` read from `apps/api/.env`, matching `utils/cryptoHelper.ts:43`.

Builder's six claimed probes, all reproduced:

```
health                                   200 {"ok":true,"service":"dental-crm-api",...}
A no token, sample true UIDs             401 application/json  {"error":"AuthRequired"}
B org token, sample true UIDs            200 application/dicom  content-length=121356  magic@128="DICM"
C /studies/1/series/1/instances/1        404 {"error":"DicomInstanceNotFound", ...}   <- the old exploit URL
D 9.9.9.9.does.not.exist/7.7.7/5.5.5     404 {"error":"DicomInstanceNotFound", ...}
E right study + 1.2.3.wrong.series       404 {"error":"DicomInstanceNotFound", ...}
F right study+series + 9.9.9.wrong.inst  404 {"error":"DicomInstanceNotFound", ...}
```

Probes C–F return `content-type: application/json`, never `application/dicom`. The
**partial-match attack is genuinely closed**, and E/F prove the byte comparison at
dicomweb.ts:125-129 is executing rather than decorative — the same physical file is on disk,
only the requested series/instance changed, and the answer flipped from bytes to 404.
This is the single most important thing a facade could not fake, and it holds.

Six additional probes of my own:

```
G  OTHER org's token, sample true UIDs   200 application/dicom  121356 bytes   <- see F2
H  token with an org id in NO org row    200 application/dicom  121356 bytes   <- see F2
I  studyUid = "../../../package.json"    404 DicomInstanceNotFound             <- no traversal, no SQL error
J  study/series/instance = "%20"         400 DicomInstanceUidMissing           <- 400 branch is live
K  unsigned garbage clinic token         401 AuthRequired
L  x-organization-id header only         401 AuthRequired                      <- dev IDOR header correctly inert
M  Origin: http://evil.example + token   200, but @fastify/cors withholds ACAO for a non-listed origin
```

---

## 5. Hollow-facade / architecture checks

- **`{success:true}` over a no-op?** No. The handler returns real bytes or a real 404, and I
  flipped it between the two with nothing but a URL change.
- **Magic constant / hardcoded UID allow-list?** No. Grepped: there is no UID literal in
  `dicomweb.ts`. Identity comes from the file's own bytes (`readDicomIdentity`, :88-114). The
  three literals present (`x00080018`, `x0020000d`, `x0020000e`) are DICOM protocol tags, not config.
  The sample path is env-driven (`DENTE_DICOM_SAMPLE_PATH`, :63/:145-149) with the previous
  location as default — this is a de-hardcode, per the anti-hardcode doctrine.
- **Fabricated 0/default standing in for an unknown?** No. Unknown -> `null` -> 404, never a
  substitute value. Every failure path in `readDicomIdentity` fails CLOSED.
- **SECOND OWNER?** No. `imaging.ts` serves no study bytes anywhere — it has `preview.svg`
  (generated), `analyze` (reads the file, returns text), and viewer-session. `dicomweb.ts` is the
  only byte-serving route and it now *reads* the existing owner's columns
  (`imaging_studies.storage_path`, `imaging_instances.storage_path`) instead of ignoring them.
  This commit **removed** a parallel-truth path rather than adding one.
- **`useAppLogic.tsx` return field deleted/renamed?** No web file is touched in any of the three
  commits. The God-Context constraint is untouched.
- **Listener / interval / subscription without teardown?** The one resource is the `FileHandle` in
  `readDicomIdentity`, closed in `finally` on every path including parse failure (:107-113) —
  verified by reading, and it is a real fix since the route is per-frame.
- **Hardcoded hex / static px / relative-unit violations?** No CSS or UI touched. N/A.
- **New hardcoded Russian literals?** Yes — three new API error messages
  (`DicomInstanceNotFound`, `DicomInstanceFileUnreadable`, `DicomInstanceUidMissing`). Consistent
  with the entire existing API surface, which is Russian-literal throughout, and each ships a
  stable machine-readable `error` code so a client can localise. i18n debt not called out in the
  handoff, but it is repo-wide, not introduced here. Nit only.
- **New dependency?** `dicom-parser@^1.8.21` was already in `apps/api/package.json:26` and
  installed at 1.8.21. Not a new install, no lockfile churn.

---

## 6. Git hygiene — CLEAN, including the shared-index trap

`git show --name-status` on all three commits (§0) — **only the claimed files**. Specifically:

- No `apps/api/.data/*.json`, no `*.tsbuildinfo`, no `scratch/**`, no `dist/**`.
- No other author's work swept in. The worktree at review time is filthy with 40+ modified
  `apps/api/dist/**` files, a modified `apps/api/.data/dental-crm-state.json`, and a *staged*
  (`A`) `C3-nav-rail-unlabelled/**` packet belonging to a different agent — **none of which
  appear in any C1 commit.** The shared-index contamination that hit two earlier commits did
  not hit this one.
- Conventional Commits with Russian subjects that name the defect, not the patch:
  `fix(снимки): любой UID отдавал один и тот же DICOM-файл` — states the defect verbatim.
  Bodies explain WHY (patient-safety reasoning, tenant reasoning), per §12.
- Both fix and test bodies split into what was broken / what changed. Handoff splits
  ПРОВЕРЕНО / НЕ ПРОВЕРЕНО per §8b.

---

## 7. FINDINGS

### F1 — MEDIUM (proof gap). The guard this packet added is a no-op in every environment it was tested in.
`dicomweb.ts:216` adds `requireClinicalReadAccess`. But:
- `dicomweb.test.ts:41` sets `process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1"` and `:42`
  deletes the admin secret, so `accessGuard.ts:63` returns `true` unconditionally in all 9 tests.
- The live server is the same: `apps/api/.env:3` `DENTE_CLINICAL_ALLOW_UNGUARDED_READS=1`,
  `:5` `DENTE_CLINICAL_ADMIN_SECRET=` (empty), `:1` `NODE_ENV=development`.

So **every** 401/404/200 I and the builder observed was produced by `requireOrganizationId` alone.
Zero evidence, unit or live, that the clinical read gate does anything on this route. It is also
not in the NOT PROVEN list. Consequence worth knowing: on a server where the admin secret IS set,
this route answers **403 ClinicalReadSecretRequired** to a valid clinic token that lacks
`x-dente-admin-secret` — and nothing in this packet has ever executed that path.

### F2 — MEDIUM (tenant scoping). Branch 3 has no organizationId filter at all, and I proved it live.
Brief item 4: "Every query must filter by organizationId." True of branches 1 and 2. **Branch 3
(`dicomweb.ts:204-207`, the sample) never looks at `organizationId`.**
- Probe **G**: the *second* organization's signed token -> `200 application/dicom`, 121356 bytes.
- Probe **H**: a token carrying `00000000-0000-0000-0000-000000000000`, a UUID present in no
  `organizations` row -> `200 application/dicom`, 121356 bytes. The route never checks that the
  org id resolves to a real organization.

Mitigating, and I credit it: the builder documented this precisely at `dicomweb.ts:137-143` and
as handoff debt item 3, and the shipped file is the public `CompressedSamples^CT2` set containing
nobody's data. Forging H needs `AUTH_TOKEN_SECRET`, so it is not an exploit today. But the
warning in the code is load-bearing: point `DENTE_DICOM_SAMPLE_PATH` at one real patient scan and
every clinic in the install can read it. This limitation is absent from the CLAIMED PROVEN /
NOT PROVEN lists handed to the lead — it only exists in the code comment and the handoff.

### F3 — LOW-MEDIUM (correctness). `.limit(1)` on a non-unique column can 404 a study that exists.
`db/schema.ts:791-823` declares **plain `index()`, never `unique()`**, on `dicom_series_uid` and
`dicom_sop_instance_uid`; `imagingStudies.dicomStudyUid` has no unique constraint either. Branch 2
(`dicomweb.ts:185-202`) takes `.limit(1)` with no `ORDER BY`, byte-checks that one row, and on
failure **does not try the next matching row** — it drops to the sample and then 404s. Two studies
in one org sharing a `dicom_study_uid` (re-import, duplicate manifest commit) therefore yields
`DicomInstanceNotFound` for an instance that is genuinely stored. Fails safe, but it is a
real false-negative and the operator gets an error code that says "not in this clinic" when it is.

### F4 — LOW (latent security). Branch 1 streams an unverified, uncontained filesystem path.
`dicomweb.ts:183`: `if (instanceRow?.storagePath) return path.resolve(instanceRow.storagePath);`
— no byte verification, no storage-root containment, then streamed as `application/dicom` at :272.
`imaging_studies.storagePath` is **client-supplied** (`imaging.ts:6604` <- `createImagingStudySchema`
via `POST /api/imaging/studies`), so the pattern of tenant-controlled absolute paths is established
in this schema. `imaging_instances` has 0 rows and no writer today, so this is latent, not live.
The builder declared the sandbox gap as handoff debt item 4 and correctly noted `imaging.ts:6637-6660`
has the same gap — but he added byte verification to branch 2 and *not* to his own new branch 1,
where a three-line `path.resolve(p).startsWith(allowedRoot)` would have cost nothing. His stated
reason (multi-frame CBCT cannot afford a re-parse per frame) justifies skipping the parse; it does
not justify skipping path containment.

### F5 — NIT (unverifiable number in a proof document). `handoff.md:40` claims the file went
"32 -> 285 строк". `wc -l apps/api/src/routes/dicomweb.ts` = **275**. It was 267 at `f70a47ff2`.
285 matches neither. Ten lines, harmless in itself — flagged because an unchecked number inside a
ПРОВЕРЕНО-adjacent document is the exact genre that has beaten three reviewers on this repo.

### F6 — NIT (incomplete NOT PROVEN list). The list says only the `imaging_instances` branch is
mock-only. **Branch 2 is equally mock-only for its SQL half**: the one live study row has
`dicom_study_uid = NULL` and `storage_path = NULL`, so no live HTTP request can reach that branch.
Its byte-verification half *is* live-proven, because `fileCarriesRequestedUids` is shared with
branch 3 and probes B/E/F exercise it end-to-end. The honest statement is "both DB branches are
mock-only; the byte gate is live-proven".

### F7 — NIT. `state.md:76` "FILES LEFT ON DISK" omits `commitmsg3.txt` and the `handoff.md`
written in the third commit. Stale by one commit.

### F8 — OBSERVATION, not a defect. Branch 1 trusts the DB index absolutely: a mis-ingested row
whose `storage_path` points at another patient's file still yields that file with `200`. That is
how every real PACS behaves, and the brief's prohibition is on *unknown* UIDs returning bytes,
which branch 1 honours. Recording it so the lead knows the wrong-scan class is **narrowed to a
corrupt index row**, not eliminated. `dicomweb.test.ts:153-171` is honest about this — it
deliberately serves a file whose bytes do *not* carry the requested UIDs, and says so in its comment.

### F9 — LOW (efficiency). Every unresolved request costs two DB round trips plus up to two
`open`+`read(1 MiB)`+`parseDicom` cycles (`:199` and `:205`), with no negative cache. Authenticated-
only, so a weak amplifier, but a viewer that walks a nonexistent series pays it per frame.

### F10 — INFORMATIONAL (product, outside claim). Repointing `ImagingView.tsx:510` at port 4100 is
**necessary but not sufficient**. Cornerstone's `wadouri` loader attaches no
`x-dente-clinic-token`, so post-fix the viewer would receive `401 AuthRequired` instead of a wrong
scan, and the hardcoded `series/1/instances/1` would `404` even with a token. The builder states
this; I confirmed it. Whoever picks up that debt needs a cornerstone header hook plus real
series/instance UIDs, not a one-token port edit.

---

## 8. What I could NOT test, and why

- **`npm test -w @dental/api` (full suite).** Not run. The worktree currently carries another
  author's staged C3 packet and 40+ dirty `dist/**` files; a failure elsewhere would be
  unattributable, exactly as the builder argued. Static blast radius is small: `dicomweb.ts` is
  imported by `server.ts:43` and its own test, nothing else (`rg` verified).
- **Branch 1 / branch 2 against real rows.** Would require `INSERT`s into
  `imaging_studies/imaging_series/imaging_instances`. My mandate is read-only SQL, and writing
  demo rows would contaminate the shared DB other agents and the lead's screenshot pipeline read.
  Remains the single largest open gap, and the builder declared it.
- **Deflated transfer syntax (1.2.840.10008.1.2.1.99).** No such file exists in the install.
  The claimed behaviour (404 rather than pixels) is the fail-closed direction, so an error here
  cannot produce a wrong scan.
- **Browser/viewer behaviour.** UI VERIFIED is reserved to the lead; the chain is dead upstream (§2).
- **`madge --circular`.** Not on PATH — known-wrong authority claim, AGENTS.md §11. Not penalised.

---

## 9. VERDICT: SOUND_WITH_NITS

The defect was real, the fix is real, the fix is reachable, and the proof pack reproduces.
`/api/dicomweb/studies/1/series/1/instances/1` — the URL that used to hand 121356 bytes of medical
imaging to any anonymous caller — now answers `404 DicomInstanceNotFound`, and I watched it do so
with a token I signed myself. The partial-match attack (right study, wrong series) is closed and
the byte gate demonstrably executes. Test asset vandalism is fixed. Git hygiene survived a shared
index that has already contaminated two other commits this cycle. Encoding is clean. The handoff's
НЕ ПРОВЕРЕНО section is honest to a degree this repo has not earned.

Not SOUND, because: the guard the packet advertises (`requireClinicalReadAccess`) was disabled in
100% of its own tests and is inert on the live server (F1); the sample branch has zero tenant
scoping and I demonstrated a cross-org 200 (F2); and a numeric claim in the proof document does
not reproduce (F5).

### REQUIRED REWORK (none blocking; close before this route carries a real study)
1. **F2** — bind the sample to an organization, or gate branch 3 behind an explicit
   `DENTE_DICOM_SAMPLE_ENABLED` dev flag that is off by default. Surface the limitation in the
   claim list, not only in a code comment.
2. **F4** — add storage-root containment to branch 1 (`dicomweb.ts:183`): resolve against a
   configured `DENTE_IMAGING_STORAGE_ROOT` and refuse anything outside it. Same treatment for
   `imaging.ts:6637-6660`.
3. **F1** — add one test that leaves `DENTE_CLINICAL_ADMIN_SECRET` set and asserts
   `403 ClinicalReadSecretRequired`, so the added guard is actually exercised once.
4. **F3** — either a unique index on `(organization_id, dicom_study_uid)` or iterate the matching
   study rows instead of `.limit(1)`.
5. **F5/F6/F7** — correct the line count, widen the NOT PROVEN entry to both DB branches, refresh
   the state.md file list.
