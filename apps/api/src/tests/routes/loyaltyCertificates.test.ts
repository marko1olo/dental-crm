import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	giftCertificates,
	organizations,
	patientInvoices,
	patients,
	payments,
} from "../../db/schema.js";
import { registerLoyaltyRoutes } from "../../routes/loyalty.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "loyaltyCertificatesTest";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 2);
const INVOICE_ID = fixtureUuid(NAMESPACE, 3);

const clinicToken = signToken(
	{ organizationId: ORG_ID, role: "clinic" },
	authTokenSecret(),
	3600,
);
const ORG_HEADERS = {
	"x-dente-clinic-token": clinicToken,
	"x-organization-id": ORG_ID,
};

describe("Loyalty Gift Certificates — Statutory 54-FZ & Luhn Modulo-10 Integration", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);

			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Стоматология Подарочных Сертификатов",
				});

				await tx.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Соколова Марина Владимировна",
					phone: "+79051234567",
					status: "active",
				});
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}

		app = createTenantTestApp();

		await registerLoyaltyRoutes(app);
		await app.ready();
	});

	test("1. Выпуск подарочного сертификата с 16-значным Luhn-номером и сохранением в БД", async () => {
		if (!databaseAvailable) return;

		const issueRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/certificates/issue",
			headers: ORG_HEADERS,
			payload: {
				purchaserPatientId: PATIENT_ID,
				purchaserName: "Соколова Марина Владимировна",
				recipientName: "Петров Сергей",
				nominalRub: 5000,
				expiresInDays: 365,
			},
		});

		assert.equal(issueRes.statusCode, 201, `Ошибка выпуска сертификата: ${issueRes.body}`);
		const body = issueRes.json();
		assert.equal(body.success, true);
		assert.ok(body.certificate.id);
		assert.match(body.certificate.serialNumber, /^7701-\d{4}-\d{4}-\d{4}$/);
		assert.equal(body.certificate.nominalRub, 5000);
		assert.equal(body.certificate.currentBalanceRub, 5000);
		assert.equal(body.certificate.status, "active");

		// Проверка записи в БД
		await withFixtureTenant(ORG_ID, async (tx) => {
			const [cert] = await tx
				.select()
				.from(giftCertificates)
				.where(
					and(
						eq(giftCertificates.organizationId, ORG_ID),
						eq(giftCertificates.id, body.certificate.id),
					),
				);
			assert.ok(cert);
			assert.equal(Number(cert.nominalRub), 5000);
			assert.equal(Number(cert.currentBalanceRub), 5000);
			assert.equal(cert.recipientName, "Петров Сергей");

			// Проверка создания авансового платежа по 54-ФЗ
			const createdPayments = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.patientId, PATIENT_ID),
					),
				);
			assert.ok(createdPayments.length >= 1);
		});
	});

	test("2. Проверка сертификата и валидация контрольной суммы Luhn", async () => {
		if (!databaseAvailable) return;

		// Выпускаем сертификат
		const issueRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/certificates/issue",
			headers: ORG_HEADERS,
			payload: {
				nominalRub: 10000,
				recipientName: "Орлова Ольга",
			},
		});
		assert.equal(issueRes.statusCode, 201);
		const serial = issueRes.json().certificate.serialNumber;

		// Проверка корректного номера
		const verifyRes = await app.inject({
			method: "GET",
			url: `/api/loyalty/certificates/verify/${serial}`,
			headers: ORG_HEADERS,
		});
		assert.equal(verifyRes.statusCode, 200);
		const verifyBody = verifyRes.json();
		assert.equal(verifyBody.valid, true);
		assert.equal(verifyBody.certificate.nominalRub, 10000);

		// Проверка поврежденного номера (ошибка контрольной суммы)
		const invalidSerial = "7701-1111-2222-3333";
		const invalidRes = await app.inject({
			method: "GET",
			url: `/api/loyalty/certificates/verify/${invalidSerial}`,
			headers: ORG_HEADERS,
		});
		assert.equal(invalidRes.statusCode, 400);
	});

	test("3. Списание сертификата (частичное и полное) с фискальным тегом 1215 (зачёт аванса)", async () => {
		if (!databaseAvailable) return;

		// Выпускаем сертификат на 3 000 руб
		const issueRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/certificates/issue",
			headers: ORG_HEADERS,
			payload: {
				nominalRub: 3000,
				recipientName: "Тестовый Пациент",
			},
		});
		assert.equal(issueRes.statusCode, 201);
		const serial = issueRes.json().certificate.serialNumber;

		// Создаем счет на 2 000 руб
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(patientInvoices).values({
				id: INVOICE_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				totalAmountRub: 2000,
				totalRub: "2000",
				status: "issued",
			});
		});

		// 1. Частичное списание: списываем 2 000 из 3 000 руб
		const redeemRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/certificates/redeem",
			headers: ORG_HEADERS,
			payload: {
				serialNumber: serial,
				invoiceId: INVOICE_ID,
				invoiceAmountRub: 2000,
				amountToRedeemRub: 2000,
				patientId: PATIENT_ID,
			},
		});
		assert.equal(redeemRes.statusCode, 200, `Ошибка списания: ${redeemRes.body}`);
		const redeemBody = redeemRes.json();
		assert.equal(redeemBody.success, true);
		assert.equal(redeemBody.redeemedAmountRub, 2000);
		assert.equal(redeemBody.newBalanceRub, 1000);
		assert.equal(redeemBody.status, "active");
		assert.equal(redeemBody.invoicePaid, true);
		assert.equal(redeemBody.fiscal54FzSplit.tag1215AdvanceOffsetKop, 200000);

		// 2. Полное исчерпание остатка (1 000 руб)
		const secondRedeemRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/certificates/redeem",
			headers: ORG_HEADERS,
			payload: {
				serialNumber: serial,
				invoiceAmountRub: 1500,
				amountToRedeemRub: 1000,
			},
		});
		assert.equal(secondRedeemRes.statusCode, 200);
		const secondBody = secondRedeemRes.json();
		assert.equal(secondBody.success, true);
		assert.equal(secondBody.redeemedAmountRub, 1000);
		assert.equal(secondBody.newBalanceRub, 0);
		assert.equal(secondBody.status, "depleted");

		// 3. Попытка списания с исчерпанного сертификата должна отклоняться
		const depletedRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/certificates/redeem",
			headers: ORG_HEADERS,
			payload: {
				serialNumber: serial,
				invoiceAmountRub: 500,
			},
		});
		assert.equal(depletedRes.statusCode, 400);
	});
});
