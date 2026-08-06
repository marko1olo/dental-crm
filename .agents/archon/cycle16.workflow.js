export const meta = {
	name: "archon-cycle-16",
	description:
		"DENTE cycle 16: a rejection message that can crash, machine phrasing on the morning screen, an unjudged third theme, and a truncated service name",
	phases: [
		{
			title: "Build",
			detail: "four independent single-file packets, reproduce before fixing",
		},
		{
			title: "Attack",
			detail:
				"a different agent per packet; a touched money comparison is REVERT-grade",
		},
	],
};

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
`;

const PACKETS = [
	{
		id: "FF1-money-formatter-must-not-throw",
		label: "FF1 a rejection message can crash instead of explaining",
		dir: ".agents/archon/packets/FF1-money-formatter-must-not-throw",
		files: "apps/api/src/documents/guards.ts ONLY, plus a test file beside it",
		gate: "node --import tsx --test on your own test file",
		brief: `
A REJECTION MESSAGE CAN THROW INSTEAD OF EXPLAINING, TURNING A POLITE 409 INTO AN UNEXPLAINED 500.

**MEASURED BY THE LEAD against the built shared module:**
    parseKopecks(1500.5)              -> «1500.50»   fine
    parseKopecks(900.1299999999999)   -> «900.13»    fine
    parseKopecks(null) / (undefined)  -> «0.00»      safe
    parseKopecks(NaN)                 -> **THROWS** «Денежное значение не является числом: NaN»
    parseKopecks(Infinity)            -> **THROWS**

'guards.ts' now formats money at eleven sites as 'kopecksToNumericString(parseKopecks(x))', and **every
one of those sites is inside a builder of a REJECTION message.** So a non-finite value does not produce a
wrong number — it throws out of the guard, and the clinic gets no explanation at all instead of «сумма не
совпадает». That is strictly worse than the defect the eleven conversions fixed.

**YOUR JOB.** Add ONE non-throwing formatter beside the existing 'moneyRubEquals' helper in this file —
suggested name 'moneyRubText' — and route all eleven sites through it. It must:
  - delegate to '@dental/shared' for the real work (**no second money implementation**; three second
    owners have already been found in this repo, one of which refused a legitimate receipt);
  - never throw: a non-finite or unparsable value must degrade to something honest for a Russian sentence,
    and **«undefined руб.» is not honest** — decide what is, and justify it in the comment;
  - keep «1500.50» formatting identical for every value that works today.

**DO NOT TOUCH ANY COMPARISON.** The comparisons in this file use integer kopecks with NO epsilon on
purpose: a tolerance that hides float drift also hides a genuine one-kopeck discrepancy, and these are the
gates that release a payment receipt. Changing one is REVERT-grade.

**BONUS THAT IS ALSO THE POINT.** Those eleven lines are now extremely long. Routing them through one
short helper shortens every one of them, which is why this is a real improvement and not ceremony.

**PROVE IT.** A test that feeds NaN and Infinity to the formatter and asserts it does NOT throw, plus one
that asserts 1500.5 still renders «1500.50» and the drifting sum 900.1299999999999 still renders «900.13».
'guards.ts' has no React and no CSS, so it loads in node:test directly.
`,
	},
	{
		id: "FF2-machine-phrasing-on-shift",
		label: "FF2 «дел: 2» and «Импортов: 0» on the busiest screen",
		dir: ".agents/archon/packets/FF2-machine-phrasing-on-shift",
		files:
			"apps/web/src/ShiftView.tsx ONLY. Do NOT edit workspaceShell.tsx — another author has it dirty.",
		gate: "node --import tsx --test on any existing test that loads ShiftView logic, or your own",
		brief: `
THE LEAD READ THIS SCREEN WITH ITS OWN EYES IN '.dente-redesign-shots/desktop_dark_shift.png'.

«Смена» is the screen a clinic opens first every morning — its subtitle is «что делать сейчас». Two strings
on it are written for a machine, not for a person:

