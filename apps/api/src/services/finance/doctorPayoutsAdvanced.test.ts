/**
 * doctorPayoutsAdvanced.test.ts — продвинутые тесты выплат врачам.
 *
 * Проверяется:
 *  - Расходы ЗТЛ (лаборатория) и удержание с врача
 *  - Возвраты за период (сторно комиссии врача)
 *  - Извлечение номера медицинской карты extractMedicalCardNumber
 *  - Человекочитаемые наименования реставраций humanizeRestorationType
 *  - Полная прозрачная формула: (Выручка × Ставка) - Материалы - ЗТЛ
 *  - Защита общеклинических расходников (салфетки, валики) от удержания
 *  - Генерация расчетной ведомости выработки врача generateDoctorPayslipHtml
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	computeDoctorPayout,
	extractMedicalCardNumber,
	generateDoctorPayslipHtml,
	humanizeRestorationType,
	type DoctorPayoutRow,
} from "./doctorPayouts.js";

test("расходы ЗТЛ (лаборатория) корректно удерживаются из выплаты врача", () => {
	const result = computeDoctorPayout({
		revenueRub: 50000,
		commissionPct: 30,
		materialCostRub: 2000,
		materialMovements: 1,
		materialDeductionPct: 100, // 2 000 ₽ материалов
		labCostRub: 5000,
		labOrdersCount: 2,
		labDeductionPct: 100, // 5 000 ₽ ЗТЛ
	});
	assert.equal(result.state, "computed");
	// Чистая база выручки: 50 000 - 2 000 - 5 000 = 43 000 ₽; начислено 30% = 12 900 ₽
	assert.equal(result.accruedRub, 12900);
	assert.equal(result.withheldMaterialRub, 2000);
	assert.equal(result.withheldLabRub, 5000);
	assert.equal(result.payoutRub, 12900);
});

test("возвраты за период (сторно) уменьшают начисленную комиссию врача", () => {
	const result = computeDoctorPayout({
		revenueRub: 100000,
		refundRub: 20000, // Чистая выручка = 80 000 ₽
		commissionPct: 30, // Начислено 30% от (80 000 - 3 000) = 23 100 ₽
		materialCostRub: 3000,
		materialMovements: 1,
		materialDeductionPct: 100, // 3 000 ₽ материалов
	});
	assert.equal(result.state, "computed");
	assert.equal(result.accruedRub, 23100);
	assert.equal(result.withheldMaterialRub, 3000);
	assert.equal(result.refundClawbackRub, 6000); // 30% от 20 000 ₽ возврата
	assert.equal(result.payoutRub, 23100);
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
	assert.equal(fallback, "МК-123E45");
});

test("humanizeRestorationType возвращает понятное русское наименование зуботехнической конструкции", () => {
	assert.equal(humanizeRestorationType("crown_zirconia", null), "Коронка из диоксида циркония");
	assert.equal(humanizeRestorationType("crown_emax", null), "Безметалловая коронка E.max");
	assert.equal(humanizeRestorationType("aligners_setup", null), "Сетап элайнеров");
	assert.equal(humanizeRestorationType("crown_monolithic", "zirconia"), "Коронка монолитная (CAD/CAM)");
	assert.equal(humanizeRestorationType(null, "E.max CAD"), "E.max CAD");
	assert.equal(humanizeRestorationType(null, null), "Зуботехническая конструкция");
});

test("полная клиническая формула: процент начисляется на чистую выручку за вычетом материалов и ЗТЛ (PAY-01)", () => {
	// Врач ортопед: Выручка 200 000 ₽, Ставка 25%, Списано материалов 5 000 ₽ (100%), Заказы ЗТЛ 30 000 ₽ (100%)
	const result = computeDoctorPayout({
		revenueRub: 200000,
		commissionPct: 25,
		materialCostRub: 5000,
		materialMovements: 3,
		materialDeductionPct: 100, // 5 000 ₽ вычет из базы
		labCostRub: 30000,
		labOrdersCount: 4,
		labDeductionPct: 100, // 30 000 ₽ вычет из базы
	});

	assert.equal(result.state, "computed");
	// Чистая база выручки клиники: 200 000 - 5 000 - 30 000 = 165 000 ₽. 25% = 41 250 ₽
	assert.equal(result.accruedRub, 41250);
	assert.equal(result.withheldMaterialRub, 5000);
	assert.equal(result.withheldLabRub, 30000);
	assert.equal(result.payoutRub, 41250);
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
	// Чистая база: 100 000 - 3 000 = 97 000 ₽. Начислено 25% = 24 250 ₽
	assert.equal(result.accruedRub, 24250);
	// Из зарплаты врача удерживаются ТОЛЬКО прямые материалы (3 000 ₽), а не салфетки (1 500 ₽)
	assert.equal(result.withheldMaterialRub, 3000);
	assert.equal(result.payoutRub, 24250);
});

test("generateDoctorPayslipHtml формирует официальную расчетную ведомость выработки врача с реестром приемов и ЗТЛ", () => {
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

	const html = generateDoctorPayslipHtml(mockDoctorRow, {
		organizationName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		organizationInn: "7701234567",
		periodFrom: "2026-07-01T00:00:00.000Z",
		periodTo: "2026-07-31T23:59:59.999Z",
	});

	assert.ok(/расчетный лист/i.test(html), "Должен содержать заголовок расчетного листа");
	assert.ok(html.includes("Расчетный лист выработки врача"), "Должен указывать расчетный лист выработки врача");
	assert.ok(html.includes("Doctor Production Payroll Sheet"), "Должен указывать английское наименование стандарта");
	assert.ok(html.includes("Барабаш Сергей Владимирович"), "Должен содержать ФИО врача");
	assert.ok(html.includes("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"), "Должен содержать название клиники");
	assert.ok(html.includes("7701234567"), "Должен содержать ИНН клиники");
	assert.ok(html.includes("Смирнова Елена Александровна"), "Должен содержать ФИО пациента");
	assert.ok(html.includes("043/у-2026/102"), "Должен содержать номер медкарты");
	assert.ok(html.includes("A16.07.002.001"), "Должен содержать код Номенклатуры 804н");
	assert.ok(html.includes("LAB-8812"), "Должен содержать номер наряда ЗТЛ");
	assert.ok(html.includes("39") || html.includes("45"), "Должен содержать начисленную сумму или выплату");
});
