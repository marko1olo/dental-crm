export const meta = {
  name: 'archon-cycle-10',
  description: 'DENTE cycle 10 (money): float equality blocks a receipt, the contract rejects kopecks in 38 of 45 fields, the tax total is a float reduce',
  phases: [
    { title: 'Build', detail: 'exact kopecks on the receipt gate, the shared contract, and the document path' },
    { title: 'Attack', detail: 'a different agent tries to destroy each commit; a tolerance that hides a real mismatch is REVERT-grade' },
  ],
}

const LAW = `
You are an implementer on the DENTE dental CRM under lead [ARCHON]. Repo root: C:\\Clinic_MVP\\dental-crm
(branch main). Two other fleet agents work this tree concurrently. Stay inside your claim.

═══ A SECOND, NON-FLEET AUTHOR COMMITS TO THIS BRANCH ═══
Concentrated in apps/web/src/SettingsView.tsx, components/settings/**, components/communications/**,
App.tsx, MarketingView.tsx, VisitView.tsx, apps/api/src/server.ts. DO NOT EDIT THOSE unless your packet
names them. HEAD moves under you — re-read it, never reason from a remembered hash. If a claimed file is
dirty and you did not dirty it, STOP and report a collision. Do not revert or "fix" it.

═══ THE #1 TRAP: THE GIT INDEX IS SHARED GLOBAL STATE ═══
A bare 'git commit' commits EVERYTHING staged, including another agent's 'git add'/'git rm'. In cycle 1
this happened three times and twice left HEAD unable to compile. Cycles 2-3 had zero incidents because
of this rule:
    for i in 1 2 3 4 5 6 7 8 9 10; do git commit -F <msgfile> -- <explicit paths> && break || sleep 4; done
The '--' and path list are MANDATORY. 'git rm' stages instantly. Run 'git diff --cached --name-only'
before committing; if files you do not own are staged, do NOT unstage or reset — commit with your
pathspec and report it. If your packet DELETES a file, verify afterwards that
'git grep -n "<BaseName>" HEAD -- apps/' returns nothing.

═══ DURABILITY — YOU MAY DIE MID-TASK. THREE AGENTS DID IN CYCLE 1. ═══
**NOTHING MAY EXIST ONLY IN YOUR HEAD OR ONLY IN YOUR FINAL MESSAGE.**
1. FIRST ACTION, before reading anything: create your packet dir and write 'state.md'. Update at every
   milestone: STARTED -> AUTHORITY READ -> DEFECT CONFIRMED/ABSENT -> EDIT WRITTEN -> GATE PASSED ->
   COMMITTED <hash> -> PROVEN -> DONE. Before any SLOW command, write what you are about to run.
2. **COMMIT AS SOON AS THE CODE IS RIGHT AND THE GATE IS GREEN — BEFORE THE PROOFS.**
3. Never leave the tree dirty at a stopping point you control. 'git stash' is BANNED.
4. If throttled, stop expanding scope, commit the coherent part, write an openly partial handoff.

═══ READ FIRST, COMPLETE ═══
.agents/AGENTS.md (constitution, 12 mandates), .agents/INDEX.md, plus the domain doc your packet names.
Reference: .agents/archon/RECON_DOSSIER.md, VISUAL_VERDICT.md, progress.md. CONFIRM EVERY CITED LINE.
**The dossier has already been caught being wrong once** (cycle 3 proved it invented a Telegram UTC
digest key that does not exist in the live path). If it is wrong, the DOSSIER gets fixed, not the code —
report it and keep going.

═══ AUTHORITY FILES KNOWN-WRONG ═══
§11 claims madge is installed — it is not on PATH, never a blocker. Three docs order
'npx @biomejs/biome check --write .' — **NEVER RUN IT**, not installed, would reformat the repo root.
§2 names write_to_file/replace_file_content (Gemini tools you lack); binding intent: never write Russian
text via shell here-string or node -e, use your Write/Edit tools. .agents/DATABASE.md and AGENTS.md:7
were corrected in 8c87dcd93 and are now trustworthy: native PostgreSQL 18 at 127.0.0.1:5432.

═══ ENVIRONMENT ═══
- apps/api = Fastify+Drizzle+pg over PostgreSQL 18 at 127.0.0.1:5432. apps/web = React 19.2 + Vite 6 +
  Tailwind v4 (CSS-first, NO tailwind.config) + Zustand 5.
- **DEV SERVER ALREADY RUNNING AND SHARED.** API 127.0.0.1:4100 (health = /api/health). Web 5173.
  **Do NOT run 'npm run dev', do not start a second server, do not run a screenshot pipeline, and DO NOT
  RESTART THE SHARED SERVER.** It runs WITHOUT --watch, so it does NOT pick up your source edits: if a
  live probe needs your new code, prove it with node:test + app.inject() instead, or label the probe
  NOT VERIFIED with the exact command.
- Gates: 'npm run typecheck -w @dental/api' | '-w @dental/web' | 'node --import tsx --test <file>'
  (one file, fast, preferred) | 'npm test -w @dental/api' (844 tests, ~20 s).
  A typecheck error outside your claim is another agent's in-flight edit. Note it, move on.
- node:test via tsx. **Vitest NOT installed** (fake shim in types/modules.d.ts). **Playwright has no
  config and zero .spec files.** Never write a playwright or vitest test.
- 'apps/api/dist/**' is TRACKED and dirty from reviewers' builds. Generated — NEVER stage it.
- API auth: (a) import { TOKEN_SECRET } from "../routes/auth.js"; signToken({organizationId},
  TOKEN_SECRET()) as header x-dente-clinic-token (2-segment HMAC, NOT JWT); (b)
  DENTE_DEV_ALLOW_HEADER_ORG="1" + x-organization-id (dev-only by construction).
- Global pre-commit hook (core.hooksPath=C:/Users/Admin/.git-hooks) runs gitleaks. Read it if it rejects.

═══ ZERO MOCKS (§2) ═══
NO boilerplate, placeholders, // TODO, mock interfaces, UI placeholder data. Every line
production-ready. Only escape hatch: A SMALLER THING THAT FULLY WORKS plus an honest BLOCKER. Never a
facade returning {success:true}. This repo does not mark its stubs — find them by BEHAVIOUR.

═══ ANTI-HARDCODE (§1, §13) ═══
No ports, endpoints, credentials, magic strings, tenant UUIDs or config in code. .env + TS interfaces.
**Never substitute a fabricated 0, constant, or default for an unknown value.**

═══ READ BEFORE WRITE ═══
Read your target IN FULL before editing. Targeted-region exception only for the monoliths: main.css
(16,895), useAppLogic.tsx (14,425), shared/src/index.ts (8,163), routes/imaging.ts (6,740),
AppHelpers.tsx (6,066), DocumentsView.tsx (5,053), App.tsx (4,774), db/schema.ts (2,505), sampleData.ts.

═══ BANNED ═══
NO 'node -e' that WRITES a file. NO PowerShell here-strings with Russian text. NO regex file surgery. NO
fs-scripts. NO repo-wide 'sg -r'. (One such script destroyed 10,554 Cyrillic characters here.) Editor
tools ONLY; 'node -e' fine READ-ONLY; 'sg' SEARCH (npx @ast-grep/cli) preferred over regex.
NO 'git remote -v' ever — **remote URLs contain live plaintext access tokens.** No 'git push' (lead
only). No 'git stash'. No 'git add .' / '-A' / 'commit -a'.
NEVER stage apps/api/dist/**, apps/api/.data/*.json, apps/web/tsconfig.tsbuildinfo, scratch/**.
Do not delete or rename any useAppLogic.tsx return field (949 fields; breaks 50+ files).
**NEVER read, echo, log or commit anything from local-secrets/ai.env or .env beyond confirming which
variable NAMES exist. Never print a secret value. Never call a paid provider for real.**

═══ UI STANDARDS if you touch .tsx/.css ═══
Tailwind over inline styles. TOKENS, NEVER STATIC HEX — palette styles/dente-redesign.css:11-161 across
[data-theme=light|dark|night]; 'dark:' wired to data-theme via @custom-variant, night inherits dark.
Relative units; px only for hairlines. Layouts must survive Russian expansion of 30-50%.
i18n: no library exists; route new user-facing text through an existing dictionary
(workspaceUiLabels.ts, imagingUiLabels.ts, pricelistUiMeta.ts) or STATE PLAINLY that you added debt.

═══ COMMIT MESSAGE ═══
Write to '<packet dir>/commitmsg.txt' with your Write tool (UTF-8, no BOM). NEVER pass Russian text
through 'git commit -m'. Conventional Commits, RUSSIAN scope and subject naming THE DEFECT not the
activity, prefixed '[ARCHON] '. Body explains WHY. Voice from HEAD:
    fix(снимки): образец DICOM уходил чужой и несуществующей организации
    fix(касса): открытие вкладки дневника стирало набранную сумму и фискальный блок
BANNED words: improve, enhance, update, cleanup, refactor for clarity.
VERIFY with 'git log -1 --stat': hash, Russian subject intact (not mojibake), ONLY your files.

═══ PROOF LANGUAGE ═══
  TYPECHECK VERIFIED - exit 0. Proves only that you did not break the build. Never alone.
  UNIT VERIFIED      - node:test asserting the new logic, EXECUTED, pass output quoted.
  API VERIFIED       - real HTTP call to 127.0.0.1:4100 with a real token; status + body quoted.
  DB VERIFIED        - SQL read against 127.0.0.1:5432 showing the row actually changed.
  SMOKE VERIFIED     - named smoke exited 0, output quoted.
  UI VERIFIED        - reserved to the lead. You may NOT claim it.
  NOT VERIFIED       - with the EXACT command that would close it.
If label and evidence disagree, use the LOWER claim. Capture TRUE exit codes, not $? after a pipe.
**Reviewers in cycles 2 and 3 caught handoffs asserting things that were false, with run output proving
it. They also caught a claim measured against a curve the packet itself proved impossible.** Downgrade
your own claims before a reviewer does. Unproven code is authorised. UNPROVEN CLAIMS ARE NOT.

═══ TWO STRIKES ═══
Same failure twice? STOP. Do not add wrapper glue or another checker over the same failure. Report it
and say what you would change instead. **The lead has already invoked this rule once tonight** — the
dictation merge logic failed twice, so cycle 4 attacks its root cause instead of patching it a third
time. Do the same inside your own packet.

═══ FILES YOU MUST LEAVE ON DISK ═══
  <packet dir>/state.md, commitmsg.txt, handoff.md
handoff.md: HEAD: <hash> / ## Что было сломано (file:line) / ## Что изменено / ## ПРОВЕРЕНО /
## НЕ ПРОВЕРЕНО (each with the exact closing command) / ## Коммит / ## Долг
`


