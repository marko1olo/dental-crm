import assert from "node:assert";
import test from "node:test";
import {
	calculateDoctorNetSalary,
	calculateServicesPayrollBreakdown,
	classifyServiceCategory,
	generateDoctorT51Html,
	isGeneralClinicOverheadConsumable,
} from "../finance/doctorNetSalaryEngine.js";

test("calculateDoctorNetSalary: correctly calculates Net Revenue according to Form T-51 statutory formula", () => {
	const result = calculateDoctorNetSalary({
		grossRevenueRub: 100000,
		labCostRub: 20000,
		materialsCostRub: 10000,
		categoryPercent: 25,
		fixedSalaryRub: 10000,
		bonusesRub: 5000,
		penaltiesRub: 1000,
		ndflRatePercent: 13,
	});

	// Net Base = 100 000 - 20 000 - 10 000 = 70 000 RUB (7 000 000 kop)
	assert.strictEqual(result.netBaseRevenueRub, 70000);
	assert.strictEqual(result.netBaseRevenueKop, 7000000);

	// Piecework = 70 000 * 25% = 17 500 RUB (1 750 000 kop)
	assert.strictEqual(result.pieceworkAccruedRub, 17500);
	assert.strictEqual(result.pieceworkAccruedKop, 1750000);

	// Total Accrued = 17 500 + 10 000 (fixed) + 5 000 (bonus) - 1 000 (penalty) = 31 500 RUB (3 150 000 kop)
	assert.strictEqual(result.totalAccruedRub, 31500);
	assert.strictEqual(result.totalAccruedKop, 3150000);

	// NDFL 13% = 31 500 * 13% = 4 095 RUB (409 500 kop)
	assert.strictEqual(result.ndflTaxRub, 4095);
	assert.strictEqual(result.ndflTaxKop, 409500);

	// Net Payout "На руки" = 31 500 - 4 095 = 27 405 RUB (2 740 500 kop)
	assert.strictEqual(result.netPayoutRub, 27405);
	assert.strictEqual(result.netPayoutKop, 2740500);
});

test("calculateDoctorNetSalary: handles kopeck exactness without float drift", () => {
	const result = calculateDoctorNetSalary({
		grossRevenueRub: 15555.55,
		labCostRub: 3333.33,
		materialsCostRub: 1111.11,
		categoryPercent: 30,
		fixedSalaryRub: 0,
		serviceSalaryPriceRub: 500.50,
		ndflRatePercent: 13,
	});

	// Gross kop: 1 555 555
	// Lab kop: 333 333
	// Mat kop: 111 111
	// Net Base kop: 1 555 555 - 333 333 - 111 111 = 1 111 111 kop (11 111.11 RUB)
	assert.strictEqual(result.netBaseRevenueKop, 1111111);
	assert.strictEqual(result.netBaseRevenueRub, 11111.11);

	// Piecework: round(1 111 111 * 0.3) = round(333 333.3) = 333 333 kop (3 333.33 RUB)
	assert.strictEqual(result.pieceworkAccruedKop, 333333);

	// Service Salary Price: 500.50 RUB = 50 050 kop
	assert.strictEqual(result.serviceSalaryPriceKop, 50050);

	// Total Accrued: 333 333 + 50 050 = 383 383 kop (3 833.83 RUB)
	assert.strictEqual(result.totalAccruedKop, 383383);

	// NDFL: round(383 383 * 0.13) = round(49 839.79) = 49 840 kop (498.40 RUB)
	assert.strictEqual(result.ndflTaxKop, 49840);
	assert.strictEqual(result.ndflTaxRub, 498.40);

	// Net payout: 383 383 - 49 840 = 333 543 kop (3 335.43 RUB)
	assert.strictEqual(result.netPayoutKop, 333543);
	assert.strictEqual(result.netPayoutRub, 3335.43);
});

