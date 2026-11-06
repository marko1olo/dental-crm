import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	treatmentPlans,
	treatmentPlanStages,
	treatmentPlanItemsNew,
	users,
	auditEvents,
} from "../../db/schema.js";
import { treatmentPlanRoutes } from "../../routes/treatmentPlanRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";
import {
	PLAN_TIER_CONFIGS,
	isMicroConsumable,
	splitKopecks,
	type Kopecks,
} from "@dental/shared";
import {
	generate0PercentInstallmentSchedule,
	validatePlanToInvoice,
	type PlanItemForValidation,
	type PlanToInvoiceValidationPayload,
} from "@dental/shared/finance";
import { eq, and } from "drizzle-orm";

const FIXTURE = "studioPep";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const PATIENT_ID = fixtureUuid(FIXTURE, 2);
const DOCTOR_ID = fixtureUuid(FIXTURE, 3);

describe("Treatment Plan Studio, 3-Tier Comparison, Kopeck Math & PEP Digital Signature API", () => {
	let app: FastifyInstance;
	let databaseReady = true;
	let testHeaders: Record<string, string>;

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника ДЕНТЕ Студия Планов и ПЭП",
			}).onConflictDoNothing();

			await db.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				fullName: "Д-р Орлов А.В. (Главный врач)",
				role: "doctor",
				specialties: ["Ортопедия", "Имплантология", "Хирургия"],
				isActive: true,
			}).onConflictDoNothing();

			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Смирнова Екатерина Васильевна",
				phone: "+79998887766",
			}).onConflictDoNothing();
		});

		app = createTenantTestApp();
		await app.register(treatmentPlanRoutes);
		await app.ready();

		const signed = signToken(
			{
				userId: DOCTOR_ID,
				organizationId: ORG_ID,
				role: "doctor",
			},
			authTokenSecret(),
		);

		testHeaders = {
			authorization: `Bearer ${signed}`,
			"x-dente-staff-token": signed,
			"x-dente-organization-id": ORG_ID,
		};
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	// =========================================================================
	// 1. CRUD: Создание, чтение, список и обновление планов лечения в БД
	// =========================================================================
	test("1. CRUD: POST /api/treatment-plans creates structured 3-stage plan and persists items", async () => {
		if (!databaseReady) return;

		const response = await app.inject({
			method: "POST",
			url: "/api/treatment-plans",
			headers: testHeaders,
			payload: {
				patientId: PATIENT_ID,
				doctorId: DOCTOR_ID,
				name: "Комплексная тотальная реабилитация ВЧ/НЧ",
				title: "План протезирования и имплантации",
				notes: "Клиническая ситуация: вторичная адентия 16, 46, глубокий прикус.",
				stages: [
					{
						stageOrder: 1,
						stageName: "Этап 1: Профессиональная гигиена и санация",
						completionPercentage: 0,
						items: [
							{
								priceId: "A16.07.051",
								name: "Профессиональная ультразвуковая гигиена и AirFlow",
								toothNumber: null,
								quantity: 1,
								price: 6500,
								discount: 500,
							},
							{
								priceId: "A16.07.002",
								name: "Пломбирование зуба светоотверждаемым нанокомпозитом",
								toothNumber: 15,
								quantity: 1,
								price: 8000,
								discount: 0,
							},
						],
					},
					{
						stageOrder: 2,
						stageName: "Этап 2: Хирургия и дентальная имплантация",
						completionPercentage: 0,
						items: [
							{
								priceId: "A16.07.054",
								name: "Установка дентального имплантата Straumann Roxolid SLActive",
								toothNumber: 16,
								quantity: 1,
								price: 55000,
								discount: 0,
							},
							{
								priceId: "A16.07.054.1",
								name: "Установка дентального имплантата Straumann Roxolid SLActive",
								toothNumber: 46,
								quantity: 1,
								price: 55000,
								discount: 0,
							},
						],
					},
					{
						stageOrder: 3,
						stageName: "Этап 3: Ортопедия и протезирование на диоксиде циркония",
						completionPercentage: 0,
						items: [
							{
								priceId: "A16.07.004",
								name: "Коронка из многослойного диоксида циркония Katana HTML",
								toothNumber: 16,
								quantity: 1,
								price: 35000,
								discount: 2000,
							},
							{
								priceId: "A16.07.004.1",
								name: "Коронка из многослойного диоксида циркония Katana HTML",
								toothNumber: 46,
								quantity: 1,
								price: 35000,
								discount: 2000,
							},
						],
					},
				],
			},
		});

		assert.equal(response.statusCode, 201, `Create failed: ${response.body}`);
		const body = JSON.parse(response.body);
		assert.equal(body.success, true);
		assert.ok(body.treatmentPlan?.id);
		assert.equal(body.treatmentPlan.name, "Комплексная тотальная реабилитация ВЧ/НЧ");
		assert.equal(body.treatmentPlan.status, "Draft");

		// Математика сметы:
		// Stage 1: (6500 - 500) + 8000 = 14000
		// Stage 2: 55000 + 55000 = 110000
		// Stage 3: (35000 - 2000) + (35000 - 2000) = 66000
		// Итого: 14000 + 110000 + 66000 = 190000 ₽
		assert.equal(Number(body.treatmentPlan.totalPriceRub), 190000);
		assert.equal(body.stages?.length, 3);
		assert.equal(body.itemsCount, 6);

		// Проверяем чтение плана через GET /api/treatment-plans/:id
		const getRes = await app.inject({
			method: "GET",
			url: `/api/treatment-plans/${body.treatmentPlan.id}`,
			headers: testHeaders,
		});
		assert.equal(getRes.statusCode, 200);
		const getBody = JSON.parse(getRes.body);
		assert.equal(getBody.success, true);
		assert.equal(getBody.plan.id, body.treatmentPlan.id);
		assert.equal(getBody.plan.items.length, 6);

		// Проверяем PATCH этапа на 100% готовности
		const stage1 = body.stages[0];
		const patchStageRes = await app.inject({
			method: "PATCH",
			url: `/api/treatment-plans/${body.treatmentPlan.id}/stages/${stage1.id}`,
			headers: testHeaders,
			payload: {
				status: "completed",
				completionPercentage: 100,
				stageName: "Этап 1: Профессиональная гигиена и санация (Завершён)",
			},
		});
		assert.equal(patchStageRes.statusCode, 200);
		const patchStageBody = JSON.parse(patchStageRes.body);
		assert.equal(patchStageBody.success, true);
		assert.equal(patchStageBody.stage.completionPercentage, 100);
		assert.equal(patchStageBody.stage.autoArchived, true);
	});

	// =========================================================================
	// 2. Сравнение 3 тарифов («Эконом», «Оптимум», «Премиум») и скрытие расходников
	// =========================================================================
	test("2. 3-Tier Treatment Plans & Automatic Consumables Hiding (Mandate 8e / 8ba)", () => {
		// Проверяем канонические пресеты тарифов из PLAN_TIER_CONFIGS
		assert.ok(PLAN_TIER_CONFIGS.economy);
		assert.ok(PLAN_TIER_CONFIGS.optimum);
		assert.ok(PLAN_TIER_CONFIGS.premium);

		assert.equal(PLAN_TIER_CONFIGS.optimum.isRecommended, true, "Оптимум обязан быть рекомендуемым выбором врача по умолчанию");
		assert.equal(PLAN_TIER_CONFIGS.economy.isRecommended, false);
		assert.equal(PLAN_TIER_CONFIGS.premium.isRecommended, false);
		assert.equal(PLAN_TIER_CONFIGS.optimum.warrantyYears, 3);

		// Проверяем фильтрацию сопутствующих микро-расходников (isMicroConsumable)
		const microConsumablesList = [
			{ name: "Валики ватные стоматологические стерильные", priceRub: 150 },
			{ name: "Перчатки нитриловые смотровые неопудренные", priceRub: 220 },
			{ name: "Салфетки нагрудные для пациентов 2-слойные", priceRub: 90 },
			{ name: "Слюноотсосы одноразовые с фильтром", priceRub: 120 },
			{ name: "Шприц трехкомпонентный инъекционный 5мл", priceRub: 80 },
			{ name: "Нагрудники защитные стоматологические", priceRub: 60 },
			{ name: "Микробраши аппликаторы регулярные", priceRub: 250 },
			{ name: "Канюли эндодонтические промывные", priceRub: 180 },
			{ name: "Бахилы медицинские одноразовые плотные", priceRub: 20 },
			{ name: "Маска медицинская трехслойная с носовым фиксатором", priceRub: 35 },
			{ name: "Коффердам завеса латексная средняя", priceRub: 450 },
			{ name: "Асептический комплект для осмотра", priceRub: 320 },
			{ name: "Расходные материалы для обработки кариозной полости", category: "материалы", priceRub: 300 },
		];

		for (const consumable of microConsumablesList) {
			assert.equal(
				isMicroConsumable(consumable),
				true,
				`Микро-расходник «${consumable.name}» ОБЯЗАН скрываться из сметы пациента (Мандат 8e / 8ba)`,
			);
		}

		// Проверяем, что клинические медицинские услуги и дорогостоящие биоматериалы НЕ скрываются
		const clinicalProceduresList = [
			{ name: "Препарирование и пломбирование зуба световым композитом", priceRub: 6500 },
			{ name: "Дентальная имплантация системы Straumann Roxolid", priceRub: 55000 },
			{ name: "Коронка из оксида циркония Katana HTML", priceRub: 35000 },
			{ name: "Профессиональная ультразвуковая гигиена", priceRub: 5000 },
			{ name: "Удаление зуба сложное с разъединением корней", priceRub: 4500 },
			{ name: "Коллагеновая мембрана Geistlich Bio-Gide 25x25мм", priceRub: 18000 }, // >500 руб — реальный хирургический биоматериал
			{ name: "Костный заменитель Geistlich Bio-Oss 0.5г", priceRub: 14500 },
		];

		for (const procedure of clinicalProceduresList) {
			assert.equal(
				isMicroConsumable(procedure),
				false,
				`Клиническая услуга/биоматериал «${procedure.name}» НЕ ДОЛЖНА скрываться из сметы`,
			);
		}
	});

	// =========================================================================
	// 3. Целочисленная копеечная математика (amountKopecks: BigInt) и рассрочка 0%
	// =========================================================================
	test("3. Exact Integer Kopeck Math & 0% Installment Schedules without Drift", () => {
		// Тест 1: Базовый тариф 85 500 ₽ (8 550 000 копеек) на 3 месяца
		const economyKopecks = 8550000 as Kopecks;
		const economyParts = splitKopecks(economyKopecks, 3);
		assert.equal(economyParts.length, 3);
		assert.equal(economyParts[0], 2850000);
		assert.equal(economyParts[1], 2850000);
		assert.equal(economyParts[2], 2850000);
		assert.equal(economyParts.reduce((a, b) => a + b, 0), economyKopecks);

		// Тест 2: Оптимальный тариф 132 300 ₽ (13 230 000 копеек) на 3 месяца
		const optimumKopecks = 13230000 as Kopecks;
		const optimumParts = splitKopecks(optimumKopecks, 3);
		assert.equal(optimumParts.length, 3);
		assert.equal(optimumParts[0], 4410000);
		assert.equal(optimumParts[1], 4410000);
		assert.equal(optimumParts[2], 4410000);
		assert.equal(optimumParts.reduce((a, b) => a + b, 0), optimumKopecks);

		// Тест 3: Премиум тариф 205 000 ₽ (20 500 000 копеек) на 3 месяца (20500000 / 3 = 6833333.333...)
		const premiumKopecks = 20500000 as Kopecks;
		const premiumParts = splitKopecks(premiumKopecks, 3);
		assert.equal(premiumParts.length, 3);
		const sumPremium = premiumParts.reduce((a, b) => a + b, 0);
		assert.equal(sumPremium, premiumKopecks, "Сумма частей рассрочки обязана ТОЧНО сходиться до единой копейки!");

		// Тест 4: Расчет рассрочки через генератор generate0PercentInstallmentSchedule
		const schedule = generate0PercentInstallmentSchedule(optimumKopecks, 3);
		assert.equal(schedule.length, 3);
		const totalScheduledKopecks = schedule.reduce((sum, item) => sum + item.amountKopecks, 0);
		assert.equal(totalScheduledKopecks, optimumKopecks);

		// Тест 5: Неделимое простое число копеек (100 001 копейка) на 3, 6, 12 месяцев
		for (const months of [3, 6, 12]) {
			const oddKopecks = 100001 as Kopecks;
			const parts = splitKopecks(oddKopecks, months);
			assert.equal(parts.length, months);
			const partsSum = parts.reduce((a, b) => a + b, 0);
			assert.equal(partsSum, oddKopecks, `Рассрочка на ${months} мес. не должна терять копейки при делении`);
		}
	});

	// =========================================================================
	// 4. Автономия врача: Истечение 30 дней НЕ блокирует наряды и оплату (Мандат 8e)
	// =========================================================================
	test("4. Doctor Autonomy: Expired plan (>30 days) does NOT block work orders or payments (Mandate 8e / Section VII)", () => {
		const items: PlanItemForValidation[] = [
			{
				itemId: "item-surgery-01",
				toothNumber: 46,
				code804n: "A16.07.054",
				nameRu: "Установка дентального имплантата Straumann",
				quantity: 1,
				planUnitPriceKopecks: 5500000,
			},
		];

		const mockCatalog = [
			{
				id: "srv-01",
				code804n: "A16.07.054",
				title: "Установка дентального имплантата Straumann",
				basePriceKopecks: 5500000 as Kopecks,
				active: true,
			},
		];

		const expiredPayload: PlanToInvoiceValidationPayload = {
			planId: "PLAN-STUDIO-EXPIRED-TEST",
			patientId: PATIENT_ID,
			planCreatedAtIso: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // Создан 45 дней назад
			isSignedWithPatient: true,
			items,
			catalog: mockCatalog,
		};

		const report = validatePlanToInvoice(expiredPayload);

		assert.equal(report.isPlanExpired, true, "План старше 30 дней помечается как истекший");
		assert.equal(
			report.canGenerateWorkOrder,
			true,
			"Истечение 30 дней плана лечения НЕ ДОЛЖНО блокировать создание заказ-нарядов ЗТЛ (Мандат 8e)",
		);
		assert.equal(
			report.canGenerateInvoice,
			true,
			"Истечение 30 дней плана лечения НЕ ДОЛЖНО блокировать приём оплаты или выставление счёта (Мандат 8e)",
		);
		assert.equal(report.blockingReasons.length, 0, "У истекшего плана лечения ноль блокирующих причин");
	});

	// =========================================================================
	// 5. Тестирование подписания ПЭП (SMS OTP, SHA-256 хеш, статус Approved)
	// =========================================================================
	test("5. PEP Digital Signature: SMS OTP request, rejection of bad code, valid SHA-256 sign and immutability", async () => {
		if (!databaseReady) return;

		// 1. Создаем план лечения под подписание
		const createRes = await app.inject({
			method: "POST",
			url: "/api/treatment-plans",
			headers: testHeaders,
			payload: {
				patientId: PATIENT_ID,
				name: "План лечения с юридической ПЭП по SMS",
				totalPriceRub: 75000,
			},
		});
		assert.equal(createRes.statusCode, 201);
		const planId = JSON.parse(createRes.body).treatmentPlan.id;

		// 2. Запрашиваем код подтверждения по SMS
		const requestCodeRes = await app.inject({
			method: "POST",
			url: `/api/treatment-plans/${planId}/sign-pep`,
			headers: testHeaders,
			payload: {
				action: "request_code",
				method: "sms",
				phone: "+79998887766",
			},
		});

		assert.equal(requestCodeRes.statusCode, 200);
		const reqCodeData = JSON.parse(requestCodeRes.body);
		assert.equal(reqCodeData.success, true);
		assert.equal(reqCodeData.smsSent, true);
		assert.equal(reqCodeData.timeoutSeconds, 60);

		// 3. Отклонение неверного кода (400 Bad Request)
		const badCodeRes = await app.inject({
			method: "POST",
			url: `/api/treatment-plans/${planId}/sign-pep`,
			headers: testHeaders,
			payload: {
				action: "confirm",
				method: "sms",
				code: "000000", // Неверный код
				signerName: "Смирнова Екатерина Васильевна",
			},
		});
		assert.equal(badCodeRes.statusCode, 400, "Неверный проверочный код должен возвращать 400 Bad Request");
		const badCodeData = JSON.parse(badCodeRes.body);
		assert.equal(badCodeData.error, "InvalidVerificationCode");

		// 4. Успешное подписание проверочным кодом (test bypass: 123456)
		const confirmRes = await app.inject({
			method: "POST",
			url: `/api/treatment-plans/${planId}/sign-pep`,
			headers: testHeaders,
			payload: {
				action: "confirm",
				method: "sms",
				code: "123456",
				signerName: "Смирнова Екатерина Васильевна",
			},
		});

		assert.equal(confirmRes.statusCode, 200, `Confirm sign failed: ${confirmRes.body}`);
		const confirmData = JSON.parse(confirmRes.body);
		assert.equal(confirmData.success, true);
		assert.equal(confirmData.signed, true);

		// Проверяем наличие криптографического SHA-256 хеша документа (64 шестнадцатеричных символа)
		assert.ok(confirmData.documentHash);
		assert.match(
			confirmData.documentHash,
			/^[a-f0-9]{64}$/,
			"Хеш подписанного документа должен быть валидным 64-символьным SHA-256",
		);

		// Проверяем атрибуты подписи и фиксацию статуса Approved
		assert.equal(confirmData.signature.method, "pep_sms");
		assert.equal(confirmData.signature.signerName, "Смирнова Екатерина Васильевна");
		assert.ok(confirmData.signature.signedAtIso);
		assert.equal(confirmData.treatmentPlan.status, "Approved");

		// Проверяем неизменяемость в БД: статус сохранён как Approved и patientSignature заполнена
		const [savedPlan] = await db
			.select()
			.from(treatmentPlans)
			.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, ORG_ID)))
			.limit(1);

		assert.ok(savedPlan);
		assert.equal(savedPlan.status, "Approved");
		assert.ok(savedPlan.approvedAt);
		assert.ok(savedPlan.patientSignature);
	});

	// =========================================================================
	// 6. Жизненный цикл статусов и переходы по этапам воронки
	// =========================================================================
	test("6. Status Lifecycle & Funnel Stage Transitions (Draft -> Active -> Approved -> Completed)", async () => {
		if (!databaseReady) return;

		// 1. Создаем черновик
		const createRes = await app.inject({
			method: "POST",
			url: "/api/treatment-plans",
			headers: testHeaders,
			payload: {
				patientId: PATIENT_ID,
				name: "План для тестирования статусов",
			},
		});
		assert.equal(createRes.statusCode, 201);
		const planId = JSON.parse(createRes.body).treatmentPlan.id;

		// 2. Переводим в статус Active
		const patchActiveRes = await app.inject({
			method: "PATCH",
			url: `/api/v1/treatment-plans/${planId}/status`,
			headers: testHeaders,
			payload: {
				status: "Active",
			},
		});
		assert.equal(patchActiveRes.statusCode, 200);
		assert.equal(JSON.parse(patchActiveRes.body).plan.status, "Active");

		// 3. Переводим в Approved с выбором тарифа optimum
		const patchApproveRes = await app.inject({
			method: "PATCH",
			url: `/api/v1/treatment-plans/${planId}/status`,
			headers: testHeaders,
			payload: {
				status: "Approved",
				selectedTier: "optimum",
			},
		});
		assert.equal(patchApproveRes.statusCode, 200);
		const approvedPlan = JSON.parse(patchApproveRes.body).plan;
		assert.equal(approvedPlan.status, "Approved");
		assert.ok(approvedPlan.approvedAt);

		// 4. Перемещаем через handleStageTransition: этап 'completed'
		const transitionRes = await app.inject({
			method: "POST",
			url: `/api/treatment-plans/${planId}/transition-stage`,
			headers: testHeaders,
			payload: {
				targetStage: "completed",
				reason: "Все этапы лечения успешно завершены, пациент выписан с гарантией",
			},
		});
		assert.equal(transitionRes.statusCode, 200);
		const transData = JSON.parse(transitionRes.body);
		assert.equal(transData.success, true);
		assert.equal(transData.status, "Completed");

		// 5. Проверяем валидацию некорректного статуса (400 Bad Request)
		const invalidStatusRes = await app.inject({
			method: "PATCH",
			url: `/api/v1/treatment-plans/${planId}/status`,
			headers: testHeaders,
			payload: {
				status: "CompletelyInvalidStatus",
			},
		});
		assert.equal(invalidStatusRes.statusCode, 400);
		assert.equal(JSON.parse(invalidStatusRes.body).error, "ValidationError");

		// 6. Проверяем запись в журнал аудита
		const auditLogs = await db
			.select()
			.from(auditEvents)
			.where(and(eq(auditEvents.organizationId, ORG_ID), eq(auditEvents.entityId, planId)));
		assert.ok(auditLogs.length >= 1, "Перемещение плана лечения обязано фиксироваться в журнале аудита");
	});
});
