export const meta = {
  name: 'archon-recon-2',
  description: 'DENTE read-only reconnaissance: the i18n cost, the unverified-identity auth hole, a behavioural hollow-panel census, and the EGISZ legal clock — output becomes cycle 13 packets',
  phases: [
    { title: 'Recon', detail: 'four independent read-only investigations, no source edits at all' },
    { title: 'Critique', detail: 'a second agent attacks each dossier for numbers it cannot reproduce' },
  ],
}

const RECON_LAW = `
You are a RECONNAISSANCE analyst on the DENTE dental CRM under lead [ARCHON].
Repo root: C:\\Clinic_MVP\\dental-crm (branch main).

═══ YOU ARE READ-ONLY ON SOURCE. THIS IS ABSOLUTE. ═══
**THREE OTHER AGENTS ARE EDITING SOURCE FILES RIGHT NOW, and a fourth non-fleet author commits
continuously.** You must not collide with them, so:
- **DO NOT EDIT, CREATE OR DELETE ANY FILE OUTSIDE YOUR OWN DOSSIER DIRECTORY.** No source, no tests,
  no package.json, no config.
- **DO NOT 'git add', 'git commit', 'git rm', 'git checkout', 'git stash' or 'git push'.** The lead
  commits your dossier.
- Your ONLY writes are to your own dossier directory, named in your packet.
- You MAY read anything, and you MAY run read-only commands: 'rg', 'fd', 'npx sg' (search only),
  'git log/show/grep/diff', 'node -e' READ-ONLY, read-only SQL SELECT against 127.0.0.1:5432, and
  'curl' against the already-running API on 127.0.0.1:4100.
- **DO NOT run 'npm run typecheck', 'npm run build', 'npm test', migrations, seeds, or any screenshot
  script.** Those write shared state and belong to the lead alone (§7a). 'node --import tsx --test
  <one existing file>' is permitted if you need to observe existing behaviour.
- NEVER 'git remote -v' — the remote URLs contain live plaintext access tokens.
- NEVER read, echo or log anything from 'local-secrets/ai.env' or '.env' beyond confirming which
  variable NAMES exist. Never print a secret value. Never call a paid provider for real.

═══ DURABILITY — AGENTS DIE ON CREDIT EXHAUSTION HERE, CONSTANTLY ═══
Every reviewer in cycles 9, 10 and 11 died mid-task. The ones who contributed anything were the ones
who **wrote to disk as they went**. So:
1. FIRST ACTION: create your dossier directory and write 'findings.md' with your headings and the word
   «в работе». Append every confirmed fact the moment you confirm it.
2. Never hold a finding only in your head or only in your final message.
3. If you are throttled, stop widening scope and make what you have coherent.

═══ THE STANDARD OF EVIDENCE, AND IT IS THE WHOLE POINT OF YOUR JOB ═══
This campaign has been damaged repeatedly by numbers that dissolved under re-measurement. The charge
sheet, which is your standard:
- «45 hollow modules of 50» — a regex artefact published by the lead.
- «4 organizations, all clinic_mode=demo» — the extras were fixtures from a seeder the LEAD ran itself;
  there are 2.
- «zero payments carry a fiscal receipt number, so nobody fills them» — a property of a seeder's
  hardcoded column list, not of human behaviour.
- A dossier claiming «teeth get marked, the record is not written» from a JOIN across a fixture
  organization and a real one.
- A verdict reported as REVERT because a 'grep -m1' matched the word in prose.
- Two «security findings» that were a probe's own configuration comment describing pre-fix code.

Therefore:
- **A COUNT IS NOT EVIDENCE UNLESS YOU SAY HOW YOU COUNTED.** Quote the exact command. If you counted
  with a regex, say so and state what the regex cannot see. Prefer a parser ('@babel/parser' is
  installed) or the TypeScript compiler API over a regex for anything structural.
- **ROW COUNTS MUST BE SPLIT BY organization_id.** The database is polluted: a screenshot seeder wrote a
  whole fixture organization ('Демо-клиника для снимков', id starts d0000000). All 8 'payments' rows and
  every 'visits'/'appointments' row are fixtures; all 25 'tooth_states' rows belong to the real
  organization ('Стоматология, 1 кабинет', id starts 4a3420d1). **Any query joining visits to tooth
  states is meaningless.** Exclude the fixture or your number is worthless.
- **DISTINGUISH source facts from runtime facts from database facts.** Say which each finding is.
- **A CLAIM YOU CANNOT REPRODUCE DOES NOT GO IN.** Write «НЕ ПОДТВЕРЖДЕНО» and the exact command that
  would settle it. An honest gap is worth more than a confident guess — the lead has been burned four
  times tonight by confident guesses, three of them its own.
- If the existing dossiers ('.agents/archon/RECON_DOSSIER.md', 'progress.md', 'VISUAL_VERDICT.md')
  contradict what you measure, **YOUR MEASUREMENT WINS** — and say so explicitly, naming the wrong claim.

═══ WHAT THE LEAD WANTS FROM YOU, IN ORDER OF VALUE ═══
1. A defect that is REAL, REACHABLE by a user, and stated with 'file:line' plus the user-visible
   consequence in one sentence of plain Russian.
2. An inventory that is COMPLETE for its stated scope, with a per-item verdict.
3. A recommended fix that is bounded enough to be one packet, naming the files it would touch and what
   would make it fail review.
4. An honest statement of what you could not establish.
**Do NOT deliver a survey of everything.** Depth on the question you were given beats breadth.

═══ THE PRODUCT AND ITS CONSTITUTION, SO YOUR RECOMMENDATIONS FIT IT ═══
Russian-language dental CRM for SOLO practitioners and small clinics. §1 depth not facade, no stubs.
§3 «чтобы совковая бабка разобралась» — human error text, real empty/loading/error states, every button
able to keep its promise. §4 no visual overload; depth hides, it does not pile up. §5 modularity via
clinicMode presets, real decomposition (components actually imported), never hardcoded. §8 more real
work, less documentation and test ceremony. §8b money and legal documents exact to the kopeck.
§10 no invented backend contracts, schemas, fields or role policies — what does not exist is DEBT WITH A
REASON, never fantasy. §11 Russian, UTF-8, no mojibake.

═══ ENVIRONMENT FACTS, ALREADY ESTABLISHED — DO NOT RE-DERIVE ═══
- apps/api = Fastify + Drizzle + 'pg' over native PostgreSQL 18 at 127.0.0.1:5432. **PGlite is NOT
  installed**; two authority docs used to claim it and were corrected.
- apps/web = React 19.2 + Vite 6 + Tailwind v4 (CSS-first, NO tailwind.config) + Zustand 5.
- **No router library.** 'appViews' in 'workspaceShell.tsx' feeds 'viewFromHash()' and a flat
  'currentView === "x"' chain in 'App.tsx'.
- God context 'useAppLogic.tsx' is ~14k lines with a ~950-field return object. Additive only.
- Auth is NOT JWT: a 2-segment HMAC via 'utils/cryptoHelper.ts'; header planes 'x-dente-clinic-token',
  'x-dente-staff-token', and 'x-organization-id' (dev-only by construction).
- Test runner is 'node:test' via tsx. **Vitest is NOT installed** (a fake shim exists). **Playwright has
  no config and zero .spec files.** Never recommend either without saying it must be installed first.
- 'packages/shared/src/utils/money.ts' is the ONLY sanctioned money arithmetic: 'parseKopecks',
  'sumKopecks', 'splitKopecks', 'percentageOfKopecks', 'formatKopecksRu', 'kopecksToNumericString'.
- FDI tooth numbers now live in the shared contract: 'VALID_FDI_TOOTH_NUMBERS' (52 teeth),
  'isValidFdiToothNumber', 'fdiToothNumberSchema'.
- Gates at dispatch, measured by the lead: typecheck api 0 errors, typecheck web 0 errors, route gate
  ok:true over 438 routes / 187 mutating with staleOutputCount 0, encoding smoke 0.
- FROZEN AREAS you may investigate but must NOT propose patching a third time: speech/dictation
  ('apps/api/src/speech/**', 'routes/speech.ts') failed review 5 times; Telegram ('routes/telegram.ts')
  twice. For those, only a root-cause or deletion recommendation is acceptable.
`