1. **«дел: 2»** — a counter label in the corner of «Что сделать сейчас». «дел» is not a word an
   administrator parses at a glance; it is a genitive fragment with a colon bolted on. Russian needs
   agreement: «2 дела», «5 дел», «1 дело». **The correct pluraliser already exists and is now a leaf
   module**: 'countLabel' from 'apps/web/src/lib/russianPlural.js' — 'countLabel(2, "дело", "дела", "дел")'.
   Import it from the LEAF module, not from 'AppHelpers': AppHelpers drags in stylesheets and would make
   any logic test of this file impossible to load (that trap cost a whole packet tonight).
2. **«Импортов: 0. Последних событий аудита: 4.»** — the body of a task card whose title is «Проверить
   аудит и качество данных». «Импортов: 0» tells the user nothing and implies no action: zero imports is
   the normal state of a clinic that has never imported anything. Rewrite so the card says what the person
   should DO and why it matters, or say plainly in your report that this card should not appear at all
   when there is nothing to check — **an honest recommendation to delete a card is a valid outcome** (§4:
   nothing superfluous).

**SWEEP THE WHOLE FILE, DO NOT STOP AT THESE TWO.** The lead found these two in one screenshot of one
scroll position; there are almost certainly more. Report an inventory of every user-visible string in this
file that is machine phrasing, a bare count without agreement, or a label that names a database concept
instead of a clinic concept — with a verdict per item: REWRITTEN / ALREADY FINE / RECOMMEND DELETING.

**THE STANDARD (§3).** «чтобы совковая бабка разобралась». Human language, no jargon, and every number
agreeing with its noun. This campaign has already shipped «Статус не загружены» and «undefined не
загружены» to a dentist's screen from exactly this class of carelessness, so it is not a small matter.

**CONSTRAINTS.** Tokens only if you touch styling — no static hex, no px except hairlines. Russian text,
UTF-8, no mojibake. Do not invent a field or a count that does not exist: if a card needs data the product
does not have, say so as debt with a reason (§10). **You may not claim UI VERIFIED** — that label is the
lead's and the lead re-captures.
`,
	},
	{
		id: "FF3-third-theme-never-judged",
		label: "FF3 the third theme has a coverage gap and an inverted name",
		dir: ".agents/archon/packets/FF3-third-theme-never-judged",
		files:
			"apps/web/src/styles/dente-redesign.css and the other stylesheets under apps/web/src/styles/. Do NOT edit workspaceShell.tsx (dirty, another author) — report the naming problem instead of renaming.",
		gate: "node scripts/check-css-tokens.mjs (exits 0 today — keep it that way)",
		brief: `
THERE ARE THREE THEMES, THE THIRD HAS NEVER BEEN JUDGED, AND THE NAMES ARE INVERTED.

**MEASURED BY THE LEAD, and the inversion is the part that will bite you if you skip it:**
- 'workspaceShell.tsx:462' declares '{ mode: "night", label: "Тепло", hint: "Тёмная тема в тёплых
  коричневых тонах — мягче для глаз вечером" }'.
- 'shadow-analyst.css:298' states «Ночь» is 'data-theme="dark"'.

So the mapping is: **«День» = light, «Ночь» = 'data-theme="dark"', «Тепло» = 'data-theme="night"'.** The
theme whose internal name is 'night' is the one the user sees as «Тепло». A developer reading
'[data-theme="night"]' will reasonably believe they are styling «Ночь» and will style the WRONG theme.
That 'shadow-analyst.css' comment has to spell the mapping out twice to be understood — that is the cost,
already being paid, in prose.

**THE COVERAGE GAP, count it yourself before trusting the lead:** in 'dente-redesign.css' the lead counted
rule blocks per theme scope — light 4, **dark 23, night 19**. If 'night' («Тепло») genuinely has four
fewer blocks than 'dark' («Ночь»), then four things are styled for one dark theme and not the other, and
«Тепло» has never been captured or looked at by anyone.

