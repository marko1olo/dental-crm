import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	bonusTransactions,
	cashBoxes,
	cashOperations,
	crmLeads,
	organizations,
	patientBonusBalances,
	patientInvoices,
	patients,
	payments,
	users,
} from "../../db/schema.js";
import { registerLoyaltyRoutes } from "../../routes/loyalty.js";
import { registerMarketingRoutes } from "../../routes/marketing.js";
import { registerPublicBookingRoutes } from "../../routes/publicBooking.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "marketingLoyaltyFirstPrinciples";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ID = fixtureUuid(NAMESPACE, 3);
const INVOICE_ID = fixtureUuid(NAMESPACE, 4);
const CASH_BOX_ID = fixtureUuid(NAMESPACE, 5);

const clinicToken = signToken(
	{ organizationId: ORG_ID, role: "clinic" },
	authTokenSecret(),
	3600,
);
const ORG_HEADERS = {
	"x-dente-clinic-token": clinicToken,
	"x-organization-id": ORG_ID,
};

describe("Marketing, Public Booking & Loyalty First-Principles Integration", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);

			// 1. Seed organization, doctor, cash box, and patient
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: ORG_ID,
					name: "Стоматология Первых Принципов",
					clinicSchedule: {
						monday: { isWorking: true, openMinute: 8 * 60, closeMinute: 22 * 60 },
						tuesday: { isWorking: true, openMinute: 8 * 60, closeMinute: 22 * 60 },
						wednesday: { isWorking: true, openMinute: 8 * 60, closeMinute: 22 * 60 },
						thursday: { isWorking: true, openMinute: 8 * 60, closeMinute: 22 * 60 },
						friday: { isWorking: true, openMinute: 8 * 60, closeMinute: 22 * 60 },
						saturday: { isWorking: true, openMinute: 8 * 60, closeMinute: 22 * 60 },
						sunday: { isWorking: true, openMinute: 8 * 60, closeMinute: 22 * 60 },
					},
				});

				await tx.insert(cashBoxes).values({
					id: CASH_BOX_ID,
					organizationId: ORG_ID,
					name: "Основная касса клиники",
					type: "main",
				});

				await tx.insert(users).values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Айболит Стоматологов",
					role: "doctor",
					email: "doctor.firstprinciples@dental.local",
					isActive: true,
					workingHours: {
						monday: { isWorking: true, startMinute: 8 * 60, endMinute: 22 * 60 },
						tuesday: { isWorking: true, startMinute: 8 * 60, endMinute: 22 * 60 },
						wednesday: { isWorking: true, startMinute: 8 * 60, endMinute: 22 * 60 },
						thursday: { isWorking: true, startMinute: 8 * 60, endMinute: 22 * 60 },
						friday: { isWorking: true, startMinute: 8 * 60, endMinute: 22 * 60 },
						saturday: { isWorking: true, startMinute: 8 * 60, endMinute: 22 * 60 },
						sunday: { isWorking: true, startMinute: 8 * 60, endMinute: 22 * 60 },
					},
				});

				await tx.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Кузнецов Петр Сергеевич",
					phone: "+79998887766",
					status: "active",
				});
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}

		app = createTenantTestApp();
		await registerPublicBookingRoutes(app);
		await registerLoyaltyRoutes(app);
		await registerMarketingRoutes(app);
		await app.ready();
	});

	after(async () => {
		if (databaseAvailable) {
			try {
				await purgeFixtureOrganizations([ORG_ID]);
			} catch (error) {
				if (!isDatabaseUnavailable(error)) throw error;
			}
		}
		await app?.close();
	});

	test("1. Онлайн-запись регистрирует лид в crm_leads и прописывает UTM в профиль пациента", async () => {
		if (!databaseAvailable) return;

		const targetDate = new Date(Date.now() + 24 * 3600 * 1000);
		targetDate.setHours(12, 0, 0, 0);
		const startsAt = targetDate.toISOString();
		targetDate.setMinutes(targetDate.getMinutes() + 30);
		const endsAt = targetDate.toISOString();

		const res = await app.inject({
			method: "POST",
			url: `/${ORG_ID}/book`,
			payload: {
				doctorId: DOCTOR_ID,
				startsAt,
				endsAt,
				patientName: "Смирнова Ольга Ивановна",
				patientPhone: "+79171112233",
				source: "yandex_maps",
				utm_source: "yandex_maps",
				utm_campaign: "autumn_smile",
				comment: "Профгигиена по акции",
			},
		});

		assert.equal(res.statusCode, 200, `Ожидался статус 200, получено: ${res.body}`);
		const body = res.json();
		assert.equal(body.success, true);
		assert.ok(body.appointment?.id);

		// Проверяем, что в crm_leads физически создана запись со статусом consult_booked
		const leads = await db
			.select()
			.from(crmLeads)
			.where(
				and(
					eq(crmLeads.organizationId, ORG_ID),
					eq(crmLeads.phone, "+79171112233"),
				),
			);

		assert.equal(leads.length, 1, "Лид должен быть создан в таблице crm_leads");
		const lead = leads[0];
		assert.ok(lead);
		assert.equal(lead.source, "yandex_maps", "Источник лида должен быть yandex_maps");
		assert.equal(lead.status, "consult_booked", "Статус должен быть consult_booked");
		assert.equal(lead.assignedDoctorId, DOCTOR_ID);

		// Проверяем, что созданный пациент получил UTM-метки в administrativeProfile
		const createdPatients = await db
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ORG_ID),
					eq(patients.phone, "+79171112233"),
				),
			);

		assert.equal(createdPatients.length, 1);
		const createdPatient = createdPatients[0];
		assert.ok(createdPatient);
		const adminProfile = createdPatient.administrativeProfile as Record<string, any>;
		assert.equal(adminProfile?.utmSource, "yandex_maps");
		assert.equal(adminProfile?.utmCampaign, "autumn_smile");
	});

	test("2. Лояльность: списание баллов создает проводку в payments и закрывает инвойс", async () => {
		if (!databaseAvailable) return;

		// 1. Ручное начисление баллов пациенту
		const accrueRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/accrue",
			headers: ORG_HEADERS,
			payload: {
				patientId: PATIENT_ID,
				amountPoints: 2000,
				description: "Приветственные баллы лояльности",
			},
		});

		assert.equal(accrueRes.statusCode, 201, `Ошибка при начислении баллов: ${accrueRes.body}`);
		const accrueBody = accrueRes.json();
		assert.equal(accrueBody.activePoints, 2000);

		// 2. Создаем инвойс на 2 000 руб в базе
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

		// 3. Списываем 2 000 баллов в счет 100% покрытия счета (1 балл = 1 руб)
		const redeemRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/redeem",
			headers: ORG_HEADERS,
			payload: {
				patientId: PATIENT_ID,
				invoiceId: INVOICE_ID,
				invoiceAmountRub: 2000,
				pointsToRedeem: 2000,
				allowFullCoverage: true,
			},
		});

		assert.equal(redeemRes.statusCode, 200, `Ошибка списания баллов: ${redeemRes.body}`);
		const redeemBody = redeemRes.json();
		assert.equal(redeemBody.success, true);
		assert.equal(redeemBody.redeemedPoints, 2000);
		assert.equal(redeemBody.newActivePoints, 0);
		assert.ok(redeemBody.paymentId, "Должен быть создан платеж в кассе");
		assert.equal(redeemBody.invoiceStatusUpdated, true, "Инвойс должен быть закрыт");

		// 4. Проверяем таблицу payments: создан платеж со способом 'other' (бонусы)
		await withFixtureTenant(ORG_ID, async (tx) => {
			const createdPayments = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, ORG_ID),
						eq(payments.documentId, INVOICE_ID),
					),
				);

			assert.equal(createdPayments.length, 1);
			const createdPayment = createdPayments[0];
			assert.ok(createdPayment);
			assert.equal(Number(createdPayment.amountRub), 2000);
			assert.equal(createdPayment.status, "paid");

			// 5. Проверяем таблицу patientInvoices: статус стал 'paid'
			const updatedInvoices = await tx
				.select()
				.from(patientInvoices)
				.where(and(eq(patientInvoices.organizationId, ORG_ID), eq(patientInvoices.id, INVOICE_ID)));

			assert.equal(updatedInvoices.length, 1);
			const updatedInvoice = updatedInvoices[0];
			assert.ok(updatedInvoice);
			assert.equal(updatedInvoice.status, "paid");
			assert.ok(updatedInvoice.paidAt);
		});

		// 6. Начисление кэшбэка через /api/loyalty/accrue-cashback
		const cashbackRes = await app.inject({
			method: "POST",
			url: "/api/loyalty/accrue-cashback",
			headers: ORG_HEADERS,
			payload: {
				patientId: PATIENT_ID,
				paidAmountRub: 5000,
				invoiceId: INVOICE_ID,
				cashbackPercent: 5,
				description: "Кэшбэк 5% за профгигиену",
			},
		});

		assert.equal(cashbackRes.statusCode, 201);
		const cashbackBody = cashbackRes.json();
		assert.equal(cashbackBody.accruedPoints, 250); // 5000 * 5% = 250 баллов
		assert.equal(cashbackBody.activePoints, 250);
	});

	test("3. Сквозная аналитика маркетинга и ROMI без деления на 0 и с реальными расходами", async () => {
		if (!databaseAvailable) return;

		// Засеваем расход на рекламу 2ГИС в кассовую книгу cashOperations
		await db.insert(cashOperations).values({
			organizationId: ORG_ID,
			cashBoxId: CASH_BOX_ID,
			operationType: "expense",
			amountRub: 15000,
			balanceBeforeRub: 50000,
			balanceAfterRub: 35000,
			reasonCode: 6,
			metadata: {
				category: "marketing",
				channelKey: "gis_2",
			},
		});

		// Засеваем платеж пациента, привлеченного через 2ГИС
		const [gisPatient] = await db.insert(patients).values({
			organizationId: ORG_ID,
			fullName: "Семенов Игорь Павлович",
			phone: "+79053334455",
			status: "active",
			administrativeProfile: {
				leadSource: "gis_2",
				utmSource: "gis_2",
			} as any,
		}).returning();

		assert.ok(gisPatient);
		await db.insert(payments).values({
			organizationId: ORG_ID,
			patientId: gisPatient.id,
			amountRub: 45000,
			method: "card",
			status: "paid",
		});

		// Запрашиваем сквозную аналитику
		const res = await app.inject({
			method: "GET",
			url: "/api/marketing/attribution",
			headers: ORG_HEADERS,
		});

		assert.equal(res.statusCode, 200);
		const data = res.json();

		assert.ok(Array.isArray(data.selfBookingChannels));
		const gisChannel = data.selfBookingChannels.find((c: any) => c.key === "gis_2");
		assert.ok(gisChannel, "Канал 2ГИС должен присутствовать в отчете");

		// Затраты 15 000 руб = 1 500 000 коп
		assert.equal(gisChannel.spentKopecks, 1500000);
		// Выручка 45 000 руб = 4 500 000 коп
		assert.equal(gisChannel.revenueKopecks, 4500000);
		// ROMI = (45 000 - 15 000) / 15 000 * 100 = 200%
		assert.equal(gisChannel.romiPercent, 200);
		// CAC = 15 000 руб = 1 500 000 коп
		assert.equal(gisChannel.cacKopecks, 1500000);

		// Проверяем, что нет NaN или Infinity
		for (const ch of data.selfBookingChannels) {
			assert.ok(Number.isFinite(ch.romiPercent));
			assert.ok(Number.isFinite(ch.cacKopecks));
		}
	});
});
