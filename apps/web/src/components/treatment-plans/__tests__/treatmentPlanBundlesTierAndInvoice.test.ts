/**
 * treatmentPlanBundlesTierAndInvoice.test.ts — применение пакетов к тарифу и касса 54-ФЗ.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import { parseKopecks } from "@dental/shared";
import {
	applyClinicalBundleToTier,
	createBundleInvoiceExport,
	createBundleInvoiceItems,
} from "../treatmentPlanBundlesEngine";
import { initialTestTier } from "./helpers/bundlesTestHelpers";

describe("treatmentPlanBundlesEngine — Применение к тарифу и касса 54-ФЗ", () => {
	test("пересчитывает общие суммы тарифа, вычет НДФЛ 13% и рассрочку 0%", () => {
		const updatedTier = applyClinicalBundleToTier(initialTestTier, "implant_turnkey", 36);

		assert.equal(updatedTier.totalRub, 41500);
		assert.equal(updatedTier.totalKopecks, parseKopecks(41500));
		assert.equal(updatedTier.itemsCount, 4);

		assert.ok(updatedTier.ndflDetails);
		assert.equal(updatedTier.ndflDetails.code, "02");
		assert.equal(updatedTier.ndflDetails.isHighCostCode02, true);
		const expectedRefund13 = Math.round(41500 * 0.13);
		assert.equal(updatedTier.ndflRefundRub, expectedRefund13);
		assert.equal(updatedTier.priceWithNdflRefundRub, 41500 - expectedRefund13);

		assert.ok(updatedTier.monthlyInstallment12Rub > 0);
		assert.equal(updatedTier.installments[12].monthlyPaymentRub, Math.round(41500 / 12));
		const sumParts12 = updatedTier.installments[12].partsKopecks.reduce((acc, p) => acc + p, 0);
		assert.equal(sumParts12, updatedTier.totalKopecks);

		const sched = updatedTier.stagedSchedule!;
		assert.ok(sched);
		assert.equal(sched.isBalanced, true);
		const sumKopecksSched =
			sched.stage1AdvanceTherapyKopecks +
			sched.stage2SurgeryImplantKopecks +
			sched.stage3OrthopedicsKopecks;
		assert.equal(sumKopecksSched, updatedTier.totalKopecks);
		assert.equal(sched.totalKopecks, updatedTier.totalKopecks);
	});

	test("createBundleInvoiceItems формирует валидные элементы счета с категориями", () => {
		const items = createBundleInvoiceItems("extraction_turnkey", { toothNumber: 38 });
		assert.equal(items.length, 5);
		for (const it of items) {
			assert.equal(it.category, "surgery");
			assert.equal(it.toothNumber, 38);
			assert.ok(it.priceRub > 0);
			assert.ok(it.code804n?.startsWith("A"));
		}
	});

	test("createBundleInvoiceExport формирует полный пакет данных кассы 54-ФЗ с учетом скидки", () => {
		const invoice = createBundleInvoiceExport("caries_turnkey", {
			toothNumber: 16,
			patientId: "pat-123",
			patientName: "Сидоров С.С.",
			discountPercent: 10,
		});

		assert.equal(invoice.patientId, "pat-123");
		assert.equal(invoice.patientName, "Сидоров С.С.");
		assert.equal(invoice.grossTotalRub, 7500);
		assert.equal(invoice.discountRub, 750);
		assert.equal(invoice.netTotalRub, 6750);
		assert.equal(invoice.netTotalKopecks, parseKopecks(6750));
		assert.ok(invoice.items.length === 4);
		assert.ok(invoice.invoiceNumber?.startsWith("ПАКЕТ-"));
	});
});