const CYCLE5_CORRECTIONS = `
═══ CORRECTIONS TO THE TEXT ABOVE — CYCLE 5. THESE OVERRIDE IT. ═══
1. **apps/api/dist is NO LONGER TRACKED** (149 files untracked in 589d63a4d). It still exists on disk.
   Never stage it. You may now run 'npm run build -w @dental/api' freely as proof — it produces ZERO
   git churn. Earlier cycles could not, which is why builds were avoided.
2. **The dev server DOES run with watch.** apps/api/package.json declares "dev": "tsx watch
   src/server.ts" and Launcher.ps1:272 runs it. Earlier briefs said the opposite — that was the lead's
   error and it wrongly told agents an API proof was unavailable. **API VERIFIED against
   127.0.0.1:4100 IS available to you.** Use it. Still do not restart the shared server.
3. **'npm run typecheck -w @dental/web' currently reports 6 PRE-EXISTING errors**, all
   'Cannot find name AnamnesisField' in apps/web/src/DocumentsView.tsx. They belong to the SECOND,
   NON-FLEET AUTHOR's uncommitted refactor (79 insertions, file is dirty). **At HEAD the symbol is not
   used at all, so HEAD is clean.** These are NOT yours. Do not fix them, do not touch DocumentsView.tsx,
   do not report them as your breakage. Judge yourself only on errors inside your claimed files.
4. **A guard's presence is decided in the HANDLER BODY, never at the route registration line.** The lead
   diagnosed auth from an 'app.post(...)' line and was wrong. If your packet touches authorisation, read
   the handler.
5. **SPEECH/DICTATION AND TELEGRAM ARE FROZEN THIS CYCLE.** Those areas failed review across five and
   two packets respectively; their residue is recorded as debt, not patched again. Do not edit
   apps/api/src/speech/**, apps/api/src/routes/speech.ts, or apps/api/src/routes/telegram.ts.
`

