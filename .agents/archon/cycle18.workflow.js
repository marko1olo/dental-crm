export const meta = {
	name: "archon-cycle-18",
	description:
		"DENTE cycle 18: the last-number fallback prices a service by its room number, an invisible risk tier, contrast against the losing palette, radiology laid out but unpainted",
	phases: [
		{
			title: "Build",
			detail:
				"four reworks; reproduce the reviewer findings before trusting them",
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
		id: "HH1-last-number-wins",
		label: "HH1 «взять последнее число» оценивает услугу номером кабинета",
		dir: ".agents/archon/packets/HH1-last-number-wins",
		files:
			"apps/api/src/pricelist/analyzer.ts and the test files under apps/api/src/pricelist/",
		gate: "node --import tsx --test on all three suites under apps/api/src/pricelist/ (33/33, 6/6, 13/13 today)",
		brief: `
THE FALLBACK STRATEGY «TAKE THE LAST NUMBER» PRICES A SERVICE BY ITS ROOM NUMBER.

**THE LEAD FIXED ONE HALF OF THIS AND MEASURED WHAT REMAINS. Your job is the half that is left.**
Already fixed and committed ('ce04f7385'): when a currency marker IS present, «Седация 5000 руб/120 мин
кабинет 412» now yields 5000 ₽ instead of 412 ₽. The cause was 'hasCurrency' testing the end of the WHOLE
regex match, which in that branch runs past the currency and ends on a swallowed digit.

**WHAT IS STILL BROKEN, measured by the lead at HEAD after that fix:**
    «Седация 5000/120 мин кабинет 412»   ->  price = 412     (should be 5000)
Here there is no currency marker anywhere, so 'explicit: false' is CORRECT. The defect is one level down:
'extractPrice:~561' falls back to '.at(-1)' — take the LAST number on the line. **In a Russian price list
the last number is far more often a room number, a service code, a duration or a quantity than a price.**

**ORDER OF WORK.**
1. **Reproduce it first**, and print price/max/title for each probe. If it does not reproduce, say so
   loudly and stop — the lead has been wrong eleven times tonight.
2. **Then decide what the fallback SHOULD be, and argue it in the commit body.** Candidates worth weighing:
   the LARGEST plausible number; the FIRST number; the number nearest the currency-less price floor; or
   refusing to price the line at all and reporting 'price_not_found'. **Refusing is a legitimate answer**
   and may be the honest one: a line with no currency marker and several numbers is genuinely ambiguous,
   and §10 forbids inventing a value where none is determinable. A clinic that sees «цена не распознана,
   проверьте строку» loses nothing; a clinic that silently sells sedation for 412 ₽ loses money on every
   sale.
3. **Inventory the whole fallback family before changing it.** Which real price-list shapes rely on
   '.at(-1)' today and would break? Grep the existing tests for lines with no currency marker and see what
   they assert. **If any current test depends on the last-number rule, you must satisfy it or argue it is
   itself wrong** — do not silently flip an asserted behaviour.
4. **Two more residues in this same file, from the same reviewer. Take them if you have room, and list
   them in 'foundNotFixed' if you do not:**
   - The unselected price stays verbatim in the title: «Пломба 3500 руб 4000 руб» produces a title
     containing «3500 руб» while 'priceRub' is 4000 — **one record contradicting itself.**
   - «Седация 5000 руб/120 мин кабинет 412» now prices correctly but the title reads «Седация /120 мин
     кабинет 412» — a dangling separator, same class as «Отбеливание 12000-» which this file already fixed
     once.
5. **The AI path carries an untouched twin.** 'analyzer.ts:~1003-1006' still does
   'priceMaxRubFromModel < priceRub ? null : priceMaxRubFromModel' — the exact descending-pair collapse
   that was removed from the deterministic path 460 lines above. Fix it or list it; do not leave it silent.

**DO NOT BREAK WHAT IS GREEN.** All three suites pass today (33/33, 6/6, 13/13) and «Лечение кариеса
1500,50» must still yield 1500.5. Quote TRUE exit codes captured WITHOUT a pipe.

**THIS IS MONEY IN A SIGNED DOCUMENT**, not a parser nicety: the value flows price list → treatment plan →
printed estimate the patient signs.
`,
	},
	{
		id: "HH2-middle-risk-tier",
		label: "HH2 средний уровень риска не показывается никогда, и any это скрыл",
		dir: ".agents/archon/packets/HH2-middle-risk-tier",
		files:
			"apps/web/src/ShiftView.tsx and apps/web/src/tests/operationsPanelsStyling.test.ts or a sibling test",
		gate: "node --import tsx --test on the test you extend",
		brief: `
THE MIDDLE RISK TIER CAN NEVER RENDER, AND AN 'any' IS WHY NOBODY NOTICED.

Carried over from FF2, verdict NEEDS_REWORK — the wording fixes landed and are good, this did not.

1. **'ShiftView.tsx:671/673' compares 'riskLevel === "medium"', but the contract declares
   'z.enum(["low","watch","high"])'.** There is no '"medium"'. The comparison is dead code and the middle
   tier renders as nothing. **Read the server first** to see which value it actually sends, then either
   change the comparison to '"watch"' or widen the enum — and if you widen it, §10 binds you to update
   every side synchronously, which makes changing the comparison almost certainly the right call.
2. **Type 'PatientCockpit' props.** They are 'any', which is precisely why TypeScript could not see that
   'riskLevel' has no '"medium"'. **This is the durable half of the packet** — the comparison is one line,
   the 'any' is the reason the line survived review.
3. **Add the guard.** Extend 'apps/web/src/tests/operationsPanelsStyling.test.ts' (or a sibling) to fail if
   'ShiftView.tsx' contains any of '?? app.status', '?? action.priority', '?? queue.role', «дел: \${»,
   «шт.», or the magic string "1042". A previous packet fixed ten such machine-phrasing sites by hand and
   **without this guard all ten are one careless edit from returning.**

«Смена» is the screen a clinic opens first every morning — its own subtitle is «что делать сейчас». A risk
tier that cannot show is worse than a missing feature: the screen looks complete while withholding the
middle case, which is exactly the case a busy morning needs.
`,
	},
	{
		id: "HH3-contrast-wrong-palette",
		label: "HH3 контраст считан против палитры, проигравшей каскаду",
		dir: ".agents/archon/packets/HH3-contrast-wrong-palette",
		files:
			"apps/web/src/styles/main.css, contrast-fixes.css, dente-redesign.css, and a new or extended stylesheet test",
		gate: "node scripts/check-css-tokens.mjs (exit 0 today — keep it) plus the test you add",
		brief: `
THE LIGHT AND DARK CONTRAST FIGURES DESCRIBE VALUES THE BROWSER NEVER USES.

Carried over from FF3, verdict NEEDS_REWORK. The night-theme work stands; the light and dark numbers do not.

1. **Recompute every light and dark figure against the WINNING palette.** 'main.css' declares
   ':root[data-theme="light"]' and ':root[data-theme="dark"]' at specificity 0,2,0, which BEATS the palette
   the previous packet measured. **Correct the source comments** at 'main.css:757-771', ':11831-11845',
   ':16703-16719' and 'contrast-fixes.css:83-99'. A comment stating a contrast ratio the cascade does not
   produce is worse than no comment, because the next person will trust it.
2. **Resolve a real residual miss:** light '.onboarding-compact-strip span' measures **4.48:1** against the
   AA floor of **4.50**. The packet printed 4.63, which its reviewer could not reproduce. Darken '--muted'
   for that rule so it genuinely clears 4.50, **or state the residual miss plainly** — both are acceptable;
   printing an unreproducible number is not.
3. **Close or explicitly defer** '.chip-reason', '.chip-doctor', '.chip-chair' ('main.css:15831-15845') —
   same undeclared ladder, same file, and they appear in the packet's OWN proof output, so they were seen
   and not judged.
4. **Add the guard, because nothing protects any of this.** One test that walks the stylesheets and fails
   if a '[data-theme="dark"]' rule exists with no matching 'night' arm, or if a selector this work touched
   regains a light literal. **Note the trap another reviewer proved empirically:**
   'check-css-tokens.mjs' scans only 'var()' constructs, so a bare 'background: #fef2f2' **cannot** enter
   its failure buckets. Your test must look for literals directly or it will be exactly as blind.
5. '--teal-glow' carries two different types. Give it one, or use '--line-strong' for the strip border.

**MEASURE THE WAY 'shadow-analyst.css:291-309' DOES** — that comment is this repo's standard: WCAG ratios
per theme, before and after, with the hex values named. It records 1.04 («белым по белому») before and
13.13 after. **Never write «looks fine».** And keep the theme names straight: «Ночь» is
'data-theme="dark"' and «Тепло» is 'data-theme="night"' — inverted in this product at
'workspaceShell.tsx:462', which is exactly how someone styles the wrong theme.
`,
	},
	{
		id: "HH4-imaging-void-paint",
		label: "HH4 «Снимки» разложены, но не покрашены",
		dir: ".agents/archon/packets/HH4-imaging-void-paint",
		files:
			"apps/web/src/ImagingView.tsx and the stylesheets under apps/web/src/styles/. Report if the cause lies outside them.",
		gate: "node scripts/check-css-tokens.mjs; node --import tsx --test on anything you add",
		brief: `
RADIOLOGY IS LAID OUT AND NEVER PAINTED. THE MEASUREMENT THAT PROVES IT ALREADY EXISTS.

An earlier packet did honest work here and reported that it had NOT found the cause. Its reviewer then
produced the decisive evidence with 'pngjs':
- '.dente-redesign-shots/desktop_dark_imaging.png' content region: **9 distinct colours**, and **832 of 834
  rows carry 3 colours or fewer.** Same window in 'desktop_dark_patients.png': **3794 colours, 0 flat rows.**
- **The scrollbar thumbs of the dark and light imaging frames are 684 px each — identical to the pixel**,
  so 'scrollHeight' is identical.

**Read what that implies, because it is the whole packet.** The content is in the DOM and laid out — the
document is exactly as tall as in the light theme. It is simply not painted. Every hypothesis about
mounting, lazy loading, a crashed view or an error boundary is therefore DEAD: each would change the
height. This is a PAINT or COMPOSITING failure.

**THE LEAD'S OWN CANDIDATE, offered as a candidate and not as the cause.** 'backdrop-filter' appears 40
times across seven stylesheets. The closest match to a void is '.sa-analyze-overlay'
('shadow-analyst.css:55-61'): 'inset: 0', 'z-index: 20', 'background: rgba(10, 14, 23, 0.72)',
'blur(4px)'. Over dark content such a layer looks like NOTHING — flat, few colours, height unchanged, which
matches all three measurements. **But it is 'position: absolute', so it is bounded by its positioned
ancestor — the image stage, not the page — and therefore probably cannot explain a void 834 rows tall.**
Verify or discard it; do not inherit it.

**BOTH ANSWERS ARE A FULL SUCCESS, and say which one you reached.**
- If it is the PRODUCT: fix with tokens, no static hex, no px except hairlines, and check all three themes
  — «День», «Ночь» ('data-theme="dark"'), «Тепло» ('data-theme="night"').
- If it is the HEADLESS RENDERER (e.g. 'backdrop-filter' blanking only under '--headless=new
  --disable-gpu'), then a real dentist on a real GPU sees the section correctly, and the defect is that
  **our own visual gate cannot see radiology.** That still matters, but it is fixed in the capture script,
  not in the product. **Do not edit the capture script** — it is the lead's instrument and has twice been
  caught producing false evidence. Describe the smallest change and let the lead make it.

**AND WHATEVER THE CAUSE, THE SILENT VOID IS A SEPARATE §3 DEFECT.** A section that renders with no
heading, no message and no error tells the dentist nothing. The light theme already contains wording you
may reuse verbatim: «Снимков по пациенту нет / Загрузите архивы DICOM/КТ или выберите снимки из системы.»

**You may open the PNG files and look at them.** You may NOT run any screenshot script, and you may NOT
claim UI VERIFIED — that label is the lead's, and the lead re-captures.
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
log("Cycle 18: " + PACKETS.map((p) => p.id).join(", "));
const done = await pipeline(PACKETS, buildStage, reviewStage);
for (let i = 0; i < PACKETS.length; i++)
	all.push({
		packet: PACKETS[i].id,
		dir: PACKETS[i].dir,
		review: done[i] || null,
	});
log("Cycle 18 complete.");
return { cycle: 18, results: all }
