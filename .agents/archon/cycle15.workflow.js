export const meta = {
  name: 'archon-cycle-15',
  description: 'DENTE cycle 15: radiology renders nothing at all in night theme',
  phases: [
    { title: 'Build', detail: 'reproduce first, then fix; an unreproducible finding is a full success' },
    { title: 'Attack', detail: 'a different agent checks the mechanism was established, not guessed' },
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
    id: 'EE1-imaging-blank-in-night-theme',
    label: 'EE1 radiology renders nothing in night theme',
    dir: '.agents/archon/packets/EE1-imaging-blank-in-night-theme',
    files: 'apps/web/src/ImagingView.tsx and the imaging rules inside apps/web/src/styles/main.css, premium.css, shadow-analyst.css. You may READ anything. Do NOT edit App.tsx, useAppLogic.tsx, or any other view.',
    gate: 'node scripts/check-css-tokens.mjs (exits 0 today) plus node --import tsx --test on any test you add',
    brief: `
THE LEAD CAPTURED THIS AND JUDGED IT BY EYE. «Снимки» — radiology — RENDERS NOTHING IN NIGHT THEME.

**THE EVIDENCE, two frames from ONE capture run, same data, same minute:**
- '.dente-redesign-shots/desktop_light_imaging.png' (176 KB) is fully populated: heading «СНИМКИ ПАЦИЕНТА
  / Прицельные, ОПТГ, ТРГ, КТ и фото в одной ленте», three actions «Папка DICOM» / «Файлы» / «Добавить
  снимок вручную», three status cards, and two good empty states.
- '.dente-redesign-shots/desktop_dark_imaging.png' (61 KB — the SMALLEST frame of the run, because there
  is nothing to compress) shows the **sidebar only**. The whole content area is void: no heading, no
  buttons, no cards, no empty state, no error message.

**You may and should open both PNG files and look at them.** That is allowed here and it is the fastest
way to understand the defect.

The lead ruled out a scroll artefact by measurement: the dark frame is scrolled ~230 px down, so it should
show what light shows between y≈290 and y≈1130 — the populated panel — and instead shows ~840 px of
nothing. A 230 px scroll cannot produce 840 px of void.

**WHY THIS OUTRANKS EVERYTHING ELSE IN THE BACKLOG.** A dentist opening «Снимки — рентген, КЛКТ и КТ»
in night theme cannot tell whether the section is loading, broken, or empty. This is the radiology
section of a medical record, and the failure is silent — no error, no empty state, nothing to report to
an administrator. §3 requires that the user always know what is happening and what to do next.

**YOUR FIRST DUTY IS TO REPRODUCE, NOT TO FIX.** The lead has ONE capture per theme and NO live browser
session, so the observation is confirmed but the MECHANISM is not. Do not accept the lead's hypothesis —
the lead has been wrong eight times tonight and expects correction. Establish which of these it is:
  (a) a CSS rule that paints text/background the same colour under '[data-theme="night"]';
  (b) a rule that sets 'display:none' or zero height under night only;
  (c) a JavaScript failure that happens to coincide with the theme switch, so the content never mounts;
  (d) a capture artefact after all — a mid-transition frame.
**If it is (d), say so loudly and STOP.** A packet that "fixes" a capture artefact would be inventing work,
and reporting the lead's finding as unreproducible is a full success for this packet.

**GROUND ALREADY MEASURED BY THE LEAD, confirm each yourself:**
- The night theme is REAL and has 31 rules across 'apps/web/src/styles/*.css' matching '[data-theme="night"]'.
- Imaging styles live in THREE files: 'main.css', 'premium.css', 'shadow-analyst.css'. Note that
  'premium.css' uses '!important' heavily and sets its own dark colours — a strong suspect, but a suspect
  only.
- The theme switcher offers THREE themes: «День | Ночь | Тепло». The capture script labels the second one
  'dark' while the interface calls it «Ночь». **«Тепло» has never been captured or judged at all** — check
  whether it has the same defect, because a fix for night that leaves «Тепло» broken is half a fix.
- 'ImagingView.tsx' is mounted and reachable: 'App.tsx:3586' renders it inside a
  'WorkspaceRouteErrorBoundary' with 'panelId="imaging"'.

**HOW TO REPRODUCE WITHOUT A BROWSER.** You may not run a screenshot script — the capture pipeline is the
lead's. But you can: read the computed rule cascade by hand for the container and its children under each
'data-theme'; grep every rule that touches an imaging selector and check which themes it covers; and check
whether any colour resolves to the same token for text and background. 'node scripts/check-css-tokens.mjs'
reports unresolvable token names per theme and exits 0 today — run it and read its output, because a token
that resolves in light and NOT in night would explain this exactly.

**IF YOU FIND IT, FIX IT WITH TOKENS.** No static hex, no px except hairlines. The palette lives at
'styles/dente-redesign.css:11-161' across '[data-theme=light|dark|night]'. A colour that works only
because it is hardcoded is the same defect wearing a different hat.

**AND WHATEVER THE CAUSE, THE SILENT VOID IS ITS OWN DEFECT.** Even with the colours fixed, a section
that can render empty with no heading and no message violates §3. If 'ImagingView' has a branch that can
return nothing, give it an honest state — the light theme already contains excellent wording you can
reuse verbatim: «Снимков по пациенту нет / Загрузите архивы DICOM/КТ или выберите снимки из системы.»

**COMMIT AS SOON AS SOMETHING IS RIGHT.** Eight agents in a row have died on credit exhaustion here; the
one that survived did so by committing a mechanical change immediately and dying afterwards. If you only
manage the reproduction, **commit the written reproduction as a dossier file and report** — that alone is
worth more than a guessed fix.

**WHAT WOULD MAKE THIS FAIL REVIEW.** Changing colours without establishing the mechanism. A static hex.
Fixing night and leaving «Тепло». Claiming UI VERIFIED — that label is the lead's alone and the lead will
re-capture. Editing files outside your claim.
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
log('Cycle 15: ' + PACKETS.map((p) => p.id).join(', '))
const done = await pipeline(PACKETS, buildStage, reviewStage)
for (let i = 0; i < PACKETS.length; i++) all.push({ packet: PACKETS[i].id, dir: PACKETS[i].dir, review: done[i] || null })
log('Cycle 15 complete.')
return { cycle: 15, results: all }
