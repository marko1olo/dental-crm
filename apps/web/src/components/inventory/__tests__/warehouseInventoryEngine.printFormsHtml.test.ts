import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	DEFAULT_COMMISSION_MEMBERS,
	DEFAULT_INVENTORY_ITEMS_PRESET,
	type WarehouseInventoryAuditDocument,
	generateInv19Html,
	generateInv3Html,
	generateTorg16ActFromInventory,
	generateTorg16Html,
} from "../warehouseInventoryEngine.js";

const sampleDoc: WarehouseInventoryAuditDocument = {
	id: "doc_print",
	documentNumber: "ИНВ-2026-10",
	orderNumber: "ПР-10",
	orderDate: "2026-08-28",
	auditStartDate: "2026-08-28",
	auditEndDate: "2026-08-28",
	auditDate: "2026-08-28",
	branchId: "central_hub",
	branchNameRu: "Центральный склад",
	warehouseNameRu: "Главный аптечный склад",
	molFullName: "Васильев Олег Петрович",
	molPosition: "Заведующий складом",
	status: "reconciliation",
	commission: DEFAULT_COMMISSION_MEMBERS,
	items: DEFAULT_INVENTORY_ITEMS_PRESET,
	organizationNameRu: "ООО «ДЕНТЕ КЛИНИК»",
	organizationOkpo: "49201948",
	organizationInn: "7701984512",
};

describe("Official Russian Print Forms Generation (HTML)", () => {
	it("Формирует бланк формы ИНВ-3 (ОКУД 0317004) со всеми реквизитами", () => {
		const html = generateInv3Html(sampleDoc);
		assert.ok(html.includes("0317004"));
		assert.ok(html.includes("ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ"));
		assert.ok(html.includes("Расписка:"));
		assert.ok(html.includes("Васильев Олег Петрович"));
		assert.ok(html.includes("ИТОГО ПО ОПИСИ:"));
		assert.ok(html.includes("Итого фактическая сумма прописью:"));
	});

	it("Формирует бланк формы ИНВ-19 (ОКУД 0317019) со сличительными колонками", () => {
		const html = generateInv19Html(sampleDoc);
		assert.ok(html.includes("0317019"));
		assert.ok(html.includes("СЛИЧИТЕЛЬНАЯ ВЕДОМОСТЬ"));
		assert.ok(html.includes("Излишки"));
		assert.ok(html.includes("Недостачи"));
		assert.ok(html.includes("Итого излишек прописью:"));
		assert.ok(html.includes("Итого недостача прописью:"));
	});

	it("Формирует бланк формы ТОРГ-16 (ОКУД 0330216) со списанием просроченных ТМЦ", () => {
		const torg16 = generateTorg16ActFromInventory(sampleDoc);
		const html = generateTorg16Html(torg16);
		assert.ok(html.includes("0330216"));
		assert.ok(html.includes("АКТ О СПИСАНИИ ТОВАРОВ"));
		assert.ok(html.includes("Причина списания:"));
		assert.ok(html.includes("ВСЕГО ПО АКТУ:"));
		assert.ok(html.includes("Итого сумма списания прописью:"));
	});
});
