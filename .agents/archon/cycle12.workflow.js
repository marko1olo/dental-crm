export const meta = {
	name: "archon-cycle-12",
	description:
		"DENTE cycle 12: kopecks destroyed in the AI pricelist mode, a topbar that demotes the primary action to its own row, and eight invented prices in a mounted estimate",
	phases: [
		{
			title: "Build",
			detail:
				"the groq-mode rounding, the topbar overload, the fabricated prices and service ids",
		},
		{
			title: "Attack",
			detail:
				"a different agent tries to destroy each commit; a fabricated 0 for an unknown price is REVERT-grade",
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
**NO PACKET THIS CYCLE IS ALLOWED TO EDIT A DIRTY FILE.** Every target was verified CLEAN at dispatch.
'apps/web/src/components/settings/SettingsPricesTab.tsx' is dirty and is deliberately in NO packet even
though it holds a real kopeck defect — see delta item 7.

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
  start a second one, never run a screenshot pipeline.** The 5173 module graph was broken in an earlier
  cycle and has since HEALED (the lead verified a single HMR stamp per module), but a dev server serves
  whatever is on disk, and three agents are editing web source right now — so 5173 is not evidence of
  anything while this wave runs.
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
price** — packet BB3 exists precisely because someone wrote eight of them into a mounted estimate, and a
fabricated 0 substituted for an unknown price is REVERT-grade this cycle.

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
and say what you would change instead. **The model the lead expects, from a real cycle-11 packet:** a
mount-reachability guard had failed twice, so the order was to DELETE the redundant instrument and arm
the two owners that already worked — not to sharpen it a third time. That packet was the only
SOUND_WITH_NITS of its cycle. Prefer removing a broken instrument over adding a checker above it.

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
- **"apps/web typecheck is RED with 11 errors from the panelStateText migration" — DEAD.** That migration
  was completed in cycle 11 and its errors are gone. **At THIS dispatch BOTH typechecks report 0 errors**
  and the lead measured them itself. So a typecheck error you see is either yours or another author's
  in-flight edit — it is not a known pre-existing condition you may wave away.
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

const CYCLE12_DELTA = `
═══ CYCLE 12 DELTA — EVERY ITEM HERE THE LEAD MEASURED BY HAND AT DISPATCH ═══
1. **BOTH GATES ARE GREEN AND THE ROUTE GATE IS FRESH.** typecheck api 0 errors, typecheck web 0 errors,
   'npm run build -w @dental/shared' 0, 'npm run build -w @dental/api' 0, 'smoke:web-text-encoding' 0,
   'node scripts/smoke-clinical-mutation-guard.mjs' ok:true over 438 routes / 187 mutating with
   'staleOutputCount: 0'. **Do not break the green.** If you see a typecheck error outside your claim it
   is another author's in-flight edit — note it, move on.
2. **A GOOD KOPECKS MODULE EXISTS AND IS THE ONLY PLACE MONEY MAY BE COUNTED**:
   'packages/shared/src/utils/money.ts' — 'parseKopecks', 'sumKopecks', 'splitKopecks' (parts sum to the
   total exactly), 'percentageOfKopecks' (basis points), 'formatKopecksRu' («1 500,50 ₽»),
   'kopecksToNumericString' («1500.50», for messages that already say «руб.»), 'rublesFromKopecks',
   'assertWholeKopecks'. **Do NOT write a second money helper.** A second owner of an exact-money
   invariant is a review finding, not a contribution — this campaign has now found three of them.
3. **THE DATABASE AND THE SHARED CONTRACT ARE NO LONGER THE KOPECKS PROBLEM.** Zero integer or float
   money columns remain. In 'packages/shared/src/index.ts' 38 money fields were migrated to
   'moneyRubSchema' and an independent runtime probe of 2072 number leaves found **zero '...Rub' leaves
   that reject 1500.50**. Do not "fix" either. Note also: 'z.number().int()' still occurs ~414 times
   there and almost all are correct counters ('version', 'toothNumber', 'tax_year', «не более 3
   сообщений»). **A blind conversion is REVERT-grade.**
4. **THE REMAINING MONEY DAMAGE IS DOWNSTREAM OF THE CONTRACT, WHICH IS WHY THIS CYCLE EXISTS.** Two
   sites the lead already fixed, as worked examples of the standard: 'renderDocument.ts' and
   'guards.ts' each compared money with a raw float '!=='. Measured: three kopeck-exact payments of
   300.01 + 300.05 + 300.07 sum to 900.1299999999999 in one order and 900.13 in the other, so a
   LEGITIMATE receipt was refused and the doctor read two numbers the eye cannot distinguish. Both now
   compare integer kopecks — **no epsilon**, because an epsilon that hides float drift also hides a
   genuine one-kopeck discrepancy, and that is a money-document gate.
5. **THE FDI TOOTH RULE NOW LIVES IN THE SHARED CONTRACT**, not on the server only:
   'VALID_FDI_TOOTH_NUMBERS' (52 teeth), 'isValidFdiToothNumber', 'fdiToothNumberSchema',
   'FDI_TOOTH_NUMBER_MESSAGE'. Use them; never re-type the tooth list. Before this, the client filtered
   on 'Number.isFinite', so 19 passed and the server rejected the WHOLE treatment plan.
6. **THE LEAD HAS BEEN WRONG FOUR TIMES TONIGHT AND EACH ONE TEACHES THE SAME LESSON.** «4
   organizations» (fixtures from a seeder the lead ran itself; really 2). «AA3 verdict REVERT» (a
   'grep -m1' matched the word REVERT in prose; the verdict is NEEDS_REWORK). «ImagingView countLabel is
   broken» (a neighbouring commit had already fixed it; the builder proved the absence instead of
   inventing a label — credit). «Two auth routes validate the body before authorisation» (that was a
   PROBE CONFIGURATION in the gate whose comment described pre-fix code; both handlers say «СНАЧАЛА
   ПРАВА, ПОТОМ ТЕЛО» and were already correct). **A stale comment in a tool is as dangerous as a stale
   build.** If your brief contradicts what you measure, YOUR MEASUREMENT WINS — say so loudly.
7. **A FILE ANOTHER AGENT HAS DIRTY IS OFF LIMITS EVEN IF YOUR BRIEF WOULD BENEFIT.**
   'apps/web/src/components/settings/SettingsPricesTab.tsx' is dirty and has been for hours. It contains
   a real defect — ':740' saves prices via 'parseInt(e.target.value) || 0', destroying kopecks at the
   point of ENTRY and substituting a fabricated 0 — and it is NOT in any packet this cycle for that
   reason. Do not touch it. **Step 0 of every edit: 'git status --porcelain -- <path>'.** The lead
   skipped that step and swept ~700 lines of another author's work into its own commit.
8. **THE CAPTURE PIPELINE IS THE LEAD'S AND IS OFF LIMITS TO YOU.** It was producing false evidence:
   every desktop shot showed a COLLAPSED sidebar under a default-state filename, and a 5,851-byte pure
   white PNG passed the theme audit and was logged as a success. Both holes are closed. **You may not
   claim UI VERIFIED and may not run a screenshot script.**
`;

const PACKETS = [
	{
		id: "BB1-groq-mode-rounds-kopecks",
		label: "BB1 the AI pricelist mode still rounds kopecks away",
		dir: ".agents/archon/packets/BB1-groq-mode-rounds-kopecks",
		gate: "node --import tsx --test apps/api/src/pricelist/pricelistKopecks.test.ts and node --import tsx --test apps/api/src/pricelist/analyzer.test.ts (both exist and pass today: 16/16 and 6/6)",
		files:
			"apps/api/src/pricelist/analyzer.ts, its test files under apps/api/src/pricelist/, and packages/shared/src/migration.ts",
		brief: `
THE PRICELIST WAS TAUGHT KOPECKS IN ONE PARSER MODE AND STILL DESTROYS THEM IN THE OTHER.

**WHAT WAS ALREADY FIXED, SO YOU DO NOT REDO IT.** Cycle 11 made the DETERMINISTIC pricelist parser
kopeck-exact. An adversarial reviewer verified it by executing both the old and new code over a 25-line
Russian pricelist: «Лечение кариеса 1500,50» went from 1500 to 1500.5, «Пломба композитная 2300,25» from
2300 to 2300.25, and the parent even returned **505 roubles** for «Реставрация 1500,505». Price
regressions introduced: zero. That half is done and is not your packet.

**YOUR DEFECT — THE SAME FILE, 350 LINES BELOW, IN THE MODE THE PRODUCT SELLS AS «серверная
нейро-проверка».** 'apps/api/src/pricelist/analyzer.ts:733-737':

    function asNumberOrNull(value: unknown): number | null {
      if (value === null || value === undefined || value === "") return null;
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
    }

Its three call sites are ':768' 'priceRub', ':769' 'priceMaxRub' and ':770' 'durationMinutes'. So the
same rounding serves two MONEY fields and one COUNT. 'Math.round' silently converts 1500.50 to 1501 —
and because an integer is trivially kopeck-exact, the newly widened contract raises no objection at
':776'. **The kopecks vanish without a single error anywhere.** 'summarize()' then copies the rounded
min/max/avg.

Reachability, already traced for you at real lines — CONFIRM each one yourself before editing:
'routes/pricelist.ts:26' POST /api/pricelist/analyze -> ':45' analyzePricelist -> 'analyzer.ts:846'
returns deterministic if '!request.useServerAi' -> ':858' returns deterministic if
'!keyPool.configuredKeyCount' -> ':863' callGroqPricelist -> ':825' itemFromGroq -> ':768'
asNumberOrNull. **The branch is environment-gated, not dead**: it runs whenever the clinic has a Groq
key configured and asks for the AI check.

**ORDER OF WORK.**
1. **Split the reader in two.** 'asNumberOrNull' must not simply be widened — ':770' feeds
   'durationMinutes', which is correctly an integer, and making appointment length fractional would be a
   new defect. You need a money reader and a count reader with different rules, named so the next person
   cannot confuse them. Use 'parseKopecks' from the shared money module for the money side; do not write
   a third rounding helper.
2. **Inventory every numeric read in the groq path**, not just the three the brief names. Report each
   with 'file:line' and a verdict MONEY / COUNT / OTHER. A fix that repairs 'priceRub' and leaves a
   discount or a coverage percentage rounded is the half-closed chain this campaign keeps rejecting.
3. **FINDING #1 FROM THE SAME REVIEW, ALSO YOURS — a truncated service title reaches the doctor.**
   Input 'Отбеливание 12000-18000 руб' now yields the title «Отбеливание 12000-» — a dangling range.
   Cause at 'analyzer.ts:442': the revived second replace matches the upper bound «18000 руб» because the
   lookahead passes at end-of-string, while the lower bound «12000» and the «-» carry no currency marker
   so the first replace never fires. The prices themselves are right (12000 / 18000); the NAME is
   mangled. Cycle 11's own test suite is blind to it because it added no range case. **Add the range
   case, then fix it.**
4. **THIRD SITE, DIFFERENT FILE: 'packages/shared/src/migration.ts:291-293'.** 'sourceMoneyTotalRub',
   'loadedMoneyTotalRub' and 'quarantinedMoneyTotalRub' are bare 'z.number().nullable()' — money in the
   shared contract with no kopeck precision at all. A runtime probe confirmed all three accept
   '1500.505', a third of a kopeck. Decide each one: if it is money, it gets the money schema; if it is
   a diagnostic total where sub-kopeck noise is harmless, say so IN WRITING with the reason. **Changing
   'packages/shared' means the lead must run 'npm run build -w @dental/shared' before your change reaches
   apps/api — put it in 'leadMustRun' and say plainly in your handoff that your change is inert until
   then.**

**PROVE IT WITH A TEST THAT WOULD FAIL IF REVERTED.** Feed a groq-shaped record carrying '1500.50' and
assert the parsed price is 1500.50, not 1501. Feed a fractional 'durationMinutes' and assert it is still
an integer — that second assertion is what proves you split the readers instead of widening one.

**HONEST LIMIT YOU MAY NOT PAPER OVER.** The Groq branch cannot be executed here: there is no key in this
environment and calling a paid provider for real is forbidden. So prove 'itemFromGroq' by calling it (or
your extracted reader) DIRECTLY from a node:test with a fabricated Groq-shaped record — that is a real
unit proof. Label the end-to-end HTTP path NOT VERIFIED with the exact command that would close it. Do
not claim API VERIFIED for a branch you did not reach.
`,
	},
	{
		id: "BB2-topbar-demotes-primary-action",
		label:
			"BB2 the topbar pushes «Запись» onto its own row behind three unlabelled icons",
		dir: ".agents/archon/packets/BB2-topbar-demotes-primary-action",
		gate: "node --import tsx --test on any existing web test that touches the shell, plus node scripts/check-css-tokens.mjs (exit 0 today)",
		files:
			"apps/web/src/workspaceShell.tsx, apps/web/src/styles/dente-redesign.css (the .topbar section around :604), apps/web/src/components/workspaceActions/** ONLY if the control genuinely belongs there, and the label dictionary in apps/web/src/lib/workspaceUiLabels.ts",
		brief: `
THE LEAD JUDGED THIS WITH ITS OWN EYES ON A REAL CAPTURE. THIS IS NOT A REPORT FROM A DOSSIER.

Evidence: '.dente-redesign-shots/desktop_light_analytics.png', 1440×900, light theme, sidebar expanded,
130,839 bytes — a genuine frame, not a hash-unique placeholder. What the lead saw, and it is §4:

The top-right holds SEVEN controls on row 1 — «Поиск», «Голос», «Справка», an unlabelled database-like
icon, «Настроить», an unlabelled microphone icon — and then pushes **«Запись» ONTO ROW 2, ALONE**, beside
an unlabelled red padlock. «Запись» is the primary action of a dental CRM.

Three distinct defects in that one corner:
1. **Three unlabelled icon buttons** (database, microphone, padlock). §3: the user cannot know what they
   do. Judge each: does it have an accessible name and a visible affordance, or only a tooltip?
2. **«Голос» exists as a labelled button AND there is a separate bare microphone icon.** Two controls
   that look like the same capability. Either they genuinely differ — then the interface must say how —
   or one is redundant and goes.
3. **The primary action is demoted to its own row** while lower-value icons keep row 1, and the red
   padlock's alarm colour pulls the eye away from it.

**MEASURED, NOT GUESSED, AND THIS IS A REGRESSION THE LEAD OWNS.** The corner redesign moved actions out
of a floating overlay and into the header — correctly, that overlay was deleted for good reason. But the
lead measured '.topbar' growing **107px → 187px at 1600px width** and **187px → 235px at ≤900px** as a
result. The height doubled to hold one button. That is the cost being paid.

**YOUR JOB — AND IT IS A LAYOUT DECISION, NOT A CSS TWEAK.**
1. **Read 'workspaceShell.tsx' in full first**, then the '.topbar' rules. Establish by MEASUREMENT how
   many controls exist, their rendered widths, and at which breakpoints the row wraps. State the numbers.
2. **Decide what belongs in the header at all.** §4 says fit what exists, do not pile on; richness is not
   a row of visible buttons — depth hides properly. «Запись» must be reachable in ONE action and must not
   be the thing that wraps. Candidates for demotion into an existing menu, into the bottom nav on narrow,
   or into «показать больше»: whichever of the seven a solo dentist does not need every hour.
3. **Every remaining icon-only control gets a visible label or goes.** A tooltip is not a label for a
   грандмother. If two controls do the same thing, delete one and say which in the commit body.
4. **Do NOT reintroduce a floating overlay.** 'components/workspaceActions/workspaceActions.css' opens
   with «ЗДЕСЬ НЕТ И НЕ ДОЛЖНО ПОЯВИТЬСЯ position: fixed» and that stands. No 'position: fixed', no
   'z-index', no obstacle sampling, no coverage threshold, no reserve padding. That whole approach was
   already deleted once — 1,196 lines — after failing review twice.
5. **TOKENS ONLY.** No static hex, no px except hairlines. Palette in 'styles/dente-redesign.css:11-161'
   across '[data-theme=light|dark|night]'. Russian labels expand 30–50 %: your layout must survive it.
   Run 'node scripts/check-css-tokens.mjs' and quote the exit code.
6. **Report the .topbar height at 390, 900, 1440 and 1600 px BEFORE and AFTER**, measured the same way
   both times, and say which way it moved. **If your change does not reduce the height at 1600px, say so
   plainly rather than claiming success.**

**YOU MAY NOT CLAIM UI VERIFIED.** That label is the lead's alone and the lead will judge your work by
opening the capture itself. Do not run any screenshot script — the pipeline is the lead's and was
producing false evidence until tonight. Prove structure instead: the rendered control count, the
accessible name of every button, and the measured heights.
`,
	},
	{
		id: "BB3-invented-prices-in-mounted-estimate",
		label:
			"BB3 eight fabricated prices and eight fabricated service ids in a mounted estimate",
		dir: ".agents/archon/packets/BB3-invented-prices-in-mounted-estimate",
		gate: "node --import tsx --test on your own new test file for the suggestion path",
		files:
			"apps/web/src/components/odontogram/TreatmentEstimator.tsx and a new test file beside it. You may read apps/web/src/components/plan/planPricing.ts and apps/api/src/db/pricelistQuery.ts but do NOT edit apps/web/src/components/settings/SettingsPricesTab.tsx (another agent has it dirty).",
		brief: `
A MOUNTED ESTIMATE PUTS PRICES THE CLINIC NEVER SET INTO A DOCUMENT THE PATIENT SIGNS.

**WHAT THE LEAD ALREADY FIXED HERE, SO YOU DO NOT REDO IT.** The estimate read the price as
'svc.priceRub', a field the price list does not have — it is 'basePriceRub'. A clinic that FILLED its
price list therefore got 'undefined' → «0 ₽» and a save refusal, while a clinic that filled nothing fell
through to hardcoded demo prices. **Filling in your own prices made the product worse.** Fixed by typing
the catalogue as 'ServiceCatalogItem[]', so 's.priceRub' is now a build error rather than a silent
'undefined'. Verified end to end: 'pricelistQuery.ts:137' and 'sampleData.ts' both emit 'basePriceRub';
no source emits 'priceRub'.

**YOUR DEFECT — THE HALF THE LEAD DELIBERATELY DID NOT TOUCH, AND WHY.** 'findService' falls through to
eight literal objects carrying invented money and invented identity:

    priceRub: 4000, 5500, 6000, 12500, 35000, 12000, 5000, 28000
    id:       "service_caries_01", "service_endo_pulpitis", "service_implant_osstem",
              "service_surgery_guide", "service_crown_zirconia", …

Both halves are banned by §1/§13: the prices are money the clinic never set, and the ids are service
identifiers that **go to the server on save** as 'priceId'. The lead stopped short because
'PlanItem.price' is declared a non-nullable 'number', so honest "there is no price" needs a null variant
across roughly seven render sites — and substituting a fabricated 0 is equally forbidden, so there was no
one-line fix. **That work is your packet.**

**ORDER OF WORK.**
1. Read 'TreatmentEstimator.tsx' in full. Inventory EVERY fabricated value — price, id, title — with
   'file:line'. The lead counted eight prices; report the number YOU measure and say if it differs.
2. **Make "no price" representable.** Widen 'PlanItem.price' to 'number | null' (or an equivalent that
   the compiler enforces) and follow the compiler to every consumer: the render sites around ':803',
   ':813', ':817', ':832', ':845', ':876', ':877', the coverage arithmetic at ':541-542', and
   'planItemFromServer' at ':58-77'. **Note what ':44-56' already says**: a previous author faced this
   exact choice, chose 'price: numberOr(item.price, 0)' at ':72', and wrote down WHY — «Проще было
   поставить ?. в семи местах вывода, но тогда экран показывал бы «0 ₽» там, где цена просто не
   сохранилась». Read that reasoning and either honour it or explain in writing why null is better than
   its author's choice. Do not silently reverse a documented decision.
3. **§3 — TELL THE DOCTOR WHAT TO DO.** A row without a price must say which service is missing from the
   price list and what to do about it, in human Russian: «Услуги «Коронка из диоксида циркония» нет в
   вашем прайсе. Добавьте её в Настройках → Цены, чтобы посчитать план.» The clinical suggestion is still
   valuable — the tooth genuinely needs a crown — so **keep the row and lose the number**, do not drop
   the finding. And the estimate total must not silently treat a missing price as zero: if any row has no
   price, the total says so.
4. **The fabricated service ids must not reach the server.** A row with no catalogue match has no
   'priceId'. Trace what the save path does with it and make the refusal honest and specific rather than
   the generic «План лечения не сохранен: проверьте услуги, цены и этапы».
5. **Money arithmetic goes through 'packages/shared/src/utils/money.ts'.** No second helper. Any total is
   exact to the kopeck (§8b).
6. **The FDI rule is now shared** — 'isValidFdiToothNumber', 'VALID_FDI_TOOTH_NUMBERS' (52 teeth). If you
   touch tooth numbers, use it; never re-type the list.

**PROVE IT WITH A TEST THAT WOULD FAIL IF REVERTED.** With a catalogue containing the service, assert the
row carries the CLINIC's price to the kopeck. With an EMPTY catalogue, assert the row carries no price,
carries no fabricated id, and that the user-facing text names the missing service. That second test is
the one that proves the invented prices are gone — a test that passes with the literals restored is
worth nothing.

**WHAT WOULD MAKE THIS FAIL REVIEW.** Substituting 0 for an unknown price. Keeping any of the eight
literals. An English string. Dropping the clinical suggestion instead of the number. Silently reversing
the documented ':44-56' decision without addressing it. Editing 'SettingsPricesTab.tsx'.
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
				"The inventory your brief demanded, with file:line and a per-item verdict. On BB1 (every numeric read: MONEY/COUNT/OTHER) and BB3 (every fabricated price, id and title) this is the primary deliverable.",
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
			CYCLE12_DELTA +
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
			"apps/api/dist/**; apps/web/tsconfig.tsbuildinfo; every shared gate of §7a; and\n" +
			"apps/web/src/components/settings/SettingsPricesTab.tsx, which another author has had dirty for\n" +
			"hours — it holds a real kopeck defect and is deliberately in no packet.\n" +
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
			"own claim. **At dispatch BOTH typechecks reported 0 errors**, measured by the lead, so there is no\n" +
			"known pre-existing breakage to excuse this time. **A change to packages/shared does\n" +
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
			"   - **MONEY-VS-COUNT CHECK (BB1 especially).** If the packet touched a numeric reader or a schema,\n" +
			"     verify it did not make a COUNT fractional. «не более 3.5 сообщений» and a fractional\n" +
			"     durationMinutes are REVERT-grade regressions. Check the reverse too — money left rounded.\n" +
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
log("Cycle 12: " + PACKETS.map((p) => p.id).join(", "));
const done = await pipeline(PACKETS, buildStage, reviewStage);
for (let i = 0; i < PACKETS.length; i++)
	all.push({
		packet: PACKETS[i].id,
		dir: PACKETS[i].dir,
		review: done[i] || null,
	});
log("Cycle 12 complete.");
return { cycle: 12, results: all }
