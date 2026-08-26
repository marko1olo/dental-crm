import assert from "node:assert";
import { describe, test } from "node:test";
import {
	generateOneCEnterpriseXml,
	type OneCDocumentParams,
	type OneCExportParams,
	validateOneCParty,
} from "../finance/oneCEnterpriseExport.js";
import {
	type EstimateRenderData,
	renderEstimatePrintableHtml,
} from "../finance/estimateHtmlRenderer.js";

describe("1C:Enterprise XML Export Engine", () => {
	const validClinicInn = "7707083893"; // Sberbank valid 10-digit INN
	const validClinicKpp = "770701001";
	const validPatientInn = "500100732259"; // Valid 12-digit individual INN

	test("validates Russian tax credentials for legal entities and individuals", () => {
		const validParty = {
			id: "party-1",
			name: "ООО ДЕНТЕ",
			inn: validClinicInn,
			kpp: validClinicKpp,
			isLegalEntity: true,
		};
		const validationResult = validateOneCParty(validParty);
		assert.strictEqual(validationResult.valid, true);
		assert.strictEqual(validationResult.errors.length, 0);

		const invalidParty = {
			id: "party-2",
			name: "Иванов И.И.",
			inn: "123456789012", // Invalid checksum
			isLegalEntity: false,
		};
		const invalidResult = validateOneCParty(invalidParty);
		assert.strictEqual(invalidResult.valid, false);
		assert.strictEqual(invalidResult.errors.length > 0, true);
	});

	test("generates compliant 1C:Enterprise / CommerceML 2.09 XML document", () => {
		const doc: OneCDocumentParams = {
			id: "doc-uuid-001",
			number: "СЧ-2026-0042",
			documentDate: "2026-08-27",
			documentTime: "14:30:00",
			docType: "invoice",
			operationName: "Заказ покупателя",
			patient: {
				id: "pat-uuid-1",
				name: "Иванов Иван Иванович",
				fullName: "Иванов Иван Иванович",
				inn: validPatientInn,
				phone: "+7 (999) 123-45-67",
			},
			items: [
				{
					id: "srv-1",
					code804n: "A16.07.002",
					name: "Восстановление зуба пломбой (светоотверждаемый композит)",
					toothNumber: 16,
					quantity: 1,
					priceKopecks: 650000, // 6500 RUB
					discountPercent: 0,
					totalKopecks: 650000,
					vatRate: "Без НДС",
					vatAmountKopecks: 0,
				},
				{
					id: "srv-2",
					code804n: "A16.07.008",
					name: "Пломбирование корневого канала зуба (гуттаперча)",
					toothNumber: 16,
					quantity: 3,
					priceKopecks: 250000, // 2500 RUB * 3 = 7500 RUB
					discountPercent: 0,
					totalKopecks: 750000,
					vatRate: "Без НДС",
					vatAmountKopecks: 0,
				},
			],
			totalKopecks: 1400000, // 14,000.00 RUB
			contractNumber: "ДОГ-2026/89",
			contractDate: "2026-08-01",
			attendingDoctorName: "Смирнова Елена Сергеевна",
		};

		const exportParams: OneCExportParams = {
			exportId: "99999999-9999-9999-9999-999999999999",
			generatedAt: "2026-08-27T14:35:00Z",
			clinic: {
				id: "clinic-uuid-1",
				name: "Стоматологическая клиника ДЕНТЕ",
				fullName: "ООО «ДЕНТЕ КЛИНИК»",
				inn: validClinicInn,
				kpp: validClinicKpp,
				bankAccount: "40702810000000000001",
				bankBik: "044525225",
				bankName: "ПАО СБЕРБАНК",
			},
			documents: [doc],
		};

		const xml = generateOneCEnterpriseXml(exportParams);

		assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(xml.includes('<КоммерческаяИнформация'));
		assert.ok(xml.includes('ВерсияСхемы="2.09"'));
		assert.ok(xml.includes('<Номер>СЧ-2026-0042</Номер>'));
		assert.ok(xml.includes('<Сумма>14000.00</Сумма>'));
		assert.ok(xml.includes('<ХозяйственнаяОперация>Заказ покупателя</ХозяйственнаяОперация>'));
		assert.ok(xml.includes('Восстановление зуба пломбой (светоотверждаемый композит) (Зуб 16)'));
		assert.ok(xml.includes('<Артикул>A16.07.002</Артикул>'));
		assert.ok(xml.includes('<Значение>пп. 2 п. 2 ст. 149 НК РФ</Значение>'));
		assert.ok(xml.includes('<Значение>Договор № ДОГ-2026/89 от 2026-08-01</Значение>'));
		assert.ok(xml.includes('<Значение>Смирнова Елена Сергеевна</Значение>'));
	});
});

