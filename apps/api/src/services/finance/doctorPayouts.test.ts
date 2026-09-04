/**
 * Тесты формулы выплаты врачу и границ расчёта.
 *
 * Проверяется ровно то, что определяет размер зарплаты и что нельзя увидеть
 * глазами в коде: порядок операций, округление до копейки, отказ считать без
 * ставки и отрицательная выплата. Запрос к базе здесь не проверяется — он
 * измеряется живым прогоном (src/tests/routes/doctorPayoutsProof.ts).
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	computeDoctorPayout,
	extractMedicalCardNumber,
	generateDoctorT51Payslip,
	humanizeRestorationType,
	MAX_PAYOUT_PERIOD_DAYS,
	materialsStateOf,
	payoutRowNote,
	percentOfMoney,
	resolvePayoutPeriod,
	type DoctorPayoutRow,
} from "./doctorPayouts.js";

test("без ставки выплата не считается: null, а не ноль", () => {
	const result = computeDoctorPayout({
		revenueRub: 44000,
		materialCostRub: 0,
		materialMovements: 0,
		commissionPct: null,
		materialDeductionPct: null,
	});
	assert.equal(result.state, "rate_missing");
	assert.equal(result.accruedRub, null);
	assert.equal(result.withheldMaterialRub, null);
	assert.equal(result.payoutRub, null);

	// Ноль к выплате прочитали бы как «врач ничего не заработал», поэтому в
	// строке обязана быть причина и действие.
	const note = payoutRowNote({
		state: result.state,
		materialsState: "no_movements",
		materialMovementsUnpriced: 0,
		commissionPct: null,
		rateRowCount: 0,
		payoutRub: null,
		revenueRub: 44000,
	});
	assert.match(note, /Ставка врача не задана/);
	assert.match(note, /Задайте процент/);
});

test("30 % из diary.ts не подставляется молча вместо отсутствующей ставки", () => {
	const result = computeDoctorPayout({
		revenueRub: 44000,
		materialCostRub: 0,
		materialMovements: 0,
		commissionPct: null,
		materialDeductionPct: 100,
	});
	// 44000 × 30 % = 13200. Такого числа быть не должно ни при каких условиях:
	// 30 % — это значение, которое код пишет при СОЗДАНИИ строки ставки, а не
	// факт о договорённости с врачом.
	assert.notEqual(result.accruedRub, 13200);
	assert.equal(result.state, "rate_missing");
});

test("нулевая касса при заданной ставке даёт ноль, а не отказ", () => {
	const result = computeDoctorPayout({
		revenueRub: 0,
		materialCostRub: 0,
		materialMovements: 0,
		commissionPct: 30,
		materialDeductionPct: 100,
	});
	assert.equal(result.state, "computed");
	assert.equal(result.accruedRub, 0);
	assert.equal(result.withheldMaterialRub, 0);
	assert.equal(result.payoutRub, 0);

	const note = payoutRowNote({
		state: result.state,
		materialsState: "no_movements",
		materialMovementsUnpriced: 0,
		commissionPct: 30,
		rateRowCount: 1,
		payoutRub: 0,
		revenueRub: 0,
	});
	assert.match(note, /Кассы за период нет/);
});

test("удержание идёт ПОСЛЕ начисления процента, а не до, но не может уводить выплату в минус (ТК РФ)", () => {
	const result = computeDoctorPayout({
		revenueRub: 10000,
		materialCostRub: 4000,
		materialMovements: 3,
		commissionPct: 30,
		materialDeductionPct: 100,
	});
	assert.equal(result.accruedRub, 3000);
	assert.equal(result.withheldMaterialRub, 4000);
	// По ТК РФ заработная плата не может быть отрицательной (payout >= 0)
	assert.equal(result.payoutRub, 0);
});

test("материалы дороже начисленного: выплата не может быть отрицательной по ТК РФ (минимальная 0 ₽)", () => {
	const result = computeDoctorPayout({
		revenueRub: 5000,
		materialCostRub: 4000,
		materialMovements: 2,
		commissionPct: 25,
		materialDeductionPct: 100,
	});
	assert.equal(result.accruedRub, 1250);
	assert.equal(result.withheldMaterialRub, 4000);
	assert.equal(result.payoutRub, 0);

	const note = payoutRowNote({
		state: result.state,
		materialsState: "counted",
		materialMovementsUnpriced: 0,
		commissionPct: 25,
		rateRowCount: 1,
		payoutRub: result.payoutRub,
		revenueRub: 5000,
	});
	assert.match(note, /Отрицательная выплата по ТК РФ запрещена/);
});

test("гарантийные заказы ЗТЛ (isWarranty: true) списываются на рекламационный фонд клиники и не удерживаются с врача", () => {
	const result = computeDoctorPayout({
		revenueRub: 50000,
		commissionPct: 30, // 15 000 ₽ начислено
		materialCostRub: 1000,
		materialMovements: 1,
		materialDeductionPct: 100, // 1 000 ₽ удержано материалов
		labCostRub: 12000, // Стоимость ЗТЛ 12 000 ₽
		labOrdersCount: 1,
		labDeductionPct: 100,
		isWarranty: true, // Гарантийная переделка
	});

	assert.equal(result.state, "computed");
	assert.equal(result.accruedRub, 15000);
	assert.equal(result.withheldMaterialRub, 1000);
	// С врача ЗТЛ НЕ удерживается: 0 ₽
	assert.equal(result.withheldLabRub, 0);
	// 15 000 - 1 000 - 0 = 14 000 ₽
	assert.equal(result.payoutRub, 14000);
});

test("копейка не теряется: половина округляется вверх", () => {
	// 23 400,55 × 30 % = 7 020,165. Двоичный float через Math.round дал бы
	// 7 020,16 — расхождение в копейку в зарплатной ведомости.
	assert.equal(percentOfMoney(23400.55, 30), 7020.17);
	assert.equal(percentOfMoney(0.01, 50), 0.01);
	assert.equal(percentOfMoney(1500.5, 30), 450.15);

	const result = computeDoctorPayout({
		revenueRub: 23400.55,
		materialCostRub: 1500.5,
		materialMovements: 1,
		commissionPct: 30,
		materialDeductionPct: 100,
	});
	assert.equal(result.accruedRub, 7020.17);
	assert.equal(result.withheldMaterialRub, 1500.5);
	assert.equal(result.payoutRub, 5519.67);
});

test("списаний нет — удерживать нечего, даже если процент удержания не задан", () => {
	const result = computeDoctorPayout({
		revenueRub: 10000,
		materialCostRub: 0,
		materialMovements: 0,
		commissionPct: 40,
		materialDeductionPct: null,
	});
	assert.equal(result.state, "computed");
	assert.equal(result.withheldMaterialRub, 0);
	assert.equal(result.payoutRub, 4000);
});

test("себестоимость есть, а процент удержания не задан — итог не выдумывается", () => {
	const result = computeDoctorPayout({
		revenueRub: 10000,
		materialCostRub: 2500,
		materialMovements: 4,
		commissionPct: 40,
		materialDeductionPct: null,
	});
	assert.equal(result.state, "material_policy_missing");
	// Начисленное показать можно, итог — нет: ноль удержания выплатил бы врачу
	// материалы клиники, а 100 % удержало бы то, о чём не договаривались.
	assert.equal(result.accruedRub, 4000);
	assert.equal(result.withheldMaterialRub, null);
	assert.equal(result.payoutRub, null);
});

test("непригодная ставка не превращается в число", () => {
	for (const badPercent of [-5, 150, Number.NaN, Number.POSITIVE_INFINITY]) {
		const result = computeDoctorPayout({
			revenueRub: 10000,
			materialCostRub: 0,
			materialMovements: 0,
			commissionPct: badPercent,
			materialDeductionPct: 0,
		});
		assert.equal(
			result.state,
			"rate_invalid",
			`ставка ${badPercent} должна быть отвергнута`,
		);
		assert.equal(result.payoutRub, null);
	}
});

test("ноль себестоимости отличается от отсутствия списаний", () => {
	assert.equal(materialsStateOf(0, 0), "no_movements");
	assert.equal(materialsStateOf(3, 0), "counted");
	assert.equal(materialsStateOf(3, 1), "cost_missing");

	const note = payoutRowNote({
		state: "computed",
		materialsState: "cost_missing",
		materialMovementsUnpriced: 2,
		commissionPct: 30,
		rateRowCount: 1,
		payoutRub: 1000,
		revenueRub: 5000,
	});
	assert.match(note, /без цены или без количества: 2/);
});

test("несколько активных ставок у врача — расчёт сообщает об этом", () => {
	const note = payoutRowNote({
		state: "computed",
		materialsState: "no_movements",
		materialMovementsUnpriced: 0,
		commissionPct: 30,
		rateRowCount: 2,
		payoutRub: 1000,
		revenueRub: 5000,
	});
	assert.match(note, /Активных ставок у врача найдено 2/);
});

test("период по умолчанию — текущий месяц целиком", () => {
	const period = resolvePayoutPeriod({}, new Date(2026, 6, 15, 13, 45));
	assert.equal(period.ok, true);
	if (!period.ok) return;
	assert.equal(period.from.getFullYear(), 2026);
	assert.equal(period.from.getMonth(), 6);
	assert.equal(period.from.getDate(), 1);
	assert.equal(period.to.getMonth(), 6);
	assert.equal(period.to.getDate(), 31);
});

test("период отвергается, а не обрезается молча", () => {
	const reversed = resolvePayoutPeriod({
		from: "2026-07-31T00:00:00.000Z",
		to: "2026-07-01T00:00:00.000Z",
	});
	assert.equal(reversed.ok, false);
	if (!reversed.ok) assert.match(reversed.message, /Начало периода позже/);

	const tooWide = resolvePayoutPeriod({
		from: "2020-01-01T00:00:00.000Z",
		to: "2026-01-01T00:00:00.000Z",
	});
	assert.equal(tooWide.ok, false);
	if (!tooWide.ok)
		assert.match(tooWide.message, new RegExp(String(MAX_PAYOUT_PERIOD_DAYS)));

	const garbage = resolvePayoutPeriod({
		from: "первое июля",
		to: "2026-07-31T00:00:00.000Z",
	});
	assert.equal(garbage.ok, false);
	if (!garbage.ok) assert.match(garbage.message, /не разобраны/);
});

test("расходы ЗТЛ (лаборатория) корректно удерживаются из выплаты врача", () => {
	const result = computeDoctorPayout({
		revenueRub: 50000,
		commissionPct: 30, // 15 000 ₽ начислено
		materialCostRub: 2000,
		materialMovements: 1,
		materialDeductionPct: 100, // 2 000 ₽ удержано материалов
		labCostRub: 5000,
		labOrdersCount: 2,
		labDeductionPct: 100, // 5 000 ₽ удержано ЗТЛ
	});
	assert.equal(result.state, "computed");
	assert.equal(result.accruedRub, 15000);
	assert.equal(result.withheldMaterialRub, 2000);
	assert.equal(result.withheldLabRub, 5000);
	// 15000 - 2000 - 5000 = 8000
	assert.equal(result.payoutRub, 8000);
});

test("возвраты за период (сторно) уменьшают начисленную комиссию врача", () => {
	const result = computeDoctorPayout({
		revenueRub: 100000,
		refundRub: 20000, // Чистая выручка = 80 000 ₽
		commissionPct: 30, // Начислено 30% от 80 000 = 24 000 ₽
		materialCostRub: 3000,
		materialMovements: 1,
		materialDeductionPct: 100, // 3 000 ₽ материалов
	});
	assert.equal(result.state, "computed");
	assert.equal(result.accruedRub, 24000);
	assert.equal(result.withheldMaterialRub, 3000);
	assert.equal(result.refundClawbackRub, 6000); // 30% от 20 000 ₽ возврата
	assert.equal(result.payoutRub, 21000); // 24000 - 3000 = 21000
});

test("extractMedicalCardNumber корректно извлекает номер карты или формирует стандартный код", () => {
	const fromAdminCard = extractMedicalCardNumber("123e4567-e89b-12d3-a456-426614174000", {
		cardNumber: "043/у-2026/891",
	});
	assert.equal(fromAdminCard, "043/у-2026/891");

	const fromMedCard = extractMedicalCardNumber("123e4567-e89b-12d3-a456-426614174000", {
		medicalCardNumber: "043/у-99",
	});
	assert.equal(fromMedCard, "043/у-99");

	const fromOms = extractMedicalCardNumber("123e4567-e89b-12d3-a456-426614174000", {
		insurancePolicyNumber: "1234567890123456",
	});
	assert.equal(fromOms, "ОМС 1234567890123456");

	const fallback = extractMedicalCardNumber("123e4567-e89b-12d3-a456-426614174000", null);
	assert.equal(fallback, "043/у-123E45");
});

test("humanizeRestorationType возвращает понятное русское наименование зуботехнической конструкции", () => {
	assert.equal(humanizeRestorationType("crown_zirconia", null), "Коронка из диоксида циркония");
	assert.equal(humanizeRestorationType("crown_emax", null), "Безметалловая коронка E.max");
	assert.equal(humanizeRestorationType("aligners_setup", null), "Сетап элайнеров");
	assert.equal(humanizeRestorationType("crown_monolithic", "zirconia"), "Коронка монолитная (CAD/CAM)");
	assert.equal(humanizeRestorationType(null, "E.max CAD"), "E.max CAD");
	assert.equal(humanizeRestorationType(null, null), "Зуботехническая конструкция");
});

test("полная прозрачная формула: (Выручка × Ставка) - Материалы - ЗТЛ", () => {
	// Врач ортопед: Выручка 200 000 ₽, Ставка 25%, Списано материалов 5 000 ₽ (100%), Заказы ЗТЛ 30 000 ₽ (100%)
	const result = computeDoctorPayout({
		revenueRub: 200000,
		commissionPct: 25, // 50 000 ₽ начислено
		materialCostRub: 5000,
		materialMovements: 3,
		materialDeductionPct: 100, // 5 000 ₽ вычет
		labCostRub: 30000,
		labOrdersCount: 4,
		labDeductionPct: 100, // 30 000 ₽ вычет
	});

	assert.equal(result.state, "computed");
	assert.equal(result.accruedRub, 50000);
	assert.equal(result.withheldMaterialRub, 5000);
	assert.equal(result.withheldLabRub, 30000);
	// 50 000 - 5 000 - 30 000 = 15 000 ₽
	assert.equal(result.payoutRub, 15000);
});

test("общеклинические расходники (салфетки, валики) защищены от удержания из зарплаты врача", () => {
	// Врач терапевт: Выручка 100 000 ₽, Ставка 25% (25 000 ₽ начислено),
	// Прямые материалы (пломбировочный Filtek): 3 000 ₽,
	// Общеклинические расходники (салфетки, валики, слюноотсосы): 1 500 ₽
	const result = computeDoctorPayout({
		revenueRub: 100000,
		commissionPct: 25,
		materialCostRub: 3000, // только прямые материалы
		overheadCostRub: 1500, // общеклинические расходники клиники
		materialMovements: 4,
		materialDeductionPct: 100,
	});

	assert.equal(result.state, "computed");
	assert.equal(result.accruedRub, 25000);
	// Из зарплаты врача удерживаются ТОЛЬКО прямые материалы (3 000 ₽), а не салфетки (1 500 ₽)
	assert.equal(result.withheldMaterialRub, 3000);
	// 25 000 - 3 000 = 22 000 ₽
	assert.equal(result.payoutRub, 22000);
});

test("generateDoctorT51Payslip формирует официальный расчетный листок Т-51 с реестром приемов и ЗТЛ", () => {
	const mockDoctorRow: DoctorPayoutRow = {
		doctorUserId: "d1234567-89ab-cdef-0123-456789abcdef",
		doctorName: "Барабаш Сергей Владимирович",
		role: "doctor",
		isActive: true,
		revenueRub: 150000,
		paymentCount: 5,
		materialCostRub: 6000,
		overheadCostRub: 2500,
		materialMovements: 6,
		materialMovementsUnpriced: 0,
		materialsState: "counted",
		labCostRub: 18000,
		labOrdersCount: 2,
		withheldLabRub: 18000,
		commissionPct: 30,
		materialDeductionPct: 100,
		labDeductionPct: 100,
		rateEffectiveFrom: "2026-01-01T00:00:00.000Z",
		rateRowCount: 1,
		state: "computed",
		accruedRub: 45000,
		withheldMaterialRub: 6000,
		payoutRub: 21000, // 45000 - 6000 - 18000 = 21000
		note: "Начислено процентом от кассы, затем удержана доля себестоимости материалов и лаборатории (ЗТЛ).",
		visits: [
			{
				visitId: "v-001",
				appointmentId: "app-001",
				paidAt: "2026-07-15T10:00:00.000Z",
				visitDate: "2026-07-15T09:00:00.000Z",
				patientId: "p-001",
				patientName: "Смирнова Елена Александровна",
				medicalCardNumber: "043/у-2026/102",
				revenueRub: 25000,
				paymentCount: 1,
				services: [
					{
						id: "srv-1",
						title: "Восстановление зуба пломбой световой полимеризации",
						order804nCode: "A16.07.002.001",
						toothCode: "24",
						priceRub: 25000,
						quantity: 1,
					},
				],
				materials: [
					{
						id: "mat-1",
						name: "Filtek Supreme XTE шприц",
						quantity: 1,
						unit: "шт",
						unitCostRub: 1200,
						totalCostRub: 1200,
						isOverheadConsumable: false,
						coveredByClinic: false,
					},
					{
						id: "mat-2",
						name: "Салфетки процедурные стоматологические",
						quantity: 5,
						unit: "шт",
						unitCostRub: 15,
						totalCostRub: 75,
						isOverheadConsumable: true,
						coveredByClinic: true,
					},
				],
			},
		],
		labOrders: [
			{
				id: "lo-001",
				orderNumber: "LAB-8812",
				toothFdi: "16",
				restorationType: "Коронка из диоксида циркония",
				material: "Zirconia Multi-Layer",
				patientName: "Смирнова Елена Александровна",
				status: "completed",
				completedAt: "2026-07-14T16:00:00.000Z",
				priceRub: 9000,
				withheldRub: 9000,
				deductionPct: 100,
				isWarranty: false,
			},
		],
	};

	const html = generateDoctorT51Payslip(mockDoctorRow, {
		organizationName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		organizationInn: "7701234567",
		periodFrom: "2026-07-01T00:00:00.000Z",
		periodTo: "2026-07-31T23:59:59.999Z",
	});

	assert.ok(/расчетный листок/i.test(html), "Должен содержать заголовок расчетного листка");
	assert.ok(html.includes("Унифицированная форма № Т-51"), "Должен указывать форму Т-51");
	assert.ok(html.includes("0301009"), "Должен указывать код формы по ОКУД 0301009");
	assert.ok(html.includes("Барабаш Сергей Владимирович"), "Должен содержать ФИО врача");
	assert.ok(html.includes("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"), "Должен содержать название клиники");
	assert.ok(html.includes("7701234567"), "Должен содержать ИНН клиники");
	assert.ok(html.includes("Смирнова Елена Александровна"), "Должен содержать ФИО пациента");
	assert.ok(html.includes("043/у-2026/102"), "Должен содержать номер медкарты");
	assert.ok(html.includes("A16.07.002.001"), "Должен содержать код Номенклатуры 804н");
	assert.ok(html.includes("LAB-8812"), "Должен содержать номер наряда ЗТЛ");
	assert.ok(html.includes("21"), "Должен содержать рассчитанную выплату");
});




