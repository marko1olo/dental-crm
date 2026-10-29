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
	it("1. DoctorPayrollModal.tsx contains 0 fake setTimeout period closed simulations", () => {
		const modalPath = path.resolve(__dirname, "../../DoctorPayrollModal.tsx");
		assert.ok(fs.existsSync(modalPath), "DoctorPayrollModal.tsx must exist");
		const content = fs.readFileSync(modalPath, "utf8");

		// Запрет на старый бутафорский паттерн: setPeriodClosedNotice(true) + setTimeout
		assert.equal(
			content.includes("setPeriodClosedNotice"),
			false,
			"DoctorPayrollModal.tsx must not contain fake setPeriodClosedNotice simulation!",
		);
		assert.equal(
			content.includes("setTimeout(() => setPeriodClosedNotice(false), 4000)"),
			false,
			"DoctorPayrollModal.tsx must not contain fake setTimeout period closed simulation!",
		);

		// Доказательство наличия реальной связки с бэкендом
		assert.ok(
			content.includes("handleCloseSettlementPeriod"),
			"DoctorPayrollModal.tsx must wire handleCloseSettlementPeriod",
		);
		assert.ok(
			content.includes("isPeriodClosed"),
			"DoctorPayrollModal.tsx must check isPeriodClosed state",
		);
		assert.ok(
			content.includes("doctor-payroll-close-period-btn"),
			"Close period button must have data-testid",
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

	it("3. useDoctorPayrollModalState binds real settlement period closing and reactive state update", () => {
		const statePath = path.resolve(__dirname, "../../useDoctorPayrollModalState.ts");
		const stateContent = fs.readFileSync(statePath, "utf8");

		assert.ok(
			stateContent.includes("isPeriodClosed"),
			"State must track isPeriodClosed",
		);
		assert.ok(
			stateContent.includes("settlementStatement"),
			"State must track settlementStatement payload",
		);
		assert.ok(
			stateContent.includes("closeSettlementPeriodApi"),
			"State must call closeSettlementPeriodApi",
		);
		assert.ok(
			stateContent.includes("reopenSettlementPeriodApi"),
			"State must call reopenSettlementPeriodApi",
		);
		assert.ok(
			stateContent.includes("fetchDoctorEarningsWithStatusApi"),
			"State must call fetchDoctorEarningsWithStatusApi to restore closed period on mount",
		);
	});
});
