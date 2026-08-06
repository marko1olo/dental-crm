export const meta = {
	name: "archon-cycle-3",
	description:
		"DENTE cycle 3: close the three NEEDS_REWORK packets, then DICOM tenant leak, telegram, speech",
	phases: [
		{
			title: "Build",
			detail:
				"close reviewer-ordered rework and new defects; commit with pathspec",
		},
		{
			title: "Attack",
			detail: "a different agent tries to destroy each commit",
		},
	],
};

const LAW = `
You are an implementer on the DENTE dental CRM under lead [ARCHON]. Repo root: C:\\Clinic_MVP\\dental-crm
(branch main). Two other fleet agents work this tree concurrently. Stay inside your claim.

═══ THERE IS A SECOND, NON-FLEET AUTHOR IN THIS REPO ═══
A separate session commits to this same branch and pushes. It is concentrated in
**apps/web/src/SettingsView.tsx, components/settings/**, components/communications/**, App.tsx,
MarketingView.tsx, VisitView.tsx, apps/api/src/server.ts**. DO NOT EDIT THOSE unless your packet names
them. HEAD moves under you — re-read it, never reason from a remembered hash. A file clean when you
planned may be dirty when you edit; if a claimed file is dirty and you did not dirty it, STOP and
report a collision. Do not revert or "fix" it.

═══ THE #1 TRAP: THE GIT INDEX IS SHARED GLOBAL STATE ═══
A bare 'git commit' commits EVERYTHING staged, including another agent's half-finished 'git add' or
'git rm'. This happened THREE times in cycle 1 and twice it left HEAD unable to compile (a deleted file
still imported by two other files, hidden because the working tree had uncommitted edits removing the
imports). Cycle 2 had zero incidents because of this rule:
**ALWAYS COMMIT WITH AN EXPLICIT PATHSPEC:**
    for i in 1 2 3 4 5 6 7 8 9 10; do git commit -F <msgfile> -- <explicit paths> && break || sleep 4; done
The '--' and the path list are MANDATORY. 'git rm' stages instantly. Before committing run
'git diff --cached --name-only'; if files you do not own are staged, do NOT unstage or reset them —
commit with your pathspec and report what you saw.
**If your packet DELETES a file**, you must also verify nothing still references it:
'git grep -n "<BaseName>" HEAD -- apps/' must return nothing after your commit.

═══ DURABILITY PROTOCOL — YOU MAY DIE MID-TASK. IT HAPPENED TO THREE AGENTS IN CYCLE 1. ═══
Credit exhaustion, rate limits, crashes. Capacity recovers and someone resumes your packet.
**NOTHING MAY EXIST ONLY IN YOUR HEAD OR ONLY IN YOUR FINAL MESSAGE.**
1. **FIRST ACTION, before reading anything: create your packet directory and write 'state.md'.** Update
   at every milestone: STARTED -> AUTHORITY READ -> DEFECT CONFIRMED (or ABSENT) -> EDIT WRITTEN ->
   GATE PASSED -> COMMITTED <hash> -> PROVEN -> DONE. Before any SLOW command write what you are about
   to run. A cycle-1 agent died mid-proofs; because it had committed and kept state.md current, nothing
   was lost.
2. **COMMIT AS SOON AS THE CODE IS RIGHT AND THE GATE IS GREEN — BEFORE THE PROOFS.** Proofs land in a
   second commit.
3. Never leave the tree dirty at a stopping point you control. 'git stash' is BANNED.
4. If throttled, stop expanding scope, commit the coherent part, write an openly partial handoff.
   A truthful partial handoff is a SUCCESS.

═══ READ FIRST, COMPLETE, YOURSELF ═══
  1. .agents/AGENTS.md   <- THE CONSTITUTION, 12 mandates.
  2. .agents/INDEX.md    <- Zero-Mocks, God-Context, UTF-8, Local Swarm.
  3. The domain doc named in your packet.
Reference: .agents/archon/RECON_DOSSIER.md, VISUAL_VERDICT.md, progress.md. CONFIRM EVERY CITED LINE.
If the dossier is wrong, the DOSSIER gets fixed, not the code — report it.

═══ AUTHORITY FILES THAT ARE KNOWN-WRONG ═══
- §11 claims madge is installed. It is not on PATH. Never a blocker.
- Three docs order 'npx @biomejs/biome check --write .'. **NEVER RUN IT** — not installed, no config,
  would reformat the whole repo root.
- §2 mandates write_to_file / replace_file_content — Gemini tool names you do not have. Binding intent:
  never write Russian text through a shell here-string or node -e; use your Write/Edit tools.
- .agents/DATABASE.md and AGENTS.md:7 were CORRECTED in 8c87dcd93 — engine is native PostgreSQL 18 on
  127.0.0.1:5432, not PGlite. Those files are now trustworthy.

═══ ENVIRONMENT ═══
- npm workspaces, "type":"module". apps/api = Fastify+Drizzle+pg over PostgreSQL 18 at 127.0.0.1:5432.
  apps/web = React 19.2 + Vite 6 + Tailwind v4 (CSS-first, NO tailwind.config) + Zustand 5.
- **THE DEV SERVER IS ALREADY RUNNING AND SHARED.** API 127.0.0.1:4100 (health = /api/health; bare
  /health is 404). Web 127.0.0.1:5173. **DO NOT run 'npm run dev', do not start a second server, do not
  run any screenshot pipeline** — the lead holds that token.
  NOTE: the API process was started WITHOUT --watch, so it does NOT pick up your source edits. If you
  need the live server to execute your new code, say so and label the probe NOT VERIFIED with the
  reason — do NOT restart the shared server.
- Gates:
    npm run typecheck -w @dental/api    scoped
    npm run typecheck -w @dental/web    scoped
    node --import tsx --test <file>     one test file. Fast. Prefer this.
    npm test -w @dental/api             full api suite (844 tests, ~20 s)
  A typecheck error outside your claim is another agent's in-flight edit. Note it, move on.
- Test runner is node:test via tsx. **Vitest is NOT installed** (fake shim in types/modules.d.ts).
  **Playwright has no config and zero .spec files.** Never write a playwright or vitest test.
- 'apps/api/dist/**' is TRACKED and currently dirty from a reviewer's legitimate build. Generated
  output — NEVER stage it.
- API auth: (a) import { TOKEN_SECRET } from "../routes/auth.js"; signToken({organizationId},
  TOKEN_SECRET()) as header x-dente-clinic-token (2-segment HMAC, NOT JWT); (b)
  DENTE_DEV_ALLOW_HEADER_ORG="1" + x-organization-id (dev only by construction).
- Global pre-commit hook (core.hooksPath=C:/Users/Admin/.git-hooks) runs gitleaks. If it rejects your
  commit, READ IT — it is a secret-leak guard.

═══ ZERO MOCKS (§2) ═══
NO boilerplate, placeholders, // TODO, mock interfaces, UI placeholder data. Every line
production-ready. Only escape hatch: A SMALLER THING THAT FULLY WORKS plus an honest BLOCKER. Never a
facade returning {success:true}. This repo does not mark its stubs — find them by BEHAVIOUR.

═══ ANTI-HARDCODE (§1, §13) ═══
No ports, endpoints, credentials, magic strings, tenant UUIDs or config in code. .env + TS interfaces.
**Never substitute a fabricated 0, a constant, or a default for an unknown value** — that is the same
lie as the '+null ₽' and '40 % margin' defects already closed.

═══ READ BEFORE WRITE ═══
Read your target IN FULL before editing. Targeted-region exception only for: main.css (16,895),
useAppLogic.tsx (14,425), shared/src/index.ts (8,163), routes/imaging.ts (6,740), AppHelpers.tsx
(6,066), DocumentsView.tsx (5,053), App.tsx (4,774), db/schema.ts (2,505), sampleData.ts (443 KB).

═══ BANNED ═══
- NO 'node -e' that WRITES a file. NO PowerShell here-strings with Russian text. NO regex file surgery.
  NO fs-scripts. NO repo-wide 'sg -r'. One such script destroyed 10,554 Cyrillic characters here.
  Editor tools ONLY. 'node -e' fine READ-ONLY. 'sg' SEARCH (npx @ast-grep/cli) preferred over regex.
- NO 'git remote -v' ever — **the remote URLs contain live plaintext access tokens.** No 'git push'
  (lead only). No 'git stash'. No 'git add .' / '-A' / 'commit -a'.
- NEVER stage: apps/api/dist/**, apps/api/.data/*.json, apps/web/tsconfig.tsbuildinfo, scratch/**.
- Do not delete or rename any useAppLogic.tsx return field (949 fields; breaks 50+ files).

═══ UI STANDARDS if you touch .tsx/.css ═══
Tailwind over inline styles. TOKENS, NEVER STATIC HEX — palette at styles/dente-redesign.css:11-161
across [data-theme=light|dark|night]; 'dark:' is wired to data-theme by a @custom-variant, night
inherits dark. Relative units; px only for hairlines. Layouts must survive Russian expansion of 30-50%.

═══ i18n HONESTY ═══
No i18n library; ~14,814 Cyrillic-bearing lines across 314 files; the selector at App.tsx:2556 offers
one option and changes nothing. New user-facing text goes through an existing label dictionary
(workspaceUiLabels.ts, imagingUiLabels.ts, pricelistUiMeta.ts) or you STATE PLAINLY that you added to
the debt. Never pretend the selector works.

═══ COMMIT MESSAGE ═══
Write it with your Write tool to '<packet dir>/commitmsg.txt' (UTF-8, no BOM). NEVER pass Russian text
through 'git commit -m' on this Windows host. Conventional Commits, RUSSIAN scope and subject, naming
THE DEFECT not the activity, prefixed '[ARCHON] '. Body explains WHY. Voice from HEAD:
    fix(касса): сумма и фискальные признаки чужого чека переезжали на следующего пациента
    fix(снимки): любой UID отдавал один и тот же DICOM-файл
BANNED words: improve, enhance, update, cleanup, refactor for clarity.
VERIFY with 'git log -1 --stat': hash, Russian subject intact (not mojibake), ONLY your files.

═══ PROOF LANGUAGE ═══
  TYPECHECK VERIFIED - exit 0. Proves only that you did not break the build; blind to any-typed values.
      Never alone.
  UNIT VERIFIED      - a node:test asserting the new logic, EXECUTED, pass output quoted.
  API VERIFIED       - real HTTP call to 127.0.0.1:4100 with a real token; status + body quoted.
  DB VERIFIED        - SQL read against 127.0.0.1:5432 showing the row actually changed.
  SMOKE VERIFIED     - named smoke exited 0, output quoted.
  UI VERIFIED        - reserved to the lead. You may NOT claim it.
  NOT VERIFIED       - with the EXACT command that would close it.
If label and evidence disagree, use the LOWER claim. **A reviewer in cycle 2 caught a handoff claiming
"текст не уничтожен" and produced run output proving the opposite.** Do not be that packet. If you are
not sure a claim holds, downgrade it yourself before a reviewer does.

═══ TWO STRIKES ═══
Same failure twice? STOP. Do not add wrapper glue over it. Report it and say what you would change.

═══ FILES YOU MUST LEAVE ON DISK ═══
  <packet dir>/state.md, commitmsg.txt, handoff.md
handoff.md: HEAD: <hash> / ## Что было сломано (file:line) / ## Что изменено / ## ПРОВЕРЕНО /
## НЕ ПРОВЕРЕНО (each with the exact closing command) / ## Коммит / ## Долг
`;