const CYCLE7_CORRECTIONS = `
═══ EXPLICIT SUPERSESSIONS — THE TEXT ABOVE ACCUMULATED STALE LINES ACROSS CYCLES. ═══
This preamble is reused verbatim each cycle and has picked up statements that are now WRONG. Where the
text above conflicts with anything below, BELOW WINS. Specifically dead now:
- "You may now run 'npm run build -w @dental/api' freely as proof" — **NO. Superseded by §7a below.**
  Builds are a shared-state gate and belong to the lead.
- "Gates: 'npm run typecheck -w @dental/api' | '-w @dental/web' | 'npm test -w @dental/api'" listed as
  yours — **NO. Superseded by §7a below.** Only 'node --import tsx --test <one file>' is yours.
- "'npm run typecheck -w @dental/web' currently reports 6 PRE-EXISTING errors ... AnamnesisField" —
  **STALE. Those were fixed; both gates were GREEN at this cycle's dispatch.** If you see typecheck
  errors reported to you, treat them as live, not pre-existing.

═══ §7a GATE DISCIPLINE — ONE WRITER PER GATE. READ THIS BEFORE ANYTHING ELSE. ═══
The constitution was amended mid-campaign (.agents/AGENTS.md §7a) and it binds you:
**'npm run typecheck', 'npm run build', migrations, seeds and Playwright runs all touch SHARED state** —
'dist/', 'apps/web/tsconfig.tsbuildinfo', generated 'packages/shared/dist/', and the single live
PostgreSQL 18 on 127.0.0.1:5432. **One agent at a time on any of those.** Read-only 'rg'/'fd'/'sg'/'jq'
parallelises freely.

The lead has been violating this: three agents per wave were running 'npm run typecheck -w @dental/web'
concurrently, and that command WRITES 'apps/web/tsconfig.tsbuildinfo'. Corrected for this cycle:

- **DO NOT RUN 'npm run typecheck'. DO NOT RUN 'npm run build'. DO NOT RUN 'npm test' (whole workspace).**
  DO NOT run migrations or seeds. The LEAD owns those gates and runs them serially at wave end.
- **You DO run your own single test file**, which touches no shared build state:
      node --import tsx --test <path to your one test file>
  That is your compile-and-behaviour signal. Quote its true exit code and counts.
- **If your packet genuinely requires a build, a migration, or the whole suite, say so in 'blockers' and
  STOP at that point.** The lead grants exclusive scope and runs it. Do not take the gate yourself
  because you think you are the only one running — you are not.
- 'node scripts/smoke-clinical-mutation-guard.mjs' boots the real app read-only and is safe to run.
  So is 'node scripts/check-css-tokens.mjs' and 'npm run smoke:web-text-encoding'.
- There is NO per-agent database. Never run destructive SQL. Read-only SELECTs against 5432 are fine.

═══ CORRECTIONS + THE DIRECTOR'S STANDING CONSTITUTION — CYCLE 7. THESE OVERRIDE THE TEXT ABOVE. ═══
1. apps/api/dist is NOT tracked; it exists on disk. Never stage it. **A stale dist has hidden four
   defects this campaign**, so if your proof loads 'apps/api/dist/**' the result describes yesterday's
   code — say so and hand the rebuild to the lead rather than building yourself (§7a above).
2. The dev server runs 'tsx watch' and picks up source edits. **API VERIFIED against 127.0.0.1:4100 IS
   available.** Never restart the shared server.
3. A guard is decided in the HANDLER BODY, never at the 'app.post(...)' registration line.
4. SPEECH/DICTATION and TELEGRAM remain FROZEN (5 and 2 failed reviews). Do not edit
   apps/api/src/speech/**, routes/speech.ts, routes/telegram.ts.
5. A behavioural route gate exists: 'node scripts/smoke-clinical-mutation-guard.mjs' boots the real app
   and probes every route without credentials (481 entries, 479 probed). Run it if you touch auth or
   routing. Read its 'payloadBeforeAuthorisation' and 'warnings' sections.

═══ THE DIRECTOR'S CONSTITUTION — BINDING ON EVERY PACKET ═══
**§1 DEPTH, NOT FACADE.** Make it REALLY work, not imitate work. **No stubs.** If you find a
stub/mock/"TODO later", you finish it into a working element — you do not leave a half-product.
"It compiles" is NOT "it works". A feature is done when it actually functions.
**§2 HONESTY.** No optimism, no sugarcoating. Never report "done" without proof (grep/git/a real run).
A login screenshot is not a schedule screenshot. "Committed" without a hash is a lie.
**§3 A RUSSIAN GRANDMOTHER MUST UNDERSTAND IT.** Large clear elements, human language, no jargon.
Errors in human words — not «Internal Server Error» but «Не хватает материала: Карпула Артикаина».
Empty, loading and error states everywhere, each telling the user what to DO next. If the user has to
wonder "what is this and where do I click", that is a failure — simplify.
**§4 NO VISUAL OVERLOAD.** Fit what already exists; do not pile on top. Clean, breathing, nothing
superfluous. Richness of features is NOT a pile of visible buttons — hide depth properly (advanced
under «показать больше»), surface only what is needed. Beautiful AND working, not one at the other's
cost.
**§5 MODULARITY.** Solo dentist / cabinet with nurses / small clinic / normal / serious. **Focus now is
solo and small.** Small practices must NOT see modules, columns and fields they do not need. Everything
through flags/presets/clinicMode, NEVER hardcoded. **ANTI-MONOLITH:** split big files into domain
components, logic in hooks, presentation separate — but the decomposition must be REAL (components
imported and used), not orphaned files.
**§8 EFFORT.** More real work, less documentation and test ceremony. Tests and docs as needed, not for
volume. Do not spread thin: finish what you started and commit it.
**§10 SAFETY.** No fs-scripts / node -e writes / regex replacement across files — direct editing only.
No rm -rf on code folders; broke a file → 'git checkout' THAT file. **Do not invent backend contracts,
DB schemas, fields or role policies — what does not exist you record as debt with a reason, you do not
fantasise.** Changing a shared/API contract means updating all sides synchronously.
**§11 RUSSIAN, UTF-8, no mojibake.** Verify with 'npm run smoke:web-text-encoding' (currently green:
0 mojibake hits).

**SELF-CHECK BEFORE YOU SAY DONE — every "no" means not done:**
1. Does it really work, or only compile? 2. Any stub left? 3. Would a grandmother cope?
4. Did I overload the screen? 5. Does a small practice avoid seeing the extra?
6. Grep confirms the edit is in the file? 7. Committed, with a hash, nothing of others' touched?
8. Did I keep the green green? 9. Is the report honest, no gloss?
`

