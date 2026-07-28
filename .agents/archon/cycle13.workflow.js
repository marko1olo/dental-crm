export const meta = {
  name: 'archon-cycle-13',
  description: 'DENTE cycle 13: a dispatch report that calls five undelivered messages a success, and an EGISZ panel offering a live send button over three 404 routes',
  phases: [
    { title: 'Build', detail: 'dispatch/reminder report honesty, EGISZ facade honesty' },
    { title: 'Attack', detail: 'a different agent tries to destroy each commit; a success box over an undelivered message is REVERT-grade' },
  ],
}

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
price** — never a fabricated status either: a report field you do not read is a message the clinic thinks it sent.

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
**NO TOOL ATTRIBUTION, EVER.** No 'Co-Authored-By: Claude', no '…@anthropic.com' trailer, no «Generated
with …» footer, no tool name in the subject, body or trailers. This is the owner's standing instruction and
it has already been violated **220 times — 96 of them in the last 200 commits**, measured by the lead
tonight. Pushed history is NOT rewritten here, because a second author commits continuously and rewriting
would destroy their work, so every one of those is permanent and the only available remedy is that it stops
now. After committing run 'git log -1 --format=%B' and check for 'co-authored', 'anthropic' and 'generated
with' — expect ZERO. If it landed anyway, report it plainly instead of hoping nobody looks; the lead greps
for this now.

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
`

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
`