const REWORK_RULES = `
═══ THIS IS A REWORK PACKET. READ THIS SECTION TWICE. ═══
A previous agent already built this fix and committed it. An adversarial reviewer then returned
**NEEDS_REWORK** with a specific, numbered list of required changes. **THE REVIEW FILE IS YOUR
SPECIFICATION.** Read it COMPLETE before touching anything.

Rules specific to rework:
1. **Do not start over.** The existing commits are on a pushed branch. You are amending behaviour
   forward with new commits, never rewriting history, never reverting the prior work wholesale.
2. **Close every BLOCKING item.** Optional/nit items: close them if cheap, otherwise declare them as
   debt explicitly in your handoff. Silence is not an option — every numbered item must be addressed
   in your report as CLOSED, DECLARED DEBT, or DISPUTED.
3. **You may DISPUTE a reviewer item — but only with evidence.** If the reviewer is wrong, say so and
   prove it with a command and its output, or a file:line. "I disagree" without evidence is a failed
   packet. The reviewer is evidence, not authority; so are you. The lead decides.
4. **Correct any false claim in the prior handoff.** Reviewers found handoffs asserting things that
   were not true. If your packet's handoff contains a false statement, fix the words as well as the
   code, and say in your report exactly which sentence was wrong and why.
5. **The reviewer's own new findings (often labelled F1/F2/…) count.** HIGH-severity ones must be
   closed or explicitly declared as debt with a reason.
6. Re-prove what you changed. A rework that lands without executing the test the reviewer asked for is
   the same failure again.
`;