const PACKETS = [
  {
    id: 'RC1-i18n-true-cost',
    label: 'RC1 what would making this product multilingual actually cost',
    dir: '.agents/archon/recon/RC1-i18n-true-cost',
    brief: `
THE QUESTION: is this product translatable at all, and what is the smallest honest first step?

**WHAT IS BELIEVED, AND YOU MUST VERIFY OR DEMOLISH IT.** There is no i18n library. Roughly 14,814 lines
contain Cyrillic. A language selector exists with ONE option. Every one of those figures came from a
regex and none has been re-measured.

**DO THIS.**
1. **Measure the real surface with a parser, not a regex.** How many DISTINCT user-facing Russian string
   literals exist, and in how many files? A regex counting «lines containing Cyrillic» conflates code
   comments, commit-message prose, test fixtures and actual UI text — and comments must NOT be
   translated. Use '@babel/parser' or the TypeScript compiler API to separate: (a) string literals
   reaching JSX or a user-visible prop, (b) literals in thrown errors and toasts, (c) comments,
   (d) test fixtures. Report each bucket with its command. **The gap between your number and 14,814 is
   itself a finding.**
2. **Find the dictionaries that already exist** — 'workspaceUiLabels.ts', 'imagingUiLabels.ts',
   'pricelistUiMeta.ts' and any others. How much of the UI already routes through them, as a share of
   bucket (a)? That share is the honest starting point, and it may be far better or far worse than
   anyone thinks.
3. **Find the language selector** and establish what it actually does when changed: does it write
   anywhere, does anything read it, or is it a control that cannot keep its promise (§3)?
4. **Establish the hard blockers**, because they decide whether this is a packet or a project: Russian
   grammatical agreement (this campaign already shipped «Статус не загружены» and «undefined не
   загружены» to a dentist's screen from exactly this class of bug), pluralisation, date and money
   formatting, and the 30–50 % width expansion that Russian layouts are built around — which reverses
   when translating INTO shorter languages.
5. **RECOMMEND ONE BOUNDED FIRST PACKET, or recommend NOT DOING IT YET and say why.** «Install a library
   and wrap 14,000 strings» is not a packet and the lead will reject it. A defensible answer might be
   one view, or one dictionary pattern extended, or a lint rule that stops NEW untranslated literals
   entering. Name the files. Name what would make it fail review.

**HONEST LIMIT REQUIRED.** State plainly whether a solo Russian dentist — this product's actual user —
gains anything at all from this work. If your answer is «nothing measurable yet», say it. The lead would
rather cancel a fashionable feature than ship a facade.
`,
  },
  {
    id: 'RC2-unverified-identity',
    label: 'RC2 the identity that says verified:false and nobody checks it',
    dir: '.agents/archon/recon/RC2-unverified-identity',
    brief: `
THE QUESTION: can a caller obtain another clinic's data, and how many independent auth idioms decide it?

**WHAT IS BELIEVED, AND EVERY LINE OF IT NEEDS CONFIRMING AT A REAL LINE.**
(a) 'apps/api/src/security/identity.ts' sets 'organizationId' from the 'x-organization-id' HEADER and
marks the result 'verified: false'. (b) 'requireOrganizationId' never reads 'identity.verified'.
(c) 'serverAcceptsNetworkConnections()' gates the unverified path on 'request.server.server.listening',
which is FALSE under 'app.inject' and TRUE in a browser — **so the behavioural route gate never executes
the branch a real browser takes.** The gate itself documents this limitation. (d) A PowerShell setup
script writes 'DENTE_DEV_ALLOW_HEADER_ORG' into three env files. (e) Two competing auth idioms coexist:
shared 'requireClinical*' helpers and hand-rolled 'verifyToken' in 'routes/patients.ts'.

**DO THIS.**
1. Read 'security/identity.ts' IN FULL, then every caller of 'requireOrganizationId',
   'requireResolvedOrganizationId' and 'requireResolvedStaffOrAdminOrganizationId'. **A guard is decided
   in the HANDLER BODY, never at the 'app.post(...)' registration line** — the lead got this wrong once
   and it stands as a standing correction.
2. **Inventory EVERY authorisation idiom in 'apps/api/src/routes/**' with a per-route verdict.** Which
   helper, or hand-rolled, or none. This inventory is the deliverable: a convergence packet cannot be
   written without it, and a partial one would leave exactly the routes nobody looked at.
3. **Establish the exact conditions under which an unverified organization id is honoured.** Every
   condition, ANDed: the env flag, NODE_ENV, the listening socket, anything else. Then answer plainly:
   **in a production deployment as this repo ships it, is the header path reachable?** If it is not,
   say so — that downgrades this from a live hole to a development hazard, and the lead needs the
   difference. If it IS reachable, that is the most important finding of the night.
4. **PROBE IT AGAINST THE RUNNING SERVER**, which listens on a real socket at 127.0.0.1:4100, so the
   branch 'app.inject' cannot reach is reachable for you. Pick a read route that returns clinic data,
   call it with 'x-organization-id' and NO token, and quote the status and body. Then call it with a
   valid clinic token for the OTHER organization and compare. **Two organizations exist**: the real
   '4a3420d1-…' and the fixture 'd0000000-…' — use both, and never print a token value.
5. Read 'apply-dev-env.ps1' (or whatever writes the flag) and report which files receive it and whether
   any of them is committed to git. **A dev flag that ships is the whole defect.**
6. **RECOMMEND: what makes the unverified path impossible rather than discouraged?** Prefer a change that
   makes the class impossible — a type that cannot be passed where a verified id is required, rather than
   another runtime check somebody can forget. Name the files. Say what would break.

**DO NOT PROPOSE A FIX YOU HAVE NOT TRACED TO EVERY CALLER.** The convergence of the two idioms is
wanted, but converging onto a helper that is itself wrong would be worse than leaving two.
`,
  },
  {
    id: 'RC3-hollow-panel-census',
    label: 'RC3 which panels show a table nothing writes — measured behaviourally',
    dir: '.agents/archon/recon/RC3-hollow-panel-census',
    brief: `
THE QUESTION: which parts of this product are furniture — a panel whose data can never arrive?

**THE PREVIOUS ATTEMPT AT THIS NUMBER WAS A REGEX ARTEFACT AND THE LEAD PUBLISHED IT.** «45 hollow
modules of 50» was wrong. A later figure of «42 hollow widgets over tables with zero writers» has never
been verified either. **Your job is to produce the first honest version of this census, and if the honest
number is small, that is a fine answer.**

A panel is HOLLOW when a user can reach it and it can never show real data. There are distinct causes and
they need different fixes, so classify rather than lump:
  A. **No writer.** The table it reads has zero INSERT/UPDATE anywhere in the product.
  B. **Dead route.** It fetches an endpoint that returns 404 because no route is registered.
  C. **Field mismatch.** The route exists and returns data, but under different field names, so the panel
     renders nothing or zeroes. **This class is proven real tonight**: a mounted estimate read
     'svc.priceRub' where the contract says 'basePriceRub', so a clinic that filled its price list saw
     «0 ₽». A census that only looks for missing writers cannot see this class at all.
  D. **Unreachable.** The component is not mounted anywhere.
  E. **Not hollow.** Genuinely works — say so; the lead needs the denominator.

**DO THIS.**
1. **Enumerate the writers per table with a parser or the Drizzle schema, not a regex over 'insert'.**
   Beware two known holes: the existing census tool walks only 'apps/api/src', so writers in 'scripts/'
   are invisible to it; and 'routes/egisz.ts:163' is believed to serve a read inline with no query
   module, so a module-based census cannot see it. Confirm both.
2. **Enumerate every fetch target in 'apps/web/src' and resolve each against the registered routes.**
   The route gate reports 438 routes — use the real registration list, not a guess. Any web fetch with no
   matching route is class B, and each is a user-visible «раздел, которого нет».
3. **For class C, compare field-by-field**: what the route actually returns versus what the component
   reads. Focus on money and counts, where a mismatch silently renders 0 rather than blank. Do at least
   the money paths and say how far you got.
4. **Rank by USER HARM, not by count.** A hollow panel that quietly shows «0 ₽» where money should be is
   far worse than an empty list that says «пока ничего нет» honestly. A panel that says «данных нет»
   truthfully is barely a defect at all (§3 is satisfied).
5. **RECOMMEND for the worst five, individually**: delete, wire to a real source, or state as declared
   debt with a written reason. The product already has a good pattern for the third option —
   'knownUnwiredPatientComponents' in 'apps/web/src/tests/patientCardDecomposition.test.ts' demands a
   written reason per entry, and the lead read it in full and judged it good. Match that standard.

**SAY WHAT YOUR CENSUS CANNOT SEE.** Every instrument has a blind spot; naming yours is what separates
this dossier from the one that produced «45 of 50».
`,
  },
  {
    id: 'RC4-egisz-legal-clock',
    label: 'RC4 the EGISZ obligations the product cannot currently meet',
    dir: '.agents/archon/recon/RC4-egisz-legal-clock',
    brief: `
THE QUESTION: what does Russian law require of a dental clinic's records, and where does this product
leave the dentist personally exposed?

**WHY THIS OUTRANKS FEATURES.** A missing button annoys. A missing legal obligation gets a clinic fined
or its licence questioned. This product is sold to Russian clinics, so ЕГИСЗ/ЕМИАС reporting, medical
record retention, and personal-data consent are not optional polish.

**WHAT IS BELIEVED AND MUST BE CONFIRMED OR DEMOLISHED.** 'apps/api/src/routes/egisz.ts:163' serves a
hollow read directly, with no query module behind it. An EGISZ monitor component is mounted in the UI but
calls two routes that do not exist. There is a one-working-day clock for registering a medical record.
Patient consent to transmit data is required and may not be modelled at all.

**DO THIS.**
1. **Read every EGISZ-related file in full** — routes, services, schema tables, and the UI that consumes
   them. Establish what EXISTS versus what is named. A route that returns a shape but reads nothing is a
   facade and must be labelled as one.
2. **Verify the mounted-but-404 claim precisely**: which component, which endpoints, and what the user
   SEES when those calls fail. If the failure renders as «данных нет» rather than an honest error, that
   is §3 and it is worse than a crash, because the clinic believes it is reporting when it is not.
3. **The one-working-day clock.** Does anything in the schema record when a record became reportable, and
   anything compute a deadline? Working days require a holiday calendar — does one exist anywhere in this
   repo? **If it does not, say so; do NOT invent one, and do NOT invent the legal rule either.**
4. **Consent to transmit.** Search the schema and the contract for any consent model. There IS a consent
   subsystem in this product ('services/communications/consentLoader.ts' and related) — establish
   whether it covers transmission to a state system or only marketing and messaging. **Those are
   different consents in Russian law and conflating them would be the exact kind of invention §10
   forbids.**
5. **STATE THE LAW SEPARATELY FROM THE CODE, AND MARK YOUR CONFIDENCE.** You are not a lawyer and you
   have no reliable way to verify current Russian regulation from inside this repo. Write what the CODE
   does with certainty, and write legal requirements as «требует проверки у юриста» wherever you are
   relying on recollection rather than a document in the repo. **A fabricated legal deadline is more
   dangerous than none**, because someone will build a compliance feature on it.
6. **RECOMMEND ONE BOUNDED PACKET** — most likely the honest-failure-state work, since that needs no
   legal certainty: a clinic must never believe it reported when it did not. Name the files.
`,
  },
]

