export const meta = {
	name: "archon-cycle-11",
	description:
		"DENTE cycle 11: finish a dead agent's shared-contract migration, kill a facade guard in favour of the real owner, migrate the money contract, and connect an orphan that would write invented prices",
	phases: [
		{
			title: "Build",
			detail:
				"rescue the web gate, root-cause the mount guard, the money contract, the invented-price orphan",
		},
		{
			title: "Attack",
			detail:
				"a different agent tries to destroy each commit; a blind mass conversion of .int() is REVERT-grade",
		},
	],
};

const LAW = `
You are an implementer on the DENTE dental CRM under lead [ARCHON]. Repo root: C:\\Clinic_MVP\\dental-crm
(branch main). Three other fleet agents work this tree concurrently. Stay inside your claim.

═══ A SECOND, NON-FLEET AUTHOR COMMITS TO THIS BRANCH ═══
Concentrated in apps/web/src/SettingsView.tsx, components/settings/**, components/communications/**,
App.tsx, MarketingView.tsx, VisitView.tsx, apps/api/src/server.ts. DO NOT EDIT THOSE unless your packet
names them. HEAD moves under you — re-read it, never reason from a remembered hash. If a claimed file is
dirty and you did not dirty it, STOP and report a collision. Do not revert or "fix" it.
**EXCEPTION THIS CYCLE: packet AA1 is explicitly ordered to finish an abandoned dirty file. Read your
packet: if it names the dirty file, the dirtiness is your assignment, not a collision.**

═══ THE #1 TRAP: THE GIT INDEX IS SHARED GLOBAL STATE ═══
A bare 'git commit' commits EVERYTHING staged, including another agent's 'git add'/'git rm'. In cycle 1
this happened three times and twice left HEAD unable to compile. Use ONLY:
    for i in 1 2 3 4 5 6 7 8 9 10; do git commit -F <msgfile> -- <explicit paths> && break || sleep 4; done
The '--' and path list are MANDATORY. 'git rm' stages instantly. Run 'git diff --cached --name-only'
before committing; if files you do not own are staged, do NOT unstage or reset — commit with your
pathspec and report it. **There are foreign files staged in the index RIGHT NOW**
(apps/api/src/db/rebookingConversionRulesQuery.ts and
apps/web/src/components/analytics/RebookingConversionRulesWidget.tsx). Leave them alone; your pathspec
protects you.

═══ DURABILITY — YOU MAY DIE MID-TASK. ALL SIX AGENTS OF CYCLES 9 AND 10 DIED. ═══
**NOTHING MAY EXIST ONLY IN YOUR HEAD OR ONLY IN YOUR FINAL MESSAGE.**
Cycle 10's builders survived usefully ONLY because they committed before dying — five real fixes are in
history from agents whose own final report never arrived. One of them, however, committed code that did
not compile and died before review caught it; the lead found it with a typecheck and fixed it. So:
1. FIRST ACTION, before reading anything: create your packet dir and write 'state.md'. Update at every
   milestone: STARTED -> AUTHORITY READ -> DEFECT CONFIRMED/ABSENT -> EDIT WRITTEN -> SELF-CHECK PASSED
   -> COMMITTED <hash> -> PROVEN -> DONE. Before any SLOW command, write what you are about to run.
2. **COMMIT AS SOON AS THE CODE IS RIGHT AND YOUR OWN SIGNAL IS GREEN — BEFORE THE PROOFS.**
3. **BUT NEVER COMMIT CODE YOU HAVE NOT COMPILED.** Your own signal
   ('node --import tsx --test <one file>', or 'npx tsc --noEmit <file>' on a single file) must pass FIRST.
   Committing a red tree is worse than dying with a clean one, because the next agent inherits it.
4. Never leave the tree dirty at a stopping point you control. 'git stash' is BANNED.
5. If throttled, stop expanding scope, commit the coherent part, write an openly partial handoff.

═══ READ FIRST, COMPLETE ═══
.agents/AGENTS.md (constitution, 12 mandates + §7a), .agents/INDEX.md, plus the domain doc your packet
names. Reference: .agents/archon/RECON_DOSSIER.md, VISUAL_VERDICT.md, progress.md. CONFIRM EVERY CITED
LINE. **The dossier has been caught wrong repeatedly** — it invented a Telegram UTC digest key, it
claimed integer money columns that do not exist, and the LEAD published "4 organizations" when there are
2. If it is wrong, the DOSSIER gets fixed, not the code — report it and keep going.

═══ AUTHORITY FILES KNOWN-WRONG ═══
§11 claims madge is installed — it is not on PATH, never a blocker. Three docs order
'npx @biomejs/biome check --write .' — **NEVER RUN IT**, not installed, would reformat the repo root.
§2 names write_to_file/replace_file_content (Gemini tools you lack); binding intent: never write Russian
text via shell here-string or node -e, use your Write/Edit tools. .agents/DATABASE.md and AGENTS.md:7
are corrected and trustworthy: native PostgreSQL 18 at 127.0.0.1:5432.

═══ ENVIRONMENT ═══
- apps/api = Fastify+Drizzle+pg over PostgreSQL 18 at 127.0.0.1:5432. apps/web = React 19.2 + Vite 6 +
  Tailwind v4 (CSS-first, NO tailwind.config) + Zustand 5. packages/shared is the shared contract.
- **DEV SERVER ALREADY RUNNING AND SHARED.** API 127.0.0.1:4100 (health = /api/health), web 5173.
  It runs 'tsx watch' and picks up source edits, so API VERIFIED is available. **Never restart it, never
  start a second one, never run a screenshot pipeline.** The web dev server at 5173 is currently serving
  a BROKEN module graph (three copies of one module with differing HMR stamps) — do not use 5173 as
  evidence of anything this cycle.
- node:test via tsx. **Vitest NOT installed** (fake shim in types/modules.d.ts). **Playwright has no
  config and zero .spec files.** Never write a playwright or vitest test.
- '@babel/parser' IS available and a reviewer used it successfully to walk every component. '@ast-grep/cli'
  is available as 'npx sg' for SEARCH.
- API auth: (a) import { TOKEN_SECRET } from "../routes/auth.js"; signToken({organizationId},
  TOKEN_SECRET()) as header x-dente-clinic-token (2-segment HMAC, NOT JWT); (b)
  DENTE_DEV_ALLOW_HEADER_ORG="1" + x-organization-id (dev-only by construction).
- Global pre-commit hook (core.hooksPath=C:/Users/Admin/.git-hooks) runs gitleaks. Read it if it rejects.
- **THE DATABASE IS POLLUTED AND THE LEAD POLLUTED IT.** A screenshot seeder wrote a whole fixture
  organization ('Демо-клиника для снимков', id starting d0000000). All 8 'payments' rows and every
  'visits'/'appointments' row belong to it; all 25 'tooth_states' rows belong to the real organization
  ('Стоматология, 1 кабинет', id starting 4a3420d1). **A row count is evidence ONLY split by
  organization_id with the fixture excluded.** Any query joining visits to tooth states is meaningless.

═══ ZERO MOCKS (§2) ═══
NO boilerplate, placeholders, // TODO, mock interfaces, UI placeholder data. Every line
production-ready. Only escape hatch: A SMALLER THING THAT FULLY WORKS plus an honest BLOCKER. Never a
facade returning {success:true}. This repo does not mark its stubs — find them by BEHAVIOUR.

═══ ANTI-HARDCODE (§1, §13) ═══
No ports, endpoints, credentials, magic strings, tenant UUIDs or config in code. .env + TS interfaces.
**Never substitute a fabricated 0, constant, or default for an unknown value.** **Never a hardcoded
price** — packet AA4 exists precisely because someone did that five times.

═══ READ BEFORE WRITE ═══
Read your target IN FULL before editing. Targeted-region exception only for the monoliths: main.css
(16,895), useAppLogic.tsx (14,425), shared/src/index.ts (8,236), routes/imaging.ts (6,740),
AppHelpers.tsx (6,066), DocumentsView.tsx (5,053), App.tsx (4,774), db/schema.ts (2,505), sampleData.ts.
Say WHICH region you read.

═══ BANNED ═══
NO 'node -e' that WRITES a file. NO PowerShell here-strings with Russian text. NO regex file surgery. NO
fs-scripts. NO repo-wide 'sg -r' rewrite. (One such script destroyed 10,554 Cyrillic characters here.)
Editor tools ONLY; 'node -e' fine READ-ONLY; 'sg' SEARCH preferred over regex.
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
NO 'position: fixed' and no z-index in new component CSS — the floating corner was deleted for that.

═══ COMMIT MESSAGE ═══
Write to '<packet dir>/commitmsg.txt' with your Write tool (UTF-8, no BOM). NEVER pass Russian text
through 'git commit -m'. Conventional Commits, RUSSIAN scope and subject naming THE DEFECT not the
activity, prefixed '[ARCHON] '. Body explains WHY. Voice from HEAD:
    fix(снимки): образец DICOM уходил чужой и несуществующей организации
    fix(касса): открытие вкладки дневника стирало набранную сумму и фискальный блок
    fix(документы): квитанция и возврат на верную сумму отклонялись из-за сложения в плавающей точке
BANNED words: improve, enhance, update, cleanup, refactor for clarity.
VERIFY with 'git log -1 --stat': hash, Russian subject intact (not mojibake), ONLY your files.

═══ PROOF LANGUAGE ═══
  TYPECHECK VERIFIED - exit 0. Proves only that you did not break the build. Never alone.
  UNIT VERIFIED      - node:test asserting the new logic, EXECUTED, pass output quoted.
  API VERIFIED       - real HTTP call to 127.0.0.1:4100 with a real token; status + body quoted.
  DB VERIFIED        - SQL read against 127.0.0.1:5432 showing the row actually changed, split by org.
  SMOKE VERIFIED     - named smoke exited 0, output quoted.
  UI VERIFIED        - reserved to the lead. You may NOT claim it.
  NOT VERIFIED       - with the EXACT command that would close it.
If label and evidence disagree, use the LOWER claim. Capture TRUE exit codes, not $? after a pipe.
Downgrade your own claims before a reviewer does. Unproven code is authorised. UNPROVEN CLAIMS ARE NOT.

═══ TWO STRIKES ═══
Same failure twice? STOP. Do not add wrapper glue or another checker over the same failure. Report it
and say what you would change instead. **Packet AA2 IS a two-strikes root-cause order** — read it as
the model for how the lead expects a twice-failed area to be handled: by deleting the redundant
instrument, not by sharpening it a third time.

═══ FILES YOU MUST LEAVE ON DISK ═══
  <packet dir>/state.md, commitmsg.txt, handoff.md
handoff.md: HEAD: <hash> / ## Что было сломано (file:line) / ## Что изменено / ## ПРОВЕРЕНО /
## НЕ ПРОВЕРЕНО (each with the exact closing command) / ## Коммит / ## Долг
`;