const CYCLE10_DELTA = `
═══ CYCLE 10 DELTA — THIS CYCLE IS ABOUT MONEY, AND THE GROUND HAS MOVED ═══
1. **THE KOPECKS DOSSIER ENTRY WAS FALSE AND IS NOW CORRECTED.** A read-only recon measured the live
   database: **zero integer or float money columns remain.** All 111 'integer' columns are counters,
   optimistic-lock 'version', tooth numbers, minute windows, 'tax_year' and quotas; all 9 'real' columns
   are clinical ('confidence', 'implant_diameter_mm', 'angulation_deg', 'avg_hu_*'). There are no
   'double precision', 'bigint', 'smallint' or PostgreSQL 'money' columns at all. The three tables the old
   audit named are converted. **So the database is NOT the kopecks problem. Do not "fix" it.**
2. **The real kopecks defect is the SHARED CONTRACT.** In 'packages/shared/src/index.ts' (8,236 lines):
   38 of 45 money fields are 'z.number().int()', which **REJECTS** '1500.50' with a validation error — it
   does not round. Only 5 fields use the correct schema. And the correct schema already exists and is
   well built: 'moneyRubSchema' at ':23-25' with 'kopecksAreExact' at ':20-21', which deliberately avoids
   'value % 0.01 === 0' with a comment at ':12-13' explaining why. **The tool is in the box; it is wired
   to five fields.**
3. Both typecheck gates and both suites were green at dispatch, run serially by the lead: api 0 errors /
   996 tests, web 0 errors / 620 tests, encoding 0 mojibake, route gate ok:true over 438 routes with
   'staleOutputCount: 0'. **Do not break the green.**
4. The web typecheck may show errors in 'panelStateText.ts' consumers — another agent is mid-migration of
   the 'PanelSubject'/'PanelText' contract ('title'→'notLoadedTitle', 'retryable'→'retryLabel'). **HEAD
   itself is clean** (the lead verified the committed contract still matches its committed consumers).
   Those errors are NOT yours. Do not touch that file or its consumers.
5. 'apps/api/NUL' has been deleted (94-byte junk named after a Windows reserved device).
   'apps/api/dist' is untracked and freshly built; it is a shared gate, so the LEAD rebuilds it.
6. **There is NO 54-ФЗ fiscal receipt path in this product.** A recon agent established it. So «фискальный
   чек» in this codebase means an internal payment receipt document, not a tax-authority fiscal receipt.
   Do not invent an OFD integration; if a finding needs one, record it as debt.
`