const PACKETS = [
	{
		id: "R1-dictation-rework",
		label: "R1 dictation rework",
		wave: 1,
		rework: ".agents/archon/packets/C4-dictation-lost/review.md",
		dir: ".agents/archon/packets/R1-dictation-rework",
		files:
			"the speech persistence module touched by C4 (read its handoff.md for the exact paths) + its node:test",
		gate: "npm run typecheck -w @dental/api",
		brief: `
PACKET R1 — REWORK OF C4 (dictation transcripts lost on restart). Lane: CLINICAL.
Read .agents/CLINICAL_RULES.md and the speech-gateway section of .agents/ARCHITECTURE.md COMPLETE.

**YOUR SPECIFICATION: .agents/archon/packets/C4-dictation-lost/review.md — read it COMPLETE.**
Also read .agents/archon/packets/C4-dictation-lost/handoff.md and state.md to know what was built and
which files it touched.

The reviewer returned NEEDS_REWORK with 7 numbered items, 2 of them BLOCKING. Summarised, but the
review file is authoritative and more precise:
1. **BLOCKING** — 'persistSpeechRecording' overwrites the durable envelope from a cache that eviction
   is allowed to truncate. It must MERGE with the stored envelope before writing. As it stands,
   dictated medical text can still be destroyed — which is the very defect C4 existed to fix.
2. **BLOCKING** — handoff.md:144-147 asserts «Текст не уничтожен». **That is false and the reviewer has
   the run output proving it.** Correct the words as well as the code.
3. Move the 'speech-recording://' prefix filter into the restore WHERE clause so foreign
   'voice_transcription' rows cannot consume the LIMIT.
4. Make restore retryable — reset 'speechRestorePromise' to null on failure with backoff, instead of
   memoising a resolved failure for the whole process lifetime.
5. Set 'confidence' explicitly on INSERT (or stop writing the column) so an unknown confidence stops
   being reported as 0. (A fabricated 0 for an unknown value is a §1 violation — see the '+null ₽'
   lineage.)
6. Declare the unbounded-RAM-when-Postgres-is-down trade in НЕ ПРОВЕРЕНО, and EXECUTE that path.
7. Scope the restore query by organization, or state precisely why a global cross-tenant cache is
   acceptable. A cross-tenant transcript cache in a medical product needs an explicit argument.

Item 1 is the whole packet. Do not let the second attempt also ship a path that loses medical text.
PROOF EXPECTED: UNIT VERIFIED on the merge path (write, evict, persist again, read back — the text
survives), on the retry path, and on the organization scoping. DB VERIFIED with a SQL read.
TYPECHECK VERIFIED. Quote the reviewer's failing scenario and show it now passes.
`,
	},
	{
		id: "R2-panoramic-rework",
		label: "R2 panoramic rework",
		wave: 1,
		rework: ".agents/archon/packets/C5-panoramic-fake-spline/review.md",
		dir: ".agents/archon/packets/R2-panoramic-rework",
		files:
			"the panoramic geometry module and Cornerstone3DViewer.tsx touched by C5 (see its handoff.md) + its node:test",
		gate: "npm run typecheck -w @dental/web",
		brief: `
PACKET R2 — REWORK OF C5 (panoramic reconstruction built from a fake spline). Lane: IMAGING.
Read .agents/UI_STANDARDS.md COMPLETE.

**YOUR SPECIFICATION: .agents/archon/packets/C5-panoramic-fake-spline/review.md — read it COMPLETE.**
Also read that packet's handoff.md and state.md.

The reviewer called it "the most honest packet" — every claimed proof reproduced — and STILL returned
NEEDS_REWORK, because it found two HIGH new defects that make the fix fail on real data. The review's
PART 4 and PART 5 are authoritative; summarised:

- **F1 (HIGH) — the closed contour is declared and then ignored, so the panorama grows a fake tail.**
  Handle 'data.contour.closed': either drop the wrap-around segment before resampling (find the closing
  run and cut it), or refuse closed polylines and fall back to Catmull-Rom over the control points,
  which is open by construction and already correct. **Add a test with 'closed: true' and a polyline
  that returns to its start; assert the reconstruction contains no return sweep and that 'lengthMm'
  matches the open arch.**
- **F2 (HIGH) — 'volume.voxelManager.getScalarData()' throws on every real CBCT volume, and the
  'volume_not_ready' guard is therefore unreachable.** Wrap it in try/catch (or switch to a per-slice
  read that works on cornerstone 5) and route the throw to 'volume_not_ready'. The reviewer's warning
  is explicit: without this, the packet's own closing command cannot pass and the lead will burn a
  session discovering it.
- F3 (LOW) — the success banner is a raw Russian literal in JSX. Put it in the same dictionary as the
  refusal strings.
- F4 (LOW) — the "panorama built" banner survives closing the panorama. Clear 'archSummary' in onClose.
- F5 (LOW, UNPROVEN) — cornerstone may reverse the dentist's points; unwrap handedness is unowned.
  Fix or declare as debt with a reason.
- Also: correct the 'apps/web/node_modules/@cornerstonejs/core/...' citation to the workspace-root path
  (vite/cornerstone are hoisted — the same hoisting bug that killed three smokes in cycle 1).

F1 and F2 must be CLOSED or explicitly DECLARED AS DEBT with a reason — the reviewer notes both are
unstated today, which is the actual failure.
PROOF EXPECTED: UNIT VERIFIED on the closed-contour test the reviewer specified, and on the
getScalarData throw path routing to 'volume_not_ready'. TYPECHECK VERIFIED. Rendered behaviour is NOT
VERIFIED by you — the lead owns screenshots.
`,
	},
	{
		id: "R3-finance-rework",
		label: "R3 finance rework",
		wave: 1,
		rework: ".agents/archon/packets/C6-finance-phantom-amount/review.md",
		dir: ".agents/archon/packets/R3-finance-rework",
		files:
			"usePatientLogic.ts and/or useVisitDiaryLogic.ts and the payment-composer files touched by C6 (see its handoff.md) + tests/paymentComposerReset.test.ts",
		gate: "npm run typecheck -w @dental/web",
		brief: `
PACKET R3 — REWORK OF C6 (payment amount carried onto the next patient). Lane: MONEY.
Read .agents/BILLING_AND_FINANCE.md COMPLETE.

**YOUR SPECIFICATION: .agents/archon/packets/C6-finance-phantom-amount/review.md — read it COMPLETE.**
Also read that packet's handoff.md and state.md.

Context worth knowing: the '3800' prefill the lead spotted on the finance plate turned out to be
already fixed. C6 found the LIVE defect instead — **the amount and the fiscal-receipt fields of one
patient's payment carried over to the NEXT patient** (committed in 8f9243bdd). That is the more serious
bug and the right find. But the fix introduced a regression:

- **BLOCKING 1 — the fix now wipes the money input on MOUNT, not only on a real patient change.**
  Either add a first-run / previous-id ref guard at 'usePatientLogic.ts:219-221', or point
  'useVisitDiaryLogic.ts:27' at 'useAppLogicContext()'. Re-prove with a test that models
  mount-without-change: the existing 'applyPatientSwitches' helper already has the right shape — **a
  mount with the SAME id must yield 0 resets, not 1.** A cashier who has typed an amount and whose
  component remounts must not silently lose it.
- **BLOCKING 2 — correct the reachability section of handoff.md / state.md.** It claims the God Context
  is mounted once for the session; in fact 'useAppLogic()' has **two** call sites. A wrong reachability
  claim is exactly what the reviewer role exists to catch, and it must not survive into the record.
- Nits, close if cheap else declare: make the 'tests/paymentComposerReset.test.ts:218' regex
  whitespace-tolerant; have the post-payment guard assert the reset VALUE, not just the setter name;
  soften the "documentStore has no persist" wording, since 'loadUiPreferences()' does seed
  'paymentMethod'.

Money is exact to the kopeck (§8b). The kopeck migration is partly done —
apps/api/drizzle/0131_payments_amount_kopecks.sql exists and db/moneyTypeParsers.ts registers numeric
parsers — so confirm live types rather than assuming integer roubles.
PROOF EXPECTED: UNIT VERIFIED on both the same-id-mount case (0 resets) and the real-switch case
(reset happens, and no fiscal field survives the switch). TYPECHECK VERIFIED.
`,
	},
	{
		id: "R4-dicom-tenant-leak",
		label: "R4 DICOM cross-tenant leak",
		wave: 2,
		dir: ".agents/archon/packets/R4-dicom-tenant-leak",
		files:
			"apps/api/src/routes/dicomweb.ts + apps/api/src/tests/**/dicomweb.test.ts",
		gate: "npm run typecheck -w @dental/api",
		brief: `
PACKET R4 — THE DICOM ROUTE SERVES ONE STUDY TO EVERY TENANT, INCLUDING TENANTS THAT DO NOT EXIST.
Lane: IMAGING / PLATFORM. Read .agents/ARCHITECTURE.md complete.

THIS IS A CONFIRMED FINDING FROM AN ADVERSARIAL REVIEWER, WITH LIVE PROBES. Read
.agents/archon/packets/C1-dicom-wrong-study/review.md COMPLETE — it is precise and it is your evidence
base. C1 correctly fixed "any UID serves the same file"; it left one branch unguarded:

- **apps/api/src/routes/dicomweb.ts:204-207 (the demo-sample branch) never references organizationId.**
- Reviewer probe G: a SECOND organization's validly-signed token + the sample's true UID triple →
  **200 application/dicom, content-length 121356**, magic bytes "DICM" at offset 128.
- Reviewer probe H: a token carrying '00000000-0000-0000-0000-000000000000' — **a UUID present in no
  'organizations' row at all** → also 200 and the same 121356 bytes. The route never validates that the
  organization id resolves to a real organization.
- It is documented in a comment at dicomweb.ts:137-143 and in C1's debt list, but it was **absent from
  the PROVEN / NOT PROVEN lists**, and brief item 4 required that EVERY query filter by organizationId.

WHAT TO BUILD:
1. Read apps/api/src/routes/dicomweb.ts IN FULL, plus the existing dicomweb.test.ts.
2. Close the hole. The demo sample must be reachable only by an organization that legitimately owns it,
   through the same tenant gate as every real study. **An organization id that resolves to no
   'organizations' row must never be treated as valid anywhere on this route** — check whether that
   weakness is local to this file or lives in the shared guard, and report which. If it is in the shared
   guard (accessGuard.ts / requireOrganizationId), do NOT rewrite the shared guard in this packet —
   report it as the next packet, because it would affect every route at once.
3. SECOND CONFIRMED GAP from the same review: 'requireClinicalReadAccess' — the guard this route
   advertises — **is never exercised by any test or by the live server.** dicomweb.test.ts:41 sets
   DENTE_CLINICAL_ALLOW_UNGUARDED_READS="1" and :42 clears the admin secret, so accessGuard.ts:63
   returns true unconditionally in all 9 tests; apps/api/.env has the same flags. On a server where the
   admin secret IS set, this route answers 403 ClinicalReadSecretRequired to a valid clinic token — a
   path nothing has ever executed. **Add a test that sets the admin secret and exercises both the 403
   and the authorised path.** An untested guard is not a guard.
4. Keep C1's UID-identity verification intact. Do not regress it: an unknown UID must still 404.

PROOF EXPECTED:
- API VERIFIED: sign tokens yourself (TOKEN_SECRET from routes/auth.js) for org A, for org B, and for a
  nonexistent org UUID; show A gets its own study and **B and the nonexistent org now get 403/404, not
  200 with 121356 bytes.** Quote every status.
- UNIT VERIFIED: node:test covering cross-tenant denial, nonexistent-org denial, the clinical-read-guard
  403 path, and the unknown-UID 404. EXECUTE it, quote the pass.
- TYPECHECK VERIFIED: npm run typecheck -w @dental/api
NOTE: the API process on 4100 runs WITHOUT --watch, so it will not pick up your edits. Either prove via
node:test with app.inject(), or label the live-probe items NOT VERIFIED with the exact command. **Do not
restart the shared dev server.**
`,
	},
	{
		id: "R5-telegram-time-bugs",
		label: "R5 telegram digest/schedule/dupes",
		wave: 2,
		dir: ".agents/archon/packets/R5-telegram-time-bugs",
		files:
			"apps/api/src/routes/telegram.ts (2,666 lines — targeted regions) and/or the outbox/digest service that owns the logic, + a node:test",
		gate: "npm run typecheck -w @dental/api",
		brief: `
PACKET R5 — THREE TIME-AND-DELIVERY BUGS THAT EACH REACH A REAL PATIENT'S PHONE.
Lane: COMMS. Read .agents/MESSENGERS.md and .agents/TELEPHONY_AND_PORTAL.md COMPLETE.

THREE DEFECTS (dossier §5.7). They are related but you must pick the ONE with the largest patient
impact, fix it completely, and report the other two precisely for the next packet. Do not half-fix
three things — cycle 2 proved half-closed chains come back as rework.

(a) **Daily-digest dedup is keyed on the UTC date.** The clinic is in Samara, UTC+4. A digest sent at
    02:00 local is stamped with the previous UTC day, so the dedup key collides with yesterday and the
    digest is either suppressed or duplicated depending on the hour. The clinic's timezone must come
    from configuration, not from the server's UTC clock and not from a hardcoded +4.
(b) **An unparseable 'scheduledAt' is treated as DUE.** It fails OPEN: a message whose schedule cannot
    be parsed is sent IMMEDIATELY. For a clinic that means a reminder for next Tuesday arriving now, at
    night. Failing open on an unparseable time is never correct — it must not send, and it must surface.
(c) **A partial "photo + text" delivery is marked wholly failed**, so the retry re-sends both: the
    patient receives the photo, then receives it again. Partial success must be recorded per-part.

ORDER:
1. Read the owning code IN FULL for the region you touch. telegram.ts is 2,666 lines — read the
   targeted region, and find whether the digest/schedule logic actually lives in
   services/communications/** or communicationsOutbox.ts instead. **Note: communicationsOutbox.ts and
   services/communications/dispatchWorker.ts were recently edited by the second author — check
   'git status --porcelain' and if either is dirty, STOP and choose a different one of the three bugs.**
2. Confirm each of (a),(b),(c) at a real file:line before believing the dossier. Write the line numbers
   into state.md. If one is already fixed, say so — that is valuable.
3. Fix ONE completely, with the timezone/config coming from environment or clinic settings (§1: no
   hardcoded +4, no magic offset).
4. Report the other two with exact file:line so the lead can schedule them.

PROOF EXPECTED:
- UNIT VERIFIED: node:test with a fixed clock. For (a) prove a 02:00-local digest dedups against the
  correct LOCAL day across a DST-free UTC+4 offset. For (b) prove an unparseable scheduledAt does NOT
  send and is surfaced. For (c) prove a partial delivery records the delivered part and retries only
  the missing one. EXECUTE it, quote the pass.
- TYPECHECK VERIFIED: npm run typecheck -w @dental/api
- Do NOT send a real Telegram message. If a probe would hit api.telegram.org, do not run it; label it
  NOT VERIFIED with the exact command.
`,
	},
	{
		id: "R6-speech-audio-retention",
		label: "R6 speech cap + undeleted audio",
		wave: 2,
		dir: ".agents/archon/packets/R6-speech-audio-retention",
		files:
			"the AssemblyAI polling module and the provider-deletion path (locate them) + a node:test. NOT db/schema.ts.",
		gate: "npm run typecheck -w @dental/api",
		brief: `
PACKET R6 — LONG DICTATIONS ALWAYS LOSE THEIR RESULT, AND PATIENT AUDIO IS NOT DELETED THOUGH THE
PRODUCT SAYS IT IS. Lane: CLINICAL / PLATFORM. Read the speech-gateway section of
.agents/ARCHITECTURE.md COMPLETE.

TWO DEFECTS (dossier §5.7). The second is the more serious and is the one to close if you must choose:

(a) **AssemblyAI polling is capped at 15 seconds.** A long recording — a full visit dictation — never
    finishes within the cap, so the result is discarded SILENTLY. The doctor sees nothing and no error.
    A timeout that drops medical text without surfacing is worse than a slow one.
(b) **Provider-side audio deletion is not performed, although apps/api/src/routes/system.ts:409 states
    that it is.** That is patient voice recording — medical data — left on a third-party provider while
    the product tells the clinic it was deleted. **A product claiming a deletion it does not perform is
    the same defect class as the fabricated proof this whole campaign exists to remove**, except it is
    also a data-protection problem.

ORDER:
1. FIND both. The dossier gives you system.ts:409 for (b) but no file:line for (a) — search
   apps/api/src/speech/** and the AI/transcription services for the AssemblyAI polling loop and its
   timeout. **Write both exact file:lines into state.md the moment you find them.** If either is
   already fixed, say so loudly and stop on that one.
2. Read the owning module IN FULL.
3. Fix (b) properly: actually call the provider's delete endpoint, handle its failure honestly (a failed
   deletion must be recorded and surfaced, never swallowed), and make system.ts:409's statement true.
   If the provider API genuinely does not support deletion, then the STATEMENT must change — never leave
   the product asserting something false. Say which of the two you did and why.
4. If you also fix (a): the cap must be configurable (§1, no magic 15000), long recordings must be
   allowed to finish, and a genuine timeout must SURFACE rather than silently discard.
5. Do not touch db/schema.ts. If durable retention state needs a column, write the proposal into your
   handoff and report it.
6. Any timer/interval you add needs guaranteed teardown.

PROOF EXPECTED:
- UNIT VERIFIED: node:test with a stubbed provider (do NOT call a real provider and do NOT use a real
  API key). For (b) prove the delete call is issued and that a failed delete is recorded, not swallowed.
  For (a) prove a long job is polled past the old cap and that a real timeout surfaces an error.
  EXECUTE it, quote the pass.
- TYPECHECK VERIFIED: npm run typecheck -w @dental/api
- **NEVER read, echo, log or commit anything from local-secrets/ai.env or .env beyond confirming which
  variable NAMES exist.** Never print a secret value. Never make a live call to a paid provider.
`,
	},
];