const CYCLE13_DELTA = `
═══ CYCLE 13 DELTA — EVERY ITEM MEASURED BY THE LEAD OR BY A CRITIC WHO REPRODUCED IT ═══
1. **BOTH GATES ARE GREEN AT DISPATCH.** typecheck api 0 errors, typecheck web 0 errors,
   'npm run build -w @dental/shared' 0, 'npm run build -w @dental/api' 0, 'smoke:web-text-encoding' 0,
   'node scripts/smoke-clinical-mutation-guard.mjs' ok:true over 438 routes / 187 mutating with
   'staleOutputCount: 0'. **Do not break the green.** A typecheck error outside your claim is another
   author's in-flight edit — note it and move on.
2. **THE FIXTURE-ORGANIZATION TRAP. READ THIS BEFORE YOU COUNT ANYTHING IN THE DATABASE.**
   There are exactly **2** organizations: '4a3420d1-6ffb…' «Стоматология, 1 кабинет» (clinic_mode
   'one_chair', the REAL clinic) and 'd0000000-0000…' «Демо-клиника для снимков» ('small_clinic', a
   screenshot fixture the LEAD created). **Two further ids look like clinics and are NOT**:
   'dce70000-…-0901' and 'dce70000-…-0902' are declared test fixtures —
   'apps/api/src/tests/support/fixtureOrganizations.ts:55' sets FIXTURE_UUID_PREFIX = "dce70000" and
   ':79-80' lists them as LEGACY_SHARED_FIXTURE_ORGANIZATION_IDS, with ':67-69' describing one as debris
   from an aborted dictation test run.
   **This trap has now caught TWO independent parties: the lead published «4 organizations», and a recon
   agent published «4 organizations» again, in the very finding meant to answer the split-by-tenant
   demand.** So: a row count is evidence ONLY when split by 'organization_id' AND with the fixture
   prefixes excluded explicitly. Say in your report which ids you excluded.
3. **A GOOD KOPECKS MODULE EXISTS AND IS THE ONLY PLACE MONEY MAY BE COUNTED**:
   'packages/shared/src/utils/money.ts' — 'parseKopecks', 'sumKopecks', 'splitKopecks',
   'percentageOfKopecks', 'formatKopecksRu', 'kopecksToNumericString', 'rublesFromKopecks'. **Do NOT write
   a second money helper.** This campaign has found three second owners; one made a legitimate
   three-payment receipt refuse to print, because 300.01 + 300.05 + 300.07 sums to 900.1299999999999 in
   one order and 900.13 in the other.
4. **THE FDI TOOTH RULE IS IN THE SHARED CONTRACT**: 'VALID_FDI_TOOTH_NUMBERS' (52 teeth),
   'isValidFdiToothNumber', 'fdiToothNumberSchema', 'FDI_TOOTH_NUMBER_MESSAGE'. Never re-type the list.
5. **THIS CYCLE'S SUBJECT IS ONE DEFECT WEARING TWO COSTUMES: THE PRODUCT TELLS THE CLINIC IT DID
   SOMETHING IT DID NOT DO.** CC1: five reminders taken and none delivered, reported in the calm grey
   success box. CC2: «Данные приема готовы к отправке» and an enabled «Отправить в ЕГИСЗ» button over
   three routes that answer 404. **In both, the fix is HONESTY, not new capability.** Do not build ЕГИСЗ.
   Do not add a message gateway. Make the screen tell the truth about what happened.
6. **THE LEAD HAS BEEN WRONG SIX TIMES TONIGHT. IF YOUR MEASUREMENT CONTRADICTS YOUR BRIEF, YOUR
   MEASUREMENT WINS AND YOU MUST SAY SO LOUDLY.** The six: «4 organizations» (fixtures); «AA3 verdict
   REVERT» (a 'grep -m1' matched the word in prose; it was NEEDS_REWORK); «ImagingView countLabel is
   broken» (a neighbouring commit had already fixed it — the builder proved the absence instead of
   inventing a label, and earned credit for it); «two auth routes validate the body before authorisation»
   (that was a PROBE CONFIGURATION whose comment described pre-fix code; both handlers already say
   «СНАЧАЛА ПРАВА, ПОТОМ ТЕЛО»); «both organizations carry clinic_mode='demo'» (a fleet packet had
   normalised them to 'one_chair' and 'small_clinic'); and «apply-dev-env.ps1 writes the header-org flag
   into three env files» (it now requires an explicit '-AllowHeaderOrg' switch and writes ONE file).
   **A stale comment in a tool is as dangerous as a stale build.** Both cost a real measurement tonight.
7. **STEP 0 OF EVERY EDIT IS 'git status --porcelain -- <path>'.** The lead skipped it and swept ~700
   lines of another author's uncommitted work into its own commit. Every target in this cycle was verified
   CLEAN at dispatch. If a claimed file is dirty and you did not dirty it, STOP and report a collision.
8. **A DELETION AND ITS IMPORTERS ARE ONE COMMIT.** The lead committed a module deletion while its
   importer sat dirty in another agent's working tree, and HEAD briefly carried a dynamic import of a
   file that no longer existed — invisible to the compiler and to the route gate, because it was
   'await import()' inside a handler. Check with 'git grep <Name> HEAD -- .' over the WHOLE repo, both
   before and AFTER committing, and never only 'apps/'.
9. **A COMMITTED fs-SCRIPT WAS DELETED THIS CYCLE: 'apps/api/add-egisz-schema.cjs' did
   'fs.appendFileSync("src/db/schema.ts", …)'.** Two of the three tables it appends already exist in
   'schema.ts', so running it would have produced duplicate 'export const' declarations and a red API
   build. **Never write a script that edits a source file.** Editor tools only; 'node -e' READ-ONLY.
10. **THE CAPTURE PIPELINE IS THE LEAD'S AND OFF LIMITS TO YOU.** It was producing false evidence twice
    over: every desktop shot showed a COLLAPSED sidebar under a default-state filename, and a 5,851-byte
    pure-white PNG passed the theme audit and was logged as a success (palette tokens live on ':root' and
    survive an empty body). Both holes are closed. **You may not claim UI VERIFIED and may not run any
    screenshot script.** The dev server on 5173 serves whatever is on disk while agents edit — it is not
    evidence during a wave.
`

