import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateDoctorPeriodPayroll,
	classifyServiceCategory,
	isGeneralClinicOverheadConsumable,
} from "../finance/payrollModules/index.js";

test("calculateDoctorPeriodPayroll: correctly calculates Net Revenue according to doctor piece-rate formula", () => {
	// Scenario: Gross = 100 000 ₽ (10 000 000 kop), Lab = 20 000 ₽ (2 000 000 kop), Material = 10 000 ₽ (1 000 000 kop)
	// Base commission = 25%
	// Net base = 100 000 - 20 000 - 10 000 = 70 000 ₽ (7 000 000 kop)
	// Earned commission = 70 000 * 25% = 17 500 ₽ (1 750 000 kop)
	// Manual bonus = 5 000 ₽ (500 000 kop)
	// Total gross payout before tax = 17 500 + 5 000 = 22 500 ₽ (2 250 000 kop)
	// 13% NDFL = 22 500 * 13% = 2 925 ₽ (292 500 kop)
	// Net payout "на руки" = 22 500 - 2 925 = 19 575 ₽ (1 957 500 kop)
	const result = calculateDoctorPeriodPayroll({
		doctorId: "doc-101",
		doctorName: "Иванов Иван Иванович",
		specialtyId: "therapy",
		periodStartIso: "2026-08-01",
		periodEndIso: "2026-08-31",
		customBasePercentage: 25,
		manualAdjustmentKop: 500000,
		services: [
			{
				id: "srv-1",
				dateIso: "2026-08-10",
				patientName: "Ковалев Игорь Николаевич",
				medicalCardNumber: "043-1082",
				serviceNameRu: "Эндодонтическое лечение",
				category: "therapy",
				grossRevenueKop: 10000000,
				labCostKop: 2000000,
				materialCostKop: 1000000,
				deductMaterialFromDoctor: true,
			},
		],
	});

	assert.equal(result.totalGrossRevenueKop, 10000000);
	assert.equal(result.totalLabDeductionsKop, 2000000);
	assert.equal(result.totalMaterialDeductionsKop, 1000000);
	assert.equal(result.totalNetBaseKop, 7000000);
	assert.equal(result.earnedBaseCommissionKop, 1750000);
	assert.equal(result.grossPayoutBeforeTaxKop, 2250000);
	assert.equal(result.ndflTaxKop, 292500);
	assert.equal(result.netPayoutToDoctorKop, 1957500);
});

test("calculateDoctorPeriodPayroll: handles kopeck exactness without float drift", () => {
	// Gross: 15 555.55 ₽ = 1 555 555 kop
	// Lab: 3 333.33 ₽ = 333 333 kop
	// Material: 1 111.11 ₽ = 111 111 kop
	// Net Base: 1 555 555 - 333 333 - 111 111 = 1 111 111 kop
	// 30% commission: round(1 111 111 * 0.3) = round(333 333.3) = 333 333 kop
	// 13% NDFL в полных рублях (п. 6 ст. 225 НК РФ): round(333 333 * 0.13 / 100) * 100 = 433 * 100 = 43 300 kop
	// Net Payout: 333 333 - 43 300 = 290 033 kop
	const result = calculateDoctorPeriodPayroll({
		doctorId: "doc-102",
		doctorName: "Петрова Анна Сергеевна",
		specialtyId: "therapy",
		periodStartIso: "2026-08-01",
		periodEndIso: "2026-08-31",
		customBasePercentage: 30,
		services: [
			{
				id: "srv-2",
				dateIso: "2026-08-12",
				patientName: "Сидорова А.П.",
				medicalCardNumber: "043-1083",
				serviceNameRu: "Сложная реставрация",
				category: "therapy",
				grossRevenueKop: 1555555,
				labCostKop: 333333,
				materialCostKop: 111111,
				deductMaterialFromDoctor: true,
			},
		],
	});

	assert.equal(result.totalGrossRevenueKop, 1555555);
	assert.equal(result.totalLabDeductionsKop, 333333);
	assert.equal(result.totalMaterialDeductionsKop, 111111);
	assert.equal(result.totalNetBaseKop, 1111111);
	assert.equal(result.earnedBaseCommissionKop, 333333);
	assert.equal(result.grossPayoutBeforeTaxKop, 333333);
	assert.equal(result.ndflTaxKop, 43300);
	assert.equal(result.netPayoutToDoctorKop, 290033);
});

