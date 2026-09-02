import assert from "node:assert";
import { describe, test } from "node:test";
import {
	buildFnsKnd1151156Xml,
	classifyNdflServiceCode,
	generateFnsFileNameAndId,
	generateFnsNdflPrintHtml,
	generateFnsNdflXml,
	isDmsInsurancePayment,
	isNonMedicalGood,
	parseFio,
	preflightValidatePayload,
	rublesFromKopecks,
	validateFnsNdflXmlStructure,
	type FnsTaxPayload,
} from "../ndflXmlGenerator.js";
import {
	FNS_KINSHIP_PRESETS,
	NDFL_LIMITS,
	validateRussianInn,
	validateRussianKpp,
	validateRussianOgrn,
	validateRussianSnils,
} from "../fnsSchema1151156.js";

describe("FNS Form KND 1151156 & Electronic Format KND 1184043 XML Generator Suite", () => {
	const validLegalClinicPayload: FnsTaxPayload = {
		documentNumber: "СПР-2026/042",
		documentDate: "2026-03-25",
		taxYear: 2025,
		taxInspectionCode: "7701",
		certificateKind: "1",
		correctionNumber: 0,
		softwareVersion: "DENTE Dental CRM 2.0",
		clinic: {
			inn: "7701234560",
			kpp: "770101001",
			ogrn: "1027700132195",
			name: "ООО СТОМАТОЛОГИЯ ДЕНТЕ",
			isIndividualEntrepreneur: false,
			directorName: "Смирнов Алексей Владимирович",
			directorSnils: "11223344595",
			license: {
				number: "ЛО41-01137-77/00368421",
				date: "2021-04-12",
				issuer: "Департамент здравоохранения города Москвы",
			},
		},
		payer: {
			fullName: {
				family: "Иванов",
				given: "Иван",
				patronymic: "Иванович",
			},
			inn: "770212345681",
			snils: "11223344595",
			birthDate: "1985-06-20",
			identityDocument: {
				docTypeCode: "21",
				seriesAndNumber: "4510 123456",
				issueDate: "2015-07-10",
				issuedBy: "ГУ МВД России по г. Москве",
				subdivisionCode: "770-001",
			},
		},
		patient: {
			patientKinshipCode: "1",
		},
		receipts: [
			{
				id: "rec-1",
				receiptNumber: "001",
				fiscalDocumentNumber: "101",
				receiptDate: "2025-04-10",
				serviceName: "Лечение кариеса и пломбирование светоотверждаемым композитом",
				deductionCode: "1",
				amountRub: 50000,
				amountKopecks: 5000000,
			},
			{
				id: "rec-2",
				receiptNumber: "002",
				fiscalDocumentNumber: "102",
				receiptDate: "2025-05-12",
				serviceName: "Профессиональная комплексная гигиена полости рта и AirFlow",
				deductionCode: "1",
				amountRub: 120000,
				amountKopecks: 12000000,
			},
			{
				id: "rec-3",
				receiptNumber: "003",
				fiscalDocumentNumber: "103",
				receiptDate: "2025-06-20",
				serviceName: "Дентальная имплантация системы Straumann (A16.07.054)",
				deductionCode: "2",
				amountRub: 300000,
				amountKopecks: 30000000,
			},
		],
		expenses: {
			code1AmountRub: 170000,
			code2AmountRub: 300000,
		},
		signatory: {
			signatoryRole: "1",
			fullName: {
				family: "Смирнов",
				given: "Алексей",
				patronymic: "Владимирович",
			},
			snils: "11223344595",
		},
	};

	test("1.1 File naming convention generates standard NO_MEDOPL and UT_SVOPLMEDUSL formats", () => {
		const fixedUuid = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d";
		const noMedopl = generateFnsFileNameAndId("7701", "7701234560", "770101001", "25.03.2026", fixedUuid, "NO_MEDOPL");
		assert.strictEqual(
			noMedopl.fileId,
			"NO_MEDOPL_7701234560770101001_7701_20260325_a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
		);
		assert.strictEqual(noMedopl.fileName, `${noMedopl.fileId}.xml`);

		const utSvopl = generateFnsFileNameAndId("7701", "7701234560", "770101001", "25.03.2026", fixedUuid, "UT_SVOPLMEDUSL");
		assert.strictEqual(
			utSvopl.fileId,
			"UT_SVOPLMEDUSL_7701_7701_7701234560770101001_20260325_a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
		);
		assert.strictEqual(utSvopl.fileName, `${utSvopl.fileId}.xml`);
	});

	test("1.2 Correctly calculates Code 01 (capped at 150 000 ₽) and Code 02 (uncapped) 13% & 15% refunds", () => {
		const result = buildFnsKnd1151156Xml(validLegalClinicPayload);
		assert.strictEqual(result.isValidForSubmission, true);
		assert.strictEqual(result.code1Kopecks, 17000000);
		assert.strictEqual(result.code2Kopecks, 30000000);
		assert.strictEqual(result.totalKopecks, 47000000);
		assert.strictEqual(result.code1Rub, 170000);
		assert.strictEqual(result.code2Rub, 300000);
		assert.strictEqual(result.totalRub, 470000);
		assert.strictEqual(result.estimatedTaxRefundRub, 58500);
		assert.strictEqual(result.estimatedTaxRefund15Rub, 67500);
	});

	test("1.3 Generates XML adhering to FNS KND 1184043 Version 5.01 schema", () => {
		const result = buildFnsKnd1151156Xml(validLegalClinicPayload);
		const xml = result.xmlContent;

		assert.ok(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
		assert.ok(xml.includes("ВерсФорм=\"5.01\""));
		assert.ok(xml.includes("КНД=\"1184043\""));
		assert.ok(xml.includes("НомСпр=\"СПР-2026/042\""));
		assert.ok(xml.includes("ГодУсл=\"2025\""));
		assert.ok(xml.includes("<СвОргЮЛ"));
		assert.ok(xml.includes("ИННЮЛ=\"7701234560\""));
		assert.ok(xml.includes("КПП=\"770101001\""));
		assert.ok(xml.includes("ОГРН=\"1027700132195\""));
		assert.ok(xml.includes("НомЛиц=\"ЛО41-01137-77/00368421\""));
		assert.ok(xml.includes("КемВыд=\"Департамент здравоохранения города Москвы\""));
		assert.ok(xml.includes("<СвФЛ"));
		assert.ok(xml.includes("ИННФЛ=\"770212345681\""));
		assert.ok(xml.includes("СНИЛС=\"11223344595\""));
		assert.ok(xml.includes("ДатаРожд=\"20.06.1985\""));
		assert.ok(xml.includes("<ФИО Фамилия=\"Иванов\" Имя=\"Иван\" Отчество=\"Иванович\"/>"));
		assert.ok(xml.includes("<УдЛичнФЛ КодВидДок=\"21\" СерНомДок=\"4510 123456\" ДатаДок=\"10.07.2015\" КемВыд=\"ГУ МВД России по г. Москве\"/>"));
		assert.ok(xml.includes("<СвПациент ПризнПац=\"1\"/>"));
		assert.ok(xml.includes("<СведРасхУсл КодУслуг=\"1\" СумОпл=\"170000.00\"/>"));
		assert.ok(xml.includes("<СведРасхУсл КодУслуг=\"2\" СумОпл=\"300000.00\"/>"));
		assert.ok(xml.includes("<Подписант ПрПодп=\"1\" СНИЛС=\"11223344595\">"));
		assert.ok(xml.includes("</Файл>"));

		const validation = validateFnsNdflXmlStructure(xml);
		assert.strictEqual(validation.isValid, true);
		assert.strictEqual(validation.errors.length, 0);
	});

	test("1.4 Generates XML for Sole Proprietor (ИП) with СвИП and ОГРНИП", () => {
		const ipPayload: FnsTaxPayload = {
			...validLegalClinicPayload,
			clinic: {
				inn: "770212345681",
				ogrn: "304770000123456",
				name: "ИП Смирнов Алексей Владимирович",
				isIndividualEntrepreneur: true,
				ipFullName: {
					family: "Смирнов",
					given: "Алексей",
					patronymic: "Владимирович",
				},
				license: {
					number: "ЛО-77-01-009999",
					date: "2020-01-15",
				},
			},
		};

		const result = buildFnsKnd1151156Xml(ipPayload);
		const xml = result.xmlContent;

		assert.ok(xml.includes("<СвИП ИННФЛ=\"770212345681\" ОГРНИП=\"304770000123456\">"));
		assert.ok(xml.includes("<ФИО Фамилия=\"Смирнов\" Имя=\"Алексей\" Отчество=\"Владимирович\"/>"));
		assert.ok(!xml.includes("<СвОргЮЛ"));
	});

	test("1.5 Correctly formats kinship patient block for child (ПризнПац=4) or spouse (ПризнПац=2)", () => {
		const childPayload: FnsTaxPayload = {
			...validLegalClinicPayload,
			patient: {
				patientKinshipCode: "4",
				fullName: {
					family: "Иванова",
					given: "Мария",
					patronymic: "Ивановна",
				},
				birthDate: "2018-09-14",
				identityDocument: {
					docTypeCode: "03",
					seriesAndNumber: "II-МЮ 654321",
					issueDate: "2018-09-25",
				},
			},
		};

		const result = buildFnsKnd1151156Xml(childPayload);
		const xml = result.xmlContent;

		assert.ok(xml.includes("<СвПациент ПризнПац=\"4\" ДатаРожд=\"14.09.2018\">"));
		assert.ok(xml.includes("<ФИО Фамилия=\"Иванова\" Имя=\"Мария\" Отчество=\"Ивановна\"/>"));
		assert.ok(xml.includes("<УдЛичнФЛ КодВидДок=\"03\" СерНомДок=\"II-МЮ 654321\" ДатаДок=\"25.09.2018\"/>"));
	});

	test("2.1 Service code classifier properly identifies Expensive Treatment (Code 02) per Decree № 458 and 804n", () => {
		assert.strictEqual(classifyNdflServiceCode("Установка дентального имплантата Nobel Biocare", "A16.07.054.001"), "2");
		assert.strictEqual(classifyNdflServiceCode("Открытый синус-лифтинг с костной аугментацией", "A16.07.055"), "2");
		assert.strictEqual(classifyNdflServiceCode("Костная пластика челюстно-лицевой области", "A16.07.041"), "2");
		assert.strictEqual(classifyNdflServiceCode("Установка скулового имплантата Zygoma", "A16.07.056"), "2");
		assert.strictEqual(classifyNdflServiceCode("Протезирование на 6 имплантатах All-on-6"), "2");
		assert.strictEqual(classifyNdflServiceCode("Костная аугментация Bio-Oss и мембрана Bio-Gide"), "2");

		assert.strictEqual(classifyNdflServiceCode("Лечение глубокого кариеса 4.6", "A16.07.002.001"), "1");
		assert.strictEqual(classifyNdflServiceCode("Профессиональная чистка зубов ультразвуком", "A22.07.002"), "1");
		assert.strictEqual(classifyNdflServiceCode("Ортодонтическая коррекция брекет-системой Damon", "A16.07.048"), "1");
		assert.strictEqual(classifyNdflServiceCode("Прицельный радиовизиографический снимок 1.1", "A06.07.001"), "1");
	});

	test("2.2 Retail goods filter (Feature #5) excludes non-medical retail items from deduction", () => {
		assert.strictEqual(isNonMedicalGood("Зубная щетка Curaprox 5460"), true);
		assert.strictEqual(isNonMedicalGood("Зубная паста Biorepair Total Protection"), true);
		assert.strictEqual(isNonMedicalGood("Портативный ирригатор Waterpik WP-450"), true);
		assert.strictEqual(isNonMedicalGood("Зубная нить Oral-B Pro-Expert"), true);
		assert.strictEqual(isNonMedicalGood("Ополаскиватель для полости рта Листерин"), true);
		assert.strictEqual(isNonMedicalGood("Косметический набор для отбеливания"), true);
		assert.strictEqual(isNonMedicalGood("Любой товар", "goods"), true);

		assert.strictEqual(isNonMedicalGood("Лечение пульпита"), false);
		assert.strictEqual(isNonMedicalGood("Установка пломбы"), false);
		assert.strictEqual(isNonMedicalGood("Дентальная имплантация"), false);
	});

	test("2.3 DMS Insurance filter (Feature #5) excludes insurance company payments from deduction", () => {
		assert.strictEqual(isDmsInsurancePayment("insurance"), true);
		assert.strictEqual(isDmsInsurancePayment("dms"), true);
		assert.strictEqual(isDmsInsurancePayment("card", "Оплата по безналичному расчету по договору ДМС АльфаСтрахование"), true);
		assert.strictEqual(isDmsInsurancePayment("card", "Личная доплата пациента за пломбу"), false);
		assert.strictEqual(isDmsInsurancePayment("cash", "Оплата наличными"), false);
		assert.strictEqual(isDmsInsurancePayment("sbp", "Оплата через СБП"), false);
	});

	test("3.1 Statutory checksum validations for INN, SNILS, KPP, OGRN", () => {
		assert.strictEqual(validateRussianInn("7701234560").isValid, true);
		assert.strictEqual(validateRussianInn("770212345681").isValid, true);
		assert.strictEqual(validateRussianInn("0000000000").isValid, false);
		assert.strictEqual(validateRussianInn("7701234561").isValid, false);
		assert.strictEqual(validateRussianSnils("11223344595").isValid, true);
		assert.strictEqual(validateRussianSnils("00000000000").isValid, false);
		assert.strictEqual(validateRussianSnils("11223344500").isValid, false);
		assert.strictEqual(validateRussianKpp("770101001").isValid, true);
		assert.strictEqual(validateRussianKpp("123").isValid, false);
		assert.strictEqual(validateRussianOgrn("1027700132195").isValid, true);
		assert.strictEqual(validateRussianOgrn("1027700132190").isValid, false);
	});

	test("4.1 Generates Printable HTML (A4 Form KND 1151156) with full details and fiscal receipts", () => {
		const html = generateFnsNdflPrintHtml(validLegalClinicPayload);
		assert.ok(html.includes("КНД 1151156"));
		assert.ok(html.includes("СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ"));
		assert.ok(html.includes("ООО СТОМАТОЛОГИЯ ДЕНТЕ"));
		assert.ok(html.includes("ЛО41-01137-77/00368421"));
		assert.ok(html.includes("Иванов Иван Иванович"));
		assert.ok(html.includes("Лечение кариеса"));
		assert.ok(html.includes("Дентальная имплантация"));
	});
});
