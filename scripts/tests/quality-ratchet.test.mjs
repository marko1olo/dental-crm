#!/usr/bin/env node

/**
 * quality-ratchet.test.mjs — tests for Quality Ratchet v2 (AST, production + tests + anti-gaming).
 *
 * Runs via:
 *   node --test scripts/tests/quality-ratchet.test.mjs
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { scanProductionSource, scanTestSource } from "../lib/code-health-ast.mjs";
import {
	buildBaselineFrom,
	checkBaselineIntegrity,
	DEBT_RULES,
	DEFAULT_BASELINE_PATH,
	evaluateRatchet,
	FLOOR_KEYS,
	getBaseline,
	HARD_ZERO_RULES,
	isTestFile,
	saveBaseline,
	scanUppercaseButtons,
} from "../quality-ratchet.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const ratchetScriptPath = join(__dirname, "..", "quality-ratchet.mjs");

const rulesIn = (findings) => findings.map((f) => f.rule);

test("isTestFile: isolates tests/helpers/mocks from production files", () => {
	assert.equal(isTestFile("apps/web/src/components/Button.test.tsx"), true);
	assert.equal(isTestFile("packages/shared/src/money.spec.ts"), true);
	assert.equal(isTestFile("apps/api/src/routes/patientTestHelpers.ts"), true);
	assert.equal(isTestFile("apps/api/src/ai/__tests__/copilot.test.ts"), true);
	assert.equal(isTestFile("packages/shared/src/tests/clinicalPricelist.test.ts"), true);
	assert.equal(isTestFile("apps/api/src/services/__mocks__/storageMock.ts"), true);
	assert.equal(isTestFile("apps/web/src/testUtils.ts"), true);
	assert.equal(isTestFile("apps/web/src/setupTests.ts"), true);

	assert.equal(isTestFile("packages/shared/src/money.ts"), false);
	assert.equal(isTestFile("apps/api/src/routes/visits.ts"), false);
	assert.equal(isTestFile("apps/web/src/components/Button.tsx"), false);
});

test("scanProductionSource: catches every form of any, z.any(), double-cast, as-never, non-null", () => {
	const code = `
		import { z } from "zod";
		const company = "Dental Tech"; // must NOT trigger
		const a: any = 1;
		const b: any[] = [];
		const c: Record<string, any> = {};
		function f(x: string | any) { return x; }
		const d = (company as unknown as number);
		const e = (company as never);
		const g = z.object({ raw: z.any() });
		const h = (b[0]!).toString();
		const safeConst = ["a", "b"] as const; // must NOT trigger type-assertion
	`;
	const findings = scanProductionSource(code, "apps/api/src/sample.ts");
	const rules = rulesIn(findings);

	assert.equal(rules.filter((r) => r === "explicit-any").length, 4, `expected 4 explicit-any, got: ${JSON.stringify(findings)}`);
	assert.equal(rules.filter((r) => r === "z-any").length, 1);
	assert.equal(rules.filter((r) => r === "double-cast").length, 1);
	assert.equal(rules.filter((r) => r === "as-never").length, 1);
	assert.equal(rules.filter((r) => r === "non-null-assertion").length, 1);
	// `as const` must never be counted as a type assertion
	assert.ok(!findings.some((f) => f.text.includes("as const")));
});

test("scanProductionSource: catches suppressions, empty/silent catch, swallowed promises, console noise, test-env sniff", () => {
	const code = `
		import { helper } from "./__tests__/helpers";
		// @ts-expect-error legacy
		// biome-ignore lint/suspicious/noExplicitAny: old
		try { run(); } catch {}
		try { run(); } catch (e) { const x = 1; }
		try { run(); } catch { /* swallow-ok: browser optional wakeLock API unavailable */ }
		Promise.resolve().catch(() => {});
		Promise.resolve().catch(() => null);
		console.debug("noise");
		if (process.env.VITEST || process.env.NODE_ENV === "test") { run(); }
		const rub = priceKopecks / 100;
		const pct = progressPercent * 0.01; // non-money, must NOT trigger
	`;
	const findings = scanProductionSource(code, "apps/web/src/comp.ts", { isWeb: true });
	const rules = rulesIn(findings);

	assert.equal(rules.filter((r) => r === "prod-imports-test-code").length, 1);
	assert.equal(rules.filter((r) => r === "ts-suppression").length, 1);
	assert.equal(rules.filter((r) => r === "linter-suppression").length, 1);
	assert.equal(rules.filter((r) => r === "empty-catch").length, 1);
	assert.equal(rules.filter((r) => r === "silent-catch").length, 1);
	assert.equal(rules.filter((r) => r === "documented-swallow").length, 1);
	assert.equal(rules.filter((r) => r === "swallowed-promise").length, 2);
	assert.equal(rules.filter((r) => r === "console-noise").length, 1);
	assert.equal(rules.filter((r) => r === "test-env-sniff").length, 2);
	assert.equal(rules.filter((r) => r === "float-money-division").length, 1);
});

test("scanTestSource: catches test lies while NOT false-positiving on determinism checks or test.mock", () => {
	const code = `
		import assert from "node:assert/strict";
		import fs from "node:fs";
		import { describe, it, test } from "node:test";
		import { computeFee } from "../billing/fee";

		describe("suite", () => {
			test.mock.method(process, "cwd", () => "/tmp"); // NOT a test!

			it("honest determinism test", () => {
				assert.equal(computeFee(100), computeFee(100));
				assert.equal(computeFee(100), 15);
			});

			it("no assertion test", () => {
				computeFee(100);
			});

			it("tautology and phantom test", () => {
				const blocked = false;
				assert.equal(blocked, false);
				assert.ok(true);
			});

			it("weak-only test", () => {
				const out = computeFee(100);
				assert.ok(out);
			});

			it.skip("skipped test", () => {
				assert.equal(computeFee(1), 1);
			});

			it.only("focused test", () => {
				assert.equal(computeFee(1), 1);
			});

			it("size Goodhart test", () => {
				const lines = fs.readFileSync("apps/web/src/a.ts", "utf8").split("\\n").length;
				assert.ok(lines <= 300);
			});

			it("source grep test", () => {
				const src = fs.readFileSync("apps/web/src/a.ts", "utf8");
				assert.ok(src.includes("export function"));
			});

			it("swallowed assertion", () => {
				try {
					assert.equal(computeFee(100), 999);
				} catch {}
			});
		});
	`;
	const res = scanTestSource(code, "packages/shared/src/billing/fee.test.ts");
	const rules = rulesIn(res.findings);

	assert.equal(res.tests, 9, `expected 9 real tests (excluding test.mock.method), got ${res.tests}`);
	assert.equal(rules.filter((r) => r === "test-no-assertion").length, 1);
	assert.equal(rules.filter((r) => r === "test-tautology").length, 2, "must flag both local literal equality and assert.ok(true), NOT computeFee(100)===computeFee(100)");
	assert.equal(rules.filter((r) => r === "test-phantom-no-sut").length, 1);
	assert.equal(rules.filter((r) => r === "test-weak-only").length, 1);
	assert.equal(rules.filter((r) => r === "test-skipped").length, 1);
	assert.equal(rules.filter((r) => r === "test-only-left").length, 1);
	assert.equal(rules.filter((r) => r === "test-size-assertion").length, 1);
	assert.equal(rules.filter((r) => r === "test-source-grep").length, 1);
	assert.equal(rules.filter((r) => r === "test-swallowed-assertion").length, 1);
});

test("scanTestSource: detects vi.mock of the module under test (test-self-mock)", () => {
	const code = `
		import { describe, it, expect, vi } from "vitest";
		vi.mock("./splitPayment");
		import { splitPayment } from "./splitPayment";
		describe("self mock", () => {
			it("runs mock", () => { expect(splitPayment()).toBe(1); });
		});
	`;
	const res = scanTestSource(code, "packages/shared/src/billing/splitPayment.test.ts");
	assert.ok(rulesIn(res.findings).includes("test-self-mock"));
});

test("scanUppercaseButtons: detects uppercase on buttons/chips/tabs in TSX and CSS", () => {
	const tempDir = mkdtempSync(join(repoRoot, "scratch", "ratchet-test-upper-"));
	try {
		const tsxFile = join(tempDir, "Buttons.tsx");
		writeFileSync(
			tsxFile,
			`export function Buttons() { return (<div><button className="dente-btn uppercase">Save</button><div role="button" className="pill uppercase">Pick</div><button className="dente-btn">Ok</button><label className="uppercase">Title</label></div>); }`,
			"utf8",
		);
		const cssFile = join(tempDir, "styles.css");
		writeFileSync(
			cssFile,
			`.status-pill { text-transform: uppercase; }\n.dente-btn-custom { text-transform: uppercase; }\n.my-table th { text-transform: uppercase; }\n`,
			"utf8",
		);
		const matches = scanUppercaseButtons([tsxFile], [cssFile], tempDir);
		assert.equal(matches.length, 4);
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
});

test("evaluateRatchet: enforces debt ceilings, hard-zero rules, and file/test floors", () => {
	const zeroCounts = Object.fromEntries(DEBT_RULES.map((r) => [r, 0]));
	const baseline = buildBaselineFrom({ ...zeroCounts, "explicit-any": 5 }, { prodFiles: 100, testFiles: 20, tests: 200 });

	const clean = evaluateRatchet({ ...zeroCounts, "explicit-any": 3 }, { prodFiles: 100, testFiles: 20, tests: 205 }, baseline);
	assert.equal(clean.ok, true);
	assert.equal(clean.improvements.length, 1);
	assert.equal(clean.improvements[0].rule, "explicit-any");

	const regressed = evaluateRatchet({ ...zeroCounts, "explicit-any": 6 }, { prodFiles: 100, testFiles: 20, tests: 200 }, baseline);
	assert.equal(regressed.ok, false);
	assert.equal(regressed.regressions[0].rule, "explicit-any");

	const floorDrop = evaluateRatchet({ ...zeroCounts, "explicit-any": 5 }, { prodFiles: 100, testFiles: 20, tests: 199 }, baseline);
	assert.equal(floorDrop.ok, false);
	assert.equal(floorDrop.floorBreaches[0].key, "tests");

	// Hard-zero rule cannot pass even if tampered in baseline
	const tampered = structuredClone(baseline);
	tampered.limits["test-skipped"] = 10;
	const skipped = evaluateRatchet({ ...zeroCounts, "test-skipped": 1 }, { prodFiles: 100, testFiles: 20, tests: 200 }, tampered);
	assert.equal(skipped.ok, false);
	assert.equal(skipped.regressions[0].rule, "test-skipped");
});

test("saveBaseline & checkBaselineIntegrity: forbid raising limits and forbid lowering floors without a ledger entry", () => {
	const tempDir = mkdtempSync(join(repoRoot, "scratch", "ratchet-test-io-"));
	try {
		const configPath = join(tempDir, "sanitary-baseline.json");
		const zeroCounts = Object.fromEntries(DEBT_RULES.map((r) => [r, 0]));
		const initial = buildBaselineFrom({ ...zeroCounts, "explicit-any": 10 }, { prodFiles: 100, testFiles: 20, tests: 200 });
		saveBaseline(configPath, initial);

		assert.deepEqual(getBaseline(configPath), initial);

		// Tightening limit and raising floor is allowed
		const tighter = structuredClone(initial);
		tighter.limits["explicit-any"] = 8;
		tighter.floors.tests = 210;
		saveBaseline(configPath, tighter);
		assert.equal(getBaseline(configPath).limits["explicit-any"], 8);

		// Raising a limit throws
		const looser = structuredClone(tighter);
		looser.limits["explicit-any"] = 9;
		assert.throws(() => saveBaseline(configPath, looser), /may not rise/);

		// Lowering a floor throws
		const fewerTests = structuredClone(tighter);
		fewerTests.floors.tests = 205;
		assert.throws(() => saveBaseline(configPath, fewerTests), /may not fall/);

		// Integrity check against git HEAD detects raised limits and unlogged floor drops
		assert.ok(checkBaselineIntegrity(looser, tighter).violations.length > 0);
		assert.ok(checkBaselineIntegrity(fewerTests, tighter, { workingLedger: "", committedLedger: "" }).violations.length > 0);
		assert.equal(
			checkBaselineIntegrity(fewerTests, tighter, { workingLedger: '{"kind":"test-removal"}\n', committedLedger: "" }).violations.length,
			0,
		);
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
});

test("Current sanitary-baseline.json is valid v2 with all rules and floors", () => {
	const baseline = getBaseline(DEFAULT_BASELINE_PATH);
	assert.equal(baseline.version, 2);
	for (const rule of DEBT_RULES) {
		assert.ok(typeof baseline.limits[rule] === "number" && baseline.limits[rule] >= 0, `missing limit for ${rule}`);
	}
	for (const rule of HARD_ZERO_RULES) {
		assert.equal(baseline.limits[rule], 0, `hard-zero rule ${rule} must be 0`);
	}
	for (const key of FLOOR_KEYS) {
		assert.ok(typeof baseline.floors[key] === "number" && baseline.floors[key] > 0, `missing floor for ${key}`);
	}
});

test("CLI integration: quality-ratchet.mjs --no-tighten runs cleanly on repository baseline", () => {
	const res = spawnSync(process.execPath, [ratchetScriptPath, "--no-tighten"], {
		cwd: repoRoot,
		encoding: "utf8",
		env: { ...process.env, NODE_ENV: "test" },
	});
	assert.equal(res.status, 0, `Expected exit 0. Stderr:\n${res.stderr}\nStdout:\n${res.stdout}`);
	assert.match(res.stdout, /QUALITY RATCHET v2/);
});
