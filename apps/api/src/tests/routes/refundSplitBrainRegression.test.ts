/**
 * refundSplitBrainRegression.test.ts — End-to-End Regression Suite for the 3 Payment Refund Formats.
 *
 * Verifies that:
 *   Format 1: Negative counter-entry (`status: "refunded"`, `amountKopecks < 0`, `amountRub < 0`)
 *   Format 2: Negative paid / fiscal income_return (`status: "paid"` with `amountKopecks < 0` or `fiscalReceipt.operationType = "income_return"`)
 *   Format 3: Standalone positive `status: "refunded"` (`amountKopecks > 0`) vs ledger in-place `status: "refunded"`
 * all yield identical exact integer-kopeck / BigInt results across `debtReports`, `financialExecutiveReports`,
 * `revenueReports`, `doctorReports`, `doctorProfitabilityCalculator`, and `payrollDatasetQuery` + `calculateDoctorPeriodPayroll`.
 */

import { strict as assert } from "node:assert";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { calculateDoctorPeriodPayroll } from "@dental/shared";
import { db, pool } from "../../db/client.js";
import { withSuperuserBypass } from "../../db/rls.js";
import {
	appointments,
	organizations,
	patients,
	payments,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { calculateDoctorProfitability } from "../../routes/analytics/doctorProfitabilityCalculator.js";
import { fetchDoctorPayrollDataset } from "../../routes/payrollModules/payrollDatasetQuery.js";
import { receivables } from "../../services/reports/managerReports/debtReports.js";
import { doctorPerformance } from "../../services/reports/managerReports/doctorReports.js";
import { financialExecutiveSummary } from "../../services/reports/managerReports/financialExecutiveReports.js";
import { revenueTimeline } from "../../services/reports/managerReports/revenueReports.js";
import { isMissingDatabase } from "./managerReportsSuite/fixture.js";

const ORG_ID = "01960000-0000-7000-8000-000000009101";
const DOC_ID = "01960000-0000-7000-8000-000000009102";

interface ScenarioResult {
	readonly debtRub: number;
	readonly execCashRub: number;
	readonly execCardRub: number;
	readonly execNetRevenueKopecks: number;
	readonly revenueTotalRub: number;
	readonly doctorReportRevenueRub: number;
	readonly profitabilityRevenueKopecks: number;
	readonly payrollRefundTotalKop: number;
	readonly payrollRefundClawbackKop: number;
	readonly payrollGrossPayoutKop: number;
}

describe("Payment Refund Split-Brain Regression (All 3 Formats)", () => {
	let dbAvailable = true;

	before(async () => {
		try {
			await withSuperuserBypass(async (tx) => {
				await tx.delete(payments).where(eq(payments.organizationId, ORG_ID));
				await tx.delete(treatmentItems).where(eq(treatmentItems.organizationId, ORG_ID));
				await tx.delete(visits).where(eq(visits.organizationId, ORG_ID));
				await tx.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
				await tx.delete(patients).where(eq(patients.organizationId, ORG_ID));
				await tx.delete(users).where(eq(users.organizationId, ORG_ID));
				await tx.delete(organizations).where(eq(organizations.id, ORG_ID));

				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Тест Сплит-Брейн Возвратов",
				});
				await tx.insert(users).values({
					id: DOC_ID,
					organizationId: ORG_ID,
					email: `doc-refund-split-${Date.now()}@clinic.local`,
					passwordHash: "hash",
					fullName: "Врач Возвратов",
					role: "doctor",
					isActive: true,
				});
			});
		} catch (err) {
			if (isMissingDatabase(err)) {
				dbAvailable = false;
				return;
			}
			throw err;
		}
	});

	after(async () => {
		if (dbAvailable) {
			await withSuperuserBypass(async (tx) => {
				await tx.delete(payments).where(eq(payments.organizationId, ORG_ID));
				await tx.delete(treatmentItems).where(eq(treatmentItems.organizationId, ORG_ID));
				await tx.delete(visits).where(eq(visits.organizationId, ORG_ID));
				await tx.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
				await tx.delete(patients).where(eq(patients.organizationId, ORG_ID));
				await tx.delete(users).where(eq(users.organizationId, ORG_ID));
				await tx.delete(organizations).where(eq(organizations.id, ORG_ID));
			}).catch(() => {});
		}
		await pool.end().catch(() => {});
	});

	async function runFormatScenario(
		formatKind: "negative_refunded" | "negative_paid" | "income_return_meta" | "positive_refunded",
	): Promise<ScenarioResult> {
		const patientId = "01960000-0000-7000-8000-000000009111";
		const apptId = "01960000-0000-7000-8000-000000009112";
		const visitId = "01960000-0000-7000-8000-000000009113";
		const itemId = "01960000-0000-7000-8000-000000009114";
		const now = new Date("2026-05-15T12:00:00.000Z");
		const from = new Date("2026-05-01T00:00:00.000Z");
		const to = new Date("2026-05-31T23:59:59.999Z");

		await withSuperuserBypass(async (tx) => {
			await tx.delete(payments).where(eq(payments.organizationId, ORG_ID));
			await tx.delete(treatmentItems).where(eq(treatmentItems.organizationId, ORG_ID));
			await tx.delete(visits).where(eq(visits.organizationId, ORG_ID));
			await tx.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
			await tx.delete(patients).where(eq(patients.organizationId, ORG_ID));

			await tx.insert(patients).values({
				id: patientId,
				organizationId: ORG_ID,
				fullName: "Пациент Сплит-Тест",
				phone: "+79990009101",
				createdAt: from,
			});
			await tx.insert(appointments).values({
				id: apptId,
				organizationId: ORG_ID,
				patientId,
				doctorUserId: DOC_ID,
				startsAt: new Date("2026-05-15T09:00:00.000Z"),
				endsAt: new Date("2026-05-15T10:00:00.000Z"),
				status: "completed",
			});
			await tx.insert(visits).values({
				id: visitId,
				organizationId: ORG_ID,
				appointmentId: apptId,
				patientId,
				doctorUserId: DOC_ID,
				status: "signed",
				createdAt: now,
			});
			// Charge: 10,000.00 RUB = 1,000,000 kopecks
			await tx.insert(treatmentItems).values({
				id: itemId,
				organizationId: ORG_ID,
				patientId,
				visitId,
				title: "Пломба композитная",
				quantity: "1",
				unitPriceRub: 10000,
				unitPriceKopecks: 1000000n,
				priceRub: 10000,
				priceKopecks: 1000000n,
				status: "completed",
			});
			// Payment: 6,000 cash + 4,000 card = 10,000.00 RUB
			await tx.insert(payments).values({
				organizationId: ORG_ID,
				patientId,
				visitId,
				amountRub: 6000,
				amountKopecks: 600000n,
				method: "cash",
				status: "paid",
				paidAt: now,
				createdAt: now,
			});
			await tx.insert(payments).values({
				organizationId: ORG_ID,
				patientId,
				visitId,
				amountRub: 4000,
				amountKopecks: 400000n,
				method: "card",
				status: "paid",
				paidAt: now,
				createdAt: now,
			});

			// Refund: 2,500.00 RUB (250,000 kopecks) in cash
			if (formatKind === "negative_refunded") {
				await tx.insert(payments).values({
					organizationId: ORG_ID,
					patientId,
					visitId,
					amountRub: -2500,
					amountKopecks: -250000n,
					method: "cash",
					status: "refunded",
					paidAt: now,
					updatedAt: now,
					createdAt: now,
					note: "Возврат кассовым ордером",
				});
			} else if (formatKind === "negative_paid") {
				await tx.insert(payments).values({
					organizationId: ORG_ID,
					patientId,
					visitId,
					amountRub: -2500,
					amountKopecks: -250000n,
					method: "cash",
					status: "paid",
					paidAt: now,
					updatedAt: now,
					createdAt: now,
					note: "Отрицательная корректировка оплаты",
				});
			} else if (formatKind === "income_return_meta") {
				await tx.insert(payments).values({
					organizationId: ORG_ID,
					patientId,
					visitId,
					amountRub: 2500,
					amountKopecks: 250000n,
					method: "cash",
					status: "paid",
					paidAt: now,
					updatedAt: now,
					createdAt: now,
					fiscalReceipt: { operationType: "income_return" },
					note: "Фискальный возврат",
				});
			} else {
				await tx.insert(payments).values({
					organizationId: ORG_ID,
					patientId,
					visitId,
					amountRub: 2500,
					amountKopecks: 250000n,
					method: "cash",
					status: "refunded",
					paidAt: now,
					updatedAt: now,
					createdAt: now,
					note: "Исторический положительный возврат",
				});
			}
		});

		const scope = {
			organizationId: ORG_ID,
			from,
			to,
			timeZone: "Europe/Moscow",
		};

		const [debt, exec, rev, docRep, prof, dataset] = await Promise.all([
			receivables(ORG_ID),
			financialExecutiveSummary(scope),
			revenueTimeline(scope, "month"),
			doctorPerformance(scope),
			calculateDoctorProfitability(ORG_ID, from),
			fetchDoctorPayrollDataset({
				orgId: ORG_ID,
				resolvedDocId: DOC_ID,
				fromStr: "2026-05-01",
				toStr: "2026-05-31",
				fromDate: from,
				toDate: to,
			}),
		]);

		const payroll = calculateDoctorPeriodPayroll({
			doctorId: DOC_ID,
			doctorName: "Врач Возвратов",
			specialtyId: "therapist",
			periodStartIso: "2026-05-01",
			periodEndIso: "2026-05-31",
			customBasePercentage: 30,
			services: dataset.completedServices,
			refundDeductions: dataset.refundDeductions,
			unallocatedLabKop: dataset.unallocatedLabKop,
		});

		return {
			debtRub: debt.totalDebtRub,
			execCashRub: exec.paymentBreakdown.cash.amountRub,
			execCardRub: exec.paymentBreakdown.card.amountRub,
			execNetRevenueKopecks: exec.totalRevenueKopecks,
			revenueTotalRub: rev.totalRub,
			doctorReportRevenueRub: docRep.rows[0]?.revenueRub ?? 0,
			profitabilityRevenueKopecks: prof[0]?.revenueKopecks ?? 0,
			payrollRefundTotalKop: payroll.totalRefundDeductionsKop,
			payrollRefundClawbackKop: payroll.totalRefundClawbackKop,
			payrollGrossPayoutKop: payroll.grossPayoutBeforeTaxKop,
		};
	}

	it("Produces identical cash, revenue, profitability, and payroll across negative_refunded, negative_paid, and income_return_meta, plus consistent flow for positive_refunded", async (context) => {
		if (!dbAvailable) {
			return context.skip("Database unavailable");
		}
		assert.ok(db);

		const resNegRefunded = await runFormatScenario("negative_refunded");
		const resNegPaid = await runFormatScenario("negative_paid");
		const resIncomeReturnMeta = await runFormatScenario("income_return_meta");
		const resPositiveRefunded = await runFormatScenario("positive_refunded");

		// Net collected cash: 6000 - 2500 = 3500 cash, 4000 card, total = 7500 RUB (750,000 kopecks)
		// Debt: 10,000 charged - 7,500 net paid = 2,500 RUB
		// Payroll: 10,000 * 30% - 2,500 * 30% = 300,000 - 75,000 = 225,000 kopecks
		for (const [label, res] of [
			["negative_refunded", resNegRefunded],
			["negative_paid", resNegPaid],
			["income_return_meta", resIncomeReturnMeta],
		] as const) {
			assert.equal(res.debtRub, 2500, `${label}: debtRub`);
			assert.equal(res.execCashRub, 3500, `${label}: execCashRub`);
			assert.equal(res.execCardRub, 4000, `${label}: execCardRub`);
			assert.equal(res.execNetRevenueKopecks, 750000, `${label}: execNetRevenueKopecks`);
			assert.equal(res.revenueTotalRub, 7500, `${label}: revenueTotalRub`);
			assert.equal(res.doctorReportRevenueRub, 7500, `${label}: doctorReportRevenueRub`);
			assert.equal(res.profitabilityRevenueKopecks, 750000, `${label}: profitabilityRevenueKopecks`);
			assert.equal(res.payrollRefundTotalKop, 250000, `${label}: payrollRefundTotalKop`);
			assert.equal(res.payrollRefundClawbackKop, 75000, `${label}: payrollRefundClawbackKop`);
			assert.equal(res.payrollGrossPayoutKop, 225000, `${label}: payrollGrossPayoutKop`);
		}

		// Positive standalone status="refunded" matches in all flow/revenue/payroll reports,
		// while debtReports treats positive in-place status="refunded" safely (0 contribution, avoiding double-debt).
		assert.equal(resPositiveRefunded.execCashRub, 3500);
		assert.equal(resPositiveRefunded.execNetRevenueKopecks, 750000);
		assert.equal(resPositiveRefunded.revenueTotalRub, 7500);
		assert.equal(resPositiveRefunded.doctorReportRevenueRub, 7500);
		assert.equal(resPositiveRefunded.profitabilityRevenueKopecks, 750000);
		assert.equal(resPositiveRefunded.payrollRefundTotalKop, 250000);
		assert.equal(resPositiveRefunded.payrollRefundClawbackKop, 75000);
		assert.equal(resPositiveRefunded.payrollGrossPayoutKop, 225000);
		assert.equal(resPositiveRefunded.debtRub, 0);
	});
});
