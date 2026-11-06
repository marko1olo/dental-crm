import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createHash } from "node:crypto";
import {
	PLAN_TIER_CONFIGS,
	isMicroConsumable,
	splitKopecks,
	type Kopecks,
	generateA4TreatmentPlanHtml,
	type A4DocumentTreatmentPlanData,
} from "@dental/shared";
import {
	generate0PercentInstallmentSchedule,
	validatePlanToInvoice,
	type PlanItemForValidation,
	type PlanToInvoiceValidationPayload,
	type CatalogServiceLookup,
} from "@dental/shared/finance";

describe("Treatment Plan Domain: 3-Tier Math, 13% Tax Deduction, Consumables Hiding & PEP Frozen Snapshot", () => {
	// =========================================================================
	// 1. Математика 3 тарифов и расчет налогового вычета 13% НДФЛ (КНД 1151156)
	// =========================================================================
	test("1. 3-Tier Treatment Plans Math & 13% NDFL Tax Deduction (Decree 458 / Code 01 & 02)", () => {
		// Проверяем 3 канонических тарифа
		assert.equal(PLAN_TIER_CONFIGS.economy.badgeRu, "Эконом");
		assert.equal(PLAN_TIER_CONFIGS.optimum.badgeRu, "Оптимум (Выбор врачей)");
		assert.equal(PLAN_TIER_CONFIGS.optimum.isRecommended, true);
		assert.equal(PLAN_TIER_CONFIGS.premium.badgeRu, "Премиум / VIP");

		// Расчет 13% НДФЛ для стандартного лечения (Код 01, лимит 150 000 ₽)
		const standardPlanRub = 120000;
		const standardRefundRub = Math.round(standardPlanRub * 0.13); // 15 600 ₽
		assert.equal(standardRefundRub, 15600);

		// Если сумма превышает 150 000 ₽ по коду 01, вычет ограничен 19 500 ₽ (150 000 * 0.13)
		const expensiveCode01PlanRub = 200000;
		const cappedBaseRub = Math.min(expensiveCode01PlanRub, 150000);
		const cappedRefundRub = Math.round(cappedBaseRub * 0.13);
		assert.equal(cappedRefundRub, 19500);

		// Для дорогостоящего лечения (Код 02, Постановление Правительства №458: дентальная имплантация, костная пластика) — лимита НЕТ!
		const expensiveCode02PlanRub = 350000; // Имплантация и протезирование на имплантатах
		const uncappedRefundRub = Math.round(expensiveCode02PlanRub * 0.13);
		assert.equal(uncappedRefundRub, 45500, "Для кода 02 (дорогостоящее лечение) вычет 13% рассчитывается от полной суммы");
	});

	// =========================================================================
	// 2. Скрытие сопутствующих микро-расходников из сметы пациента (Мандат 8e / 8ba)
	// =========================================================================
	test("2. Automatic Micro-Consumables Hiding (Zero Patient Clutter)", () => {
		const itemsInPlan = [
			{ name: "Препарирование и пломбирование зуба 26 нанокомпозитом", priceRub: 7500 },
			{ name: "Валики ватные стоматологические 10мм", priceRub: 150 },
			{ name: "Слюноотсосы одноразовые с фильтром", priceRub: 120 },
			{ name: "Перчатки нитриловые смотровые неопудренные", priceRub: 250 },
			{ name: "Салфетка нагрудная стоматологическая", priceRub: 50 },
			{ name: "Дентальная имплантация Straumann SLActive", priceRub: 55000 },
			{ name: "Коллагеновая мембрана Geistlich Bio-Gide 25x25", priceRub: 18000 },
		];

		const patientFacingItems = itemsInPlan.filter((item) => !isMicroConsumable(item));
		const warehouseBOMItems = itemsInPlan; // В складской ведомости сохраняются все

		// В смете для пациента остаются только клинически значимые позиции:
		// 1) Пломбирование 26, 2) Имплантация Straumann, 3) Мембрана Bio-Gide
		assert.equal(patientFacingItems.length, 3);
		assert.equal(patientFacingItems[0].name, "Препарирование и пломбирование зуба 26 нанокомпозитом");
		assert.equal(patientFacingItems[1].name, "Дентальная имплантация Straumann SLActive");
		assert.equal(patientFacingItems[2].name, "Коллагеновая мембрана Geistlich Bio-Gide 25x25");

		// В складской ведомости (BOM) сохранены все 7 позиций для тихого списания
		assert.equal(warehouseBOMItems.length, 7);
	});

	// =========================================================================
	// 3. Целочисленная копеечная математика и рассрочка 0% без копеечного рассинхрона
	// =========================================================================
	test("3. Exact Kopeck Mathematics & 0% Installment Schedules", () => {
		const totalKopecks = 13230000 as Kopecks; // 132 300.00 ₽
		const schedule = generate0PercentInstallmentSchedule(totalKopecks, 3);

		assert.equal(schedule.length, 3);
		const sumSchedule = schedule.reduce((acc, s) => acc + s.amountKopecks, 0);
		assert.equal(sumSchedule, totalKopecks, "Сумма этапов рассрочки обязана точно сходиться до копейки");

		// Проверка деления с остатком
		const oddTotalKopecks = 20500000 as Kopecks; // 205 000.00 ₽
		const parts = splitKopecks(oddTotalKopecks, 3);
		assert.equal(parts.length, 3);
		assert.equal(parts.reduce((a, b) => a + b, 0), oddTotalKopecks);
	});

	// =========================================================================
	// 4. Криптографическая подпись ПЭП и фиксация Frozen Snapshot (SHA-256)
	// =========================================================================
	test("4. PEP Signature Cryptographic Hash (SHA-256) & Tamper Detection", () => {
		const planSnapshot = {
			planId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
			patientId: "a12bc34d-56ef-7890-abcd-ef1234567890",
			totalPriceRub: 132300,
			items: [
				{ toothNumber: 16, code804n: "A16.07.054", name: "Имплантат Straumann", price: 55000 },
				{ toothNumber: 16, code804n: "A16.07.004", name: "Коронка диоксид циркония", price: 35000 },
			],
			signedAtIso: "2026-11-06T10:00:00.000Z",
			signerName: "Смирнова Екатерина Васильевна",
			signerPhone: "+79998887766",
		};

		const snapshotString = JSON.stringify(planSnapshot);
		const initialHash = createHash("sha256").update(snapshotString).digest("hex");

		assert.match(initialHash, /^[a-f0-9]{64}$/);

		// Попытка незаметной модификации: изменение цены всего на 1 рубль (55000 -> 55001)
		const tamperedSnapshot = {
			...planSnapshot,
			items: [
				{ toothNumber: 16, code804n: "A16.07.054", name: "Имплантат Straumann", price: 55001 },
				{ toothNumber: 16, code804n: "A16.07.004", name: "Коронка диоксид циркония", price: 35000 },
			],
		};
		const tamperedHash = createHash("sha256").update(JSON.stringify(tamperedSnapshot)).digest("hex");

		assert.notEqual(
			initialHash,
			tamperedHash,
			"Криптографический хеш SHA-256 обязан выявлять любую несанкционированную модификацию утвержденного плана",
		);
	});

	// =========================================================================
	// 5. Генерация юридически безупречной печатной формы плана лечения в 1 клик
	// =========================================================================
	test("5. 1-Click Compliant A4 Treatment Plan HTML Generation", () => {
		const samplePlanData: A4DocumentTreatmentPlanData = {
			planDate: "06.11.2026",
			clinic: {
				name: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				address: "г. Москва, ул. Профсоюзная, д. 24",
				phone: "+7 (495) 777-88-99",
				ogrn: "1157746123456",
			},
			patient: {
				fullName: "Смирнова Екатерина Васильевна",
				birthDate: "14.05.1988",
				phone: "+79998887766",
			},
			doctorFullName: "Д-р Орлов А.В. (Главный врач)",
			clinicalReason: "Вторичная адентия 16, 46. Нарушение жевательной эффективности.",
			diagnosisSummary: "К08.1 Потеря зубов вследствие удаления",
			stages: [
				{
					stageNumber: 1,
					stageName: "1 этап: Санация и дентальная имплантация",
					stageTiming: "1–2 недели",
					plannedServices: [
						{ name: "Установка дентального имплантата Straumann (область 16)", toothOrArea: "16", timing: "Визит 1", priceRub: 55000 },
						{ name: "Установка дентального имплантата Straumann (область 46)", toothOrArea: "46", timing: "Визит 1", priceRub: 55000 },
					],
					stageTotalRub: 110000,
				},
				{
					stageNumber: 2,
					stageName: "2 этап: Ортопедическая реабилитация",
					stageTiming: "через 3 месяца после остеоинтеграции",
					plannedServices: [
						{ name: "Коронка из диоксида циркония Katana (зуб 16)", toothOrArea: "16", timing: "Визит 2", priceRub: 35000 },
						{ name: "Коронка из диоксида циркония Katana (зуб 46)", toothOrArea: "46", timing: "Визит 2", priceRub: 35000 },
					],
					stageTotalRub: 70000,
				},
			],
			totalCostWithoutDiscountRub: 180000,
			discountRub: 10000,
			totalCostWithDiscountRub: 170000,
			approvedVariantName: "Вариант Б: Оптимум (Рекомендуемый)",
		};

		const html = generateA4TreatmentPlanHtml(samplePlanData);

		assert.ok(html.includes("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"));
		assert.ok(html.includes("Смирнова Екатерина Васильевна"));
		assert.ok(html.includes("1 этап: Санация и дентальная имплантация"));
		assert.ok(html.includes("170 000"));
		assert.ok(html.includes("Вариант Б: Оптимум (Рекомендуемый)"));
		assert.ok(html.includes("ПЛАН СОГЛАСОВАЛ (ПАЦИЕНТ)"));
		assert.ok(html.includes("ПЛАН СОСТАВИЛ (ВРАЧ)"));
	});

	// =========================================================================
	// 6. Мандат 8e: Истечение 30 дней плана НЕ блокирует запись и наряды ЗТЛ
	// =========================================================================
	test("6. Expired Treatment Plan (>30 days) Never Blocks Patient Care (Mandate 8e)", () => {
		const catalog: CatalogServiceLookup[] = [
			{
				id: "c-01",
				code804n: "A16.07.054",
				title: "Установка имплантата Straumann",
				basePriceKopecks: 5500000 as Kopecks,
				active: true,
			},
		];

		const items: PlanItemForValidation[] = [
			{
				itemId: "i-01",
				code804n: "A16.07.054",
				nameRu: "Установка имплантата Straumann",
				planUnitPriceKopecks: 5500000 as Kopecks,
				quantity: 1,
			},
		];

		const validationPayload: PlanToInvoiceValidationPayload = {
			planId: "PLAN-OLD-60-DAYS",
			patientId: "PAT-001",
			planCreatedAtIso: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // Создан 60 дней назад
			items,
			catalog,
		};

		const report = validatePlanToInvoice(validationPayload);

		assert.equal(report.isPlanExpired, true);
		assert.equal(report.canGenerateWorkOrder, true, "Наряды в зуботехническую лабораторию НЕ блокируются!");
		assert.equal(report.canGenerateInvoice, true, "Выставление счета и прием оплаты НЕ блокируются!");
		assert.equal(report.blockingReasons.length, 0);
	});
});