const GATE_LAW = `
═══ §7a GATE DISCIPLINE — ONE WRITER PER GATE. READ THIS BEFORE ANYTHING ELSE. ═══
The constitution was amended mid-campaign (.agents/AGENTS.md §7a) and it binds you:
**'npm run typecheck', 'npm run build', 'npm test' (workspace-wide), migrations and seeds all touch
SHARED state** — 'dist/', 'apps/web/tsconfig.tsbuildinfo', generated 'packages/shared/dist/', and the
single live PostgreSQL 18 on 127.0.0.1:5432. **One agent at a time on any of those.** Read-only
'rg'/'fd'/'sg'/'jq'/'node -e' parallelises freely.

- **DO NOT RUN 'npm run typecheck'. DO NOT RUN 'npm run build'. DO NOT RUN 'npm test' (whole workspace).**
  DO NOT run migrations or seeds. The LEAD owns those gates and runs them serially at wave end.
- **You DO run your own single test file**, which touches no shared build state:
      node --import tsx --test <path to your one test file>
  That is your compile-and-behaviour signal. Quote its true exit code and counts.
- **If your packet genuinely requires a build, a migration, or the whole suite, put the exact command in
  'leadMustRun' and STOP at that point.** The lead grants exclusive scope and runs it. Do not take the
  gate yourself because you think you are the only one running — you are not.
- **A CHANGE TO packages/shared REQUIRES 'npm run build -w @dental/shared' TO TAKE EFFECT IN apps/api.**
  apps/api imports the BUILT output, not your source. The lead lost a measurement to this exact trap
  tonight: a source fix showed a stale error until shared was rebuilt. That build is the lead's. Put it
  in 'leadMustRun' and say so loudly in your handoff.
- 'node scripts/smoke-clinical-mutation-guard.mjs' boots the real app read-only and is safe to run.
  So is 'node scripts/check-css-tokens.mjs' and 'npm run smoke:web-text-encoding'.
- There is NO per-agent database. Never run destructive SQL. Read-only SELECTs against 5432 are fine.

═══ EXPLICIT SUPERSESSIONS — THE PREAMBLE ACCUMULATED STALE LINES ACROSS ELEVEN CYCLES ═══
Where anything above conflicts with this list, THIS LIST WINS.
- Any line granting you 'npm run build' or 'npm run typecheck' as proof — DEAD, superseded by §7a.
- "apps/api/dist is TRACKED" — DEAD. It was untracked in 589d63a4d. Never stage it; it still exists on
  disk and may be stale.
- "The dev server runs WITHOUT --watch" — DEAD, that was the lead's error. The API server DOES watch.
- "typecheck -w @dental/web reports 6 pre-existing AnamnesisField errors" — DEAD, long fixed.
- **"HEAD is green" — DEAD AS A BLANKET STATEMENT THIS CYCLE.** At dispatch: apps/api typecheck is
  GREEN (0 errors, the lead fixed a committed breakage in 377bc0f13). apps/web typecheck is **RED with
  11 errors**, ALL of them the abandoned panelStateText migration, and ALL of them packet AA1's
  assignment. If you are not AA1, those 11 errors are NOT yours — do not fix them, do not report them as
  your breakage, do not touch panelStateText.ts or its consumers.
- SPEECH/DICTATION and TELEGRAM remain FROZEN (5 and 2 failed reviews). Do not edit
  apps/api/src/speech/**, routes/speech.ts, routes/telegram.ts.
- components/workspaceActions/** is the finished corner redesign. Do not disturb it.

═══ THE DIRECTOR'S CONSTITUTION — BINDING ON EVERY PACKET ═══
**§1 DEPTH, NOT FACADE.** Make it REALLY work, not imitate work. **No stubs.** If you find a
stub/mock/"TODO later", you finish it into a working element — you do not leave a half-product.
"It compiles" is NOT "it works". A feature is done when it actually functions.
**§2 HONESTY.** No optimism, no sugarcoating. Never report "done" without proof (grep/git/a real run).
A login screenshot is not a schedule screenshot. "Committed" without a hash is a lie.
**§3 A RUSSIAN GRANDMOTHER MUST UNDERSTAND IT.** Large clear elements, human language, no jargon.
Errors in human words — not «Internal Server Error» but «Не хватает материала: Карпула Артикаина».
Empty, loading and error states everywhere, each telling the user what to DO next. **And every button
must be able to keep its promise: a «Повторить» beside «сервер не знает такого раздела» is a lie in
the interface.** If the user has to wonder "what is this and where do I click", that is a failure.
**§4 NO VISUAL OVERLOAD.** Fit what already exists; do not pile on top. Clean, breathing, nothing
superfluous. Richness of features is NOT a pile of visible buttons — hide depth properly, surface only
what is needed. Beautiful AND working, not one at the other's cost.
**§5 MODULARITY.** Solo dentist / cabinet with nurses / small clinic / normal / serious. **Focus now is
solo and small.** Small practices must NOT see modules, columns and fields they do not need. Everything
through flags/presets/clinicMode, NEVER hardcoded. **ANTI-MONOLITH:** split big files into domain
components, logic in hooks, presentation separate — but the decomposition must be REAL (components
imported and used), not orphaned files.
**§8 EFFORT.** More real work, less documentation and test ceremony. Tests and docs as needed, not for
volume. Do not spread thin: finish what you started and commit it.
**§8b MONEY AND LEGAL DOCUMENTS ARE EXACT TO THE KOPECK.** No epsilon that could hide a real
one-kopeck discrepancy. No float accumulation. No rounding that destroys data.
**§10 SAFETY.** No fs-scripts / node -e writes / regex replacement across files — direct editing only.
No rm -rf on code folders; broke a file → 'git checkout' THAT file. **Do not invent backend contracts,
DB schemas, fields or role policies — what does not exist you record as debt with a reason, you do not
fantasise.** **Changing a shared/API contract means updating ALL sides synchronously** — this cycle
exists partly because an agent changed one and left seven consumers broken.
**§11 RUSSIAN, UTF-8, no mojibake.** Verify with 'npm run smoke:web-text-encoding'.

**SELF-CHECK BEFORE YOU SAY DONE — every "no" means not done:**
1. Does it really work, or only compile? 2. Any stub left? 3. Would a grandmother cope?
4. Did I overload the screen? 5. Does a small practice avoid seeing the extra?
6. Grep confirms the edit is in the file? 7. Committed, with a hash, nothing of others' touched?
8. Did I keep the green green? 9. Is the report honest, no gloss?
`;

