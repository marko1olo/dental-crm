/**
 * apps/api/src/tests/routes/financialExecutiveSummaryIntegrity.test.ts
 *
 * Red Team Integration Tests for Defect [FIN-01]:
 * Phantom Double Revenue Elimination & Cash Inflow vs Deposit Realization Decoupling.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { db } from "../../db/client.js";
import {
	invoices,
	organizations,
	payments,
	patients,
	users,
} from "../../db/schema.js";
import { financialExecutiveSummary } from "../../services/reports/managerReports/financialExecutiveReports.js";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "../support/fixtureOrganizations.js";

describe("FIN-01: Financial Executive Summary Decoupling & Double-Revenue Defense", () => {
	it("clearly separates cash inflow and deposit realization without phantom revenue double-counting", async () => {
		const orgId = fixtureUuid("fin01Report", 1);
		const patientId = fixtureUuid("fin01Report", 2);
		const invoiceId = fixtureUuid("fin01Report", 3);

		await purgeFixtureOrganizations([orgId]);

		const now = new Date();
		const from = new Date(now.getTime() - 24 * 3600 * 1000);
		const to = new Date(now.getTime() + 24 * 3600 * 1000);

		try {
			// 1. Создаем тестовую организацию и пациента
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Честных Финансов Тест",
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Кузнецов Андрей Викторович",
					phone: "+79001112233",
				});
			});

			// 2. Пациент вносит аванс: 50 000 ₽ наличными (cash) и 30 000 ₽ картой (card)
			// Это физический денежный приток в кассу и банк (ДДС), но ещё не выручка от оказанных услуг!
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(payments).values({
					organizationId: orgId,
					patientId,
					amountRub: 50000,
					amountKopecks: 5000000n,
					method: "cash",
					status: "paid",
					paidAt: now,
					clientMutationId: `mut-adv-cash-${Date.now()}`,
					note: "Внесение аванса наличными",
				});
				await tx.insert(payments).values({
					organizationId: orgId,
					patientId,
					amountRub: 30000,
					amountKopecks: 3000000n,
					method: "card",
					status: "paid",
					paidAt: now,
					clientMutationId: `mut-adv-card-${Date.now()}`,
					note: "Внесение аванса банковской картой",
				});
			});

			// 3. Пациенту оказали услуги: выставлен наряд/акт на 40 000 ₽
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(invoices).values({
					id: invoiceId,
					organizationId: orgId,
					patientId,
					totalAmountRub: 40000,
					totalPriceKopecks: 4000000n,
					totalRub: "40000.00",
					status: "paid",
					createdAt: now,
					paidAt: now,
				});
			});

			// 4. Пациент оплачивает наряд 40 000 ₽ с ранее внесенного депозита (method: family_wallet)
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(payments).values({
					organizationId: orgId,
					patientId,
					documentId: invoiceId,
					amountRub: 40000,
					amountKopecks: 4000000n,
					method: "family_wallet",
					status: "paid",
					paidAt: now,
					clientMutationId: `mut-dep-pay-${Date.now()}`,
					note: "Оплата услуг с депозита",
				});
			});

			// 5. Запрашиваем сводный финансовый пульт руководителя
			const report = await financialExecutiveSummary({
				organizationId: orgId,
				from,
				to,
			});

			// ПРОВЕРКА 1: Физический денежный приток в кассу и банк (ДДС)
			// Поступило живыми деньгами: 50 000 ₽ (нал) + 30 000 ₽ (карта) = 80 000 ₽
			assert.equal(report.cashInflowRub, 80000, "cashInflowRub must equal exactly 80 000 ₽");
			assert.equal(report.cashInflowKopecks, 8000000, "cashInflowKopecks must be 8 000 000 kop");

			// ПРОВЕРКА 2: Реализация услуг через списание депозитов
			// Оплачено зачетом аванса: 40 000 ₽
			assert.equal(report.depositRealizedRub, 40000, "depositRealizedRub must equal 40 000 ₽");
			assert.equal(report.depositRealizedKopecks, 4000000, "depositRealizedKopecks must be 4 000 000 kop");

			// ПРОВЕРКА 3: Выручка клиники = кассовый приток (cashInflowRub) + реализованный депозит (depositRealizedRub)
			// Кассовый приток (80 000 ₽) + зачет депозита (40 000 ₽) = 120 000 ₽
			assert.equal(report.totalRevenueRub, 120000, "totalRevenueRub must equal cashInflowRub + depositRealizedRub (120 000 ₽)");
			assert.equal(report.totalRevenueKopecks, 12000000, "totalRevenueKopecks must be 12 000 000 kop");
			assert.equal(report.invoicesCount, 1, "invoicesCount must be 1");
			assert.equal(report.totalInvoicedRub, 40000, "totalInvoicedRub must be 40 000 ₽");

			// ПРОВЕРКА 4: Разбивка платежей
			assert.equal(report.paymentBreakdown.cash.amountRub, 50000);
			assert.equal(report.paymentBreakdown.card.amountRub, 30000);
			assert.equal(report.paymentBreakdown.deposit.amountRub, 40000);
			assert.equal(report.isEmpty, false);
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("correctly calculates direct revenue when no formal invoices were recorded", async () => {
		const orgId = fixtureUuid("fin01Direct", 1);
		const patientId = fixtureUuid("fin01Direct", 2);

		await purgeFixtureOrganizations([orgId]);

		const now = new Date();
		const from = new Date(now.getTime() - 24 * 3600 * 1000);
		const to = new Date(now.getTime() + 24 * 3600 * 1000);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Прямых Платежей Тест",
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Сидоров Иван Петрович",
					phone: "+79003334455",
				});
				// Прямая оплата за услугу в кассу 15 000 ₽ без предварительного инвойса
				await tx.insert(payments).values({
					organizationId: orgId,
					patientId,
					amountRub: 15000,
					amountKopecks: 1500000n,
					method: "cash",
					status: "paid",
					paidAt: now,
					clientMutationId: `mut-dir-cash-${Date.now()}`,
				});
			});

			const report = await financialExecutiveSummary({
				organizationId: orgId,
				from,
				to,
			});

			assert.equal(report.cashInflowRub, 15000);
			assert.equal(report.depositRealizedRub, 0);
			assert.equal(report.totalRevenueRub, 15000);
			assert.equal(report.invoicesCount, 0);
			assert.equal(report.isEmpty, false);
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});

	it("accurately unpacks split-tender payments without dumping everything into cardRub", async () => {
		const orgId = fixtureUuid("fin01Split", 1);
		const patientId = fixtureUuid("fin01Split", 2);

		await purgeFixtureOrganizations([orgId]);

		const now = new Date();
		const from = new Date(now.getTime() - 24 * 3600 * 1000);
		const to = new Date(now.getTime() + 24 * 3600 * 1000);

		try {
			await withFixtureTenant(orgId, async (tx) => {
				await tx.insert(organizations).values({
					id: orgId,
					name: "Клиника Сплит Платежей Тест",
				});
				await tx.insert(patients).values({
					id: patientId,
					organizationId: orgId,
					fullName: "Сплитов Сергей Сергеевич",
					phone: "+79004445566",
				});
				// Сплит-платеж на 60 000 ₽: 20 000 ₽ нал + 30 000 ₽ карта + 10 000 ₽ СБП
				await tx.insert(payments).values({
					organizationId: orgId,
					patientId,
					amountRub: 60000,
					amountKopecks: 6000000n,
					method: "split",
					status: "paid",
					paidAt: now,
					clientMutationId: `mut-split-${Date.now()}`,
					fiscalReceipt: {
						cashKopecks: 2000000,
						cardKopecks: 3000000,
						sbpKopecks: 1000000,
					},
					note: "Сплит-платеж (нал + карта + СБП)",
				});
			});

			const report = await financialExecutiveSummary({
				organizationId: orgId,
				from,
				to,
			});

			// Проверяем честную распаковку сплитов без искажения кассы и ДДС
			assert.equal(report.paymentBreakdown.cash.amountRub, 20000, "Cash tender in split must be 20 000 ₽");
			assert.equal(report.paymentBreakdown.card.amountRub, 30000, "Card tender in split must be 30 000 ₽");
			assert.equal(report.paymentBreakdown.sbp.amountRub, 10000, "SBP tender in split must be 10 000 ₽");
			assert.equal(report.cashInflowRub, 60000, "Total cash inflow must be 60 000 ₽");
			assert.equal(report.totalRevenueRub, 60000, "Total revenue must be 60 000 ₽");
			assert.equal(report.isEmpty, false);
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});
