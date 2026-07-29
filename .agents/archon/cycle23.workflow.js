export const meta = {
  name: 'archon-cycle-23',
  description: 'DENTE cycle 23: a delete button with no route behind it, a room number priced as a service, a test that reads whatever is in the shared database, an enum whose only validator is Postgres, five hand-rolled auth checks beside one shared helper, and the last orphan panel',
  phases: [
    { title: 'Build', detail: 'six packets, disjoint file sets; every finding re-measured on HEAD at dispatch' },
    { title: 'Attack', detail: 'a different agent per packet; the reviewer must write a literal ## VERDICT line' },
  ],
}

/*
 * SHORT LAW ON PURPOSE (~2 KB). Cycles 11-13 carried a ~15 KB preamble and six agents
 * in a row burned their whole credit window reading it without committing. Cycle 22
 * with this law landed 8 commits from 5 builders. Do not grow it.
 */
const LAW = `
You are an implementer on the DENTE dental CRM under lead [ARCHON].
Repo root: C:\\Clinic_MVP\\dental-crm (branch main). Russian-language dental CRM for solo dental clinics.

═══ SMALL PACKET. FINISH IT AND COMMIT WITHIN MINUTES. ═══
Credit exhaustion has killed agents here mid-task repeatedly, each before committing. So:
1. Do NOT read the constitution. Read ONLY your target files and the exact lines this brief names.
2. Make the change. The brief tells you what and where; it was re-measured on HEAD minutes ago.
3. **COMMIT AS SOON AS IT COMPILES.** Then improve in a second commit if you still have room.
4. Write '<packet dir>/state.md': one line before you start, one line after you commit. Nothing else.

═══ SEARCH — 'grep -r' AND 'find /' ARE BANNED ON THIS MACHINE ═══
Use 'rg' for content and 'fd' for filenames, always scoped:
    rg -n 'pattern' apps/api/src --glob '!dist'
Git Bash children outlive their parent shell and Windows never reaps them; one 'find /' burned 5.25 hours
of CPU here overnight. '--include' does not help — it filters files read, not directories walked.

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
with 'git commit -F', then verify 'git log -1 --format=%(trailers)' prints NOTHING.

═══ GATES ARE THE LEAD'S (§7a) ═══
Do NOT run 'npm run typecheck', 'npm run build', 'npm test', migrations or seeds — they write shared state
and five other agents are running. **Your own signal is 'node --import tsx --test <one file>'.** Put any
command you need the lead to run into 'leadMustRun'.

═══ MONEY ═══
'packages/shared/src/utils/money.ts' is the ONLY sanctioned arithmetic (parseKopecks, sumKopecks,
splitKopecks, formatKopecksRu, kopecksToNumericString). Never write a second helper. Never add an epsilon
to a money comparison — a tolerance that hides float drift also hides a real one-kopeck discrepancy.

═══ COMMIT MESSAGE ═══
Russian, Conventional Commits, prefixed '[ARCHON] ', subject names THE DEFECT not the activity. Body says
WHY it mattered to a clinic. Banned words: improve, enhance, update, cleanup. Example from HEAD:
    fix(вход): каждый вход сотрудника останавливал весь сервер на время счёта пароля

═══ HONESTY ═══
Every "proven" entry is a command you actually RAN, with its TRUE exit code captured WITHOUT a pipe
('cmd > /tmp/log 2>&1; echo $?') — '$?' after a pipe reports the pipe and the lead has been fooled by that.
If your measurement contradicts this brief, YOUR MEASUREMENT WINS — say so loudly and do not invent work.
The lead has been wrong repeatedly tonight and has twice thanked an agent for refusing a stale brief.
`

