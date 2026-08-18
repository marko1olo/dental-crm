import assert from "node:assert";
import { describe, it } from "node:test";
import {
	categorizeDentalService,
	partitionInvoiceForFns,
} from "./decree458Categorizer.js";
import { buildFnsKnd1151156Xml, formatFnsDate } from "./fnsKnd1151156Builder.js";

describe("Decree 458 Categorizer", () => {
	it("categorizes standard caries treatment as Code 1", () => {
		const result = categorizeDentalService(
			"A16.07.002",
			"Лечение кариеса пломбированием",
		);
		assert.strictEqual(result.code, "1");
		assert.strictEqual(result.isExpensiveDecree458, false);
	});

	it("categorizes dental implantation as Code 2 expensive treatment", () => {
		const result = categorizeDentalService(
			"A16.07.054",
			"Внутрикостная дентальная имплантация системы Straumann",
		);
		assert.strictEqual(result.code, "2");
		assert.strictEqual(result.isExpensiveDecree458, true);
	});

	it("categorizes sinus-lift as Code 2 expensive treatment", () => {
		const result = categorizeDentalService(
			"A16.07.055",
			"Открытый синус-лифтинг с костной пластикой",
		);
		assert.strictEqual(result.code, "2");
		assert.strictEqual(result.isExpensiveDecree458, true);
	});

	it("partitions mixed invoices correctly into Code 1 and Code 2", () => {
		const items = [
			{
				serviceName: "Профессиональная гигиена полости рта",
				priceRub: 6000,
				quantity: 1,
				order804nCode: "A16.07.051",
			},
			{
				serviceName: "Установка дентального имплантата Nobel Biocare",
				priceRub: 65000,
				quantity: 2,
				order804nCode: "A16.07.054.001",
			},
			{
				serviceName: "Лечение пульпита 3-канального зуба",
				priceRub: 18000,
				quantity: 1,
				order804nCode: "A16.07.008",
			},
		];

		const partitioned = partitionInvoiceForFns(items);
		assert.strictEqual(partitioned.code1TotalRub, 24000); // 6000 + 18000
		assert.strictEqual(partitioned.code2TotalRub, 130000); // 65000 * 2
		assert.strictEqual(partitioned.grandTotalRub, 154000);
	});
});

describe("FNS Form KND 1151156 Builder", () => {
	it("formats date in DD.MM.YYYY format", () => {
		assert.strictEqual(formatFnsDate("2026-08-18"), "18.08.2026");
	});

	it("generates valid XML complying with Format 5.01", () => {
		const payload = {
			taxInspectionCode: "7701",
			documentNumber: "СПР-2026/0458",
			documentDate: "2026-08-18",
			taxYear: "2026",
			certificateKind: "1" as const,
			correctionNumber: 0,
			clinic: {
				inn: "7799999999",
				kpp: "770101001",
				ogrn: "1227700000000",
				name: "ООО Стоматология Дент-Премиум",
				license: {
					number: "ЛО41-01137-77/00345678",
					date: "2022-05-12",
				},
			},
			payer: {
				inn: "771234567890",
				snils: "12345678901",
				birthDate: "1985-06-15",
				fullName: {
					family: "Иванов",
					given: "Иван",
					patronymic: "Иванович",
				},
				identityDocument: {
					docTypeCode: "21",
					seriesAndNumber: "4515 123456",
					issueDate: "2015-07-20",
				},
			},
			patient: {
				patientKinshipCode: "1" as const,
			},
			expenses: {
				code1AmountRub: 24000,
				code2AmountRub: 130000,
			},
			signatory: {
				signatoryRole: "1" as const,
				snils: "98765432100",
				fullName: {
					family: "Смирнов",
					given: "Алексей",
					patronymic: "Петрович",
				},
			},
		};

		const { xmlContent, fileName, fileId } = buildFnsKnd1151156Xml(payload);

		assert.ok(xmlContent.includes('ВерсФорм="5.01"'));
		assert.ok(xmlContent.includes('КНД="1184043"'));
		assert.ok(xmlContent.includes('НомСпр="СПР-2026/0458"'));
		assert.ok(xmlContent.includes('ИННЮЛ="7799999999"'));
		assert.ok(xmlContent.includes('КодУслуг="1" СумОпл="24000.00"'));
		assert.ok(xmlContent.includes('КодУслуг="2" СумОпл="130000.00"'));
		assert.ok(fileName.endsWith(".xml"));
		assert.ok(fileId.startsWith("UT_SVOPLMEDUSL_7701_"));
	});
});
