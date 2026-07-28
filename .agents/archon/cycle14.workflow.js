export const meta = {
  name: 'archon-cycle-14',
  description: 'DENTE cycle 14 (small unit): eleven places print raw floating-point money into Russian sentences a dentist reads',
  phases: [
    { title: 'Build', detail: 'one file, one pattern, eleven sites' },
    { title: 'Attack', detail: 'a different agent checks every site was converted and no comparison changed' },
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
    id: 'DD1-raw-money-in-russian-text',
    label: 'DD1 eleven raw floats printed to a dentist as money',
    dir: '.agents/archon/packets/DD1-raw-money-in-russian-text',
    files: 'apps/api/src/documents/guards.ts ONLY, plus a new test file beside it if you add one',
    gate: 'node --import tsx --test on your own new test file, or on an existing test that loads guards.ts',
    brief: `
ELEVEN PLACES IN ONE FILE PRINT A RAW JAVASCRIPT NUMBER INTO A RUSSIAN SENTENCE ABOUT MONEY.

**MEASURED BY THE LEAD AT DISPATCH, in 'apps/api/src/documents/guards.ts':**
- **11** interpolations of the form '\${...Rub} руб.' that pass a raw number straight into user text.
- **4** places already do it correctly, via 'kopecksToNumericString'. **The tool is already imported in
  this file** — you are making the file consistent with itself, not introducing anything.

Confirmed examples (verify the line numbers yourself, HEAD moves):
    :485  «По чеку на \${payment.amountRub} руб. уже возвращено \${alreadyRefundedRub} руб. …»
    :489  «Сумма возврата (\${payload.amountRub} руб.) превышает остаток по чеку: из …»
    :689  «…строка \${index+1} должна иметь сумму \${expectedTotalRub} руб. …передано \${line.totalRub} руб.»
    :703  «…общий итог \${totalAmountRub} руб. не совпадает с суммой строк \${linesTotalRub} руб.»
    :717  «…сумма \${payloadTotalRub} руб. не совпадает с актуальным планом лечения \${facts.plannedAmountRub} руб.»

**WHY THIS IS A REAL DEFECT AND NOT COSMETICS.** These are rejection messages on money documents, and the
values reaching them are sums of kopeck-exact amounts. Floating point makes such a sum print as
'900.1299999999999' or '1110.9999999999995'. This campaign already measured that exact string reaching a
user: three payments of 300.01 + 300.05 + 300.07 sum to 900.1299999999999 in one order and 900.13 in the
other. So the dentist reads «сумма 900.13 руб. не совпадает с выбранными оплатами 900.1299999999999 руб.» —
**two numbers a human cannot tell apart**, in a message whose whole job is to explain a refusal (§3), about
money that must be exact to the kopeck (§8b). A '1500.5' printed where «1500,50» belongs is the same defect
in a quieter form.

**HOW TO FIX EACH SITE.** Wrap the value: 'kopecksToNumericString(parseKopecks(value))'. Both are already
imported from '@dental/shared' at the top of this file — read the import block and confirm. 'parseKopecks'
turns a rouble number into exact integer kopecks; 'kopecksToNumericString' renders «1500.50». The sentences
already say «руб.» after the number, so a decimal string is what belongs there — do NOT use
'formatKopecksRu', which appends «₽» and would produce «1 500,50 ₽ руб.»

**DO NOT CHANGE ANY COMPARISON.** Your claim is the TEXT only. The comparisons in this file were fixed
separately and deliberately: they compare integer kopecks via a local 'moneyRubEquals' helper, with NO
epsilon, because a tolerance that hides float drift also hides a genuine one-kopeck discrepancy — and these
are the gates that release a payment receipt. If you find a comparison that still uses raw '!==' on
rubles, **report it in 'foundNotFixed' and leave it alone.**

**INVENTORY IS THE DELIVERABLE.** List all 11 sites with 'file:line' and a verdict: CONVERTED / ALREADY
CORRECT / NOT MONEY (a count or an index — '\${index + 1}' is a line number, not money, and must stay
raw). Getting 9 of 11 is the half-closed chain this campaign keeps rejecting, so if you run out of room,
commit what you converted and list the rest explicitly.

**PROVE IT WITH A TEST THAT WOULD FAIL IF REVERTED.** Drive one of these refusal paths with amounts whose
float sum drifts — 300.01, 300.05, 300.07 is a known-drifting triple — and assert the message contains
'900.13' and does NOT contain '900.1299999999999'. That second assertion is the one that proves the fix.
'guards.ts' is a plain module with no React and no CSS, so it loads in 'node:test' directly.

**WHAT WOULD MAKE THIS FAIL REVIEW.** Changing a comparison. Using 'formatKopecksRu' and shipping «руб. ₽».
Converting an index or a count as if it were money. Introducing a second money helper — this file must
count money only through '@dental/shared'. Leaving sites unconverted without listing them.
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
log('Cycle 14 (small unit): ' + PACKETS.map((p) => p.id).join(', '))
const done = await pipeline(PACKETS, buildStage, reviewStage)
for (let i = 0; i < PACKETS.length; i++) all.push({ packet: PACKETS[i].id, dir: PACKETS[i].dir, review: done[i] || null })
log('Cycle 14 complete.')
return { cycle: 14, results: all }
