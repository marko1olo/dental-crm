/**
 * redTeamWarehouseInquisition.part1.test.tsx — Red Team Inquisitor Verification Suite:
 * Склад, расходные материалы, нормы расхода по каталогу процедур (тесты 1-2).
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

describe("Red Team: Warehouse & Procedure Catalog Write-off Invariants (Part 1)", () => {
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
		const zeroStockBatches = [
			{
				batchId: "batch_zero_1",
				materialId: "mat_articaine_ultracain",
				cabinetId: "cab_01_therapy",
				cabinetNameRu: "Кабинет №1 (Терапия)",
				lotNumber: "LOT-ZERO-01",
				expirationDate: "2028-12-31",
				manufactureDate: "2024-01-01",
				quantityAvailable: 0,
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
});
