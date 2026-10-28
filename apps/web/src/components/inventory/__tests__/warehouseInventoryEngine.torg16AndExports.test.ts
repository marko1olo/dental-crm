import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_COMMISSION_MEMBERS,
	DEFAULT_INVENTORY_ITEMS_PRESET,
	type WarehouseInventoryAuditDocument,
	exportInv19DiscrepanciesToCsv,
	exportInventoryTo1C,
	exportInventoryToCsv,
	generateTorg16ActFromInventory,
} from "../warehouseInventoryEngine.js";

const sampleDoc: WarehouseInventoryAuditDocument = {
	id: "doc_export",
	documentNumber: "ИНВ-2026-99",
	orderNumber: "ПР-99",
	orderDate: "2026-08-28",
	auditStartDate: "2026-08-28",
	auditEndDate: "2026-08-28",
	auditDate: "2026-08-28",
	branchId: "central_hub",
	branchNameRu: "Центральный склад",
	warehouseNameRu: "Склад №1",
	molFullName: "Васильев О.П.",
	molPosition: "Заведующий складом",
	status: "reconciliation",
	commission: DEFAULT_COMMISSION_MEMBERS,
	items: DEFAULT_INVENTORY_ITEMS_PRESET,
	organizationNameRu: "ООО ДЕНТЕ",
	organizationOkpo: "49201948",
	organizationInn: "7701984512",
};

describe("TORG-16 Write-Off Act Generation for Expired Lots", () => {
	it("Автоматически извлекает просроченные партии в унифицированный акт ТОРГ-16", () => {
		const torg16 = generateTorg16ActFromInventory(sampleDoc);
		assert.ok(torg16.actNumber.includes("ТОРГ-16"));
		assert.ok(torg16.items.length >= 2);

		for (const item of torg16.items) {
			assert.ok(item.totalCostKopecks > 0);
			assert.ok(item.defectDescriptionRu.includes("Истек срок годности"));
		}

		assert.equal(
			torg16.totalCostKopecks,
			torg16.items.reduce((sum, it) => sum + it.totalCostKopecks, 0),
		);
		assert.equal(
			torg16.totalQuantity,
			torg16.items.reduce((sum, it) => sum + it.quantity, 0),
		);
	});
});

describe("CSV & 1C CommerceML Exports", () => {
	it("Экспортирует полную инвентаризационную опись в CSV с UTF-8 BOM", () => {
		const csv = exportInventoryToCsv(sampleDoc);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("№ п/п;Артикул;Наименование ТМЦ"));
		assert.ok(csv.includes("Ультракаин Д-С Форте"));
		assert.ok(csv.includes("Септанест с адреналином"));
	});

	it("Экспортирует сличительную ведомость ИНВ-19 в CSV (только расхождения)", () => {
		const csv = exportInv19DiscrepanciesToCsv(sampleDoc);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("Излишек (кол-во);Излишек (руб);Недостача (кол-во);Недостача (руб)"));
		assert.ok(csv.includes("Filtek"));
	});

	it("Экспортирует данные в XML-схему 1C CommerceML 2.09", () => {
		const xml = exportInventoryTo1C(sampleDoc);
		assert.ok(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(xml.includes('<КоммерческаяИнформация ВерсияСхемы="2.09"'));
		assert.ok(xml.includes("<Документ.ИнвентаризацияТоваровНаСкладе>"));
		assert.ok(xml.includes("<Номер>ИНВ-2026-99</Номер>"));
		assert.ok(xml.includes("<СуммаУчетВсего>"));
		assert.ok(xml.includes("<СуммаФактВсего>"));
		assert.ok(xml.includes("</Документ.ИнвентаризацияТоваровНаСкладе>"));
	});
});
