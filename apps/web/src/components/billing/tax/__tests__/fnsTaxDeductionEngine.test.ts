import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	amountToWordsRu,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024,
	calculateExactTaxSplitKopecks,
	calculateTaxDeductionSummary,
	classifyTaxDeduction804n,
	escapeXmlString,
	EXPENSIVE_TREATMENT_804N_CODES,
	FNS_FORMAT_VERSION_501,
	FNS_ORDER_824_NAME,
	generateFnsFormKnd1151156BarcodeSvg,
	generateFnsNoMedoplXml,
	generateFnsTaxDeductionBatchXml,
	generateFnsTaxDeductionXml,
	generateTaxCertificateQrDataUri,
	generateTaxCertificateQrPayload,
	generateTaxCertificateQrSvg,
	KND_CERTIFICATE_FORM,
	KND_REGISTRY_ELECTRONIC_FORMAT,
	kopecksBigIntToRub,
	renderOfficialTaxCertificateKnd1151156Html,
	resolveTaxDeductionCategoryShared,
	rubToKopecksBigInt,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type TaxDeductionBatchParams,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
	validateFnsTaxXmlStructure,
	validateInnIndividual,
	validateInnLegalEntity,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianPassport,
	validateRussianSnils,
	validateTaxCertificateParams,
} from "../fnsTaxDeductionEngine";