**YOUR JOB.**
1. **Produce the real per-theme inventory** across ALL stylesheets, not just 'dente-redesign.css': every
   selector styled under 'dark' but NOT under 'night', and vice versa. That inventory is the deliverable.
   Say how you counted; a regex over theme scopes is fine here but state its blind spot (nested media
   queries, comments).
2. **For each gap, decide and act**: does «Тепло» inherit an acceptable value, or does it render something
   unreadable or invisible? **Check contrast, not just presence** — a token that exists but resolves to a
   near-background colour is worse than a missing one, because it looks intentional.
3. **Fix the gaps with TOKENS.** The palette is at 'dente-redesign.css:11-161'. No static hex, no px
   except hairlines. Keep 'node scripts/check-css-tokens.mjs' at exit 0 and quote it.
4. **Report the naming inversion as a recommendation, do not rename.** 'workspaceShell.tsx' is dirty with
   another author's work, and renaming a theme value touches CSS, the store and localStorage-persisted
   state at once — that is its own packet with a migration for users who already chose a theme. Write what
   the rename would have to cover so the lead can order it properly.

**PRECEDENT WORTH READING FIRST.** 'shadow-analyst.css:291-309' shows exactly the standard expected here:
someone found near-white literal backgrounds under 'var(--text-primary)' light text, measured WCAG
contrast per theme — **1.04 in «Ночь» and 1.11 in «Тепло», i.e. white on white, so «зуб 36, глубокий
кариес» after an X-ray analysis was literally unreadable** — moved them to '--bad-bg'/'--ok-bg', and
recorded the after-numbers (13.13 / 12.15 / 11.59 / 11.38). **Measure like that.** Contrast ratios, per
theme, before and after. Do not report «looks fine».

**You may not claim UI VERIFIED and may not run a screenshot script** — the capture pipeline is the
lead's, and the lead has already caught it producing false evidence twice.
`,
	},
	{
		id: "FF4-mangled-title-on-price-range",
		label: "FF4 a price range leaves a truncated service name in the catalogue",
		dir: ".agents/archon/packets/FF4-mangled-title-on-price-range",
		files:
			"apps/api/src/pricelist/analyzer.ts and the test files under apps/api/src/pricelist/",
		gate: "node --import tsx --test apps/api/src/pricelist/analyzer.test.ts and .../pricelistKopecks.test.ts (both pass today)",
		brief: `
A PRICE RANGE LEAVES A TRUNCATED SERVICE NAME IN FRONT OF THE DOCTOR.

**REPORTED BY AN ADVERSARIAL REVIEWER, and it is your first job to reproduce it, not to trust it.** The
claim: input line «Отбеливание 12000-18000 руб» yields the service title «Отбеливание 12000-» — a dangling
range. Cause given: the second replace matches the upper bound «18000 руб» because the lookahead passes at
end-of-string, while the lower bound «12000» and the «-» carry no currency marker, so the first replace
(which requires a thousands separator) never fires on them. The PRICES were said to be correct
('priceRub' 12000, 'priceMaxRub' 18000) — only the NAME is mangled.

**The lead re-measured the surroundings and confirms the ground, not the defect:** 'extractPrice' at
':397' does return '{ priceRub, priceMaxRub }' and ':412-416' parses a second number as the upper bound
only when it is greater than the first. So ranges ARE a supported shape. And 'analyzer.test.ts' contains
**ZERO** occurrences of «12000-18000» or «Отбеливание» — so whatever the truth is, **this case is
untested**, which is why it could rot unnoticed.

**ORDER OF WORK.**
1. **Reproduce first.** Feed «Отбеливание 12000-18000 руб» through the real deterministic parser and print
   the resulting title and both prices. If the title is clean, **say so loudly and stop** — reporting a
   reviewer's finding as unreproducible is a full success, and the lead has been wrong nine times tonight.