test("calculateServicesPayrollBreakdown: itemizes services with isExpensive flag for FNS deduction codes", () => {
	const result = calculateServicesPayrollBreakdown([
		{
			id: "srv-1",
			title: "Лечение кариеса (Терапия)",
			priceRub: 6000,
			materialsCostRub: 800,
			categoryPercent: 25,
			isExpensive: false, // Код 1
		},
		{
			id: "srv-2",
			title: "Установка имплантата Osstem (Хирургия)",
			priceRub: 45000,
			materialsCostRub: 12000,
			categoryPercent: 20,
			isExpensive: true, // Код 2
		},
		{
			id: "srv-3",
			title: "Коронка циркониевая CAD/CAM (Ортопедия)",
			priceRub: 25000,
			labCostRub: 9000,
			materialsCostRub: 500,
			categoryPercent: 25,
			salaryPriceRub: 1000,
			isExpensive: false,
		},
	]);

	assert.strictEqual(result.items.length, 3);
	assert.strictEqual(result.items[1]?.isExpensive, true);
	assert.strictEqual(result.items[0]?.isExpensive, false);

	// Total Gross: 6000 + 45000 + 25000 = 76 000 RUB = 7 600 000 kop
	assert.strictEqual(result.totalGrossKop, 7600000);
	// Total Lab: 9 000 RUB = 900 000 kop
	assert.strictEqual(result.totalLabKop, 900000);
	// Total Materials: 800 + 12000 + 500 = 13 300 RUB = 1 330 000 kop
	assert.strictEqual(result.totalMaterialsKop, 1330000);
	// Total Net Base: 76000 - 9000 - 13300 = 53 700 RUB = 5 370 000 kop
	assert.strictEqual(result.totalNetBaseKop, 5370000);
});

test("calculateDoctorNetSalary: Labor Code RF (ТК РФ ст. 137, 192) protects base salary from penalty deductions", () => {
	// Сценарий 1: Врачу назначен дисциплинарный штраф 5000 руб при нулевых бонусах
	// По ТК РФ штраф не может быть удержан из сдельной оплаты или оклада!
	const resultWithoutBonus = calculateDoctorNetSalary({
		grossRevenueRub: 100000,
		labCostRub: 20000,
		materialsCostRub: 10000,
		categoryPercent: 25, // Piecework = 17 500 RUB
		fixedSalaryRub: 10000, // Fixed = 10 000 RUB
		bonusesRub: 0,
		penaltiesRub: 5000, // Попытка вычесть штраф 5 000 ₽
		ndflRatePercent: 13,
	});

	// Сдельная часть и оклад не тронуты: 17 500 + 10 000 = 27 500 ₽ (штраф не вычитается)
	assert.strictEqual(resultWithoutBonus.totalAccruedRub, 27500);
	assert.strictEqual(resultWithoutBonus.effectiveBonusesRub, 0);

	// Сценарий 2: Штраф превышает начисленный бонус (депремирование только в пределах бонуса)
	const resultExceedingBonus = calculateDoctorNetSalary({
		grossRevenueRub: 100000,
		labCostRub: 20000,
		materialsCostRub: 10000,
		categoryPercent: 25,
		fixedSalaryRub: 10000,
		bonusesRub: 3000, // Бонус 3 000 ₽
		penaltiesRub: 8000, // Депремирование 8 000 ₽
		ndflRatePercent: 13,
	});

	// Бонус обнулился до 0 ₽, но база не уменьшилась: 17 500 + 10 000 + 0 = 27 500 ₽
	assert.strictEqual(resultExceedingBonus.effectiveBonusesRub, 0);
	assert.strictEqual(resultExceedingBonus.totalAccruedRub, 27500);
});

test("isGeneralClinicOverheadConsumable: protects standard clinic hygiene supplies from doctor salary deductions", () => {
	// Общеклинические расходники: НЕ удерживаются из зарплаты врача
	assert.strictEqual(isGeneralClinicOverheadConsumable("Салфетка нагрудная двухслойная"), true);
	assert.strictEqual(isGeneralClinicOverheadConsumable("Ватные валики стоматологические 10 мм"), true);
	assert.strictEqual(isGeneralClinicOverheadConsumable("Слюноотсос одноразовый с наконечником"), true);
	assert.strictEqual(isGeneralClinicOverheadConsumable("Перчатки нитриловые неопудренные размер M"), true);
	assert.strictEqual(isGeneralClinicOverheadConsumable("Маска медицинская трехслойная"), true);
	assert.strictEqual(isGeneralClinicOverheadConsumable("Стаканчик одноразовый пластиковый 200 мл"), true);
	assert.strictEqual(isGeneralClinicOverheadConsumable("Бахилы полиэтиленовые стандарт"), true);

	// Прямые клинические материалы: удерживаются при наличии техкарты списания
	assert.strictEqual(isGeneralClinicOverheadConsumable("Дентальный имплантат Straumann BLX 4.0"), false);
	assert.strictEqual(isGeneralClinicOverheadConsumable("Костный трансплантат Bio-Oss 0.5g"), false);
	assert.strictEqual(isGeneralClinicOverheadConsumable("Композитный шприц Filtek Ultimate A2"), false);
	assert.strictEqual(isGeneralClinicOverheadConsumable("Мембрана Bio-Gide 25x25 мм"), false);
	assert.strictEqual(isGeneralClinicOverheadConsumable("Анестетик Убистезин Форте 4% карпула"), false);
});

