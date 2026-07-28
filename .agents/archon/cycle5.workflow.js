export const meta = {
  name: 'archon-cycle-5',
  description: 'DENTE cycle 5: unverified tenant identity, behavioural guard gate, design system, clinical ceremony, snapshot writes',
  phases: [
    { title: 'Build', detail: 'fresh ground: security, gates, design, clinical, performance' },
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

const REWORK_RULES = `
═══ THIS IS A REWORK PACKET. READ TWICE. ═══
A previous agent built this and committed it; an adversarial reviewer returned NEEDS_REWORK with a
specific list. **THE REVIEW FILE IS YOUR SPECIFICATION.** Read it COMPLETE first.
1. Do not start over. Prior commits are on a pushed branch. Amend behaviour FORWARD with new commits.
   Never rewrite history, never revert the prior work wholesale.
2. Close every BLOCKING item. Every numbered item must appear in your report as CLOSED, DECLARED DEBT,
   or DISPUTED. Silence on an item is an automatic re-fail.
3. You MAY DISPUTE an item — but only with evidence: a command and its output, or a file:line.
   "I disagree" without evidence is a failed packet. Reviewer output is evidence, not authority; so is
   yours. The lead decides.
4. **Correct any false claim in the prior handoff.** Fix the words as well as the code, and name the
   exact sentence that was wrong.
5. The reviewer's own new findings (F1/F2/…) count. HIGH ones must be closed or declared with a reason.
6. Re-prove what you changed, running the specific test the reviewer asked for.
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

const PACKETS = [
  {
    id: 'U1-identity-verified',
    label: 'U1 unverified org identity accepted',
    wave: 1,
    dir: '.agents/archon/packets/U1-identity-verified',
    files: 'apps/api/src/security/identity.ts + apply-dev-env.ps1 + a node:test. NOT accessGuard.ts, NOT any route file.',
    gate: 'npm run typecheck -w @dental/api',
    brief: `
PACKET U1 — THE CODEBASE MARKS AN IDENTITY UNVERIFIED AND THEN NEVER CHECKS THE MARK.
Lane: PLATFORM / SECURITY. Highest severity this cycle.

CONFIRMED BY AN ADVERSARIAL REVIEWER WITH A LIVE PROBE (read
.agents/archon/packets/S1-speech-unauthenticated/review.md COMPLETE — it is your evidence base):
- apps/api/src/security/identity.ts:107-113 — when the dev header escape hatch is enabled, the request's
  organizationId is taken from the client-supplied 'x-organization-id' header and the identity is
  explicitly stamped **verified: false**.
- apps/api/src/security/identity.ts:132-142 — 'requireOrganizationId' returns that organizationId and
  **never once reads identity.verified**. The field was designed and then never enforced.
- Reviewer probe: with DENTE_DEV_ALLOW_HEADER_ORG=1 and ONLY the 'x-organization-id' header, **no token
  at all**, a clinical write returned **201 Created** with the attacker-named organization.
- apply-dev-env.ps1:29 is a CHECKED-IN OPERATOR SCRIPT that writes that flag into '.env', '.env.local'
  AND 'apps/api/.env' (lines 41-43). One run by any developer reopens the hole across the whole API.
- The running box is currently safe (the flag is not set today; curl with the header → 401). This is
  therefore a latent, one-command-away hole, not a live breach. Say that accurately in your report.

WHAT TO BUILD:
1. Read identity.ts IN FULL. Map every consumer of 'verified' (there may be none) and every caller of
   'requireOrganizationId' — it is used across many routes, so understand the blast radius BEFORE
   editing. Report the caller count.
2. Make the unverified path safe. The intent of 'verified' is obvious and correct; enforce it. Design
   choice is yours, but justify it: either 'requireOrganizationId' refuses unverified identities
   outright, or it keeps working for genuinely dev-only read paths while a new explicit accessor is
   required for anything that mutates. **Whatever you choose, an unverified header-supplied
   organization must not be able to write clinical data.**
3. **The dev escape hatch must remain usable for the 7 DB-backed tests that depend on it** —
   'DENTE_DEV_ALLOW_HEADER_ORG=1' + 'x-organization-id' is how tests/routes/* authenticate. Breaking
   them all is not an acceptable fix. Find the line that keeps tests working while closing writes, and
   run 'npm test -w @dental/api' to prove you did not break them. If some tests legitimately must
   change, change them and say exactly which and why.
4. Fix apply-dev-env.ps1 so an ordinary developer run does not silently arm the hole across three env
   files. At minimum it must not write the flag into 'apps/api/.env'; better, make arming it explicit
   and loud. Do not break the script's legitimate purpose — read it in full first.
5. Production already throws on this flag at boot (server.ts). Confirm that and quote the line — it is
   the reason this is latent rather than live, and your report must state it precisely.

PROOF EXPECTED:
- UNIT VERIFIED, load-bearing: node:test with app.inject() proving that with the dev flag ON and only
  'x-organization-id', a clinical WRITE is refused, while whatever you deliberately kept working still
  works. EXECUTE it, quote the pass.
- API VERIFIED: the live server on 127.0.0.1:4100 runs 'tsx watch' and WILL pick up your change. Probe
  it and quote status codes.
- 'npm test -w @dental/api' — quote the summary. This is the packet where a regression in the 7
  DB-backed tests is the likeliest failure mode.
- TYPECHECK VERIFIED: npm run typecheck -w @dental/api
`,
  },
  {
    id: 'U2-behavioural-guard-gate',
    label: 'U2 gate that tests behaviour',
    wave: 1,
    dir: '.agents/archon/packets/U2-behavioural-guard-gate',
    files: 'scripts/smoke-clinical-mutation-guard.mjs (rewrite) + any new scripts/ helper it needs',
    gate: 'the gate itself, plus npm run typecheck -w @dental/api',
    brief: `
PACKET U2 — THE GATE THAT IS SUPPOSED TO PROVE ROUTES ARE GUARDED COUNTS IDENTIFIERS INSTEAD.
Lane: PROOF. This packet removes a whole class of false confidence.

THE DEFECT, both directions measured by the lead:
scripts/smoke-clinical-mutation-guard.mjs asserts protection by counting textual occurrences of a guard
helper's NAME in a source file against a hardcoded expected number.
- **It greens on prose.** In apps/api/src/routes/speech.ts the real mutation-guard call sites fell from
  2 to 1, but a new JSDoc comment mentioning the helper kept the count at 2. Measured: old counter 2
  (expected 2, green) vs 1 real call. The lead has since made it strip comments and count 'name(' call
  sites — a patch, not a cure.
- **It reds on correct code.** It has long failed with 'apps/api/src/routes/patients.ts must guard 3
  protected route(s), found 0'. That is a FALSE ALARM: patients.ts authenticates by hand — it reads
  'x-dente-clinic-token', calls 'verifyToken(...)', returns 401 AuthRequired/AuthExpired, and takes
  organizationId **from the signature-verified token payload rather than a header**, which makes it
  STRICTER than the shared helper. A permanently-red gate is a gate every future agent learns to ignore.

WHAT TO BUILD — a gate that tests BEHAVIOUR, not vocabulary:
1. Enumerate the mutating routes (POST/PUT/PATCH/DELETE) the API registers. Do it from the real Fastify
   instance if you can (build the app and read its route table) rather than by regex — a regex census
   is exactly the kind of proxy this packet exists to kill. If you must fall back to static analysis,
   use 'npx @ast-grep/cli', not regex, and say so.
2. For each, issue a real request with **no credentials** via app.inject() and assert the response is
   401 or 403 — never 2xx, and never a validation error, because reaching validation proves the request
   got past the gate.
3. Handle the legitimate exceptions explicitly and by NAME, with the reason, in a small allowlist:
   public booking, the portal routes, and the rate-limited public action links are intentionally
   unauthenticated. An allowlist entry must carry a one-line justification. A route silently missing
   from the census is a bug in the gate.
4. **Both auth idioms must pass.** The shared 'requireClinical*' helpers and the hand-rolled
   'verifyToken(x-dente-clinic-token)' pattern are both real and both correct; a behavioural gate is
   blind to which one a route uses, which is the entire point. Prove patients.ts now PASSES.
5. Keep it fast enough to run in the smoke suite, and make its failure output name the exact route and
   the status it actually returned.

PROOF EXPECTED:
- SMOKE VERIFIED: your rewritten gate exits 0 and its output lists how many routes it actually probed.
  A gate that probes 3 routes and exits 0 is worthless — the count is part of the proof.
- Demonstrate it CATCHES a real regression: temporarily remove a guard in a scratch copy (do NOT commit
  that), show the gate goes red naming that route, then restore. Quote both runs.
- Report the count of mutating routes probed, the allowlist with justifications, and any route you could
  not classify. Unclassified routes are a finding, not a failure.
`,
  },
  {
    id: 'U3-undefined-tokens',
    label: 'U3 black boxes over text',
    wave: 1,
    dir: '.agents/archon/packets/U3-undefined-tokens',
    files: 'apps/web/src/styles/token-aliases.css and the specific rule(s) at fault + a node:test or scripts/ guard. NOT DocumentsView.tsx (dirty, foreign author).',
    gate: 'npm run typecheck -w @dental/web',
    brief: `
PACKET U3 — SOLID BLACK RECTANGLES ARE RENDERED OVER TEXT ON A LIGHT SURFACE.
Lane: DESIGN SYSTEM. Read .agents/UI_STANDARDS.md COMPLETE.

THE DEFECT, seen by the lead with its own eyes in '.dente-ops-shots/light_duplicateAlert_ПУСТО.png'
(recorded in .agents/archon/VISUAL_VERDICT.md addendum B1): inside the left-hand patient cards — the
cards for «Савельева Ольга Игоревна» and «Громов Илья Андреевич» — a **filled black bar is painted
where a label should be**, on a light background. It is rendered content, not redaction. Around it the
card is otherwise correct.

THE LIKELY CAUSE, and you must confirm or refute it before fixing:
'apps/web/src/styles/token-aliases.css' is a documented repair layer whose own comments record
**19 undefined 'var()' names used 56 times** and **347 hardcoded hex backgrounds in main.css**. An
undefined custom property used as a 'background' collapses to a black or transparent paint exactly like
this. Find the actual rule that paints those card labels.

ORDER:
1. Open the plate yourself first: '.dente-ops-shots/light_duplicateAlert_ПУСТО.png'. **You may and
   should look at it** — locating the element visually is faster than guessing. Describe what you see
   before you theorise.
2. Identify the component rendering those patient cards and the exact class on the black element. Then
   find the CSS rule and the custom property it depends on. Confirm the property is genuinely
   undefined — 'rg' the token name across 'apps/web/src/styles/**' and prove no ':root' block defines
   it in any theme.
3. Fix the ROOT: define the missing token in the canonical palette
   ('styles/dente-redesign.css:11-161', which carries light/dark/night blocks) so all three themes get
   a real value, rather than hardcoding a colour at the use site. **No static hex at the call site**
   (§ UI STANDARDS). If the correct value differs per theme, define it per theme.
4. **THEN BUILD THE GUARD, because this is the packet's real deliverable.** One black box is a symptom;
   19 undefined names used 56 times is the disease. Add a check that fails when a 'var(--x)' is used in
   'apps/web/src/styles/**' with no definition in any ':root'/'[data-theme=...]' block and no inline
   fallback. Put it in 'scripts/' in the style of the existing guards, make its output name every
   offending token and the file:line that uses it, and RUN IT. Report the true count you find — if it
   is not 19, the number in token-aliases.css is stale and the dossier gets corrected.
5. Do NOT attempt to fix all of them in this packet. Fix the one causing the black box, then let the
   guard report the rest as an inventory for the lead to schedule. **If the guard would be red on
   arrival, that is expected — make it print the list and exit non-zero, and say plainly in your handoff
   that it is red and why. Do not weaken it to green.**

PROOF EXPECTED:
- SMOKE VERIFIED: your new guard runs and prints the full offending-token inventory. Quote the output.
- UNIT VERIFIED if you can assert the specific token now resolves in all three themes.
- TYPECHECK VERIFIED: npm run typecheck -w @dental/web — note the 6 pre-existing DocumentsView.tsx
  errors are NOT yours; ignore them and say so.
- The rendered result is NOT VERIFIED by you — the lead owns screenshots. Give the exact command.
`,
  },
  {
    id: 'U4-fab-corner-owner',
    label: 'U4 FABs covering the Save button',
    wave: 2,
    dir: '.agents/archon/packets/U4-fab-corner-owner',
    files: 'the components rendering the help FAB, mic FAB and Cmd+K search pill, plus the CSS that positions them. NOT App.tsx (hot, foreign author). NOT DocumentsView.tsx (dirty).',
    gate: 'npm run typecheck -w @dental/web',
    brief: `
PACKET U4 — THREE FLOATING BUTTONS SIT ON TOP OF A REAL SAVE BUTTON. THIS IS A FUNCTIONAL DEFECT.
Lane: DESIGN SYSTEM / ADAPTIVITY. Read .agents/UI_STANDARDS.md COMPLETE and
.agents/archon/VISUAL_VERDICT.md COMPLETE (§3, §4, addendum A3 and B1 all converge on this).

THE DEFECT, seen by the lead directly across FIVE plates:
Three independent floating elements stack in the bottom-right corner of every screen — a help FAB, a
microphone FAB, and a «Поиск (Cmd+K)» pill. Nobody composed that corner; three features each added one
thing. In '.dente-ops-shots/light_duplicateAlert_ПУСТО.png' the consequence is not cosmetic:
**the mic FAB physically covers the «Сохранить» button of the treatment-plan panel and truncates
«Подпи…».** A control a floating button sits on top of cannot be clicked. In
'.dente-ops-shots/narrow_full.png' (720×1100) the search FAB additionally **collides with the bottom
navigation bar**.

WHAT TO BUILD — give the corner ONE owner:
1. Open both plates yourself before touching code: '.dente-ops-shots/light_duplicateAlert_ПУСТО.png'
   and '.dente-ops-shots/narrow_full.png'. Describe what you see. Then find all three components and
   the CSS that positions each.
2. Create a single owner for that region — one container component with one stacking context and one
   documented rule for what may live there and in what order. The three elements become its children
   instead of three independent 'position: fixed' islands. This is the «every corner has an owner»
   requirement from the visual verdict, and it is the point of the packet: do not simply nudge
   coordinates.
3. **It must not overlap content.** Solve it structurally — the page needs to know the corner exists.
   Reserve space, or make the corner collapse/offset when it would cover interactive content. A
   z-index bump is not a fix; it just puts the button on top more confidently.
4. Respect the bottom navigation at narrow widths: the corner must never collide with it. The bottom nav
   is genuinely good (labelled, clear active state) — protect it.
5. Tokens only, no static hex, relative units, works in light/dark/night and at 390px, 720px and 1440px.
   Russian labels expand 30-50%: nothing may clip.
6. Every listener/observer you add needs a guaranteed teardown.
7. Do NOT touch App.tsx (hot) or DocumentsView.tsx (dirty, foreign author).

PROOF EXPECTED:
- UNIT VERIFIED: a node:test over whatever pure logic you extract (ordering, visibility rules, offset
  computation). If you genuinely cannot extract testable logic, say so honestly rather than writing a
  test that asserts nothing.
- TYPECHECK VERIFIED: npm run typecheck -w @dental/web (the 6 DocumentsView errors are not yours).
- The rendered result is NOT VERIFIED by you — the lead owns the screenshot pipeline and will re-capture
  and judge this personally. Give the exact command that would close it.
`,
  },
  {
    id: 'U5-diary-lock-ceremony',
    label: 'U5 diary signing skips the ceremony',
    wave: 2,
    dir: '.agents/archon/packets/U5-diary-lock-ceremony',
    files: 'apps/api/src/routes/diary.ts + a node:test. NOT db/schema.ts.',
    gate: 'npm run typecheck -w @dental/api',
    brief: `
PACKET U5 — TWO WAYS TO SIGN A VISIT DIARY, AND ONE OF THEM SKIPS INVENTORY AND THE AUDIT LOG.
Lane: CLINICAL. Read .agents/CLINICAL_RULES.md COMPLETE.

THE DEFECT (RECON_DOSSIER.md §5.7): 'apps/api/src/routes/diary.ts' has a POST signing path that
**skips the ceremony the '/lock' path performs** — consumables are not deducted from inventory and no
audit-log entry is written. Two paths, same user-visible action, divergent results. Whichever one a
given screen happens to call decides whether the clinic's stock and its audit trail stay correct.
The dossier also records that diary edits do not save 'revisionReason' or the previous tooth number.

**THE DOSSIER HAS BEEN WRONG BEFORE** — in cycle 3 an agent proved a Telegram claim in §5.7 described
behaviour that does not exist in the live path. **Confirm every clause at a real file:line before you
believe it, and if it is wrong, say so and stop; the dossier gets corrected, not the code.**

ORDER:
1. Read apps/api/src/routes/diary.ts IN FULL. Find both paths. Write the exact line numbers of each into
   state.md.
2. Diff the two ceremonies precisely: what does '/lock' do that POST does not? Inventory deduction,
   audit entry, revision fields, anything else. List every difference before deciding.
3. EXECUTION CHAIN VERIFICATION (§6): which path does the real UI call, and from where? If the POST
   path is what the product actually uses, this is a live data-integrity defect; if it is dead, say so
   with file:line. **State the answer explicitly either way.**
4. Converge them so a signed diary has exactly one meaning. Prefer extracting the ceremony into one
   function both paths call over copying it — copying creates the second owner all over again.
5. Every write stays organization-scoped. Money and stock are exact.
6. Do not touch db/schema.ts. If a column is missing for 'revisionReason' or the previous tooth number,
   write the proposal into your handoff and report it rather than migrating here.

PROOF EXPECTED:
- UNIT VERIFIED, load-bearing: a node:test proving that signing through BOTH paths produces the same
  inventory deduction and the same audit-log entry. That equality IS the fix.
- DB VERIFIED: SQL read at 127.0.0.1:5432 showing the inventory row moved and the audit row exists.
- API VERIFIED: the live server runs 'tsx watch' and picks up your change — drive the real route and
  quote status and body.
- TYPECHECK VERIFIED, plus 'npm test -w @dental/api' summary.
`,
  },
  {
    id: 'U6-state-snapshot-writes',
    label: 'U6 multi-MB write per action',
    wave: 2,
    dir: '.agents/archon/packets/U6-state-snapshot-writes',
    files: 'the module owning mutableStateSnapshot()/persistMutableState() (locate it) + a node:test. NOT routes/telegram.ts (frozen this cycle).',
    gate: 'npm run typecheck -w @dental/api',
    brief: `
PACKET U6 — EVERY SMALL ACTION REWRITES THE WHOLE DATABASE STATE INTO A JSON FILE.
Lane: PLATFORM / PERFORMANCE.

THE DEFECT (RECON_DOSSIER.md §5.7): 'mutableStateSnapshot()' writes DB rows into
'apps/api/.data/dental-crm-state.json', and it is invoked from **32 'persistMutableState()' call
sites**, including Telegram code-issuance. On a 10,000-patient clinic that is a **multi-megabyte
synchronous file write per user action**. This is the kind of low-level correctness the campaign is for:
it does not fail loudly, it just makes the product slow in exactly the way that feels like "the CRM is
sluggish today".

Note the file it writes is one of the three the fleet is forbidden to stage precisely because it churns
constantly — that churn is this defect's fingerprint.

ORDER:
1. FIND it. 'rg' / 'npx @ast-grep/cli' across apps/api/src for 'mutableStateSnapshot' and
   'persistMutableState'. **Write the owning file and the real call-site count into state.md** — the
   dossier says 32; verify it, and correct it if wrong.
2. Read the owning module IN FULL. Establish exactly what the snapshot is FOR: is anything reading it
   back, and on what path? If it is a crash-recovery seed, that changes the correct fix. **If nothing
   reads it, the honest answer may be to stop writing it at all** — prove readership either way with
   rg output before choosing.
3. MEASURE BEFORE YOU FIX. Report the actual serialized size and the wall-clock cost of one write on
   the current database. A performance packet without a number is an opinion. Use a read-only
   measurement; do not pollute real data.
4. Then fix it at the right level — debounce/coalesce, write only what changed, move it off the request
   path, or remove it if unread. Justify the choice against the measurement. **Do not add a cache in
   front of a design problem** (§ TWO STRIKES).
5. If it is genuinely needed for durability, durability belongs in Postgres, not a JSON file beside the
   process. Say so if that is your conclusion, and scope it rather than building it here.
6. Any timer/interval you add needs guaranteed teardown. Do not touch routes/telegram.ts — frozen.

PROOF EXPECTED:
- UNIT VERIFIED: a node:test proving N actions no longer produce N full writes (assert the write count
  or the bytes written, not just that the code runs).
- A BEFORE and AFTER measurement, quoted with real numbers: bytes and milliseconds.
- TYPECHECK VERIFIED, plus 'npm test -w @dental/api' summary.
`,
  },
]

const BUILD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['packet', 'status', 'defectReal', 'commitHash', 'filesChanged', 'proven', 'notProven', 'summary', 'reachability', 'measurements', 'dossierCorrections', 'blockers', 'foundNotFixed'],
  properties: {
    packet: { type: 'string' },
    status: { enum: ['COMMITTED', 'PARTIAL', 'BLOCKED', 'NO_CHANGE'] },
    defectReal: { type: 'boolean' },
    commitHash: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    proven: { type: 'array', items: { type: 'string' } },
    notProven: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    reachability: { type: 'string', description: 'Is the fixed code reachable by a real user? Trace the chain, file:line. "Dead code" is a valid answer.' },
    measurements: { type: 'array', items: { type: 'string' }, description: 'Real numbers you measured (counts, bytes, ms, route totals). Empty if the packet had nothing to measure.' },
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
    LAW + CYCLE5_CORRECTIONS +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'YOUR PACKET: ' + p.id + '\n' +
    'YOUR FILE CLAIM (edit nothing outside this): ' + p.files + '\n' +
    'YOUR COMPILE GATE: ' + p.gate + '\n' +
    'YOUR PACKET DIRECTORY (create FIRST): ' + p.dir + '\n' +
    '═══════════════════════════════════════════════════════════════\n' + p.brief +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'ORDER OF OPERATIONS, MANDATORY:\n' +
    ' 1. Write ' + p.dir + '/state.md == STARTED. NOW, before reading anything.\n' +
    ' 2. Read the authority documents. Complete. state.md == AUTHORITY READ.\n' +
    ' 3. git rev-parse HEAD; git status --porcelain on your claimed files. Dirty and not by you =>\n' +
    '    STOP, report the collision.\n' +
    ' 4. Read your target file(s) IN FULL. Confirm the defect at real lines.\n' +
    '    state.md == DEFECT CONFIRMED / ABSENT. If absent, say so loudly; never invent work.\n' +
    ' 5. Build the real fix. state.md == EDIT WRITTEN.\n' +
    ' 6. Run your compile gate. state.md == GATE PASSED.\n' +
    ' 7. **COMMIT NOW** — pathspec form, retry loop, verify with git log -1 --stat.\n' +
    '    state.md == COMMITTED <hash>. Do NOT wait for proofs.\n' +
    ' 8. Proofs. Second commit for the test. state.md == PROVEN.\n' +
    ' 9. Write ' + p.dir + '/handoff.md. state.md == DONE.\n' +
    '10. Emit structured output. Every "proven" entry must be a command you actually ran.\n' +
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
    'THE DISEASE HERE IS FABRICATED PROOF. What previous reviewers caught, and your standard:\n' +
    '- FEATURES_REGISTRY.md cites proof_<name>.png for 49 features; all 49 files do not exist.\n' +
    '- A milestone was certified on "56 unique MD5, 0 blank pages" while six "themed" shots were one\n' +
    '  Vite CSS error overlay, on the same pass that screenshotted "+null ₽" as green profit.\n' +
    '- mobile_light_documents.png is the staff PIN screen, not documents — MD5-unique and 116 KB, so it\n' +
    '  passes every hash-and-size rubric. **Hash uniqueness proves nothing about content.**\n' +
    '- A handoff asserted "текст не уничтожен"; a reviewer produced run output proving the opposite.\n' +
    '- A packet measured its own cost against a baseline it had itself proved impossible to obtain.\n' +
    '- A smoke passed only because it loaded a compiled dist built BEFORE the fix.\n' +
    'Default posture: disbelief. Reproduce claims; never read them.\n\n' +
    'Read .agents/AGENTS.md COMPLETE plus .agents/INDEX.md. Do NOT penalise the builder for defying §11\n' +
    '(madge absent) or the biome orders (absent; would reformat the repo).\n' +
    'KNOWN PRE-EXISTING, NOT THE BUILDER\'S FAULT: "npm run typecheck -w @dental/web" reports 6\n' +
    '"Cannot find name AnamnesisField" errors in apps/web/src/DocumentsView.tsx, from a second\n' +
    'non-fleet author\'s uncommitted refactor. HEAD itself is clean. Ignore them.\n\n' +
    'THE PACKET: ' + p.id + '\nCLAIMED SCOPE: ' + p.files + '\nCOMMIT TO ATTACK: ' + built.commitHash + '\n' +
    'FILES CHANGED: ' + JSON.stringify(built.filesChanged) + '\n' +
    'CLAIMED PROVEN: ' + JSON.stringify(built.proven) + '\n' +
    'CLAIMED NOT PROVEN: ' + JSON.stringify(built.notProven) + '\n' +
    'REACHABILITY CLAIM: ' + (built.reachability || '(none)') + '\n' +
    'MEASUREMENTS CLAIMED: ' + JSON.stringify(built.measurements || []) + '\n' +
    'SUMMARY: ' + built.summary + '\n' +
    'ORIGINAL BRIEF:\n' + p.brief + '\n\n' +
    'DO THIS:\n' +
    '1. git show ' + built.commitHash + ' --stat, then the full diff, then read the changed files at HEAD\n' +
    '   in context. A diff hides what surrounds it.\n' +
    '2. HYPOTHESES YOU MUST ACTUALLY TEST:\n' +
    '   - Was the defect REAL before this commit? (git show ' + built.commitHash + '^:<path>)\n' +
    '   - **Is the fix REACHABLE by a real user, or dead code sold as a product fix?** Trace it yourself.\n' +
    '   - **Does it hold on REAL data, not just the fixture?**\n' +
    '   - **Are the claimed MEASUREMENTS reproducible?** Re-measure. A number nobody can reproduce is a\n' +
    '     fabrication even when it is plausible.\n' +
    '   - For a SECURITY packet: try to BYPASS the new guard — no credentials, malformed credentials,\n' +
    '     another tenant\'s credentials, and an organization UUID that exists in no organizations row.\n' +
    '     Quote every status code you observe.\n' +
    '   - For a GATE packet: does the gate actually FAIL when the defect is reintroduced? A gate nobody\n' +
    '     proved can go red is not a gate. Break something in a scratch copy and check.\n' +
    '   - HOLLOW FACADE — {success:true} over a no-op, placeholder, magic constant, hardcoded\n' +
    '     UUID/port/endpoint, fabricated 0/default for an unknown value?\n' +
    '   - SECOND OWNER of something that already had one?\n' +
    '   - Deleted/renamed a useAppLogic.tsx return field? Listener/interval/handle without teardown?\n' +
    '   - Hardcoded hex, static px where a relative unit belongs, undeclared Russian literal?\n' +
    '   - Mojibake in the diff or the commit subject? Check actual characters.\n' +
    '   - If the packet deleted a file: git grep -n "<BaseName>" HEAD -- apps/ must return nothing.\n' +
    '3. PROOF AUDIT — the part that matters most. RE-RUN EVERY CLAIMED PROOF COMMAND YOURSELF, the same\n' +
    '   one, capturing the TRUE exit code (not $? after a pipe).\n' +
    '4. GIT HYGIENE: only the claimed files? Any churn (apps/api/.data/*.json, tsbuildinfo, scratch/**)\n' +
    '   or another author work swept in via the shared index? Russian subject naming the DEFECT?\n' +
    '5. VERDICT. Reserve REVERT for a change actively worse than the defect. Never award SOUND to a\n' +
    '   change whose central claim you could not reproduce. If NEEDS_REWORK, make requiredRework\n' +
    '   numbered, specific and actionable.\n\n' +
    'CONSTRAINTS: read-only on source — no edit, fix, commit, revert, git add. Never git remote -v (live\n' +
    'tokens). Never npx @biomejs/biome. Do not start or restart any server, no screenshot pipeline. You\n' +
    'MAY run typechecks, tests, smokes, builds, read-only node -e, curl to 127.0.0.1:4100, read-only SQL.',
    { label: 'attack:' + p.id, phase: 'Attack', schema: REVIEW_SCHEMA }
  )
}

const all = []
for (const waveNo of [1, 2]) {
  const wave = PACKETS.filter((p) => p.wave === waveNo)
  log('Cycle 5 wave ' + waveNo + ': ' + wave.map((p) => p.id).join(', '))
  const done = await pipeline(wave, buildStage, reviewStage)
  for (let i = 0; i < wave.length; i++) all.push({ packet: wave[i].id, dir: wave[i].dir, review: done[i] || null })
  log('Cycle 5 wave ' + waveNo + ' complete.')
}
return { cycle: 5, results: all }