const CYCLE11_DELTA = `
═══ CYCLE 11 DELTA — WHAT THE LEAD ESTABLISHED BY HAND TONIGHT ═══
1. **CYCLE 10 KILLED ALL SIX AGENTS ON CREDITS, AND THE BUILDERS STILL WON.** Five fixes are in
   history from agents whose final report never arrived: ca7dbeed8 (float gates a receipt),
   bfb95f971 (a hot path with no index and four schema-declared indexes that did not exist),
   731bb15b7 (a call log computed over a table nobody writes), c3cb2ada5 (three facade panels deleted
   from Marketing/SEO), 73bb37911 (waitlist could not add a patient and «выполнено» erased history),
   04abfcd57 (a consent-editor mock whose «Сохранить» silently saved nothing). Commit early. It works.
2. **AND ONE OF THEM COMMITTED A RED TREE.** ca7dbeed8 did not compile: three errors in
   renderDocument.ts. Nobody caught it because the reviewer died first. The lead fixed it in 377bc0f13
   by correcting the TYPE at the source — 'splitKopecks' now returns '[Kopecks, ...Kopecks[]]', a
   non-empty tuple, because 'parts < 1' is already rejected by a throw and the type simply was not
   saying so. **Lesson binding on you: compile your own file before you commit it.**
3. **A GENUINELY GOOD KOPECKS MODULE NOW EXISTS**: 'packages/shared/src/utils/money.ts' —
   'parseKopecks', 'sumKopecks', 'splitKopecks' (guarantees parts sum to the total exactly),
   'percentageOfKopecks' (basis points, no fractions), 'formatKopecksRu', 'rublesFromKopecks',
   'assertWholeKopecks'. **Use it. Do NOT write a second money helper beside it** — a second owner of
   an exact-money invariant is a review finding, not a contribution.
4. **THE DATABASE HAS NO INTEGER OR FLOAT MONEY COLUMNS LEFT.** All 111 'integer' columns are counters,
   optimistic-lock 'version', tooth numbers, minute windows, 'tax_year' and quotas; all 9 'real' columns
   are clinical. No 'double precision', 'bigint', 'smallint' or 'money' columns exist. **The database is
   NOT the kopecks problem. Do not "fix" it.**
5. **'z.number().int()' OCCURS 414 TIMES IN packages/shared/src/index.ts.** The money problem concerns
   roughly 45 MONEY fields, of which about 38 are wrongly '.int()'. **A blind conversion of 414 call
   sites would be a catastrophe and is REVERT-grade.** «не более 3 сообщений», 'version', 'toothNumber'
   and 'tax_year' are integers correctly and forever. The per-field inventory IS the work.
6. **THE MOUNT-REACHABILITY INVARIANT ALREADY HAS TWO WORKING OWNERS**, both inside
   'npm test -w @dental/web': 'apps/web/src/tests/panelsAreMounted.test.ts' and
   'apps/web/src/tests/patientCardDecomposition.test.ts'. The lead read the second one in full and it is
   GOOD, not a facade: its 'knownUnwiredPatientComponents' list carries a written reason per entry, and
   the reason for 'ComparativePlannerDashboard.tsx' names two concrete blockers. That is exactly the
   standard the constitution asks for. A THIRD standalone guard was built in cycle 9 and is a facade —
   see packet AA2.
7. **THE LEAD'S OWN NUMBER WAS WRONG AND IS CORRECTED**: 2 organizations, not 4. The extras were
   fixtures from a screenshot seeder the lead ran itself. The surviving finding is stronger, not weaker:
   the REAL organization also carries clinic_mode='demo', a value outside 'clinicModeSchema', coerced to
   'one_chair' by 'domainStateHydration.ts:350'.
8. Orphan status re-measured at dispatch: 'components/ConsentTemplateEditor.tsx' is GONE (deleted in
   04abfcd57). 'pages/PublicBookingWidget.tsx' has zero importers and zero dynamic imports — a true
   orphan. 'components/plan/ComparativePlannerDashboard.tsx' has zero importers and is DECLARED debt
   with a reason in the test above — that is packet AA4's subject, not an unreported orphan.
`;

