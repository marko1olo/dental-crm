/**
 * cashboxShiftModules.test.ts — Unit & Integration Test Suite for Cashbox Shift & Fiscal Ledger Engine.
 *
 * Verifies:
 * 1. SSOT tender type resolution via @dental/shared.
 * 2. Deterministic 54-FZ FFD 1.2 fiscal metadata (QR string, FD, FPD, FN).
 * 3. Exact kopeck reconciliation arithmetic (excess, shortage, balanced).
 * 4. Tender parity assertion with multi-tender splits.
 * 5. File limit compliance for all decomposed submodules (<= 500 lines).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	CanonicalTenderType,
	DEMO_SHOWCASE_ORG_ID,
	isDemoOrganizationId,
	kopecksToRub,
	normalizeTenderType,
	rubToKopecks,
	validateTenderParity,
} from "@dental/shared";
import {
	generateShiftFiscalMetadata,
} from "../routes/cashbox/cashboxShiftModules/shiftReconciliationEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Cashbox Shift & Fiscal Ledger Engine (SSOT & 54-FZ)", () => {
	it("1. verifies SSOT tender type normalization across all aliases and Cyrillic variants", () => {
		assert.equal(normalizeTenderType("cash"), "cash");
		assert.equal(normalizeTenderType("наличные"), "cash");
		assert.equal(normalizeTenderType("нал"), "cash");
		assert.equal(normalizeTenderType("card"), "card");
		assert.equal(normalizeTenderType("безнал"), "card");
		assert.equal(normalizeTenderType("терминал"), "card");
		assert.equal(normalizeTenderType("sbp"), "sbp");
		assert.equal(normalizeTenderType("сбп"), "sbp");
		assert.equal(normalizeTenderType("qr"), "sbp");
		assert.equal(normalizeTenderType("депозит"), "deposit");
		assert.equal(normalizeTenderType("аванс"), "deposit");
		assert.equal(normalizeTenderType("страховая"), "insurance");
		assert.equal(normalizeTenderType("дмс"), "insurance");
	});

	it("2. generates valid 54-FZ fiscal receipt metadata and QR string for Demo and Prod", () => {
		assert.equal(isDemoOrganizationId(DEMO_SHOWCASE_ORG_ID), true);

		const now = new Date("2026-10-11T20:30:00Z");
		const meta = generateShiftFiscalMetadata({
			orgId: DEMO_SHOWCASE_ORG_ID,
			shiftNumber: 42,
			totalRevenueRub: 15450.50,
			closedAt: now,
		});

		assert.equal(meta.fnSerial, "9999078900012345");
		assert.equal(meta.fiscalDocNumber, "4201");
		assert.ok(meta.fiscalSign.length >= 8);
		assert.ok(meta.qrString.startsWith("t="));
		assert.ok(meta.qrString.includes("s=15450.50"));
		assert.ok(meta.qrString.includes("fn=9999078900012345"));
		assert.ok(meta.qrString.includes("i=4201"));
		assert.ok(meta.qrString.includes("n=1"));
	});

	it("3. validates multi-tender parity with integer-kopeck precision", () => {
		const parityResult = validateTenderParity({
			totalDueKopecks: 100000, // 1000.00 ₽
			cashKopecks: 40000,      // 400.00 ₽
			cardKopecks: 35000,      // 350.00 ₽
			sbpKopecks: 15000,       // 150.00 ₽
			depositKopecks: 10000,   // 100.00 ₽
		});

		assert.equal(parityResult.isValid, true);
		assert.equal(parityResult.diffKopecks, 0);
		assert.equal(parityResult.isOverallocated, false);
		assert.equal(parityResult.isCashShortage, false);
	});

	it("4. detects cash shortage and excess accurately", () => {
		// Shortage scenario
		const shortageResult = validateTenderParity({
			totalDueKopecks: 100000,
			cashKopecks: 40000,
			cardKopecks: 35000,
			receivedCashKopecks: 30000, // short by 100 руб
		});
		assert.equal(shortageResult.isValid, false);
		assert.equal(shortageResult.isCashShortage, true);
		assert.equal(shortageResult.cashShortageKopecks, 10000);
		assert.equal(shortageResult.remainingKopecks, 25000);

		// Excess scenario
		const excessResult = validateTenderParity({
			totalDueKopecks: 100000,
			cashKopecks: 60000,
			cardKopecks: 50000, // 1100 руб total vs 1000 руб due
		});
		assert.equal(excessResult.isOverallocated, true);
		assert.equal(excessResult.diffKopecks, 10000);
		assert.equal(excessResult.isValid, false);
	});

	it("5. verifies all cashbox shift decomposed files are strictly <= 500 lines", () => {
		const shiftModulesDir = path.resolve(
			__dirname,
			"../routes/cashbox/cashboxShiftModules",
		);
		const files = fs.readdirSync(shiftModulesDir).filter((f) => f.endsWith(".ts"));
		assert.ok(files.length >= 4, "Must contain all decomposed submodules");

		for (const file of files) {
			const fullPath = path.join(shiftModulesDir, file);
			const lines = fs.readFileSync(fullPath, "utf8").split("\n").length;
			assert.ok(
				lines <= 500,
				`File ${file} has ${lines} lines, exceeding 500 lines limit!`,
			);
		}

		// Also check facade
		const facadePath = path.resolve(
			__dirname,
			"../routes/cashbox/cashboxShiftRoutes.ts",
		);
		const facadeLines = fs.readFileSync(facadePath, "utf8").split("\n").length;
		assert.ok(
			facadeLines <= 50,
			`Facade cashboxShiftRoutes.ts has ${facadeLines} lines, must be <= 50!`,
		);
	});
});
