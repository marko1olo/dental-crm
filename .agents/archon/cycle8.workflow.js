export const meta = {
  name: 'archon-cycle-8',
  description: 'DENTE cycle 8: REDESIGN the floating corner, clinicMode, orphaned decomposition, human errors, capture theme, auth idioms',
  phases: [
    { title: 'Build', detail: 'redesign what cannot be patched; close four reworks' },
    { title: 'Attack', detail: 'a different agent tries to destroy each commit' },
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

const CYCLE8_DELTA = `
═══ CYCLE 8 DELTA — WHAT CHANGED SINCE THE TEXT ABOVE WAS WRITTEN ═══
1. Both typecheck gates are GREEN at dispatch (lead ran them serially, §7a). 'LazyWorkspaceView' is now
   DERIVED — 'Exclude<AppView,"shift">' in workspaceRouteErrorBoundary.tsx — so a new entry in 'appViews'
   no longer needs a second hand-edited list. **Prefer a derived type over a duplicated list anywhere you
   see one**; a hand-copied union of 'appViews' drifted and broke the web build.
2. 'scripts/test-edge-cases-wave16.mjs' and the 'smoke:wave16' key are DELETED. It demanded non-empty
   arrays from tables with zero rows and zero writers, so it was red by construction, and 'smoke:all'
   silently skipped it because the command started with 'npx tsx' while the filter requires 'node '.
3. **After ANY deletion, check the WHOLE REPO: 'git grep -l "<BaseName>" HEAD -- .'** The lead's earlier
   rule said '-- apps/', and that hole let a dangling import survive in 'scripts/'. Judge only 'docs/'
   and '.agents/' hits as prose.
4. 14 fabricated PNGs were removed from '.dente-redesign-shots/' — 2 unique md5 across 14 filenames, one
   of them a Vite CSS error overlay filed under ten view names. **Consequence: 'schedule', 'shift' and
   'visit' have NO valid desktop capture at all.** Do not cite one.
5. Cycle 7 deleted 19 hollow query modules, 9 hollow widgets and 14 dead routes ('db/*Query.ts' went
   42 → 23), each verified as zero-rows and zero-writers repo-wide. Five hollow modules survive because
   their widgets are still mounted; that is disclosed debt, not a hidden gap.
`

const REWORK_RULES_8 = `
═══ THIS IS A REWORK PACKET. READ TWICE. ═══
A previous agent built this and committed it; an adversarial reviewer returned NEEDS_REWORK with a
numbered list. **THE REVIEW FILE IS YOUR SPECIFICATION.** Read it COMPLETE before touching anything.
1. Do not start over. Prior commits are pushed. Amend behaviour FORWARD with new commits. Never rewrite
   history, never revert the prior work wholesale.
2. **Every numbered item must appear in your report as CLOSED, DECLARED DEBT, or DISPUTED.** Silence on
   an item is an automatic re-fail.
3. You MAY DISPUTE an item — but only with a command and its output, or a file:line. An agent already
   overturned a reviewer this campaign by brace-walking 'main.css' to prove a specificity claim; that is
   the standard. "I disagree" without evidence is a failed packet.
4. **Correct any false claim in the prior handoff or commit message.** You cannot rewrite a pushed
   commit, so state the correction where the claim is READ: in the packet handoff, and tell the lead to
   put it in '.agents/archon/progress.md'.
5. The reviewer's own findings (F1/F2/…) count. HIGH/MEDIUM ones must be closed or declared.
6. Re-run the specific proof the reviewer asked for.
`

const PACKETS = [
  {
    id: 'X1-corner-redesign',
    label: 'X1 REDESIGN the floating corner',
    wave: 1,
    dir: '.agents/archon/packets/X1-corner-redesign',
    files: 'apps/web/src/components/floatingCorner/**, its CSS in apps/web/src/styles/dente-redesign.css (corner region only), the bottom-nav and header components that will host the actions, and the corner tests. NOT App.tsx unless strictly required — check it is clean first.',
    gate: 'node --import tsx --test on your own test file. NEVER npm run typecheck — the lead owns that gate (§7a).',
    brief: `
PACKET X1 — REDESIGN, NOT A FIX. THE FLOATING CORNER'S CENTRAL MECHANISM CANNOT WORK.
Lane: DESIGN SYSTEM / ADAPTIVITY. Read .agents/UI_STANDARDS.md COMPLETE and
.agents/archon/VISUAL_VERDICT.md COMPLETE (§1, §3, §4, addendum A3, B1, B2 all converge here).

**THE LEAD HAS FROZEN THIS AREA TO PATCHING AFTER TWO FAILED PACKETS (U4, then V1).** You are not
authorised to tune the existing mechanism. You are ordered to replace it. Read
'.agents/archon/packets/U4-fab-corner-owner/review.md' and
'.agents/archon/packets/V1-corner-reserve-regression/review.md' COMPLETE — between them they contain
every measurement you need and they are why this packet exists.

WHY THE MECHANISM IS UNFIXABLE — this is arithmetic, not opinion. The current design floats a dock over
the page, samples the DOM for "obstacles", and lifts itself when an obstacle is "sufficiently covered",
where sufficiently means 'CORNER_OBSTACLE_BLOCK_SHARE = 0.5'. For a target of equal height, covered
share is **barWidth / targetWidth**. Therefore:
- ≥0.5 is **structurally unreachable for any target wider than the bar**: above 336 px at 390×844 (bar
  168) and above 556 px at 1600×1100 (bar 278).
- The product's own primary button, 'button.primary-button' «Запись», is **364×44 on four of five
  routes** → maximum share 0.4615 → **permanently un-yieldable.**
- The incoming-call toast ('IncomingCallToast.tsx:67', 'fixed bottom-6 right-6 z-[999999] w-96', a p-5
  column with a header, a caller block and a script list, ≥120 px tall) reaches share 0.089–0.155. It
  would have to be ≤69 px tall to trigger a yield. A reviewer injected its exact geometry live and fired
  the dock's own resize listener: **lift stayed 0.**
- Measured consequence at 1600×1100 on #patients: the dock's own '.omnibar-trigger-btn' covers
  '<label>Email</label>' at 44.3 % and its '<input>' at 24.3 % — both below 0.5, so no yield — and
  **'document.elementFromPoint' at the label's centre returns the dock button.** Clicking the middle of
  the Email label opens the omnibar instead of focusing the field. The pre-packet code lifted 46 px over
  exactly this element; the "fixed" code sits on it.
A threshold that cannot fire on the product's primary button is not a safety mechanism, and no value of
the constant repairs it — the geometry forbids it.

WHAT TO BUILD — remove the class of defect, do not relocate it:
1. **The corner stops floating over content.** Its actions get a real home in the existing chrome:
   - **Narrow screens → the bottom navigation.** It is genuinely the best-composed element in the
     product (5 labelled items, clear active state, large touch targets — see VISUAL_VERDICT §4).
     Protect it: adding to it must not crowd it or break its labels. If five items plus the corner
     actions is too many, the honest answer is «Ещё» carrying the overflow (§4: hide depth properly).
   - **Wide screens → the header.** The header already holds several controls; §4 says do not pile on.
     So group them, do not append: the header's problem is that six controls sit ungrouped
     (VISUAL_VERDICT §3), and this is the chance to give it one owner rather than a seventh sibling.
2. **DELETE the machinery, do not leave it dormant** (§1: no half-products): obstacle sampling, the
   lift, the per-pass geometry read, the coverage threshold, and the reserve padding
   ('--corner-dock-reserve-block' and its consumer). A dead heuristic left in the tree is the next
   agent's trap. Verify with 'git grep -l "<BaseName>" HEAD -- .' over the WHOLE repo — the deletion
   check that only covered 'apps/' let a dangling import survive once already.
3. **Keep what was genuinely won:** V1's removal of the write-before-read in the layout pass, and its
   'getBoundingClientRect' improvement (19.34 → 0.27 ms, reproduced by the reviewer). If your redesign
   removes the layout pass entirely, that win becomes moot — say so rather than claiming it.
4. **The reserve padding must go with it.** Three nested paddings currently stack to 299 px of trailing
   dead space at 390×844 — 35 % of the viewport ('.patients-panel' 20 + '.work-grid' 96 + '.workspace'
   144). Once nothing floats, nothing needs reserving. Measure the trailing dead space after your change
   and report the number.
5. §3: every action that moves must keep a human label. An icon-only button in the bottom nav next to
   five labelled ones is a regression in clarity. §4: nothing new on the surface that was not there
   before — you are MOVING controls, not adding them.
6. Tokens only, no static hex, relative units, light/dark/night, Russian labels expand 30-50 %.
   Guaranteed teardown for every listener/observer you touch or remove.

PROOF EXPECTED:
- UNIT VERIFIED: a node:test over whatever pure placement/ordering logic survives. If the redesign
  removes the logic entirely, then the honest proof is a test asserting the actions are present in the
  bottom nav at narrow and in the header at wide — and say plainly that the old geometry tests were
  deleted with the geometry.
- MEASURED: trailing dead space at 390×844 before and after, in pixels. And confirm with
  'document.elementFromPoint' that no floating element covers '<label>Email</label>' or
  'button.primary-button' at 1600×1100 — that is the exact regression V1 shipped, and the one thing this
  packet must not repeat. 'scratch/probe-corner-reserve.mjs' and 'scratch/probe-corner-obstacles.mjs'
  exist and are read-only against the already-running dev server; reuse them rather than writing new ones.
- TYPECHECK: **NOT yours to run** (§7a). Name the command for the lead.
- The rendered result is NOT VERIFIED by you — the lead owns the capture pipeline and will judge this
  personally at 390×844, 720×1100 and 1600×1100 in light and dark.
`,
  },
  {
    id: 'X2-clinicmode-rework',
    label: 'X2 clinicMode rework',
    wave: 1,
    rework: '.agents/archon/packets/W2-clinicmode-really-hides/review.md',
    dir: '.agents/archon/packets/X2-clinicmode-rework',
    files: 'the clinicMode gating files W2 touched (see its handoff.md) + its tests. NOT App.tsx unless clean and strictly required.',
    gate: 'node --import tsx --test on your own test file. NEVER npm run typecheck — the lead owns that gate (§7a).',
    brief: `
PACKET X2 — REWORK OF W2 (a solo dentist sees a network clinic). §5 IS THE CORE OF THE PRODUCT.
Lane: ADAPTIVITY. Read .agents/UI_STANDARDS.md COMPLETE.
**YOUR SPECIFICATION: .agents/archon/packets/W2-clinicmode-really-hides/review.md — read it COMPLETE**,
plus W2's handoff.md and state.md.

Context that must not be lost: the modularity spine EXISTS — 'clinicMode' appears across many files
including 'store/settingsStore.ts', 'useSettingsDerivations.tsx', the API 'routes/workspaceProfile.ts'
and 'db/domainStateHydration.ts' — but 'settingsStore.ts:158' defaulted it to '"network_clinic"', the
LARGEST mode. The Director's §5 is explicit: the focus is solo and small practices, and **they must not
see modules, columns and fields they do not need**, through flags and presets, never hardcoded.

Work the reviewer's numbered list. Every item CLOSED / DECLARED DEBT / DISPUTED-with-evidence.

The trap to avoid, restated because it is the whole point: **a default of 'solo' that hides nothing is
the same lie in the other direction.** The flag must genuinely control the surface. If the reviewer
found the gating is thinner than W2 claimed, that finding IS the packet — close it by making the flag
real on the surfaces a solo dentist demonstrably does not need (organisational chrome: multi-clinic
selectors, staff management, role chips, anything presupposing colleagues), and **not** by gating
clinical depth. A solo dentist needs every clinical capability; they do not need a second chair.

§4: hiding is not deleting. Depth stays reachable through settings or «показать больше» — it just stops
crowding the default surface. §5: onboarding and settings must really drive it; if the settings UI
cannot change the mode today, wire it or record precisely why not.
§10: do not invent new modes or flags if the existing 'ClinicMode' enum covers it — read the type first.

PROOF EXPECTED:
- UNIT VERIFIED: a node:test where mode 'solo' yields a visible-module list that is a strict subset of
  'network_clinic', with every clinical capability still present. **Print both lists in the test output —
  the two lists ARE the proof**; a green test that prints nothing proves nothing.
- TYPECHECK: not yours (§7a). Name the command.
- Rendered appearance is NOT VERIFIED by you — the lead will capture solo vs network personally.
`,
  },
  {
    id: 'X3-orphan-decomposition',
    label: 'X3 extracted components were dead',
    wave: 1,
    rework: '.agents/archon/packets/W6-monolith-real-split/review.md',
    dir: '.agents/archon/packets/X3-orphan-decomposition',
    files: 'the monolith W6 split and the components it extracted (see W6 handoff.md) + their tests.',
    gate: 'node --import tsx --test on your own test file. NEVER npm run typecheck — the lead owns that gate (§7a).',
    brief: `
PACKET X3 — THE DECOMPOSITION PRODUCED ORPHANS. THAT IS THE ONE FAILURE THE BRIEF EXPLICITLY FORBADE.
Lane: WEB. Read .agents/UI_STANDARDS.md COMPLETE.
**YOUR SPECIFICATION: .agents/archon/packets/W6-monolith-real-split/review.md — read it COMPLETE**, plus
W6's handoff.md and state.md.

W6's own commit records it: «вынесенные формы были мёртвыми». The Director's §5 states the rule the
packet broke, verbatim in intent: big files get split into domain components, logic into hooks,
presentation separate — **but the decomposition must be REAL (components imported and used), not
orphaned files.** An orphaned file is not progress; it is a second copy of the truth that will drift,
exactly like the hand-copied 'appViews' union that broke the web build this cycle, and exactly like
'AppRouter.tsx' — 359 lines of dead code that says so in its own header and hid five unreachable views.

WHAT TO DO:
1. Work the reviewer's numbered list; every item CLOSED / DECLARED DEBT / DISPUTED-with-evidence.
2. For EVERY component W6 extracted, establish which of three states it is in, and say so per file:
   (a) imported and rendered by the parent — genuinely done;
   (b) imported but never rendered — worse than orphaned, because it looks wired;
   (c) not imported at all — orphaned.
   **Every (b) and (c) must end this packet either genuinely used or deleted.** Leaving a file in
   limbo is the defect.
3. Behaviour must not change. This is still a refactor: no new features, no removed features, no altered
   copy. If you find a defect inside, REPORT it, do not fix it here.
4. If an extracted component turns out to have no honest place — because the parent's seam was chosen by
   line count rather than by domain — **delete it and say that the seam was wrong.** That is a better
   outcome than forcing a bad component into use. Then state where the real seam is, for the lead.
5. After any deletion: 'git grep -l "<BaseName>" HEAD -- .' over the WHOLE repo must return nothing
   outside 'docs/' and '.agents/' prose.

PROOF EXPECTED:
- 'git grep' output for EACH extracted component showing both its definition and a real rendering usage.
  That output is the proof; a claim without it is exactly what failed last time.
- Before/after line counts of the parent and each extracted file. Real numbers.
- UNIT VERIFIED where pure logic moved into a hook or helper.
- TYPECHECK: not yours (§7a). Name the command.
`,
  },
  {
    id: 'X4-human-errors-rework',
    label: 'X4 human error text rework',
    wave: 2,
    rework: '.agents/archon/packets/W4-human-error-text/review.md',
    dir: '.agents/archon/packets/X4-human-errors-rework',
    files: 'the error/empty/loading surfaces W4 touched (see its handoff.md) + its tests.',
    gate: 'node --import tsx --test on your own test file. NEVER npm run typecheck — the lead owns that gate (§7a).',
    brief: `
PACKET X4 — REWORK OF W4 (§3: a Russian grandmother must understand every error).
Lane: WEB. Read .agents/UI_STANDARDS.md COMPLETE.
**YOUR SPECIFICATION: .agents/archon/packets/W4-human-error-text/review.md — read it COMPLETE**, plus
W4's handoff.md and state.md.

The Director's §3, in intent: errors in human words — not «Internal Server Error» but «Не хватает
материала: Карпула Артикаина». Empty, loading and error states everywhere, each telling the user **what
to do next**. If the user must wonder "what is this and where do I click", that is a failure.

The standard is already IN the product and you must read it before writing copy:
'components/reports/ManagerReportsPanel.tsx' — honest «—» for unknown, a small-sample statistical
warning, a footnote stating its own method; and the patient-duplicates panel, whose copy reads «Похоже,
у этого пациента есть ещё карточки: 2. Пока карточки не объединены, приёмы, оплаты и снимки разложены по
разным местам, и долг не виден целиком.» — consequence first, no jargon, and actions differentiated by
confidence («Перенести сюда» at 95 %, «Всё равно перенести сюда» at 35 %).

Work every numbered reviewer item: CLOSED / DECLARED DEBT / DISPUTED-with-evidence.
Rules that still bind: **loading ≠ empty-but-fine ≠ failed** — conflating "no data for this period" with
"the request failed" is itself the defect. §4: an empty state is a quiet line plus one action, not a
decorated card. §10: do not invent error semantics the backend does not produce — if the API returns an
opaque failure, say so honestly rather than inventing a cause. §8: five screens genuinely fixed beat
forty touched.

PROOF EXPECTED:
- UNIT VERIFIED: node:test over the pure message-selection functions — a failed fetch, an empty result
  and a loading state must produce three DIFFERENT human strings, and none may contain an English
  exception or a bare status code. EXECUTE it, quote the pass.
- SMOKE VERIFIED: 'npm run smoke:web-text-encoding' exit 0 (it is green; keep it green). That one is
  safe for you to run — it writes no shared build state.
- TYPECHECK: not yours (§7a). Name the command.
`,
  },
  {
    id: 'X5-capture-theme-rework',
    label: 'X5 capture theme rework',
    wave: 2,
    rework: '.agents/archon/packets/W5-capture-theme-assert/review.md',
    dir: '.agents/archon/packets/X5-capture-theme-rework',
    files: 'scripts/ops-panels-shots.mjs, scripts/dente-redesign-shots.mjs and any helper they share.',
    gate: 'node scripts/ops-panels-shots.mjs (read-only against the live pair; safe) + your own MD5 audit of the output',
    brief: `
PACKET X5 — REWORK OF W5 (the capture pipeline filed a night panel as the light theme).
Lane: PROOF. Read .agents/archon/VISUAL_VERDICT.md addendum C COMPLETE — the lead found this personally.
**YOUR SPECIFICATION: .agents/archon/packets/W5-capture-theme-assert/review.md — read it COMPLETE**,
plus W5's handoff.md and state.md.

W5 landed two commits ('f8792f6c9' — the pipeline reported the theme through a dead key;
'59b685f32' — the second pipeline shot without verifying the theme and filed a view that never opened)
and still failed review. Work the reviewer's numbered list.

The original defect, for grounding: 'light_duplicateAlert.png' was **byte-identical** to
'night_duplicateAlert.png' (md5 'bdbf6e8a09e4') while 'dark' differed ('021c73856027'). The lead opened
the night plate — a warm dark olive panel — so the light run rendered night. The palette was never at
fault: 'token-aliases.css:130' '#f7fbf9' light, ':140' '#16211f' dark, ':149' '#1a1714' night, consumed
at 'main.css:9583'; the captured surface matched the NIGHT value.

What must be true when you are done:
- The pipeline **asserts the applied theme immediately before each shot** and **fails the run** when it
  does not match the theme the file is about to be named after. A capture named 'light_*' containing
  night pixels is fabricated evidence.
- It waits for the switch deterministically rather than sleeping a fixed time. The theme is persisted in
  localStorage ('dente_theme_mode' → 'store/themeStore.ts' → 'applyThemeToRoot' → 'root.dataset.theme').
- The sibling weakness is closed too: 'dente-redesign-shots.mjs' warned and proceeded when a view never
  became ready, which is how six Vite-error-overlay images were once filed as themed captures.

**Now a hard consequence you must handle honestly:** the 14 fabricated clones were deleted from
'.dente-redesign-shots/' (2 unique md5 across 14 filenames). **'schedule', 'shift' and 'visit' therefore
have NO valid desktop capture at all.** If your fixed pipeline can produce them, produce them and
MD5-audit the result. If it cannot, say exactly why and leave it as named debt — do not fabricate a
substitute.

PROOF EXPECTED:
- SMOKE VERIFIED: run the pipeline, then MD5-audit its output yourself and quote it. For the same panel,
  'light_*' and 'night_*' must now DIFFER. **That inequality is the proof.**
- Demonstrate the assertion FIRES: force a wrong theme in a scratch copy and show the run refuses. A
  guard nobody proved can go red is not a guard.
- Do NOT restart the shared dev server; api 4100 and web 5173 are up and the pipeline needs them.
`,
  },
  {
    id: 'X6-auth-idiom-converge',
    label: 'X6 two auth idioms',
    wave: 2,
    dir: '.agents/archon/packets/X6-auth-idiom-converge',
    files: 'apps/api/src/routes/patients.ts and, if and only if required, apps/api/src/accessGuard.ts — but read the collision warning below first.',
    gate: 'node --import tsx --test on your own test file, plus node scripts/smoke-clinical-mutation-guard.mjs (read-only, safe). NEVER npm run typecheck — the lead owns that gate (§7a).',
    brief: `
PACKET X6 — TWO DIFFERENT WAYS TO AUTHORISE A MUTATION LIVE IN THIS API. ONE OF THEM IS STRICTER.
Lane: PLATFORM / SECURITY. Read .agents/CLINICAL_RULES.md COMPLETE.

THE FINDING, established by the lead and by two reviewers across cycles 5-6:
- Most routes use the shared helpers — 'requireClinicalMutationAccess' / 'requireClinicalReadAccess'
  from 'accessGuard.ts', with organisation resolution via 'requireOrganizationId'.
- 'apps/api/src/routes/patients.ts' authorises **by hand** in each handler: it reads the
  'x-dente-clinic-token' header, calls 'verifyToken(clinicToken, TOKEN_SECRET())', returns 401
  'AuthRequired' / 'AuthExpired', and takes 'orgId' **from the signature-verified token payload**.
- **The hand-rolled one is STRICTER.** It never accepts an organisation id from a header, so it was
  structurally immune to the 'identity.verified' hole that packet U1 had to close in the shared path —
  where 'security/identity.ts:107-113' set 'organizationId' from 'x-organization-id' with
  'verified: false' and 'requireOrganizationId' never read the flag.
- The old identifier-counting gate could not see this at all: it reported «patients.ts must guard 3
  protected route(s), found 0» — a false alarm on correct code — while greening on a JSDoc comment
  elsewhere. That gate has since been replaced by the behavioural one.

WHAT TO DECIDE AND JUSTIFY — this is a design packet, not a mechanical rewrite:
1. Read 'routes/patients.ts' IN FULL and 'accessGuard.ts' IN FULL, plus 'security/identity.ts' as U1
   left it. Establish precisely what each idiom guarantees today, post-U1. **State whether the shared
   helper is now as strong as the hand-rolled one.** That answer decides the packet.
2. If the shared helper is now equally strong → converge 'patients.ts' onto it, so the codebase has ONE
   way to authorise a mutation. Prove equivalence per route before and after: same status codes, same
   error bodies, same tenant resolution. **A convergence that silently weakens one route is far worse
   than two idioms.**
3. If the shared helper is still weaker in any respect → **do NOT converge.** Say so with file:line,
   leave 'patients.ts' alone, and write up what the shared path still needs. Preserving the stricter
   code is the correct outcome; §10 forbids inventing a policy that does not exist.
4. Either way, report the full inventory: which route files use which idiom, and how many handlers each.
   That inventory is half the value here.

COLLISION WARNING: 'accessGuard.ts' and 'security/identity.ts' were edited by packet U1 in cycle 5. Run
'git status --porcelain' on both before touching either; if dirty, STOP and report. Do not edit
'routes/speech.ts' or 'routes/telegram.ts' — frozen areas.

PROOF EXPECTED:
- UNIT VERIFIED, load-bearing: node:test with app.inject() proving, per touched route, that no
  credentials → 401, a foreign tenant's token → refused, and a token whose organisation id exists in no
  'organizations' row → refused. Quote every status code.
- SMOKE VERIFIED: 'node scripts/smoke-clinical-mutation-guard.mjs' exit 0, and quote its route counts
  plus the 'payloadBeforeAuthorisation' list before and after. That gate probes every route without
  credentials and is the honest check for exactly this packet.
- TYPECHECK and the full test suite: **not yours** (§7a). Name the commands for the lead.
`,
  },
]

const BUILD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['packet', 'status', 'defectReal', 'commitHash', 'filesChanged', 'proven', 'notProven', 'summary', 'reachability', 'measurements', 'reworkItems', 'constitutionCheck', 'leadMustRun', 'dossierCorrections', 'blockers', 'foundNotFixed'],
  properties: {
    packet: { type: 'string' },
    status: { enum: ['COMMITTED', 'PARTIAL', 'BLOCKED', 'NO_CHANGE'] },
    defectReal: { type: 'boolean' },
    commitHash: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    proven: { type: 'array', items: { type: 'string' } },
    notProven: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    reachability: { type: 'string' },
    measurements: { type: 'array', items: { type: 'string' }, description: 'Real reproducible numbers. A count, pixel or performance claim without one is an opinion.' },
    reworkItems: { type: 'array', items: { type: 'string' }, description: 'Rework packets: EVERY numbered reviewer item marked CLOSED / DECLARED DEBT / DISPUTED(evidence).' },
    constitutionCheck: { type: 'array', items: { type: 'string' }, description: 'Director self-check: really works not just compiles; no stub left; a grandmother copes; no visual overload; a small practice avoids the extra; grep confirms the edit; committed with a hash; nothing of others touched.' },
    leadMustRun: { type: 'array', items: { type: 'string' }, description: 'Exact shared-state commands the LEAD must run for you under §7a (typecheck, build, whole suite, migrations). Empty if none.' },
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
    LAW + CYCLE7_CORRECTIONS + CYCLE8_DELTA + (p.rework ? REWORK_RULES_8 : '') +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'YOUR PACKET: ' + p.id + '\n' +
    'YOUR ROLE: implementer with file-edit rights, bounded to the claim below (§7a).\n' +
    'WHY THIS IS DELEGATED: it needs full-file comprehension of a specific subsystem plus its own\n' +
    'reconnaissance, and it is disjoint from the other packets in this wave.\n' +
    (p.rework ? 'YOUR SPECIFICATION (read COMPLETE, first): ' + p.rework + '\n' : '') +
    'YOUR FILE CLAIM — OWNED read/edit scope, edit nothing outside it: ' + p.files + '\n' +
    'FORBIDDEN SCOPE: any file not in your claim; apps/api/src/speech/**, routes/speech.ts,\n' +
    'routes/telegram.ts (frozen); any file another author has dirty; and the shared gates of §7a\n' +
    '(typecheck, build, whole-suite test, migrations, seeds) — those are the lead\'s.\n' +
    'YOUR OWN SIGNAL (safe, no shared state): ' + p.gate + '\n' +
    'EVIDENCE STANDARD: every "proven" entry is a command you actually ran, with its true exit code and\n' +
    'real output quoted. Your output is EVIDENCE, not authority — the lead re-runs it.\n' +
    'YOUR PACKET DIRECTORY (create FIRST): ' + p.dir + '\n' +
    '═══════════════════════════════════════════════════════════════\n' + p.brief +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'ORDER OF OPERATIONS, MANDATORY:\n' +
    ' 1. Write ' + p.dir + '/state.md == STARTED. NOW, before reading anything.\n' +
    ' 2. Read the authority documents. Complete. state.md == AUTHORITY READ.\n' +
    (p.rework ? ' 2b. Read ' + p.rework + ' COMPLETE, plus that packet handoff.md and state.md.\n' : '') +
    ' 3. git rev-parse HEAD; git status --porcelain on your claimed files. Dirty and not by you =>\n' +
    '    STOP, report the collision. A second, non-fleet author commits here continuously.\n' +
    ' 4. Read your target file(s) IN FULL. Confirm the defect at real lines.\n' +
    '    state.md == DEFECT CONFIRMED / ABSENT. If absent, say so loudly; never invent work.\n' +
    ' 5. Build the real fix. No stub, no facade, no half-product (§1). state.md == EDIT WRITTEN.\n' +
    ' 6. Run YOUR OWN signal only (never the shared gates — §7a). state.md == SELF-CHECK PASSED.\n' +
    ' 7. **COMMIT NOW** — pathspec form, retry loop, verify with git log -1 --stat.\n' +
    '    state.md == COMMITTED <hash>. Do NOT wait for proofs. Nothing may be lost.\n' +
    ' 8. Proofs. Second commit for the test. state.md == PROVEN.\n' +
    ' 9. Write ' + p.dir + '/handoff.md. state.md == DONE.\n' +
    '10. Emit structured output, including "constitutionCheck" and "leadMustRun". Every "proven" entry\n' +
    '    must be a command you actually ran.\n' +
    (p.rework ? '"reworkItems" MUST list EVERY numbered reviewer item. An unmentioned item is a failed packet.\n' : '') +
    'A packet ending in a plan and no diff is a FAILED packet.\n',
    { label: p.label, phase: 'Build', schema: BUILD_SCHEMA }
  )
}

function reviewStage(built, p) {
  if (!built) {
    return { packet: p.id, verdict: 'NEEDS_REWORK', attackSurface: [], proofAudit: 'Builder produced no result — died or out of capacity. Read ' + p.dir + '/state.md.', gitHygiene: 'unknown', reasoning: 'No build output.', requiredRework: ['Resume ' + p.id] }
  }
  if (built.status === 'BLOCKED' || built.status === 'NO_CHANGE' || !built.commitHash) {
    return { packet: p.id, verdict: 'SOUND_WITH_NITS', attackSurface: [], proofAudit: 'No commit to audit; builder reported ' + built.status + '.', gitHygiene: 'n/a', reasoning: built.summary || '', requiredRework: built.blockers || [] }
  }
  return agent(
    'You are an ADVERSARIAL REVIEWER on the DENTE dental CRM (C:\\Clinic_MVP\\dental-crm), reporting to\n' +
    'lead [ARCHON]. You did NOT write this code. Your job is to DESTROY it, not bless it.\n' +
    'Write findings to ' + p.dir + '/review.md AS YOU GO — you may be killed mid-review.\n\n' +
    'THE DISEASE HERE IS FABRICATED PROOF. What reviewers before you caught — this is your standard:\n' +
    '- 49 cited proof_*.png files that do not exist.\n' +
    '- 14 filenames holding 2 unique images, one of them a Vite CSS error overlay filed under ten view\n' +
    '  names, which passed a "56 unique MD5" certification.\n' +
    '- A screenshot MD5-unique and 116 KB showing the staff PIN screen, not the view it is named after.\n' +
    '- A handoff asserting "текст не уничтожен", refuted by run output.\n' +
    '- A measurement taken against a baseline the packet itself proved impossible.\n' +
    '- A smoke green only because it loaded a dist built BEFORE the fix.\n' +
    '- A commit message describing a defect that does not reproduce at its own parent.\n' +
    '- A performance headline attributable to a behaviour change, not the performance fix.\n' +
    '- The lead publishing a census of "45 hollow modules" that was a regex artefact.\n' +
    '- A unit test whose fixtures the same packet had deleted, so it asserted nothing and reported pass.\n' +
    'Default posture: disbelief. Reproduce claims; never read them. Re-derive every number.\n\n' +
    'Read .agents/AGENTS.md COMPLETE plus .agents/INDEX.md. Do NOT penalise the builder for defying the\n' +
    'madge order (not installed) or the biome order (not installed; would reformat the repo).\n' +
    'Under §7a the BUILDER was forbidden from running typecheck/build/whole-suite — do NOT mark a packet\n' +
    'down for not running them. YOU may run them, one at a time, and you should.\n' +
    'REBUILD before any proof that loads apps/api/dist — a stale dist has hidden four defects.\n\n' +
    'THE DIRECTOR\'S CONSTITUTION binds this packet. Judge against it too:\n' +
    '§1 depth not facade, no stubs, "compiles" is not "works". §3 a grandmother must understand every\n' +
    'error, empty and loading state and know what to do next. §4 no visual overload; depth hidden\n' +
    'properly. §5 a small practice must not see what it does not need, via flags not hardcode; any\n' +
    'decomposition must be IMPORTED AND USED, never orphaned. §10 no invented backend contracts, schemas\n' +
    'or fields — absent things are debt with a reason.\n\n' +
    'THE PACKET: ' + p.id + '\nCLAIMED SCOPE: ' + p.files + '\nCOMMIT TO ATTACK: ' + built.commitHash + '\n' +
    'FILES CHANGED: ' + JSON.stringify(built.filesChanged) + '\n' +
    'CLAIMED PROVEN: ' + JSON.stringify(built.proven) + '\n' +
    'CLAIMED NOT PROVEN: ' + JSON.stringify(built.notProven) + '\n' +
    'REACHABILITY: ' + (built.reachability || '(none)') + '\n' +
    'MEASUREMENTS: ' + JSON.stringify(built.measurements || []) + '\n' +
    'REWORK DISPOSITION: ' + JSON.stringify(built.reworkItems || []) + '\n' +
    'CONSTITUTION SELF-CHECK: ' + JSON.stringify(built.constitutionCheck || []) + '\n' +
    'LEAD MUST RUN: ' + JSON.stringify(built.leadMustRun || []) + '\n' +
    'SUMMARY: ' + built.summary + '\n' +
    'ORIGINAL BRIEF:\n' + p.brief + '\n\n' +
    'DO THIS:\n' +
    '1. git show ' + built.commitHash + ' --stat, then the full diff, then read the changed files at HEAD.\n' +
    '2. HYPOTHESES YOU MUST ACTUALLY TEST:\n' +
    '   - Was the defect REAL before this commit? **Reproduce it at the parent.**\n' +
    '   - Is the fix REACHABLE by a real user, or dead code sold as a product fix?\n' +
    '   - Does it hold on REAL data, not just the fixture?\n' +
    '   - **Are the claimed MEASUREMENTS reproducible?** Re-measure every one.\n' +
    '   - Did the fix introduce a REGRESSION worse than the defect? A cycle-5 packet closed a real\n' +
    '     overlap and gave away a third of a phone viewport; a cycle-6 packet removed one covered\n' +
    '     control and parked itself on another.\n' +
    '   - **If the packet DELETED anything: git grep -l "<BaseName>" HEAD -- . over the WHOLE repo**\n' +
    '     must return nothing outside docs/ and .agents/ prose. The apps/-only check missed a dangling\n' +
    '     import in scripts/ once already.\n' +
    '   - **If the packet EXTRACTED components: is each one imported AND rendered?** An orphan is a\n' +
    '     regression dressed as refactoring, and it already happened in cycle 7.\n' +
    '   - **Do any new tests actually assert?** A cycle-7 test named fixtures the same packet deleted and\n' +
    '     reported pass while executing zero assertions. Check the fixtures exist.\n' +
    '   - HOLLOW FACADE, SECOND OWNER, deleted useAppLogic return field, missing teardown, hardcoded\n' +
    '     hex/px, undeclared Russian literal, mojibake in diff or subject?\n' +
    '3. PROOF AUDIT: RE-RUN EVERY CLAIMED PROOF COMMAND YOURSELF, capturing the TRUE exit code.\n' +
    '4. GIT HYGIENE: only the claimed files? churn or another author work swept in via the shared index?\n' +
    '5. VERDICT. Reserve REVERT for a change actively worse than the defect. Never award SOUND to a\n' +
    '   claim you could not reproduce. If NEEDS_REWORK, make requiredRework numbered and actionable.\n\n' +
    'CONSTRAINTS: read-only on source — no edit, fix, commit, revert, git add. Never git remote -v (live\n' +
    'tokens). Never npx @biomejs/biome. Do not start or restart any server. You MAY run typechecks,\n' +
    'builds, tests, smokes, read-only node -e, curl to 127.0.0.1:4100, read-only SQL, and you MAY open\n' +
    'PNG files to judge a visual claim.',
    { label: 'attack:' + p.id, phase: 'Attack', schema: REVIEW_SCHEMA }
  )
}

const all = []
for (const waveNo of [1, 2]) {
  const wave = PACKETS.filter((p) => p.wave === waveNo)
  log('Cycle 8 wave ' + waveNo + ': ' + wave.map((p) => p.id).join(', '))
  const done = await pipeline(wave, buildStage, reviewStage)
  for (let i = 0; i < wave.length; i++) all.push({ packet: wave[i].id, dir: wave[i].dir, review: done[i] || null })
  log('Cycle 8 wave ' + waveNo + ' complete.')
}
return { cycle: 8, results: all }
