#!/usr/bin/env node

/**
 * quality-ratchet.mjs — zero-trust monotonic quality ratchet for DENTE Dental CRM.
 *
 * What changed and why (read this before "improving" the numbers):
 *   v1 counted four regex hits and printed "IDEAL: 0". Real counts at the time of the
 *   rewrite, measured on the AST: 24 explicit any, 1524 non-null assertions, 581 empty
 *   catch blocks, 480 silent catches, 464 swallowed promises, 124 `as unknown as`,
 *   44 places where production code detects the test runner, and, in the tests,
 *   128 tests asserting how many lines a source file has, 681 tests that grep source
 *   text instead of running it, 156 tests whose assertions cannot fail. A ratchet that
 *   cannot see a defect class rewards moving debt into that class (Goodhart).
 *
 * Rules (see scripts/lib/code-health-ast.mjs for the exact detectors):
 *   production  — any, casts that launder types, non-null `!`, suppressions, empty and
 *                 silent catches, swallowed promises, console noise, test-runner sniffing,
 *                 production importing test code, float money maths in the UI, uppercase UI.
 *   tests       — no assertion, weak-only assertions, tautologies, skipped/.only,
 *                 source-line-count assertions, source-text grepping, swallowed assertions.
 *
 * Anti-gaming integrity checks (run on every verification):
 *   1. A limit in the working-tree baseline may never be higher than the one in git HEAD.
 *   2. The number of production files, test files and individual tests may not fall below
 *      the recorded floor. Removing tests is allowed only through an explicit, logged act:
 *        --accept-test-removal=<newFloor> --reason "<at least 25 chars>"
 *      which appends to scripts/config/ratchet-ledger.jsonl (visible in review).
 *   3. skipped tests and committed `.only` are hard zero: they cannot be baselined.
 *
 * Usage:
 *   node scripts/quality-ratchet.mjs                 verify, and tighten the baseline on improvement
 *   node scripts/quality-ratchet.mjs --no-tighten    verify only
 *   node scripts/quality-ratchet.mjs --json          machine readable
 *   node scripts/quality-ratchet.mjs --list <rule> [--limit=40]   show findings of one rule
 *   node scripts/quality-ratchet.mjs --accept-test-removal=N --reason "..."
 *
 * Exit code: 0 clean, 1 regression or integrity violation.
 */

import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	PRODUCTION_RULES,
	TEST_RULES,
	collectFiles,
	isTestFile,
	parseSource,
	readText,
	scanProductionSource,
	scanTestSource,
} from "./lib/code-health-ast.mjs";
import { printFailureManifesto } from "./manifests/failure-manifestos.mjs";

export { collectFiles, isTestFile };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const DEFAULT_REPO_ROOT = resolve(__dirname, "..");
export const DEFAULT_BASELINE_PATH = join(__dirname, "config", "sanitary-baseline.json");
export const DEFAULT_LEDGER_PATH = join(__dirname, "config", "ratchet-ledger.jsonl");

export const UPPERCASE_RULE = "uppercase-button";
export const DEBT_RULES = [...PRODUCTION_RULES, UPPERCASE_RULE, ...TEST_RULES];
/** Can never be baselined above zero. */
export const HARD_ZERO_RULES = ["test-skipped", "test-only-left"];
export const FLOOR_KEYS = ["prodFiles", "testFiles", "tests"];

const SCAN_ROOTS = ["packages/shared/src", "apps/api/src", "apps/web/src"];
const CONSOLE_ALLOWED_FILE = /(?:clientLogger|\/logger)\.[cm]?[jt]sx?$/;
const FLOAT_MONEY_ALLOWED_FILE = /(?:money|kopecks)[^/]*\.[cm]?[jt]sx?$/i;

/* ----------------------------------------------------------- uppercase UI */

/**
 * Uppercase on buttons, chips and tabs (CSS rules and TSX class lists).
 * Kept from v1: this one is about presentation, so it stays text based.
 */
