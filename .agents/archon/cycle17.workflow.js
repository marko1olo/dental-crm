export const meta = {
  name: 'archon-cycle-17',
  description: 'DENTE cycle 17 (rework): a consultation silently priced at double, an invisible risk tier, contrast measured against the losing palette, and radiology laid out but never painted',
  phases: [
    { title: 'Build', detail: 'four reworks; reproduce the reviewer findings before trusting them' },
    { title: 'Attack', detail: 'a different agent per packet; a touched money comparison is REVERT-grade' },
  ],
}

/*
 * DELIBERATELY SHORT LAW. The previous cycles carried a ~15 KB preamble and agents
 * were spending their whole credit window reading it before doing any work — six
 * agents died in a row without committing. This law is ~2 KB on purpose. The rest
 * of the constitution is on disk and the packet says which parts to read.
 */
const LAW = `
You are an implementer on the DENTE dental CRM under lead [ARCHON].
Repo root: C:\\Clinic_MVP\\dental-crm (branch main). Russian-language dental CRM for solo dentists.

═══ THIS IS A SMALL PACKET. FINISH IT AND COMMIT WITHIN MINUTES. ═══
Credit exhaustion has killed six agents in a row here, each before committing. So:
1. Do NOT read the whole constitution. Read ONLY your target file and the two lines this brief names.
2. Make the change. It is mechanical and the brief tells you exactly what.
3. **COMMIT AS SOON AS IT COMPILES.** Then improve if you still have room.
4. Write '<packet dir>/state.md' with one line before you start and one line after you commit. Nothing else.

═══ GIT — THE INDEX IS SHARED, OTHER AGENTS STAGE FILES ═══
    for i in 1 2 3 4 5 6; do git commit -F <msgfile> -- <your paths> && break || sleep 4; done
The '--' and the explicit path list are MANDATORY — a bare 'git commit' takes another agent's staged work.
No 'git push' (lead only). No 'git stash'. No 'git add .'. **NEVER 'git remote -v'** — the remote URLs
contain live plaintext access tokens.

═══ BANNED ═══
No script that writes a source file. No 'node -e' that writes. No regex surgery across files. Editor tools
only; 'node -e' is fine READ-ONLY. One such script destroyed 10,554 Cyrillic characters in this repo.
**Never read, echo or commit anything from '.env' or 'local-secrets/'.**
**NO TOOL ATTRIBUTION IN THE COMMIT** — no 'Co-Authored-By', no '@anthropic.com', no «Generated with»
footer. The owner's standing instruction, already violated 220 times. Write the message to a file, commit
with 'git commit -F', and check 'git log -1 --format=%(trailers)' is EMPTY.

═══ GATES ARE THE LEAD'S (§7a) ═══
Do NOT run 'npm run typecheck', 'npm run build', 'npm test', migrations or seeds — they write shared state
and three other agents are running. **Your own signal is 'node --import tsx --test <one file>'.** Put any
command you need the lead to run into 'leadMustRun'.

═══ COMMIT MESSAGE ═══
Russian, Conventional Commits, prefixed '[ARCHON] ', subject names THE DEFECT not the activity. Body says
WHY. Banned words: improve, enhance, update, cleanup. Example from HEAD:
    fix(документы): квитанция и возврат на верную сумму отклонялись из-за сложения в плавающей точке

═══ HONESTY ═══
Every "proven" entry is a command you actually RAN, with its TRUE exit code — captured WITHOUT a pipe
('cmd > /tmp/log 2>&1; echo $?'), because '$?' after a pipe reports the pipe and the lead has been fooled by
that. If your measurement contradicts this brief, YOUR MEASUREMENT WINS — say so loudly. The lead has been
wrong seven times tonight and expects correction.
`

