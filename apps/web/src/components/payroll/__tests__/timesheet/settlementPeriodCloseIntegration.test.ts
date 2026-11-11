/**
 * settlementPeriodCloseIntegration.test.ts — Verification of Settlement Period Closing & Backend Integration
 * Mandate 8e: Doctor Autonomy. Mandate 8wy: Zero Mocks / Potemkin Village Eradication.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { closeSettlementPeriodApi, reopenSettlementPeriodApi } from "../../closeSettlementPeriodApi";
import { fetchDoctorEarningsWithStatusApi } from "../../fetchDoctorEarningsApi";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Red Team: Settlement Period Close & Potemkin Village Eradication", () => {
	it("1. DoctorPayrollStudioModal.tsx contains 0 fake setTimeout period closed simulations and binds canonical API", () => {
		const modalPath = path.resolve(__dirname, "../../DoctorPayrollStudioModal.tsx");
		assert.ok(fs.existsSync(modalPath), "DoctorPayrollStudioModal.tsx must exist");
		const content = fs.readFileSync(modalPath, "utf8");

		// Запрет на старый бутафорский паттерн: setPeriodClosedNotice(true) + setTimeout
		assert.equal(
			content.includes("setPeriodClosedNotice"),
			false,
			"DoctorPayrollStudioModal.tsx must not contain fake setPeriodClosedNotice simulation!",
		);
		assert.equal(
			content.includes("setTimeout(() => setPeriodClosedNotice(false), 4000)"),
			false,
			"DoctorPayrollStudioModal.tsx must not contain fake setTimeout period closed simulation!",
		);

		// Доказательство наличия реальной связки с бэкендом
		assert.ok(
			content.includes("handleCommitPayout"),
			"DoctorPayrollStudioModal.tsx must wire handleCommitPayout",
		);
		assert.ok(
			content.includes("closeSettlementPeriodApi"),
			"DoctorPayrollStudioModal.tsx must call closeSettlementPeriodApi",
		);
		assert.ok(
			content.includes("payroll-studio-primary-cta"),
			"Close period button must have data-testid payroll-studio-primary-cta",
		);
	});

	it("2. closeSettlementPeriodApi and reopenSettlementPeriodApi export cleanly and point to canonical API routes", () => {
		assert.equal(typeof closeSettlementPeriodApi, "function");
		assert.equal(typeof reopenSettlementPeriodApi, "function");
		assert.equal(typeof fetchDoctorEarningsWithStatusApi, "function");

		const apiPath = path.resolve(__dirname, "../../closeSettlementPeriodApi.ts");
		const apiContent = fs.readFileSync(apiPath, "utf8");
		assert.ok(apiContent.includes("/api/doctor/close-settlement-period"));
		assert.ok(apiContent.includes("/api/doctor/settlement-period/reopen"));
	});
});