const RECON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['packet', 'headline', 'confirmed', 'demolished', 'inventory', 'methodCommands', 'blindSpots', 'notEstablished', 'recommendedPacket', 'dossierCorrections'],
  properties: {
    packet: { type: 'string' },
    headline: { type: 'string', description: 'The single most important finding, one sentence, naming the user-visible consequence.' },
    confirmed: { type: 'array', items: { type: 'string' }, description: 'Each with file:line or the exact command, and whether it is a source / runtime / database fact.' },
    demolished: { type: 'array', items: { type: 'string' }, description: 'Beliefs from the brief or existing dossiers that your measurement DISPROVED. Name the wrong claim.' },
    inventory: { type: 'array', items: { type: 'string' }, description: 'The inventory your brief demanded, per item, with a verdict.' },
    methodCommands: { type: 'array', items: { type: 'string' }, description: 'The exact commands behind your numbers, so the lead can re-run them.' },
    blindSpots: { type: 'array', items: { type: 'string' }, description: 'What your instrument structurally cannot see.' },
    notEstablished: { type: 'array', items: { type: 'string' }, description: 'Each with the exact command or document that would settle it.' },
    recommendedPacket: { type: 'string', description: 'One bounded packet: the files, the order of work, and what would make it fail review. Or an argued recommendation NOT to do it.' },
    dossierCorrections: { type: 'array', items: { type: 'string' } },
  },
}

const CRITIQUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['packet', 'verdict', 'reproduced', 'failedToReproduce', 'overreach', 'missed', 'reasoning'],
  properties: {
    packet: { type: 'string' },
    verdict: { enum: ['TRUSTWORTHY', 'TRUSTWORTHY_WITH_CORRECTIONS', 'PARTLY_UNRELIABLE', 'UNRELIABLE'] },
    reproduced: { type: 'array', items: { type: 'string' } },
    failedToReproduce: { type: 'array', items: { type: 'string' } },
    overreach: { type: 'array', items: { type: 'string' }, description: 'Claims stated more strongly than the evidence supports, especially invented legal rules or backend contracts.' },
    missed: { type: 'array', items: { type: 'string' }, description: 'What the recon should have found and did not.' },
    reasoning: { type: 'string' },
  },
}

function reconStage(p) {
  return agent(
    RECON_LAW +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'YOUR ASSIGNMENT: ' + p.id + '\n' +
    'YOUR ROLE: read-only reconnaissance analyst. You have full READ rights across the repo, the live\n' +
    'API and the live database, and WRITE rights ONLY inside your own dossier directory.\n' +
    'WHY THIS IS DELEGATED: the lead needs four independent investigations to run at once while three\n' +
    'builders hold the source files, and each of these questions needs a whole context of its own.\n' +
    'YOUR DOSSIER DIRECTORY (create it FIRST, before reading anything): ' + p.dir + '\n' +
    'FILES YOU MUST LEAVE ON DISK: ' + p.dir + '/findings.md (append as you go) and\n' +
    p.dir + '/recommendation.md (the bounded packet you propose).\n' +
    'EVIDENCE STANDARD: every number carries the command that produced it. Your output is EVIDENCE for\n' +
    'the lead, never authority — a critic will try to reproduce each of your claims and the lead will\n' +
    're-run the ones that matter.\n' +
    '═══════════════════════════════════════════════════════════════\n' + p.brief +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'ORDER OF WORK:\n' +
    ' 1. Create ' + p.dir + ' and write findings.md == «в работе». NOW, before reading anything else.\n' +
    ' 2. Read the authority documents you need: .agents/AGENTS.md and .agents/INDEX.md, plus the domain\n' +
    '    files your question names. Complete, not skimmed.\n' +
    ' 3. Investigate. Append each confirmed fact to findings.md AS YOU CONFIRM IT, with its command.\n' +
    ' 4. Build the inventory your brief demands. Completeness for a STATED scope beats breadth.\n' +
    ' 5. Write recommendation.md: one bounded packet, the files it touches, the order of work, and what\n' +
    '    would make it fail review. An argued «do not do this yet» is a valid and welcome answer.\n' +
    ' 6. Emit structured output. Put anything you could not establish in notEstablished WITH the command\n' +
    '    that would close it — an honest gap is worth more than a confident guess.\n' +
    'A dossier of confident numbers with no commands behind them is a FAILED assignment.\n',
    { label: p.label, phase: 'Recon', schema: RECON_SCHEMA }
  )
}