const PACKETS = [
  {
    id: 'GG1-price-separator-eats-money',
    label: 'GG1 «Консультация 1000/500 руб» silently becomes 1000 ₽',
    dir: '.agents/archon/packets/GG1-price-separator-eats-money',
    files: 'apps/api/src/pricelist/analyzer.ts and the test files under apps/api/src/pricelist/',
    gate: 'node --import tsx --test apps/api/src/pricelist/analyzer.test.ts and .../pricelistKopecks.test.ts',
    brief: `
REWORK OF FF4, VERDICT NEEDS_REWORK. The previous packet fixed part of this and its reviewer found the
rest, measured. **This is money that reaches a document the patient signs, so it outranks cosmetics.**

**FOUR THINGS THE REVIEWER ESTABLISHED. Confirm each yourself before touching anything.**

1. **A DESCENDING PAIR SILENTLY PICKS THE HIGHER PRICE.** «Консультация 1000/500 руб» becomes 1000 ₽.
   The '/' is treated as a range separator unconditionally; the pair is then rejected because
   'max < min', and the rejection collapses two candidates into the higher one instead of refusing.
   A price list that means «1000 первичная / 500 повторная» silently prices every consultation at the
   higher figure. **Either stop treating '/' as a range separator unconditionally, or stop letting a
   rejected pair collapse.** Add BOTH a descending-pair test and an ascending two-option test.

2. **THE TITLE-STRIP RULE AT ':501' DELETES NUMBERS IT NEVER PRICED.** License numbers, contract
   numbers, dates, room numbers and per-unit denominators are cut out of service titles. Pin
   «Седация 5000/120 мин» (120 is minutes, not money) and «Лицензия 5678/2024 …» (a licence number).
   **Bound the strip rule to text 'extractPrice' actually priced** — the same 300 ₽ floor, the same
   selected match — so it can only remove what it recognised as a price.

3. **THE ORIGINALLY DISPATCHED DEFECT IS STILL LIVE**: a range with currency on BOTH bounds.
   «12000 руб - 18000 руб», «12000 ₽ - 18000 ₽», «от 12000 руб до 18000 руб» — both the title AND the
   lower bound are still wrong. Pin all three forms.

4. **A COMMIT-MESSAGE CLAIM IS FALSE.** The previous commit claimed the existing 'priceMaxRub >= priceRub'
   check makes the outcome safe. It does not — see item 1. Correct the record in your own commit body;
   do not repeat the claim.

**ORDER OF WORK.** Reproduce all four with your own driver first and print the actual parsed title,
'priceRub' and 'priceMaxRub' for every input above. **If any does not reproduce, say so loudly** — the
lead has been wrong ten times tonight and a reviewer's finding is evidence, not scripture.
Then inventory the whole separator family before fixing: '-', '–', '—', '/', «от … до …», «за», with and
without currency on each side, with and without thousands separators. Fixing three forms and leaving four
is the half-closed chain this campaign keeps rejecting.

**DO NOT BREAK WHAT IS ALREADY RIGHT.** The deterministic parser is kopeck-exact: «Лечение кариеса 1500,50»
must still give 1500.5, not 1500. Both existing test files must stay green — run them and quote TRUE exit
codes captured WITHOUT a pipe ('cmd > /tmp/log 2>&1; echo $?').

**A TITLE IS NOT COSMETIC.** It goes into the clinic's price list, from there into a treatment plan, and
from there into a printed document the patient signs. «Отбеливание 12000-» or a consultation priced at
double is a document defect.
`,
  },
  {
    id: 'GG2-middle-risk-tier-invisible',
    label: 'GG2 the middle risk tier can never show, and an any hid it',
    dir: '.agents/archon/packets/GG2-middle-risk-tier-invisible',
    files: 'apps/web/src/ShiftView.tsx, the shared risk enum if you must widen it (name it in filesChanged), and apps/web/src/tests/operationsPanelsStyling.test.ts or a sibling test',
    gate: 'node --import tsx --test on the test you extend',
    brief: `
REWORK OF FF2, VERDICT NEEDS_REWORK. The wording fixes landed and are good. Three things remain, and the
first is a real defect the packet did not notice.

1. **THE MIDDLE RISK TIER HAS NO VISUAL SIGNAL, EVER.** 'ShiftView.tsx:671/673' compares
   'riskLevel === "medium"', but the contract declares 'z.enum(["low","watch","high"])'. There is no
   'medium'. So the comparison is dead code and the middle tier renders like nothing. **Resolve it one
   way or the other**: either the comparison becomes '"watch"', or the enum gains '"medium"' — and if you
   widen the enum, §10 applies and every side updates synchronously, which makes the first option almost
   certainly correct. Read the server to see which value it actually sends before you choose.

2. **AN 'any' IS WHY THIS COMPILED SILENTLY.** 'PatientCockpit' takes untyped props, so TypeScript could
   not see that 'riskLevel' has no 'medium'. Type those props. **That is the durable half of this
   packet** — the comparison is one line, the 'any' is the reason the line survived.

3. **ADD THE GUARD.** Extend 'apps/web/src/tests/operationsPanelsStyling.test.ts' (or a sibling) to fail
   if 'ShiftView.tsx' contains any of: '?? app.status', '?? action.priority', '?? queue.role',
   the literal «дел: \${», «шт.», or the magic string "1042". The previous packet fixed ten such sites by
   hand and **without this guard all ten are one careless edit from returning.**

4. **RE-MEASURE OR DROP.** The previous claim quoted byte counts and Cyrillic figures that the reviewer
   could not reproduce at HEAD. Either re-run the measurement at HEAD and quote the command, or leave the
   figure out. **A number without its command is not evidence** — that rule has cost this campaign ten
   corrections tonight.

**§3 IS THE STANDARD HERE.** «Смена» is the screen a clinic opens first every morning; its own subtitle is
«что делать сейчас». A risk tier that cannot show is worse than a missing feature, because the screen
looks complete while withholding the middle case.
`,
  },
  {
    id: 'GG3-contrast-measured-against-wrong-palette',
    label: 'GG3 the contrast numbers were computed against the losing palette',
    dir: '.agents/archon/packets/GG3-contrast-measured-against-wrong-palette',
    files: 'apps/web/src/styles/main.css, apps/web/src/styles/contrast-fixes.css, apps/web/src/styles/dente-redesign.css, and a new or extended stylesheet test',
    gate: 'node scripts/check-css-tokens.mjs (exits 0 today — keep it) plus the test you add',
    brief: `
REWORK OF FF3, VERDICT NEEDS_REWORK. The night-theme work stands. The LIGHT and DARK figures do not,
because they were computed against a palette that loses the cascade.

1. **RECOMPUTE EVERY LIGHT AND DARK FIGURE AGAINST THE WINNING PALETTE.** The reviewer established that
   'main.css' declares ':root[data-theme="light"]' and ':root[data-theme="dark"]' at specificity 0,2,0 —
   which BEATS the palette the previous packet measured. So its light and dark contrast numbers describe
   values the browser never uses. **Correct the source comments** at 'main.css:757-771', ':11831-11845',
   ':16703-16719' and 'contrast-fixes.css:83-99'. A comment stating a contrast ratio that the cascade
   does not produce is worse than no comment: someone will trust it.
2. **RESOLVE A REAL RESIDUAL MISS.** Light '.onboarding-compact-strip span' measures **4.48:1** against
   the AA floor of **4.50**. The packet printed 4.63, which the reviewer could not reproduce. Either
   darken '--muted' for that rule so it genuinely clears 4.50, **or state the residual miss plainly** —
   both are acceptable, printing an unreproducible number is not.
3. **CLOSE OR EXPLICITLY DEFER** '.chip-reason', '.chip-doctor', '.chip-chair' ('main.css:15831-15845').
   Same undeclared ladder, same file, and they appear in the packet's OWN proof output — so they were
   seen and not judged.
4. **ADD THE GUARD, because nothing protects any of this.** One test that walks the stylesheets and fails
   if a '[data-theme="dark"]' rule exists with no matching 'night' arm, or if a selector this work touched
   regains a light literal. Note the trap the EE1 reviewer proved empirically: 'check-css-tokens.mjs'
   only scans 'var()' constructs, so a bare 'background: #fef2f2' **cannot** enter its failure buckets.
   Your test must look for literals directly, or it will be as blind as that gate.
5. **'--teal-glow' has two different types.** Give it one, or use '--line-strong' for the strip border.

**MEASURE LIKE 'shadow-analyst.css:291-309' DOES.** That comment is the standard in this repo: WCAG ratios
per theme, before and after, with the actual hex values named. It records 1.04 «белым по белому» before and
13.13 after. **Do not write «looks fine» anywhere.** And note which theme is which: «Ночь» is
'data-theme="dark"' and «Тепло» is 'data-theme="night"' — the names are inverted in this product
('workspaceShell.tsx:462'), which is exactly how a developer styles the wrong theme.
`,
  },
  {
    id: 'GG4-imaging-void-backdrop-filter',
    label: 'GG4 the imaging void: content is laid out but never painted',
    dir: '.agents/archon/packets/GG4-imaging-void-backdrop-filter',
    files: 'apps/web/src/ImagingView.tsx, apps/web/src/styles/premium.css and the other stylesheets under apps/web/src/styles/. Report only if the cause lies outside these.',
    gate: 'node scripts/check-css-tokens.mjs; node --import tsx --test on anything you add',
    brief: `
CONTINUATION OF EE1. The previous packet did honest work and said out loud that it had NOT found the
cause. Its reviewer then produced the measurement that changes everything.

**THE DECISIVE EVIDENCE, measured with 'pngjs' by the EE1 reviewer, not by eye:**
- In 'desktop_dark_imaging.png' the content region has **9 distinct colours**, and **832 of 834 rows carry
  3 colours or fewer.** For comparison, 'desktop_dark_patients.png' in the same window has **3794 colours
  and 0 flat rows.**
- **The scrollbar thumbs of the dark and light imaging frames are 684 px each — identical to the pixel.**
  Identical thumb means identical 'scrollHeight'.

**Read what that implies, because it is the whole packet.** The content is IN the DOM and LAID OUT — the
document is exactly as tall as in the light theme. It is simply **not painted**. So every hypothesis about
mounting, lazy loading, a crashed view or an error boundary is dead: those would change the height. This
is a PAINT or COMPOSITING failure.

**THE NAMED SUSPECT, untested: 'backdrop-filter'.** 'premium.css' applies
'backdrop-filter: var(--glass-blur) saturate(180%)' with '-webkit-backdrop-filter' to a long list of panel
selectors. A 'backdrop-filter' on an element creates a containing block and a compositing layer, and in
combination with a translucent background it is a known cause of content rendering blank in headless
Chromium — precisely the renderer that produced these frames.

**ORDER OF WORK.**
1. **Establish whether this is a product defect or a headless-renderer artefact. That is the question,
   and either answer is a full success.** If 'backdrop-filter' blanks the panel only under
   '--headless=new' with '--disable-gpu', a real dentist on a real GPU sees the section correctly and the
   product bug is that **our own visual gate cannot see radiology** — which is still worth fixing, but in
   the capture script, not in the product. **Say which it is, with evidence.**
2. Find every selector carrying 'backdrop-filter' and check which of them wrap the imaging content
   specifically. Note that '.imaging-zone' is DEAD (declared in CSS, zero '.tsx' users — the EE1 reviewer
   confirmed 1 hit, the declaration itself), so do not chase it.
3. If it is the product: fix with tokens, no static hex, no px except hairlines, and check all THREE
   themes — «День», «Ночь» ('data-theme="dark"') and «Тепло» ('data-theme="night"').
4. If it is the renderer: propose the smallest change to the capture pipeline that makes radiology
   verifiable — for example disabling the effect under a capture-only flag. **Do not edit the capture
   script yourself**; it is the lead's instrument and has twice been caught producing false evidence.
   Describe the change and let the lead make it.

**WHATEVER THE CAUSE, THE SILENT VOID IS A SEPARATE §3 DEFECT.** A section that can render with no
heading, no message and no error tells the dentist nothing. Light theme already contains the wording to
reuse verbatim: «Снимков по пациенту нет / Загрузите архивы DICOM/КТ или выберите снимки из системы.»

**You may open the PNG files and look at them.** You may NOT run any screenshot script and may NOT claim
UI VERIFIED — that label is the lead's and the lead re-captures.
`,
  },
]