const BUILD_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: [
		"packet",
		"status",
		"defectReal",
		"commitHash",
		"filesChanged",
		"proven",
		"notProven",
		"summary",
		"reachability",
		"reworkItems",
		"dossierCorrections",
		"blockers",
		"foundNotFixed",
	],
	properties: {
		packet: { type: "string" },
		status: { enum: ["COMMITTED", "PARTIAL", "BLOCKED", "NO_CHANGE"] },
		defectReal: { type: "boolean" },
		commitHash: { type: "string" },
		filesChanged: { type: "array", items: { type: "string" } },
		proven: {
			type: "array",
			items: { type: "string" },
			description:
				"Each entry MUST begin with a proof label and quote the command and observed output",
		},
		notProven: {
			type: "array",
			items: { type: "string" },
			description: "Each entry MUST carry the exact closing command",
		},
		summary: { type: "string" },
		reachability: {
			type: "string",
			description:
				'Is the fixed code reachable by a real user? Trace the chain, file:line. "Dead code" is a valid answer.',
		},
		reworkItems: {
			type: "array",
			items: { type: "string" },
			description:
				"For a rework packet: EVERY numbered reviewer item, each marked CLOSED / DECLARED DEBT / DISPUTED(with evidence). Empty array for non-rework packets.",
		},
		dossierCorrections: { type: "array", items: { type: "string" } },
		blockers: { type: "array", items: { type: "string" } },
		foundNotFixed: { type: "array", items: { type: "string" } },
	},
};