const PACKETS = [
  {
    id: 'LL1-clinical-rule-delete-route',
    label: 'build:clinical-delete',
    dir: '.agents/archon/packets/LL1-clinical-rule-delete-route',
    files: 'apps/api/src/routes/clinical.ts, apps/api/src/db/clinicalQuery.ts, and ONE new test file under apps/api/src/tests/',
    gate: 'node --import tsx --test apps/api/src/tests/<your new test>.test.ts',
    brief: `THE DELETE BUTTON FOR A CLINICAL RULE HAS NEVER WORKED. NOT ONCE, IN ANY BUILD.

RE-MEASURED ON HEAD AT DISPATCH, these are my numbers not a stale review's:
  apps/api/src/routes/clinical.ts registers exactly three rule routes:
    :46  app.post("/api/clinical/rules/evaluate")
    :75  app.post("/api/clinical/rules")
    :87  app.patch("/api/clinical/rules/:ruleId")
  There is NO app.delete for rules anywhere in the file.
  apps/web/src/useAppLogic.tsx:11066 does: fetch(\`/api/clinical/rules/\${ruleId}\`, { method: "DELETE" ... })
  apps/api/src/db/clinicalQuery.ts has select(:70), insert(:154), update(:191 and :209) on
  schema.clinicalRules — and NO delete function. So both halves are missing.

CONFIRMED AGAINST THE LIVE SERVER with a CONTROL request, so this is absence-of-route and not
absence-of-access: DELETE on that path answers 404 «Route not found», while PATCH on the SAME path answers
401 AuthRequired. The server distinguishes the two, and it is answering "no such route".

WHAT THE CLINIC SEES: a dentist opens clinical rules, presses delete, and nothing happens — or a error
toast appears — and the rule stays. Forever. There is no workaround in the UI.

═══ DECIDE ONE THING FIRST, AND WRITE THE DECISION IN THE COMMIT BODY ═══
Hard delete or soft disable? Evidence you must gather yourself before choosing:
  - Read schema.ts around line 499 where clinicalRules is declared. Is there an 'isActive'/'enabled'
    column already? If yes, the honest fix may be that the button should DISABLE, and PATCH can already
    do it — in which case the route to add is still DELETE (the UI asks for it) but it flips that flag.
  - rg for foreign keys pointing AT clinicalRules from other tables. I found none, so a hard delete does
    not orphan rows. Verify that yourself — if you find a reference, hard delete is wrong.
  - Read what useAppLogic.tsx:11066 does with the response and what it removes from local state. The
    server's answer must match what the UI already assumes, or the list will lie until reload.

═══ THE NEW ROUTE MUST MIRROR PATCH EXACTLY ═══
Read clinical.ts:87-108 and copy its guard sequence verbatim:
  requireClinicalMutationAccess(...)  AND  requireOrganizationId(request, reply)
The comment at clinical.ts:96 records a PAST DEFECT — «правило редактировалось в чужой организации».
Do not reintroduce it. The organizationId must be part of the WHERE clause, exactly the way
clinicalQuery.ts:209 does it for update: and(eq(...organizationId, organizationId), eq(...id, input.id)).
A delete that filters only by rule id lets one clinic delete another clinic's rules.

Deleting a row that does not exist, or belongs to another organization, must answer 404 — NOT 200. Those
are the same observable answer from outside and that is correct: never confirm existence across tenants.

═══ TEST — IT MUST FAIL IF THE ROUTE IS REMOVED ═══
Write ONE new test file under apps/api/src/tests/. Assert:
  1. DELETE with no credentials → 401, NOT 404. (This is the assertion that proves the route exists.)
  2. DELETE a rule belonging to organization A using organization B's header → 404, and the row SURVIVES.
  3. DELETE own rule → success, and a follow-up read no longer returns it.
Use app.inject. Look at an existing test in apps/api/src/tests/ for how the app is built and how
ORG_HEADERS are shaped — and note the standing trap: a test that depends on rows already sitting in the
shared database proves nothing. SEED YOUR OWN rule inside the test, or skip honestly if the DB is down.`,
  },

  {
    id: 'LL2-room-number-priced-as-service',
    label: 'build:room-number-price',
    dir: '.agents/archon/packets/LL2-room-number-priced-as-service',
    files: 'apps/api/src/pricelist/analyzer.ts and its test files under apps/api/src/pricelist/',
    gate: 'node --import tsx --test apps/api/src/pricelist/analyzer.test.ts',
    brief: `A ROOM NUMBER IS BEING SOLD AS A DENTAL SERVICE. «Седация 5000 / 120 мин кабинет 412» costs 412 ₽.

RE-MEASURED ON HEAD AT DISPATCH: apps/api/src/pricelist/analyzer.ts:742 reads
    const selected = ambiguous ? undefined : pool.at(-1);
'.at(-1)' means LAST NUMBER WINS whenever no candidate carries a currency marker. In a real Russian
pricelist row the last number is very often not the price: it is a room, a tooth number, a duration, a
protocol code, a count of visits. 5000 is the price and 412 is where the chair stands.

A sibling defect in this same function was already fixed and shipped (commit ce04f7385 — «занижение цены
в 12 раз: номер кабинета оценивал услугу»), and the row above still misprices because THAT fix covered a
different branch. This is the fallback branch. Read the surrounding 60 lines before you touch anything:
the function has several branches and they were each written for a real pricelist shape.

═══ WHAT «RIGHT» MEANS HERE, AND IT IS NOT «GUESS BETTER» ═══
The sanctioned behaviour in this codebase, argued in earlier commits, is: WHEN THE PARSER CANNOT TELL, IT
MUST REFUSE, not guess. A refusal surfaces as 'price_not_found' → «Цена не найдена» and the clinic checks
that row by hand. A wrong guess goes silently into a document a patient signs.

So the acceptable outcomes for «Седация 5000 / 120 мин кабинет 412» are, in order of preference:
  1. price 5000 — if you can justify the discrimination on evidence, not vibes.
  2. an honest price_not_found with a warning.
And the unacceptable outcome is 412, silently.

═══ EVIDENCE-BASED DISCRIMINATORS, PICK FROM THESE ═══
Do not invent a heuristic zoo. Candidates worth measuring:
  - a number immediately preceded by «кабинет», «каб.», «зуб», «мин», «шт», «№» is NOT a price. This is
    lexical and cheap and covers the real cases.
  - durationFromLine already exists in this file and reads «120 мин» — a number already consumed as a
    duration must not also be a price candidate. Check whether that exclusion is actually wired.
  - magnitude alone is NOT sufficient evidence and is a trap: a hygiene visit can be 500 ₽ and a room can
    be 1201. Do not add a bare threshold and call it fixed.

═══ REGRESSION SET — THESE MUST ALL STILL HOLD ═══
Four suites cover this file. Run analyzer's own tests. Rows proven correct by earlier commits, which your
change MUST NOT break (each was a real defect once):
  «Отбеливание Zoom 4 25000»      → 25 000, title «Отбеливание Zoom 4»
  «Имплантация Osstem TS3 45000»  → 45 000, title «Имплантация Osstem TS3»
  «Пломба Filtek Z550 3500»       → 3 500   (fixed in c31952f-era commit; a brand code is not a price)
  «Коронка 12 500 руб»            → 12 500  (real thousands grouping)
  «Имплантация 1 200 000»         → 1 200 000
  «Лечение кариеса 1500,50»       → 1500.50 (kopecks survive)
Add «Седация 5000 120 мин кабинет 412» to the test file as a named case. State in the commit body which
outcome you chose (5000 or refusal) and WHY, in one sentence, with the discriminator named.

IF YOU FINISH WITH ROOM LEFT, a second commit only: after parsing, the duration text «60 мин» stays glued
into the service title («Лечение кариеса 60 мин»). Decide — strip it, or argue in writing that a duration
belongs in the name. Do not fold this into the first commit; one reason, one commit.`,
  },

  {
    id: 'LL3-test-reads-shared-database',
    label: 'build:self-seeding-test',
    dir: '.agents/archon/packets/LL3-test-reads-shared-database',
    files: 'apps/api/src/tests/routes/managerReports.test.ts ONLY. apps/api/src/services/reports/managerReports.ts is DIRTY — another author is mid-edit. DO NOT TOUCH THE SERVICE.',
    gate: 'node --import tsx --test apps/api/src/tests/routes/managerReports.test.ts',
    brief: `THE ONLY FAILING TEST IN A 1278-TEST SUITE, AND IT IS NOT A CODE DEFECT. IT IS A TEST THAT READS
WHATEVER HAPPENS TO BE LYING IN THE SHARED DATABASE.

MEASURED BY THE LEAD, twice, on the full suite: 1278 tests, 1277 pass, 1 fails —
  ✖ «загрузка по дням недели и часам заполнена» at apps/api/src/tests/routes/managerReports.test.ts:453
  assert.equal(body.isEmpty, false) on GET /api/reports/schedule-load with ORG_HEADERS.

WHY IT FAILS, measured directly against the live Postgres (127.0.0.1:5432):
  appointments grouped by organization_id → exactly one group:
      d0000000-0000-4000-8000-00000000d001 with 27 rows
  and that organization is a SCREENSHOT-SEEDER FIXTURE the lead created himself.
  The test's own const ORG_ID = "dce70000-0000-4000-8000-000000000401" — a DIFFERENT fixture prefix,
  which owns ZERO appointments. So isEmpty is truthy and the assertion breaks.

THIS IS THE WHOLE POINT: the test is GREEN when someone else's fixture data happens to match its shape,
and RED when it does not. A test like that proves nothing in either direction. It is the same class as the
standing rule in this repo that a row count is evidence only when split by organization_id with fixture
prefixes excluded.

NOTE, AND VERIFY IT YOURSELF: the lead's latest run reported actual: undefined rather than actual: true.
'body.isEmpty' may not even be present on the response any more, because the service file is being edited
right now by another author. Re-run the single test yourself FIRST and report what you actually see. If
the shape changed, say so — do not write assertions against a field that no longer exists.

═══ WHAT TO BUILD ═══
Make the test self-sufficient. Order of preference:
  1. The test SEEDS its own appointments for its own ORG_ID inside a before-hook, asserts against them,
     and removes them after. Then isEmpty === false is caused by the test, not by ambient luck. Prefer
     this — it is the only option that actually proves the endpoint aggregates.
  2. If seeding appointments requires more fixture surface than one test file can honestly own (patients,
     staff, chairs, visit types — go look), then the assertion must be rewritten to test the SHAPE the
     endpoint returns rather than the presence of rows: that isEmpty is a boolean, that the day/hour
     buckets exist and are consistent with each other, that a seeded-zero case reports isEmpty true.
     Say plainly in the commit body that aggregation over real rows is therefore NOT covered, and that
     this is a deliberate reduction in what the test claims.
Do not "fix" it by deleting the assertion, and do not make it skip unconditionally. A test that always
skips is worse than a red one because nobody ever looks at it again.

Look first at how OTHER tests in apps/api/src/tests/ seed rows — there is prior art in this repo for
inserting fixture rows and cleaning them up, and matching it is better than inventing a new pattern.
Whatever you do, the file must not leave rows behind for the next test to trip over.`,
  },

  {
    id: 'LL4-egisz-status-only-postgres-validates',
    label: 'build:egisz-status-contract',
    dir: '.agents/archon/packets/LL4-egisz-status-only-postgres-validates',
    files: 'packages/shared/src/index.ts, apps/api/src/db/schema.ts (the egiszLogs block at :1928-1953 ONLY), and apps/api/src/tests/enumContractDrift.test.ts if it needs a new entry',
    gate: 'node --import tsx --test apps/api/src/tests/enumContractDrift.test.ts',
    brief: `AN ENUM WHOSE ONLY VALIDATOR IS POSTGRES. A BAD STATUS PASSES TYPECHECK AND EXPLODES AT RUNTIME.

RE-MEASURED ON HEAD AT DISPATCH. This one is unusual: the previous author already wrote down the exact
blocker in a comment, honestly, instead of hiding it. Read apps/api/src/db/schema.ts:1938-1949:

    status: text("status").notNull().default("Pending"),

with a comment saying: the DB column really has type egisz_status_enum; it is declared as text HERE
deliberately, because a pgEnum in this file is REQUIRED by tests/enumContractDrift.test.ts to have a
same-named '<name>Schema' contract in @dental/shared — and no contract for the EGISZ status exists.

I verified the DDL myself rather than trusting the comment:
  apps/api/drizzle/0000_*.sql:26
    CREATE TYPE "public"."egisz_status_enum" AS ENUM('Pending', 'Sent', 'Error', 'Accepted');
  same file :525
    "status" "egisz_status_enum" DEFAULT 'Pending' NOT NULL,
Four values, capitalised exactly like that. The same four appear in the web panel at
apps/web/src/components/integrations/egiszAvailability.ts — go read it and confirm the spelling matches;
if the web panel disagrees with the DDL, THAT is a bigger finding than this packet and you must report it.

═══ WHY THIS MATTERS TO A CLINIC ═══
egisz_logs is the ledger of medical data pushed to the Russian state health system. Today
'status: "sent"' (lowercase) typechecks fine, passes every test, and fails only when Postgres rejects the
insert — at the moment a real transmission is being recorded. The failure lands on the least recoverable
path there is: the log of what was already sent.

═══ WHAT TO BUILD — NO MIGRATION IS NEEDED, AND THAT IS THE KEY FACT ═══
The enum TYPE already exists in the database. This is a DECLARATION-ONLY change. Do NOT write a migration,
do NOT run 'npm run db:generate' (banned in this repo), do NOT touch the DDL.
  1. Add the contract to packages/shared/src/index.ts next to the other enum contracts. Match the local
     naming convention exactly — go read two neighbouring '<name>Schema' declarations and copy their shape
     (zod enum, exported type, and whatever message/label pattern they use). Name it so
     enumContractDrift's own lookup rule finds it; READ that test to learn the rule rather than guessing.
  2. In schema.ts, declare the pgEnum with the name 'egisz_status_enum' and the four values, and change
     the status column to use it. Keep .notNull() and .default("Pending").
  3. Delete the part of the comment that explains the workaround — it will be describing a state that no
     longer exists, and a stale comment that claims a live constraint is worse than none. Keep the part
     that explains what the column IS.

═══ PROVE IT ═══
Run enumContractDrift's single test file. It was 5 tests passing at dispatch; it must still pass, and it
must now cover the new enum. State in the commit body whether the count changed and why.
Then prove the constraint actually bites: show that the shared schema REJECTS 'sent' and ACCEPTS 'Sent'.
A read-only 'node -e' or a two-line test is enough. If you cannot show rejection, you have not shipped a
validator — say so.
Report in leadMustRun that the lead must rebuild @dental/shared ('npm run build -w @dental/shared') before
any api typecheck can see your contract — the api imports the BUILT output, and a stale dist has already
cost this campaign one false measurement.`,
  },

  {
    id: 'LL5-two-auth-idioms-in-one-file',
    label: 'build:visits-auth-converge',
    dir: '.agents/archon/packets/LL5-two-auth-idioms-in-one-file',
    files: 'apps/api/src/routes/visits.ts and apps/api/src/routes/visits.test.ts ONLY',
    gate: 'node --import tsx --test apps/api/src/routes/visits.test.ts',
    brief: `ONE ROUTE FILE, TWO DIFFERENT ANSWERS TO «IS THIS CALLER ALLOWED». WHICHEVER IS WEAKER IS THE
FILE'S REAL SECURITY LEVEL.

RE-MEASURED ON HEAD AT DISPATCH by counting call sites per file:
    verifyToken (hand-rolled)        visits.ts: 5   patients.ts: 3   portal.ts: 3   ai.ts: 2   auth.ts: 9
    requireClinical*Access (shared)  visits.ts: 1   patients.ts: 3   ai.ts: 10  imaging.ts: 25 ...
visits.ts is the worst mixed file in the repo: FIVE hand-rolled checks against ONE shared helper.
(auth.ts is excluded on purpose — it ISSUES tokens, so verifyToken there is legitimate, not drift.)

YOUR SCOPE IS visits.ts ALONE. Do not touch patients.ts, portal.ts or ai.ts — other packets and another
author are in flight. One file, converged properly, beats five files half-converged.

═══ STEP 1 — INVENTORY BEFORE YOU CHANGE ANYTHING, AND WRITE IT TO state.md ═══
For each of the six sites in visits.ts, record: line number, HTTP verb + path, which idiom it uses, and
what it does on failure (status code, body shape, whether it returns or continues). Then answer the only
question that matters: DO THE TWO IDIOMS ACTUALLY DECIDE THE SAME THING?
Read the shared helpers (rg for requireClinicalReadAccess / requireClinicalMutationAccess and read their
definitions in full) and read verifyToken's definition in full. Compare on:
  - does it check the clinic token, the staff token, or both?
  - does it enforce organizationId, and is that organizationId trusted or header-supplied?
  - read vs mutate — does the hand-rolled path let a read-only credential mutate?
  - what status does each return with NO credentials at all: 401 or 403 or 200?

IF THE TWO IDIOMS DISAGREE, THAT IS A VULNERABILITY AND IT OUTRANKS THE REFACTOR. Report it loudly, fix
the weaker sites first, and commit that as its own commit with a subject naming the hole. Do not bury a
real access-control gap inside a tidy-up commit — it will never be reviewed as the security fix it is.

IF THEY DECIDE THE SAME THING, converge visits.ts onto the shared helpers so there is one idiom, and say
in the commit body that you PROVED equivalence rather than assumed it — naming the checks you compared.

═══ STEP 2 — PROVE IT BEHAVIOURALLY, NOT BY READING ═══
This repo has already been burned by a guard that counted identifiers in source instead of exercising
routes: it went green on prose and red on correct hand-rolled auth. So: app.inject EVERY mutating route in
visits.ts with NO credentials and assert the status. Add those assertions to visits.test.ts. They must
fail if a guard is deleted — verify that by temporarily removing one guard in your working tree, watching
the test go red, and putting it back. Report the status codes you observed BEFORE and AFTER your change,
per route. If a route answered 200 with no credentials before your change, that is the headline finding.`,
  },

  {
    id: 'LL6-last-orphan-panel',
    label: 'build:orphan-planner',
    dir: '.agents/archon/packets/LL6-last-orphan-panel',
    files: 'apps/web/src/components/plan/ComparativePlannerDashboard.tsx, apps/web/src/tests/panelsAreMounted.test.ts, and whichever ONE view file you mount it into if you choose to mount',
    gate: 'node --import tsx --test apps/web/src/tests/panelsAreMounted.test.ts',
    brief: `THE LAST ORPHAN PANEL. IT IS WRITTEN, IT COMPILES, AND NO HUMAN CAN EVER REACH IT.

RE-MEASURED ON HEAD AT DISPATCH: there were two orphans. One is now closed — PublicBookingWidget is
mounted at apps/web/src/main.tsx:78 and guarded by apps/web/src/tests/publicPortalRoute.test.ts:149. That
leaves ONE:
    apps/web/src/components/plan/ComparativePlannerDashboard.tsx:150
      export const ComparativePlannerDashboard: React.FC = () => {
Its only mentions outside itself are: a debt entry at apps/web/src/tests/panelsAreMounted.test.ts:91, a
comment at apps/web/src/tests/utils/componentReachability.ts:21, a comment in planPricing.ts:7, and a
comment at apps/web/src/components/odontogram/OdontogramModule.tsx:631 that says
    «Push suggestion to global state for ComparativePlannerDashboard»
That last one is the interesting thread: something is ALREADY FEEDING this panel. There is a producer with
no consumer. Follow it — read what OdontogramModule pushes, where it lands in state, and whether the
panel reads exactly that.

═══ THREE LEGAL OUTCOMES. PICK ON EVIDENCE AND SAY WHY IN THE COMMIT BODY. ═══
  A. MOUNT IT. Right if the panel is coherent and its data source is real. Read the component fully first
     and answer: what props/state does it need, does that state actually get populated at runtime, and
     does it render something a dentist would use? Mount it in ONE place, in the plan/treatment area
     where it belongs, and remove its debt entry from panelsAreMounted.test.ts so the guard now REQUIRES
     it to stay mounted. A mount that is not guarded will silently rot again.
  B. DELETE IT. Right if it duplicates a panel that already ships, or reads state nothing populates.
     Then delete the component AND every importer AND the debt entry, in ONE commit — this repo has
     already shipped a dangling dynamic import of a deleted module to HEAD, invisible to typecheck.
     After committing, run 'git grep -n ComparativePlannerDashboard HEAD -- apps/' and paste the output;
     it must be empty of code references. Also decide what happens to OdontogramModule's push: a producer
     feeding a deleted consumer is dead code too, and leaving it is half a job.
  C. WRITTEN DEBT. Only legitimate if mounting requires a decision that is genuinely not yours — a
     product decision about where it belongs, or backend surface that does not exist. Then the debt entry
     must name the SPECIFIC missing thing, not «not wired yet». A debt with a reason is fine; a debt
     with a shrug is what left it here.

Prefer A or B. This item has been deferred through several cycles already, and «declared debt» is how it
survived that long. Read the component in full before you decide — do not decide from the file name.
Whichever you pick, panelsAreMounted.test.ts must end up ENFORCING your decision, and you must show the
single-file test run passing.`,
  },
]

