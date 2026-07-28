export const meta = {
  name: 'archon-audit-1',
  description: 'Adversarial read-only audit of four fixes that landed in main with ZERO review while the orchestrator process was down',
  phases: [
    { title: 'Audit', detail: 'one adversarial auditor per unreviewed commit, read-only' },
  ],
}

const AUDIT_LAW = `
You are an ADVERSARIAL AUDITOR on the DENTE dental CRM under lead [ARCHON].
Repo root: C:\\Clinic_MVP\\dental-crm (branch main). You did NOT write the code you are auditing.
**Your job is to DESTROY the commit, not to bless it.**

═══ WHY YOU EXIST ═══
Four fixes were committed straight to main while the orchestrator process was down, so **no reviewer ever
looked at them.** That has already cost this campaign once: commit ca7dbeed8 did not compile, its reviewer
died before reaching it, and a red HEAD lived for hours until the lead ran a typecheck by hand. An
unreviewed commit in a medical-money product is a liability, not progress.

═══ YOU ARE READ-ONLY. THIS IS ABSOLUTE. ═══
**Three other agents are editing source files right now and a non-fleet author commits continuously.**
- **DO NOT EDIT, CREATE OR DELETE ANY FILE except your own review file**, named in your assignment.
- **NO git add / commit / rm / checkout / stash / push / revert.** You recommend; the lead acts.
- **DO NOT run 'npm run typecheck', 'npm run build', 'npm test' (workspace-wide), migrations, seeds, or
  any screenshot script.** Those write shared state and belong to the lead alone (§7a). This differs from
  earlier cycles where reviewers were allowed the gates — three agents are mid-edit and a typecheck now
  would read a half-written tree and blame it on your commit.
- **You MAY run 'node --import tsx --test <one existing test file>'** — that touches no shared build
  state and is your strongest instrument.
- You MAY read anything and run read-only 'rg', 'fd', 'npx sg' (search), 'git log/show/grep/diff',
  read-only 'node -e', read-only SQL SELECT against 127.0.0.1:5432, and 'curl' against the running API on
  127.0.0.1:4100.
- NEVER 'git remote -v' — the remote URLs contain live plaintext access tokens.
- NEVER read, echo or log anything from 'local-secrets/ai.env' or '.env' beyond confirming which variable
  NAMES exist. Never print a secret value. Never call a paid provider for real.
- The web dev server on 5173 is serving a tree three agents are actively editing, so **it is not evidence
  of anything right now.** Do not use it to judge behaviour.

═══ DURABILITY — YOU WILL PROBABLY DIE MID-TASK ═══
Every reviewer in cycles 9, 10, 11 and 12 died on credit exhaustion. The ones who contributed anything
wrote to disk as they went. So: **create your review file FIRST and append every finding the moment you
confirm it.** Nothing may exist only in your head or only in your final message. If throttled, stop
widening scope and make what you already wrote coherent.

═══ THE STANDARD: DEFAULT POSTURE IS DISBELIEF ═══
This campaign's charge sheet is your calibration. Every one of these actually happened here:
- 49 cited proof_*.png files that do not exist.
- 14 filenames holding 2 unique images, one of them a Vite error overlay under ten different view names.
- A 5,851-byte pure white PNG that passed a theme audit and was logged as a success.
- A handoff asserting «текст не уничтожен», refuted by run output.
- A smoke green only because it loaded a dist built BEFORE the fix.
- A commit message describing a defect that does not reproduce at its own parent.
- A guard printing «[НАРУШЕНИЕ]» and «нарушений 0» in the same run, exiting 0.
- A test asserting HTTP 200 against an organization id that does not exist in the database.
- A commit that did not compile, because its reviewer died first.
- The LEAD publishing «45 hollow modules of 50» (regex artefact) and «4 organizations» (fixtures from a
  seeder the lead itself ran; there are 2), and reporting a verdict as REVERT because a 'grep -m1' matched
  the word in prose.
**Reproduce claims; never read them.** Re-derive every number with a DIFFERENT instrument than the author
used. Verify EVERY link of any reachability claim.

═══ WHAT THE PRODUCT IS, SO YOU JUDGE AGAINST THE RIGHT STANDARD ═══
Russian-language dental CRM for SOLO practitioners and small clinics. Binding constitution:
**§1 DEPTH NOT FACADE** — no stubs, no placeholder data, no facade returning {success:true}. «It compiles»
is not «it works».
**§2 HONESTY** — no claim without proof. «Committed» without a hash is a lie.
**§3 A RUSSIAN GRANDMOTHER MUST UNDERSTAND IT** — human error text, never «Internal Server Error»; real
empty, loading and error states, each telling the user what to DO next; **and every button must be able to
keep its promise** — a «Повторить» beside «сервер не знает такого раздела» is a lie in the interface.
**§4 NO VISUAL OVERLOAD** — depth hides, it does not pile up.
**§5 MODULARITY** — clinicMode presets, never hardcoded; decomposition must be REAL (components actually
imported), not orphaned files.
**§8 EFFORT** — more real work, less test and doc ceremony.
**§8b MONEY AND LEGAL DOCUMENTS ARE EXACT TO THE KOPECK** — no epsilon that could hide a real one-kopeck
discrepancy, no float accumulation, no rounding that destroys data.
**§10 SAFETY** — no invented backend contracts, DB schemas, fields or role policies; a shared contract
change must update ALL sides synchronously.
**§11 RUSSIAN, UTF-8, no mojibake.**
**§13 ANTI-HARDCODE** — no ports, endpoints, credentials, magic strings, tenant UUIDs, hardcoded prices,
hex colours or px (hairlines excepted); **never a fabricated 0 or default substituted for an unknown.**

═══ ESTABLISHED FACTS — DO NOT RE-DERIVE, AND DO NOT CONTRADICT WITHOUT MEASURING ═══
- apps/api = Fastify + Drizzle + 'pg' over native PostgreSQL 18 at 127.0.0.1:5432. **PGlite is NOT
  installed.** apps/web = React 19.2 + Vite 6 + Tailwind v4 (CSS-first, NO tailwind.config) + Zustand 5.
- Test runner is 'node:test' via tsx. **Vitest is NOT installed** (a fake shim exists in
  types/modules.d.ts). **Playwright has no config and zero .spec files.** A commit adding either kind of
  test would be adding a test that cannot run — check for it.
- **'packages/shared/src/utils/money.ts' is the ONLY sanctioned money arithmetic**: 'parseKopecks',
  'sumKopecks', 'splitKopecks', 'percentageOfKopecks', 'formatKopecksRu', 'kopecksToNumericString',
  'rublesFromKopecks', 'assertWholeKopecks'. **A second money helper beside it is a finding**, not a
  contribution — this campaign has already found three such second owners, one of which caused a
  legitimate three-payment receipt to be refused.
- FDI tooth numbers live in the shared contract: 'VALID_FDI_TOOTH_NUMBERS' (52 teeth),
  'isValidFdiToothNumber', 'fdiToothNumberSchema'. A re-typed tooth list is a finding.
- **THE DATABASE IS POLLUTED and the lead polluted it.** A screenshot seeder wrote a whole fixture
  organization «Демо-клиника для снимков» (id starts d0000000). The real clinic is «Стоматология, 1
  кабинет» (id starts 4a3420d1). All 8 'payments' rows and every 'visits'/'appointments' row are fixtures;
  all 25 'tooth_states' rows belong to the real organization. **A row count is evidence ONLY split by
  organization_id with the fixture excluded.** Any query joining visits to tooth states is meaningless.
- No router library: 'appViews' in 'workspaceShell.tsx' -> 'viewFromHash()' -> a flat
  'currentView === "x"' chain in 'App.tsx'. A component not reachable through that chain is not mounted.
- God context 'useAppLogic.tsx' is ~14k lines with a ~950-field return object; fields are additive only.
- Gates were green before this wave, measured by the lead: typecheck api 0 errors, typecheck web 0 errors.
`

