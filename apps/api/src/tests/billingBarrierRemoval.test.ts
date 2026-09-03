/**
 * billingBarrierRemoval.test.ts — Integration tests for unblocking cashier:
 * 1. Overpayment on visits auto-credited to advance deposit without BillingOverpaymentError
 * 2. Cashier price adjustment allowed without "Попытка подмены прайса" error
 * 3. Services outside treatment plan fiscalize with warning without 422 UpsellConsentShieldViolationError
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	advanceDepositTaggings,
	organizations,
	patients,
	serviceCatalogItems,
	treatmentItems,
	treatmentPlans,
	visits,
} from "../db/schema.js";
import { createPaymentInDb } from "../db/billingQuery.js";

describe("Cashier Barrier Removal & Unblocked Operations", () => {
	it("visit overpayment: pays 5000 for 4600 visit debt, auto-credits 400 to advance deposit without error", async () => {
		const [org] = await db
			.insert(organizations)
			.values({
				name: `Касса Клиника-${Date.now()}`,
			})
			.returning();

		const [patient] = await db
			.insert(patients)
			.values({
				organizationId: org.id,
				fullName: "Тестовый Пациент с Переплатой",
				phone: "+79001112233",
			})
			.returning();

		const [visit] = await db
			.insert(visits)
			.values({
				organizationId: org.id,
				patientId: patient.id,
				status: "draft",
			})
			.returning();

		// Treatment item: 4600 ₽
		await db.insert(treatmentItems).values({
			organizationId: org.id,
			patientId: patient.id,
			visitId: visit.id,
			title: "Лечение пульпита одноканального зуба",
			priceRub: 4600,
			unitPriceRub: 4600,
			quantity: 1,
			status: "completed",
		});

		// Patient gives 5000 ₽ for a 4600 ₽ debt
		const payment = await createPaymentInDb(org.id, {
			patientId: patient.id,
			visitId: visit.id,
			amountRub: 5000,
			method: "cash",
			payerFullName: "Тестовый Пациент с Переплатой",
			note: "Оплата визита с переплатой",
		});

		assert.equal(payment.amountRub, 5000, "Full payment of 5000 ₽ recorded");
		assert.equal(payment.status, "paid");

		// Verify advance deposit tagging was created for 400 ₽ excess
		const taggings = await db
			.select()
			.from(advanceDepositTaggings)
			.where(eq(advanceDepositTaggings.organizationId, org.id));

		assert.equal(taggings.length, 1, "One advance deposit record must be created");
		assert.equal(Number(taggings[0].depositAmountRub), 400.0, "Exact overpayment 400 ₽ credited to deposit");
		assert.equal(taggings[0].taggedTargetType, "patient_deposit");
	});

	it("price adjustment: cashier discounts or rounds catalog price without throwing price substitution error", async () => {
		const [org] = await db
			.insert(organizations)
			.values({
				name: `Касса Скидка-${Date.now()}`,
			})
			.returning();

		const [patient] = await db
			.insert(patients)
			.values({
				organizationId: org.id,
				fullName: "Пациент со Скидкой",
			})
			.returning();

		const [catalogItem] = await db
			.insert(serviceCatalogItems)
			.values({
				organizationId: org.id,
				code: `B01.065.${Date.now().toString().slice(-4)}`,
				title: "Профессиональная гигиена полости рта",
				basePriceRub: 5000,
				priceRub: 5000,
			})
			.returning();

		// Cashier accepts payment of 4500 ₽ (10% discount) without strict pre-catalog matching error
		const payment = await createPaymentInDb(org.id, {
			patientId: patient.id,
			serviceId: catalogItem.id,
			amountRub: 4500,
			discountRub: 500,
			method: "card",
		});

		assert.equal(payment.amountRub, 4500);
		assert.equal(payment.status, "paid");
	});

	it("upsell non-blocking: service outside treatment plan accepts payment with warning instead of 422 error", async () => {
		const [org] = await db
			.insert(organizations)
			.values({
				name: `Касса Аддендум-${Date.now()}`,
			})
			.returning();

		const [patient] = await db
			.insert(patients)
			.values({
				organizationId: org.id,
				fullName: "Пациент Допуслуги",
			})
			.returning();

		// Patient has an approved treatment plan that does NOT include Cofferdam
		await db.insert(treatmentPlans).values({
			organizationId: org.id,
			patientId: patient.id,
			name: "Основной план лечения",
			title: "Основной план лечения",
			status: "Approved",
			totalPriceRub: 20000,
		});

		const [catalogItem] = await db
			.insert(serviceCatalogItems)
			.values({
				organizationId: org.id,
				code: `A16.07.002.${Date.now().toString().slice(-4)}`,
				title: "Коффердам стоматологический",
				basePriceRub: 800,
				priceRub: 800,
			})
			.returning();

		// Service outside treatment plan is paid and fiscalized without 422 error
		const payment = await createPaymentInDb(org.id, {
			patientId: patient.id,
			serviceId: catalogItem.id,
			amountRub: 800,
			method: "cash",
		});

		assert.equal(payment.amountRub, 800);
		assert.equal(payment.status, "paid");
	});
});
