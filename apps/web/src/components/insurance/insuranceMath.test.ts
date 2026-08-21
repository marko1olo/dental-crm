/**
 * insuranceMath.test.ts — Модульные тесты финансово-математического ядра ДМС,
 * копеечной точности, франшиз, исключений и генерации реестров/актов.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateRegistryTotals,
	calculateServiceDmsDistribution,
	exportRegistryToCsv,
	formatRubKopecks,
	generateBilateralAcceptanceActHtml,
	kopecksToRub,
	NOMENCLATURE_804N_CATALOG,
	rubToKopecks,
	RUSSIAN_DMS_INSURERS,
	search804nServices,
	type DmsRegistryServiceRecord,
} from "./insuranceMath";

describe("insuranceMath — Копеечная финансовая арифметика ДМС", () => {
	it("rubToKopecks и kopecksToRub должны переводить рубли в копейки без двоичных погрешностей", () => {
		assert.equal(rubToKopecks(0), 0);
		assert.equal(rubToKopecks(1250.5), 125050);
		assert.equal(rubToKopecks(99.99), 9999);
		assert.equal(rubToKopecks(100.005), 10001); // Округление до ближайшей копейки

		assert.equal(kopecksToRub(0), 0);
		assert.equal(kopecksToRub(125050), 1250.5);
		assert.equal(kopecksToRub(9999), 99.99);
	});

	it("formatRubKopecks должен форматировать денежные суммы с двумя знаками после запятой", () => {
		const formatted = formatRubKopecks(15000.5);
		assert.ok(formatted.includes("15") && (formatted.includes("50") || formatted.includes(",50")));
		assert.ok(formatted.includes("₽"));
	});
});

describe("insuranceMath — Распределение стоимости (DMS Covered vs Patient Copay)", () => {
	it("Базовое 100% покрытие услуги полисом ДМС", () => {
		const result = calculateServiceDmsDistribution({
			priceRub: 4500,
			quantity: 1,
			isExcluded: false,
		});

		assert.equal(result.lineTotalRub, 4500);
		assert.equal(result.dmsCoveredRub, 4500);
		assert.equal(result.patientPaidRub, 0);
		assert.equal(result.effectiveCoveragePct, 100);
		assert.equal(result.lineTotalRub, result.dmsCoveredRub + result.patientPaidRub);
	});

	it("Услуга из списка исключений (100% оплата пациентом)", () => {
		const result = calculateServiceDmsDistribution({
			priceRub: 35000,
			quantity: 1,
			isExcluded: true,
			isExplicitlyApproved: false,
		});

		assert.equal(result.lineTotalRub, 35000);
		assert.equal(result.dmsCoveredRub, 0);
		assert.equal(result.patientPaidRub, 35000);
		assert.equal(result.effectiveCoveragePct, 0);
		assert.equal(result.lineTotalRub, result.dmsCoveredRub + result.patientPaidRub);
	});

	it("Расчет с процентной франшизой (софинансирование 20% пациентом)", () => {
		const result = calculateServiceDmsDistribution({
			priceRub: 6700,
			quantity: 1,
			franchisePct: 20,
		});

		// 6700 * 0.20 = 1340 руб (пациент), 5360 руб (ДМС)
		assert.equal(result.lineTotalRub, 6700);
		assert.equal(result.dmsCoveredRub, 5360);
		assert.equal(result.patientPaidRub, 1340);
		assert.equal(result.effectiveCoveragePct, 80);
		assert.equal(result.lineTotalRub, result.dmsCoveredRub + result.patientPaidRub);
	});

	it("Расчет с фиксированной франшизой (1000 руб за прием)", () => {
		const result = calculateServiceDmsDistribution({
			priceRub: 4500,
			quantity: 1,
			franchiseFixedRub: 1000,
		});

		assert.equal(result.lineTotalRub, 4500);
		assert.equal(result.dmsCoveredRub, 3500);
		assert.equal(result.patientPaidRub, 1000);
		assert.equal(result.lineTotalRub, result.dmsCoveredRub + result.patientPaidRub);
	});

	it("Ограничение остатком гарантийного письма (Letter Limit Capping)", () => {
		const result = calculateServiceDmsDistribution({
			priceRub: 8200,
			quantity: 1,
			remainingLetterLimitRub: 5000,
		});

		assert.equal(result.lineTotalRub, 8200);
		assert.equal(result.dmsCoveredRub, 5000);
		assert.equal(result.patientPaidRub, 3200);
		assert.equal(result.lineTotalRub, result.dmsCoveredRub + result.patientPaidRub);
		assert.ok(result.reason.includes("ограничено остатком гарантийного письма"));
	});
});

describe("insuranceMath — Сводка реестра и проверка баланса", () => {
	const sampleRecords: DmsRegistryServiceRecord[] = [
		{
			id: "r1",
			visitId: "v1",
			visitDate: "2026-08-01",
			patientId: "p1",
			patientFullName: "Иванов И.И.",
			policyNumber: "POL-1",
			insurerName: "АО «СОГАЗ»",
			serviceCode804n: "A16.07.002.001",
			serviceName: "Пломба",
			diagnosisCodeMkb10: "K02.1",
			quantity: 1,
			unitPriceRub: 4500,
			totalPriceRub: 4500,
			dmsCoveredRub: 4500,
			patientPaidRub: 0,
			doctorFullName: "Врач 1",
			isExcluded: false,
		},
		{
			id: "r2",
			visitId: "v2",
			visitDate: "2026-08-02",
			patientId: "p2",
			patientFullName: "Петрова П.П.",
			policyNumber: "POL-2",
			insurerName: "СПАО «Ингосстрах»",
			serviceCode804n: "A16.07.030.002",
			serviceName: "Эндодонтия",
			diagnosisCodeMkb10: "K04.0",
			quantity: 1,
			unitPriceRub: 5800,
			totalPriceRub: 5800,
			dmsCoveredRub: 4640,
			patientPaidRub: 1160,
			doctorFullName: "Врач 2",
			isExcluded: false,
		},
	];

	it("calculateRegistryTotals вычисляет точные суммы и подтверждает баланс", () => {
		const summary = calculateRegistryTotals(sampleRecords, "Все компании", "01.08.2026", "31.08.2026");

		assert.equal(summary.totalServicesCount, 2);
		assert.equal(summary.uniquePatientsCount, 2);
		assert.equal(summary.totalAmountRub, 10300);
		assert.equal(summary.totalDmsCoveredRub, 9140);
		assert.equal(summary.totalPatientPaidRub, 1160);
		assert.equal(summary.isBalanced, true);
		assert.equal(summary.totalAmountRub, summary.totalDmsCoveredRub + summary.totalPatientPaidRub);
	});
});

describe("insuranceMath — Поиск номенклатурных услуг 804н", () => {
	it("search804nServices находит услуги по коду и названию", () => {
		const byCode = search804nServices("A16.07.002");
		assert.ok(byCode.length > 0);
		assert.ok(byCode.some((i) => i.code === "A16.07.002.001"));

		const byName = search804nServices("канал");
		assert.ok(byName.length > 0);
		assert.ok(byName.some((i) => i.categoryTitleRu === "Эндодонтия"));
	});
});

describe("insuranceMath — Экспорт CSV и двусторонний акт сдачи-приемки", () => {
	const clinicInfo = {
		name: 'ООО «ДЕНТЕ»',
		inn: "7701984210",
		address: "г. Москва",
		chiefDoctor: "Смирнов А.А.",
	};

	const sampleRecords: DmsRegistryServiceRecord[] = [
		{
			id: "r1",
			visitId: "v1",
			visitDate: "2026-08-01",
			patientId: "p1",
			patientFullName: "Иванов И.И.",
			policyNumber: "POL-1",
			insurerName: "АО «СОГАЗ»",
			serviceCode804n: "A16.07.002.001",
			serviceName: "Пломба",
			diagnosisCodeMkb10: "K02.1",
			quantity: 1,
			unitPriceRub: 4500,
			totalPriceRub: 4500,
			dmsCoveredRub: 4500,
			patientPaidRub: 0,
			doctorFullName: "Врач 1",
			isExcluded: false,
		},
	];

	it("exportRegistryToCsv формирует CSV с UTF-8 BOM и разделителем ';'", () => {
		const csv = exportRegistryToCsv(sampleRecords, clinicInfo, "АО «СОГАЗ»", "Август 2026");

		assert.ok(csv.startsWith("\uFEFF"), "Должен содержать UTF-8 BOM для корректного открытия в Excel");
		assert.ok(csv.includes(";"), "Разделитель должен быть точкой с запятой");
		assert.ok(csv.includes("АО «СОГАЗ»"));
		assert.ok(csv.includes("A16.07.002.001"));
		assert.ok(csv.includes("ИТОГО"));
	});

	it("generateBilateralAcceptanceActHtml генерирует корректный печатный акт", () => {
		const summary = calculateRegistryTotals(sampleRecords, "АО «СОГАЗ»", "01.08.2026", "31.08.2026");
		const html = generateBilateralAcceptanceActHtml({
			records: sampleRecords,
			summary,
			clinicInfo,
			insurerInfo: {
				name: "АО «СОГАЗ»",
				contractNumber: "123/26",
				contractDate: "01.01.2026",
				representative: "Куратор",
			},
			actNumber: "АКТ-01",
			actDate: "31.08.2026",
		});

		assert.ok(html.includes("АКТ СДАЧИ-ПРИЕМКИ № АКТ-01"));
		assert.ok(html.includes("ООО «ДЕНТЕ»"));
		assert.ok(html.includes("АО «СОГАЗ»"));
		assert.ok(html.includes(formatRubKopecks(4500)));
		assert.ok(html.includes("ОТ ИСПОЛНИТЕЛЯ"));
		assert.ok(html.includes("ОТ ЗАКАЗЧИКА"));
	});
});