const PACKETS = [
	{
		id: "AA1-panel-contract-finish",
		label: "AA1 finish the abandoned shared-contract migration",
		dir: ".agents/archon/packets/AA1-panel-contract-finish",
		gate: "node --import tsx --test apps/web/src/lib/panelStateText.test.ts  (plus npx tsc --noEmit on individual files if you want a compile signal without taking the shared gate)",
		files:
			"apps/web/src/lib/panelStateText.ts, apps/web/src/lib/panelStateText.test.ts, and EXACTLY these consumers: apps/web/src/components/finance/FamilyWalletPanel.tsx, apps/web/src/components/imaging/VisiographAnalyzer.tsx, apps/web/src/components/odontogram/TreatmentEstimator.tsx, apps/web/src/components/PatientPortal.tsx, apps/web/src/components/patients/PatientTaskTicketsWidget.tsx, apps/web/src/components/schedule/WaitlistDrawer.tsx, apps/web/src/components/settings/SettingsProtocolsTab.tsx, apps/web/src/components/useVisitDiaryLogic.ts, apps/web/src/hooks/useMaxSettings.ts, apps/web/src/hooks/useWhatsappSettings.ts, apps/web/src/ImagingView.tsx, and whichever component renders PanelLoadFailure",
		brief: `
YOU ARE FINISHING A DEAD AGENT'S WORK, AND THE WORK IS GOOD. This is a rescue, not a cleanup.

**THE SITUATION, MEASURED BY THE LEAD AT DISPATCH.** 'npm run typecheck -w @dental/web' fails with
exactly 11 errors. All 11 come from ONE dirty uncommitted file — 'apps/web/src/lib/panelStateText.ts' —
whose author changed a SHARED CONTRACT and died on credits before updating the consumers. §10 of the
constitution says a shared contract must be updated on all sides synchronously. It was not. The web gate
has been red ever since.

**THE LEAD CONSIDERED REVERTING IT AND REFUSED, FOR REASONS YOU MUST PRESERVE.** Read
'git diff -- apps/web/src/lib/panelStateText.ts' in full before anything else. The change does three
things and each one is correct:

  (a) 'PanelSubject.title' becomes 'PanelSubject.notLoadedTitle', and it now holds the WHOLE refusal
      clause instead of a noun the module suffixed with «не загружены». The old shape only worked
      because all three panels then in existence had plural names. Any singular name — «Статус» —
      produced «Статус не загружены», which is illiterate Russian shipped to a dentist.
  (b) 'PanelText.retryable: boolean' becomes 'PanelText.retryLabel: string | null', with a new
      'panelRetryLabel(status)'. The old boolean was always true on failure and nobody read it —
      'PanelLoadFailure' drew «Повторить» from the mere presence of an 'onRetry' prop. So the product
      offered a retry button next to «сервер не знает такого раздела», where retrying the identical
      request can never help. §3: a button that cannot keep its promise is a lie in the interface.
  (c) The 400/422 message stops saying «обновите страницу и повторите». Refreshing rebuilds the exact
      same request and earns the exact same rejection.

**YOUR JOB.**
1. Read the dirty 'panelStateText.ts' IN FULL, then read the committed version
   ('git show HEAD:apps/web/src/lib/panelStateText.ts') to see precisely what moved. Do not redesign it.
   If you find a genuine flaw in the dead agent's design, say so in 'foundNotFixed' and still finish the
   migration — a half-migrated contract is worse than either shape.
2. For EACH of the ten consumers, supply a grammatically correct 'notLoadedTitle'. **This is the real
   work and it cannot be done mechanically.** Open each consumer, find what the panel actually shows,
   and write the refusal clause that agrees with that noun in number and gender. «Задачи по пациенту не
   загружены». «Семейный кошелёк не загружен». «Статус блокировки не прочитан». A find-and-replace that
   appends «не загружены» to every existing title reproduces the exact defect this change removes, and
   the reviewer is instructed to look for it.
3. Wire 'retryLabel' through to the markup. Find the component that renders 'PanelLoadFailure' (or
   equivalent) and make the button's presence AND its caption come from 'retryLabel', so that
   'retryLabel === null' renders NO button at all. Right now the decision is made twice — once in the
   module and once by 'onRetry' being non-undefined. **After you are done there must be exactly one
   decision.** If removing the button leaves the failure state with nothing actionable, §3 requires the
   hint to tell the user what to do instead (e.g. «сообщите администратору»); check the hint already
   does that and say whether it does.
4. Update 'panelStateText.test.ts' — 4 of the 11 errors are in it. It must ASSERT the new behaviour, not
   merely compile: at minimum that a 404 yields 'retryLabel === null', that a 401/403 yields a label
   naming sign-in, and that no refusal string contains a number-agreement error you could have avoided.
   A test that would still pass with the fix reverted is not a test.
5. 'apps/web/src/ImagingView.tsx(372,37): Cannot find name countLabel' is the eleventh error and is a
   SEPARATE abandoned half-edit by the same wave. Read the surrounding function, work out what
   'countLabel' was meant to be, and either finish it correctly or restore the line to its committed
   form. **Do not invent a label to silence the compiler** — read 'git diff' on that file to see what
   the author was doing.

**WHAT SUCCESS LOOKS LIKE.** 'npm run typecheck -w @dental/web' would report 0 errors. You are FORBIDDEN
from running it (§7a) — put it in 'leadMustRun' and let the lead confirm. Your own signal is
'node --import tsx --test apps/web/src/lib/panelStateText.test.ts'.

**TRAP.** Several of the ten consumers are ALSO dirty from other agents' in-flight work
('WaitlistDrawer.tsx' certainly is). Your claim covers them for the contract fields ONLY. Touch the
'PanelSubject' literal and nothing else in those files; if you must change a line that is not part of
this migration, stop and report it in 'blockers'.
`,
	},
	{
		id: "AA2-guard-root-cause",
		label: "AA2 two strikes: delete the facade guard, arm the real owner",
		dir: ".agents/archon/packets/AA2-guard-root-cause",
		gate: "node --import tsx --test apps/web/src/tests/panelsAreMounted.test.ts and node --import tsx --test apps/web/src/tests/patientCardDecomposition.test.ts",
		files:
			"the cycle-9 reachability guard script and its allowlist and its test (find them yourself — start from .agents/archon/packets/Y3-mount-chain-guard/), apps/web/src/tests/panelsAreMounted.test.ts, apps/web/src/tests/patientCardDecomposition.test.ts, package.json scripts ONLY if you must register a gate, and apps/web/src/pages/PublicBookingWidget.tsx",
		brief: `
THIS IS A TWO-STRIKES ROOT-CAUSE ORDER. THE INSTRUMENT GETS DELETED, NOT SHARPENED.

Cycle 9's packet Y3 shipped a standalone "mount reachability guard". Its deletion half was clean and
stays. Its GUARD half was reviewed and failed, and the failure is structural, not a bug to patch:

  1. **The census is false by construction.** An independent '@babel/parser' walk finds 198 exported
     JSX-bearing components; the guard's 'ast-grep' pattern matches 159. The 39-component gap is
     'export const X: React.FC = …' plus one return-typed function — shapes the pattern cannot express.
     A guard that cannot see a fifth of the components cannot certify reachability.
  2. **The allowlist does not validate its own reason field**, although the packet claimed it did. An
     entry with 'reason: ""' still prints «[НАРУШЕНИЕ]» and the run then reports «нарушений 0» and exits
     0. Worse, '{ path: "apps/web/src", reason: "" }' silences all 31 violations in four lines — a wider
     escape hatch than the '--root' flag the commit message boasts of NOT shipping.
  3. **It is wired to no gate at all.** It appears in no npm script and no CI. Its own test is
     unreferenced and takes 4m33s, not the 11-23s claimed.
  4. **The invariant already had two working owners**, both running inside 'npm test -w @dental/web':
     'tests/panelsAreMounted.test.ts' (born from the same AppRouter.tsx incident) and
     'tests/documentsViewDecomposition.test.ts' / 'tests/patientCardDecomposition.test.ts'. They
     directly contradict the new guard: 'DocumentUkepSignButton' is a «[НАРУШЕНИЕ]» to the new one and
     an accepted exception WITH A WRITTEN REASON to the old one.

**THE LEAD HAS READ 'patientCardDecomposition.test.ts' IN FULL AND JUDGES IT GOOD.** Its
'knownUnwiredPatientComponents' list demands a written reason per entry, and the reason it carries is
specific and true. That is the design to extend. Your order:

1. **DELETE the standalone guard, its allowlist and its test.** Then obey the campaign's hard-won
   deletion rule: 'git grep -n "<BaseName>" HEAD -- .' over the WHOLE REPO, not just 'apps/' — an
   earlier packet used '-- apps/' and left a dangling import in 'scripts/' that broke a smoke at load.
   Check 'package.json' scripts too. Quote the command and its empty output.
2. **Arm the surviving owners with a real parser.** Both existing tests hand-list what they watch —
   'panelsAreMounted.test.ts' hand-lists 7 panels. Replace the hand-listing and any 'ast-grep' pattern
   with a '@babel/parser' walk (it is installed; the reviewer used it) so that 'React.FC'-annotated
   components are visible. Keep the allowlist-with-a-reason design, and **make an empty or whitespace
   reason a hard test failure**, along with an entry whose path no longer exists (a stale exception is
   how an allowlist rots into a blanket). Keep it inside 'npm test -w @dental/web' — do NOT add a new
   npm script if the suite already runs it; a gate nobody runs is the defect you are removing.
3. **Runtime matters.** The deleted test took 4m33s. Whatever you build runs inside the web suite, so
   measure and report its wall-clock. If a full parser walk of 198 components is slow, parse once and
   reuse — do not spawn a process per file. State the measured seconds.
4. **'apps/web/src/pages/PublicBookingWidget.tsx' is a TRUE unreported orphan** — the lead confirmed
   zero importers and zero dynamic imports at dispatch. Decide it and act, do not just log it: either
   (a) mount it where it genuinely belongs, or (b) delete it, or (c) add it to the allowlist WITH a
   specific written reason of the quality the existing list sets. **Read the file before deciding**; a
   public booking widget with live endpoints is a feature the product wants, and deleting a working one
   to satisfy a checker would be the wrong call. Say which you chose and why, in Russian, in the commit
   body.

**WHAT WOULD MAKE THIS PACKET FAIL REVIEW.** Building a fourth checker. Keeping the deleted guard "just
in case". An allowlist that still accepts a blank reason. A test that passes because it watches nothing.
Reporting a runtime you did not measure.
`,
	},
	{
		id: "AA3-money-contract",
		label: "AA3 the shared contract rejects kopecks in ~38 money fields",
		dir: ".agents/archon/packets/AA3-money-contract",
		gate: "node --import tsx --test packages/shared/src/tests/money.test.ts (existing) plus your own new test file",
		files:
			"packages/shared/src/index.ts (money fields ONLY), packages/shared/src/tests/** for your test, and the API/web call sites you must synchronise — name each one in filesChanged",
		brief: `
THE PRODUCT CANNOT ACCEPT 1500 РУБ 50 КОП THROUGH MOST OF ITS OWN CONTRACT.

**THE DEFECT, AND IT IS NOT ROUNDING.** In 'packages/shared/src/index.ts' roughly 38 of about 45 money
fields are declared 'z.number().int()'. That does not round '1500.50' — it **REJECTS** it with a
validation error. Meanwhile the correct schema already exists a few lines up and is well built:
'moneyRubSchema' at ':23-25' over 'kopecksAreExact' at ':20-21', which deliberately avoids the naive
'value % 0.01 === 0' and explains why in a comment at ':12-13'. It is wired to FIVE fields. So one
payment may carry kopecks and almost nothing downstream may, and a total therefore cannot equal the sum
of its parts.

**THE TRAP THAT MAKES THIS DANGEROUS, READ IT TWICE.** 'z.number().int()' occurs **414 times** in that
file. The overwhelming majority are correct and must never change: 'version' for optimistic locking,
'toothNumber', 'tax_year', minute windows, quotas, «не более 3 сообщений». **A mass conversion is
REVERT-grade and the reviewer is told to check for one.** The per-field inventory is not paperwork — it
IS the deliverable.

**ORDER OF WORK.**
1. **INVENTORY FIRST, BEFORE ANY EDIT.** Enumerate every money-bearing field in the contract with
   'file:line', its current schema, and a verdict of one of exactly three: MUST BE KOPECK-EXACT /
   CORRECTLY INTEGER (with the reason it is a count, not money) / UNCERTAIN (with what you would need to
   know). Put every row in 'inventories'. Identify fields by MEANING, not by a name pattern:
   'amountRub', 'totalRub', 'priceRub', 'discountRub', 'depositRub', 'balanceRub', 'payoutRub' and any
   field whose value is money under another name. A field named '…Rub' that counts something is still a
   count; a field not named '…Rub' that holds money is still money.
2. **Migrate only the MUST BE KOPECK-EXACT rows**, to 'moneyRubSchema'. Do not invent a new schema; do
   not write a second money helper — 'packages/shared/src/utils/money.ts' already provides
   'parseKopecks', 'sumKopecks', 'splitKopecks', 'percentageOfKopecks', 'formatKopecksRu'. A second
   owner of an exact-money invariant is a review finding.
3. **§10, SYNCHRONOUSLY, AND THIS IS THE PART THAT USUALLY GETS SKIPPED.** Every widened field has
   consumers on both sides. For each one ask: does an API handler do integer arithmetic on it? Does a
   web component format it with 'toFixed(0)' or print it raw? Does a DB write pass it to a column that
   is 'numeric(x,2)'? **A field widened in the contract and still floored in the handler is worse than
   before**, because validation now accepts money the code then silently destroys. Trace at least the
   payment and treatment-plan paths end to end and report each link.
4. **PROVE IT WITH A TEST THAT WOULD FAIL IF REVERTED.** Feed '1500.50' to a migrated schema and assert
   it PARSES; feed '1500.505' and assert it is REJECTED (a third of a kopeck is not money); feed
   '1500.50' to a schema you judged CORRECTLY INTEGER and assert it is still rejected — that last
   assertion is what proves you did not mass-convert.
5. **You cannot make this take effect yourself.** apps/api imports the BUILT 'packages/shared/dist'.
   Put 'npm run build -w @dental/shared' and both typechecks in 'leadMustRun' and say plainly in the
   handoff that your change is inert until the lead builds shared. The lead lost a measurement to
   exactly this trap tonight.

**IF THE INVENTORY SHOWS FEWER THAN 38 WRONG FIELDS, SAY SO AND REPORT THE REAL NUMBER.** The figure
came from a recon agent and this campaign has already published three numbers that dissolved under
re-measurement. Your inventory outranks the brief.
`,
	},
	{
		id: "AA4-invented-prices",
		label:
			"AA4 a 1189-line planner cannot be mounted because it invents prices",
		dir: ".agents/archon/packets/AA4-invented-prices",
		gate: "node --import tsx --test on your own new test file for the import path",
		files:
			"apps/web/src/components/plan/ComparativePlannerDashboard.tsx, apps/web/src/tests/patientCardDecomposition.test.ts (the allowlist reason ONLY, and only if you actually earn the right to shorten it), and the price-catalogue module you must read to do this correctly",
		brief: `
A WHOLE FEATURE IS QUARANTINED BECAUSE IT WOULD WRITE INVENTED MONEY INTO A TREATMENT PLAN.

**THE SITUATION.** 'apps/web/src/components/plan/ComparativePlannerDashboard.tsx' is 1189 lines, has
live endpoints behind it (GET/POST /api/patients/:patientId/treatment-plans, GET
/api/insurance/contracts), and is the ONLY reader of the 'pendingPlanSuggestions' queue that the mounted
odontogram fills. So the bridge «диагноз → смета» is currently severed. It is not a silent orphan: it is
DECLARED debt in 'apps/web/src/tests/patientCardDecomposition.test.ts', in a
'knownUnwiredPatientComponents' entry with a written reason. **The lead read that reason and verified
it.** It names two blockers, and one of them is a money defect:

  'importSuggestions' (line ~319) substitutes hardcoded prices when a service is absent from the
  catalogue. The lead confirmed FIVE hardcoded rouble values by hand: 'priceRub: 4000' (:343),
  '8000' (:349), '35000' (:355), '15000' (:361), '35000' (:367). The declared reason says four — it is
  honest but understated, and that correction belongs in your report. Mounted as-is, this component
  would write prices no clinic set into a document the patient signs.

**YOUR JOB IS THE MONEY DEFECT. IT IS NOT "MOUNT THE COMPONENT".**
1. Read the file in full. Read 'importSuggestions' and everything it feeds.
2. Find how the rest of the product resolves a service price — there IS a real price path, and this
   campaign has already proven a related defect in it (the API only replaces the compiled-in demo
   catalogue 'if (serviceRecords.length > 0)' in 'apps/api/src/db/domainStateHydration.ts:775', and
   'pricelistQuery.ts:23' reads the table directly). **Read those before you decide.** Use the real
   path; do not invent a new one and do not fabricate a fallback price.
3. **Replace every hardcoded price with the clinic's own price.** When the service genuinely is not in
   the catalogue, the honest behaviours are: leave the amount EMPTY and tell the user which service is
   missing from the price list, in human Russian per §3 — «Услуги «Имплантация» нет в вашем прайсе.
   Добавьте её, чтобы посчитать план.» — or refuse the import for that row and name it. **A fabricated
   0 is explicitly banned by §1/§13 and is no better than 35000.** Choose, implement it fully, and say
   which you chose.
4. Use 'packages/shared/src/utils/money.ts' for any arithmetic. Do not write a second money helper. Any
   sum of plan rows must be exact to the kopeck (§8b).
5. **The second blocker is NOT yours to resolve.** The declared reason also says 'TreatmentEstimator' is
   already mounted on the same endpoint and the same POST, and that dividing responsibility between the
   two tools is the LEAD'S decision, not a rename. **Respect that: do not mount this component.** Fix
   the money defect so that mounting becomes possible, then report to the lead what the division of
   responsibility would have to be — what each tool is for, what would break if both wrote plans, and
   what you recommend. That recommendation is genuinely wanted; the decision is not yours to take.
6. If and only if you have removed the money blocker, you may EDIT THE REASON in
   'knownUnwiredPatientComponents' so it names only the blocker that remains. Do not remove the entry —
   the component is still unmounted, and a test that stops watching it is a regression. Keep
   'node --import tsx --test apps/web/src/tests/patientCardDecomposition.test.ts' green and quote it.

**WHAT WOULD MAKE THIS FAIL REVIEW.** Mounting the component. Substituting 0 for an unknown price. A
new price-resolution path beside the existing one. An English error string. Deleting the debt entry.
Claiming the file is reachable when you did not mount it.
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
		"inventories",
		"leadMustRun",
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
		reachability: {
			type: "string",
			description: "EVERY link of the call chain, not two of three.",
		},
		measurements: {
			type: "array",
			items: { type: "string" },
			description:
				"Real reproducible numbers with the command that produced them.",
		},
		inventories: {
			type: "array",
			items: { type: "string" },
			description:
				"The inventory your brief demanded, with file:line and a per-item verdict. On AA3 this is the primary deliverable.",
		},
		leadMustRun: {
			type: "array",
			items: { type: "string" },
			description:
				"Exact shared-state commands the LEAD must run under §7a. Mandatory for any packages/shared change.",
		},
		constitutionCheck: { type: "array", items: { type: "string" } },
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
			GATE_LAW +
			CYCLE11_DELTA +
			"\n═══════════════════════════════════════════════════════════════\n" +
			"YOUR PACKET: " +
			p.id +
			"\n" +
			"YOUR ROLE: implementer with full file-edit and commit rights, bounded to the claim below (§7a).\n" +
			"WHY THIS IS DELEGATED: the lead confirmed each defect by hand at real lines but not its blast\n" +
			"radius, and the inventory and per-consumer judgement work each need a context of their own.\n" +
			"YOUR FILE CLAIM — OWNED read/edit scope: " +
			p.files +
			"\n" +
			"FORBIDDEN SCOPE: any file not in your claim; apps/api/src/speech/**, routes/speech.ts,\n" +
			"routes/telegram.ts (frozen); components/workspaceActions/** (finished corner redesign);\n" +
			"apps/api/dist/**; apps/web/tsconfig.tsbuildinfo; every shared gate of §7a. If you are NOT AA1,\n" +
			"apps/web/src/lib/panelStateText.ts and its consumers are forbidden and their 11 typecheck errors\n" +
			"are not yours.\n" +
			"YOUR OWN SIGNAL (safe, no shared state): " +
			p.gate +
			"\n" +
			'EVIDENCE STANDARD: every "proven" entry is a command you actually ran, with its TRUE exit code and\n' +
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
			"    STOP and report the collision — UNLESS your brief names that dirty file as your assignment.\n" +
			" 4. Read your target file(s) IN FULL (targeted region for a monolith, and SAY which region).\n" +
			"    Confirm the defect at real lines. state.md == DEFECT CONFIRMED / ABSENT. If absent, say so\n" +
			"    loudly; never invent work to justify the packet.\n" +
			" 5. Produce the INVENTORY your brief demands BEFORE changing behaviour. A fix that repairs the two\n" +
			"    sites the brief named and leaves five unnamed ones is the half-closed chain this campaign keeps\n" +
			"    rejecting.\n" +
			" 6. Build the real fix. No stub, no facade, no half-product (§1). state.md == EDIT WRITTEN.\n" +
			" 7. Run YOUR OWN signal only (never the shared gates — §7a). **A commit that does not compile is\n" +
			"    what happened in cycle 10 and it cost the lead a repair commit.** state.md == SELF-CHECK PASSED.\n" +
			' 8. **COMMIT NOW** — pathspec form "git commit -F <msg> -- <paths>", retry loop for .git/index.lock,\n' +
			"    then verify with git log -1 --stat. state.md == COMMITTED <hash>. Do NOT wait for proofs:\n" +
			"    every agent in the previous two cycles died on credits, and the ones who committed early are\n" +
			"    the only reason those cycles produced anything.\n" +
			" 9. Proofs. A second commit for the test. state.md == PROVEN.\n" +
			"10. Write " +
			p.dir +
			"/handoff.md. state.md == DONE.\n" +
			'11. Emit structured output, including "inventories", "leadMustRun" and "constitutionCheck".\n' +
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
				"/state.md; work may already be committed.",
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
			"/review.md AS YOU GO — every reviewer in the last two cycles died\n" +
			"mid-task on credit exhaustion, and the ones who wrote nothing to disk contributed nothing.\n\n" +
			"THE DISEASE HERE IS FABRICATED PROOF. The charge sheet, which is your standard:\n" +
			"- 49 cited proof_*.png files that do not exist.\n" +
			"- 14 filenames holding 2 unique images, one a Vite CSS error overlay under ten view names.\n" +
			"- A handoff asserting «текст не уничтожен», refuted by run output.\n" +
			"- A measurement taken against a baseline the packet itself proved impossible.\n" +
			"- A smoke green only because it loaded a dist built BEFORE the fix.\n" +
			"- A commit message describing a defect that does not reproduce at its own parent.\n" +
			"- A guard reporting «нарушений 0» and exit 0 in the same run where it printed «[НАРУШЕНИЕ]».\n" +
			"- A census that could not see 39 of 198 components and certified reachability anyway.\n" +
			"- The LEAD publishing «45 hollow modules of 50» (a regex artefact) and «4 organizations» (fixtures\n" +
			"  from a seeder the lead itself ran; the real number is 2).\n" +
			"- A commit in cycle 10 that did not compile, because its reviewer died before reaching it.\n" +
			"Default posture: disbelief. Reproduce claims; never read them. Re-derive every number with a\n" +
			"DIFFERENT instrument than the builder used. Verify EVERY link of any reachability claim.\n\n" +
			"**FIRST, THE CHEAPEST AND MOST IMPORTANT CHECK: DOES IT COMPILE?** Run the typecheck for the\n" +
			"workspace this packet touched. You are permitted the shared gates; the builder was not, so do NOT\n" +
			"mark it down for having skipped them — but DO mark it down if the committed code is red inside its\n" +
			"own claim. Note: at dispatch apps/web had 11 KNOWN errors, all in the panelStateText migration,\n" +
			"which is packet AA1's assignment. If you are reviewing AA1, those errors going to 0 is the point.\n" +
			"If you are reviewing anyone else, those 11 are not their fault. **A change to packages/shared does\n" +
			'not reach apps/api until "npm run build -w @dental/shared" runs** — if the packet touched shared and\n' +
			"you did not rebuild it, your typecheck result describes yesterday's code. Rebuild first.\n\n" +
			"Read .agents/AGENTS.md COMPLETE plus .agents/INDEX.md. Do NOT penalise the builder for defying the\n" +
			"madge order (not installed) or the biome order (not installed). Do not apply a migration. Do not\n" +
			"restart any server. The web dev server at 5173 is serving a broken module graph — it is not evidence.\n\n" +
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
			"REACHABILITY: " +
			(built.reachability || "(none)") +
			"\n" +
			"MEASUREMENTS: " +
			JSON.stringify(built.measurements || []) +
			"\n" +
			"INVENTORIES: " +
			JSON.stringify(built.inventories || []) +
			"\n" +
			"LEAD MUST RUN: " +
			JSON.stringify(built.leadMustRun || []) +
			"\n" +
			"FOUND NOT FIXED: " +
			JSON.stringify(built.foundNotFixed || []) +
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
			"   - Was the defect REAL before this commit? Reproduce it at the parent with YOUR OWN instrument.\n" +
			"   - **Is the fix REACHABLE — every link?** Trace from a real route or a real mounted component to\n" +
			"     the changed line. A fix in an unmounted file is a fix to nothing; one packet this campaign\n" +
			"     fixed a dead file and certified it with its strongest label.\n" +
			"   - **Did it fix every site, or only the ones the brief named?** Re-derive the inventory yourself\n" +
			"     with a different tool and compare item by item. Report any site the builder missed.\n" +
			"   - **MASS-CONVERSION CHECK (AA3 especially).** If the packet changed schemas, count how many it\n" +
			"     changed and audit a sample of them individually. A field that is a COUNT converted to accept\n" +
			"     fractions is a REVERT-grade regression: «не более 3.5 сообщений» is nonsense the contract would\n" +
			"     now accept. Also check the reverse — a money field left integer.\n" +
			"   - **SHARED CONTRACT SYNCHRONY (§10).** Find a consumer that still assumes the old shape. Grep for\n" +
			"     it; do not trust a claim that all sides were updated. This cycle exists because that claim was\n" +
			"     false once already.\n" +
			"   - **HUMAN LANGUAGE (§3).** Any new user-facing string: is it Russian, grammatically agreeing with\n" +
			"     its noun, and does it tell the user what to DO? Does any button still promise something it\n" +
			"     cannot deliver? Does any message interpolate a raw float or an unformatted number?\n" +
			"   - **INVENTED VALUES (§1/§13).** Any hardcoded price, fabricated 0, magic constant, hardcoded hex\n" +
			"     or px, tenant UUID, or default substituted for an unknown?\n" +
			"   - HOLLOW FACADE? SECOND OWNER (a new money helper beside packages/shared/src/utils/money.ts, or a\n" +
			"     fourth reachability checker)? Missing teardown? Mojibake in the diff or the commit subject?\n" +
			"   - **DO THE NEW TESTS ACTUALLY ASSERT?** Check their fixtures exist at HEAD. Then apply the real\n" +
			"     standard: **would the test FAIL if the fix were reverted?** If you can, prove it — revert the\n" +
			"     change in a scratch copy or reason precisely about which assertion breaks. A test that passes\n" +
			"     either way is ceremony, and §8 forbids ceremony.\n" +
			"   - **IF THE PACKET DELETED ANYTHING**: run \"git grep -n '<BaseName>' HEAD -- .\" over the WHOLE\n" +
			"     REPO including scripts/ and package.json, not just apps/. That hole broke a smoke once.\n" +
			"3. PROOF AUDIT: RE-RUN EVERY CLAIMED PROOF COMMAND YOURSELF, capturing the TRUE exit code.\n" +
			"4. GIT HYGIENE: only the claimed files? Any churn or another author's work swept in via the shared\n" +
			"   index? Was apps/api/dist or tsconfig.tsbuildinfo staged? Russian subject naming the DEFECT?\n" +
			"5. VERDICT. Reserve REVERT for a change actively worse than the defect — a mass schema conversion, a\n" +
			"   tolerance that hides a real one-kopeck mismatch, a fabricated price, or a deleted guard replaced\n" +
			"   by nothing. Never award SOUND to a claim you could not reproduce. If NEEDS_REWORK, make\n" +
			"   requiredRework numbered, specific and actionable.\n\n" +
			"CONSTRAINTS: read-only on source — no edit, fix, commit, revert, git add. Never git remote -v (live\n" +
			"tokens). Never npx @biomejs/biome. You MAY run typechecks, builds, tests, smokes, read-only node -e,\n" +
			"curl to 127.0.0.1:4100, read-only SQL split by organization_id, and you MAY open PNG files.",
		{ label: "attack:" + p.id, phase: "Attack", schema: REVIEW_SCHEMA },
	);
}

const all = [];
log("Cycle 11: " + PACKETS.map((p) => p.id).join(", "));
const done = await pipeline(PACKETS, buildStage, reviewStage);
for (let i = 0; i < PACKETS.length; i++)
	all.push({
		packet: PACKETS[i].id,
		dir: PACKETS[i].dir,
		review: done[i] || null,
	});
log("Cycle 11 complete.");
return { cycle: 11, results: all }
