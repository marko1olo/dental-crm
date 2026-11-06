/**
 * cashInstallmentsPartialPay.test.ts — Интеграционный тест частичной оплаты транша рассрочки (PLN-03)
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
	cashBoxes,
	organizations,
	patients,
	users,
} from "../db/schema.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import { registerCashboxRoutes } from "./cashbox.js";
import {
	fixtureUuid,
	withFixtureTenant,
	purgeFixtureOrganizations,
} from "../tests/support/fixtureOrganizations.js";
import { createTenantTestApp } from "../tests/support/tenantTestApp.js";

async function buildTestApp() {
	process.env.NODE_ENV = "test";
	const app = createTenantTestApp();
	await registerCashboxRoutes(app);
	await app.ready();
	return app;
}

function createStaffHeaders(organizationId: string, userId: string, role = "admin") {
	const token = signToken(
		{ organizationId, userId, role },
		authTokenSecret(),
	);
	return {
		"x-dente-staff-token": token,
	};
}

describe("PLN-03: Partial installment tranche payment and debt reduction", () => {
	it("processes partial tranche payment: decreases tranche debt, keeps isPaid: false, records actual amount in cash box, and completes tranche on final payment", async () => {
		const app = await buildTestApp();

		const orgId = fixtureUuid("instPartialTest", 1);
		const userId = fixtureUuid("instPartialTest", 2);
		const patientId = fixtureUuid("instPartialTest", 3);

		await purgeFixtureOrganizations([orgId]);

		await withFixtureTenant(orgId, async (tx) => {
			await tx.insert(organizations).values({
				id: orgId,
				name: `Клиника Рассрочки Тест-${Date.now()}`,
			});
			await tx.insert(users).values({
				id: userId,
				organizationId: orgId,
				fullName: "Главный Врач / Кассир",
				role: "admin",
				email: `inst-partial-${Date.now()}@dental.ru`,
			});
			await tx.insert(patients).values({
				id: patientId,
				organizationId: orgId,
				fullName: "Кузнецов Алексей Петрович",
				phone: "+79997654321",
			});
		});

		try {
			const headers = createStaffHeaders(orgId, userId, "admin");

			// 1. Создаем договор рассрочки на 60 000 ₽ на 6 месяцев без первоначального взноса (по 10 000 ₽ / мес)
			const createRes = await app.inject({
				method: "POST",
				url: "/api/installments",
				headers,
				payload: {
					patientId,
					totalAmountRub: 60000,
					downPaymentRub: 0,
					monthsCount: 6,
					notes: "Курс элайнеров 60к в рассрочку",
				},
			});
			assert.equal(createRes.statusCode, 201);
			const createJson = createRes.json();
			assert.equal(createJson.success, true);
			assert.equal(createJson.tranches.length, 6);

			const firstTranche = createJson.tranches[0];
			assert.equal(firstTranche.amountRub, 10000);
			assert.equal(firstTranche.isPaid, false);

			// 2. Частичная оплата 3 500 ₽ (350 000 копеек) из первого взноса 10 000 ₽
			const partialPayRes = await app.inject({
				method: "POST",
				url: `/api/installments/tranches/${firstTranche.id}/pay`,
				headers,
				payload: {
					amountPaidKopecks: 350000, // 3 500 ₽
				},
			});
			assert.equal(partialPayRes.statusCode, 200);
			const partialJson = partialPayRes.json();
			assert.equal(partialJson.success, true);
			assert.equal(partialJson.isFullyPaid, false, "Взнос не должен считаться полностью оплаченным");
			assert.equal(partialJson.paymentRub, 3500, "В кассу должно поступить ровно 3 500 ₽");

			// Проверка состояния транша после частичной оплаты
			assert.equal(partialJson.tranche.isPaid, false, "isPaid обязан быть false при частичной оплате");
			assert.equal(partialJson.tranche.status, "partially_paid", "Статус транша обязан быть partially_paid");
			assert.equal(partialJson.tranche.amountRub, 6500, "Остаток долга по взносу должен уменьшиться до 6 500 ₽");

			// Проверка договора рассрочки
			assert.equal(partialJson.contract.paidAmountRub, 3500, "Оплачено по договору должно быть 3 500 ₽");
			assert.equal(partialJson.contract.remainingAmountRub, 56500, "Остаток по договору: 60 000 - 3 500 = 56 500 ₽");
			assert.equal(partialJson.contract.status, "active", "Договор остается active");

			// Проверка кассовой операции
			assert.equal(partialJson.cashOperation.amountRub, 3500, "Кассовый ордер оформляется строго на фактически внесенную сумму");

			// 3. Доплата оставшихся 6 500 ₽ (650 000 копеек)
			const finalPayRes = await app.inject({
				method: "POST",
				url: `/api/installments/tranches/${firstTranche.id}/pay`,
				headers,
				payload: {
					amountPaidKopecks: 650000, // 6 500 ₽
				},
			});
			assert.equal(finalPayRes.statusCode, 200);
			const finalJson = finalPayRes.json();
			assert.equal(finalJson.success, true);
			assert.equal(finalJson.isFullyPaid, true, "Взнос теперь полностью закрыт");
			assert.equal(finalJson.paymentRub, 6500, "В кассу поступило 6 500 ₽");

			// Транш закрыт
			assert.equal(finalJson.tranche.isPaid, true, "isPaid обязан стать true при 100% выплате");
			assert.equal(finalJson.tranche.status, "paid", "Статус транша стал paid");

			// Договор обновился
			assert.equal(finalJson.contract.paidAmountRub, 10000, "Всего по договору оплачено 10 000 ₽");
			assert.equal(finalJson.contract.remainingAmountRub, 50000, "Остаток долга по договору: 50 000 ₽");
		} finally {
			await purgeFixtureOrganizations([orgId]);
		}
	});
});