const PACKETS = [
  {
    id: 'Z1-float-gates-receipt',
    label: 'Z1 float equality blocks a receipt',
    dir: '.agents/archon/packets/Z1-float-gates-receipt',
    files: 'apps/api/src/documents/renderDocument.ts (the money comparison sites only) + its node:test. Do NOT touch packages/shared/src/index.ts — packet Z2 owns it.',
    gate: 'node --import tsx --test on your own test file, plus read-only SQL. NEVER npm run typecheck/build/test (§7a).',
    brief: `
PACKET Z1 — A CLINIC THAT TOOK TWENTY PAYMENTS OF 55.55 ₽ CANNOT ISSUE THE RECEIPT FOR 1111 ₽, AND
CANNOT REFUND IT EITHER. Lane: MONEY. Read .agents/BILLING_AND_FINANCE.md and
.agents/DOCUMENTS_LIFECYCLE.md COMPLETE.

THE DEFECT, verified by the lead by reading the lines and running the arithmetic itself:

'apps/api/src/documents/renderDocument.ts:1261-1263', inside 'paymentReceiptSelectionBlockReason':
    const actualTotalRub = selectedPayments.reduce((total, payment) => total + payment.amountRub, 0);
    if (actualTotalRub !== payload.totalPaidRub) {
      return \`Платежная квитанция: сумма \${payload.totalPaidRub} руб. не совпадает с выбранными оплатами \${actualTotalRub} руб.\`;

A **strict float equality** gates the issuing of a payment receipt, and the refusal message
**interpolates the raw float into Russian prose shown to the user.**

Reproduced by the lead:
| payments | float reduce | exact | outcome |
|---|---|---|---|
| 20 × 55.55 | **1110.9999999999995** | 1111 | receipt BLOCKED |
| 10 × 1010.10 | **10101.000000000002** | 10101 | receipt BLOCKED |
| 100.10 + 200.20 + 300.30 | 600.5999999999999 | 600.60 | BLOCKED |

The last two are the vicious ones: the exact total is a whole number, so 'payload.totalPaidRub'
('z.number().int().positive()' at 'index.ts:2953') is perfectly valid — and the receipt is still refused,
with «сумма 1111 руб. не совпадает с выбранными оплатами 1110.9999999999995 руб.» on screen. That is a
money defect (§8b) and a §3 violation (a raw float shown to a human) in one line.

**The same pattern, same file, same function, on the refund cap at ':3865'**:
'refundPayload.amountRub > paidTotalRub', where 'paidTotalRub' is the drifting float reduce at ':3860'.
A refund of the full 1111 ₽ is refused because the sum of its own parts came to 1110.9999999999995.

REACHABILITY, already established — confirm it yourself, do not take it on trust:
'documentIssueBlockReasonRaw' (:3805) calls the receipt check at :3841; 'documentIssueBlockReason' (:3896)
is imported by 'routes/documents.ts:927', 'routes/documents/taxXml.ts:102', 'routes/documents/pdf.ts',
'routes/documents/create.ts' and 'routes/documents/void.ts'. This is live on the document-issuing path.

WHAT TO BUILD:
1. Read 'renderDocument.ts' — it is large, so read the money-comparison regions IN FULL and say which
   regions you read. Then **inventory EVERY monetary comparison and every monetary reduce in the file**,
   with file:line. There are more than the two named; a fix that repairs two and leaves five is the
   half-closed chain this campaign keeps rejecting. **That inventory is half the deliverable.**
2. There is already a correct exact-kopeck money library in this repo, and a recon agent found that only
   **two** production files use it — zero on the frontend, zero on the document paths. **Find it, read it,
   and use it.** Do not write a third money helper: that would be the "second owner" defect. If it
   genuinely lacks what you need, extend it in place and say so.
3. Comparisons must be exact-to-the-kopeck, and sums must be computed in integer kopecks and only then
   presented. Do not paper over it with an epsilon tolerance: a tolerance that accepts 1110.9999999999995
   as 1111 will also accept a genuine one-kopeck discrepancy, and this is the receipt-issuing gate.
   If you believe a tolerance is correct here, you must argue it against that objection explicitly.
4. §3: no error message may ever interpolate a raw float. Money shown to a human is formatted, always.
   Fix the messages you touch, and state whether the copy still tells the user what to DO next.
5. Do NOT touch 'packages/shared/src/index.ts' — packet Z2 owns the contract this cycle. If your fix
   needs a contract change, say so in 'blockers' and coordinate through the lead rather than editing it.

PROOF EXPECTED:
- UNIT VERIFIED, load-bearing: a node:test with the lead's exact drifting sets — 20 × 55.55, 10 × 1010.10,
  and 100.10/200.20/300.30 — asserting the receipt is NOT blocked and the refund of the full amount is
  NOT refused. Then assert a genuine one-kopeck mismatch IS still blocked, because a fix that stops
  blocking everything is not a fix. EXECUTE it and quote the pass.
- The full inventory of monetary comparisons and reduces in the file, with file:line and a verdict each.
- 'leadMustRun' must name the shared gates the lead must run for you.
`,
  },
  {
    id: 'Z2-contract-rejects-kopecks',
    label: 'Z2 contract rejects kopecks in 38 of 45',
    dir: '.agents/archon/packets/Z2-contract-rejects-kopecks',
    files: 'packages/shared/src/index.ts (money field schemas only) + its node:test, plus the minimum API/web sites required to keep both sides in sync. Do NOT touch apps/api/src/documents/renderDocument.ts — packet Z1 owns it.',
    gate: 'node --import tsx --test on your own test file. NEVER npm run typecheck/build/test (§7a) — but note this packet changes a SHARED contract, so name every gate the lead must run.',
    brief: `
PACKET Z2 — THE DATABASE LEARNED KOPECKS AND THE CONTRACT DID NOT FOLLOW. 38 OF 45 MONEY FIELDS REJECT
THEM OUTRIGHT. Lane: MONEY. Read .agents/BILLING_AND_FINANCE.md COMPLETE.

THE SITUATION, measured by a read-only recon and corrected against the stale dossier:
- **The live database is fully converted.** Zero integer or float money columns remain; all 111 'integer'
  columns are counters, versions, tooth numbers, minute windows, 'tax_year' and quotas. **The DB is not
  the problem and must not be "fixed".**
- **The shared contract never followed the migration.** In 'packages/shared/src/index.ts' (8,236 lines):
      38 fields  '\\w*[Rr]ub: z.number().int()'                → REJECT kopecks
       5 fields  'moneyRubSchema' / 'positiveMoneyRubSchema' / 'nonNegativeMoneyRubSchema'
       2 fields  'z.number().nonnegative()' etc.
      45 money fields total
  'z.number().int()' does **not round** '1500.50' — it **fails validation**.
- **The correct schema already exists and is good work:** 'moneyRubSchema' at ':23-25', built on
  'kopecksAreExact' at ':20-21', which deliberately avoids the naive 'value % 0.01 === 0' and carries a
  comment at ':12-13' explaining why. It is wired to exactly five fields: 'basePriceRub' :1645,
  'priceRub' :1734, 'priceMaxRub' :1735, 'paymentSchema.amountRub' :1982,
  'createPaymentSchema.amountRub' :4407.
- **Consequence:** a single payment CAN carry kopecks, and almost nothing downstream of it can. A recon
  agent recorded that the parts and the total therefore use different contracts, so **the total cannot
  equal its parts** — which is exactly the class of defect packet Z1 is fixing on the document side.

WHAT TO BUILD — carefully, because this is a shared contract (§10):
1. **Inventory all 45 money fields first**, with file:line, the current schema, and what the field
   semantically is: a price, a paid amount, a discount, a cap, a threshold, a quota, a whole-rouble
   business rule. **Some of the 38 may be legitimately integer** — a rule like «не более 3 сообщений» or a
   whole-rouble tax threshold is not a kopeck amount. Do NOT convert blindly. The inventory with a
   per-field verdict IS the deliverable's core.
2. For every field that genuinely carries money a patient could pay or be charged, wire the EXISTING
   'moneyRubSchema' family. Do not write a new validator — that is the "second owner" defect this
   campaign keeps rejecting.
3. §10 is explicit: changing a shared contract means updating **all sides synchronously**. A widened
   schema is backward-compatible for readers but every WRITER and every consumer that assumed integers
   must be checked. Find them ('rg' / 'npx @ast-grep/cli') and report the list even for the ones you do
   not need to change. **A contract change that compiles but leaves a consumer assuming integers is the
   defect, not the fix** — and the campaign has a live example: another agent is currently mid-migration
   of the 'PanelSubject' contract with seven consumers not yet updated.
4. Do NOT touch 'renderDocument.ts' (packet Z1 owns it) and do NOT touch 'panelStateText.ts' or its
   consumers (a third agent is mid-flight there).
5. Money is exact to the kopeck (§8b). A field that accepts kopecks must also round-trip them: prove the
   value survives validation, storage and re-read unchanged.

PROOF EXPECTED:
- The 45-field inventory with a per-field verdict: CONVERT / LEAVE INTEGER (with the business reason) /
  ALREADY CORRECT.
- UNIT VERIFIED: a node:test asserting each converted field accepts '1500.50' and rejects genuine
  garbage (a third decimal, a negative where the domain forbids it), and that the fields you left integer
  still reject '1500.50' **deliberately**, with the reason in the test name. EXECUTE it, quote the pass.
- The consumer list for every changed field, even where no change was needed.
- **'leadMustRun' is mandatory here**: this touches 'packages/shared', so the lead must run
  'npm run typecheck' across all three workspaces and both suites. Name the exact commands.
`,
  },
  {
    id: 'Z3-document-money-path',
    label: 'Z3 tax total is a float reduce',
    dir: '.agents/archon/packets/Z3-document-money-path',
    files: 'the tax-certificate total path, the printed money formatter used by legal documents, and the import rounding site (locate all three). Do NOT touch renderDocument.ts (Z1) or packages/shared/src/index.ts (Z2).',
    gate: 'node --import tsx --test on your own test file, plus read-only SQL. NEVER npm run typecheck/build/test (§7a).',
    brief: `
PACKET Z3 — THE TAX CERTIFICATE'S TOTAL IS A FLOAT REDUCE, THE PRINTED FORMATTER CANNOT SHOW KOPECKS
RELIABLY, AND THE IMPORTER THROWS EXACT KOPECKS AWAY ON PURPOSE.
Lane: MONEY / DOCS. Read .agents/DOCUMENTS_LIFECYCLE.md and .agents/BILLING_AND_FINANCE.md COMPLETE.

THREE FINDINGS FROM A READ-ONLY RECON. **Confirm each at its real file:line before believing it** — this
campaign has caught a commit message describing a defect that did not reproduce at its own parent, and a
census that was a regex artefact. The recon dossier is at
'.agents/archon/recon/R4-money-precision/dossier.md' — read findings F11, F12, F13, F14 and F17 COMPLETE;
they carry the commands that produced them.

(a) **F11 — the tax deduction certificate's total is a float reduce, and that is what gets stored and
    printed.** A справка для налогового вычета is a document a patient hands to the tax authority. Its
    total must equal the sum of its lines exactly. A float reduce over line amounts drifts exactly as the
    lead measured elsewhere: 20 × 55.55 → 1110.9999999999995.
(b) **F12 / F14 — the printed money formatter used on legal documents cannot show kopecks reliably; two
    decimals are never guaranteed.** The recon notes the SCREEN formatter was fixed for exactly this bug
    and the LEGAL-DOCUMENT formatter was not. So the same amount can print differently on screen and on
    paper. Find both formatters, read both, and say precisely how they differ.
(c) **F17 — the importer deliberately rounds every payment and every service price to whole roubles,
    having already computed the exact kopecks.** The recon calls this the worst defect for the target
    user, and the reasoning is sound: a small practice migrating from another system loses the kopecks of
    its entire payment history on import, silently, and no later fix can recover them because the exact
    value was computed and then discarded.

WHAT TO BUILD:
1. Confirm all three at real lines and write those lines into 'state.md'. If one does not reproduce, say
   so loudly — a correction is a valid and valuable outcome.
2. **Fix (c) first if it reproduces.** It destroys data, and unlike the other two it is irreversible: the
   exact kopecks are computed and then thrown away, so every day it stays is another clinic's history
   rounded. The other two produce wrong output from data that is still intact.
3. Use the EXISTING exact-kopeck money library — a recon found it is used by only two production files,
   zero on the frontend and zero on the document paths. Find it, read it, use it. Do not write a fourth
   money helper.
4. §3: the printed formatter must produce a value a patient and a tax inspector both read the same way.
   Two decimals when there are kopecks, and a stable form when there are none — decide which and justify
   it against Russian financial-document convention.
5. §10: invent no contract. Do NOT touch 'packages/shared/src/index.ts' (Z2 owns it) or
   'renderDocument.ts' (Z1 owns it). If your fix needs the widened schema from Z2, say so in 'blockers'
   and describe the seam — the lead sequences it.
6. A recon finding worth carrying: there is **no 54-ФЗ fiscal receipt path** in this product, so do not
   invent an OFD integration. «Чек» here is an internal document.

PROOF EXPECTED:
- UNIT VERIFIED: a node:test proving the tax total equals the exact sum of its lines for drifting sets
  (20 × 55.55, 10 × 1010.10), that the printed formatter renders kopecks for a kopeck amount, and that
  the importer preserves an exact kopeck value end to end. EXECUTE it and quote the pass.
- DB VERIFIED where the value is stored: read-only SQL showing the stored total is exact.
- For (c): state plainly how much precision is being lost today, with a number.
- 'leadMustRun' must name the shared gates for the lead.
`,
  },
]

