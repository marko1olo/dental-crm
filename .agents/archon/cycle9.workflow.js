export const meta = {
  name: 'archon-cycle-9',
  description: 'DENTE cycle 9: two price lists for one clinic, three vocabularies for one mode, a mount-chain guard',
  phases: [
    { title: 'Build', detail: 'money truth, mode vocabulary, mount-chain guard' },
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

const CYCLE9_DELTA = `
═══ CYCLE 9 DELTA — WHAT CHANGED, AND WHAT THE RECON FLEET PROVED ═══
1. Both typecheck gates were GREEN at dispatch, run by the lead serially (§7a). api suite 992/992,
   web suite 610/610, both TRUE_EXIT=0. **Do not break the green.**
2. The floating corner was REDESIGNED, not patched (commit f0121f0c2). 1,196 lines of machinery deleted:
   'CornerDock.tsx', 'cornerDock.css', 'cornerDockLayout.ts' and its tests. The obstacle sampling, the
   lift, the reserve padding and the 0.5 coverage threshold are GONE. Actions now live inside the bottom
   navigation via 'display: contents' + 'createPortal', mounted once at 'workspaceShell.tsx:543'.
   Verified by the lead: **0 real 'position: fixed' declarations** (comments stripped), 0 'z-index'
   values, 0 hardcoded hex. **Do not reintroduce a floating overlay.**
3. 'apps/web/testCssStub.mjs' is now TRACKED and wired into 'apps/web/package.json:10' — the web suite
   needs it because the corner redesign imports a '.css' file. Do not remove it.
4. **A number to distrust:** a packet reported 'checkedFiles: 433' for the encoding smoke and asked the
   lead to record it as a correction. The real number is **429** — 433 was read during a dirty window
   when both the deleted 'floatingCorner' files and the new 'workspaceActions' files were on disk. The
   lead did NOT record it. Re-measure anything you inherit.
5. **Two 'REACHABILITY VERIFIED' claims were overturned by review.** 'WorkspaceOnboardingNoticeBars' has
   exactly ONE reference repo-wide — its own declaration — so 'WorkspaceOnboardingInline' and
   'InlineStepRole' never mount; a packet "fixed" a dead file and certified it with its strongest label.
   And 'App.tsx:2551' is unreachable: its gate requires '!onboardingDismissed' while the early return
   requires the opposite, and 'isLocalOnboardingDismissed' reads localStorage key
   'dente_ui_preferences_v1' which **nothing in the repo writes** (the real key is
   'dental-crm:web-ui-preferences:v1', AppHelpers.tsx:687/:4078).
   **Lesson that binds you: verify EVERY link of the mount chain, not two of three.**
6. A critic re-deriving a census got 123 'pgTable' declarations and nearly filed the recon's arithmetic
   as broken; the real count is **126** — three declarations are multi-line with the name on the next
   line ('communicationsSchema.ts:36', ':89', 'patientsSchema.ts:21'). Same trap that produced the
   lead's false «45 hollow modules of 50». **Use 'npx @ast-grep/cli' for structural counts, not regex.**
`

const PACKETS = [
  {
    id: 'Y1-price-two-truths',
    label: 'Y1 two sources of truth for money',
    dir: '.agents/archon/packets/Y1-price-two-truths',
    files: 'apps/api/src/db/domainStateHydration.ts, apps/api/src/db/pricelistQuery.ts, and the seeding path you choose. You MAY touch apps/api/src/db/schema.ts and add ONE apps/api/drizzle/*.sql if and only if the fix genuinely requires it.',
    gate: 'node --import tsx --test on your own test file, plus read-only SQL against 127.0.0.1:5432. NEVER npm run typecheck/build/test — the lead owns those (§7a).',
    brief: `
PACKET Y1 — THE PAYMENT SCREEN AND THE CONTRACT GENERATOR DISAGREE ABOUT PRICES. HIGHEST SEVERITY OF THE
ENTIRE CAMPAIGN. Lane: MONEY. Read .agents/BILLING_AND_FINANCE.md and .agents/DOCUMENTS_LIFECYCLE.md
COMPLETE.

THE DEFECT, verified by the lead with its own hands against the live database:

'apps/api/src/db/domainStateHydration.ts:775-782':
    if (serviceRecords.length > 0) {
        replaceAll(serviceCatalog, serviceRecords);
        // Индекс прайса строится один раз при загрузке модуля. Если его не
        // перестроить, поиск услуги возвращал бы демонстрационную позицию с
        // другой ценой — и она попала бы в договор и в чек.
        serviceCatalogMap.clear();
        for (const service of serviceRecords) serviceCatalogMap.set(service.id, service);
    }

**The author of that comment predicted this exact catastrophe.** And the guard written to prevent it is
what admits it: it only protects the case where records EXIST. Live measurement by the lead:
'select count(*) from service_catalog_items' = **0 rows**, with 4 organizations present. So the condition
is false, the guard never fires, and 'serviceCatalog' remains the **hardcoded module-level demo array
compiled into the API** ('sampleData.ts:583', emitted at ':10385').

Meanwhile the legal-document path reads the table directly: 'documentQuery.ts:345' →
'pricelistQuery.ts:22-23' → 'db.select().from(schema.serviceCatalogItems)' → **empty**.

SO THE PRODUCT HAS TWO PRICE LISTS. The finance screen shows six priced services — a recon agent read
them off a real capture: A01.07.001 at 1 200 ₽, A16.07.093 at 1 500 ₽, four more — while the contract,
the fiscal receipt and the tax-deduction certificate generator see an empty catalogue. §8b is absolute:
money and legal documents are exact. A price a patient is shown and a price a document carries must be
the same number, or the product is lying to one of them.

WHAT TO ESTABLISH BEFORE YOU WRITE A LINE:
1. Read 'domainStateHydration.ts' around the 'serviceCatalog' hydration IN FULL, 'pricelistQuery.ts' IN
   FULL, and the 'serviceCatalog' / 'serviceCatalogMap' declarations in 'sampleData.ts' (443 KB — read
   the targeted region and SAY which region you read).
2. **Trace both consumers exhaustively.** Who reads 'serviceCatalog' / 'serviceCatalogMap' (the in-memory
   demo path) and who reads 'serviceCatalogItems' (the table)? Use 'npx @ast-grep/cli', not regex — a
   naive regex produced the lead's false «45 hollow modules of 50» and a critic's false «123 pgTable».
   Produce the two consumer lists with file:line. **That inventory is half the deliverable**: it tells
   the lead how far the divergence reaches — treatment plans, invoices, the cashbox, the contract, the
   KND certificate.
3. Determine which prices a real clinic is actually shown on each surface today, with evidence. If a
   treatment plan built on screen produces an invoice whose line items the document generator cannot
   price, say so plainly — that is the user-visible consequence.

WHAT TO BUILD — the choice is yours to justify, the outcome is not negotiable: ONE price list.
   (a) **Make the table the single source of truth.** The in-memory demo catalogue stops being a fallback
       for real organizations. A clinic with an empty catalogue must be told so honestly in Russian with
       what to do next (§3) — «Прайс-лист пуст. Заполните услуги в настройках, иначе договор и чек не
       смогут посчитать сумму» — rather than shown six invented services. This is almost certainly right;
       if you choose otherwise you must argue it.
   (b) If demo data must remain for a demo organization, it must be **scoped to that organization only**
       and must never leak into a real one. Prove the scoping.
   FORBIDDEN: leaving any code path where a compiled-in constant can price a real patient's document.
   FORBIDDEN: seeding the table with the demo six to make the symptom disappear — that puts invented
   prices into real invoices, which is worse than the current bug.
4. §10: invent no contract. If the honest fix needs a column or migration that does not exist, you may
   add exactly one — but a migration is complete only as '.sql' + ledger entry + proof, the runner is the
   custom 'apps/api/src/scripts/migrate.ts' via 'npm run db:migrate', and **'npm run db:generate' must
   NOT be used** ('drizzle.config.ts' still declares 'driver:"pglite"' and the drizzle journal matches
   zero filenames). **Applying a migration is a shared gate — put the exact command in 'leadMustRun'.**
5. Guaranteed teardown for anything you add. No hardcoded prices, ever.

PROOF EXPECTED:
- The two consumer inventories with file:line.
- DB VERIFIED: read-only SQL showing what the table holds, before and after.
- UNIT VERIFIED: a node:test proving the document path and the screen path resolve the SAME price for the
  same service id, and that an empty catalogue yields an honest refusal rather than a demo price.
  **That equality IS the fix.** EXECUTE it and quote the pass.
- 'leadMustRun' must name every shared gate the lead has to run for you.
`,
  },
  {
    id: 'Y2-clinicmode-one-vocabulary',
    label: 'Y2 three vocabularies for one mode',
    dir: '.agents/archon/packets/Y2-clinicmode-one-vocabulary',
    files: 'apps/api/src/db/schema.ts (the clinic_mode column only), apps/api/src/routes/workspaceProfile.ts, apps/api/src/db/domainStateHydration.ts (the mode coercion only), packages/shared/src/index.ts (clinicModeSchema only), apps/web/src/lib/clinicCapabilities.ts + ONE apps/api/drizzle/*.sql if required. COORDINATE: Y1 may also touch schema.ts and domainStateHydration.ts — run git status before every edit and report any collision.',
    gate: 'node --import tsx --test on your own test file, plus read-only SQL. NEVER npm run typecheck/build/test (§7a).',
    brief: `
PACKET Y2 — THREE DIFFERENT VOCABULARIES FOR THE CLINIC MODE, AND A '.catch()' THAT SWALLOWS ALL OF THEM.
§5 IS THE CORE OF THE PRODUCT AND IT IS CURRENTLY DECORATION.
Lane: PLATFORM / ADAPTIVITY. Read .agents/DATABASE.md and .agents/UI_STANDARDS.md COMPLETE.

THE DEFECT, established by two independent recon agents and re-verified by the lead against the live DB:

| where | vocabulary |
|---|---|
| 'packages/shared/src/index.ts:797' | 'solo_doctor' / 'one_chair' / 'small_clinic' / 'network_clinic' |
| 'apps/api/src/db/schema.ts:228' | '.default("demo")', comment says '// demo, single, network' |
| 'apps/api/src/routes/workspaceProfile.ts:580,651' | writes '"single"' / '"network"' |

**The sets are DISJOINT.** So 'apps/api/src/db/domainStateHydration.ts:350' runs
'clinicModeSchema.catch("one_chair").parse(organization.clinicMode)' and silently coerces every real
organization to 'one_chair'.

Live measurement by the lead: **4 organizations, ALL with clinic_mode='demo'**, and the live column
default is 'demo'::text. This is not stale data — **it is the schema default. Every clinic, present and
future, is born outside the enum.**

THE CONSEQUENCES, which is why this outranks a cosmetic cleanup:
- **'solo_doctor' is unreachable in production.** Every reassurance in this codebase that something is
  «correctly hidden from solo_doctor» is inert, because no organization can be in that mode.
- 'ONE_CHAIR' in 'apps/web/src/lib/clinicCapabilities.ts:88-95' **includes 'marketingSection'**, so
  'workspaceShell.tsx:209' returns the FULL rail to every install. A capture read by a recon agent shows
  «Обращения» and «Маркетинг/SEO» in the rail of a one-chair clinic.
- The Director's §5 requires small practices not to see modules they do not need, through flags rather
  than hardcode. The flag exists, the presets exist, the mode is never meaningfully set — so nothing is
  hidden. **A real mechanism, completely inert.**

WHAT TO BUILD:
1. **ONE vocabulary.** 'clinicModeSchema' is the only one with a type, a Zod schema and UI presets behind
   it, so it wins unless you can argue otherwise. Bring the schema default and the writers onto it.
2. **Migrate the existing rows.** Four organizations hold 'demo'. Decide what each becomes and justify
   it — do not guess silently. A defensible rule: pick the enum value matching what the organization
   actually has (count its clinics, chairs, staff), or a single documented default when the data cannot
   distinguish. **State the rule in the migration comment.** Migration complete = '.sql' + ledger + proof;
   runner is 'npm run db:migrate'; **never 'npm run db:generate'**. Applying it is a shared gate → put it
   in 'leadMustRun'.
3. **Kill the silent '.catch()'.** A value outside the enum must not be swallowed into 'one_chair'. Either
   constrain the column so it cannot happen, or make the coercion log loudly and name the offending
   value. Silent coercion is what hid this for the entire campaign.
4. **Fix the comment at schema.ts:228** — it documents a third vocabulary that exists nowhere.
5. Then answer the §5 question honestly: with the mode finally meaningful, **does 'one_chair' still
   deserve 'marketingSection'?** A one-chair practice has no marketing department. Judge it, change it if
   the answer is no, and print what a solo dentist now sees versus a network — the two lists are the proof.
6. §10: invent nothing. If choosing a mode per organization needs data the schema does not carry, say so
   and use a documented default rather than fantasising a rule.

PROOF EXPECTED:
- UNIT VERIFIED: a node:test asserting every value the schema default and the writers can produce parses
  INSIDE 'clinicModeSchema' without hitting '.catch()', and that the visible-module list for
  'solo_doctor' is a strict subset of 'network_clinic'. **Print both lists** — they are the proof.
- DB VERIFIED: read-only SQL showing the 'clinic_mode' distribution now, and what your migration would
  produce. Do NOT apply a destructive change yourself.
- 'leadMustRun' must name every shared gate for the lead.
`,
  },
  {
    id: 'Y3-mount-chain-guard',
    label: 'Y3 dead files certified as reachable',
    dir: '.agents/archon/packets/Y3-mount-chain-guard',
    files: 'a new scripts/ guard, plus apps/web/src/components/workspace/WorkspaceOnboardingNoticeBars.tsx and whatever its chain requires. NOT App.tsx unless it is clean and strictly required.',
    gate: 'your new guard, plus node --import tsx --test on your own test file. NEVER npm run typecheck/build/test (§7a).',
    brief: `
PACKET Y3 — COMPONENTS THAT NOTHING MOUNTS, CERTIFIED AS REACHABLE. THE CAMPAIGN'S MOST EXPENSIVE
RECURRING MISTAKE. Lane: WEB / PROOF. Read .agents/UI_STANDARDS.md COMPLETE.

THE PATTERN, caught three times by three different reviewers:
1. 'AppRouter.tsx' — 359 lines of dead code that says so in its own header, and five finished-looking
   views were wired only into it, so no user could ever open them.
2. A packet extracted components from a monolith and left them **orphaned** — imported nowhere.
3. **The one that must not repeat:** a packet fixed a role picker inside 'InlineStepRole', verified two
   links of the mount chain, and certified it with the strongest reachability label available. A reviewer
   then found 'WorkspaceOnboardingNoticeBars' has **exactly ONE reference in the entire repository — its
   own declaration** at 'apps/web/src/components/workspace/WorkspaceOnboardingNoticeBars.tsx:5'. Nothing
   imports or renders it, so 'WorkspaceOnboardingInline' and therefore 'InlineStepRole' never mount.
   **A dead file was fixed and the fix was certified as reaching users.**
   The same reviewer found 'App.tsx:2551' unreachable: its gate needs '!onboardingDismissed' while the
   early return above needs the opposite, and 'isLocalOnboardingDismissed' reads a localStorage key
   **nothing in the repo writes** ('dente_ui_preferences_v1'; the real key is
   'dental-crm:web-ui-preferences:v1' at 'AppHelpers.tsx:687/:4078').

TWO THINGS TO DO, AND THE SECOND IS THE REAL DELIVERABLE:

**(A) RESOLVE THE DEAD ONBOARDING CHAIN.** Establish the truth about
'WorkspaceOnboardingNoticeBars' → 'WorkspaceOnboardingInline' → 'InlineStepRole', and about the
'App.tsx:2551' branch. For each: is it dead, and if so is the honest answer to MOUNT it (the feature is
wanted) or DELETE it (the surface is redundant)? §1 forbids leaving it in limbo. Decide, justify, and if
you delete, verify with 'git grep -l "<BaseName>" HEAD -- .' over the WHOLE repo that nothing references
it outside 'docs/' and '.agents/' prose. Also settle the localStorage key: two keys for one preference is
a second source of truth — name the canonical one and fix the loser, or record precisely why not.

**(B) BUILD THE GUARD THAT MAKES THIS CLASS IMPOSSIBLE.** A component that exists but nothing renders is
invisible to the typecheck, invisible to the tests, and invisible to a reviewer who checks two links of a
three-link chain. So it must become visible to a gate:
- Write a script in 'scripts/' that, for every component under 'apps/web/src/components/**' and every
  view file, determines whether it is **reachable from a real mount root** — the render tree starting at
  'main.tsx' / 'App.tsx' / 'workspaceShell.tsx' — following imports transitively.
- **Use 'npx @ast-grep/cli' for import and JSX-usage analysis, not regex.** A regex census produced the
  lead's false «45 hollow modules of 50» and a critic's false «123 pgTable» count. Structural analysis is
  the entire point of this packet.
- Distinguish the three states, because they are NOT the same defect: **rendered** (imported and used in
  JSX), **imported-but-never-rendered** (worse than orphaned — it looks wired), and **orphaned**
  (imported by nothing).
- It is expected to be RED on arrival. **Do not weaken it to green.** Print a truthful inventory, exit
  non-zero, and state in your handoff how many of each state you found. Include a named allowlist for
  genuine exceptions (test-only components, lazy route targets), each entry carrying a reason.
- **Prove it can go red:** orphan a component in a scratch copy OUTSIDE the repo and show the guard names
  it. A guard nobody proved can fail is not a guard.

PROOF EXPECTED:
- SMOKE VERIFIED: your guard runs and prints counts for all three states. Quote the output and totals.
- The demonstration that it fires on a deliberately orphaned component, both runs quoted.
- For any deletion: whole-repo 'git grep' returning nothing outside prose.
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
    reachability: { type: 'string', description: 'EVERY link of the mount/call chain, not two of three. A dead file was certified reachable this campaign.' },
    measurements: { type: 'array', items: { type: 'string' } },
    inventories: { type: 'array', items: { type: 'string' }, description: 'The consumer/state inventories your packet was asked to produce, with file:line.' },
    leadMustRun: { type: 'array', items: { type: 'string' }, description: 'Exact shared-state commands the LEAD must run for you under §7a. Empty if none.' },
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
    LAW + CYCLE7_CORRECTIONS + CYCLE9_DELTA +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'YOUR PACKET: ' + p.id + '\n' +
    'YOUR ROLE: implementer with file-edit rights, bounded to the claim below (§7a).\n' +
    'WHY THIS IS DELEGATED: it needs full-file comprehension of a specific subsystem plus its own\n' +
    'structural reconnaissance; the lead verified the defect but not its blast radius.\n' +
    'YOUR FILE CLAIM — OWNED read/edit scope: ' + p.files + '\n' +
    'FORBIDDEN SCOPE: any file not in your claim; apps/api/src/speech/**, routes/speech.ts,\n' +
    'routes/telegram.ts (frozen); components/workspaceActions/** (the corner redesign just landed — do\n' +
    'not disturb it); any file another author has dirty; and every shared gate of §7a.\n' +
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
    '    STOP, report the collision. A second, non-fleet author commits here continuously.\n' +
    ' 4. Read your target file(s) IN FULL (targeted region for the named monoliths, and SAY which\n' +
    '    region). Confirm the defect at real lines. state.md == DEFECT CONFIRMED / ABSENT. If absent,\n' +
    '    say so loudly; never invent work to justify the packet.\n' +
    ' 5. Produce the inventories your brief asks for BEFORE changing behaviour — they are how the lead\n' +
    '    learns the blast radius, and they have repeatedly been the most valuable part of a packet.\n' +
    ' 6. Build the real fix. No stub, no facade, no half-product (§1). state.md == EDIT WRITTEN.\n' +
    ' 7. Run YOUR OWN signal only (never the shared gates — §7a). state.md == SELF-CHECK PASSED.\n' +
    ' 8. **COMMIT NOW** — pathspec form "git commit -F <msg> -- <paths>", with a retry loop for\n' +
    '    .git/index.lock, then verify with git log -1 --stat. state.md == COMMITTED <hash>. Do NOT wait\n' +
    '    for proofs: credit exhaustion has killed entire waves here, and an uncommitted edit is lost work\n' +
    '    that also blocks the next agent.\n' +
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
    'THE DISEASE HERE IS FABRICATED PROOF. The full charge sheet, which is your standard:\n' +
    '- 49 cited proof_*.png files that do not exist.\n' +
    '- 14 filenames holding 2 unique images, one a Vite CSS error overlay filed under ten view names —\n' +
    '  and that set passed a «56 unique MD5» certification.\n' +
    '- An MD5-unique 116 KB screenshot showing the staff PIN screen, not the view it was named after.\n' +
    '- A handoff asserting «текст не уничтожен», refuted by run output.\n' +
    '- A measurement taken against a baseline the packet itself proved impossible to obtain.\n' +
    '- A smoke green only because it loaded a dist built BEFORE the fix.\n' +
    '- A commit message describing a defect that does not reproduce at its own parent.\n' +
    '- A performance headline attributable to a behaviour change, not the performance fix.\n' +
    '- The lead publishing «45 hollow modules of 50» — a regex artefact.\n' +
    '- A critic nearly publishing «123 pgTable» when the answer is 126 (three multi-line declarations).\n' +
    '- A unit test whose fixtures the same packet had deleted: zero assertions, reported pass.\n' +
    '- **A packet that fixed a DEAD FILE and certified it with its strongest reachability label**, having\n' +
    '  verified two links of a three-link mount chain.\n' +
    'Default posture: disbelief. Reproduce claims; never read them. Re-derive every number with a\n' +
    'DIFFERENT instrument than the builder used. **Verify EVERY link of any reachability claim.**\n\n' +
    'Read .agents/AGENTS.md COMPLETE plus .agents/INDEX.md. Do NOT penalise the builder for defying the\n' +
    'madge order (not installed) or the biome order (not installed; would reformat the repo).\n' +
    'Under §7a the BUILDER was FORBIDDEN from running typecheck/build/whole-suite/migrations — do NOT\n' +
    'mark it down for that. YOU may run them, one at a time, and you should. Rebuild before any proof\n' +
    'that loads apps/api/dist. Do NOT apply a migration yourself.\n\n' +
    'THE DIRECTOR\'S CONSTITUTION binds this packet:\n' +
    '§1 depth not facade, no stubs, «compiles» is not «works». §3 a Russian grandmother must understand\n' +
    'every error, empty and loading state and know what to DO next. §4 no visual overload. §5 a small\n' +
    'practice must not see what it does not need, via flags not hardcode; decomposition must be IMPORTED\n' +
    'AND USED. §8b money and legal documents are exact to the kopeck. §10 invent no backend contract,\n' +
    'schema or field — absent things are debt with a reason.\n\n' +
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
    '1. git show ' + built.commitHash + ' --stat, then the full diff, then read the changed files at HEAD\n' +
    '   in context. A diff hides what surrounds it.\n' +
    '2. HYPOTHESES YOU MUST ACTUALLY TEST:\n' +
    '   - Was the defect REAL before this commit? **Reproduce it at the parent.**\n' +
    '   - **Is the fix REACHABLE — every link, not two of three?** Trace from a real mount root or a real\n' +
    '     HTTP route to the changed line. This failure cost this campaign most.\n' +
    '   - Does it hold on REAL data, not just a fixture? For the money packet: do the screen price and the\n' +
    '     document price now resolve to the SAME number for the same service id? Prove it, do not read it.\n' +
    '   - **Are the claimed measurements and inventories reproducible?** Re-derive with your own tooling.\n' +
    '   - Did the fix introduce a REGRESSION worse than the defect? Two packets this campaign did.\n' +
    '   - HOLLOW FACADE, SECOND OWNER, a fabricated 0/default for an unknown, a hardcoded price, a\n' +
    '     deleted useAppLogic return field, a missing teardown, hardcoded hex/px, an undeclared Russian\n' +
    '     literal, mojibake in the diff or subject?\n' +
    '   - **If the packet DELETED anything: git grep -l "<BaseName>" HEAD -- . over the WHOLE repo** must\n' +
    '     return nothing outside docs/ and .agents/ prose.\n' +
    '   - **Do the new tests actually assert?** Check their fixtures exist at HEAD.\n' +
    '   - For a GATE packet: does the gate FAIL when the defect is reintroduced? Break it in a scratch\n' +
    '     copy outside the repo and check.\n' +
    '3. PROOF AUDIT: RE-RUN EVERY CLAIMED PROOF COMMAND YOURSELF, capturing the TRUE exit code.\n' +
    '4. GIT HYGIENE: only the claimed files? Any churn (apps/api/.data/*.json, tsbuildinfo, scratch/**)\n' +
    '   or another author work swept in via the shared index? Russian subject naming the DEFECT?\n' +
    '5. VERDICT. Reserve REVERT for a change actively worse than the defect. Never award SOUND to a claim\n' +
    '   you could not reproduce. If NEEDS_REWORK, make requiredRework numbered and actionable.\n\n' +
    'CONSTRAINTS: read-only on source — no edit, fix, commit, revert, git add. Never git remote -v (live\n' +
    'tokens). Never npx @biomejs/biome. Do not start or restart any server, and do not apply a migration.\n' +
    'You MAY run typechecks, builds, tests, smokes, read-only node -e, curl to 127.0.0.1:4100, read-only\n' +
    'SQL, and you MAY open PNG files to judge a visual claim.',
    { label: 'attack:' + p.id, phase: 'Attack', schema: REVIEW_SCHEMA }
  )
}

const all = []
log('Cycle 9: ' + PACKETS.map((p) => p.id).join(', '))
const done = await pipeline(PACKETS, buildStage, reviewStage)
for (let i = 0; i < PACKETS.length; i++) all.push({ packet: PACKETS[i].id, dir: PACKETS[i].dir, review: done[i] || null })
log('Cycle 9 complete.')
return { cycle: 9, results: all }