describe("Estimate HTML/PDF Printable Renderer", () => {
	test("renders complete high-grade estimate sheet with stages and signatures", () => {
		const estimateData: EstimateRenderData = {
			estimateNumber: "СМ-2026/0128",
			date: "2026-08-27",
			validUntilDate: "2026-09-27",
			clinic: {
				name: "DENTE Стоматология",
				legalName: "ООО «ДЕНТЕ ПРЕМИУМ»",
				address: "г. Москва, ул. Большая Полянка, д. 42",
				phone: "+7 (495) 777-88-99",
				licenseInfo: "Лицензия ЛО-77-01-021548 от 12.04.2023",
				inn: "7707083893",
			},
			patient: {
				fullName: "Кузнецов Дмитрий Алексеевич",
				cardNumber: "К-4820",
				birthDate: "1988-05-14",
				phone: "+7 (916) 555-44-33",
			},
			attendingDoctor: {
				fullName: "Смирнова Елена Сергеевна",
				specialty: "Врач стоматолог-ортопед",
			},
			stages: [
				{
					stageNumber: 1,
					name: "Хирургический этап и дентальная имплантация",
					description: "Установка дентального имплантата с формирователем десны",
					items: [
						{
							id: "st1-1",
							toothNumber: 36,
							code804n: "A16.07.054",
							name: "Внутрикостная дентальная имплантация системы Straumann",
							quantity: 1,
							priceKopecks: 6500000,
							discountPercent: 0,
							totalKopecks: 6500000,
						},
						{
							id: "st1-2",
							toothNumber: 36,
							code804n: "A16.07.054.001",
							name: "Установка формирователя десны",
							quantity: 1,
							priceKopecks: 800000,
							discountPercent: 0,
							totalKopecks: 800000,
						},
					],
					totalKopecks: 7300000,
				},
				{
					stageNumber: 2,
					name: "Ортопедический этап",
					description: "Протезирование коронкой из диоксида циркония на винтовой фиксации",
					items: [
						{
							id: "st2-1",
							toothNumber: 36,
							code804n: "A16.07.004",
							name: "Коронка из диоксида циркония с индивидуальным абатментом",
							quantity: 1,
							priceKopecks: 4500000,
							discountPercent: 10,
							totalKopecks: 4050000,
						},
					],
					totalKopecks: 4050000,
				},
			],
			subtotalKopecks: 11800000, // 118,000 RUB
			discountKopecks: 450000, // 4,500 RUB
			totalPayableKopecks: 11350000, // 113,500 RUB
			notes: "Срок интеграции имплантата на нижней челюсти составляет 2.5-3 месяца.",
		};

		const html = renderEstimatePrintableHtml(estimateData);

		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("Смета лечения № СМ-2026/0128"));
		assert.ok(html.includes("ООО «ДЕНТЕ ПРЕМИУМ»"));
		assert.ok(html.includes("Кузнецов Дмитрий Алексеевич"));
		assert.ok(html.includes("Хирургический этап и дентальная имплантация"));
		assert.ok(html.includes("ИТОГО К ОПЛАТЕ"));
		assert.ok(html.includes("113") && html.includes("500"));
		assert.ok(html.includes("Сто") || html.includes("рублей"));
		assert.ok(html.includes("пп. 2 п. 2 ст. 149 НК РФ"));
		assert.ok(html.includes("Врач: Смирнова Елена Сергеевна"));
	});
});
