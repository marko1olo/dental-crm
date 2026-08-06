export const meta = {
	name: "archon-cycle-7",
	description:
		"DENTE cycle 7: hollow modules, clinicMode for solo, unreachable views, human errors, capture theme, real decomposition",
	phases: [
		{
			title: "Build",
			detail:
				"depth over facade: delete lies, gate by practice size, route or remove",
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
`;

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
`;

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
`;

const PACKETS = [
	{
		id: "W1-hollow-query-census",
		label: "W1 hollow query modules",
		wave: 1,
		dir: ".agents/archon/packets/W1-hollow-query-census",
		files:
			"a new scripts/ census tool, plus deletion of provably-dead db/*Query.ts modules AND their widgets. Coordinate, do not fight, over files the second author is deleting.",
		gate: "your census tool run + node --import tsx --test on your own test file. NEVER npm run typecheck or build — the lead owns those gates (§7a).",
		brief: `
PACKET W1 — READ-ONLY QUERY MODULES OVER TABLES NOTHING EVER WRITES TO. §1: A WIDGET THAT CAN NEVER
HAVE DATA IS NOT A MISSING FEATURE, IT IS A LIE WITH A UI.
Lane: PLATFORM. Read .agents/DATABASE.md COMPLETE (corrected this campaign; rule 4 is about exactly
this defect class).

THE SITUATION, measured by the lead — and the lead's first count was WRONG, which is why you must
measure properly:
- 'apps/api/src/db/' holds **50** '*Query.ts' modules (down from 65; the second author has been deleting
  them).
- A naive census — 'db.insert(<moduleName>' — reports 45 hollow. **That number is false.** It breaks on
  every module whose file name differs from its table name: 'auditQuery.ts' writes to 'auditEvents' and
  really performs 9 inserts, yet a name-based match calls it hollow. Do not reproduce that mistake.
- The honest method: each module imports its tables explicitly, e.g.
  'lostPatientsFiltersQuery.ts:3' — 'import { appointments, lostPatientsFilters, patients } from "./schema.js";'
  Resolve the imported table identifiers, then ask whether ANY code in apps/api/src ever inserts into
  them.

WHAT TO BUILD:
1. A census tool in 'scripts/' that, for every 'apps/api/src/db/*Query.ts': resolves the schema
   identifiers it imports, and reports for each whether that table has a writer anywhere in
   apps/api/src. **Use 'npx @ast-grep/cli', not regex** — a regex census is the exact proxy that
   produced the false 45. Its output must name each module, its tables, and the writer count.
2. Run it. **Report the TRUE number.** If it differs from 45, say so plainly — correcting the lead's
   number is a success, not an embarrassment.
3. Then act on the provably-dead ones, but carefully:
   - For each hollow module, find its consumers (route, widget, view). A hollow module with a widget on
     screen is the worst case: the user sees a panel that can never fill.
   - **Delete the module, its route wiring and its widget together, in one commit per feature.** A
     half-deletion breaks HEAD — that already happened twice this campaign
     ('VisitDictation.tsx', 'LostPatientsFiltersWidget.tsx'), both times because a deletion landed
     without its usage removal. **After each deletion run 'git grep -n "<BaseName>" HEAD -- apps/' and
     it must return nothing.**
   - **Do not delete anything the second author currently has dirty.** Run 'git status --porcelain'
     first; if dirty, list it in your report and skip it.
   - If a table genuinely SHOULD be written to and the writer is simply missing, that is a different
     answer: record it as debt with the reason (§10 — do not invent the contract), do not delete.
4. Start with the ones you can prove hardest. Landing 5 fully-closed deletions beats listing 45.

PROOF EXPECTED:
- The census output, quoted, with the true count.
- For each deletion: the commit hash, and 'git grep -n "<BaseName>" HEAD -- apps/' returning nothing.
- TYPECHECK VERIFIED on both workspaces after the deletions.
`,
	},
	{
		id: "W2-clinicmode-really-hides",
		label: "W2 solo sees a clinic-sized app",
		wave: 1,
		dir: ".agents/archon/packets/W2-clinicmode-really-hides",
		files:
			"apps/web/src/store/settingsStore.ts, useSettingsDerivations.tsx, workspaceShell.tsx and the gating sites you find. NOT App.tsx (packet W3 owns it this cycle).",
		gate: "node --import tsx --test on your own single test file. NEVER npm run typecheck — the lead owns that gate (§7a).",
		brief: `
PACKET W2 — A SOLO DENTIST OPENS THE APP AND SEES A NETWORK CLINIC. §5 IS THE CORE OF THE PRODUCT.
Lane: ADAPTIVITY / DESIGN SYSTEM. Read .agents/UI_STANDARDS.md COMPLETE.

THE FINDING, measured by the lead: the modularity spine EXISTS — 'clinicMode' appears in 22 files
including 'store/settingsStore.ts', 'useSettingsDerivations.tsx', the API 'routes/workspaceProfile.ts'
and 'db/domainStateHydration.ts'. But **'settingsStore.ts:158' defaults it to '"network_clinic"'** — the
LARGEST mode. Out of the box, a solo dentist gets the full multi-clinic surface.

The Director's §5 is explicit: the focus right now is solo and small practices, and **small practices
must not see modules, columns and fields they do not need** — through flags and presets, never
hardcoded.

ORDER — INVESTIGATE BEFORE CHANGING:
1. Read 'store/settingsStore.ts' and 'useSettingsDerivations.tsx' in the regions that touch
   'clinicMode'. Establish **what it actually gates today.** Grep every consumer. Produce a table in
   your handoff: mode → what is hidden. **If the answer is "almost nothing", say so plainly** — that is
   the real finding and it changes the packet from "change a default" to "make the flag real".
2. Do NOT simply flip the default and declare victory. A default of 'solo' that hides nothing is the
   same lie in the other direction. The flag must genuinely control the surface.
3. Pick the highest-value surfaces a solo dentist demonstrably does not need and gate them properly —
   the nav rail entries, the role chip, multi-clinic selectors, staff-management surfaces, anything
   that presupposes colleagues. **Justify each choice**: a solo dentist has no second chair, no nurse,
   no second clinic. Do not guess at clinical needs; gate organisational chrome, not clinical depth.
4. §4: hiding is not deleting. Depth stays reachable — «показать больше» / settings — it just does not
   crowd the default surface.
5. Onboarding and settings must really drive it (§5). If the settings UI cannot currently change the
   mode, that is part of the packet: find where it should live and wire it, or record precisely why not.
6. Do not invent new modes or new flags if the existing enum covers it (§10). Read the 'ClinicMode' type
   first.

PROOF EXPECTED:
- UNIT VERIFIED: a node:test over the pure gating function — given mode 'solo' the visible module list
  is a strict subset of 'network_clinic', and every clinical capability still reachable. Quote the two
  lists. **The two lists ARE the proof**; a passing test that does not print them proves nothing.
- TYPECHECK: **NOT yours to run** (§7a — shared '.tsbuildinfo'). Say in your handoff that the lead must
  gate it, and name the exact command. Your own signal is your single test file.
- Rendered appearance is NOT VERIFIED by you — the lead owns screenshots and will capture solo vs
  network mode personally. Give the exact command.
`,
	},
	{
		id: "W3-unreachable-views",
		label: "W3 4689 lines nobody can open",
		wave: 1,
		dir: ".agents/archon/packets/W3-unreachable-views",
		files:
			"apps/web/src/App.tsx, workspaceShell.tsx (appViews), workspacePreload.ts, AppRouter.tsx, and the five view files. CHECK App.tsx IS CLEAN FIRST.",
		gate: "node --import tsx --test on your own single test file. NEVER npm run typecheck — the lead owns that gate (§7a).",
		brief: `
PACKET W3 — FIVE FINISHED-LOOKING VIEWS, 4,689 LINES, REACHABLE BY NOBODY. §1: EITHER REAL OR GONE.
Lane: WEB / cross-lane seam. Read .agents/UI_STANDARDS.md COMPLETE.

THE DEFECT (RECON_DOSSIER.md §3): 'apps/web/src/AppRouter.tsx' (359 lines) **is dead code and says so
in its own header**. Five views are wired only into it, so no user can ever open them:
  InventoryView 1,366 · PayrollView 867 · LeadsKanbanView 996 · OmnichannelInboxView 1,306 · ScannerView 154
A guard test 'tests/panelsAreMounted.test.ts' exists precisely because panels were added to the dead
file and silently never rendered.

Routing has no router library. A view exists only if it is in THREE places:
  'workspaceShell.tsx:25' 'appViews' → 'AppHelpers.tsx:6033' 'viewFromHash()' (hash.split("/")[0], **no
  leading slash**: '#schedule', '#settings/prices') → the single hashchange listener at
  'useAppLogic.tsx:4280-4291' → a flat 'currentView === "x"' chain in 'App.tsx'.
Plus 'workspacePreload.ts' or Vite lazy-loads it and CLS warnings appear.

**App.tsx was DIRTY for most of this campaign and is CLEAN as of this dispatch — verify that yourself
before you start ('git status --porcelain'). If a second author has dirtied it again, STOP and report;
do not edit around them.**

THE DECISION IS YOURS TO MAKE AND JUSTIFY, PER VIEW. For each of the five:
- Open the file. Is it a real, working feature against real data, or a facade over a table nothing
  writes to? Check its data source the way packet W1 does — a view whose query module is hollow is a
  facade and **routing it would ship a lie** (§1).
- **Real → route it properly**: 'appViews' + 'App.tsx' + 'workspacePreload.ts', all three, plus a
  sensible label and hint in 'viewLabels'/'viewHints' so the nav rail can name it (§3 — a grandmother
  must know what it is).
- **Facade → delete it**, with its imports, and prove 'git grep -n "<Name>" HEAD -- apps/' returns
  nothing afterwards. Half-deletions broke HEAD twice this campaign.
- Say plainly which you chose for each and why. "Four thousand lines are currently in neither state" is
  the defect; ending the cycle with them still in neither state is a failed packet.
- §5: if a view is real but only meaningful for a larger practice (payroll, multi-channel inbox),
  route it AND gate it by clinicMode so a solo dentist does not see it. Coordinate with packet W2 by
  reporting, not by editing its files.
- 'AppRouter.tsx' itself: once the five are resolved, it should be deleted. If anything still depends
  on it, say what.

PROOF EXPECTED:
- UNIT VERIFIED: 'tests/panelsAreMounted.test.ts' must pass, and extend it so a view present in
  'appViews' but missing from 'App.tsx' or 'workspacePreload.ts' FAILS. That guard is the whole reason
  this defect existed. EXECUTE it, quote the pass.
- TYPECHECK: **NOT yours to run** (§7a — shared '.tsbuildinfo'). Say in your handoff that the lead must
  gate it, and name the exact command. Your own signal is your single test file.
- For each deletion: 'git grep -n "<Name>" HEAD -- apps/' returning nothing.
- Rendered appearance is NOT VERIFIED by you — the lead will open each newly routed view personally.
`,
	},
	{
		id: "W4-human-error-text",
		label: "W4 errors a grandmother can read",
		wave: 2,
		dir: ".agents/archon/packets/W4-human-error-text",
		files:
			"the UI error/empty/loading surfaces you identify. NOT App.tsx (W3 owns it), NOT the frozen speech/telegram routes.",
		gate: "node --import tsx --test on your own single test file. NEVER npm run typecheck — the lead owns that gate (§7a).",
		brief: `
PACKET W4 — ERRORS THAT TELL THE USER NOTHING. §3 IS THE PACKET.
Lane: WEB / ADAPTIVITY. Read .agents/UI_STANDARDS.md COMPLETE and .agents/archon/VISUAL_VERDICT.md
COMPLETE.

The Director's §3, verbatim in intent: errors must be human — not «Internal Server Error» but
«Не хватает материала: Карпула Артикаина». Empty, loading and error states everywhere, each telling the
user **what to do next**. If the user must wonder "what is this and where do I click", that is a
failure.

WHAT THE CAMPAIGN ALREADY KNOWS:
- The Analytics view once rendered a raw English browser exception —
  «Failed to execute 'json' on 'Response': Unexpected end of JSON input» — as its entire content area.
  That specific one was fixed, but **the pattern is what you are hunting.**
- The product ALREADY contains the standard to copy. Two screens do this properly and you must read
  them before writing anything:
  'apps/web/src/components/reports/ManagerReportsPanel.tsx' — honest «—» for unknown, a small-sample
  statistical warning, a footnote stating its own method; and the patient-duplicates panel, whose copy
  now reads «Похоже, у этого пациента есть ещё карточки: 2. Пока карточки не объединены, приёмы,
  оплаты и снимки разложены по разным местам, и долг не виден целиком.» — consequence first, no jargon,
  actions differentiated by confidence.

ORDER:
1. Hunt by BEHAVIOUR, not by marker (this repo does not mark its stubs). Search apps/web/src for:
   raw 'error.message' / 'String(error)' rendered into JSX; English literals reaching the user
   ('Error', 'Failed', 'Internal Server Error', 'undefined', 'NaN'); HTTP status codes shown bare;
   empty states that say nothing more than «Нет данных» or «данные отсутствуют».
2. **Report the inventory first, with file:line, in state.md.** Then fix the highest-traffic ones. §8:
   do not spread thin — five screens genuinely fixed beat forty touched.
3. Every message you write must answer three questions: what happened, why, and what the user should do
   now. Name the actual thing («Не хватает материала: Карпула Артикаина»), never the mechanism.
4. Distinguish the states properly: **loading ≠ empty-but-fine ≠ failed**. Conflating "no data for this
   period" with "the request failed" is itself the defect.
5. §4: do not add visual weight. An empty state is a quiet line plus one action, not a decorated card.
6. §11: Russian, UTF-8, no mojibake — run 'npm run smoke:web-text-encoding' after (it is green now; keep
   it green). i18n: route new strings through an existing label dictionary
   ('workspaceUiLabels.ts', 'imagingUiLabels.ts', 'pricelistUiMeta.ts') or state plainly that you added
   to the debt and why.
7. Do not invent error semantics the backend does not produce (§10). If the API returns an opaque
   failure, say so honestly in the UI («Не удалось получить данные. Попробуйте ещё раз») rather than
   inventing a cause.

PROOF EXPECTED:
- The inventory, quoted, with file:line and the count.
- UNIT VERIFIED: node:test over the pure message-selection functions you extract — a failed fetch, an
  empty result and a loading state must produce three DIFFERENT human strings, and none may contain an
  English exception or a bare status code. EXECUTE it, quote the pass.
- SMOKE VERIFIED: 'npm run smoke:web-text-encoding' exit 0.
- TYPECHECK VERIFIED.
`,
	},
	{
		id: "W5-capture-theme-assert",
		label: "W5 light capture rendered night",
		wave: 2,
		dir: ".agents/archon/packets/W5-capture-theme-assert",
		files:
			"scripts/ops-panels-shots.mjs (and dente-redesign-shots.mjs if the same flaw is there)",
		gate: "node scripts/ops-panels-shots.mjs",
		brief: `
PACKET W5 — THE CAPTURE PIPELINE FILED A NIGHT-THEME PANEL AS THE LIGHT THEME.
Lane: PROOF. Read .agents/archon/VISUAL_VERDICT.md addendum C COMPLETE — the lead found this personally.

THE DEFECT, measured by the lead on a fresh run (35 files, 33 unique MD5, exit 0):
  'light_duplicateAlert.png' md5 bdbf6e8a09e4
  'night_duplicateAlert.png' md5 bdbf6e8a09e4  ← byte-identical to light
  'dark_duplicateAlert.png'  md5 021c73856027  ← different
The lead opened the night plate: a warm dark olive panel. Since light is byte-identical, **the
light-theme run rendered the night panel.**

The palette is NOT at fault — all three token values exist and differ:
'styles/token-aliases.css:130' '--srf-chip-soft: #f7fbf9' (light), ':140' '#16211f' (dark),
':149' '#1a1714' (night); consumed at 'main.css:9583'. The captured surface matches the NIGHT value.

Likely cause for you to confirm or refute: the theme is persisted in localStorage
('dente_theme_mode' → 'store/themeStore.ts' → 'applyThemeToRoot' → 'root.dataset.theme'), and the panel
is shot **before the switch to light has been applied** — a race, not a palette bug.

**The pipeline already has the means to catch this and does not use it.** Its own log printed
'html: класс «dark», data-theme «dark» | --srf-chip-soft: #16211f' during the narrow run — it can read
the applied theme. It just never asserts it.

WHAT TO BUILD:
1. Reproduce first. Do not fix a theory. Confirm whether the light run really carries a non-light
   'data-theme' at shoot time.
2. **Assert the theme immediately before every shot**: read 'document.documentElement.dataset.theme'
   and the resolved value of the token that changes per theme, and **fail the run** if it does not match
   the theme the file is about to be named after. A capture named 'light_*' containing night pixels is
   fabricated evidence — the exact disease this campaign exists to remove.
3. Wait for the switch properly rather than sleeping a fixed time. If localStorage is the source, clear
   or set it deterministically before each theme pass.
4. Check whether 'scripts/dente-redesign-shots.mjs' has the same flaw and either fix it too or report it
   precisely. Note that script has a separate known weakness: ':140' warns and proceeds when a view
   never became ready, which is how six Vite-error-overlay images were once filed as themed captures.
5. **Consequence to state in your handoff:** until this lands, every light-theme plate from this
   pipeline is suspect. Say so.

PROOF EXPECTED:
- SMOKE VERIFIED: run the pipeline. Then MD5-audit the output yourself and quote it: 'light_*' and
  'night_*' for the same panel must now DIFFER. That inequality is the proof.
- Demonstrate the new assertion FIRES: force a wrong theme in a scratch copy and show the run refuses.
  A guard nobody proved can go red is not a guard.
- Do NOT restart the shared dev server. The pipeline needs api 4100 and web 5173 up; they are.
`,
	},
	{
		id: "W6-monolith-real-split",
		label: "W6 one monolith, really split",
		wave: 2,
		dir: ".agents/archon/packets/W6-monolith-real-split",
		files:
			"ONE monolith you choose, plus the domain components you extract. NOT App.tsx (W3), NOT useAppLogic.tsx (cross-lane seam, additive only).",
		gate: "node --import tsx --test on your own single test file. NEVER npm run typecheck — the lead owns that gate (§7a).",
		brief: `
PACKET W6 — SPLIT ONE MONOLITH FOR REAL. §5: THE DECOMPOSITION MUST BE IMPORTED AND USED, NOT ORPHANED.
Lane: WEB. Read .agents/UI_STANDARDS.md COMPLETE.

The Director's §5: big files get split into domain components, logic into hooks, presentation separate —
**but the decomposition must be REAL (components imported and used), not orphaned files.** This repo has
already produced orphans: 'AppRouter.tsx' is 359 lines of dead code that says so in its own header, and
five views live only inside it.

THE CANDIDATES (line counts from the dossier; verify before choosing):
  'DocumentsView.tsx' 5,053 · 'SmartImportStudio.tsx' 4,244 · 'SettingsImportsTab.tsx' 4,145 ·
  'store/documentStore.ts' 2,624 · 'LegacyMigrationStudio.tsx' 2,623 · 'useSettingsDerivations.tsx' 2,389
**'DocumentsView.tsx' was dirty earlier in the campaign — check 'git status --porcelain' before
choosing it, and pick another if a second author is inside it.**

ORDER:
1. **Choose ONE.** §8: do not spread thin. One monolith genuinely decomposed beats three touched.
   Justify the choice: pick the one with the clearest domain seams, not merely the largest.
2. Read it IN FULL — this is the one place the targeted-region exception does NOT help you, because you
   are deciding where its seams are. Budget for that.
3. Extract along DOMAIN boundaries, not by line count. A component that takes 19 props is a slice, not a
   component. Logic goes into hooks; presentation stays dumb.
4. **Every extracted file must be imported and used by the parent in the same commit.** Verify with
   'git grep -n "<NewComponent>" apps/web/src' showing both the definition and a real usage. An
   orphaned file is a regression, not progress.
5. Behaviour must not change. This is a refactor: no new features, no removed features, no altered
   copy. If you find a defect while inside, REPORT it, do not fix it here (§8: finish what you started).
6. Tokens only, no static hex, light/dark/night, relative units, Russian text expands 30-50%.
7. Guaranteed teardown for any effect you move.

PROOF EXPECTED:
- The before/after line count of the parent and each extracted file. Real numbers.
- 'git grep' output proving EVERY new component is imported and used.
- TYPECHECK: **NOT yours to run** (§7a — shared '.tsbuildinfo'). Say in your handoff that the lead must
  gate it, and name the exact command. Your own signal is your single test file.
- UNIT VERIFIED where you extracted pure logic into a hook or helper.
- Rendered appearance is NOT VERIFIED by you — say so; a refactor that silently changes the screen is
  the failure mode here, and the lead will compare captures.
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
		"measurements",
		"constitutionCheck",
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
		proven: { type: "array", items: { type: "string" } },
		notProven: { type: "array", items: { type: "string" } },
		summary: { type: "string" },
		reachability: { type: "string" },
		measurements: {
			type: "array",
			items: { type: "string" },
			description:
				"Real reproducible numbers. A count or performance claim without one is an opinion.",
		},
		constitutionCheck: {
			type: "array",
			items: { type: "string" },
			description:
				"Answer the Director self-check: really works not just compiles; no stub left; a grandmother copes; no visual overload; a small practice avoids the extra; grep confirms the edit; committed with a hash; green kept green.",
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
			CYCLE7_CORRECTIONS +
			"\n═══════════════════════════════════════════════════════════════\n" +
			"YOUR PACKET: " +
			p.id +
			"\n" +
			"YOUR ROLE: implementer with file-edit rights, bounded to the claim below (§7a).\n" +
			"WHY THIS IS DELEGATED: it needs full-file comprehension of a specific subsystem plus its own\n" +
			"reconnaissance, and it is disjoint from the other packets in this wave.\n" +
			"YOUR FILE CLAIM — OWNED read/edit scope, edit nothing outside it: " +
			p.files +
			"\n" +
			"FORBIDDEN SCOPE: any file not in your claim; apps/api/src/speech/**, routes/speech.ts,\n" +
			"routes/telegram.ts (frozen); any file another author has dirty; the shared gates listed in §7a\n" +
			"(typecheck, build, whole-suite test, migrations, seeds) — those are the lead's.\n" +
			"YOUR OWN SIGNAL (safe, no shared state): " +
			p.gate +
			"\n" +
			'EVIDENCE STANDARD: every "proven" entry is a command you actually ran, with its true exit code and\n' +
			"real output quoted. Your output is EVIDENCE, not authority — the lead re-runs it.\n" +
			"YOUR PACKET DIRECTORY (create FIRST): " +
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
			" 3. git rev-parse HEAD; git status --porcelain on your claimed files. Dirty and not by you =>\n" +
			"    STOP, report the collision. A second, non-fleet author commits here continuously.\n" +
			" 4. Read your target file(s) IN FULL. Confirm the defect at real lines.\n" +
			"    state.md == DEFECT CONFIRMED / ABSENT. If absent, say so loudly; never invent work.\n" +
			" 5. Build the real fix. No stub, no facade, no half-product (§1). state.md == EDIT WRITTEN.\n" +
			" 6. Run YOUR OWN signal only (never the shared gates — §7a). state.md == SELF-CHECK PASSED.\n" +
			" 7. **COMMIT NOW** — pathspec form, retry loop, verify with git log -1 --stat.\n" +
			"    state.md == COMMITTED <hash>. Do NOT wait for proofs. Nothing may be lost.\n" +
			" 8. Proofs. Second commit for the test. state.md == PROVEN.\n" +
			" 9. Write " +
			p.dir +
			"/handoff.md. state.md == DONE.\n" +
			'10. Emit structured output, including "constitutionCheck". Every "proven" entry must be a command\n' +
			"    you actually ran.\n" +
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
			"lead [ARCHON]. You did NOT write this code. Your job is to DESTROY it, not bless it.\n" +
			"Write findings to " +
			p.dir +
			"/review.md AS YOU GO — you may be killed mid-review.\n\n" +
			"THE DISEASE HERE IS FABRICATED PROOF. What reviewers before you caught — this is your standard:\n" +
			"- 49 cited proof_*.png files that do not exist.\n" +
			"- A screenshot MD5-unique and 116 KB showing the staff PIN screen, not the view it is named after.\n" +
			'- A handoff asserting "текст не уничтожен", refuted by run output.\n' +
			"- A measurement taken against a baseline the packet itself proved impossible.\n" +
			"- A smoke green only because it loaded a dist built BEFORE the fix.\n" +
			"- A commit message describing a defect that does not reproduce at its own parent.\n" +
			"- A light-theme screenshot that is byte-identical to the night one.\n" +
			'- **The lead published a census of "45 hollow modules" that was a regex artefact.** Numbers are\n' +
			"  claims too: re-derive every count.\n" +
			"Default posture: disbelief. Reproduce claims; never read them.\n\n" +
			"Read .agents/AGENTS.md COMPLETE plus .agents/INDEX.md. Do NOT penalise the builder for defying §11\n" +
			"(madge absent) or the biome orders (absent; would reformat the repo).\n" +
			"REBUILD before any proof that loads apps/api/dist — a stale dist has hidden four defects.\n\n" +
			"THE DIRECTOR'S CONSTITUTION binds this packet. Judge against it too:\n" +
			'§1 depth not facade, no stubs, "compiles" is not "works". §3 a Russian grandmother must understand\n' +
			"every error, empty and loading state, and know what to do next. §4 no visual overload; depth hidden\n" +
			"properly. §5 a small practice must not see what it does not need, via flags not hardcode; any\n" +
			"decomposition must be IMPORTED AND USED, never orphaned. §10 no invented backend contracts, schemas\n" +
			"or fields — absent things are debt with a reason, not fantasy.\n\n" +
			"THE PACKET: " +
			p.id +
			"\nCLAIMED SCOPE: " +
			p.files +
			"\nCOMMIT TO ATTACK: " +
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
			"MEASUREMENTS: " +
			JSON.stringify(built.measurements || []) +
			"\n" +
			"CONSTITUTION SELF-CHECK: " +
			JSON.stringify(built.constitutionCheck || []) +
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
			" --stat, then the full diff, then read the changed files at HEAD.\n" +
			"2. HYPOTHESES YOU MUST ACTUALLY TEST:\n" +
			"   - Was the defect REAL before this commit? Reproduce it at the parent.\n" +
			"   - Is the fix REACHABLE by a real user, or dead code sold as a product fix?\n" +
			"   - **Are the claimed numbers reproducible?** Re-derive every count yourself.\n" +
			"   - **If the packet DELETED anything: does anything still reference it at HEAD?**\n" +
			'     git grep -n "<BaseName>" HEAD -- apps/ must return nothing. Half-deletions broke HEAD twice.\n' +
			"   - **If the packet EXTRACTED components: is each one actually imported and used?** An orphaned\n" +
			"     file is a regression dressed as refactoring.\n" +
			"   - Did the fix introduce a REGRESSION worse than the defect? One packet closed a real overlap and\n" +
			"     gave away a third of a phone viewport doing it.\n" +
			"   - HOLLOW FACADE, SECOND OWNER, deleted useAppLogic return field, missing teardown, hardcoded\n" +
			"     hex/px, undeclared Russian literal, mojibake in diff or subject?\n" +
			"3. PROOF AUDIT: RE-RUN EVERY CLAIMED PROOF COMMAND YOURSELF, capturing the TRUE exit code.\n" +
			"4. GIT HYGIENE: only the claimed files? churn or another author work swept in via the shared index?\n" +
			"5. VERDICT. Reserve REVERT for a change actively worse than the defect. Never award SOUND to a\n" +
			"   claim you could not reproduce. If NEEDS_REWORK, make requiredRework numbered and actionable.\n\n" +
			"CONSTRAINTS: read-only on source — no edit, fix, commit, revert, git add. Never git remote -v (live\n" +
			"tokens). Never npx @biomejs/biome. Do not start or restart any server. You MAY run typechecks,\n" +
			"tests, smokes, builds, read-only node -e, curl to 127.0.0.1:4100, read-only SQL, and you MAY open\n" +
			"PNG files to judge a visual claim.",
		{ label: "attack:" + p.id, phase: "Attack", schema: REVIEW_SCHEMA },
	);
}

const all = [];
for (const waveNo of [1, 2]) {
	const wave = PACKETS.filter((p) => p.wave === waveNo);
	log("Cycle 7 wave " + waveNo + ": " + wave.map((p) => p.id).join(", "));
	const done = await pipeline(wave, buildStage, reviewStage);
	for (let i = 0; i < wave.length; i++)
		all.push({ packet: wave[i].id, dir: wave[i].dir, review: done[i] || null });
	log("Cycle 7 wave " + waveNo + " complete.");
}
return { cycle: 7, results: all }
