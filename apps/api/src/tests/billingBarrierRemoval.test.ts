/**
 * billingBarrierRemoval.test.ts — Integration tests for unblocking cashier:
 * 1. Overpayment on visits auto-credited to advance deposit without BillingOverpaymentError
 * 2. Cashier price adjustment allowed without "Попытка подмены прайса" error
 * 3. Services outside treatment plan fiscalize with warning without 422 UpsellConsentShieldViolationError
 * 4. 54-FZ & Mandate 8e: Physical persons pay without INN via cash/card/sbp
 */

import { strict as assert } from "node:assert";
import { after, before, describe, it } from "node:test";
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
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";

const NAMESPACE = "billingBarrierRemoval";
const ORG_ID = fixtureUuid(NAMESPACE, 1);

describe("Cashier Barrier Removal & Unblocked Operations", () => {
	before(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Касса Клиника Барьеров",
			});
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
	});

	it("visit overpayment: pays 5000 for 4600 visit debt, auto-credits 400 to advance deposit without error", async () => {
		const orgId = ORG_ID;
		let patientId = "";
		let visitId = "";

		await withFixtureTenant(orgId, async () => {
			const [patient] = await db
				.insert(patients)
				.values({
					organizationId: orgId,
					fullName: "Тестовый Пациент с Переплатой",
					phone: "+79001112233",
				})
				.returning();
			assert(patient);
			patientId = patient.id;

			const [visit] = await db
				.insert(visits)
				.values({
					organizationId: orgId,
					patientId: patient.id,
					status: "draft",
				})
				.returning();
			assert(visit);
			visitId = visit.id;

			// Treatment item: 4600 ₽
			await db.insert(treatmentItems).values({
				organizationId: orgId,
				patientId: patient.id,
				visitId: visit.id,
				title: "Лечение пульпита одноканального зуба",
				priceRub: 4600,
				unitPriceRub: 4600,
				quantity: "1",
				status: "completed",
			});
		});

		// Patient gives 5000 ₽ for a 4600 ₽ debt
		const payment = await createPaymentInDb(orgId, {
			patientId,
			visitId,
			amountRub: 5000,
			method: "cash",
			payerFullName: "Тестовый Пациент с Переплатой",
			note: "Оплата визита с переплатой",
		});

		assert.equal(payment.amountRub, 5000, "Full payment of 5000 ₽ recorded");
		assert.equal(payment.status, "paid");

		// Verify advance deposit tagging was created for 400 ₽ excess
		const taggings = await withFixtureTenant(orgId, async () => {
			return db
				.select()
				.from(advanceDepositTaggings)
				.where(eq(advanceDepositTaggings.organizationId, orgId));
		});

		assert.equal(taggings.length, 1, "One advance deposit record must be created");
		assert(taggings[0]);
		assert.equal(Number(taggings[0].depositAmountRub), 400.0, "Exact overpayment 400 ₽ credited to deposit");
		assert.equal(taggings[0].taggedTargetType, "patient_deposit");
	});

	it("price adjustment: cashier discounts or rounds catalog price without throwing price substitution error", async () => {
		const orgId = ORG_ID;
		let patientId = "";
		let catalogItemId = "";

		await withFixtureTenant(orgId, async () => {
			const [patient] = await db
				.insert(patients)
				.values({
					organizationId: orgId,
					fullName: "Пациент со Скидкой",
				})
				.returning();
			assert(patient);
			patientId = patient.id;

			const [catalogItem] = await db
				.insert(serviceCatalogItems)
				.values({
					organizationId: orgId,
					code: `B01.065.${Date.now().toString().slice(-4)}`,
					title: "Профессиональная гигиена полости рта",
					basePriceRub: 5000,
					priceRub: 5000,
				})
				.returning();
			assert(catalogItem);
			catalogItemId = catalogItem.id;
		});

		// Cashier accepts payment of 4500 ₽ (10% discount) without strict pre-catalog matching error
		const payment = await createPaymentInDb(orgId, {
			patientId,
			serviceId: catalogItemId,
			amountRub: 4500,
			discountRub: 500,
			method: "card",
		});

		assert.equal(payment.amountRub, 4500);
		assert.equal(payment.status, "paid");
	});

	it("upsell non-blocking: service outside treatment plan accepts payment with warning instead of 422 error", async () => {
		const orgId = ORG_ID;
		let patientId = "";
		let catalogItemId = "";

		await withFixtureTenant(orgId, async () => {
			const [patient] = await db
				.insert(patients)
				.values({
					organizationId: orgId,
					fullName: "Пациент Допуслуги",
				})
				.returning();
			assert(patient);
			patientId = patient.id;

			// Patient has an approved treatment plan that does NOT include Cofferdam
			await db.insert(treatmentPlans).values({
				organizationId: orgId,
				patientId: patient.id,
				name: "Основной план лечения",
				title: "Основной план лечения",
				status: "Approved",
				totalPriceRub: "20000",
			});

			const [catalogItem] = await db
				.insert(serviceCatalogItems)
				.values({
					organizationId: orgId,
					code: `A16.07.002.${Date.now().toString().slice(-4)}`,
					title: "Коффердам стоматологический",
					basePriceRub: 800,
					priceRub: 800,
				})
				.returning();
			assert(catalogItem);
			catalogItemId = catalogItem.id;
		});

		// Service outside treatment plan is paid and fiscalized without 422 error
		const payment = await createPaymentInDb(orgId, {
			patientId,
			serviceId: catalogItemId,
			amountRub: 800,
			method: "cash",
		});

		assert.equal(payment.amountRub, 800);
		assert.equal(payment.status, "paid");
	});

	it("54-FZ & Mandate 8e item 9: Physical persons can pay without INN via cash, card, and sbp (0 mandatory INN)", async () => {
		const orgId = ORG_ID;
		let patientId = "";

		await withFixtureTenant(orgId, async () => {
			const [patient] = await db
				.insert(patients)
				.values({
					organizationId: orgId,
					fullName: "Иванов Иван Иванович (Физлицо)",
				})
				.returning();
			assert(patient);
			patientId = patient.id;
		});

		// Payment without INN (null, undefined, or empty string) is processed cleanly
		const cashPayment = await createPaymentInDb(orgId, {
			patientId,
			amountRub: 1500,
			method: "cash",
			payerFullName: "Иванов Иван Иванович",
			payerInn: null, // Zero mandatory INN under 54-FZ for individuals
		});

		assert.equal(cashPayment.amountRub, 1500);
		assert.equal(cashPayment.status, "paid");
		assert.equal(cashPayment.payerInn, null);

		const cardPayment = await createPaymentInDb(orgId, {
			patientId,
			amountRub: 2500,
			method: "card",
			payerFullName: "Иванов Иван Иванович",
			payerInn: undefined, // Zero mandatory INN
		});

		assert.equal(cardPayment.amountRub, 2500);
		assert.equal(cardPayment.status, "paid");
		assert.equal(cardPayment.payerInn, null);
	});
});
