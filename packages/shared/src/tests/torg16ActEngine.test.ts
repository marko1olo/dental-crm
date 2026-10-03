/**
 * ============================================================================
 * torg16ActEngine.test.ts — Unit tests for canonical statutory ТОРГ-16 engine
 * ============================================================================
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateTorg16Totals,
	exportTorg16ToCsv,
	generateCanonicalTorg16Html,
	torg16DocumentSchema,
	type Torg16Document,
} from "../warehouse/torg16ActEngine.js";

describe("TORG-16 Canonical Statutory Engine (ОКУД 0330216)", () => {
	const sampleItems = [
		{
			itemIndex: 1,
			sku: "ANES-ULTRA-DS",
			nameRu: "Ультракаин Д-С форте 1:100 000 (1.7 мл)",
			category: "anesthesia",
			unitRu: "карп",
			okeiCode: "796",
			batchNumber: "LOT-2024-08A",
			expiryDate: "2026-08-01",
			quantity: 10,
			unitCostKopecks: 14550, // 145.50 руб
			totalCostKopecks: 145500, // 1455.00 руб
			totalCostRubles: 1455.0,
			defectDescriptionRu: "Истек регламентный срок годности",
		},
		{
			itemIndex: 2,
			sku: "COMP-FILT-ULT",
			nameRu: "Композит Filtek Ultimate Body A2 (4г)",
			category: "composites",
			unitRu: "шт",
			okeiCode: "796",
			batchNumber: "LOT-2023-11F",
			expiryDate: "2026-07-15",
			quantity: 2,
			unitCostKopecks: 450000, // 4500.00 руб
			totalCostKopecks: 900000, // 9000.00 руб
			totalCostRubles: 9000.0,
			defectDescriptionRu: "Полимеризация в шприце из-за нарушения светозащиты",
		},
	];

	const sampleActCommission: Torg16Document = {
		actNumber: "ТОРГ-0042",
		actDate: "2026-08-20",
		organizationNameRu: 'ООО "Стоматологическая Клиника ДЕНТЕ"',
		organizationInn: "7701234567",
		organizationOkpo: "12345678",
		organizationKpp: "770101001",
		warehouseNameRu: "Центральный аптечный склад",
		molFullName: "Иванова Мария Сергеевна",
		molPosition: "Старшая медицинская сестра",
		inventoryDocNumber: "ИНВ-0012",
		reasonRu: "Истечение срока годности медицинских изделий и препаратов",
		items: sampleItems,
		commission: [
			{
				position: "Главный врач (Председатель комиссии)",
				fullName: "Смирнов Алексей Павлович",
				role: "chairman",
			},
			{
				position: "Заведующий терапевтическим отделением",
				fullName: "Кузнецов Михаил Сергеевич",
				role: "member",
			},
			{
				position: "Главный бухгалтер",
				fullName: "Петрова Елена Дмитриевна",
				role: "accountant",
			},
		],
		totalQuantity: 12,
		totalCostKopecks: 1045500,
		totalCostRubles: 10455.0,
		totalCostWordsRu: "Десять тысяч четыреста пятьдесят пять рублей 00 копеек",
	};

	it("calculateTorg16Totals считает точные копейки и формирует русские числительные прописью", () => {
		const totals = calculateTorg16Totals(sampleItems);

		assert.strictEqual(totals.totalQuantity, 12);
		assert.strictEqual(totals.totalCostKopecks, 1045500);
		assert.strictEqual(totals.totalCostRubles, 10455.0);
		assert.ok(
			totals.totalCostWordsRu.includes("Десять тысяч четыреста пятьдесят пять рублей"),
			`Сумма прописью некорректна: ${totals.totalCostWordsRu}`,
		);
	});

	it("generateCanonicalTorg16Html содержит унифицированные реквизиты ОКУД 0330216 и постановление Госкомстата", () => {
		const html = generateCanonicalTorg16Html(sampleActCommission);

		assert.ok(html.includes("0330216"), "ОКУД 0330216 отсутствует");
		assert.ok(html.includes("ТОРГ-16"), "ТОРГ-16 отсутствует");
		assert.ok(html.includes("25.12.1998 № 132"), "Постановление Госкомстата отсутствует");
		assert.ok(html.includes("АКТ О СПИСАНИИ ТОВАРОВ"), "Заголовок акта отсутствует");
		assert.ok(html.includes("ТОРГ-0042"), "Номер акта отсутствует");
		assert.ok(html.includes("ANES-ULTRA-DS"), "Артикул не найден");
		assert.ok(html.includes("LOT-2024-08A"), "Партия не найдена");
		assert.ok(html.includes("10455.00"), "Итоговая сумма не найдена");
		assert.ok(html.includes("Смирнов Алексей Павлович"), "Председатель комиссии не найден");
		assert.ok(html.includes("Иванова Мария Сергеевна"), "МОЛ не найдена");
	});

	it("generateCanonicalTorg16Html поддерживает режим упрощенного единоличного списания (Single Signer)", () => {
		const singleSignerAct: Torg16Document = {
			...sampleActCommission,
			commission: undefined,
			isSingleSigner: true,
			singleSignerRole: "Врач-стоматолог-терапевт",
			singleSignerFullName: "Кузнецов М.С.",
		};

		const html = generateCanonicalTorg16Html(singleSignerAct);

		assert.ok(html.includes("Списание произведено единолично:"));
		assert.ok(html.includes("Кузнецов М.С."));
		assert.ok(html.includes("Согласовано (МОЛ):"));
		assert.ok(html.includes("Иванова Мария Сергеевна"));
	});

	it("generateCanonicalTorg16Html экранирует потенциально опасные спецсимволы (XSS Safe)", () => {
		const xssAct: Torg16Document = {
			...sampleActCommission,
			actNumber: '"><script>alert(1)</script>',
			organizationNameRu: 'ООО & "Стоматология <VIP>"',
			items: [
				{
					sku: '"><img src=x onerror=alert(1)>',
					nameRu: 'Опасный материал <svg onload=alert(2)> & "тест"',
					unitRu: "шт",
					quantity: 1,
					unitCostKopecks: 10000,
					totalCostKopecks: 10000,
					totalCostRubles: 100.0,
				},
			],
		};

		const html = generateCanonicalTorg16Html(xssAct);

		assert.ok(!html.includes("<script>"), "Неэкранированный тег script");
		assert.ok(!html.includes("<svg onload="), "Неэкранированный SVG onload");
		assert.ok(html.includes("&amp;"), "Амперсанд не экранирован");
		assert.ok(html.includes("&quot;"), "Кавычки не экранированы");
	});

	it("exportTorg16ToCsv формирует валидный CSV с UTF-8 BOM и разделителем точка с запятой", () => {
		const csv = exportTorg16ToCsv(sampleActCommission);

		assert.ok(csv.startsWith("\uFEFF"), "BOM отсутствует");
		assert.ok(csv.includes("№ п/п;Артикул;Наименование ТМЦ;"));
		assert.ok(csv.includes("ANES-ULTRA-DS"));
		assert.ok(csv.includes("ИТОГО ПО АКТУ"));
		assert.ok(csv.includes("10455.00"));
	});

	it("torg16DocumentSchema валидирует корректный документ и отсекает некорректные данные", () => {
		const valid = torg16DocumentSchema.safeParse(sampleActCommission);
		assert.ok(valid.success, `Ошибка валидации: ${JSON.stringify(valid.error)}`);

		const invalid = torg16DocumentSchema.safeParse({
			...sampleActCommission,
			items: [], // Пустой массив должен браковаться
		});
		assert.ok(!invalid.success);
	});
});
