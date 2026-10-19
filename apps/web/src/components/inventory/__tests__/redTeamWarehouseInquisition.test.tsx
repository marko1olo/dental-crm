/**
 * redTeamWarehouseInquisition.test.tsx — Red Team Inquisitor Verification Suite:
 * Склад, расходные материалы, нормы расхода по каталогу процедур и технологические карты списания.
 *
 * Мандаты 8e (Автономия врача), 8n (Суверенитет масштаба), 8x (Ликвидация канцелярита 804н):
 * 1. Искоренение канцелярита: "Нормы расхода по каталогу процедур" вместо номеров приказов.
 * 2. Ликвидация поштучной микро-дрочи у кресла врача: пакетные авто-списания БОМ.
 * 3. Soft Negative Stock: нулевой остаток никогда не блокирует завершение приёма.
 * 4. 1-Click формирование заказа поставщику на дефицитные позиции.
 * 5. Бейдж «⚠️ N поз.» в сайдбаре навигации склада при наличии дефицита.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	PROCEDURE_CATALOG_SERVICE_NORMS,
	ORDER_804N_SERVICE_NORMS,
	getProcedureCatalogServiceNorm,
	getOrder804nServiceNorm,
} from "../writeoff/clinicalWriteoffPresets.js";
import {
	ClinicalWriteoffModal,
	DEFAULT_CLINICAL_SERVICES,
} from "../writeoff/ClinicalWriteoffModal.js";
import {
	createSupplierPurchaseOrderFromLines,
	formatSupplierPurchaseOrderTextRu,
} from "../inventorySupplierOrders.js";
import { WorkspaceSidebar } from "../../../workspaceShellModules/WorkspaceSidebar.js";
import { useInventoryStore } from "../../../store/inventoryStore.js";

describe("Red Team: Warehouse & Procedure Catalog Write-off Invariants", () => {
	it("1. PROCEDURE_CATALOG_SERVICE_NORMS и алиас ORDER_804N_SERVICE_NORMS ссылаются на канонический каталог норм", () => {
		assert.ok(Array.isArray(PROCEDURE_CATALOG_SERVICE_NORMS), "Должен быть массивом норм");
		assert.equal(
			PROCEDURE_CATALOG_SERVICE_NORMS,
			ORDER_804N_SERVICE_NORMS,
			"ORDER_804N_SERVICE_NORMS должен быть идентичен PROCEDURE_CATALOG_SERVICE_NORMS",
		);

		const cariesNorm = getProcedureCatalogServiceNorm("A16.07.002.001");
		assert.ok(cariesNorm, "Должен находить норму пломбирования по коду услуги");
		assert.equal(
			cariesNorm,
			getOrder804nServiceNorm("A16.07.002.001"),
			"Обратная совместимость getOrder804nServiceNorm должна возвращать тот же объект",
		);
	});

	it("2. ClinicalWriteoffModal рендерит 1-клик генератор заказа поставщику при наличии дефицита", () => {
		// Задаем партии с нулевым/дефицитным остатком
		const zeroStockBatches = [
			{
				batchId: "batch_zero_1",
				materialId: "mat_articaine_ultracain",
				cabinetId: "cab_01_therapy",
				cabinetNameRu: "Кабинет №1 (Терапия)",
				lotNumber: "LOT-ZERO-01",
				expirationDate: "2028-12-31",
				manufactureDate: "2024-01-01",
				quantityAvailable: 0, // Дефицит
				criticalThreshold: 5,
				unitCostKopecks: 12000,
				supplierNameRu: "Стомторг",
			},
		];

		const html = renderToString(
			<ClinicalWriteoffModal
				isOpen={true}
				onClose={() => {}}
				initialServices={DEFAULT_CLINICAL_SERVICES}
				stockBatches={zeroStockBatches}
			/>,
		);

		assert.ok(
			html.includes('data-testid="btn-generate-supplier-order"'),
			"При дефиците обязана рендериться кнопка 1-клик формирования заказа поставщику",
		);
		assert.ok(
			html.includes("мягкий овердрафт") || html.includes("дефицитом"),
			"Должно отображаться разъяснение о мягком овердрафте без блокировки врача",
		);
	});

	it("3. createSupplierPurchaseOrderFromLines формирует точные объемы заказа и суммы в копейках", () => {
		const lines = [
			{
				id: "line_1",
				inventoryItemId: "sku-filtek",
				materialName: "Композит Filtek Ultimate",
				category: "composite" as const,
				quantity: 2,
				unit: "шприц",
				stockQuantity: 0,
				criticalThreshold: 3,
				unitCostKopecks: 350000, // 3500.00 руб
			},
		];

		const po = createSupplierPurchaseOrderFromLines(lines);
		assert.ok(po, "Заказ поставщику должен быть сформирован");
		assert.equal(po.reason, "stock_deficit");
		assert.equal(po.items.length, 1);
		assert.ok(po.items[0]!.suggestedOrderQuantity >= 3, "Рекомендуемый заказ должен покрыть дефицит и порог");
		assert.ok(po.totalCostKopecks > 0, "Стоимость должна быть рассчитана в копейках");

		const text = formatSupplierPurchaseOrderTextRu(po);
		assert.ok(text.includes("ЗАКАЗ ПОСТАВЩИКУ"), "Текст заказа должен содержать шапку");
		assert.ok(text.includes("Композит Filtek Ultimate"), "Текст заказа должен содержать наименование материала");
	});

	it("4. WorkspaceSidebar рендерит бейдж закупки при наличии дефицитных позиций склада", () => {
		useInventoryStore.getState().setItems([
			{
				id: "item_def_1",
				name: "Артикаин 4%",
				sku: "ART-4",
				barcode: null,
				stockQuantity: -1, // Отрицательный остаток овердрафта
				criticalThreshold: 5,
				unitCostRub: 120,
				unit: "карп",
				lotNumber: "LOT-1",
				expirationDate: "2027-01-01",
				category: "anesthesia",
			},
		]);

		const html = renderToString(
			<WorkspaceSidebar
				currentView="inventory"
				onViewIntent={() => {}}
				role="doctor"
				collapsed={false}
				onToggleCollapsed={() => {}}
				onLockSession={() => {}}
			/>,
		);

		assert.ok(
			html.includes('data-testid="sidebar-inventory-reorder-badge"'),
			"В сайдбаре обязан отображаться бейдж требуемой закупки для склада",
		);
	});
});