export function scanUppercaseButtons(webCodeFiles, webCssFiles, repoRoot = DEFAULT_REPO_ROOT) {
	const matches = [];
	const selectorRe =
		/(?:^|[^\w-])(?:button|\[role=["']button["']|\[role=["']tab["']|\.(?:dente-btn|primary-button|secondary-button|cw-btn|tab|chip|pill|btn|button)(?:-[a-z0-9_-]+)?|[a-z0-9_-]+-(?:pill|chip|tab|btn|button)(?:-[a-z0-9_-]+)?)(?:[^\w-]|$)/i;

	for (const file of webCssFiles) {
		const relPath = relative(repoRoot, file).replace(/\\/g, "/");
		const content = readFileSync(file, "utf8");
		const clean = content.replace(/\/\*[\s\S]*?\*\//g, "");
		const ruleRe = /([^{}]+)\{([^}]+)\}/g;
		let m = ruleRe.exec(clean);
		while (m !== null) {
			const selector = m[1].trim();
			if (/text-transform\s*:\s*uppercase/i.test(m[2])) {
				const cleanSel = selector.replace(/\b(?:table|tbody|thead|tfoot|th|td)\b/gi, "");
				if (selectorRe.test(cleanSel)) {
					matches.push({
						rule: UPPERCASE_RULE,
						file: relPath,
						line: content.slice(0, m.index).split("\n").length,
						text: `${selector.replace(/\s+/g, " ")} { text-transform: uppercase; }`,
					});
				}
			}
			m = ruleRe.exec(clean);
		}
	}

	// Scan JSX/TSX opening tags (handles multi-line buttons and multiple buttons per line)
	const jsxBtnTagRe = /<(?:button|Button|Tab|TabsTrigger|Chip)\b[^>]*>|<\w+(?=[^>]*\b(?:role\s*=\s*["'](?:button|tab)["']|\b(?:dente-btn|cw-btn|primary-button|secondary-button)\b))[^>]*>/g;
	for (const file of webCodeFiles) {
		if (!file.endsWith(".tsx") && !file.endsWith(".jsx")) continue;
		const relPath = relative(repoRoot, file).replace(/\\/g, "/");
		const content = readFileSync(file, "utf8");
		let m = jsxBtnTagRe.exec(content);
		while (m !== null) {
			const tag = m[0];
			if (/\buppercase\b/.test(tag)) {
				const line = content.slice(0, m.index).split("\n").length;
				matches.push({ rule: UPPERCASE_RULE, file: relPath, line, text: tag.replace(/\s+/g, " ").slice(0, 120) });
			}
			m = jsxBtnTagRe.exec(content);
		}
	}
	return matches;
}

/* ----------------------------------------------------------------- scan */

/**
 * Scan the monorepo. Returns counts per rule, every finding, and the file/test totals
 * that feed the anti-evasion floors.
 */
export function countMetrics(options = {}) {
	const repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT;
	const roots = (options.scanRoots ?? SCAN_ROOTS).map((r) => join(repoRoot, r));

	const findings = Object.fromEntries(DEBT_RULES.map((r) => [r, []]));
	const totals = { prodFiles: 0, testFiles: 0, tests: 0 };
	const webCode = [];
	const failedToParse = [];

	for (const root of roots) {
		for (const file of collectFiles(root)) {
			const rel = relative(repoRoot, file).replace(/\\/g, "/");
			let text;
			try {
				text = readText(file);
			} catch (error) {
				failedToParse.push({ file: rel, error: String(error) });
				continue;
			}
			if (isTestFile(rel)) {
				totals.testFiles++;
				const result = scanTestSource(text, rel);
				totals.tests += result.tests;
				for (const f of result.findings) findings[f.rule]?.push({ ...f, file: rel });
			} else {
				totals.prodFiles++;
				const isWeb = rel.startsWith("apps/web/src/");
				if (isWeb) webCode.push(file);
				const result = scanProductionSource(text, rel, {
					isWeb,
					allowConsole: CONSOLE_ALLOWED_FILE.test(rel),
					allowFloatMoney: FLOAT_MONEY_ALLOWED_FILE.test(rel),
				});
				for (const f of result) findings[f.rule]?.push({ ...f, file: rel });
			}
		}
	}

	const webCss = collectFiles(join(repoRoot, "apps", "web", "src"), [".css"]);
	findings[UPPERCASE_RULE] = scanUppercaseButtons(webCode, webCss, repoRoot);

	const counts = Object.fromEntries(DEBT_RULES.map((r) => [r, findings[r].length]));
	return { counts, findings, totals, failedToParse };
}

/* ------------------------------------------------------------- baseline */

export function getBaseline(baselinePath = DEFAULT_BASELINE_PATH) {
	if (!existsSync(baselinePath)) throw new Error(`Ratchet baseline not found: ${baselinePath}`);
	const parsed = JSON.parse(readFileSync(baselinePath, "utf8"));
	if (parsed.version !== 2 || typeof parsed.limits !== "object" || typeof parsed.floors !== "object") {
		throw new Error(`Ratchet baseline ${baselinePath} is not version 2 (limits + floors).`);
	}
	return parsed;
}

/** Writes the baseline. Debt limits may only go down, floors may only go up, here. */
export function saveBaseline(baselinePath, next) {
	if (existsSync(baselinePath)) {
		const existing = JSON.parse(readFileSync(baselinePath, "utf8"));
		for (const [rule, value] of Object.entries(next.limits ?? {})) {
			const old = existing.limits?.[rule];
			if (typeof old === "number" && value > old) {
				throw new Error(`[quality-ratchet] limit of "${rule}" may not rise: ${old} -> ${value}. The ratchet only turns one way.`);
			}
		}
		for (const [key, value] of Object.entries(next.floors ?? {})) {
			const old = existing.floors?.[key];
			if (typeof old === "number" && value < old) {
				throw new Error(`[quality-ratchet] floor "${key}" may not fall through saveBaseline: ${old} -> ${value}. Use --accept-test-removal.`);
			}
		}
	}
	const dir = dirname(baselinePath);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

/* ----------------------------------------------------------- evaluation */

/**
 * Pure comparison. Never touches the disk or git.
 * @returns {{ ok: boolean, regressions: object[], improvements: object[], floorBreaches: object[] }}
 */
export function evaluateRatchet(counts, totals, baseline) {
	const regressions = [];
	const improvements = [];
	const floorBreaches = [];

	for (const rule of DEBT_RULES) {
		const current = counts[rule] ?? 0;
		const hard = HARD_ZERO_RULES.includes(rule);
		const limit = hard ? 0 : baseline.limits[rule];
		if (limit === undefined) {
			// A rule the baseline has never heard of is not "free": it starts at its present count
			// only through --tighten on a clean tree, never silently as unlimited.
			regressions.push({ rule, current, limit: 0, delta: current, reason: "rule missing from baseline" });
			continue;
		}
		if (current > limit) regressions.push({ rule, current, limit, delta: current - limit });
		else if (current < limit) improvements.push({ rule, current, limit, delta: current - limit });
	}

	for (const key of FLOOR_KEYS) {
		const floor = baseline.floors[key];
		const current = totals[key] ?? 0;
		if (typeof floor === "number" && current < floor) floorBreaches.push({ key, current, floor, delta: current - floor });
	}

	return { ok: regressions.length === 0 && floorBreaches.length === 0, regressions, improvements, floorBreaches };
}

/* ------------------------------------------------------------ integrity */

function gitShow(repoRoot, relPath) {
	try {
		return execFileSync("git", ["show", `HEAD:${relPath}`], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
	} catch {
		return null;
	}
}

function countLedgerLines(text) {
	return text ? text.split("\n").filter((l) => l.trim().length > 0).length : 0;
}

/**
 * Compares the working-tree baseline with the committed one. Pure given its inputs.
 * @param {object} working  baseline in the working tree
 * @param {object|null} committed  baseline at git HEAD (null = unavailable)
 * @param {{ workingLedger: string|null, committedLedger: string|null }} ledgers
 */
export function checkBaselineIntegrity(working, committed, ledgers = { workingLedger: null, committedLedger: null }) {
	const violations = [];
	if (!committed) return { violations, skipped: true };

	for (const [rule, value] of Object.entries(working.limits ?? {})) {
		const old = committed.limits?.[rule];
		if (typeof old === "number" && value > old) {
			violations.push(`limit "${rule}" raised in the working tree: ${old} (HEAD) -> ${value}. Limits only go down.`);
		}
	}
	const loweredFloors = [];
	for (const [key, value] of Object.entries(working.floors ?? {})) {
		const old = committed.floors?.[key];
		if (typeof old === "number" && value < old) loweredFloors.push(`${key}: ${old} -> ${value}`);
	}
	if (loweredFloors.length > 0) {
		const added = countLedgerLines(ledgers.workingLedger) - countLedgerLines(ledgers.committedLedger);
		if (added < 1) {
			violations.push(`floor lowered without a ledger entry (${loweredFloors.join(", ")}). Use --accept-test-removal with --reason.`);
		}
	}
	return { violations, skipped: false };
}

function loadLedger(path) {
	return existsSync(path) ? readFileSync(path, "utf8") : null;
}

export function checkIntegrity(options = {}) {
	const repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT;
	const baselinePath = options.baselinePath ?? DEFAULT_BASELINE_PATH;
	const ledgerPath = options.ledgerPath ?? DEFAULT_LEDGER_PATH;
	const working = getBaseline(baselinePath);
	const committedText = gitShow(repoRoot, relative(repoRoot, baselinePath).replace(/\\/g, "/"));
	let committed = null;
	if (committedText) {
		try {
			const parsed = JSON.parse(committedText);
			committed = parsed.version === 2 ? parsed : null;
		} catch {
			committed = null;
		}
	}
	return checkBaselineIntegrity(working, committed, {
		workingLedger: loadLedger(ledgerPath),
		committedLedger: gitShow(repoRoot, relative(repoRoot, ledgerPath).replace(/\\/g, "/")),
	});
}

/* ------------------------------------------------------------- baseline io */

export function buildBaselineFrom(counts, totals, previous = null) {
	const limits = {};
	for (const rule of DEBT_RULES) {
		const now = HARD_ZERO_RULES.includes(rule) ? 0 : counts[rule];
		const old = previous?.limits?.[rule];
		limits[rule] = typeof old === "number" ? Math.min(old, now) : now;
	}
	const floors = {};
	for (const key of FLOOR_KEYS) {
		const old = previous?.floors?.[key];
		floors[key] = typeof old === "number" ? Math.max(old, totals[key]) : totals[key];
	}
	return { version: 2, description: "DENTE ratchet baseline. Debt limits only fall; floors only rise (floors fall only via the ledger).", limits, floors };
}

export function appendLedger(ledgerPath, entry) {
	const dir = dirname(ledgerPath);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	appendFileSync(ledgerPath, `${JSON.stringify(entry)}\n`, "utf8");
}

/* ---------------------------------------------------------------- labels */

const LABELS = {
	"explicit-any": "any (any[], Record<_, any>, | any ...)",
	"z-any": "Zod z.any() in schemas",
	"double-cast": "as unknown/any as T",
	"as-never": "as never",
	"record-cast": "as Record<string, unknown>",
	"type-assertion": "type assertions (as T, not const)",
	"non-null-assertion": "non-null assertion x!",
	"ts-suppression": "@ts-ignore / expect-error / nocheck",
	"linter-suppression": "biome-ignore / eslint-disable",
	"empty-catch": "empty catch {}",
	"documented-swallow": "catch swallowed WITH a swallow-ok reason",
	"silent-catch": "catch with no call and no throw",
	"swallowed-promise": ".catch(() => {} / null / [])",
	"console-noise": "console.log/debug/info/trace",
	"prod-imports-test-code": "prod imports test code",
	"test-env-sniff": "prod code detects the test runner",
	"float-money-division": "money / 100 in the UI",
	[UPPERCASE_RULE]: "uppercase on buttons/chips/tabs",
	"test-no-assertion": "test without any assertion",
	"test-weak-only": "test with only weak assertions",
	"test-tautology": "tautological assertion (true===true)",
	"test-phantom-no-sut": "phantom test (never touches project code)",
	"test-skipped": "skipped / todo test (hard 0)",
	"test-only-left": ".only left in (hard 0)",
	"test-size-assertion": "test asserts a source file's line count",
	"test-source-grep": "test greps source text, runs nothing",
	"test-swallowed-assertion": "assertion inside try/catch that swallows",
	"test-self-mock": "test mocks the module under test",
};

export function labelOf(rule) {
	return LABELS[rule] ?? rule;
}

/* ------------------------------------------------------------------ CLI */

function parseArgs(argv) {
	const args = { tighten: true, json: false, list: null, limit: 40, acceptRemoval: null, reason: null };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--no-tighten" || a === "--dry-run" || a === "--no-auto-ratchet") args.tighten = false;
		else if (a === "--json") args.json = true;
		else if (a === "--list") args.list = argv[++i] ?? null;
		else if (a.startsWith("--limit=")) args.limit = Number(a.slice(8)) || 40;
		else if (a.startsWith("--accept-test-removal=")) args.acceptRemoval = Number(a.slice("--accept-test-removal=".length));
		else if (a === "--reason") args.reason = argv[++i] ?? null;
	}
	return args;
}

function runCli() {
	const args = parseArgs(process.argv.slice(2));
	const started = Date.now();
	const baseline = getBaseline();
	const { counts, findings, totals, failedToParse } = countMetrics();
	const elapsed = ((Date.now() - started) / 1000).toFixed(1);

	if (args.list) {
		const items = findings[args.list];
		if (!items) {
			console.error(`Unknown rule "${args.list}". Rules: ${DEBT_RULES.join(", ")}`);
			process.exit(1);
		}
		console.log(`${args.list}: ${items.length}`);
		for (const f of items.slice(0, args.limit)) console.log(`  ${f.file}:${f.line}  ${f.text}`);
		process.exit(0);
	}

	if (args.acceptRemoval !== null) {
		if (!Number.isInteger(args.acceptRemoval) || !args.reason || args.reason.trim().length < 25) {
			console.error('--accept-test-removal=<newTestFloor> needs --reason "<at least 25 characters, say WHY these tests are gone>"');
			process.exit(1);
		}
		if (totals.tests < args.acceptRemoval) {
			console.error(`Cannot lower the floor to ${args.acceptRemoval}: only ${totals.tests} tests exist.`);
			process.exit(1);
		}
		const next = structuredClone(baseline);
		appendLedger(DEFAULT_LEDGER_PATH, {
			at: new Date().toISOString(),
			kind: "test-removal",
			testsFloorFrom: baseline.floors.tests,
			testsFloorTo: args.acceptRemoval,
			reason: args.reason.trim(),
		});
		next.floors.tests = args.acceptRemoval;
		writeFileSync(DEFAULT_BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
		console.log(`Test floor ${baseline.floors.tests} -> ${args.acceptRemoval} recorded in ${relative(DEFAULT_REPO_ROOT, DEFAULT_LEDGER_PATH)}. Commit both files together.`);
		process.exit(0);
	}

	const evaluation = evaluateRatchet(counts, totals, baseline);
	const integrity = checkIntegrity();
	const totalDebt = DEBT_RULES.reduce((sum, r) => sum + counts[r], 0);

	if (args.json) {
		console.log(JSON.stringify({ ...evaluation, integrity, counts, totals, totalDebt, failedToParse, elapsedSeconds: elapsed }, null, 2));
		process.exit(evaluation.ok && integrity.violations.length === 0 ? 0 : 1);
	}

	const line = "=".repeat(86);
	console.log(`\n${line}\nDENTE CRM — QUALITY RATCHET v2 (AST, production + tests)\n${line}`);
	console.log(`Scanned: ${totals.prodFiles} production files, ${totals.testFiles} test files, ${totals.tests} tests in ${elapsed}s`);
	console.log(`Baseline: scripts/config/sanitary-baseline.json (tighten: ${args.tighten ? "on" : "off"})`);
	console.log("-".repeat(86));
	console.log("Rule                                           now   limit   status");
	for (const rule of DEBT_RULES) {
		const now = counts[rule];
		const limit = HARD_ZERO_RULES.includes(rule) ? 0 : (baseline.limits[rule] ?? "?");
		const status = typeof limit !== "number" ? "NEW RULE, NOT IN BASELINE" : now > limit ? `REGRESSION +${now - limit}` : now < limit ? `better (${now - limit})` : now === 0 ? "clean" : "debt";
		console.log(`${labelOf(rule).padEnd(44)} ${String(now).padStart(6)} ${String(limit).padStart(7)}   ${status}`);
	}
	for (const key of FLOOR_KEYS) {
		const floor = baseline.floors[key];
		const now = totals[key];
		console.log(`${`floor: ${key}`.padEnd(44)} ${String(now).padStart(6)} ${String(floor).padStart(7)}   ${now < floor ? "BELOW FLOOR" : "ok"}`);
	}
	console.log("-".repeat(86));
	console.log(`TOTAL DEBT: ${totalDebt} findings. ${totalDebt === 0 ? "Nothing found by these detectors." : "This is what the codebase owes, not what is allowed to grow."}`);
	console.log("Blind spots (read them): detectors are syntactic. They do not prove tests are good (see the mutation");
	console.log("probe), do not see logic errors, and 'weak/no-assertion' treats helpers not named assert*/expect*/verify*");
	console.log("as non-assertions. A zero here is a floor, never a certificate.");
	console.log(line);

	let failed = false;
	if (failedToParse.length > 0) {
		failed = true;
		console.error(`\nFILES THE SCANNER COULD NOT READ (a file nobody scans is a hiding place):`);
		for (const f of failedToParse.slice(0, 10)) console.error(`  ${f.file}: ${f.error}`);
	}
	if (integrity.skipped) console.log("\nNote: git HEAD baseline unavailable, anti-raise integrity check skipped.");
	for (const v of integrity.violations) {
		failed = true;
		console.error(`\nINTEGRITY VIOLATION: ${v}`);
	}
	if (!evaluation.ok) {
		failed = true;
		console.error("\nREGRESSION:");
		for (const r of evaluation.regressions) {
			console.error(`  ${labelOf(r.rule)}: ${r.current} > limit ${r.limit} (+${r.delta})${r.reason ? ` [${r.reason}]` : ""}`);
			for (const f of findings[r.rule].slice(-Math.min(Math.max(r.delta, 3), 8))) console.error(`    ${f.file}:${f.line}  ${f.text}`);
		}
		for (const b of evaluation.floorBreaches) {
			console.error(`  floor ${b.key}: ${b.current} < ${b.floor}. Files or tests disappeared. If tests were removed on purpose: --accept-test-removal=${b.current} --reason "..."`);
		}
	}
	if (failed) {
		printFailureManifesto("TYPE_RATCHET", {
			details: [
				...integrity.violations,
				...evaluation.regressions.map((r) => `${labelOf(r.rule)}: ${r.current} > ${r.limit}`),
				...evaluation.floorBreaches.map((b) => `floor ${b.key}: ${b.current} < ${b.floor}`),
			].join("; "),
		});
		process.exit(1);
	}

	if (args.tighten) {
		const next = buildBaselineFrom(counts, totals, baseline);
		if (JSON.stringify(next) !== JSON.stringify(baseline)) {
			saveBaseline(DEFAULT_BASELINE_PATH, next);
			console.log("\nBaseline tightened to the current measurements. Commit scripts/config/sanitary-baseline.json.");
			for (const imp of evaluation.improvements) console.log(`  ${imp.rule}: ${imp.limit} -> ${imp.current}`);
		}
	}
	process.exit(0);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) runCli();
