import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	DEFAULT_COMMISSION_MEMBERS,
	DEFAULT_INVENTORY_ITEMS_PRESET,
	type WarehouseInventoryAuditDocument,
	validateInventoryAuditDraft,
} from "../warehouseInventoryEngine.js";

describe("Document Validation (validateInventoryAuditDraft)", () => {
	it("Принимает корректно заполненный черновик инвентаризации", () => {
		const doc: WarehouseInventoryAuditDocument = {
			id: "doc_1",
			documentNumber: "ИНВ-2026-01",
			orderNumber: "ПР-44",
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

		const res = validateInventoryAuditDraft(doc);
		assert.equal(res.isValid, true);
		assert.equal(res.errors.length, 0);
	});

	it("Блокирует черновик с отсутствующими обязательными реквизитами", () => {
		const invalidDoc: Partial<WarehouseInventoryAuditDocument> = {
			documentNumber: "",
			orderNumber: "",
			molFullName: "",
			commission: [],
			items: [],
		};

		const res = validateInventoryAuditDraft(invalidDoc);
		assert.equal(res.isValid, false);
		assert.ok(res.errors.some((e) => e.includes("Номер инвентаризационной описи")));
		assert.ok(res.warnings.some((w) => w.includes("без оформления отдельного приказа")));
		assert.ok(res.errors.some((e) => e.includes("ФИО ответственного сотрудника")));
		assert.ok(res.warnings.some((w) => w.includes("без обязательного требования комиссии из 3 человек")));
		assert.ok(res.errors.some((e) => e.includes("хотя бы одну позицию")));
	});
});