describe("fnsTaxDeductionEngine — FNS Russia Tax Deduction & Act 804n / PP 458 Engine", () => {
	// Sample Clinic & Patient Data for testing
	const sampleClinic = {
		legalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		inn: "7707083893", // Valid 10-digit INN
		kpp: "770101001",
		ogrn: "1027700132195",
		licenseNumber: "ЛО41-01137-77/00368421",
		licenseDate: "12.10.2021",
		address: "г. Москва, ул. Большая Стоматологическая, д. 12",
		chiefDoctorName: "Барабаш Сергей Владимирович",
	};

	const samplePayer = {
		fullName: "Смирнов Алексей Викторович",
		inn: "500100732259", // Valid 12-digit INN
		birthDate: "1985-05-12",
		identityDocumentSeries: "4510",
		identityDocumentNumber: "123456",
		relationship: "patient" as const,
	};

	const samplePayments: TaxDeductionPaymentItem[] = [
		{
			id: "p1",
			dateIso: "2024-03-10T10:00:00Z",
			receiptNumber: "001",
			fiscalDocumentNumber: "1001",
			fiscalSign: "123456789",
			serviceName: "Лечение кариеса (Терапия)",
			code804n: "A16.07.002.001",
			amountRub: 50000,
			taxCode: "1",
		},
		{
			id: "p2",
			dateIso: "2024-06-15T12:00:00Z",
			receiptNumber: "002",
			fiscalDocumentNumber: "1002",
			fiscalSign: "123456790",
			serviceName: "Дентальная имплантация Nobel Biocare",
			code804n: "A16.07.054.001",
			amountRub: 180000,
			taxCode: "2",
		},
		{
			id: "p3",
			dateIso: "2024-09-20T15:00:00Z",
			receiptNumber: "003",
			fiscalDocumentNumber: "1003",
			fiscalSign: "123456791",
			serviceName: "Синус-лифтинг и костная пластика Bio-Oss",
			code804n: "A16.07.041.002",
			amountRub: 70000,
			taxCode: "2",
		},
		{
			id: "p4",
			dateIso: "2024-11-05T16:00:00Z",
			receiptNumber: "004",
			fiscalDocumentNumber: "1004",
			fiscalSign: "123456792",
			serviceName: "Ортодонтическое лечение",
			code804n: "A16.07.048",
			amountRub: 120000,
			taxCode: "1",
		},
		{
			id: "p5",
			dateIso: "2023-08-10T10:00:00Z", // Different year (2023)
			receiptNumber: "005",
			fiscalDocumentNumber: "901",
			fiscalSign: "123456793",
			serviceName: "Профгигиена полости рта",
			code804n: "A16.07.050",
			amountRub: 15000,
			taxCode: "1",
		},
	];

	describe("1. BigInt & Exact Kopeck Arithmetic", () => {
		it("converts rubles to exact BigInt kopecks without floating point drift", () => {
			assert.equal(rubToKopecksBigInt(0), 0n);
			assert.equal(rubToKopecksBigInt(150), 15000n);
			assert.equal(rubToKopecksBigInt(150000.75), 15000075n);
			assert.equal(rubToKopecksBigInt("250000.50"), 25000050n);
			assert.equal(rubToKopecksBigInt(Number.NaN), 0n);
		});

		it("converts BigInt kopecks to rubles correctly", () => {
			assert.equal(kopecksBigIntToRub(0n), 0);
			assert.equal(kopecksBigIntToRub(15000075n), 150000.75);
			assert.equal(kopecksBigIntToRub(5000n), 50);
		});

		it("calculates exact tax split for 2024 with 150 000 ₽ statutory limit for Code 01", () => {
			// In 2024:
			// Code 01 payments: 50 000 + 120 000 = 170 000 ₽ (17 000 000 kop)
			// Limit: 150 000 ₽ -> Eligible: 150 000 ₽ (15 000 000 kop) -> isCapped: true
			// Code 02 payments: 180 000 + 70 000 = 250 000 ₽ (25 000 000 kop) -> Eligible: 250 000 ₽ (no limit)
			// Total: 420 000 ₽
			// 13% refund: (150 000 * 0.13 = 19 500) + (250 000 * 0.13 = 32 500) = 52 000 ₽
			const split = calculateExactTaxSplitKopecks(samplePayments, 2024);

			assert.equal(split.code01Kopecks, 17000000n);
			assert.equal(split.code01Rub, 170000);
			assert.equal(split.code02Kopecks, 25000000n);
			assert.equal(split.code02Rub, 250000);
			assert.equal(split.totalKopecks, 42000000n);
			assert.equal(split.totalRub, 420000);
			assert.equal(split.isCode01Capped, true);
			assert.equal(split.code01EligibleRub, 150000);
			assert.equal(split.refund13Rub, 52000);
			assert.equal(split.receiptsCount, 4); // 4 receipts in 2024
		});

		it("respects pre-2024 limit of 120 000 ₽ for 2023", () => {
			const split2023 = calculateExactTaxSplitKopecks(samplePayments, 2023);

			assert.equal(split2023.code01Kopecks, 1500000n);
			assert.equal(split2023.code01Rub, 15000);
			assert.equal(split2023.code02Rub, 0);
			assert.equal(split2023.code01StatutoryLimitRub, ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024);
			assert.equal(split2023.isCode01Capped, false);
			assert.equal(split2023.refund13Rub, 1950); // 15000 * 0.13 = 1950
			assert.equal(split2023.receiptsCount, 1);
		});
	});

	describe("2. Russian Amount in Words Generator (amountToWordsRu)", () => {
		it("converts zero kopecks to standard format", () => {
			assert.equal(amountToWordsRu(0), "Ноль рублей 00 копеек");
			assert.equal(amountToWordsRu(-5), "Ноль рублей 00 копеек");
		});

		it("converts single rubles with masculine declension", () => {
			assert.equal(amountToWordsRu(100), "Один рубль 00 копеек");
			assert.equal(amountToWordsRu(200), "Два рубля 00 копеек");
			assert.equal(amountToWordsRu(500), "Пять рублей 00 копеек");
		});

		it("converts thousands with feminine declension", () => {
			assert.equal(amountToWordsRu(100000), "Одна тысяча рублей 00 копеек");
			assert.equal(amountToWordsRu(200000), "Две тысячи рублей 00 копеек");
			assert.equal(amountToWordsRu(500000), "Пять тысяч рублей 00 копеек");
		});

		it("converts complex amounts with exact kopecks and correct declensions", () => {
			assert.equal(
				amountToWordsRu(15432050),
				"Сто пятьдесят четыре тысячи триста двадцать рублей 50 копеек",
			);
			assert.equal(
				amountToWordsRu(100101),
				"Одна тысяча один рубль 01 копейка",
			);
			assert.equal(
				amountToWordsRu(2222),
				"Двадцать два рубля 22 копейки",
			);
			assert.equal(
				amountToWordsRu(123456789),
				"Один миллион двести тридцать четыре тысячи пятьсот шестьдесят семь рублей 89 копеек",
			);
		});
	});

	describe("3. Classification by Act 804n and PP RF № 458 (Code 01 vs Code 02)", () => {
		it("classifies standard dental services as Code 01", () => {
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.002.001", "Лечение кариеса"), "1");
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.008", "Пломбирование зуба"), "1");
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.048", "Ортодонтия"), "1");
			assert.equal(resolveTaxDeductionCategoryShared(undefined, "Профессиональная гигиена"), "1");

			const cls = classifyTaxDeduction804n("A16.07.002", "Кариес");
			assert.equal(cls.categoryCode, "1");
			assert.equal(cls.isExpensiveTreatment, false);
			assert.equal(cls.hasAnnualLimit, true);
			assert.equal(cls.statutoryLimitRub, ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024);
		});

		it("classifies implantation, bone grafting, and sinus lifting as Code 02 (expensive treatment)", () => {
			// Act 804n codes
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.054", "Имплантация"), "2");
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.054.001", "Внутрикостная имплантация"), "2");
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.041.002", "Закрытый синус-лифтинг"), "2");
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.041.003", "Открытый синус-лифтинг"), "2");
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.040.001", "Аугментация гребня"), "2");
			assert.equal(resolveTaxDeductionCategoryShared("A16.07.006.002", "Протезирование на имплантатах"), "2");

			// Clinical text heuristics
			assert.equal(resolveTaxDeductionCategoryShared(undefined, "Установка имплантата Straumann"), "2");
			assert.equal(resolveTaxDeductionCategoryShared(undefined, "Костная пластика с мембраной Bio-Gide"), "2");
			assert.equal(resolveTaxDeductionCategoryShared(undefined, "Протокол All-on-4 на мультиюнитах"), "2");
			assert.equal(resolveTaxDeductionCategoryShared(undefined, "Скуловая имплантация Zygoma"), "2");

			const cls = classifyTaxDeduction804n("A16.07.054.001", "Имплантация");
			assert.equal(cls.categoryCode, "2");
			assert.equal(cls.isExpensiveTreatment, true);
			assert.equal(cls.hasAnnualLimit, false);
			assert.equal(cls.statutoryLimitRub, Number.POSITIVE_INFINITY);
		});

		it("contains all critical expensive treatment codes in EXPENSIVE_TREATMENT_804N_CODES", () => {
			assert.ok(EXPENSIVE_TREATMENT_804N_CODES.includes("A16.07.054"));
			assert.ok(EXPENSIVE_TREATMENT_804N_CODES.includes("A16.07.054.001"));
			assert.ok(EXPENSIVE_TREATMENT_804N_CODES.includes("A16.07.041"));
			assert.ok(EXPENSIVE_TREATMENT_804N_CODES.includes("A16.07.041.002"));
			assert.ok(EXPENSIVE_TREATMENT_804N_CODES.includes("A16.07.041.003"));
			assert.ok(EXPENSIVE_TREATMENT_804N_CODES.includes("A16.07.006.002"));
		});
	});

	describe("4. Official Russian Requisites Validation (INN, KPP, OGRN, Passport, SNILS)", () => {
		it("validates 10-digit INN for legal entity with exact FNS weights", () => {
			// 7707083893 is valid Sberbank INN
			const valid = validateInnLegalEntity("7707083893");
			assert.equal(valid.isValid, true);

			// Invalid checksum
			const invalidChecksum = validateInnLegalEntity("7707083894");
			assert.equal(invalidChecksum.isValid, false);
			assert.ok(invalidChecksum.errorMessageRu?.includes("контрольная сумма"));

			// Invalid length
			const invalidLen = validateInnLegalEntity("770708389");
			assert.equal(invalidLen.isValid, false);

			// All zeros
			const allZeros = validateInnLegalEntity("0000000000");
			assert.equal(allZeros.isValid, false);
		});

		it("validates 12-digit INN for individual / sole proprietor with exact FNS weights", () => {
			// 500100732259 is valid 12-digit INN
			const valid = validateInnIndividual("500100732259");
			assert.equal(valid.isValid, true);

			// Invalid checksum
			const invalidChecksum = validateInnIndividual("500100732258");
			assert.equal(invalidChecksum.isValid, false);

			// Invalid length
			const invalidLen = validateInnIndividual("50010073225");
			assert.equal(invalidLen.isValid, false);
		});

		it("validates Russian KPP format (9 characters)", () => {
			assert.equal(validateRussianKpp("770101001").isValid, true);
			assert.equal(validateRussianKpp("77010100").isValid, false);
			assert.equal(validateRussianKpp("").isValid, false);
		});

		it("validates Russian OGRN (13 digits) and OGRNIP (15 digits)", () => {
			assert.equal(validateRussianOgrn("1027700132195").isValid, true);
			assert.equal(validateRussianOgrn("1027700132199").isValid, false); // invalid checksum
			assert.equal(validateRussianOgrn("123").isValid, false);
		});

		it("validates Russian Passport series and number format", () => {
			const valid = validateRussianPassport("4510 123456");
			assert.equal(valid.isValid, true);
			assert.equal(valid.normalized, "4510 123456");

			const invalid = validateRussianPassport("123");
			assert.equal(invalid.isValid, false);
		});

		it("validates SNILS format and checksum", () => {
			// Standard test SNILS: 112-233-445 95 (checksum sum)
			const res = validateRussianSnils("11223344595");
			assert.equal(res.isValid, true);

			const invalid = validateRussianSnils("11223344500");
			assert.equal(invalid.isValid, false);
		});

		it("performs full validation of TaxDeductionCertificateParams", () => {
			const certParams: TaxDeductionCertificateParams = {
				certificateNumber: "101",
				issueDateIso: "2024-10-15T10:00:00Z",
				taxYear: 2024,
				taxOfficeCode: "7701",
				clinic: sampleClinic,
				payer: samplePayer,
				patient: {
					fullName: "Смирнов Алексей Викторович",
					birthDate: "1985-05-12",
					inn: "500100732259",
				},
				payments: samplePayments,
			};

			const val = validateTaxCertificateParams(certParams);
			assert.equal(val.isValid, true);
			assert.equal(val.errors.length, 0);

			// Test invalid params
			const invalidParams: TaxDeductionCertificateParams = {
				...certParams,
				certificateNumber: "",
				clinic: { ...sampleClinic, inn: "12345" },
			};
			const invalidVal = validateTaxCertificateParams(invalidParams);
			assert.equal(invalidVal.isValid, false);
			assert.ok(invalidVal.errors.length >= 2);
		});
	});

	describe("5. XML Generation and Structure Validation (КНД 1151156 / 1184043, Format 5.01)", () => {
		const certParams: TaxDeductionCertificateParams = {
			certificateNumber: "777",
			issueDateIso: "2024-10-20T10:00:00Z",
			taxYear: 2024,
			taxOfficeCode: "7701",
			clinic: sampleClinic,
			payer: samplePayer,
			patient: {
				fullName: "Смирнов Алексей Викторович",
				birthDate: "1985-05-12",
				inn: "500100732259",
			},
			payments: samplePayments,
		};

		it("generates valid FNS XML format with canonical tags and file ID", () => {
			const { fileName, fileId, xmlContent } = generateFnsTaxDeductionXml(certParams);

			assert.ok(fileName.endsWith(".xml"));
			assert.ok(fileId.startsWith("VO_SPRRECH_7701_7707083893"));
			assert.ok(xmlContent.includes("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
			assert.ok(xmlContent.includes("<Файл"));
			assert.ok(xmlContent.includes(`ВерсФорм="${FNS_FORMAT_VERSION_501}"`));
			assert.ok(xmlContent.includes(`КНД="${KND_REGISTRY_ELECTRONIC_FORMAT}"`));
			assert.ok(xmlContent.includes(`ИННЮЛ="${sampleClinic.inn}"`));
			assert.ok(xmlContent.includes(`ФИО="${samplePayer.fullName}"`));
			assert.ok(xmlContent.includes("СуммаВсего=\"420000.00\""));

			const structureValidation = validateFnsTaxXmlStructure(xmlContent);
			assert.equal(structureValidation.isValid, true);
			assert.equal(structureValidation.errors.length, 0);
		});

		it("correctly handles family relationship code in XML for relatives (spouse/child/parent)", () => {
			const spouseCertParams: TaxDeductionCertificateParams = {
				...certParams,
				payer: {
					fullName: "Смирнова Елена Сергеевна",
					inn: "500100732259",
					birthDate: "1988-03-22",
					relationship: "spouse",
				},
			};

			const { xmlContent } = generateFnsTaxDeductionXml(spouseCertParams);
			assert.ok(xmlContent.includes("ПрПациент=\"0\""));
			assert.ok(xmlContent.includes("КодРодств=\"2\""));
			assert.ok(xmlContent.includes(`<Пациент ФИО="${samplePayer.fullName}"`));
		});

		it("generates valid NO_MEDOPL format 5.01 XML", () => {
			const { fileName, xmlContent } = generateFnsNoMedoplXml(certParams);
			assert.ok(fileName.startsWith("NO_MEDOPL_"));
			assert.ok(xmlContent.includes("<Файл"));
			assert.ok(xmlContent.includes(`ВерсФорм="${FNS_FORMAT_VERSION_501}"`));
			assert.ok(xmlContent.includes("<СвМО"));
			assert.ok(xmlContent.includes("<СведСправка"));
		});

		it("generates valid Batch XML for multiple certificates", () => {
			const batchParams: TaxDeductionBatchParams = {
				taxYear: 2024,
				taxOfficeCode: "7701",
				clinic: sampleClinic,
				certificates: [certParams],
			};

			const batchRes = generateFnsTaxDeductionBatchXml(batchParams);
			assert.equal(batchRes.certificatesCount, 1);
			assert.ok(batchRes.xmlContent.includes("<Файл"));
			assert.ok(batchRes.xmlContent.includes(`ВерсФорм="${FNS_FORMAT_VERSION_501}"`));
		});
	});

	describe("6. QR-Code & Barcode Verification", () => {
		const certParams: TaxDeductionCertificateParams = {
			certificateNumber: "888",
			issueDateIso: "2024-11-01T10:00:00Z",
			taxYear: 2024,
			taxOfficeCode: "7701",
			clinic: sampleClinic,
			payer: samplePayer,
			patient: {
				fullName: "Смирнов Алексей Викторович",
				birthDate: "1985-05-12",
			},
			payments: samplePayments,
		};

		it("generates official verification URL payload for FNS taxpayer portal", () => {
			const payload = generateTaxCertificateQrPayload(certParams);
			assert.ok(payload.startsWith("https://lkfl2.nalog.ru/lkfl/deduction/verify"));
			assert.ok(payload.includes("knd=1151156"));
			assert.ok(payload.includes(`inn=${sampleClinic.inn}`));
			assert.ok(payload.includes("cert=888"));
			assert.ok(payload.includes("year=2024"));
			assert.ok(payload.includes("c1=170000.00"));
			assert.ok(payload.includes("c2=250000.00"));
			assert.ok(payload.includes("sum=420000.00"));
		});

		it("generates valid SVG strings for QR code and Code 128 barcode", () => {
			const qrSvg = generateTaxCertificateQrSvg(certParams, { size: 100 });
			assert.ok(qrSvg.includes("<svg"));
			assert.ok(qrSvg.includes("<path") || qrSvg.includes("<rect"));

			const barcodeSvg = generateFnsFormKnd1151156BarcodeSvg({
				certificateNumber: "888",
				taxYear: 2024,
				height: 38,
				width: 175,
			});
			assert.ok(barcodeSvg.includes("<svg"));
		});
	});

	describe("7. Official A4 Printable Blank Rendering", () => {
		const certParams: TaxDeductionCertificateParams = {
			certificateNumber: "999",
			issueDateIso: "2024-11-15T10:00:00Z",
			taxYear: 2024,
			taxOfficeCode: "7701",
			clinic: sampleClinic,
			payer: samplePayer,
			patient: {
				fullName: "Смирнов Алексей Викторович",
				birthDate: "1985-05-12",
			},
			payments: samplePayments,
		};

		it("renders complete HTML blank with official headings, tables, QR, barcode, and stamps", () => {
			const html = renderOfficialTaxCertificateKnd1151156Html(certParams);

			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("Приказу ФНС России"));
			assert.ok(html.includes("ЕА-7-11/824@"));
			assert.ok(html.includes(`Форма по КНД ${KND_CERTIFICATE_FORM}`));
			assert.ok(html.includes("№ 999"));
			assert.ok(html.includes(sampleClinic.legalName));
			assert.ok(html.includes(sampleClinic.inn));
			assert.ok(html.includes(samplePayer.fullName));
			assert.ok(html.includes("Код 01"));
			assert.ok(html.includes("Код 02"));
			assert.ok(html.includes("ОПЛАЧЕНО"));
			assert.ok(html.includes("Сведения о кассовых чеках (54-ФЗ)"));
		});
	});

	describe("8. Helper utility functions", () => {
		it("escapes XML special characters safely", () => {
			assert.equal(
				escapeXmlString("<ООО \"Денте\" & 'Клиника'>"),
				"&lt;ООО &quot;Денте&quot; &amp; &apos;Клиника&apos;&gt;",
			);
		});
	});
});