const PACKETS = [
  {
    id: 'CC1-dispatch-report-lies',
    label: 'CC1 five undelivered messages report as a calm success',
    dir: '.agents/archon/packets/CC1-dispatch-report-lies',
    gate: 'node --import tsx --test apps/api/src/tests/routes/communicationsOutbox.test.ts (exists, passes today) plus your own new test file',
    files: 'apps/web/src/components/communications/MessageDeliveryConsole.tsx, apps/api/src/services/communications/dispatcher.ts (the DispatchReport type and its counters ONLY), apps/api/src/services/communications/appointmentReminders.ts (the ReminderScheduleReport type and the problems list ONLY), apps/api/src/routes/communicationsOutbox.ts if the report shape must pass through it, and your own new test file',
    brief: `
A CLINIC PRESSES «ОТПРАВИТЬ», FIVE REMINDERS DO NOT GO OUT, AND THE SCREEN SAYS IT IN CALM GREY.

**AN ADVERSARIAL AUDITOR ESTABLISHED ALL OF THIS BY EXECUTION. Confirm each line yourself, then fix it.**
Commit 35ced8f1b was written to abolish exactly this defect and it did NOT abolish it for the most common
real failure. Its verdict was NEEDS_REWORK. What it DID fix is real and must not be undone: all five catch
blocks now build a red 'role="alert"' notice with a specific Russian hint, and the red comes from theme
tokens ('dente-operations.css:471-475' over 'var(--bad-bg)'). **Keep that. Extend it.**

**DEFECT 1 — 'retried' IS THE PROVIDER-REFUSAL OUTCOME AND THE UI DOES NOT KNOW THE FIELD EXISTS.**
'dispatcher.ts:375-383' declares a report with SEVEN fields: claimed, sent, retried, failed, suppressed,
deferred, releasedStuck. 'MessageDeliveryConsole.tsx:376' declares only four — claimed, sent, failed,
suppressed — and ':388-401' branches only on sent/failed/suppressed. The gateway being down produces
'{claimed:5, sent:0, retried:5, failed:0, suppressed:0}' (dispatcher.ts:640-664 rewrites the row to
'queued', attempts+1, 'lastErrorMessage' set, and returns "retried" — never "failed"). The web then
computes 'kind = report.failed > 0 ? "fail" : "done"', resolves to **"done"**, and renders the calm grey
'role="status"' box with «Отправлено: 0 сообщений.» **Five messages taken, none delivered, reported as
success.** 'deferred' (quiet hours, ':602-604') is equally invisible.

**DEFECT 2 — THE COMMIT MADE ONE THING WORSE, AND THAT PART IS A REGRESSION TO REPAIR.** The parent
printed «Разобрано \${claimed}: отправлено \${sent}, ошибок \${failed}, не отправлено \${suppressed}», so
'claimed=5' beside 'sent=0' was the one on-screen trace that five messages were taken and none left. The
new text at ':388' **drops 'claimed' entirely.** Restore a trace of it.

**DEFECT 3 — THE SECOND PRESS INVITES THE ADMINISTRATOR TO QUEUE MORE.** Retried and deferred rows carry a
future 'nextAttemptAt'; 'claimBatch' filters 'lte(nextAttemptAt, now)' ('dispatcher.ts:418') and
'markDeferred' keeps status 'queued' with a future 'nextAttemptAt' (':515-528'). So the second press sees
'claimed === 0' and the empty branch (':380-386') prints grey «Отправлять было нечего… Они появятся после
кнопки «Поставить напоминания»» — **while five undelivered messages sit backed off.** That text must not
appear when rows exist in a backed-off state.

**DEFECT 4 — REMINDERS DROP SKIPPED PATIENTS ON THE FLOOR ENTIRELY.**
'appointmentReminders.ts:43-53' carries 'skippedNoChannel' and 'skippedNoTemplateData', incremented at
':339-342'. But 'problems.push' occurs at only TWO sites, ':160' and ':211' — **the skipped counts are
never pushed into 'problems'.** The web type at ':421' declares only {queued, alreadyQueued, problems}. Ten
appointments tomorrow with three patients lacking a phone or consent yields
'{queued:7, alreadyQueued:0, skippedNoChannel:3, problems:[]}', so 'problems.length === 0', kind "done",
grey «Поставлено напоминаний: 7.» **Three patients get no reminder and the screen never says so.** §3
requires the clinic to know WHOM to phone.

**DEFECT 5 — «Отправлять не стали: N (тихие часы, нет согласия или нет адреса)» HIDES A CONFIGURATION
FAILURE AS A BENIGN DECISION.** 'channelRouter.ts:152' returns errorClass "not_configured",
'deliveryPolicy.ts:192' classifies it as suppress, 'dispatcher.ts:670' writes status "suppressed", and
'communicationsOutbox.test.ts:300-320' asserts exactly that. So «шлюз не настроен» — an administrator
action item — is presented in grey as a deliberate choice. Separate it.

**DEFECT 6 — A RAW TENANT UUID AND A SELF-CONTRADICTION REACH THE USER.** Both 'problems.push' sites
prefix «Организация \${organizationId}», printing a UUID to a dentist (§13). And ':428-432' prefixes «Но не
для всех:» even when 'queued === 0' ('appointmentReminders.ts:211-214'), producing «Поставлено
напоминаний: 0. Уже стояли в очереди: 0. Но не для всех: … Ни одно напоминание не отправлено.» — newly
introduced by this commit.

**ORDER OF WORK.**
1. Read 'MessageDeliveryConsole.tsx' in full, then 'dispatcher.ts' around the report, then
   'appointmentReminders.ts' around its report. Confirm every line cited above and say which you could not
   confirm.
2. **INVENTORY FIRST: every field of both report types, with a verdict** — surfaced to the user / silently
   dropped / deliberately internal. This is the deliverable: fixing 'retried' and leaving 'deferred' is the
   half-closed chain this campaign keeps rejecting.
3. Decide the honest presentation. The rule: **a count that means "a message did not reach a human" must
   never render in the calm grey box.** Retried and deferred are not successes; they are "not yet, and
   here is why". Distinguish three states in the text, not two: delivered, will retry (with the reason and
   when), and will never go without an administrator action (not configured / no consent / no address).
4. Restore a trace of 'claimed' so «взято N, ушло 0» is visible.
5. Push the skipped counts into 'problems' — or better, give reminders a typed result the UI cannot ignore,
   so the next field added cannot be silently dropped the way these were. **Prefer a shape that makes the
   omission impossible over remembering to read one more field.**
6. Strip the tenant UUID from user-facing text; keep it in 'console.error' if it helps support.
7. Fix the «Но не для всех» contradiction.
8. **§10: both report types are shared contracts across api and web. Update all sides synchronously.**

**PROVE IT WITH TESTS THAT WOULD FAIL IF REVERTED.** Feed a report of
'{claimed:5, sent:0, retried:5, failed:0, suppressed:0}' and assert the notice is NOT the success kind and
that its text names the retry. Feed '{queued:7, skippedNoChannel:3, problems:[]}' and assert the three
skipped patients are named. Feed a clean success and assert it still reads calmly — a fix that turns every
outcome red is its own defect.

**WHAT WOULD MAKE THIS FAIL REVIEW.** Undoing the red-alert work that already landed. Fixing 'retried' and
leaving 'deferred'. A new English string. A raw status code or UUID shown to a dentist. Reporting a count
without saying which patients. Turning a genuine success red.
`,
  },
  {
    id: 'CC2-egisz-facade-honesty',
    label: 'CC2 «Данные готовы к отправке» and a live button over three 404 routes',
    dir: '.agents/archon/packets/CC2-egisz-facade-honesty',
    gate: 'node --import tsx --test on your own new test file for the state resolution; node scripts/check-css-tokens.mjs (exit 0 today) if you touch styling',
    files: 'apps/web/src/components/EgiszMonitor.tsx, apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx, and your own new test file. You may READ apps/api/src/routes/egisz.ts and the schema but do NOT edit the API or add routes.',
    brief: `
THE CLINIC IS SHOWN «ДАННЫЕ ПРИЕМА ГОТОВЫ К ОТПРАВКЕ» AND A LIVE BLUE BUTTON FOR A STATE SYSTEM THAT THIS
PRODUCT CANNOT REACH. A CLINIC THAT BELIEVES IT REPORTED, AND DID NOT, IS A LEGAL EXPOSURE.

**MEASURED BY A RECON AGENT AND THEN INDEPENDENTLY REPRODUCED BY AN ADVERSARIAL CRITIC — live HTTP probes,
a parser sweep, and SQL. Confirm it yourself before editing.**

Three endpoints the UI calls **return HTTP 404** with the default Fastify body
'{"message":"Route ... not found","error":"Not Found","statusCode":404}':
  POST /api/egisz/send
  GET  /api/egisz/logs/:id
  GET  /api/integrations/egisz-blank-permissions
There is no 'setNotFoundHandler' anywhere in 'apps/api/src' (verified), so 'data.error === "Not Found"' is
stable.

**WHAT 'EgiszMonitor.tsx' DOES WITH THAT, LINE BY LINE.** ':37' fetches the log; ':38' is 'if (res.ok) {'
**with no else branch**; ':23-25' therefore leaves the initial state «Pending»; ':56-58' catch is
'console.error' only. Consequence at ':129': the panel renders **«Данные приема готовы к отправке»**, and
at ':137/:141/:144' the blue **«Отправить в ЕГИСЗ» button is ENABLED**. Pressing it goes ':73' POST →
':83' '!res.ok' → ':85' 'setErrorDetails(data.error || "Неизвестная ошибка")' — 'data.error' is truthy, so
the Russian fallback **never fires** — and ':126' prints **«Ошибка: Not Found»** to a Russian dentist.

**'EgiszBlankPermissionsWidget.tsx' IS WORSE BECAUSE IT LIES CONFIDENTLY.** ':18' fetches, ':20' is
'.then((res) => res.json())' **with no 'res.ok' check at all**, ':22' is
'Array.isArray(data) ? data : []' — the 404 body is an object, so the array is empty — and ':50-52' then
prints **«Правила выгрузки бланков ЕГИСЗ не настроены»**. That tells the administrator to go configure
something, when the truth is that the route does not exist. §3: a message that sends a person to do
impossible work is worse than an error.

**GROUND TRUTH YOU MUST NOT CONTRADICT WITHOUT MEASURING.**
- Four EGISZ routes DO exist and are real: 'egisz.ts:79, :123, :163, :192'. One of them,
  'GET /api/clinical/egisz/integration-status', works and answers honestly: 'configured:false', three
  statuses 'NOT_CONFIGURED', 'ukepSigning:false', 'remdTransmission:false', and 'missingConfiguration'
  listing the four required 'EGISZ_*' environment variables. **A parser sweep found ZERO UI consumers of
  it** — the honest endpoint exists and nothing shows it. That is the material for your fix.
- 'egisz_logs' exists in the database with 7 columns, **0 rows**, and **no 'organization_id' column**, and
  it is not declared in Drizzle's schema at all. Its status enum is Pending/Sent/Error/Accepted, matching
  'EgiszMonitor.tsx:23-25' letter for letter.
- 'EgiszMonitor' is mounted: 'SettingsView.tsx:40' import, ':1622' render; also via
  'components/visit/VisitOdontogramTab.tsx:4/:74-79' behind a 'hasEngineeringStatus' gate that defaults
  false and is stored in localStorage. **This is reachable by a real user, not dead code.**
- There is NO consent-to-transmit model: 'communication_consent_scope' is exactly
  '["service","marketing"]', tied in a code comment to ФЗ «О рекламе» ст. 18 ч. 1, and 'patient_consents'
  has two references in the whole monorepo and 0 rows.

**YOUR JOB IS HONESTY, NOT AN INTEGRATION. DO NOT BUILD ЕГИСЗ.**
1. **Read both components in full**, then 'routes/egisz.ts' in full, and confirm which routes exist. Report
   any citation above that you cannot reproduce — the lead has been wrong six times tonight and expects to
   be corrected.
2. **Consume the honest endpoint.** 'GET /api/clinical/egisz/integration-status' already reports
   'configured:false' with the exact missing variable names. Wire the panel to it and let it tell the truth:
   the integration is not configured, here is what is missing, and **no, you have not reported anything.**
3. **The «Отправить в ЕГИСЗ» button must be disabled when transmission is impossible**, with the reason
   visible next to it — not in a tooltip, per §3. A button that cannot keep its promise is a lie in the
   interface, and this one's promise is a legal filing.
4. **Distinguish three states and never merge them:** «не настроено» (configuration missing — actionable by
   the administrator), «нет данных» (configured, nothing to send), and «раздел недоступен» (the server does
   not serve this — report it, do not invite work). The blank-permissions widget currently collapses the
   third into the first; that is the specific bug to remove.
5. **No English ever reaches the screen.** «Ошибка: Not Found» must be impossible, not merely unlikely —
   check 'res.ok' before reading a body, and never interpolate a server 'error' field into Russian text.
6. Add the missing 'else' branches and real failure states. Every fetch here needs one, per §3.
7. **§10 — INVENT NOTHING.** Do not add routes, do not add DB fields, do not model a consent that does not
   exist, and do not state a legal deadline. Russian law on ЕГИСЗ reporting cannot be verified from inside
   this repo; the recon agent explicitly refused to supply a deadline and a critic called that the best
   judgement in the dossier. **Hold that line.** What does not exist is recorded as debt with a reason.

**PROVE IT WITH A TEST THAT WOULD FAIL IF REVERTED.** Extract the state resolution into a testable function
and assert: a 404 yields «раздел недоступен» and a DISABLED button; 'configured:false' yields «не
настроено» plus the missing variable names and a DISABLED button; a healthy configured response with no
rows yields «нет данных» and an ENABLED button. Then assert no branch produces a Latin-script user string.

**WHAT WOULD MAKE THIS FAIL REVIEW.** Leaving the button enabled when sending is impossible. Any English
reaching the user. Presenting a missing route as «не настроено». Inventing a route, a field, a consent or a
legal deadline. Deleting the panel instead of making it honest — the clinic still needs to know where it
stands with ЕГИСЗ, and a deleted panel answers nothing.
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
    inventories: { type: 'array', items: { type: 'string' }, description: 'The inventory your brief demanded, with file:line and a per-item verdict. On BB1 (every numeric read: MONEY/COUNT/OTHER) and BB3 (every fabricated price, id and title) this is the primary deliverable.' },
    leadMustRun: { type: 'array', items: { type: 'string' }, description: 'Exact shared-state commands the LEAD must run under §7a. Mandatory for any packages/shared change.' },
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
    LAW + GATE_LAW + CYCLE13_DELTA +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'YOUR PACKET: ' + p.id + '\n' +
    'YOUR ROLE: implementer with full file-edit and commit rights, bounded to the claim below (§7a).\n' +
    'WHY THIS IS DELEGATED: the lead confirmed each defect by hand at real lines but not its blast\n' +
    'radius, and the inventory and per-consumer judgement work each need a context of their own.\n' +
    'YOUR FILE CLAIM — OWNED read/edit scope: ' + p.files + '\n' +
    'FORBIDDEN SCOPE: any file not in your claim; apps/api/src/speech/**, routes/speech.ts,\n' +
    'routes/telegram.ts (frozen); components/workspaceActions/** (finished corner redesign);\n' +
    'apps/api/dist/**; apps/web/tsconfig.tsbuildinfo; every shared gate of §7a; and\n' +
    'apps/web/src/components/settings/SettingsPricesTab.tsx, which another author has had dirty for\n' +
    'hours — it holds a real kopeck defect and is deliberately in no packet.\n' +
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
    '    STOP and report the collision — UNLESS your brief names that dirty file as your assignment.\n' +
    ' 4. Read your target file(s) IN FULL (targeted region for a monolith, and SAY which region).\n' +
    '    Confirm the defect at real lines. state.md == DEFECT CONFIRMED / ABSENT. If absent, say so\n' +
    '    loudly; never invent work to justify the packet.\n' +
    ' 5. Produce the INVENTORY your brief demands BEFORE changing behaviour. A fix that repairs the two\n' +
    '    sites the brief named and leaves five unnamed ones is the half-closed chain this campaign keeps\n' +
    '    rejecting.\n' +
    ' 6. Build the real fix. No stub, no facade, no half-product (§1). state.md == EDIT WRITTEN.\n' +
    ' 7. Run YOUR OWN signal only (never the shared gates — §7a). **A commit that does not compile is\n' +
    '    what happened in cycle 10 and it cost the lead a repair commit.** state.md == SELF-CHECK PASSED.\n' +
    ' 8. **COMMIT NOW** — pathspec form "git commit -F <msg> -- <paths>", retry loop for .git/index.lock,\n' +
    '    then verify with git log -1 --stat. state.md == COMMITTED <hash>. Do NOT wait for proofs:\n' +
    '    every agent in the previous two cycles died on credits, and the ones who committed early are\n' +
    '    the only reason those cycles produced anything.\n' +
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
    'Write findings to ' + p.dir + '/review.md AS YOU GO — every reviewer in the last two cycles died\n' +
    'mid-task on credit exhaustion, and the ones who wrote nothing to disk contributed nothing.\n\n' +
    'THE DISEASE HERE IS FABRICATED PROOF. The charge sheet, which is your standard:\n' +
    '- 49 cited proof_*.png files that do not exist.\n' +
    '- 14 filenames holding 2 unique images, one a Vite CSS error overlay under ten view names.\n' +
    '- A handoff asserting «текст не уничтожен», refuted by run output.\n' +
    '- A measurement taken against a baseline the packet itself proved impossible.\n' +
    '- A smoke green only because it loaded a dist built BEFORE the fix.\n' +
    '- A commit message describing a defect that does not reproduce at its own parent.\n' +
    '- A guard reporting «нарушений 0» and exit 0 in the same run where it printed «[НАРУШЕНИЕ]».\n' +
    '- A census that could not see 39 of 198 components and certified reachability anyway.\n' +
    '- The LEAD publishing «45 hollow modules of 50» (a regex artefact) and «4 organizations» (fixtures\n' +
    '  from a seeder the lead itself ran; the real number is 2).\n' +
    '- A commit in cycle 10 that did not compile, because its reviewer died before reaching it.\n' +
    'Default posture: disbelief. Reproduce claims; never read them. Re-derive every number with a\n' +
    'DIFFERENT instrument than the builder used. Verify EVERY link of any reachability claim.\n\n' +
    '**FIRST, THE CHEAPEST AND MOST IMPORTANT CHECK: DOES IT COMPILE?** Run the typecheck for the\n' +
    'workspace this packet touched. You are permitted the shared gates; the builder was not, so do NOT\n' +
    'mark it down for having skipped them — but DO mark it down if the committed code is red inside its\n' +
    'own claim. **At dispatch BOTH typechecks reported 0 errors**, measured by the lead, so there is no\n' +
    'known pre-existing breakage to excuse this time. **A change to packages/shared does\n' +
    'not reach apps/api until "npm run build -w @dental/shared" runs** — if the packet touched shared and\n' +
    'you did not rebuild it, your typecheck result describes yesterday\'s code. Rebuild first.\n\n' +
    'Read .agents/AGENTS.md COMPLETE plus .agents/INDEX.md. Do NOT penalise the builder for defying the\n' +
    'madge order (not installed) or the biome order (not installed). Do not apply a migration. Do not\n' +
    'restart any server. The web dev server at 5173 is serving a broken module graph — it is not evidence.\n\n' +
    'THE PACKET: ' + p.id + '\nCLAIMED SCOPE: ' + p.files + '\nCOMMIT TO ATTACK: ' + built.commitHash + '\n' +
    'FILES CHANGED: ' + JSON.stringify(built.filesChanged) + '\n' +
    'CLAIMED PROVEN: ' + JSON.stringify(built.proven) + '\n' +
    'CLAIMED NOT PROVEN: ' + JSON.stringify(built.notProven) + '\n' +
    'REACHABILITY: ' + (built.reachability || '(none)') + '\n' +
    'MEASUREMENTS: ' + JSON.stringify(built.measurements || []) + '\n' +
    'INVENTORIES: ' + JSON.stringify(built.inventories || []) + '\n' +
    'LEAD MUST RUN: ' + JSON.stringify(built.leadMustRun || []) + '\n' +
    'FOUND NOT FIXED: ' + JSON.stringify(built.foundNotFixed || []) + '\n' +
    'SUMMARY: ' + built.summary + '\n' +
    'ORIGINAL BRIEF:\n' + p.brief + '\n\n' +
    'DO THIS:\n' +
    '1. git show ' + built.commitHash + ' --stat, then the full diff, then read the changed files at HEAD.\n' +
    '2. HYPOTHESES YOU MUST ACTUALLY TEST:\n' +
    '   - Was the defect REAL before this commit? Reproduce it at the parent with YOUR OWN instrument.\n' +
    '   - **Is the fix REACHABLE — every link?** Trace from a real route or a real mounted component to\n' +
    '     the changed line. A fix in an unmounted file is a fix to nothing; one packet this campaign\n' +
    '     fixed a dead file and certified it with its strongest label.\n' +
    '   - **Did it fix every site, or only the ones the brief named?** Re-derive the inventory yourself\n' +
    '     with a different tool and compare item by item. Report any site the builder missed.\n' +
    '   - **MONEY-VS-COUNT CHECK (BB1 especially).** If the packet touched a numeric reader or a schema,\n' +
    '     verify it did not make a COUNT fractional. «не более 3.5 сообщений» and a fractional\n' +
    '     durationMinutes are REVERT-grade regressions. Check the reverse too — money left rounded.\n' +
    '   - **SHARED CONTRACT SYNCHRONY (§10).** Find a consumer that still assumes the old shape. Grep for\n' +
    '     it; do not trust a claim that all sides were updated. This cycle exists because that claim was\n' +
    '     false once already.\n' +
    '   - **HUMAN LANGUAGE (§3).** Any new user-facing string: is it Russian, grammatically agreeing with\n' +
    '     its noun, and does it tell the user what to DO? Does any button still promise something it\n' +
    '     cannot deliver? Does any message interpolate a raw float or an unformatted number?\n' +
    '   - **INVENTED VALUES (§1/§13).** Any hardcoded price, fabricated 0, magic constant, hardcoded hex\n' +
    '     or px, tenant UUID, or default substituted for an unknown?\n' +
    '   - HOLLOW FACADE? SECOND OWNER (a new money helper beside packages/shared/src/utils/money.ts, or a\n' +
    '     fourth reachability checker)? Missing teardown? Mojibake in the diff or the commit subject?\n' +
    '   - **DO THE NEW TESTS ACTUALLY ASSERT?** Check their fixtures exist at HEAD. Then apply the real\n' +
    '     standard: **would the test FAIL if the fix were reverted?** If you can, prove it — revert the\n' +
    '     change in a scratch copy or reason precisely about which assertion breaks. A test that passes\n' +
    '     either way is ceremony, and §8 forbids ceremony.\n' +
    '   - **IF THE PACKET DELETED ANYTHING**: run "git grep -n \'<BaseName>\' HEAD -- ." over the WHOLE\n' +
    '     REPO including scripts/ and package.json, not just apps/. That hole broke a smoke once.\n' +
    '3. PROOF AUDIT: RE-RUN EVERY CLAIMED PROOF COMMAND YOURSELF, capturing the TRUE exit code.\n' +
    '4. GIT HYGIENE: only the claimed files? Any churn or another author\'s work swept in via the shared\n' +
    '   index? Was apps/api/dist or tsconfig.tsbuildinfo staged? Russian subject naming the DEFECT?\n' +
    '5. VERDICT. Reserve REVERT for a change actively worse than the defect — a mass schema conversion, a\n' +
    '   tolerance that hides a real one-kopeck mismatch, a fabricated price, or a deleted guard replaced\n' +
    '   by nothing. Never award SOUND to a claim you could not reproduce. If NEEDS_REWORK, make\n' +
    '   requiredRework numbered, specific and actionable.\n\n' +
    'CONSTRAINTS: read-only on source — no edit, fix, commit, revert, git add. Never git remote -v (live\n' +
    'tokens). Never npx @biomejs/biome. You MAY run typechecks, builds, tests, smokes, read-only node -e,\n' +
    'curl to 127.0.0.1:4100, read-only SQL split by organization_id, and you MAY open PNG files.',
    { label: 'attack:' + p.id, phase: 'Attack', schema: REVIEW_SCHEMA }
  )
}

const all = []
log('Cycle 13: ' + PACKETS.map((p) => p.id).join(', '))
const done = await pipeline(PACKETS, buildStage, reviewStage)
for (let i = 0; i < PACKETS.length; i++) all.push({ packet: PACKETS[i].id, dir: PACKETS[i].dir, review: done[i] || null })
log('Cycle 13 complete.')
return { cycle: 13, results: all }
