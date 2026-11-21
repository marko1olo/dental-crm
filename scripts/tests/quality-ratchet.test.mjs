#!/usr/bin/env node

/**
 * quality-ratchet.test.mjs — Comprehensive unit test suite for the Quality Ratchet system.
 *
 * Authority: MANDATE 8ai (Type Ratchet Doctrine), MANDATE 8bk (Demining & Dual-Counter)
 *
 * Test Coverage:
 *   1. isTestFile: Strict isolation of production code vs test fixtures/helpers.
 *   2. scanExplicitAny: Accurate detection of (: any, as any, <any>), exclusion of company/many/anyhow/has any,
 *                       and ignoring comments.
 *   3. scanLinterSuppressions: Accurate detection of biome-ignore and eslint-disable.
 *   4. scanRawFloatDivisions: Accurate detection of / 100 in UI, ignoring comments and string literals ("100%").
 *   5. scanUppercaseButtons: Accurate detection of uppercase on buttons, chips, tabs in TSX and CSS rules.
 *   6. evaluateRatchet: Verification of pass, regression detection (count > limit), and improvement detection.
 *   7. Ratchet Baseline Management: Reading, writing, and monotonic decrement of sanitary-baseline.json.
 *   8. CLI Integration: Spawning scripts/quality-ratchet.mjs in isolated environment (exit code 0 vs 1 on regression).
 *
 * Runs via:
 *   node --test scripts/tests/quality-ratchet.test.mjs
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
	DEFAULT_BASELINE_PATH,
	evaluateRatchet,
	getBaseline,
	isTestFile,
	saveBaseline,
	scanExplicitAny,
	scanLinterSuppressions,
	scanRawFloatDivisions,
	scanUppercaseButtons,
	stripStringLiterals,
} from "../quality-ratchet.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const ratchetScriptPath = join(__dirname, "..", "quality-ratchet.mjs");

test("isTestFile: distinguishes test files, helpers, and mocks from production code", () => {
	// Must identify as test files
	assert.equal(isTestFile("apps/web/src/components/Button.test.tsx"), true);
	assert.equal(isTestFile("packages/shared/src/money.spec.ts"), true);
	assert.equal(isTestFile("apps/api/src/routes/patientTestHelpers.ts"), true);
	assert.equal(isTestFile("apps/api/src/ai/__tests__/copilot.test.ts"), true);
	assert.equal(isTestFile("apps/api/src/ai/__tests__/nested/testRunner.ts"), true);
	assert.equal(isTestFile("packages/shared/src/tests/clinicalPricelist.test.ts"), true);
	assert.equal(isTestFile("apps/api/src/services/__mocks__/storageMock.ts"), true);
	assert.equal(isTestFile("apps/web/src/testUtils.ts"), true);
	assert.equal(isTestFile("apps/web/src/setupTests.ts"), true);

	// Must identify as production code (false)
	assert.equal(isTestFile("packages/shared/src/money.ts"), false);
	assert.equal(isTestFile("apps/api/src/routes/visits.ts"), false);
	assert.equal(isTestFile("apps/web/src/components/Button.tsx"), false);
	assert.equal(isTestFile("apps/web/src/components/finance/ledger.ts"), false);
	assert.equal(isTestFile("apps/api/src/db/schema/patients.ts"), false);
});

test("scanExplicitAny: detects TypeScript any constructs and ignores comments & false words", () => {
	const tempDir = mkdtempSync(join(repoRoot, "scratch", "ratchet-test-any-"));
	try {
		const sampleFile = join(tempDir, "sample.ts");
		const content = `
      // Normal code
      const company = "Dental Tech";
      const manyPatients = 42;
      const anyhow = true;
      const hasAnyRights = false;
      
      // Comments mentioning any should NOT trigger
      // Note: we should avoid foo: any here
      /* Legacy note: param as any was removed */
      
      // Real violations
      const val1: any = 1;
      const val2 = data as any;
      function parse(): Promise<any> { return Promise.resolve(); }
      const arr = <any>[1, 2];
    `;
		writeFileSync(sampleFile, content, "utf8");

		const matches = scanExplicitAny([sampleFile], tempDir);
		assert.equal(matches.length, 4, `Expected 4 violations, found ${matches.length}`);

		assert.ok(matches.some((m) => m.text.includes("val1: any")));
		assert.ok(matches.some((m) => m.text.includes("data as any")));
		assert.ok(matches.some((m) => m.text.includes("Promise<any>")));
		assert.ok(matches.some((m) => m.text.includes("<any>[1, 2]")));

		// None of the comments or false words should match
		assert.ok(!matches.some((m) => m.text.includes("company")));
		assert.ok(!matches.some((m) => m.text.includes("manyPatients")));
		assert.ok(!matches.some((m) => m.text.includes("anyhow")));
		assert.ok(!matches.some((m) => m.text.includes("hasAnyRights")));
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
});

test("scanLinterSuppressions: detects biome-ignore and eslint-disable", () => {
	const tempDir = mkdtempSync(join(repoRoot, "scratch", "ratchet-test-linter-"));
	try {
		const sampleFile = join(tempDir, "linterSample.ts");
		const content = `
      // Clean code
      export const a = 1;

      // biome-ignore lint/suspicious/noExplicitAny: automated suppression
      const legacy: any = {};

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const other: any = {};
    `;
		writeFileSync(sampleFile, content, "utf8");

		const matches = scanLinterSuppressions([sampleFile], tempDir);
		assert.equal(matches.length, 2, `Expected 2 suppressions, found ${matches.length}`);
		assert.ok(matches.some((m) => m.text.includes("biome-ignore")));
		assert.ok(matches.some((m) => m.text.includes("eslint-disable")));
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
});

test("scanRawFloatDivisions: detects / 100 in code, ignores string literals and comments", () => {
	const tempDir = mkdtempSync(join(repoRoot, "scratch", "ratchet-test-div-"));
	try {
		const sampleFile = join(tempDir, "divSample.ts");
		const content = `
      // Comment mentioning / 100 should not trigger
      // const rub = kop / 100;
      
      // String with slash 100% should not trigger
      const label = "Лечение персонала / 100% скидка";
      const otherLabel = 'Скидка / 100% гарантия';
      
      // Division by 1000 should not trigger
      const thousands = val / 1000;
      
      // Real violations
      const rub1 = amountKopecks / 100;
      const rub2 = Math.round(total / 100);
      const rub3 = (gross * 5) / 100;
    `;
		writeFileSync(sampleFile, content, "utf8");

		const matches = scanRawFloatDivisions([sampleFile], tempDir);
		assert.equal(matches.length, 3, `Expected 3 divisions, found ${matches.length}`);
		assert.ok(matches.some((m) => m.text.includes("amountKopecks / 100")));
		assert.ok(matches.some((m) => m.text.includes("total / 100")));
		assert.ok(matches.some((m) => m.text.includes("(gross * 5) / 100")));
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
});

test("stripStringLiterals: properly replaces single, double, and template strings", () => {
	const raw = 'const x = "text / 100%" + \'other / 100\' + `template / 100`;';
	const stripped = stripStringLiterals(raw);
	assert.equal(stripped, 'const x = "" + \'\' + ``;');
});

test("scanUppercaseButtons: detects uppercase on buttons/chips/tabs in TSX and CSS", () => {
	const tempDir = mkdtempSync(join(repoRoot, "scratch", "ratchet-test-upper-"));
	try {
		const tsxFile = join(tempDir, "Buttons.tsx");
		const tsxContent = `
      export function Buttons() {
        return (
          <div>
            {/* Violation: button with uppercase */}
            <button className="h-9 px-3 dente-btn uppercase">Сохранить</button>
            {/* Violation: role="button" with uppercase */}
            <div role="button" className="pill uppercase">Выбрать</div>
            {/* Allowed: standard button without uppercase */}
            <button className="h-9 px-3 dente-btn">Отмена</button>
            {/* Allowed: non-button label with uppercase */}
            <label className="text-xs uppercase text-slate-500">Заголовок</label>
          </div>
        );
      }
    `;
		writeFileSync(tsxFile, tsxContent, "utf8");

		const cssFile = join(tempDir, "styles.css");
		const cssContent = `
      /* Violation: pill with text-transform: uppercase */
      .status-pill {
        text-transform: uppercase;
        font-weight: bold;
      }
      /* Violation: button with text-transform: uppercase */
      .dente-btn-custom {
        text-transform: uppercase;
      }
      /* Allowed: table header with uppercase */
      .my-table th {
        text-transform: uppercase;
      }
    `;
		writeFileSync(cssFile, cssContent, "utf8");

		const matches = scanUppercaseButtons([tsxFile], [cssFile], tempDir);
		assert.equal(matches.length, 4, `Expected 4 violations (2 TSX + 2 CSS), found ${matches.length}`);
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
});

test("evaluateRatchet: passes when all metrics are <= baseline limits", () => {
	const baseline = {
		maxExplicitAny: 10,
		maxLinterSuppressions: 5,
		maxRawFloatDivisions: 20,
		maxUppercaseButtons: 2,
	};

	const currentCounts = {
		maxExplicitAny: 10,
		maxLinterSuppressions: 4, // improved
		maxRawFloatDivisions: 20,
		maxUppercaseButtons: 1, // improved
	};

	const result = evaluateRatchet(currentCounts, baseline);
	assert.equal(result.ok, true);
	assert.equal(result.regressions.length, 0);
	assert.equal(result.improvements.length, 2);
	assert.equal(result.improvements[0].metric, "maxLinterSuppressions");
	assert.equal(result.improvements[1].metric, "maxUppercaseButtons");
});

test("evaluateRatchet: detects regression when any metric exceeds baseline limit", () => {
	const baseline = {
		maxExplicitAny: 10,
		maxLinterSuppressions: 5,
		maxRawFloatDivisions: 20,
		maxUppercaseButtons: 2,
	};

	const currentCounts = {
		maxExplicitAny: 11, // +1 regression!
		maxLinterSuppressions: 5,
		maxRawFloatDivisions: 20,
		maxUppercaseButtons: 2,
	};

	const result = evaluateRatchet(currentCounts, baseline);
	assert.equal(result.ok, false);
	assert.equal(result.regressions.length, 1);
	assert.equal(result.regressions[0].metric, "maxExplicitAny");
	assert.equal(result.regressions[0].current, 11);
	assert.equal(result.regressions[0].limit, 10);
	assert.equal(result.regressions[0].delta, 1);
});

test("saveBaseline: saves and updates baseline monotonically", () => {
	const tempDir = mkdtempSync(join(repoRoot, "scratch", "ratchet-test-io-"));
	try {
		const configPath = join(tempDir, "sanitary-baseline.json");
		const initial = {
			maxExplicitAny: 100,
			maxLinterSuppressions: 50,
			maxRawFloatDivisions: 200,
			maxUppercaseButtons: 10,
		};
		saveBaseline(configPath, initial);

		const loaded = getBaseline(configPath);
		assert.deepEqual(loaded, initial);

		const updated = {
			...loaded,
			maxExplicitAny: 95,
			maxLinterSuppressions: 48,
		};
		saveBaseline(configPath, updated);

		const reloaded = getBaseline(configPath);
		assert.equal(reloaded.maxExplicitAny, 95);
		assert.equal(reloaded.maxLinterSuppressions, 48);
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
});

test("CLI integration: quality-ratchet.mjs runs cleanly on repository baseline", () => {
	const res = spawnSync(process.execPath, [ratchetScriptPath], {
		cwd: repoRoot,
		encoding: "utf8",
		env: { ...process.env, NODE_ENV: "test" },
	});

	assert.equal(res.status, 0, `Expected CLI to exit with code 0. Stderr: ${res.stderr}\nStdout: ${res.stdout}`);
	assert.match(res.stdout, /САНИТАРНЫЙ ХРАПОВИК КАЧЕСТВА/);
	assert.match(res.stdout, /(?:САНИТАРНЫЙ ХРАПОВИК ЧИСТ|АВТО-ХРАПОВИК ЗАКРУЧЕН)/);
});

test("Current sanitary-baseline.json contains valid non-negative integer limits", () => {
	const baseline = getBaseline(DEFAULT_BASELINE_PATH);
	assert.ok(typeof baseline.maxExplicitAny === "number" && baseline.maxExplicitAny >= 0);
	assert.ok(typeof baseline.maxLinterSuppressions === "number" && baseline.maxLinterSuppressions >= 0);
	assert.ok(typeof baseline.maxRawFloatDivisions === "number" && baseline.maxRawFloatDivisions >= 0);
	assert.ok(typeof baseline.maxUppercaseButtons === "number" && baseline.maxUppercaseButtons >= 0);
});
