import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { cashBoxes, labOrders, organizations, patients, users } from "../../db/schema.js";
import { registerCashLabPaymentRoutes } from "../../routes/cashLabPaymentRoutes.js";
import { registerLabRoutes } from "../../routes/lab.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";
import { calculateLabWageDeductionKopecks } from "@dental/shared";

const NAMESPACE = "cashLabPayKop";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ID = fixtureUuid(NAMESPACE, 3);
const CASHBOX_ID = fixtureUuid(NAMESPACE, 4);
const ORDER_ID = fixtureUuid(NAMESPACE, 5);

describe("Связка наряда лаборатории с кассой (amountKopecks) и зарплатой Т-51", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseReady = true;

	before(async () => {
		process.env.NODE_ENV = "test";
		try {
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db.insert(organizations).values({
				id: ORGANIZATION_ID,
				name: "Клиника связки ЗТЛ с кассой",
			}).onConflictDoNothing();

			await db.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORGANIZATION_ID,
				fullName: "Д-р Ортопедов И. И.",
				role: "doctor",
			}).onConflictDoNothing();

			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORGANIZATION_ID,
				fullName: "Пациент с коронкой",
				status: "active",
			}).onConflictDoNothing();

			await db.insert(cashBoxes).values({
				id: CASHBOX_ID,
				organizationId: ORGANIZATION_ID,
				name: "Расчетный счет ЗТЛ",
				type: "account",
				balanceRub: 100000,
			}).onConflictDoNothing();

			await db.insert(labOrders).values({
				id: ORDER_ID,
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_ID,
				doctorId: DOCTOR_ID,
				doctorName: "Д-р Ортопедов И. И.",
				secureToken: "sec-token-ztl-001",
				toothFdi: "16",
				material: "ZrO2 Katana",
				priceRub: 24000,
				labCostRub: 7500,
				status: "received",
			}).onConflictDoNothing();
		});

		staffToken = signToken(
			{ organizationId: ORGANIZATION_ID, userId: DOCTOR_ID, role: "admin" },
			authTokenSecret(),
		);

		app = createTenantTestApp();
		await registerLabRoutes(app);
		await registerCashLabPaymentRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
	});

	test("1. POST /api/lab-orders/:id/pay принимает amountKopecks и проводит расход по статье 11", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/lab-orders/${ORDER_ID}/pay`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
			payload: {
				cashBoxId: CASHBOX_ID,
				amountKopecks: 750000, // 7 500.00 ₽ себестоимость технику
				notes: "Оплата коронки Katana 16",
			},
		});

		assert.equal(res.statusCode, 200, `Оплата вернула статус ${res.statusCode}: ${res.body}`);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.equal(json.amountKopecks, 750000);
		assert.equal(json.cashOperation.amountRub, 7500);

		// Проверяем списание в кассе
		const [box] = await withFixtureTenant(ORGANIZATION_ID, async (tx) =>
			tx.select().from(cashBoxes).where(sql`id = ${CASHBOX_ID}::uuid`),
		);
		assert.equal(Number(box?.balanceRub), 92500, "Баланс кассы уменьшился ровно на 7 500 ₽");
	});

	test("2. Удержание ЗТЛ автоматически вычитается из базы сдельной оплаты ортопеда (Т-51)", () => {
		const wage = calculateLabWageDeductionKopecks({
			patientPriceKopecks: 2400000, // 24 000 ₽ с пациента
			labCostKopecks: 750000,       // 7 500 ₽ технику ЗТЛ
			doctorSharePercent: 25,       // 25% ортопеду
		});

		// Чистая база: 24 000 - 7 500 = 16 500 ₽ (1 650 000 копеек)
		assert.equal(wage.doctorWageBaseKopecks, 1650000);
		// ЗП врача 25% от 16 500 = 4 125 ₽ (412 500 копеек)
		assert.equal(wage.doctorWageKopecks, 412500);
		// Маржа клиники: 16 500 - 4 125 = 12 375 ₽
		assert.equal(wage.clinicMarginKopecks, 1237500);
		assert.equal(wage.isBalanced, true);
	});

	test("3. Гарантийный наряд (isWarranty = true) не списывает ЗТЛ с врача (Мандат 8e)", () => {
		const wageWarranty = calculateLabWageDeductionKopecks({
			patientPriceKopecks: 0,
			labCostKopecks: 750000,
			doctorSharePercent: 25,
			isWarranty: true,
		});

		assert.equal(wageWarranty.doctorWageBaseKopecks, 0);
		assert.equal(wageWarranty.doctorWageKopecks, 0);
		assert.equal(wageWarranty.clinicMarginKopecks, -750000);
		assert.equal(wageWarranty.isBalanced, true);
	});

	test("4. POST /api/lab-orders/:id/mark-installed намертво фиксирует наряд", async (t) => {
		if (!databaseReady) return t.skip("база недоступна");

		const res = await app.inject({
			method: "POST",
			url: `/api/lab-orders/${ORDER_ID}/mark-installed`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
			payload: {
				clinicalNotes: "Коронка установлена на цемент Fuji I, контакты проверены копиркой 12мкм",
			},
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.body);
		assert.equal(json.labOrder.isLockedInstalled, true);
		assert.equal(json.labOrder.status, "completed");
	});
});
