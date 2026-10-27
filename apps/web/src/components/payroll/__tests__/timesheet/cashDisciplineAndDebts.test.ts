/**
 * cashDisciplineAndDebts.test.ts — Net Revenue 54-FZ & Unpaid Debts Handling
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateDoctorPeriodPayroll } from "../../staffPayrollEngine";

describe("Red Team: 54-FZ Cashbox Discipline & Patient Debts", () => {
	it("5.1 Commission accrued strictly from 54-FZ paid cash; zero commission on unpaid debts", () => {
		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-net-rev",
			doctorName: "Д-р Иванов С.И.",
			specialtyId: "orthopedist",
			periodStartIso: "2026-10-01",
			periodEndIso: "2026-10-31",
			services: [
				{
					id: "srv-paid",
					dateIso: "2026-10-05",
					patientName: "Оплаченный Пациент",
					medicalCardNumber: "101",
					serviceNameRu: "Керамическая коронка E.max",
					category: "orthopedics",
					grossRevenueKop: 4000000,
					labCostKop: 1000000,
					materialCostKop: 0,
					isPaid: true,
					paidAmountKop: 4000000,
				},
				{
					id: "srv-debt",
					dateIso: "2026-10-10",
					patientName: "Должник с долгом",
					medicalCardNumber: "102",
					serviceNameRu: "Циркониевый мостовидный протез",
					category: "orthopedics",
					grossRevenueKop: 9000000,
					labCostKop: 2500000,
					materialCostKop: 0,
					isPaid: false,
					paidAmountKop: 0,
				},
			],
		});

		assert.equal(res.totalGrossRevenueKop, 4000000);
		assert.equal(res.totalNetBaseKop, 3000000);
		assert.equal(res.earnedBaseCommissionKop, 900000);
	});

	it("5.2 Partially paid services generate commission strictly from the paid portion minus lab costs", () => {
		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-partial",
			doctorName: "Д-р Сидоров А.П.",
			specialtyId: "orthopedist",
			periodStartIso: "2026-10-01",
			periodEndIso: "2026-10-31",
			services: [{
				id: "srv-partial",
				dateIso: "2026-10-12",
				patientName: "Пациент с рассрочкой",
				medicalCardNumber: "103",
				serviceNameRu: "Протезирование all-on-4",
				category: "orthopedics",
				grossRevenueKop: 20000000,
				labCostKop: 4000000,
				materialCostKop: 0,
				paidAmountKop: 10000000,
			}],
		});

		assert.equal(res.totalGrossRevenueKop, 10000000);
		assert.equal(res.totalNetBaseKop, 6000000);
		assert.equal(res.earnedBaseCommissionKop, 1800000);
	});
});