const REVIEW_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: [
		"packet",
		"verdict",
		"attackSurface",
		"proofAudit",
		"gitHygiene",
		"reasoning",
		"requiredRework",
	],
	properties: {
		packet: { type: "string" },
		verdict: { enum: ["SOUND", "SOUND_WITH_NITS", "NEEDS_REWORK", "REVERT"] },
		attackSurface: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				required: ["hypothesis", "result", "evidence"],
				properties: {
					hypothesis: { type: "string" },
					result: { enum: ["CONFIRMED", "DISPROVED", "UNTESTABLE"] },
					evidence: { type: "string" },
				},
			},
		},
		proofAudit: { type: "string" },
		gitHygiene: { type: "string" },
		reasoning: { type: "string" },
		requiredRework: { type: "array", items: { type: "string" } },
	},
};

function buildStage(p) {
	return agent(
		LAW +
			(p.rework ? REWORK_RULES : "") +
			"\n═══════════════════════════════════════════════════════════════\n" +
			"YOUR PACKET: " +
			p.id +
			"\n" +
			(p.rework
				? "YOUR SPECIFICATION (read COMPLETE, first): " + p.rework + "\n"
				: "") +
			"YOUR FILE CLAIM (edit nothing outside this): " +
			p.files +
			"\n" +
			"YOUR COMPILE GATE: " +
			p.gate +
			"\n" +
			"YOUR PACKET DIRECTORY (create FIRST; state.md, commitmsg.txt, handoff.md here): " +
			p.dir +
			"\n" +
			"═══════════════════════════════════════════════════════════════\n" +
			p.brief +
			"\n═══════════════════════════════════════════════════════════════\n" +
			"ORDER OF OPERATIONS, MANDATORY:\n" +
			" 1. Write " +
			p.dir +
			"/state.md == STARTED. NOW, before reading anything.\n" +
			" 2. Read the authority documents. Complete. state.md == AUTHORITY READ.\n" +
			(p.rework
				? " 2b. Read " +
					p.rework +
					" COMPLETE, plus that packet handoff.md and state.md.\n"
				: "") +
			" 3. git rev-parse HEAD; git status --porcelain on your claimed files. Dirty and not by you =>\n" +
			"    STOP, report a collision.\n" +
			" 4. Read your target file(s) IN FULL. Confirm the defect at real lines.\n" +
			"    state.md == DEFECT CONFIRMED / ABSENT. If absent, say so loudly; do not invent work.\n" +
			" 5. Build the real fix. state.md == EDIT WRITTEN.\n" +
			" 6. Run your compile gate. state.md == GATE PASSED.\n" +
			" 7. **COMMIT NOW** — pathspec form, retry loop, verify git log -1 --stat.\n" +
			"    state.md == COMMITTED <hash>. Do NOT wait for proofs.\n" +
			" 8. Proofs. Second commit for the test. state.md == PROVEN.\n" +
			" 9. Write " +
			p.dir +
			"/handoff.md. state.md == DONE.\n" +
			'10. Emit structured output. Every "proven" entry must be a command you actually ran.\n' +
			(p.rework
				? 'For this rework packet, "reworkItems" MUST list EVERY numbered reviewer item marked\nCLOSED / DECLARED DEBT / DISPUTED(with evidence). An unmentioned item is a failed packet.\n'
				: "") +
			"A packet ending in a plan and no diff is a FAILED packet.\n",
		{ label: p.label, phase: "Build", schema: BUILD_SCHEMA },
	);
}