const BUILD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['packet', 'status', 'commitHash', 'filesChanged', 'inventory', 'proven', 'notProven', 'leadMustRun', 'foundNotFixed', 'summary'],
  properties: {
    packet: { type: 'string' },
    status: { enum: ['COMMITTED', 'PARTIAL', 'BLOCKED', 'NO_CHANGE'] },
    commitHash: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    inventory: { type: 'array', items: { type: 'string' }, description: 'All 11 sites: file:line + CONVERTED / ALREADY CORRECT / NOT MONEY.' },
    proven: { type: 'array', items: { type: 'string' }, description: 'Commands actually run, with TRUE exit codes captured without a pipe.' },
    notProven: { type: 'array', items: { type: 'string' } },
    leadMustRun: { type: 'array', items: { type: 'string' } },
    foundNotFixed: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['packet', 'verdict', 'sitesMissed', 'comparisonsTouched', 'testWouldFailOnRevert', 'attributionClean', 'reasoning', 'requiredRework'],
  properties: {
    packet: { type: 'string' },
    verdict: { enum: ['SOUND', 'SOUND_WITH_NITS', 'NEEDS_REWORK', 'REVERT'] },
    sitesMissed: { type: 'array', items: { type: 'string' }, description: 'Money-in-text sites still raw at HEAD, re-derived by YOUR OWN grep.' },
    comparisonsTouched: { type: 'string', description: 'Did the diff alter any money COMPARISON? Quote the diff if so — that is REVERT-grade.' },
    testWouldFailOnRevert: { type: 'string' },
    attributionClean: { type: 'string', description: 'Output of git log -1 --format=%(trailers) for the commit. Must be empty.' },
    reasoning: { type: 'string' },
    requiredRework: { type: 'array', items: { type: 'string' } },
  },
}