const BUILD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['packet', 'status', 'defectReal', 'commitHash', 'filesChanged', 'proven', 'notProven', 'summary', 'reachability', 'measurements', 'inventories', 'leadMustRun', 'constitutionCheck', 'dossierCorrections', 'blockers', 'foundNotFixed'],
  properties: {
    packet: { type: 'string' },
    status: { enum: ['COMMITTED', 'PARTIAL', 'BLOCKED', 'NO_CHANGE'] },
    defectReal: { type: 'boolean' },
    commitHash: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    proven: { type: 'array', items: { type: 'string' } },
    notProven: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    reachability: { type: 'string', description: 'EVERY link of the call chain, not two of three.' },
    measurements: { type: 'array', items: { type: 'string' }, description: 'Real reproducible numbers with the command that produced them.' },
    inventories: { type: 'array', items: { type: 'string' }, description: 'The inventory your brief demanded, with file:line and a per-item verdict.' },
    leadMustRun: { type: 'array', items: { type: 'string' }, description: 'Exact shared-state commands the LEAD must run under §7a. Mandatory for any shared-contract change.' },
    constitutionCheck: { type: 'array', items: { type: 'string' } },
    dossierCorrections: { type: 'array', items: { type: 'string' } },
    blockers: { type: 'array', items: { type: 'string' } },
    foundNotFixed: { type: 'array', items: { type: 'string' } },
  },
}

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['packet', 'verdict', 'attackSurface', 'proofAudit', 'gitHygiene', 'reasoning', 'requiredRework'],
  properties: {
    packet: { type: 'string' },
    verdict: { enum: ['SOUND', 'SOUND_WITH_NITS', 'NEEDS_REWORK', 'REVERT'] },
    attackSurface: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['hypothesis', 'result', 'evidence'],
        properties: {
          hypothesis: { type: 'string' },
          result: { enum: ['CONFIRMED', 'DISPROVED', 'UNTESTABLE'] },
          evidence: { type: 'string' },
        },
      },
    },
    proofAudit: { type: 'string' },
    gitHygiene: { type: 'string' },
    reasoning: { type: 'string' },
    requiredRework: { type: 'array', items: { type: 'string' } },
  },
}