const COMMITS = [
  {
    id: 'AU1-delivery-console',
    hash: '35ced8f1b',
    label: 'AU1 a failed send looked like a successful send',
    dir: '.agents/archon/audit/AU1-delivery-console',
    subject: 'fix(связь): отказ отправки выглядел на экране как успешная отправка',
    files: 'apps/web/src/components/communications/MessageDeliveryConsole.tsx (+107/-19)',
    focus: `
**THIS IS THE MOST DANGEROUS DEFECT CLASS IN THE PRODUCT, so audit it hardest.** A clinic that believes it
reminded a patient, when it did not, loses the appointment and blames the patient. Judge whether the fix
makes the FAILURE unmistakable, not merely whether it stops saying «отправлено».

Specific hypotheses to test by execution or by reading the real lines:
1. **Does every failure path now surface?** Enumerate every way a send can fail — network throw, non-2xx,
   2xx with a body that says the provider refused, a partial batch where some recipients failed — and
   check each one INDIVIDUALLY. A fix that handles '!response.ok' and ignores a 200-with-error-body leaves
   the original defect for the most common real case, because messaging providers habitually return 200
   with a per-recipient status.
2. **Partial success is the trap.** If ten reminders are sent and three fail, what does the user see? «Отправлено»
   with a silent loss of three is the same defect wearing a smaller hat. Does the UI name WHICH recipients
   failed, or only a count? §3 requires the clinic to know who to phone.
3. **Is the message human and actionable (§3)?** Quote the exact new strings. Is there any raw status code,
   English word, stack fragment, or provider error id shown to a dentist? Does the text say what to DO?
4. **Does the console still let the user retry, and is retry SAFE?** If retry re-sends to recipients who
   already received the message, the fix created a double-messaging defect. Trace it.
5. **Is optimistic state rolled back?** If the list was updated to «отправлено» before the request
   resolved, check the failure path actually reverts it rather than leaving a stale success row.
6. Is the component MOUNTED and reachable through the hash-view chain? A fix to an unmounted console is a
   fix to nothing.
`,
  },
  {
    id: 'AU2-marketing-storage',
    hash: 'eed3a4e20',
    label: 'AU2 an invented search result and a whole section crashing on browser storage',
    dir: '.agents/archon/audit/AU2-marketing-storage',
    subject: 'fix(маркетинг): убрал выдуманную позицию в поиске и падение раздела из-за хранилища браузера',
    files: 'apps/web/src/MarketingView.tsx (+112/-12)',
    focus: `
The commit claims two unrelated fixes in one file. Audit them separately and say so if one is unproven.

1. **THE INVENTED SEARCH POSITION (§1/§13).** Establish what the code did BEFORE: was a search-ranking
   position fabricated, defaulted, or randomised? Reproduce it at the parent. Then check the replacement:
   **is the unknown now shown as unknown, or replaced by a different fabrication such as 0, «—», or «нет
   данных» when the truth is «мы не знаем»?** A fabricated 0 is explicitly banned; so is a confident «нет
   данных» when the request simply failed. Those are different states and §3 requires different text.
2. **THE STORAGE CRASH.** Which storage — localStorage or sessionStorage — and what exactly threw? The
   realistic causes are: quota exceeded, storage disabled by browser policy or private mode, a JSON parse
   failure on a value written by an older version, or access denied in an embedded context. **Check the fix
   covers the PARSE failure and not only the ACCESS failure**, because a stale malformed value is the case
   that actually happens after a deploy. A try/catch around 'getItem' does nothing for 'JSON.parse'.
3. **Does the section degrade or vanish?** If storage is unavailable the section must still work with its
   defaults, not disappear. §3: the user must never be shown less because a cache failed.
4. **Was a whole-section crash really possible?** Verify there is no error boundary above it that already
   contained the failure. If a boundary existed, the commit message overstates, and this campaign has
   already relayed one overstated commit subject as fact.
5. Any hardcoded hex, px, English string, magic constant or fabricated default introduced in the diff?
`,
  },
  {
    id: 'AU3-cash-drawer-refund',
    hash: '554919f62',
    label: 'AU3 a refund reduced the cash drawer by its own amount twice',
    dir: '.agents/archon/audit/AU3-cash-drawer-refund',
    subject: 'fix(касса): возврат больше не занижает наличные в ящике на свою сумму',
    files: 'apps/web/src/components/finance/cashDaySummary.ts (+/-), cashDaySummary.test.ts (+20), components/finance/CashDayTally.tsx (10 lines)',
    focus: `
**THIS IS CASH, SO §8b IS ABSOLUTE: exact to the kopeck, no epsilon, no float accumulation.** A dentist
counts physical banknotes against this number at the end of the day. If it is wrong the clinic either
suspects theft or misses it.

1. **REPRODUCE THE DOUBLE-COUNT AT THE PARENT WITH YOUR OWN ARITHMETIC.** Construct a realistic day: an
   opening float, several cash payments, one card payment, one cash refund, one card refund. Compute what
   the drawer should hold. Run the PARENT implementation and the HEAD implementation. Quote both numbers.
   **If the defect does not reproduce, that is the finding** — a commit describing a defect that does not
   reproduce at its own parent has already happened once here.
2. **Is the sign convention now single-owned?** The classic cause of this bug is that refunds are stored as
   negative amounts AND subtracted again. Check whether the stored sign is asserted anywhere, or merely
   assumed. If the fix assumes positive-amount refunds and any writer stores a negative one, the fix
   inverts the error instead of removing it. **Find the writers and check what sign they actually store**,
   in the schema and in the route.
3. **Card versus cash.** A card refund must not touch the cash drawer at all. Verify the fix distinguishes
   payment METHOD, and check every method the product supports, not just cash and card.
4. **Exactness.** Does the summary use 'packages/shared/src/utils/money.ts', or does it accumulate rubles
   in floats? Sum three amounts of 300.01, 300.05 and 300.07 through the HEAD code and report whether you
   get 900.13 or 900.1299999999999. A second money helper here is a finding.
5. **DO THE 20 NEW TEST LINES ACTUALLY ASSERT?** Run
   'node --import tsx --test apps/web/src/components/finance/cashDaySummary.test.ts' and quote the TRUE
   exit code and counts. Then apply the real standard: **would the new assertions FAIL if the fix were
   reverted?** Reason precisely about which assertion breaks, naming it. A test that passes either way is
   ceremony and §8 forbids ceremony.
6. Is 'CashDayTally' mounted and reachable through the hash-view chain?
`,
  },
  {
    id: 'AU4-imaging-conclusion',
    hash: 'ec4050199',
    label: 'AU4 failing to write a radiology conclusion into the record was silent',
    dir: '.agents/archon/audit/AU4-imaging-conclusion',
    subject: 'fix(снимки): отказ записи заключения в карту больше не молчит',
    files: 'apps/web/src/components/imaging/VisiographAnalyzer.tsx (+101/-15)',
    focus: `
**A radiology conclusion is part of the medical record.** Silently failing to save it means the clinic
believes a finding is documented when it is not — a clinical and legal exposure, not a UX annoyance.

1. **Enumerate every failure path and check each:** network throw, non-2xx, 2xx with an unparsed body,
   2xx with a body that reports a per-field validation refusal, and the case where the request succeeds but
   the record it wrote belongs to a different patient or visit. Which does the fix actually cover?
2. **Is the conclusion TEXT preserved on failure?** The worst outcome is an error message that also clears
   the textarea, destroying what the doctor dictated. Trace the state on the failure path and say plainly
   whether the text survives. If it does not, that is a REVERT-grade finding: the fix would have made the
   product worse than silent failure.
3. **Human language (§3).** Quote every new user-facing string. Any raw status code, English word, model
   name, or stack fragment shown to a dentist? Does it say what to DO — retry, copy the text, call the
   administrator?
4. **Is retry safe and idempotent?** If retrying writes a SECOND conclusion into the record, the fix
   created a duplicate-medical-record defect. Find out whether the write is an insert or an upsert, at the
   route, in the handler body — **not at the 'app.post(...)' registration line**, which is a standing
   correction in this campaign.
5. **§10: did it invent a contract?** Check every field it sends against the shared schema and the DB
   column. This campaign has already found a mounted component reading 'priceRub' where the contract says
   'basePriceRub', which silently produced «0 ₽».
6. Is 'VisiographAnalyzer' mounted and reachable? Verify the chain link by link.
`,
  },
]

const AUDIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['commit', 'verdict', 'defectWasReal', 'attackSurface', 'reachability', 'testsAssert', 'constitutionBreaches', 'proofAudit', 'requiredRework', 'foundNotFixed', 'reasoning'],
  properties: {
    commit: { type: 'string' },
    verdict: { enum: ['SOUND', 'SOUND_WITH_NITS', 'NEEDS_REWORK', 'REVERT'] },
    defectWasReal: { type: 'string', description: 'Did the defect reproduce at the commit\'s own PARENT? Quote your own reproduction, not the commit message.' },
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
    reachability: { type: 'string', description: 'EVERY link from a routed view to the changed line, or a statement that it is unmounted.' },
    testsAssert: { type: 'string', description: 'Would the new tests FAIL if the fix were reverted? Name the assertion that breaks, or say there are no tests.' },
    constitutionBreaches: { type: 'array', items: { type: 'string' }, description: 'Per breach: the section, the file:line, and the user-visible consequence.' },
    proofAudit: { type: 'string', description: 'Every command you actually ran, with its TRUE exit code.' },
    requiredRework: { type: 'array', items: { type: 'string' }, description: 'Numbered, specific, actionable.' },
    foundNotFixed: { type: 'array', items: { type: 'string' }, description: 'Real defects you found nearby that this commit did not address.' },
    reasoning: { type: 'string' },
  },
}