function buildStage(p) {
  return agent(
    LAW +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'YOUR PACKET: ' + p.id + '\n' +
    'OWNED SCOPE: ' + p.files + '\n' +
    'FORBIDDEN: every other file; all shared gates; any money COMPARISON in your own file.\n' +
    'YOUR SIGNAL: ' + p.gate + '\n' +
    'PACKET DIR (create first, one line in state.md): ' + p.dir + '\n' +
    '═══════════════════════════════════════════════════════════════\n' + p.brief +
    '\nCOMMIT AS SOON AS IT COMPILES, then add the test in a second commit if you have room.\n',
    { label: p.label, phase: 'Build', schema: BUILD_SCHEMA }
  )
}

function reviewStage(built, p) {
  if (!built) {
    return { packet: p.id, verdict: 'NEEDS_REWORK', sitesMissed: [], comparisonsTouched: 'unknown', testWouldFailOnRevert: 'unknown', attributionClean: 'unknown', reasoning: 'Builder died. Read ' + p.dir + '/state.md — work may already be committed.', requiredRework: ['Resume ' + p.id] }
  }
  if (!built.commitHash) {
    return { packet: p.id, verdict: 'SOUND_WITH_NITS', sitesMissed: [], comparisonsTouched: 'n/a', testWouldFailOnRevert: 'n/a', attributionClean: 'n/a', reasoning: built.summary || 'No commit.', requiredRework: built.foundNotFixed || [] }
  }
  return agent(
    'You are an ADVERSARIAL REVIEWER on the DENTE dental CRM (C:\\Clinic_MVP\\dental-crm) reporting to lead\n' +
    '[ARCHON]. You did NOT write this code. READ-ONLY: no edits, no git add/commit/push, never\n' +
    "'git remote -v' (live tokens). Do NOT run npm typecheck/build/test — other agents are mid-edit and you\n" +
    'would read a half-written tree. You MAY run "node --import tsx --test <one file>", read-only rg/grep,\n' +
    'git show/grep, and read-only node -e. Write findings to ' + p.dir + '/review.md AS YOU GO — reviewers\n' +
    'die on credits here constantly and an unwritten finding is lost.\n\n' +
    'COMMIT: ' + built.commitHash + '\nFILES: ' + JSON.stringify(built.filesChanged) + '\n' +
    'CLAIMED INVENTORY: ' + JSON.stringify(built.inventory || []) + '\n' +
    'CLAIMED PROVEN: ' + JSON.stringify(built.proven || []) + '\n\n' +
    'CHECK EXACTLY FIVE THINGS, each by running something:\n' +
    '1. **Did it miss a site?** Re-derive with YOUR OWN grep over guards.ts at HEAD — count interpolations\n' +
    '   of a money value into text that are still raw. The lead measured 11 raw and 4 already correct at\n' +
    '   dispatch; report YOUR numbers, not the brief\'s.\n' +
    '2. **Did it touch a money COMPARISON?** That is REVERT-grade. The comparisons use integer kopecks with\n' +
    '   NO epsilon on purpose: a tolerance that hides float drift also hides a genuine one-kopeck\n' +
    '   discrepancy, and these gates release payment receipts. Quote the diff if any comparison changed.\n' +
    '3. **Did it convert something that is NOT money?** «${index + 1}» is a line number. A count of rows is\n' +
    '   a count. Converting either is a defect.\n' +
    '4. **Would its test fail if the fix were reverted?** Name the assertion that breaks. A test that\n' +
    '   passes either way is ceremony. If it added no test, say so plainly.\n' +
    '5. **Attribution:** run "git log -1 --format=%(trailers) ' + built.commitHash + '" and report the\n' +
    '   output. It MUST be empty. Also grep the body for «Co-Authored-By» and «anthropic».\n\n' +
    'Also sweep for: «руб. ₽» (would mean formatKopecksRu was used where a decimal string belongs), a\n' +
    'second money helper beside @dental/shared, mojibake in the diff or subject, and any English string\n' +
    'reaching a user. Reserve REVERT for a changed comparison or a tolerance introduced. Never award SOUND\n' +
    'to a claim you could not reproduce.',
    { label: 'attack:' + p.id, phase: 'Attack', schema: REVIEW_SCHEMA }
  )
}

const all = []
log('Cycle 17 (rework): ' + PACKETS.map((p) => p.id).join(', '))
const done = await pipeline(PACKETS, buildStage, reviewStage)
for (let i = 0; i < PACKETS.length; i++) all.push({ packet: PACKETS[i].id, dir: PACKETS[i].dir, review: done[i] || null })
log('Cycle 17 complete.')
return { cycle: 17, results: all }