function critiqueStage(recon, p) {
  if (!recon) {
    return { packet: p.id, verdict: 'UNRELIABLE', reproduced: [], failedToReproduce: [], overreach: [], missed: ['Recon produced no result — died or out of capacity. Read ' + p.dir + '/findings.md; partial work may exist on disk.'], reasoning: 'No recon output.' }
  }
  return agent(
    'You are an ADVERSARIAL CRITIC of a reconnaissance dossier on the DENTE dental CRM\n' +
    '(C:\\Clinic_MVP\\dental-crm), reporting to lead [ARCHON]. You did NOT write this dossier.\n' +
    '**Your job is to find the numbers that dissolve when re-measured.**\n\n' +
    'You are READ-ONLY on source and must not edit, create or delete any file except\n' +
    p.dir + '/critique.md, which you write AS YOU GO because agents die on credits here constantly.\n' +
    'No git add/commit/rm/checkout/stash/push. No npm typecheck/build/test. Never git remote -v (live\n' +
    'tokens). Read-only rg/fd/sg/git log/show/grep, read-only node -e, read-only SQL, curl to\n' +
    '127.0.0.1:4100 are all fine.\n\n' +
    'WHY THIS ROLE EXISTS. Four numbers published to the Director this campaign were wrong: «45 hollow\n' +
    'modules of 50» (regex artefact), «4 organizations» (fixtures from a seeder the lead ran itself),\n' +
    '«zero payments carry a fiscal receipt» (a seeder column list, not human behaviour), and two\n' +
    '«security findings» that were a probe\'s own stale configuration comment. A critic caught the second\n' +
    'one. That is the value you are here to add.\n\n' +
    'THE DOSSIER UNDER ATTACK: ' + p.id + '\n' +
    'HEADLINE: ' + (recon.headline || '(none)') + '\n' +
    'CONFIRMED: ' + JSON.stringify(recon.confirmed || []) + '\n' +
    'DEMOLISHED: ' + JSON.stringify(recon.demolished || []) + '\n' +
    'INVENTORY: ' + JSON.stringify(recon.inventory || []) + '\n' +
    'METHOD COMMANDS: ' + JSON.stringify(recon.methodCommands || []) + '\n' +
    'BLIND SPOTS IT ADMITS: ' + JSON.stringify(recon.blindSpots || []) + '\n' +
    'NOT ESTABLISHED: ' + JSON.stringify(recon.notEstablished || []) + '\n' +
    'RECOMMENDED PACKET: ' + (recon.recommendedPacket || '(none)') + '\n' +
    'ORIGINAL BRIEF:\n' + p.brief + '\n\n' +
    'DO THIS:\n' +
    '1. **RE-RUN ITS COMMANDS YOURSELF** and compare outputs. A command that does not reproduce its own\n' +
    '   stated number is the finding.\n' +
    '2. **RE-DERIVE ITS HEADLINE WITH A DIFFERENT INSTRUMENT.** If it counted with a regex, count with a\n' +
    '   parser. If it read code, probe the live API. If it queried the database, split by\n' +
    '   organization_id and exclude the fixture organization (id starts d0000000) — a number that\n' +
    '   includes fixture rows is worthless and this has already destroyed one dossier.\n' +
    '3. **HUNT OVERREACH SPECIFICALLY.** Did it state a legal requirement it cannot source from a\n' +
    '   document in this repo? Did it invent a backend contract, a DB field, or a role policy that does\n' +
    '   not exist (§10)? Did it call something a defect when it is declared debt with a written reason?\n' +
    '   Did it label a source fact as a runtime fact?\n' +
    '4. **CHECK REACHABILITY OF EVERY CLAIMED DEFECT, LINK BY LINK.** A defect in an unmounted component\n' +
    '   or an unregistered route is not a user-facing defect. One packet this campaign fixed a dead file\n' +
    '   and certified it with its strongest label.\n' +
    '5. **JUDGE THE RECOMMENDATION.** Is it genuinely ONE bounded packet, or a project wearing a\n' +
    '   packet\'s clothes? Would it survive the constitution — no fabricated defaults, no facade, real\n' +
    '   decomposition, human Russian error text? Say what would make it fail review.\n' +
    '6. **SAY WHAT THE DOSSIER MISSED** — the question it should have asked given what it found.\n\n' +
    'Reserve UNRELIABLE for a dossier whose central claim you disproved. Never award TRUSTWORTHY to a\n' +
    'number you could not reproduce. Be specific: quote outputs, not impressions.',
    { label: 'critique:' + p.id, phase: 'Critique', schema: CRITIQUE_SCHEMA }
  )
}

const all = []
log('Recon 2 (read-only, no source edits): ' + PACKETS.map((p) => p.id).join(', '))
const done = await pipeline(PACKETS, reconStage, critiqueStage)
for (let i = 0; i < PACKETS.length; i++) all.push({ packet: PACKETS[i].id, dir: PACKETS[i].dir, critique: done[i] || null })
log('Recon 2 complete.')
return { recon: 2, results: all }