2. **If it reproduces, inventory the whole class before fixing.** A range can be written «12000-18000 руб»,
   «12 000 – 18 000 руб.», «от 12000 до 18000», «12000/18000». Test the forms a Russian price list
   actually uses and report which survive title-stripping and which do not. Fixing the one form in the
   brief and leaving three is the half-closed chain this campaign keeps rejecting.
3. **Fix it, then ADD THE RANGE TEST that the previous packet did not.** That test is the durable part of
   this work: it is why the defect could exist at all.
4. **Do not break what is already right.** The deterministic parser was made kopeck-exact in a previous
   packet — «Лечение кариеса 1500,50» must still yield 1500.5, not 1500. Run both existing test files and
   quote their TRUE exit codes, captured WITHOUT a pipe.

**A NAME IS NOT COSMETIC HERE.** That title goes into the clinic's price list, and from there into a
treatment plan and a printed document the patient signs. «Отбеливание 12000-» in a signed estimate is a
document defect, not a typo.
`,
	},
];

const BUILD_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: [
		"packet",
		"status",
		"commitHash",
		"filesChanged",
		"inventory",
		"proven",
		"notProven",
		"leadMustRun",
		"foundNotFixed",
		"summary",
	],
	properties: {
		packet: { type: "string" },
		status: { enum: ["COMMITTED", "PARTIAL", "BLOCKED", "NO_CHANGE"] },
		commitHash: { type: "string" },
		filesChanged: { type: "array", items: { type: "string" } },
		inventory: {
			type: "array",
			items: { type: "string" },
			description:
				"All 11 sites: file:line + CONVERTED / ALREADY CORRECT / NOT MONEY.",
		},
		proven: {
			type: "array",
			items: { type: "string" },
			description:
				"Commands actually run, with TRUE exit codes captured without a pipe.",
		},
		notProven: { type: "array", items: { type: "string" } },
		leadMustRun: { type: "array", items: { type: "string" } },
		foundNotFixed: { type: "array", items: { type: "string" } },
		summary: { type: "string" },
	},
};

const REVIEW_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: [
		"packet",
		"verdict",
		"sitesMissed",
		"comparisonsTouched",
		"testWouldFailOnRevert",
		"attributionClean",
		"reasoning",
		"requiredRework",
	],
	properties: {
		packet: { type: "string" },
		verdict: { enum: ["SOUND", "SOUND_WITH_NITS", "NEEDS_REWORK", "REVERT"] },
		sitesMissed: {
			type: "array",
			items: { type: "string" },
			description:
				"Money-in-text sites still raw at HEAD, re-derived by YOUR OWN grep.",
		},
		comparisonsTouched: {
			type: "string",
			description:
				"Did the diff alter any money COMPARISON? Quote the diff if so — that is REVERT-grade.",
		},
		testWouldFailOnRevert: { type: "string" },
		attributionClean: {
			type: "string",
			description:
				"Output of git log -1 --format=%(trailers) for the commit. Must be empty.",
		},
		reasoning: { type: "string" },
		requiredRework: { type: "array", items: { type: "string" } },
	},
};

function buildStage(p) {
	return agent(
		LAW +
			"\n═══════════════════════════════════════════════════════════════\n" +
			"YOUR PACKET: " +
			p.id +
			"\n" +
			"OWNED SCOPE: " +
			p.files +
			"\n" +
			"FORBIDDEN: every other file; all shared gates; any money COMPARISON in your own file.\n" +
			"YOUR SIGNAL: " +
			p.gate +
			"\n" +
			"PACKET DIR (create first, one line in state.md): " +
			p.dir +
			"\n" +
			"═══════════════════════════════════════════════════════════════\n" +
			p.brief +
			"\nCOMMIT AS SOON AS IT COMPILES, then add the test in a second commit if you have room.\n",
		{ label: p.label, phase: "Build", schema: BUILD_SCHEMA },
	);
}

function reviewStage(built, p) {
	if (!built) {
		return {
			packet: p.id,
			verdict: "NEEDS_REWORK",
			sitesMissed: [],
			comparisonsTouched: "unknown",
			testWouldFailOnRevert: "unknown",
			attributionClean: "unknown",
			reasoning:
				"Builder died. Read " +
				p.dir +
				"/state.md — work may already be committed.",
			requiredRework: ["Resume " + p.id],
		};
	}
	if (!built.commitHash) {
		return {
			packet: p.id,
			verdict: "SOUND_WITH_NITS",
			sitesMissed: [],
			comparisonsTouched: "n/a",
			testWouldFailOnRevert: "n/a",
			attributionClean: "n/a",
			reasoning: built.summary || "No commit.",
			requiredRework: built.foundNotFixed || [],
		};
	}
	return agent(
		"You are an ADVERSARIAL REVIEWER on the DENTE dental CRM (C:\\Clinic_MVP\\dental-crm) reporting to lead\n" +
			"[ARCHON]. You did NOT write this code. READ-ONLY: no edits, no git add/commit/push, never\n" +
			"'git remote -v' (live tokens). Do NOT run npm typecheck/build/test — other agents are mid-edit and you\n" +
			'would read a half-written tree. You MAY run "node --import tsx --test <one file>", read-only rg/grep,\n' +
			"git show/grep, and read-only node -e. Write findings to " +
			p.dir +
			"/review.md AS YOU GO — reviewers\n" +
			"die on credits here constantly and an unwritten finding is lost.\n\n" +
			"COMMIT: " +
			built.commitHash +
			"\nFILES: " +
			JSON.stringify(built.filesChanged) +
			"\n" +
			"CLAIMED INVENTORY: " +
			JSON.stringify(built.inventory || []) +
			"\n" +
			"CLAIMED PROVEN: " +
			JSON.stringify(built.proven || []) +
			"\n\n" +
			"CHECK EXACTLY FIVE THINGS, each by running something:\n" +
			"1. **Did it miss a site?** Re-derive with YOUR OWN grep over guards.ts at HEAD — count interpolations\n" +
			"   of a money value into text that are still raw. The lead measured 11 raw and 4 already correct at\n" +
			"   dispatch; report YOUR numbers, not the brief's.\n" +
			"2. **Did it touch a money COMPARISON?** That is REVERT-grade. The comparisons use integer kopecks with\n" +
			"   NO epsilon on purpose: a tolerance that hides float drift also hides a genuine one-kopeck\n" +
			"   discrepancy, and these gates release payment receipts. Quote the diff if any comparison changed.\n" +
			"3. **Did it convert something that is NOT money?** «${index + 1}» is a line number. A count of rows is\n" +
			"   a count. Converting either is a defect.\n" +
			"4. **Would its test fail if the fix were reverted?** Name the assertion that breaks. A test that\n" +
			"   passes either way is ceremony. If it added no test, say so plainly.\n" +
			'5. **Attribution:** run "git log -1 --format=%(trailers) ' +
			built.commitHash +
			'" and report the\n' +
			"   output. It MUST be empty. Also grep the body for «Co-Authored-By» and «anthropic».\n\n" +
			"Also sweep for: «руб. ₽» (would mean formatKopecksRu was used where a decimal string belongs), a\n" +
			"second money helper beside @dental/shared, mojibake in the diff or subject, and any English string\n" +
			"reaching a user. Reserve REVERT for a changed comparison or a tolerance introduced. Never award SOUND\n" +
			"to a claim you could not reproduce.",
		{ label: "attack:" + p.id, phase: "Attack", schema: REVIEW_SCHEMA },
	);
}

const all = [];
log("Cycle 16: " + PACKETS.map((p) => p.id).join(", "));
const done = await pipeline(PACKETS, buildStage, reviewStage);
for (let i = 0; i < PACKETS.length; i++)
	all.push({
		packet: PACKETS[i].id,
		dir: PACKETS[i].dir,
		review: done[i] || null,
	});
log("Cycle 16 complete.");
return { cycle: 16, results: all }
