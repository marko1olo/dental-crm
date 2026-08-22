/**
 * ============================================================================
 * DMS INSURANCE & PRE-AUTHORIZATION ENGINE UNIT TESTS
 * Исчерпывающее тестирование каталогов ДМС РФ, правил исключений,
 * копеечной математики, сплит-расчетов, предсогласования и генерации реестров.
 * ============================================================================
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateDmsSplitInvoice,
	type DmsBillItemInput,
	exportRegistryToCsv,
	formatKopecks,
	generateBilateralAcceptanceActHtml,
	generateDmsPreAuthRequest,
	generateDmsStatutoryRegistry,
	kopecksToRub,
	rubToKopecks,
	verifyServiceForDms,
} from "../components/insurance/dmsManager/dmsInsuranceEngine";
import {
	type DmsGuaranteeLetterRecord,
	getNomenclature804nByCode,
	getStatutoryInsurerById,
	getStatutoryProgramByKey,
	SAMPLE_DMS_GUARANTEE_LETTERS,
	STATUTORY_804N_NOMENCLATURE,
	STATUTORY_DMS_EXCLUSION_RULES,
	STATUTORY_DMS_INSURERS,
	STATUTORY_DMS_PROGRAMS,
} from "../components/insurance/dmsManager/dmsInsurancePresets";

describe("DMS Insurance Catalog & Presets (РФ ДМС-2026)", () => {
	it("Каталог ведущих страховщиков содержит всех обязательных участников рынка", () => {
		assert.ok(STATUTORY_DMS_INSURERS.length >= 6);

		const requiredInsurers = [
			"sogaz",
			"ingosstrakh",
			"reso_garantiya",
			"alfastrakhovanie",
			"vsk",
			"soglasie",
		];

		for (const insId of requiredInsurers) {
			const ins = getStatutoryInsurerById(insId);
			assert.ok(ins, `Страховщик ${insId} должен присутствовать в каталоге`);
			assert.equal(ins.inn.length, 10, `ИНН должен быть 10 цифр: ${ins.inn}`);
			assert.equal(ins.ogrn.length, 13, `ОГРН должен быть 13 цифр: ${ins.ogrn}`);
			assert.ok(ins.phone.length > 5);
			assert.ok(ins.email.includes("@"));
			assert.ok(ins.portalUrl.startsWith("https://"));
			assert.ok(ins.defaultSlaHours >= 24);
			assert.ok(ins.supportedPrograms.length >= 2);
		}
	});

	it("Справочник программ ДМС содержит стандартные и VIP пакеты", () => {
		assert.ok(STATUTORY_DMS_PROGRAMS.standard_therapy);
		assert.ok(STATUTORY_DMS_PROGRAMS.vip_full_coverage);
		assert.ok(STATUTORY_DMS_PROGRAMS.extended_surgery_hygiene);
		assert.ok(STATUTORY_DMS_PROGRAMS.economy_emergency_only);

		const std = getStatutoryProgramByKey("standard_therapy");
		assert.equal(std.coversImplantation, false);
		assert.equal(std.coversVeneers, false);
		assert.equal(std.coversBleaching, false);
		assert.equal(std.maxHygienePerYear, 1);

		const vip = getStatutoryProgramByKey("vip_full_coverage");
		assert.equal(vip.coversCt3D, true);
		assert.equal(vip.maxHygienePerYear, 2);
	});

	it("Правила исключений определяют запрещенные манипуляции", () => {
		assert.ok(STATUTORY_DMS_EXCLUSION_RULES.length >= 5);

		const implantRule = STATUTORY_DMS_EXCLUSION_RULES.find((r) =>
			r.matchingNomenclatureCodes.includes("A16.07.054"),
		);
		assert.ok(implantRule);
		assert.ok(implantRule.matchingKeywords.includes("имплант"));

		const veneerRule = STATUTORY_DMS_EXCLUSION_RULES.find((r) =>
			r.matchingNomenclatureCodes.includes("A16.07.003"),
		);
		assert.ok(veneerRule);
		assert.equal(veneerRule.allowsPreAuthOverride, false);
	});

	it("Справочник номенклатуры 804н содержит терапию, хирургию, рентген и анестезию", () => {
		assert.ok(STATUTORY_804N_NOMENCLATURE.length >= 10);

		const caries = getNomenclature804nByCode("A16.07.002.001");
		assert.ok(caries);
		assert.equal(caries.category, "therapy");
		assert.equal(caries.isBaseDmsCovered, true);

		const anesthesia = getNomenclature804nByCode("A11.07.010");
		assert.ok(anesthesia);
		assert.equal(anesthesia.isBaseDmsCovered, true);
	});
});

describe("DMS Currency & Kopeck Math Engine", () => {
	it("rubToKopecks и kopecksToRub переводят рубли в копейки без дрейфа", () => {
		assert.equal(rubToKopecks(0), 0);
		assert.equal(rubToKopecks(1250.5), 125050);
		assert.equal(rubToKopecks(99.99), 9999);
		assert.equal(rubToKopecks(100.004), 10000);
		assert.equal(rubToKopecks(100.006), 10001);

		assert.equal(kopecksToRub(0), 0);
		assert.equal(kopecksToRub(125050), 1250.5);
		assert.equal(kopecksToRub(9999), 99.99);
	});

	it("formatKopecks возвращает корректно отформатированную строку рублей", () => {
		const str = formatKopecks(5000000); // 50 000 руб
		assert.ok(str.includes("50") && str.includes("000"));
		assert.ok(str.includes("₽") || str.includes("RUB"));
	});
});

describe("DMS Service Verification Engine (Pre-Auth Logic)", () => {
	it("Базовая терапевтическая услуга автоматически согласуется в стандартной программе", () => {
		const res = verifyServiceForDms({
			serviceCode804n: "A16.07.002.001",
			serviceName: "Восстановление зуба пломбой светоотверждаемой",
			toothNumber: "1.6",
			programKey: "standard_therapy",
			requestedPriceKopecks: 380000,
		});

		assert.equal(res.status, "approved");
		assert.equal(res.isCovered, true);
		assert.equal(res.dmsPayableKopecks, 380000);
		assert.equal(res.patientPayableKopecks, 0);
	});

	it("Услуга-исключение (отбеливание Zoom 4) отклоняется", () => {
		const res = verifyServiceForDms({
			serviceCode804n: "A16.07.050",
			serviceName: "Клиническое фотоотбеливание Zoom 4",
			programKey: "standard_therapy",
			requestedPriceKopecks: 2600000,
		});

		assert.equal(res.status, "rejected_exclusion");
		assert.equal(res.isCovered, false);
		assert.equal(res.dmsPayableKopecks, 0);
		assert.equal(res.patientPayableKopecks, 2600000);
		assert.equal(res.isExcludedByRule, true);
	});

	it("Гарантийное письмо с согласованным кодом и зубом покрывает услугу в пределах остатка", () => {
		const letter: DmsGuaranteeLetterRecord = {
			id: "gl-test-1",
			letterNumber: "ГП-TEST-001",
			insurerId: "sogaz",
			insurerName: "АО «СОГАЗ»",
			patientId: "pat-1",
			patientFullName: "Иванов И.И.",
			policyNumber: "ПОЛ-123",
			programKey: "standard_therapy",
			issueDate: "2026-08-01",
			validUntil: "2026-12-31",
			totalLimitKopecks: 5000000, // 50 000 руб
			usedAmountKopecks: 1000000, // 10 000 руб использовано
			approvedNomenclatureCodes: ["A16.07.030.001", "A16.07.008.002"],
			approvedTeeth: ["1.6"],
			diagnosisMkb10: ["K04.0"],
			status: "active",
			curatorFullName: "Куратор",
			curatorPhone: "8800",
			curatorEmail: "cur@sogaz.ru",
			attachedXrayUris: [],
			notes: "",
		};

		const res = verifyServiceForDms({
			serviceCode804n: "A16.07.030.001",
			serviceName: "Инструментальная обработка корневого канала",
			toothNumber: "1.6",
			programKey: "standard_therapy",
			guaranteeLetter: letter,
			requestedPriceKopecks: 210000,
		});

		assert.equal(res.status, "approved");
		assert.equal(res.isCovered, true);
		assert.equal(res.dmsPayableKopecks, 210000);
		assert.equal(res.patientPayableKopecks, 0);
		assert.equal(res.approvedByGuaranteeLetter, true);
	});

	it("Просроченное гарантийное письмо отклоняется", () => {
		const expiredLetter = SAMPLE_DMS_GUARANTEE_LETTERS.find(
			(l) => l.status === "expired",
		);
		assert.ok(expiredLetter);

		const res = verifyServiceForDms({
			serviceCode804n: "A16.07.002.001",
			serviceName: "Пломба",
			toothNumber: "1.1",
			programKey: "vip_full_coverage",
			guaranteeLetter: expiredLetter,
			requestedPriceKopecks: 380000,
		});

		assert.equal(res.status, "requires_letter");
		assert.equal(res.isCovered, false);
	});
});

describe("DMS Split-Invoicing Engine (Iron Balance & Copay)", () => {
	const items: DmsBillItemInput[] = [
		{
			id: "1",
			serviceCode804n: "A16.07.002.001",
			serviceName: "Восстановление зуба пломбой (кариес)",
			toothNumber: "1.6",
			quantity: 1,
			unitPriceKopecks: 380000, // 3 800 руб
		},
		{
			id: "2",
			serviceCode804n: "A11.07.010",
			serviceName: "Анестезия инфильтрационная",
			quantity: 1,
			unitPriceKopecks: 95000, // 950 руб
		},
		{
			id: "3",
			serviceCode804n: "A16.07.050",
			serviceName: "Клиническое фотоотбеливание Zoom 4 (Исключение)",
			quantity: 1,
			unitPriceKopecks: 2600000, // 26 000 руб
		},
	];

	it("Разделение счетов со 100% покрытием терапии и оплатой пациентом исключений", () => {
		const result = calculateDmsSplitInvoice(items, "standard_therapy");

		assert.equal(result.totalBillKopecks, 380000 + 95000 + 2600000);
		assert.equal(result.totalDmsCoveredKopecks, 380000 + 95000);
		assert.equal(result.totalPatientCoPayKopecks, 2600000);
		assert.equal(result.balanceInvariantHolds, true);
		assert.equal(
			result.totalBillKopecks,
			result.totalDmsCoveredKopecks + result.totalPatientCoPayKopecks,
		);
	});

	it("Расчет с процентной франшизой 20%", () => {
		const therapyItems: DmsBillItemInput[] = [
			{
				id: "1",
				serviceCode804n: "A16.07.002.001",
				serviceName: "Пломба",
				quantity: 1,
				unitPriceKopecks: 1000000, // 10 000 руб
			},
		];

		const result = calculateDmsSplitInvoice(
			therapyItems,
			"standard_therapy",
			null,
			{
				franchisePercent: 20,
			},
		);

		assert.equal(result.totalBillKopecks, 1000000);
		assert.equal(result.totalDmsCoveredKopecks, 800000); // 8 000 руб
		assert.equal(result.totalPatientCoPayKopecks, 200000); // 2 000 руб
		assert.equal(result.balanceInvariantHolds, true);
	});

	it("Расчет с фиксированной франшизой 1500 руб", () => {
		const therapyItems: DmsBillItemInput[] = [
			{
				id: "1",
				serviceCode804n: "A16.07.002.001",
				serviceName: "Пломба",
				quantity: 1,
				unitPriceKopecks: 500000, // 5 000 руб
			},
		];

		const result = calculateDmsSplitInvoice(
			therapyItems,
			"standard_therapy",
			null,
			{
				franchiseFixedKopecks: 150000, // 1 500 руб
			},
		);

		assert.equal(result.totalBillKopecks, 500000);
		assert.equal(result.totalDmsCoveredKopecks, 350000);
		assert.equal(result.totalPatientCoPayKopecks, 150000);
		assert.equal(result.balanceInvariantHolds, true);
	});
});

describe("DMS Pre-Auth Request & Statutory Registry Generation", () => {
	it("Генератор запроса предсогласования формирует валидный документ и HTML", () => {
		const doc = generateDmsPreAuthRequest({
			insurerId: "sogaz",
			patient: {
				id: "pat-1",
				fullName: "Иванов Сергей Александрович",
				policyNumber: "СГЗ-77-991283",
			},
			programKey: "standard_therapy",
			diagnosisMkb10: {
				code: "K04.0",
				title: "Острый пульпит",
			},
			toothNumber: "1.6",
			requestedServices: [
				{
					code804n: "A16.07.030.001",
					name: "Инструментальная обработка корневого канала",
					quantity: 3,
					priceKopecks: 210000,
				},
			],
			clinicalJustification: "Острые ночные боли",
			attachedXrayStudies: [
				{
					id: "xr-1",
					type: "periapical",
					title: "Снимок 1.6",
					date: "2026-08-22",
				},
			],
			attendingDoctor: {
				fullName: "Д-р Смирнов К.В.",
				specialty: "Терапевт",
				signatureDate: "2026-08-22",
			},
		});

		assert.ok(doc.documentId);
		assert.ok(doc.requestNumber.startsWith("ПРЕ-АВТ-SOGA"));
		assert.equal(doc.totalRequestedKopecks, 630000);
		assert.ok(doc.printableHtml.includes("Иванов Сергей Александрович"));
		assert.ok(doc.printableHtml.includes("K04.0"));
		assert.ok(doc.printableHtml.includes("A16.07.030.001"));
	});

	it("Генератор реестра формирует корректные итоги, CSV и Акт сдачи-приемки", () => {
		const registry = generateDmsStatutoryRegistry({
			registryNumber: "РЕЕСТР-001",
			periodStart: "2026-08-01",
			periodEnd: "2026-08-31",
			insurerId: "sogaz",
			visitServices: [
				{
					visitId: "v-1",
					visitDate: "2026-08-10",
					patientFullName: "Иванов Сергей Александрович",
					policyNumber: "СГЗ-77-991283",
					guaranteeLetterNumber: "ГП-СОГАЗ-2026-8812",
					diagnosisMkb10: "K04.0",
					toothNumber: "1.6",
					serviceCode804n: "A16.07.030.001",
					serviceName: "Обработка канала",
					doctorFullName: "Д-р Смирнов К.В.",
					quantity: 3,
					unitPriceKopecks: 210000,
					totalBillKopecks: 630000,
					dmsAcceptedKopecks: 630000,
					patientPaidKopecks: 0,
				},
			],
		});

		assert.equal(registry.totalVisitsCount, 1);
		assert.equal(registry.uniquePatientsCount, 1);
		assert.equal(registry.grandTotalBillKopecks, 630000);
		assert.equal(registry.grandTotalDmsKopecks, 630000);
		assert.equal(registry.grandTotalPatientKopecks, 0);

		// CSV экспорт
		const csv = exportRegistryToCsv(registry);
		assert.ok(csv.startsWith("\uFEFF")); // UTF-8 BOM
		assert.ok(csv.includes("Иванов Сергей Александрович"));
		assert.ok(csv.includes("A16.07.030.001"));
		assert.ok(csv.includes("6300.00"));
		assert.ok(csv.includes("Без НДС (пп. 2 п. 2 ст. 149 НК РФ)"));

		// Акт сдачи-приемки
		const actHtml = generateBilateralAcceptanceActHtml(registry);
		assert.ok(actHtml.includes("АКТ СДАЧИ-ПРИЕМКИ"));
		assert.ok(actHtml.includes("РЕЕСТР-001"));
		assert.ok(actHtml.includes("СОГАЗ"));
		assert.ok(actHtml.includes("149"));
	});
});