const BUILD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['packet', 'summary', 'filesChanged', 'commitHash', 'inventory', 'proven', 'foundNotFixed', 'leadMustRun'],
  properties: {
    packet: { type: 'string' },
    summary: { type: 'string', description: 'What the defect was and what you changed, 2-4 sentences, Russian or English.' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    commitHash: { type: 'string', description: 'Short hash, or empty string if you did not commit.' },
    inventory: { type: 'array', items: { type: 'string' }, description: 'Every site you inspected, with file:line and verdict.' },
    proven: { type: 'array', items: { type: 'string' }, description: 'Commands you actually ran, each with its TRUE exit code taken without a pipe.' },
    foundNotFixed: { type: 'array', items: { type: 'string' }, description: 'Defects you saw and deliberately left. Empty array is a claim that there are none.' },
    leadMustRun: { type: 'array', items: { type: 'string' }, description: 'Shared gates only the lead may run.' },
  },
}

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['packet', 'verdict', 'reproduced', 'defectsFound', 'testWouldFailOnRevert', 'attributionClean', 'reasoning', 'requiredRework'],
  properties: {
    packet: { type: 'string' },
    verdict: { type: 'string', enum: ['SOUND', 'SOUND_WITH_NITS', 'NEEDS_REWORK', 'REVERT'] },
    reproduced: { type: 'string', description: 'Which of the builder\'s claims you reproduced yourself, and which you could not.' },
    defectsFound: { type: 'array', items: { type: 'string' }, description: 'New defects in the committed code, with file:line.' },
    testWouldFailOnRevert: { type: 'string', description: 'Name the assertion that breaks if the fix is reverted, or say no test was added.' },
    attributionClean: { type: 'string', description: 'Output of git log -1 --format=%(trailers) <hash>. Must be empty.' },
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
    'FORBIDDEN: every other file; all shared gates; any money comparison.\n' +
    'YOUR SIGNAL: ' + p.gate + '\n' +
    'PACKET DIR (create it first, one line in state.md): ' + p.dir + '\n' +
    '═══════════════════════════════════════════════════════════════\n' + p.brief +
    '\n\nCOMMIT AS SOON AS IT COMPILES, then add or extend the test in a second commit if you have room.\n',
    { label: p.label, phase: 'Build', schema: BUILD_SCHEMA }
  )
}