function buildStage(p) {
  return agent(
    LAW + CYCLE7_CORRECTIONS + CYCLE10_DELTA +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'YOUR PACKET: ' + p.id + '\n' +
    'YOUR ROLE: implementer with file-edit rights, bounded to the claim below (§7a).\n' +
    'WHY THIS IS DELEGATED: the lead verified the defect by hand but not its blast radius, and the\n' +
    'inventory work needs a context of its own.\n' +
    'YOUR FILE CLAIM — OWNED read/edit scope: ' + p.files + '\n' +
    'FORBIDDEN SCOPE: any file not in your claim; apps/api/src/speech/**, routes/speech.ts,\n' +
    'routes/telegram.ts (frozen); components/workspaceActions/** (the corner redesign, do not disturb);\n' +
    'apps/web/src/lib/panelStateText.ts and its consumers (a third agent is mid-migration there); any\n' +
    'file another author has dirty; and every shared gate of §7a.\n' +
    'YOUR OWN SIGNAL (safe, no shared state): ' + p.gate + '\n' +
    'EVIDENCE STANDARD: every "proven" entry is a command you actually ran, with its TRUE exit code and\n' +
    'real output quoted. Your output is EVIDENCE, not authority — the lead re-runs it.\n' +
    'YOUR PACKET DIRECTORY (create FIRST): ' + p.dir + '\n' +
    '═══════════════════════════════════════════════════════════════\n' + p.brief +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'ORDER OF OPERATIONS, MANDATORY:\n' +
    ' 1. Write ' + p.dir + '/state.md == STARTED. NOW, before reading anything.\n' +
    ' 2. Read the authority documents. Complete. state.md == AUTHORITY READ.\n' +
    ' 3. git rev-parse HEAD; git status --porcelain on your claimed files. Dirty and not by you =>\n' +
    '    STOP, report the collision. Several agents and a second non-fleet author work this tree.\n' +
    ' 4. Read your target file(s) IN FULL (targeted region for a monolith, and SAY which region).\n' +
    '    Confirm the defect at real lines. state.md == DEFECT CONFIRMED / ABSENT. If absent, say so\n' +
    '    loudly; never invent work to justify the packet.\n' +
    ' 5. Produce the INVENTORY your brief demands BEFORE changing behaviour. On this cycle the inventory\n' +
    '    is not paperwork: a money fix that repairs two comparison sites and leaves five is the\n' +
    '    half-closed chain the campaign keeps rejecting.\n' +
    ' 6. Build the real fix. No stub, no facade, no half-product (§1). state.md == EDIT WRITTEN.\n' +
    ' 7. Run YOUR OWN signal only (never the shared gates — §7a). state.md == SELF-CHECK PASSED.\n' +
    ' 8. **COMMIT NOW** — pathspec form "git commit -F <msg> -- <paths>", retry loop for .git/index.lock,\n' +
    '    then verify with git log -1 --stat. state.md == COMMITTED <hash>. Do NOT wait for proofs:\n' +
    '    credit exhaustion has killed entire waves here, and an uncommitted edit is lost work that also\n' +
    '    blocks the next agent.\n' +
    ' 9. Proofs. A second commit for the test. state.md == PROVEN.\n' +
    '10. Write ' + p.dir + '/handoff.md. state.md == DONE.\n' +
    '11. Emit structured output, including "inventories", "leadMustRun" and "constitutionCheck".\n' +
    'A packet ending in a plan and no diff is a FAILED packet.\n',
    { label: p.label, phase: 'Build', schema: BUILD_SCHEMA }
  )
}

