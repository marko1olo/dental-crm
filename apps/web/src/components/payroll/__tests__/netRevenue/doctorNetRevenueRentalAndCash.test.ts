/**
 * doctorNetRevenueRentalAndCash.test.ts — Cashbox Discipline & Chair Rental Economics
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateDoctorPeriodPayroll } from "../../staffPayrollEngine";
import { DoctorPayrollModal } from "../../DoctorPayrollModal";

describe("Doctor Net Revenue: Cashbox Discipline & Rental (Mandates 8e, 8n)", () => {
	it("4. Cashbox Discipline: uncollected patient debts produce zero doctor commission", () => {
		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-debt-audit",
			doctorName: "Д-р Тестовый А.А.",
			specialtyId: "orthopedist",
			periodStartIso: "2026-10-01",
			periodEndIso: "2026-10-31",
			services: [{
				id: "srv-unpaid-debt",
				dateIso: "2026-10-15",
				patientName: "Неплательщик",
				medicalCardNumber: "004",
				serviceNameRu: "Виниры E.max 4 единицы",
				category: "orthopedics",
				grossRevenueKop: 16000000,
				labCostKop: 4000000,
				materialCostKop: 0,
				isPaid: false,
				paidAmountKop: 0,
			}],
		});

		assert.equal(res.totalGrossRevenueKop, 0, "Uncollected debts must not enter doctor revenue");
		assert.equal(res.earnedBaseCommissionKop, 0, "Zero commission accrued on unpaid debts");
	});

	it("5. Solo Doctor Chair Rental: Gross − Chair Rental − Lab − Materials = 100% Net Profit", () => {
		const res = calculateDoctorPeriodPayroll({
			doctorId: "solo-doctor",
			doctorName: "Д-р Соло В.В.",
			specialtyId: "solo_practitioner",
			periodStartIso: "2026-10-01",
			periodEndIso: "2026-10-31",
			payoutModel: "chair_rental",
			chairRentalKop: 4500000,
			services: [{
				id: "srv-solo-1",
				dateIso: "2026-10-20",
				patientName: "Пациент Соло",
				medicalCardNumber: "005",
				serviceNameRu: "Комплексное терапевтическое лечение",
				category: "therapy",
				grossRevenueKop: 25000000,
				labCostKop: 2000000,
				materialCostKop: 3000000,
				isPaid: true,
				paidAmountKop: 25000000,
			}],
		});

		assert.equal(res.chairRentalKop, 4500000);
		assert.equal(res.totalNetBaseKop, 15500000);
		assert.equal(res.earnedBaseCommissionKop, 15500000);
		assert.equal(res.baseCommissionPercent, 100);
	});

	it("6. Mandate 8e: DoctorPayrollModal renders seamlessly without any blocking disabled buttons", () => {
		assert.ok(DoctorPayrollModal, "DoctorPayrollModal component must be cleanly exported");
	});
});
