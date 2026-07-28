export const meta = {
  name: 'archon-cycle-6',
  description: 'DENTE cycle 6: close the four cycle-5 reworks, authorise-before-validate, narrow dead width',
  phases: [
    { title: 'Build', detail: 'reworks first, then two fresh defects' },
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

const CYCLE6_CORRECTIONS = `
═══ CORRECTIONS — CYCLE 6. THESE OVERRIDE THE TEXT ABOVE. ═══
1. **apps/api/dist is NOT tracked.** It exists on disk. Never stage it. 'npm run build -w @dental/api'
   produces ZERO git churn — use it as proof freely. **Several defects this campaign were hidden by a
   STALE dist**: a smoke that passed only because it loaded a pre-fix build, and a security banner that
   kept printing old text until rebuilt. If your proof loads 'apps/api/dist/**', REBUILD FIRST or your
   result is about yesterday's code.
2. **The dev server runs 'tsx watch'** (apps/api/package.json). It picks up your source edits.
   **API VERIFIED against 127.0.0.1:4100 IS available.** Do not restart the shared server.
3. **A guard is decided in the HANDLER BODY, never at the 'app.post(...)' registration line.**
4. **SPEECH/DICTATION AND TELEGRAM REMAIN FROZEN** (five and two failed reviews). Do not edit
   apps/api/src/speech/**, routes/speech.ts, or routes/telegram.ts.
5. **apps/web/src/App.tsx is DIRTY** (second, non-fleet author). Do not touch it. workspaceShell.tsx and
   workspacePreload.ts are currently free.
6. **Both typecheck gates are GREEN right now.** Any error you see is either yours or a very recent
   foreign edit — check 'git status --porcelain' on the offending file before assuming.
`

const REWORK_RULES_6 = `
═══ THIS IS A REWORK PACKET. READ TWICE. ═══
A previous agent built this and committed it; an adversarial reviewer returned NEEDS_REWORK with a
numbered list. **THE REVIEW FILE IS YOUR SPECIFICATION.** Read it COMPLETE before touching anything.
1. Do not start over. Prior commits are pushed. Amend behaviour FORWARD with new commits. Never rewrite
   history, never revert the prior work wholesale.
2. **Every numbered item must appear in your report as CLOSED, DECLARED DEBT, or DISPUTED.** Silence on
   an item is an automatic re-fail.
3. You MAY DISPUTE an item — but only with a command and its output, or a file:line. "I disagree"
   without evidence is a failed packet. Reviewer output is evidence, not authority; so is yours.
4. **Correct any false claim in the prior handoff or commit message.** Reviewers have caught several.
   You cannot rewrite a pushed commit — so state the correction where the claim is READ: in the packet
   handoff, and tell the lead to put it in .agents/archon/progress.md. Fix the words as well as the code.
5. The reviewer's own new findings (F1/F2/…) count. HIGH/MEDIUM ones must be closed or declared.
6. Re-run the specific proof the reviewer asked for.
`

const PACKETS = [
  {
    id: 'V1-corner-reserve-regression',
    label: 'V1 corner ate a third of the phone',
    wave: 1,
    rework: '.agents/archon/packets/U4-fab-corner-owner/review.md',
    dir: '.agents/archon/packets/V1-corner-reserve-regression',
    files: 'the corner-owner component and its CSS from U4 (see that packet handoff.md) + its tests. NOT App.tsx (dirty).',
    gate: 'npm run typecheck -w @dental/web',
    brief: `
PACKET V1 — THE FIX FOR THE FAB CORNER MAY HAVE MADE MOBILE WORSE. Lane: DESIGN SYSTEM / ADAPTIVITY.
Read .agents/UI_STANDARDS.md COMPLETE.
**YOUR SPECIFICATION: .agents/archon/packets/U4-fab-corner-owner/review.md — read it COMPLETE**, plus
U4's handoff.md and state.md.

U4 correctly closed a real functional defect: three floating buttons were physically covering the
treatment-plan «Сохранить» button and colliding with the bottom navigation. That part stands. But the
reviewer found the cure has its own disease, and two findings are load-bearing:

- **F2 (MEDIUM) — the corner reserve is applied TWICE at ≤840px, so roughly 304 px of an 844 px phone
  viewport becomes reserve.** That is over a third of the screen given to empty space in the name of
  not covering a button. On a patients list that already showed no patients above the fold (see
  .agents/archon/VISUAL_VERDICT.md §4), this is a worse outcome than the overlap it replaced. **Close
  this one first; it is the reason the packet failed.**
- **F4 (MEDIUM) — the layout pass runs on every scroll frame, on every screen, forcing 2 full layouts
  plus 5 hit tests (10 in the compact path).** Forced synchronous layout per scroll frame is exactly
  the kind of low-level sloppiness that makes a product feel slow without ever failing a test. Measure
  it, then fix it — observers, rAF coalescing, or caching the obstacle geometry; justify the choice
  with numbers.
- **F3 (MEDIUM) — the obstacle list is sampled only at the un-lifted footprint**, so when the bar lifts
  it can park itself on a button it never measured. That reintroduces the original defect in a new
  place.
- F5, F6, F7 (LOW): five exported functions the shipped corner never calls, with the headline coverage
  claim resting on one of them; a commit message that permanently records a mechanism the handoff
  retracts; and two breakpoint mismatches introduced by the move. Close or declare each.

CONSTRAINTS: tokens only, no static hex, relative units, light/dark/night, Russian text expands 30-50%.
Guaranteed teardown for every observer/listener. Do NOT touch App.tsx.

PROOF EXPECTED:
- UNIT VERIFIED on the reserve arithmetic: assert that at 390×844 and at 840px the reserve is applied
  ONCE and quote the resulting pixel value. A number, not a claim.
- A BEFORE/AFTER measurement for F4 (layout count or ms per scroll frame). A performance claim without
  a reproducible number is an opinion.
- TYPECHECK VERIFIED: npm run typecheck -w @dental/web
- The rendered result is NOT VERIFIED by you — the lead owns screenshots and will re-capture and judge
  this personally. Give the exact command.
`,
  },
  {
    id: 'V2-inventory-false-record',
    label: 'V2 correct the false defect record',
    wave: 1,
    rework: '.agents/archon/packets/U5-diary-lock-ceremony/review.md',
    dir: '.agents/archon/packets/V2-inventory-false-record',
    files: 'apps/api/src/routes/diary.ts and the inventory deduction path + its tests + the U5 packet docs.',
    gate: 'npm run typecheck -w @dental/api',
    brief: `
PACKET V2 — A COMMIT MESSAGE IN THIS REPOSITORY DESCRIBES A DEFECT THAT DOES NOT REPRODUCE.
Lane: CLINICAL / MONEY. Read .agents/CLINICAL_RULES.md COMPLETE.
**YOUR SPECIFICATION: .agents/archon/packets/U5-diary-lock-ceremony/review.md — read it COMPLETE.**

U5 landed two real fixes: the POST signing path now performs the same ceremony as '/lock' (inventory
deduction + audit entry), and an inventory bug. The ceremony work stands. The PROBLEM is the record:

**Commit '1f65d674b' claims an empty shelf gained stock and that a 0-deduction rule became a deduction
of 1. The reviewer proved neither reproduces at '1f65d674b^':** the empty shelf returned
'400 TransactionFailed' with stock 0, and the 0-rule deducted 0. **The real defect was different and
worse: a NEGATIVE 'quantity_to_deduct' raised stock from 10 to 16 and wrote a positive 'auto_deduct'
row, and a 0-rule wrote a junk 0-quantity movement row.**

This matters beyond bookkeeping. The lead relayed that false subject line onward as fact, so the
campaign's own record briefly carried a fabricated defect — the exact disease this campaign exists to
remove, produced by us.

WHAT TO DO:
1. **You cannot rewrite a pushed commit and must not try.** State the correction where the claim is
   actually READ: rewrite the packet's handoff.md to carry the true finding with the reviewer's
   reproduction, and put a correction note at the top of your own handoff addressed to the lead for
   .agents/archon/progress.md. Name the false sentence explicitly.
2. Verify the REAL defect is genuinely fixed at HEAD: a negative 'quantity_to_deduct' must not be able
   to raise stock, and a 0-quantity rule must not write a movement row. If either still reproduces,
   that is the code half of this packet — fix it and prove it.
3. Item 2 of the review: state plainly that changing '||' to '??' on 'inv.stockQuantity',
   'rule.quantityToDeduct' and 'item.quantity' is a behavioural NO-OP, with the reason
   (schema.ts:390/1523/1675 declare all three NOT NULL with defaults). Do not claim a fix you did not
   make.
4. Work every remaining numbered item: CLOSED / DECLARED DEBT / DISPUTED-with-evidence.
5. Consider whether the deduction path should refuse negative quantities structurally — a CHECK
   constraint proposal belongs in your handoff, not in a migration here (you may not touch schema.ts).

PROOF EXPECTED:
- UNIT VERIFIED: a node:test asserting a negative 'quantity_to_deduct' cannot increase stock and that a
  0-quantity rule writes no movement row. EXECUTE it, quote the pass.
- DB VERIFIED: SQL read at 127.0.0.1:5432 showing stock and movement rows after each case.
- TYPECHECK VERIFIED plus 'npm test -w @dental/api' summary.
`,
  },
  {
    id: 'V3-token-guard-precision',
    label: 'V3 token guard false negatives',
    wave: 1,
    rework: '.agents/archon/packets/U3-undefined-tokens/review.md',
    dir: '.agents/archon/packets/V3-token-guard-precision',
    files: 'scripts/check-css-tokens.mjs + apps/web/src/styles/token-aliases.css comments. NOT main.css.',
    gate: 'node scripts/check-css-tokens.mjs',
    brief: `
PACKET V3 — THE NEW CSS-TOKEN GUARD MISREADS ITS OWN INPUT.
Lane: DESIGN SYSTEM / PROOF.
**YOUR SPECIFICATION: .agents/archon/packets/U3-undefined-tokens/review.md — read it COMPLETE.**

U3 fixed the black rectangles and built a guard against undefined CSS custom properties — the right
deliverable, because 19 undefined names used 56 times is the disease and the black box was only a
symptom. But the guard has two parsing bugs that make it lie, and a guard that lies is worse than none:

1. **'scripts/check-css-tokens.mjs:129' — the declaration regex is unanchored**, so a selector like
   '.foo--bar:hover' is read as a DECLARATION of '--bar'. Every offending token whose name happens to
   appear inside a class name is silently marked defined. Anchor it: require a '{', ';' or
   start-of-line before the '--'. Re-run and QUOTE THE NEW TOTALS — they will change, and the change is
   the proof.
2. **':143-149' — '.ts/.tsx' harvesting does not strip comments**, so a commented-out '"--name":'
   silences a real offender. Strip comments first, or narrow the pattern to object-literal /
   'setProperty' positions. **Prove it with a fixture**: a commented-out mention must no longer hide a
   genuine undefined token.
3. **'apps/web/src/styles/token-aliases.css:19-20'** — the comment says «осталось ДВА»; replace it with
   the corrected count once the parser is fixed, and add '--danger' to the named list.
4. Record '--danger' ('main.css:2251', 'main.css:4065') as an open inventory item for the lead with its
   real usage sites.
5. Work every remaining numbered item: CLOSED / DECLARED DEBT / DISPUTED-with-evidence.

**The guard is expected to be RED on arrival and that is correct.** Do not weaken it to green. Its job
is to print a truthful inventory and exit non-zero. Say plainly in your handoff that it is red, how
many tokens it lists, and that the list is now trustworthy where before it was not.

PROOF EXPECTED:
- SMOKE VERIFIED: run the guard BEFORE and AFTER your parser fixes and quote BOTH totals. A count that
  did not move means one of the two bugs was not real — say so.
- UNIT VERIFIED: a fixture test for each parsing bug (the '.foo--bar:hover' case and the commented-out
  mention). EXECUTE it, quote the pass.
`,
  },
  {
    id: 'V4-gate-hardening',
    label: 'V4 harden the behavioural gate',
    wave: 2,
    rework: '.agents/archon/packets/U2-behavioural-guard-gate/review.md',
    dir: '.agents/archon/packets/V4-gate-hardening',
    files: 'scripts/smoke-clinical-mutation-guard.mjs and scripts/lib/api-route-census.mjs',
    gate: 'node scripts/smoke-clinical-mutation-guard.mjs',
    brief: `
PACKET V4 — HARDEN THE GATE THAT NOW POLICES 479 ROUTES.
Lane: PROOF.
**YOUR SPECIFICATION: .agents/archon/packets/U2-behavioural-guard-gate/review.md — read it COMPLETE.**

U2 replaced a gate that counted identifiers with one that boots the real app, reads its route table and
sends a credential-less request to every route. The lead verified it personally: **481 route table
entries, 479 probed, 186 mutating, 450 challenged, 553 ms, exit 0.** That is a large improvement and it
stands. The reviewer's five items are all cheap and all make it harder to fool:

1. Correct "24" to **276** in the handoff, measured in the gate's own configuration.
2. **Add a dist-freshness gate to 'createRealApiApp()'**: fail (or rebuild) when any
   'apps/api/src/**/*.ts' is newer than its 'apps/api/dist/**/*.js'. **This is the most valuable item
   in the packet.** A stale dist has now hidden three separate defects in this campaign — a smoke that
   passed against a pre-fix build, a security banner that kept printing retired text, and a route fix
   that never shipped. A gate that silently tests yesterday's build is the same class of lie.
3. Replace 'app.log.level = "silent"' with a capturing logger that suppresses 'request completed' noise
   but **FAILS the run** on 'FST_ERR_REP_ALREADY_SENT' or any record at level ≥ 40. Silence hides
   double-reply bugs.
4. State the 'app.inject' vs listening-socket divergence ('identity.ts:98-115') as a NAMED limitation
   next to the existing WebSocket one, and stop claiming full equivalence with the browser path. The
   gate already declares its WebSocket blind spot honestly — do the same here.
5. Add 'DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS' and 'DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE' to
   'developmentEscapeFlagNames', or the gate can pass on a machine where those escapes are armed.

Work every item: CLOSED / DECLARED DEBT / DISPUTED-with-evidence.

PROOF EXPECTED:
- SMOKE VERIFIED: the gate still exits 0 and still reports its route counts. Quote them.
- **Demonstrate the dist-freshness gate FIRES**: touch a src file, run the gate, show it refuses; then
  rebuild and show it passes. Quote both runs. A guard nobody proved can go red is not a guard.
- Demonstrate the logger change catches a level≥40 record (construct one in a scratch copy, do not
  commit it).
`,
  },
  {
    id: 'V5-payload-before-auth',
    label: 'V5 body validated before rights',
    wave: 2,
    dir: '.agents/archon/packets/V5-payload-before-auth',
    files: 'apps/api/src/routes/auth.ts + its node:test',
    gate: 'npm run typecheck -w @dental/api',
    brief: `
PACKET V5 — TWO ROUTES VALIDATE THE REQUEST BODY BEFORE CHECKING WHETHER THE CALLER MAY ACT.
Lane: PLATFORM / SECURITY.

FOUND BY THE NEW BEHAVIOURAL ROUTE GATE, which reports it under 'payloadBeforeAuthorisation':
- 'POST /api/auth/clinic/set-password' — 'auth.ts:278-281' checks the new password's length **before**
  the rights check at 'auth.ts:283-292'.
- 'POST /api/auth/staff/set-pin' — 'auth.ts:331-337' checks that the employee exists and that the PIN
  is 4-12 digits **before** the rights check at 'auth.ts:339-348'.

WHY THIS MATTERS. An unauthenticated caller learns things it should not: whether a given employee
exists, and the exact shape of the password and PIN policy, by reading which validation error comes
back. It is also a latent 500/side-effect surface — any validation that touches the database before
authorisation is work an anonymous caller can make the server do. **Authorise first, then validate.**

ORDER:
1. Read apps/api/src/routes/auth.ts IN FULL. It is the credential surface of the whole product; do not
   skim it. Confirm both orderings at the cited lines and write them into state.md.
2. Check whether OTHER handlers in this file share the pattern. The gate found two; the file may hold
   more that the gate cannot see because they are already behind a guard. Report what you find.
3. Move the rights check ahead of body validation in both handlers. **Preserve the existing error
   contracts for authorised callers** — an authorised caller sending a bad PIN must still get the same
   validation error it gets today, with the same code and message. Changing that would break the UI.
4. Make sure the unauthorised response does not leak which of the two reasons applied. Uniform refusal.
5. Do not weaken any existing guard, and do not touch accessGuard.ts or identity.ts.

PROOF EXPECTED:
- UNIT VERIFIED, load-bearing: node:test with app.inject() proving that with NO credentials both routes
  refuse **without revealing** whether the employee exists or whether the PIN was well-formed; and that
  WITH credentials the existing validation errors are unchanged. EXECUTE it, quote the pass.
- SMOKE VERIFIED: 'node scripts/smoke-clinical-mutation-guard.mjs' — the two routes must disappear from
  its 'payloadBeforeAuthorisation' list. Quote the list before and after. That is the cleanest possible
  proof and the gate already prints it for you.
- TYPECHECK VERIFIED plus 'npm test -w @dental/api' summary.
`,
  },
  {
    id: 'V6-narrow-dead-width',
    label: 'V6 45% dead width at 720px',
    wave: 2,
    dir: '.agents/archon/packets/V6-narrow-dead-width',
    files: 'the layout/CSS owning the narrow breakpoint. NOT App.tsx (dirty), NOT the corner component (V1 owns it).',
    gate: 'npm run typecheck -w @dental/web',
    brief: `
PACKET V6 — AT 720×1100 ALMOST HALF THE WIDTH RENDERS NOTHING.
Lane: ADAPTIVITY. Read .agents/UI_STANDARDS.md COMPLETE and
.agents/archon/VISUAL_VERDICT.md addendum B2 COMPLETE.

THE DEFECT, seen by the lead directly in '.dente-ops-shots/narrow_full.png' (720×1100 — a breakpoint
nobody had judged before this campaign): the duplicates table reflows correctly into a stacked
label/value layout, and the bottom navigation is labelled and good. But **roughly 45% of the width is
one empty white panel.** At the exact breakpoint where horizontal space is scarcest, nearly half of it
renders nothing.

ORDER:
1. **Open the plate yourself first**: '.dente-ops-shots/narrow_full.png'. You may and should look at
   it. Describe what you actually see before theorising — the empty region's position and boundaries
   tell you which container owns it.
2. Identify the container. The likely shape is a two-column grid or a flex row whose second child has
   no content at this width, or a fixed-width sidebar that keeps its track when its content is empty.
   Confirm with the real CSS/component, not a guess.
3. Fix it structurally: at this breakpoint the layout must collapse to a single column, or the empty
   region must yield its space. **Do not paper over it with a placeholder or an empty-state card** —
   filling dead space with decoration is not the same as not wasting it (§ ZERO MOCKS: never a widget
   that exists to look occupied).
4. Verify the neighbouring breakpoints did not regress: 390 px (phone), 720 px (this one), 1440 px
   (desktop). Russian labels expand 30-50%; nothing may clip at any of the three.
5. The bottom navigation at narrow widths is genuinely good — protect it. The corner component is owned
   by packet V1 this cycle: **do not edit it**; if your fix interacts with it, report the interaction.
6. Tokens only, no static hex, relative units, light/dark/night.

PROOF EXPECTED:
- UNIT VERIFIED on whatever pure layout decision you can extract (breakpoint → column count, or the
  visibility predicate). If nothing is genuinely extractable, say so honestly rather than writing a
  test that asserts nothing.
- TYPECHECK VERIFIED: npm run typecheck -w @dental/web
- The rendered result is NOT VERIFIED by you — the lead owns the screenshot pipeline, will re-capture
  narrow_full.png and judge it personally. Give the exact command that would close it.
`,
  },
]

const BUILD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['packet', 'status', 'defectReal', 'commitHash', 'filesChanged', 'proven', 'notProven', 'summary', 'reachability', 'measurements', 'reworkItems', 'recordCorrections', 'dossierCorrections', 'blockers', 'foundNotFixed'],
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
    measurements: { type: 'array', items: { type: 'string' }, description: 'Real reproducible numbers you measured. A performance or coverage claim without one is an opinion.' },
    reworkItems: { type: 'array', items: { type: 'string' }, description: 'Rework packets: EVERY numbered reviewer item marked CLOSED / DECLARED DEBT / DISPUTED(evidence).' },
    recordCorrections: { type: 'array', items: { type: 'string' }, description: 'Any false statement in a prior commit message or handoff that you corrected, quoted, with the true finding. Empty if none.' },
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
    LAW + CYCLE6_CORRECTIONS + (p.rework ? REWORK_RULES_6 : '') +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'YOUR PACKET: ' + p.id + '\n' +
    (p.rework ? 'YOUR SPECIFICATION (read COMPLETE, first): ' + p.rework + '\n' : '') +
    'YOUR FILE CLAIM (edit nothing outside this): ' + p.files + '\n' +
    'YOUR COMPILE GATE: ' + p.gate + '\n' +
    'YOUR PACKET DIRECTORY (create FIRST): ' + p.dir + '\n' +
    '═══════════════════════════════════════════════════════════════\n' + p.brief +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'ORDER OF OPERATIONS, MANDATORY:\n' +
    ' 1. Write ' + p.dir + '/state.md == STARTED. NOW, before reading anything.\n' +
    ' 2. Read the authority documents. Complete. state.md == AUTHORITY READ.\n' +
    (p.rework ? ' 2b. Read ' + p.rework + ' COMPLETE, plus that packet handoff.md and state.md.\n' : '') +
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
    'THE DISEASE HERE IS FABRICATED PROOF. What reviewers before you caught — this is your standard:\n' +
    '- 49 cited proof_*.png files that do not exist.\n' +
    '- A milestone certified on "56 unique MD5" where six "themed" shots were one Vite error overlay.\n' +
    '- A screenshot that is MD5-unique and 116 KB and shows the staff PIN screen, not the view it is\n' +
    '  named after. Hash uniqueness proves nothing about content.\n' +
    '- A handoff asserting "текст не уничтожен" refuted by run output.\n' +
    '- A measurement taken against a baseline the packet itself proved impossible to obtain.\n' +
    '- A smoke green only because it loaded a dist built BEFORE the fix.\n' +
    '- **A commit message describing a defect that does not reproduce at its own parent commit.**\n' +
    'Default posture: disbelief. Reproduce claims; never read them. Re-derive numbers.\n\n' +
    'Read .agents/AGENTS.md COMPLETE plus .agents/INDEX.md. Do NOT penalise the builder for defying §11\n' +
    '(madge absent) or the biome orders (absent; would reformat the repo).\n' +
    'REBUILD BEFORE PROVING anything that loads apps/api/dist — a stale dist has hidden three defects.\n\n' +
    (p.rework ? 'THIS IS A REWORK PACKET. Its specification was ' + p.rework + ' — READ IT COMPLETE, then\nverify item by item that each numbered requirement is genuinely CLOSED, honestly DECLARED, or DISPUTED\nWITH REAL EVIDENCE. **An item silently ignored is an automatic NEEDS_REWORK.** Also verify the builder\ncorrected any false claim in the previous handoff or commit message.\n\n' : '') +
    'THE PACKET: ' + p.id + '\nCLAIMED SCOPE: ' + p.files + '\nCOMMIT TO ATTACK: ' + built.commitHash + '\n' +
    'FILES CHANGED: ' + JSON.stringify(built.filesChanged) + '\n' +
    'CLAIMED PROVEN: ' + JSON.stringify(built.proven) + '\n' +
    'CLAIMED NOT PROVEN: ' + JSON.stringify(built.notProven) + '\n' +
    'REACHABILITY: ' + (built.reachability || '(none)') + '\n' +
    'MEASUREMENTS CLAIMED: ' + JSON.stringify(built.measurements || []) + '\n' +
    'RECORD CORRECTIONS CLAIMED: ' + JSON.stringify(built.recordCorrections || []) + '\n' +
    'SUMMARY: ' + built.summary + '\n' +
    'ORIGINAL BRIEF:\n' + p.brief + '\n\n' +
    'DO THIS:\n' +
    '1. git show ' + built.commitHash + ' --stat, then the full diff, then read the changed files at HEAD.\n' +
    '2. HYPOTHESES YOU MUST ACTUALLY TEST:\n' +
    '   - Was the defect REAL before this commit? (git show ' + built.commitHash + '^:<path>) **Reproduce\n' +
    '     it at the parent.** A commit in this repo has already been caught describing a defect that\n' +
    '     does not reproduce.\n' +
    '   - Is the fix REACHABLE by a real user, or dead code sold as a product fix?\n' +
    '   - Does it hold on REAL data, not just the fixture?\n' +
    '   - Are the claimed MEASUREMENTS reproducible? Re-measure every one.\n' +
    '   - Did the fix introduce a REGRESSION worse than the defect? One cycle-5 packet closed a real\n' +
    '     overlap and gave away a third of a phone viewport doing it. Look for that shape.\n' +
    '   - HOLLOW FACADE, SECOND OWNER, deleted useAppLogic return field, missing teardown, hardcoded\n' +
    '     hex/px, undeclared Russian literal, mojibake in diff or subject?\n' +
    '   - For a GATE packet: does the gate FAIL when the defect is reintroduced? Break it in a scratch\n' +
    '     copy and check. A gate nobody proved can go red is not a gate.\n' +
    '3. PROOF AUDIT: RE-RUN EVERY CLAIMED PROOF COMMAND YOURSELF, capturing the TRUE exit code.\n' +
    '4. GIT HYGIENE: only the claimed files? churn or another author work swept in via the shared index?\n' +
    '   Russian subject naming the DEFECT?\n' +
    '5. VERDICT. Reserve REVERT for a change actively worse than the defect. Never award SOUND to a\n' +
    '   claim you could not reproduce. If NEEDS_REWORK, make requiredRework numbered and actionable.\n\n' +
    'CONSTRAINTS: read-only on source — no edit, fix, commit, revert, git add. Never git remote -v (live\n' +
    'tokens). Never npx @biomejs/biome. Do not start or restart any server, no screenshot pipeline. You\n' +
    'MAY run typechecks, tests, smokes, builds, read-only node -e, curl to 127.0.0.1:4100, read-only SQL.',
    { label: 'attack:' + p.id, phase: 'Attack', schema: REVIEW_SCHEMA }
  )
}

const all = []
for (const waveNo of [1, 2]) {
  const wave = PACKETS.filter((p) => p.wave === waveNo)
  log('Cycle 6 wave ' + waveNo + ': ' + wave.map((p) => p.id).join(', '))
  const done = await pipeline(wave, buildStage, reviewStage)
  for (let i = 0; i < wave.length; i++) all.push({ packet: wave[i].id, dir: wave[i].dir, review: done[i] || null })
  log('Cycle 6 wave ' + waveNo + ' complete.')
}
return { cycle: 6, results: all }