function reviewStage(built, p) {
  if (!built) {
    return { packet: p.id, verdict: 'NEEDS_REWORK', reproduced: 'nothing — builder died', defectsFound: [], testWouldFailOnRevert: 'unknown', attributionClean: 'unknown', reasoning: 'Builder returned no result. Read ' + p.dir + '/state.md and git log — the work may already be committed; a dead agent is not an idle one.', requiredRework: ['Re-measure ' + p.id + ' on HEAD before re-dispatching'] }
  }
  if (!built.commitHash) {
    return { packet: p.id, verdict: 'NEEDS_REWORK', reproduced: 'n/a — no commit', defectsFound: [], testWouldFailOnRevert: 'n/a', attributionClean: 'n/a', reasoning: built.summary || 'No commit hash returned.', requiredRework: built.foundNotFixed || [] }
  }
  return agent(
    'You are an ADVERSARIAL REVIEWER on the DENTE dental CRM (C:\\Clinic_MVP\\dental-crm), reporting to lead\n' +
    '[ARCHON]. You did NOT write this code and you are not here to approve it.\n\n' +
    'READ-ONLY. No edits, no git add/commit/push. **NEVER run "git remote -v"** — the remote URLs contain\n' +
    'live plaintext access tokens. Do NOT run npm typecheck/build/test: five other agents are mid-edit and\n' +
    'you would be reading a half-written tree and reporting its damage as this packet\'s. You MAY run\n' +
    '"node --import tsx --test <one file>", read-only rg/fd, git show/log/grep, and read-only "node -e".\n' +
    '**"grep -r" and "find /" are BANNED on this machine** — their processes outlive the shell and grind for\n' +
    'hours; use rg/fd with a scoped path.\n\n' +
    '**WRITE YOUR FINDINGS TO ' + p.dir + '/review.md AS YOU GO, not at the end.** Reviewers die on credit\n' +
    'exhaustion here constantly and an unwritten finding is a finding that never existed. The file MUST\n' +
    'contain a literal line of the form:\n' +
    '    ## VERDICT: SOUND | SOUND_WITH_NITS | NEEDS_REWORK | REVERT\n' +
    'Exactly one such line, with one verdict on it. In the last cycle no reviewer wrote that line and the\n' +
    'lead could not read a single verdict off disk — the whole review pass was wasted.\n\n' +
    'PACKET: ' + p.id + '\nCOMMIT: ' + built.commitHash + '\nFILES: ' + JSON.stringify(built.filesChanged) + '\n' +
    'BUILDER\'S CLAIMED INVENTORY: ' + JSON.stringify(built.inventory || []) + '\n' +
    'BUILDER\'S CLAIMED PROOF: ' + JSON.stringify(built.proven || []) + '\n' +
    'BUILDER SAYS IT LEFT UNFIXED: ' + JSON.stringify(built.foundNotFixed || []) + '\n\n' +
    'THE ORIGINAL BRIEF, so you can judge whether it solved the stated problem or a nearby easier one:\n' +
    '---8<---\n' + p.brief + '\n---8<---\n\n' +
    'CHECK SIX THINGS, EACH BY RUNNING OR READING SOMETHING — never by agreeing:\n' +
    '1. **Does the defect actually still reproduce?** Re-derive it yourself at HEAD with your own search or\n' +
    '   your own single-file test run. If the defect was already gone before this commit, the packet was\n' +
    '   stale and the "fix" is noise — say so; the lead has shipped twelve stale briefs and wants the\n' +
    '   thirteenth caught, not accommodated.\n' +
    '2. **Did it fix the stated defect, or a cheaper neighbour?** Quote the diff line that does the work.\n' +
    '   "Renamed things and added a comment" is NEEDS_REWORK.\n' +
    '3. **Did it miss a site?** Re-derive the site list with YOUR OWN scoped rg. Report YOUR count, not the\n' +
    '   brief\'s and not the builder\'s.\n' +
    '4. **Would its test fail if the fix were reverted?** Name the exact assertion. If you can, prove it:\n' +
    '   "git stash" is BANNED, so instead read the assertion against the pre-fix code with\n' +
    '   "git show <hash>^:<path>" and reason precisely. A test that passes either way is ceremony, and this\n' +
    '   repo has already shipped several — that finding alone justifies NEEDS_REWORK.\n' +
    '5. **Tenancy.** If the change touches a query, does organizationId appear in the WHERE clause? A query\n' +
    '   filtered only by row id lets one clinic read or destroy another clinic\'s data. Also: does any test\n' +
    '   it added depend on rows already sitting in the shared database rather than seeding its own? That is\n' +
    '   the exact class of defect packet LL3 exists to remove — do not let a new one in behind it.\n' +
    '6. **Attribution.** Run "git log -1 --format=%(trailers) ' + built.commitHash + '" and paste the real\n' +
    '   output. It MUST be empty. Then grep the commit BODY for «Co-Authored-By» and «anthropic» — note\n' +
    '   that a body which merely quotes the ban is fine; only TRAILERS are violations, and a false positive\n' +
    '   here has already cost the lead a cycle.\n\n' +
    'Also sweep for: mojibake in the diff or subject (this repo has lost 10,554 Cyrillic characters once), a\n' +
    'second money helper beside @dental/shared, an epsilon added to a money comparison, any English string\n' +
    'reaching a user, and a comment that now describes a state which no longer exists.\n\n' +
    'Reserve REVERT for a changed money comparison, an introduced tolerance, or a widened access check.\n' +
    'Never award SOUND to a claim you could not reproduce — say "could not reproduce" and drop the verdict.',
    { label: 'attack:' + p.id, phase: 'Attack', schema: REVIEW_SCHEMA }
  )
}

const all = []
log('Cycle 23: ' + PACKETS.map((p) => p.id).join(', '))
const done = await pipeline(PACKETS, buildStage, reviewStage)
for (let i = 0; i < PACKETS.length; i++) all.push({ packet: PACKETS[i].id, dir: PACKETS[i].dir, review: done[i] || null })
log('Cycle 23 complete.')
return { cycle: 23, results: all }