test("isGeneralClinicOverheadConsumable: protects standard clinic hygiene supplies from doctor salary deductions", () => {
	// Общеклинические расходники: НЕ удерживаются из зарплаты врача
	assert.equal(isGeneralClinicOverheadConsumable("Салфетка нагрудная двухслойная"), true);
	assert.equal(isGeneralClinicOverheadConsumable("Ватные валики стоматологические 10 мм"), true);
	assert.equal(isGeneralClinicOverheadConsumable("Слюноотсос одноразовый с наконечником"), true);
	assert.equal(isGeneralClinicOverheadConsumable("Перчатки нитриловые неопудренные размер M"), true);
	assert.equal(isGeneralClinicOverheadConsumable("Маска медицинская трехслойная"), true);
	assert.equal(isGeneralClinicOverheadConsumable("Стаканчик одноразовый пластиковый 200 мл"), true);
	assert.equal(isGeneralClinicOverheadConsumable("Бахилы полиэтиленовые стандарт"), true);

	// Прямые клинические материалы: удерживаются при наличии техкарты списания
	assert.equal(isGeneralClinicOverheadConsumable("Дентальный имплантат Straumann BLX 4.0"), false);
	assert.equal(isGeneralClinicOverheadConsumable("Костный трансплантат Bio-Oss 0.5g"), false);
	assert.equal(isGeneralClinicOverheadConsumable("Композитный шприц Filtek Ultimate A2"), false);
	assert.equal(isGeneralClinicOverheadConsumable("Мембрана Bio-Gide 25x25 мм"), false);
	assert.equal(isGeneralClinicOverheadConsumable("Анестетик Убистезин Форте 4% карпула"), false);
});

test("classifyServiceCategory: maps service titles and Order 804n codes to clinical specialties", () => {
	assert.equal(classifyServiceCategory("Лечение кариеса и пломба световой полимеризации", "A16.07.002.001"), "therapy");
	assert.equal(classifyServiceCategory("Металлокерамическая коронка на оксиде циркония", "A16.07.004"), "orthopedics");
	assert.equal(classifyServiceCategory("Операция установки дентального имплантата", "A16.07.006"), "surgery");
	assert.equal(classifyServiceCategory("Фиксация металлической брекет-системы Damon", "A16.07.048"), "orthodontics");
	assert.equal(classifyServiceCategory("Профессиональная гигиена полости рта Air Flow", "A16.07.051"), "hygiene");
});

test("calculateDoctorPeriodPayroll: segregates general overhead supplies into overheadConsumablesCoveredKop", () => {
	const result = calculateDoctorPeriodPayroll({
		doctorId: "doc-103",
		doctorName: "Сидоров С.С.",
		specialtyId: "therapy",
		periodStartIso: "2026-08-01",
		periodEndIso: "2026-08-31",
		customBasePercentage: 25,
		services: [
			{
				id: "srv-3",
				dateIso: "2026-08-15",
				patientName: "Кузнецов К.К.",
				medicalCardNumber: "043-1084",
				serviceNameRu: "Пломбирование зуба 16",
				category: "therapy",
				grossRevenueKop: 500000,
				labCostKop: 0,
				materialCostKop: 0,
				materialItems: [
					{ name: "Перчатки нитриловые", costKop: 3500, isOverhead: true },
					{ name: "Слюноотсос", costKop: 600, isOverhead: true },
					{ name: "Композит Filtek", costKop: 45000, isOverhead: false },
				],
			},
		],
	});

	// General overhead = 3 500 + 600 = 4 100 kop covered by clinic, NOT deducted from doctor
	assert.equal(result.overheadConsumablesCoveredKop, 4100);
	// Only clinical material (45 000 kop) is deducted
	assert.equal(result.totalMaterialDeductionsKop, 45000);
	// Net base = 500 000 - 45 000 = 455 000 kop
	assert.equal(result.totalNetBaseKop, 455000);
	// Commission 25% = 113 750 kop
	assert.equal(result.earnedBaseCommissionKop, 113750);
});

test("calculateDoctorPeriodPayroll: correctly calculates self-employed / solo doctor tax regime", () => {
	const result = calculateDoctorPeriodPayroll({
		doctorId: "doc-solo",
		doctorName: "Соло Доктор",
		specialtyId: "solo_practitioner",
		periodStartIso: "2026-08-01",
		periodEndIso: "2026-08-31",
		taxRegime: "self_employed",
		payoutModel: "chair_rental",
		chairRentalMode: "fixed",
		chairRentalKop: 5000000, // 50 000 ₽ аренда кресла
		services: [
			{
				id: "srv-solo-1",
				dateIso: "2026-08-20",
				patientName: "Пациент Соло",
				medicalCardNumber: "043-999",
				serviceNameRu: "Тотальное протезирование",
				category: "orthopedics",
				grossRevenueKop: 30000000, // 300 000 ₽
				labCostKop: 6000000, // 60 000 ₽
				materialCostKop: 2000000, // 20 000 ₽
			},
		],
	});

	// Net Revenue = 300 000 - 60 000 - 20 000 = 220 000 ₽ (22 000 000 kop)
	// Minus chair rental 50 000 ₽ = 170 000 ₽ (17 000 000 kop)
	assert.equal(result.totalNetBaseKop, 17000000);
	assert.equal(result.chairRentalKop, 5000000);
	// For self-employed, NDFL is 0 (paid by doctor), but NPD 6% is calculated
	assert.equal(result.ndflTaxKop, 0);
	assert.equal(result.npd6TaxKop, 1020000); // 17 000 000 * 6% = 1 020 000 kop
	assert.equal(result.netPayoutToDoctorKop, 17000000);
});