function reviewStage(built, p) {
  if (!built) {
    return { packet: p.id, verdict: 'NEEDS_REWORK', attackSurface: [], proofAudit: 'Builder produced no result — died or out of capacity. Read ' + p.dir + '/state.md; work may already be committed.', gitHygiene: 'unknown', reasoning: 'No build output.', requiredRework: ['Resume ' + p.id] }
  }
  if (built.status === 'BLOCKED' || built.status === 'NO_CHANGE' || !built.commitHash) {
    return { packet: p.id, verdict: 'SOUND_WITH_NITS', attackSurface: [], proofAudit: 'No commit to audit; builder reported ' + built.status + '.', gitHygiene: 'n/a', reasoning: built.summary || '', requiredRework: built.blockers || [] }
  }
  return agent(
    'You are an ADVERSARIAL REVIEWER on the DENTE dental CRM (C:\\Clinic_MVP\\dental-crm), reporting to\n' +
    'lead [ARCHON]. You did NOT write this code. Your job is to DESTROY it, not bless it.\n' +
    'Write findings to ' + p.dir + '/review.md AS YOU GO — agents die mid-task on this campaign.\n\n' +
    'THIS CYCLE IS MONEY. §8b of the constitution is absolute: money and legal documents are exact to the\n' +
    'kopeck. A money fix that is "close enough" is not a fix, and a tolerance that hides a float drift\n' +
    'will also hide a genuine one-kopeck discrepancy. Attack accordingly.\n\n' +
    'THE DISEASE HERE IS FABRICATED PROOF. The charge sheet, which is your standard:\n' +
    '- 49 cited proof_*.png files that do not exist.\n' +
    '- 14 filenames holding 2 unique images, one a Vite CSS error overlay under ten view names.\n' +
    '- A handoff asserting «текст не уничтожен», refuted by run output.\n' +
    '- A measurement taken against a baseline the packet itself proved impossible.\n' +
    '- A smoke green only because it loaded a dist built BEFORE the fix.\n' +
    '- A commit message describing a defect that does not reproduce at its own parent.\n' +
    '- The lead publishing «45 hollow modules of 50» — a regex artefact.\n' +
    '- A test whose fixtures the same packet had deleted: zero assertions, reported pass.\n' +
    '- A packet that fixed a DEAD FILE and certified it with its strongest reachability label.\n' +
    'Default posture: disbelief. Reproduce claims; never read them. Re-derive every number with a\n' +
    'DIFFERENT instrument than the builder used. Verify EVERY link of any reachability claim.\n\n' +
    'Read .agents/AGENTS.md COMPLETE plus .agents/INDEX.md. Do NOT penalise the builder for defying the\n' +
    'madge order (not installed) or the biome order (not installed). Under §7a the BUILDER was FORBIDDEN\n' +
    'from running typecheck/build/whole-suite — do NOT mark it down for that. YOU may run them, one at a\n' +
    'time. Rebuild before any proof that loads apps/api/dist. Do not apply a migration.\n' +
    'KNOWN, NOT THE BUILDER\'S FAULT: the web typecheck may show errors in panelStateText.ts consumers —\n' +
    'another agent is mid-migration of that contract and HEAD itself is clean.\n\n' +
    'THE PACKET: ' + p.id + '\nCLAIMED SCOPE: ' + p.files + '\nCOMMIT TO ATTACK: ' + built.commitHash + '\n' +
    'FILES CHANGED: ' + JSON.stringify(built.filesChanged) + '\n' +
    'CLAIMED PROVEN: ' + JSON.stringify(built.proven) + '\n' +
    'CLAIMED NOT PROVEN: ' + JSON.stringify(built.notProven) + '\n' +
    'REACHABILITY: ' + (built.reachability || '(none)') + '\n' +
    'MEASUREMENTS: ' + JSON.stringify(built.measurements || []) + '\n' +
    'INVENTORIES: ' + JSON.stringify(built.inventories || []) + '\n' +
    'LEAD MUST RUN: ' + JSON.stringify(built.leadMustRun || []) + '\n' +
    'SUMMARY: ' + built.summary + '\n' +
    'ORIGINAL BRIEF:\n' + p.brief + '\n\n' +
    'DO THIS:\n' +
    '1. git show ' + built.commitHash + ' --stat, then the full diff, then read the changed files at HEAD.\n' +
    '2. HYPOTHESES YOU MUST ACTUALLY TEST:\n' +
    '   - Was the defect REAL before this commit? **Reproduce the drift at the parent** with your own\n' +
    '     arithmetic, not the builder\'s.\n' +
    '   - **Is the fix REACHABLE — every link?** Trace from a real HTTP route to the changed line.\n' +
    '   - **Is the money now EXACT, or merely tolerant?** If the builder introduced an epsilon, prove\n' +
    '     whether a genuine one-kopeck discrepancy still gets caught. If it does not, that is a REVERT-\n' +
    '     grade finding: a receipt gate that accepts a real mismatch is worse than one that blocks a\n' +
    '     valid receipt.\n' +
    '   - **Did it fix every site, or only the named ones?** Re-derive the inventory yourself and compare.\n' +
    '     A partial money fix leaves the total unable to equal its parts, which is the defect.\n' +
    '   - Does any user-facing message still interpolate a raw float or an unformatted number?\n' +
    '   - HOLLOW FACADE, SECOND OWNER (a new money helper beside the existing exact one), a fabricated 0\n' +
    '     or default for an unknown, a hardcoded price, a missing teardown, hardcoded hex/px, an\n' +
    '     undeclared Russian literal, mojibake in the diff or subject?\n' +
    '   - **Do the new tests actually assert?** Check their fixtures exist at HEAD, and check that a test\n' +
    '     claiming to prove exactness would FAIL if the fix were reverted.\n' +
    '   - If the packet changed a SHARED contract: are all sides synchronised? Find a consumer that still\n' +
    '     assumes the old shape.\n' +
    '3. PROOF AUDIT: RE-RUN EVERY CLAIMED PROOF COMMAND YOURSELF, capturing the TRUE exit code.\n' +
    '4. GIT HYGIENE: only the claimed files? Any churn or another author work swept in via the shared\n' +
    '   index? Russian subject naming the DEFECT?\n' +
    '5. VERDICT. Reserve REVERT for a change actively worse than the defect — and on this cycle, a\n' +
    '   tolerance that hides real mismatches qualifies. Never award SOUND to a claim you could not\n' +
    '   reproduce. If NEEDS_REWORK, make requiredRework numbered and actionable.\n\n' +
    'CONSTRAINTS: read-only on source — no edit, fix, commit, revert, git add. Never git remote -v (live\n' +
    'tokens). Never npx @biomejs/biome. Do not start or restart any server. You MAY run typechecks,\n' +
    'builds, tests, smokes, read-only node -e, curl to 127.0.0.1:4100, read-only SQL, and you MAY open\n' +
    'PNG files to judge a visual claim.',
    { label: 'attack:' + p.id, phase: 'Attack', schema: REVIEW_SCHEMA }
  )
}

const all = []
log('Cycle 10 (money): ' + PACKETS.map((p) => p.id).join(', '))
const done = await pipeline(PACKETS, buildStage, reviewStage)
for (let i = 0; i < PACKETS.length; i++) all.push({ packet: PACKETS[i].id, dir: PACKETS[i].dir, review: done[i] || null })
log('Cycle 10 complete.')
return { cycle: 10, results: all }