test("classifyServiceCategory: maps service titles and Order 804n codes to clinical specialties", () => {
	assert.strictEqual(classifyServiceCategory("Лечение кариеса и пломба световой полимеризации", "A16.07.002.001"), "therapy");
	assert.strictEqual(classifyServiceCategory("Металлокерамическая коронка на оксиде циркония", "A16.07.004"), "orthopedics");
	assert.strictEqual(classifyServiceCategory("Операция установки дентального имплантата", "A16.07.006"), "surgery");
	assert.strictEqual(classifyServiceCategory("Фиксация металлической брекет-системы Damon", "A16.07.048"), "orthodontics");
	assert.strictEqual(classifyServiceCategory("Профессиональная гигиена полости рта Air Flow", "A16.07.051"), "hygiene");
});

test("generateDoctorT51Html: generates compliant Unified Form T-51 payslip with itemized visits and lab orders", () => {
	const html = generateDoctorT51Html({
		organizationName: 'ООО "ДЕНТЕ ДЕНТАЛ КЛИНИК"',
		organizationInn: "7701234567",
		doctorName: "Смирнов Алексей Владимирович",
		personnelNumber: "ВР-007",
		specialtyTitle: "Врач-стоматолог ортопед",
		periodFromIso: "2026-08-01T00:00:00.000Z",
		periodToIso: "2026-08-31T23:59:59.000Z",
		grossRevenueRub: 150000,
		netBaseRevenueRub: 120000,
		pieceworkAccruedRub: 30000,
		fixedSalaryRub: 20000,
		bonusesRub: 5000,
		totalAccruedRub: 55000,
		ndflTaxRub: 7150,
		withheldLabRub: 25000,
		withheldMaterialRub: 5000,
		overheadConsumablesCoveredRub: 3400,
		netPayoutRub: 47850,
		visits: [
			{
				visitId: "v-1",
				visitDate: "2026-08-10T11:00:00.000Z",
				patientName: "Ковалев Игорь Николаевич",
				medicalCardNumber: "043/у-1082",
				serviceTitle: "Препарирование и коронка E.max",
				order804nCode: "A16.07.004.001",
				toothCode: "21",
				priceRub: 35000,
				accruedRub: 8750,
			},
		],
		labOrders: [
			{
				orderNumber: "ЗТЛ-9901",
				patientName: "Ковалев Игорь Николаевич",
				restorationType: "Безметалловая коронка E.max",
				toothFdi: "21",
				priceRub: 12000,
				withheldRub: 3000,
				isWarranty: false,
			},
			{
				orderNumber: "ЗТЛ-9902",
				patientName: "Сидорова Анна Павловна",
				restorationType: "Переделка циркониевого абатмента",
				toothFdi: "16",
				priceRub: 8000,
				withheldRub: 0,
				isWarranty: true, // Гарантия — 0 ₽ удержания
			},
		],
	});

	assert.ok(html.includes("Расчетный листок"));
	assert.ok(html.includes("Унифицированная форма № Т-51"));
	assert.ok(html.includes("Смирнов Алексей Владимирович"));
	assert.ok(html.includes("Ковалев Игорь Николаевич"));
	assert.ok(html.includes("A16.07.004.001"));
	assert.ok(html.includes("ЗТЛ-9901"));
	assert.ok(html.includes("Гарантия (0 ₽)"));
	assert.ok(html.includes("47") && html.includes("850"));
	assert.ok(html.includes("Общеклинические расходники"));
});

