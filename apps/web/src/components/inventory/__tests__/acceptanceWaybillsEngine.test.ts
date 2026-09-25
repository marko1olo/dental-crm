/**
 * ============================================================================
 * ACCEPTANCE WAYBILLS & FEFO ENGINE UNIT TESTS (МАНДАТЫ 8e, 8k, 8n, 8s, 8t)
 * 
 * Тестирование движка оприходования накладных от стоматологических поставщиков:
 * 1. Канонические поставщики (Стомторг, KaVo, ВладМиВа, Дентал Маркет, Рокада Мед).
 * 2. Канонические стоматологические материалы и лекарственные препараты.
 * 3. FEFO индикация партий (First Expired, First Out) со светофором сроков годности.
 * 4. Копеечно-точный финансовый расчет сумм и ставок НДС (0%, 10%, 20%).
 * 5. Мандат 8n (Мягкий овердрафт): автоматическое погашение дефицита приходами.
 * 6. Валидация черновика накладной и защита от человеческих ошибок.
 * 7. Генерация регламентной унифицированной печатной формы ТОРГ-12 и экспорт в CSV.
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	CANONICAL_DENTAL_SUPPLIERS,
	CANONICAL_DENTAL_MATERIAL_TEMPLATES,
	calculateFefoStatus,
	calculateWaybillTotals,
	createDraftAcceptanceWaybill,
	createSampleDentalWaybill,
	createWaybillItem,
	exportWaybillToCsv,
	formatRubCurrency,
	generateTorg12Html,
	kopecksToRubles,
	reconcileOverdraftOnReceipt,
	rublesToKopecks,
	sortWaybillItemsByFefo,
	validateWaybillDraft,
	type AcceptanceWaybillItem,
} from "../acceptanceWaybillsEngine.js";

describe("AcceptanceWaybillsEngine — Canonical Suppliers & Material Templates", () => {
	it("содержит канонических стоматологических поставщиков с корректными ИНН и реквизитами", () => {
		assert.ok(CANONICAL_DENTAL_SUPPLIERS.length >= 5);

		const stomtorg = CANONICAL_DENTAL_SUPPLIERS.find((s) => s.id === "sup_stomtorg");
		assert.ok(stomtorg, "Стомторг должен присутствовать");
		assert.equal(stomtorg.inn, "7701234567");
		assert.ok(stomtorg.name.includes("Стомторг"));

		const vladmiva = CANONICAL_DENTAL_SUPPLIERS.find((s) => s.id === "sup_vladmiva");
		assert.ok(vladmiva, "ВладМиВа должен присутствовать");
		assert.equal(vladmiva.inn, "3123014589");

		const kavo = CANONICAL_DENTAL_SUPPLIERS.find((s) => s.id === "sup_kavo");
		assert.ok(kavo, "KaVo Dental должен присутствовать");

		// Все поставщики имеют непустые имена и ИНН длиной 10 или 12 цифр
		for (const supplier of CANONICAL_DENTAL_SUPPLIERS) {
			assert.ok(supplier.name.length > 0);
			assert.ok(/^\d{10}(\d{2})?$/.test(supplier.inn), `ИНН ${supplier.inn} должен состоять из 10 или 12 цифр`);
		}
	});

	it("содержит стоматологические материалы с правильными ставками НДС (0% на медизделия/ЛС)", () => {
		assert.ok(CANONICAL_DENTAL_MATERIAL_TEMPLATES.length >= 6);

		// Септанест — ЛС (анестетик), освобожден от НДС (0%)
		const septanest = CANONICAL_DENTAL_MATERIAL_TEMPLATES.find((t) => t.name.includes("Септанест"));
		assert.ok(septanest, "Септанест должен присутствовать");
		assert.equal(septanest.vatRate, 0, "Септанест облагается ставкой НДС 0% по НК РФ ст. 149 п. 2");
		assert.equal(septanest.category, "Анестетики");
		assert.ok(septanest.defaultUnitPriceKopecks > 0);

		// Филтек — композит (медизделие), освобожден от НДС (0%)
		const filtek = CANONICAL_DENTAL_MATERIAL_TEMPLATES.find((t) => t.name.includes("Filtek"));
		assert.ok(filtek, "Филтек Z250 должен присутствовать");
		assert.equal(filtek.vatRate, 0);

		// Перчатки нитриловые — общерасходные изделия (НДС 20%)
		const gloves = CANONICAL_DENTAL_MATERIAL_TEMPLATES.find((t) => t.name.includes("Перчатки"));
		assert.ok(gloves, "Перчатки нитриловые должны присутствовать");
		assert.equal(gloves.vatRate, 20, "Перчатки облагаются стандартной ставкой 20%");

		// Все шаблоны имеют положительные цены в копейках и сроки годности
		for (const tpl of CANONICAL_DENTAL_MATERIAL_TEMPLATES) {
			assert.ok(tpl.name.length > 0);
			assert.ok(tpl.defaultUnitPriceKopecks > 0, `Цена шаблона ${tpl.name} должна быть положительной`);
			assert.ok(tpl.shelfLifeMonths > 0, `Срок годности ${tpl.name} должен быть > 0 месяцев`);
		}
	});
});

describe("AcceptanceWaybillsEngine — FEFO Batch Calculation (First Expired, First Out)", () => {
	it("определяет свежую партию (FEFO fresh: > 180 дней)", () => {
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 250); // > 180 дней вперед
		const iso = futureDate.toISOString().slice(0, 10);

		const status = calculateFefoStatus(iso);
		assert.equal(status.fefoStatus, "fresh");
		assert.ok(status.daysRemaining >= 240);
		assert.ok(status.badgeLabelRu.includes("Годен"));
	});

	it("определяет предупреждение (FEFO warning: 61..180 дней)", () => {
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 90); // 90 дней вперед
		const iso = futureDate.toISOString().slice(0, 10);

		const status = calculateFefoStatus(iso);
		assert.equal(status.fefoStatus, "warning");
		assert.ok(status.daysRemaining >= 80 && status.daysRemaining <= 100);
		assert.ok(status.badgeLabelRu.includes("первая очередь"));
	});

	it("определяет критический срок (FEFO critical: 1..60 дней)", () => {
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 25); // 25 дней вперед
		const iso = futureDate.toISOString().slice(0, 10);

		const status = calculateFefoStatus(iso);
		assert.equal(status.fefoStatus, "critical");
		assert.ok(status.daysRemaining >= 20 && status.daysRemaining <= 30);
		assert.ok(status.badgeLabelRu.includes("срочно расходовать"));
	});

	it("определяет просроченную партию (FEFO expired: <= 0 дней)", () => {
		const pastDate = new Date();
		pastDate.setDate(pastDate.getDate() - 5); // 5 дней назад
		const iso = pastDate.toISOString().slice(0, 10);

		const status = calculateFefoStatus(iso);
		assert.equal(status.fefoStatus, "expired");
		assert.ok(status.daysRemaining <= 0);
		assert.equal(status.badgeLabelRu, "Просрочен");
	});

	it("сортирует позиции накладной строго по правилу FEFO (ранний срок годности первым)", () => {
		const now = new Date();
		const d1 = new Date(now.getTime() + 10 * 86400000).toISOString().slice(0, 10); // 10 дней
		const d2 = new Date(now.getTime() + 300 * 86400000).toISOString().slice(0, 10); // 300 дней
		const d3 = new Date(now.getTime() + 50 * 86400000).toISOString().slice(0, 10); // 50 дней

		const item1 = createWaybillItem({
			id: "1",
			name: "Дальний",
			category: "Расходные материалы",
			unit: "уп",
			quantity: 1,
			batchNumber: "B1",
			expirationDate: d2,
			unitPriceKopecks: 10000,
			vatRate: 0,
		});
		const item2 = createWaybillItem({
			id: "2",
			name: "Критический",
			category: "Расходные материалы",
			unit: "уп",
			quantity: 1,
			batchNumber: "B2",
			expirationDate: d1,
			unitPriceKopecks: 10000,
			vatRate: 0,
		});
		const item3 = createWaybillItem({
			id: "3",
			name: "Средний",
			category: "Расходные материалы",
			unit: "уп",
			quantity: 1,
			batchNumber: "B3",
			expirationDate: d3,
			unitPriceKopecks: 10000,
			vatRate: 0,
		});

		const sorted = sortWaybillItemsByFefo([item1, item2, item3]);
		assert.equal(sorted[0]!.id, "2", "Критический срок (10 дней) должен быть первым");
		assert.equal(sorted[1]!.id, "3", "Средний срок (50 дней) должен быть вторым");
		assert.equal(sorted[2]!.id, "1", "Дальний срок (300 дней) должен быть последним");
	});
});

describe("AcceptanceWaybillsEngine — Integer Kopecks & Financial Calculations", () => {
	it("безупречно конвертирует рубли в копейки и обратно без погрешностей float", () => {
		assert.equal(rublesToKopecks(0.01), 1);
		assert.equal(rublesToKopecks(1), 100);
		assert.equal(rublesToKopecks(19.99), 1999);
		assert.equal(rublesToKopecks(5420.5), 542050);
		assert.equal(rublesToKopecks(0), 0);

		assert.equal(kopecksToRubles(1), 0.01);
		assert.equal(kopecksToRubles(1999), 19.99);
		assert.equal(kopecksToRubles(542050), 5420.5);
	});

	it("форматирует валюту в рублях с разделителями", () => {
		const formatted = formatRubCurrency(1250050); // 12 500,50 руб.
		assert.ok(formatted.includes("12") && formatted.includes("500") && formatted.includes("50"));
	});

	it("создает позицию накладной с точным расчетом НДС и итоговых копеек", () => {
		// 5 упаковок по 1 200,00 руб. (120 000 коп.), НДС 20%
		const item = createWaybillItem({
			name: "Перчатки нитриловые",
			category: "СИЗ",
			unit: "уп",
			quantity: 5,
			unitPriceKopecks: 120000,
			vatRate: 20,
			batchNumber: "LOT-GLV-01",
			expirationDate: "2027-12-31",
		});

		// 5 * 120 000 = 600 000 коп. (база)
		// НДС 20% = 600 000 * 0.20 = 120 000 коп.
		// Итого = 720 000 коп. (7 200 руб.)
		assert.equal(item.quantity, 5);
		assert.equal(item.unitPriceKopecks, 120000);
		assert.equal(item.lineSubtotalKopecks, 600000);
		assert.equal(item.vatKopecks, 120000);
		assert.equal(item.lineTotalKopecks, 720000);
	});

	it("рассчитывает медицинские изделия без НДС (0%)", () => {
		// 2 упаковки Септанеста по 5 800,00 руб. (580 000 коп.), НДС 0%
		const item = createWaybillItem({
			name: "Септанест с адреналином 1:100 000",
			category: "Анестетики",
			unit: "уп (50 карпул)",
			quantity: 2,
			unitPriceKopecks: 580000,
			vatRate: 0,
			batchNumber: "B2409-SEP",
			expirationDate: "2027-06-30",
		});

		assert.equal(item.vatKopecks, 0);
		assert.equal(item.lineSubtotalKopecks, 1160000);
		assert.equal(item.lineTotalKopecks, 1160000); // 11 600,00 руб.
	});

	it("рассчитывает итоговые суммы по всей накладной со смешанными ставками НДС", () => {
		const itemVat0 = createWaybillItem({
			name: "Септанест",
			category: "Анестетики",
			unit: "уп",
			quantity: 1,
			unitPriceKopecks: 500000, // 5000 руб
			vatRate: 0,
			batchNumber: "B1",
			expirationDate: "2027-01-01",
		});

		const itemVat20 = createWaybillItem({
			name: "Перчатки",
			category: "СИЗ",
			unit: "уп",
			quantity: 2,
			unitPriceKopecks: 100000, // 2 * 1000 = 2000 руб база, НДС 400 руб, всего 2400 руб
			vatRate: 20,
			batchNumber: "B2",
			expirationDate: "2027-01-01",
		});

		const totals = calculateWaybillTotals([itemVat0, itemVat20]);
		assert.equal(totals.totalQuantity, 3);
		assert.equal(totals.subtotalKopecks, 700000); // 5000 + 2000 = 7000 руб
		assert.equal(totals.totalVatKopecks, 40000); // 400 руб НДС
		assert.equal(totals.totalCostKopecks, 740000); // 7400 руб всего
		assert.equal(totals.subtotalRubles, 7000);
		assert.equal(totals.totalVatRubles, 400);
		assert.equal(totals.totalCostRubles, 7400);
	});
});

describe("AcceptanceWaybillsEngine — Mandate 8n (Soft Overdraft Reconciliation)", () => {
	it("автоматически гасит отрицательный остаток (дефицит у кресла) при оприходовании", () => {
		// Врач провел экстренное списание 3 карпул анестетика, склад ушел в -3
		const currentNegativeStock = -3;
		const incomingQuantity = 10;

		const reconciliation = reconcileOverdraftOnReceipt(currentNegativeStock, incomingQuantity);

		assert.equal(reconciliation.overdraftResolved, true);
		assert.equal(reconciliation.previousStock, -3);
		assert.equal(reconciliation.clearedDeficit, 3);
		assert.equal(reconciliation.newStockQuantity, 7);
	});

	it("корректно обрабатывает частичное погашение овердрафта", () => {
		// Дефицит был -10, накладная пришла только на 4 штуки
		const currentNegativeStock = -10;
		const incomingQuantity = 4;

		const reconciliation = reconcileOverdraftOnReceipt(currentNegativeStock, incomingQuantity);

		assert.equal(reconciliation.overdraftResolved, true);
		assert.equal(reconciliation.previousStock, -10);
		assert.equal(reconciliation.clearedDeficit, 4);
		assert.equal(reconciliation.newStockQuantity, -6);
	});

	it("корректно обрабатывает стандартный приход без овердрафта", () => {
		const currentPositiveStock = 5;
		const incomingQuantity = 10;

		const reconciliation = reconcileOverdraftOnReceipt(currentPositiveStock, incomingQuantity);

		assert.equal(reconciliation.overdraftResolved, false);
		assert.equal(reconciliation.previousStock, 5);
		assert.equal(reconciliation.clearedDeficit, 0);
		assert.equal(reconciliation.newStockQuantity, 15);
	});
});

describe("AcceptanceWaybillsEngine — Waybill Draft Validation", () => {
	it("бракует черновик без номера накладной или позиций", () => {
		const baseDraft = createDraftAcceptanceWaybill();
		const draft = {
			...baseDraft,
			waybillNumber: "",
			items: [] as AcceptanceWaybillItem[],
		};

		const validation = validateWaybillDraft(draft);
		assert.equal(validation.isValid, false);
		assert.ok(validation.errors.some((e) => e.includes("номер накладной")));
		assert.ok(validation.errors.some((e) => e.includes("не содержит позиций")));
	});

	it("бракует просроченные материалы в накладной и предупреждает о критических сроках", () => {
		const sample = createSampleDentalWaybill();
		// Добавляем позицию с истекшим сроком годности
		const expiredItem = createWaybillItem({
			name: "Просроченный композит",
			category: "Терапия",
			unit: "шпр",
			quantity: 1,
			unitPriceKopecks: 100000,
			vatRate: 0,
			batchNumber: "BAD-LOT",
			expirationDate: "2020-01-01",
		});
		const draft = {
			...sample,
			items: [...sample.items, expiredItem],
		};

		const validation = validateWaybillDraft(draft);
		assert.equal(validation.isValid, false);
		assert.ok(validation.errors.some((e) => e.includes("истек") || e.includes("просрочен")));
	});

	it("предупреждает о критических остаточных сроках годности", () => {
		const sample = createSampleDentalWaybill();
		const draft = {
			...sample,
			items: [
				createWaybillItem({
					name: "Критичный бонд",
					category: "Адгезивы",
					unit: "фл",
					quantity: 2,
					unitPriceKopecks: 200000,
					vatRate: 0,
					batchNumber: "CRIT-LOT-01",
					expirationDate: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10), // 20 дней
				}),
			],
		};

		const validation = validateWaybillDraft(draft);
		assert.equal(validation.isValid, true);
		assert.ok(validation.warnings.some((w) => w.includes("критический") || w.includes("приоритетное")));
	});

	it("успешно валидирует корректный образец накладной", () => {
		const sample = createSampleDentalWaybill();
		const validation = validateWaybillDraft(sample);

		assert.equal(validation.isValid, true);
		assert.equal(validation.errors.length, 0);
	});
});

describe("AcceptanceWaybillsEngine — ТОРГ-12 Form & CSV Export", () => {
	it("генерирует регламентную форму ТОРГ-12 без больничной бюрократии (начмедов, комиссий)", () => {
		const waybill = createSampleDentalWaybill();
		const html = generateTorg12Html(waybill, { nameRu: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»", inn: "7701987654" });

		// Содержит унифицированную шапку ТОРГ-12
		assert.ok(html.includes("Унифицированная форма № ТОРГ-12"));
		assert.ok(html.includes("Госкомстата России"));

		// Содержит реального поставщика и ИНН
		assert.ok(html.includes(waybill.supplier.name));
		assert.ok(html.includes(waybill.supplier.inn));

		// Содержит номер накладной
		assert.ok(html.includes(waybill.waybillNumber));

		// Содержит позиции и партии
		assert.ok(html.includes("Септанест") || html.includes("Filtek"));
		assert.ok(html.includes("FLTK-") || html.includes("SEPT-") || html.includes("PROT-"));

		// Не содержит больничного мусора
		assert.ok(!html.includes("начмед"), "Не должно быть начмеда");
		assert.ok(!html.includes("зам. главного врача"), "Не должно быть больничных комиссий");
		assert.ok(!html.includes("наркотическ"), "Не должно быть наркотических форм");
	});

	it("экспортирует накладную в валидный CSV с UTF-8 BOM для Excel", () => {
		const waybill = createSampleDentalWaybill();
		const csv = exportWaybillToCsv(waybill);

		// Начинается с UTF-8 BOM (\uFEFF)
		assert.ok(csv.startsWith("\uFEFF"));

		// Содержит разделитель ';'
		assert.ok(csv.includes(";"));

		// Содержит шапку и ключевые поля
		assert.ok(csv.includes("Наименование"));
		assert.ok(csv.includes("Серия_Партия"));
		assert.ok(csv.includes("Срок_годности"));
		assert.ok(csv.includes(waybill.waybillNumber) || csv.includes("FEFO_Статус"));
	});
});
