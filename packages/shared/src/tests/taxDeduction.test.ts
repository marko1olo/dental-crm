/**
 * taxDeduction.test.ts — Comprehensive Unit & Integration Tests for FNS Tax Deduction & Registry Engine.
 * Fully compliant with Order of FNS Russia from 08.11.2023 No. EA-7-11/824@ (КНД 1151156 / КНД 1184043 Формат 5.01).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	amountToWordsRu,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	calculateTaxDeductionSummary,
	classifyTaxDeduction804n,
	EXPENSIVE_TREATMENT_804N_CODES,
	FNS_FORMAT_VERSION_501,
	FNS_ORDER_824_NAME,
	generateFnsNoMedoplXml,
	generateFnsTaxDeductionBatchXml,
	generateFnsTaxDeductionXml,
	generateQrCodeDataUri,
	generateQrCodeSvg,
	generateTaxCertificateQrDataUri,
	generateTaxCertificateQrPayload,
	generateTaxCertificateQrSvg,
	KND_CERTIFICATE_FORM,
	KND_REGISTRY_ELECTRONIC_FORMAT,
	renderOfficialTaxCertificateKnd1151156Html,
	resolveTaxDeductionCategoryShared,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type TaxDeductionBatchParams,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
	validateInnIndividual,
	validateInnLegalEntity,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianPassport,
	validateRussianSnils,
} from "../fiscal/index.js";

describe("Tax Deduction & FNS Registry Engine (Order EA-7-11/824@, КНД 1151156 / 1184043)", () => {
	it("validates 10-digit legal entity and 12-digit individual Russian INN with FNS checksum algorithms", () => {
		// Valid 10-digit INN (Sberbank: 7707083893)
		const validInn10 = validateRussianInn("7707083893");
		assert.equal(validInn10.isValid, true);
		assert.equal(validateInnLegalEntity("7707083893").isValid, true);

		// Valid 12-digit individual INN (500100732259)
		// Check digit 11: 5*7+0*2+0*4+1*10+0*3+0*5+7*9+3*4+2*6+2*8 = 148 -> 148 % 11 = 5 % 10 = 5.
		// Check digit 12: 5*3+0*7+0*2+1*4+0*10+0*3+7*5+3*9+2*4+2*6+5*8 = 141 -> 141 % 11 = 9 % 10 = 9.
		const validInn12 = validateRussianInn("500100732259");
		assert.equal(validInn12.isValid, true);
		assert.equal(validateInnIndividual("500100732259").isValid, true);

		// Invalid 10-digit INN (corrupted check digit)
		const invalidInn10 = validateRussianInn("7707083894");
		assert.equal(invalidInn10.isValid, false);
		assert.ok(invalidInn10.errorMessageRu?.includes("контрольная сумма"));

		// Invalid 12-digit INN (corrupted check digit)
		const invalidInn12 = validateRussianInn("500100732258");
		assert.equal(invalidInn12.isValid, false);
		assert.ok(invalidInn12.errorMessageRu?.includes("контрольная сумма"));

		// All-zeros edge cases
		assert.equal(validateRussianInn("0000000000").isValid, false);
		assert.equal(validateRussianInn("000000000000").isValid, false);

		// Invalid lengths / characters
		assert.equal(validateRussianInn("12345").isValid, false);
		assert.equal(validateRussianInn("ABC123456789").isValid, false);
	});

	it("validates Russian KPP, OGRN, OGRNIP, SNILS, and Passport credentials", () => {
		// KPP validation
		assert.equal(validateRussianKpp("770101001").isValid, true);
		assert.equal(validateRussianKpp("770101").isValid, false);
		assert.equal(validateRussianKpp("").isValid, false);

		// OGRN 13-digit validation (1027700132195: 102770013219 % 11 = 5)
		assert.equal(validateRussianOgrn("1027700132195").isValid, true);
		assert.equal(validateRussianOgrn("1027700132194").isValid, false);

		// SNILS 11-digit validation
		const snilsValid = validateRussianSnils("11223344595");
		assert.equal(snilsValid.isValid, true);
		assert.equal(snilsValid.normalized, "112-233-445 95");
		assert.equal(validateRussianSnils("112233").isValid, false);

		// Passport validation (10 digits: 4 series + 6 number)
		const passValid = validateRussianPassport("4510 123456");
		assert.equal(passValid.isValid, true);
		assert.equal(passValid.normalized, "4510 123456");

		const passRaw = validateRussianPassport("4510123456");
		assert.equal(passRaw.isValid, true);
		assert.equal(passRaw.normalized, "4510 123456");

		assert.equal(validateRussianPassport("12345").isValid, false);
	});

	it("maps payer relationship codes according to FNS Order EA-7-11/824@", () => {
		assert.equal(TAX_DEDUCTION_RELATIONSHIP_MAP.patient.code, "1");
		assert.equal(TAX_DEDUCTION_RELATIONSHIP_MAP.patient.samePatientFlag, "1");
		assert.ok(TAX_DEDUCTION_RELATIONSHIP_MAP.patient.labelRu.includes("налогоплательщик"));

		assert.equal(TAX_DEDUCTION_RELATIONSHIP_MAP.spouse.code, "2");
		assert.equal(TAX_DEDUCTION_RELATIONSHIP_MAP.spouse.samePatientFlag, "0");
		assert.ok(TAX_DEDUCTION_RELATIONSHIP_MAP.spouse.labelRu.includes("Супруг"));

		assert.equal(TAX_DEDUCTION_RELATIONSHIP_MAP.parent.code, "3");
		assert.equal(TAX_DEDUCTION_RELATIONSHIP_MAP.parent.samePatientFlag, "0");
		assert.ok(TAX_DEDUCTION_RELATIONSHIP_MAP.parent.labelRu.includes("Родитель"));

		assert.equal(TAX_DEDUCTION_RELATIONSHIP_MAP.child.code, "4");
		assert.equal(TAX_DEDUCTION_RELATIONSHIP_MAP.child.samePatientFlag, "0");
		assert.ok(TAX_DEDUCTION_RELATIONSHIP_MAP.child.labelRu.includes("Ребенок"));
	});

	it("strictly resolves medical services per Nomenclature 804n into Code 01 (standard) and Code 02 (expensive)", () => {
		// Code 02 by 804n code
		assert.equal(resolveTaxDeductionCategoryShared("A16.07.054"), "2");     // Дентальная имплантация
		assert.equal(resolveTaxDeductionCategoryShared("A16.07.054.001"), "2"); // Внутрикостная имплантация
		assert.equal(resolveTaxDeductionCategoryShared("A16.07.041.002"), "2"); // Синус-лифтинг
		assert.equal(resolveTaxDeductionCategoryShared("A16.07.041"), "2");     // Костная пластика
		assert.equal(resolveTaxDeductionCategoryShared("A16.07.055"), "2");     // Реконструктивные операции
		assert.equal(resolveTaxDeductionCategoryShared("A16.07.096"), "2");     // Расщепление альвеолярного гребня

		// Code 02 by clinical keywords
		assert.equal(resolveTaxDeductionCategoryShared(undefined, "Установка имплантата Straumann SLA"), "2");
		assert.equal(resolveTaxDeductionCategoryShared(undefined, "Открытый синус-лифтинг с костной пластикой"), "2");
		assert.equal(resolveTaxDeductionCategoryShared(undefined, "Тотальная реабилитация All-on-4 на имплантах"), "2");
		assert.equal(resolveTaxDeductionCategoryShared(undefined, "Скуловая имплантация Zygoma"), "2");
		assert.equal(resolveTaxDeductionCategoryShared(undefined, "Аугментация альвеолярного гребня костным блоком"), "2");

		// Code 01 (standard treatment)
		assert.equal(resolveTaxDeductionCategoryShared("A16.07.002.001", "Лечение глубокого кариеса"), "1");
		assert.equal(resolveTaxDeductionCategoryShared("A16.07.030", "Эндодонтическое лечение пульпита"), "1");
		assert.equal(resolveTaxDeductionCategoryShared("A16.07.051", "Профессиональная гигиена AirFlow"), "1");
		assert.equal(resolveTaxDeductionCategoryShared("A16.07.048", "Фиксация брекет-системы Damon Q"), "1");
		assert.equal(resolveTaxDeductionCategoryShared("A16.07.004", "Установка металлокерамической коронки"), "1");
		assert.equal(resolveTaxDeductionCategoryShared("A16.07.001", "Удаление постоянного зуба простое"), "1");

		// Detailed classifier
		const classification02 = classifyTaxDeduction804n("A16.07.054.001");
		assert.equal(classification02.categoryCode, "2");
		assert.equal(classification02.isExpensiveTreatment, true);
		assert.equal(classification02.hasAnnualLimit, false);

		const classification01 = classifyTaxDeduction804n("A16.07.002");
		assert.equal(classification01.categoryCode, "1");
		assert.equal(classification01.isExpensiveTreatment, false);
		assert.equal(classification01.hasAnnualLimit, true);
		assert.equal(classification01.statutoryLimitRub, 150000);
	});

	it("calculates multi-year tax deduction summary (1–3 years) with kopeck precision and statutory limits", () => {
		const samplePayments: TaxDeductionPaymentItem[] = [
			// 2024 Year: 120 000.50 ₽ therapy (Code 01) + 180 000 ₽ implants (Code 02)
			{
				id: "pay-1",
				dateIso: "2024-03-15T10:00:00Z",
				receiptNumber: "001",
				fiscalDocumentNumber: "101",
				fiscalSign: "987654321",
				serviceName: "Лечение кариеса и пульпита",
				code804n: "A16.07.002.001",
				amountRub: 120000.50,
			},
			{
				id: "pay-2",
				dateIso: "2024-06-20T14:30:00Z",
				receiptNumber: "002",
				fiscalDocumentNumber: "102",
				fiscalSign: "987654322",
				serviceName: "Дентальная имплантация Nobel Biocare",
				code804n: "A16.07.054.001",
				amountRub: 180000,
			},
			// 2025 Year: 200 000 ₽ therapy (Code 01 -> capped at 150k for tax base)
			{
				id: "pay-3",
				dateIso: "2025-02-10T12:00:00Z",
				receiptNumber: "003",
				fiscalDocumentNumber: "103",
				fiscalSign: "987654323",
				serviceName: "Ортодонтическое лечение элайнерами",
				code804n: "A16.07.048",
				amountRub: 200000,
			},
		];

		const summary = calculateTaxDeductionSummary(samplePayments);

		assert.equal(summary.totalReceiptsCount, 3);
		assert.equal(summary.yearsSummary.length, 2);

		// Year 2025: Code 01 = 200 000 ₽ (capped at 150k -> 13% of 150k = 19 500 ₽)
		const y2025 = summary.yearsSummary.find((y) => y.taxYear === 2025)!;
		assert.ok(y2025);
		assert.equal(y2025.code01Rub, 200000);
		assert.equal(y2025.code02Rub, 0);
		assert.equal(y2025.code01EligibleRub, 150000);
		assert.equal(y2025.refund13EstimateRub, 19500); // 150 000 * 0.13

		// Year 2024: Code 01 = 120 000.50 ₽, Code 02 = 180 000 ₽ (unlimited)
		// Refund: (120 000.50 * 0.13) + (180 000 * 0.13) = 15 600.065 + 23 400 = 39 000.07 ₽
		const y2024 = summary.yearsSummary.find((y) => y.taxYear === 2024)!;
		assert.ok(y2024);
		assert.equal(y2024.code01Kopecks, 12000050);
		assert.equal(y2024.code02Rub, 180000);
		assert.equal(y2024.totalKopecks, 30000050);
		assert.equal(y2024.refund13EstimateRub, 39000.07);

		// Grand totals
		assert.equal(summary.grandTotalKopecks, 50000050); // 500 000.50 ₽
		assert.equal(summary.grandTotalRub, 500000.5);
		assert.equal(summary.grandTotalRefund13Rub, 58500.07); // 19 500 + 39 000.07
		assert.ok(summary.totalAmountInWordsRu.includes("руб"));
	});

	it("translates kopeck amounts to Russian words accurately with correct declensions", () => {
		assert.equal(amountToWordsRu(0), "Ноль рублей 00 копеек");
		assert.equal(amountToWordsRu(100), "Один рубль 00 копеек");
		assert.equal(amountToWordsRu(250), "Два рубля 50 копеек");
		assert.equal(amountToWordsRu(515), "Пять рублей 15 копеек");
		assert.equal(amountToWordsRu(15000000), "Сто пятьдесят тысяч рублей 00 копеек");
		assert.equal(
			amountToWordsRu(12345678),
			"Сто двадцать три тысячи четыреста пятьдесят шесть рублей 78 копеек"
		);
	});

	it("generates pure TypeScript ISO/IEC 18004 QR codes as crisp SVG and Data-URI", () => {
		const text = "https://lkfl2.nalog.ru/lkfl/deduction/verify?knd=1151156&inn=7707083893";
		const svg = generateQrCodeSvg(text, { size: 140 });
		assert.ok(svg.startsWith("<svg"));
		assert.ok(svg.includes("viewBox="));
		assert.ok(svg.includes("<path"));
		assert.ok(svg.endsWith("</svg>"));

		const dataUri = generateQrCodeDataUri(text);
		assert.ok(dataUri.startsWith("data:image/svg+xml;base64,"));
	});

	it("generates official XML registry matching Order EA-7-11/824@ (КНД 1184043, format 5.01)", () => {
		const certificateParams: TaxDeductionCertificateParams = {
			certificateNumber: "842",
			issueDateIso: "2026-08-25T12:00:00Z",
			taxYear: 2024,
			taxOfficeCode: "7701",
			clinic: {
				legalName: "ООО «ДЕНТЕ КЛИНИКА»",
				inn: "7707083893",
				kpp: "770101001",
				ogrn: "1027700132195",
				licenseNumber: "ЛО41-01137-77/00368421",
				licenseDate: "12.10.2021",
				address: "г. Москва, ул. Стоматологическая, д. 10",
				chiefDoctorName: "Иванов Иван Иванович",
			},
			payer: {
				fullName: "Смирнов Алексей Викторович",
				inn: "500100732259",
				birthDate: "1985-05-12",
				identityDocumentSeries: "4510",
				identityDocumentNumber: "123456",
				relationship: "patient",
			},
			patient: {
				fullName: "Смирнов Алексей Викторович",
				birthDate: "1985-05-12",
			},
			payments: [
				{
					id: "p1",
					dateIso: "2024-04-10T10:00:00Z",
					receiptNumber: "001",
					fiscalDocumentNumber: "12345",
					fiscalSign: "987654321",
					serviceName: "Терапевтическое лечение кариеса",
					code804n: "A16.07.002.001",
					amountRub: 50000,
				},
				{
					id: "p2",
					dateIso: "2024-05-20T11:00:00Z",
					receiptNumber: "002",
					fiscalDocumentNumber: "12346",
					fiscalSign: "987654322",
					serviceName: "Дентальная имплантация Straumann",
					code804n: "A16.07.054",
					amountRub: 150000,
				},
			],
		};

		// Test VO_SPRRECH format
		const xmlGen = generateFnsTaxDeductionXml(certificateParams);
		assert.ok(xmlGen.fileName.startsWith("VO_SPRRECH_7701_7707083893_770101001_"));
		assert.ok(xmlGen.fileName.endsWith(".xml"));

		const xml = xmlGen.xmlContent;
		assert.ok(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(xml.includes('ВерсФорм="5.01"'));
		assert.ok(xml.includes('<Документ КНД="1184043" КодНО="7701" ОтчГод="2024"'));
		assert.ok(xml.includes('ИННЮЛ="7707083893"'));
		assert.ok(xml.includes('НаимОрг="ООО «ДЕНТЕ КЛИНИКА»"'));
		assert.ok(xml.includes('НомерСвед="842"'));
		assert.ok(xml.includes('ПрПациент="1"'));
		assert.ok(xml.includes('ИННФЛ="500100732259"'));
		assert.ok(xml.includes('СуммаКод1="50000.00"'));
		assert.ok(xml.includes('СуммаКод2="150000.00"'));
		assert.ok(xml.includes('СуммаВсего="200000.00"'));
		assert.ok(xml.includes('<ТаблРасх НомЧек="1" НомФД="12345"'));

		// Test NO_MEDOPL format
		const noMedopl = generateFnsNoMedoplXml(certificateParams);
		assert.ok(noMedopl.fileName.startsWith("NO_MEDOPL_7701_7707083893_770101001_"));
		assert.ok(noMedopl.xmlContent.includes('ВерсФорм="5.01"'));
		assert.ok(noMedopl.xmlContent.includes('<СвМО ИННЮЛ="7707083893"'));
		assert.ok(noMedopl.xmlContent.includes('<СумОплМедУсл КодУслуги="1" СумОпл="50000.00"'));
		assert.ok(noMedopl.xmlContent.includes('<СумОплМедУсл КодУслуги="2" СумОпл="150000.00"'));

		// Test QR payload and SVG
		const qrPayload = generateTaxCertificateQrPayload(certificateParams);
		assert.ok(qrPayload.includes("https://lkfl2.nalog.ru/lkfl/deduction/verify"));
		assert.ok(qrPayload.includes("knd=1151156"));
		assert.ok(qrPayload.includes("inn=7707083893"));
		assert.ok(qrPayload.includes("cert=842"));

		const qrSvg = generateTaxCertificateQrSvg(certificateParams);
		assert.ok(qrSvg.startsWith("<svg"));
		assert.ok(qrSvg.endsWith("</svg>"));

		// Test Printable A4 HTML
		const a4Html = renderOfficialTaxCertificateKnd1151156Html(certificateParams);
		assert.ok(a4Html.includes("Форма по КНД 1151156"));
		assert.ok(a4Html.includes("ФНС России"));
		assert.ok(a4Html.includes("№ 842"));
		assert.ok(a4Html.includes("Код 01"));
		assert.ok(a4Html.includes("Код 02"));
		assert.ok(a4Html.includes("ОПЛАЧЕНО"));
		assert.ok(a4Html.includes("<svg"));
	});

	it("generates batch XML registry for multiple patients and kinship members", () => {
		const batchParams: TaxDeductionBatchParams = {
			taxYear: 2024,
			taxOfficeCode: "7701",
			clinic: {
				legalName: "ООО «ДЕНТЕ КЛИНИКА»",
				inn: "7707083893",
				kpp: "770101001",
				ogrn: "1027700132195",
				licenseNumber: "ЛО41-01137-77/00368421",
				licenseDate: "12.10.2021",
				address: "г. Москва, ул. Стоматологическая, д. 10",
				chiefDoctorName: "Иванов Иван Иванович",
			},
			certificates: [
				{
					certificateNumber: "101",
					issueDateIso: "2026-08-25T10:00:00Z",
					taxYear: 2024,
					clinic: {
						legalName: "ООО «ДЕНТЕ КЛИНИКА»",
						inn: "7707083893",
						address: "г. Москва",
					},
					payer: {
						fullName: "Иванов Иван Иванович",
						inn: "500100732259",
						relationship: "patient",
					},
					patient: {
						fullName: "Иванов Иван Иванович",
					},
					payments: [
						{
							id: "p1",
							dateIso: "2024-03-10T10:00:00Z",
							receiptNumber: "001",
							fiscalDocumentNumber: "111",
							fiscalSign: "999",
							serviceName: "Имплантация",
							code804n: "A16.07.054",
							amountRub: 100000,
						},
					],
				},
				{
					certificateNumber: "102",
					issueDateIso: "2026-08-25T10:30:00Z",
					taxYear: 2024,
					clinic: {
						legalName: "ООО «ДЕНТЕ КЛИНИКА»",
						inn: "7707083893",
						address: "г. Москва",
					},
					payer: {
						fullName: "Иванов Иван Иванович",
						inn: "500100732259",
						relationship: "child",
					},
					patient: {
						fullName: "Иванова Мария Ивановна",
						birthDate: "2015-06-20",
					},
					payments: [
						{
							id: "p2",
							dateIso: "2024-04-12T10:00:00Z",
							receiptNumber: "002",
							fiscalDocumentNumber: "112",
							fiscalSign: "998",
							serviceName: "Детская терапия",
							code804n: "A16.07.002",
							amountRub: 15000,
						},
					],
				},
			],
		};

		const batchGen = generateFnsTaxDeductionBatchXml(batchParams);
		assert.equal(batchGen.certificatesCount, 2);
		assert.ok(batchGen.fileName.startsWith("VO_SPRRECH_7701_"));
		assert.ok(batchGen.xmlContent.includes('НомерСвед="101"'));
		assert.ok(batchGen.xmlContent.includes('НомерСвед="102"'));
		assert.ok(batchGen.xmlContent.includes('КодРодств="4"'));
		assert.ok(batchGen.xmlContent.includes('Пациент ФИО="Иванова Мария Ивановна"'));
	});
});