function auditStage(c) {
  return agent(
    AUDIT_LAW +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'YOUR ASSIGNMENT: audit commit ' + c.hash + ' — ' + c.id + '\n' +
    'ITS SUBJECT LINE, WHICH IS A CLAIM AND NOT A FACT: ' + c.subject + '\n' +
    'FILES IT TOUCHED: ' + c.files + '\n' +
    'YOUR ROLE: adversarial auditor, read-only on all source.\n' +
    'WHY THIS IS DELEGATED: four fixes reached main with no review at all, each needs a whole context to\n' +
    'audit properly, and the lead cannot be the only reader of code the lead did not write.\n' +
    'YOUR REVIEW FILE, THE ONLY FILE YOU MAY WRITE (create it FIRST): ' + c.dir + '/review.md\n' +
    'Append findings AS YOU CONFIRM THEM. Auditors die on credits here; an unwritten finding is lost.\n' +
    'EVIDENCE STANDARD: every claim carries the command that produced it and its TRUE exit code. Your\n' +
    'output is EVIDENCE for the lead, never authority — the lead re-runs what matters.\n' +
    '═══════════════════════════════════════════════════════════════\n' +
    'WHAT TO ATTACK IN THIS PARTICULAR COMMIT:' + c.focus +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'ORDER OF WORK, MANDATORY:\n' +
    ' 1. Create ' + c.dir + ' and write review.md == «в работе». NOW, before reading anything.\n' +
    ' 2. git show ' + c.hash + ' --stat, then the FULL diff, then read the changed files at HEAD in full.\n' +
    '    HEAD has moved since the commit — read HEAD, not the diff alone.\n' +
    ' 3. **Reproduce the defect at the PARENT with your own instrument.** Not the commit message.\n' +
    '    git show ' + c.hash + '^:<path> gives you the parent file.\n' +
    ' 4. Work through the hypotheses above, one at a time, writing each result to review.md as you get it.\n' +
    ' 5. Verify reachability link by link, from a routed view down to the changed line.\n' +
    ' 6. Judge the tests by the reversion standard, and RUN them if they exist.\n' +
    ' 7. Sweep for constitution breaches: fabricated defaults, hardcoded prices or hex or px, English\n' +
    '    strings shown to users, mojibake, a second money helper, an invented contract field, a facade.\n' +
    ' 8. Emit structured output. Numbered, actionable requiredRework if not SOUND.\n' +
    'Reserve REVERT for a change that is actively WORSE than the defect it claims to fix — for example a\n' +
    'fix that destroys the doctor\'s typed text, double-sends a message, writes a duplicate medical record,\n' +
    'or hides a real one-kopeck discrepancy behind a tolerance.\n' +
    '**Never award SOUND to a claim you could not reproduce.** If you could not test something, say so with\n' +
    'the exact command that would close it — an honest gap outranks a confident guess.\n',
    { label: c.label, phase: 'Audit', schema: AUDIT_SCHEMA }
  )
}

log('Audit 1 (read-only): ' + COMMITS.map((c) => c.hash).join(', '))
const results = await parallel(COMMITS.map((c) => () => auditStage(c)))
const out = []
for (let i = 0; i < COMMITS.length; i++) out.push({ commit: COMMITS[i].hash, id: COMMITS[i].id, dir: COMMITS[i].dir, audit: results[i] || null })
log('Audit 1 complete.')
return { audit: 1, results: out }