function reviewStage(built, p) {
	if (!built) {
		return {
			packet: p.id,
			verdict: "NEEDS_REWORK",
			attackSurface: [],
			proofAudit:
				"Builder produced no result — died or out of capacity. Read " +
				p.dir +
				"/state.md.",
			gitHygiene: "unknown",
			reasoning: "No build output.",
			requiredRework: ["Resume " + p.id],
		};
	}
	if (
		built.status === "BLOCKED" ||
		built.status === "NO_CHANGE" ||
		!built.commitHash
	) {
		return {
			packet: p.id,
			verdict: "SOUND_WITH_NITS",
			attackSurface: [],
			proofAudit: "No commit to audit; builder reported " + built.status + ".",
			gitHygiene: "n/a",
			reasoning: built.summary || "",
			requiredRework: built.blockers || [],
		};
	}
	return agent(
		"You are an ADVERSARIAL REVIEWER on the DENTE dental CRM (C:\\Clinic_MVP\\dental-crm), reporting to\n" +
			"lead [ARCHON]. You did NOT write this code. Your job is to DESTROY it, not bless it.\n\n" +
			"Write findings to " +
			p.dir +
			"/review.md AS YOU GO — you may be killed mid-review.\n\n" +
			"THE DISEASE OF THIS CODEBASE IS FABRICATED PROOF. Track record:\n" +
			"- FEATURES_REGISTRY.md cites proof_<name>.png for 49 features; all 49 files do not exist.\n" +
			'- A reviewer certified "56 unique MD5, 0 blank pages" over a set where six "themed" shots were one\n' +
			'  Vite CSS error overlay, on the same pass that screenshotted "+null ₽" as green profit.\n' +
			"- The lead found mobile_light_documents.png is the staff PIN screen, not documents — MD5-unique and\n" +
			"  116 KB, so it passes every hash-and-size rubric. **Hash uniqueness proves nothing about content.**\n" +
			'- In cycle 2 a reviewer caught a handoff asserting "текст не уничтожен" and produced run output\n' +
			"  proving the opposite. That is the standard. Reproduce claims; do not read them.\n" +
			"Default posture: disbelief.\n\n" +
			"Read .agents/AGENTS.md COMPLETE plus .agents/INDEX.md. Do NOT penalise the builder for defying §11\n" +
			"(madge absent) or the biome orders (absent; would reformat the repo).\n\n" +
			(p.rework
				? "THIS IS A REWORK PACKET. Its specification was " +
					p.rework +
					" — READ THAT FILE\nCOMPLETE, then verify item by item that each numbered requirement is genuinely CLOSED, honestly\nDECLARED AS DEBT, or DISPUTED WITH REAL EVIDENCE. **A reviewer item silently ignored is an automatic\nNEEDS_REWORK.** Also verify the builder corrected any false statement in the previous handoff — a\nwrong claim left in the record is the defect this role exists to stop.\n\n"
				: "") +
			"THE PACKET: " +
			p.id +
			"\n" +
			"CLAIMED SCOPE: " +
			p.files +
			"\n" +
			"COMMIT TO ATTACK: " +
			built.commitHash +
			"\n" +
			"FILES CHANGED: " +
			JSON.stringify(built.filesChanged) +
			"\n" +
			"CLAIMED PROVEN: " +
			JSON.stringify(built.proven) +
			"\n" +
			"CLAIMED NOT PROVEN: " +
			JSON.stringify(built.notProven) +
			"\n" +
			"REACHABILITY CLAIM: " +
			(built.reachability || "(none)") +
			"\n" +
			"REWORK ITEM DISPOSITION: " +
			JSON.stringify(built.reworkItems || []) +
			"\n" +
			"SUMMARY: " +
			built.summary +
			"\n" +
			"ORIGINAL BRIEF:\n" +
			p.brief +
			"\n\n" +
			"DO THIS:\n" +
			"1. git show " +
			built.commitHash +
			" --stat, then the full diff, then open the changed files at\n" +
			"   HEAD and read them in context. A diff hides what surrounds it.\n" +
			"2. FALSIFIABLE HYPOTHESES YOU MUST ACTUALLY TEST:\n" +
			"   - Was the defect REAL before this commit? (git show " +
			built.commitHash +
			"^:<path>)\n" +
			"   - **Is the fix REACHABLE by a real user, or dead code sold as a product fix?** Verify the\n" +
			"     builder claim independently; trace the chain yourself and say where it terminates.\n" +
			"   - Does it hold on REAL data, not just on the test fixture? Cycle 2 shipped a panorama fix that\n" +
			"     passed every test and threw on every real CBCT volume one line later. Look for that shape.\n" +
			"   - HOLLOW FACADE — {success:true} over a no-op, placeholder, magic constant, hardcoded\n" +
			"     UUID/port/endpoint, or a fabricated 0/default standing in for an unknown value?\n" +
			"   - SECOND OWNER of something that already had one?\n" +
			"   - Deleted/renamed a useAppLogic.tsx return field? (Breaks 50+ files.)\n" +
			"   - Listener/interval/subscription/file handle without guaranteed teardown?\n" +
			"   - Hardcoded hex, static px where a relative unit belongs, new hardcoded Russian literal with\n" +
			"     the i18n debt undeclared?\n" +
			"   - Is any Russian text in the diff or subject MOJIBAKE? Check the characters.\n" +
			"   - **If the packet deleted a file: does anything still reference it at HEAD?**\n" +
			'     git grep -n "<BaseName>" HEAD -- apps/ . This broke HEAD twice in cycle 1.\n' +
			"3. PROOF AUDIT — the part that matters most. RE-RUN EVERY CLAIMED PROOF COMMAND YOURSELF. Not a\n" +
			"   similar one. The same one. Capture the TRUE exit code (not $? after a pipe). Does the output\n" +
			"   support the claim or merely coexist with it? Judge only errors inside the claimed scope.\n" +
			"4. GIT HYGIENE: ONLY the claimed files? Any churn (apps/api/dist/**, apps/api/.data/*.json,\n" +
			"   tsbuildinfo, scratch/**) or another author work swept in via the shared index? Conventional\n" +
			"   Commits with a Russian subject naming the DEFECT?\n" +
			"5. VERDICT. Reserve REVERT for a change actively worse than the defect. Never award SOUND to a\n" +
			"   change whose central claim you could not reproduce. If you return NEEDS_REWORK, your\n" +
			"   requiredRework list must be numbered, specific, and actionable — the next agent builds from it.\n\n" +
			"CONSTRAINTS: read-only on source — no edit, fix, commit, revert, git add. Never git remote -v\n" +
			"(live tokens). Never npx @biomejs/biome. Do not start a server or screenshot pipeline, and do not\n" +
			"restart the shared dev server. You MAY run typechecks, tests, smokes, read-only node -e, curl to\n" +
			"127.0.0.1:4100, read-only SQL to 5432.",
		{ label: "attack:" + p.id, phase: "Attack", schema: REVIEW_SCHEMA },
	);
}

const all = [];
for (const waveNo of [1, 2]) {
	const wave = PACKETS.filter((p) => p.wave === waveNo);
	log("Cycle 3 wave " + waveNo + ": " + wave.map((p) => p.id).join(", "));
	const done = await pipeline(wave, buildStage, reviewStage);
	for (let i = 0; i < wave.length; i++)
		all.push({ packet: wave[i].id, dir: wave[i].dir, review: done[i] || null });
	log("Cycle 3 wave " + waveNo + " complete.");
}
return { cycle: 3, results: all }
