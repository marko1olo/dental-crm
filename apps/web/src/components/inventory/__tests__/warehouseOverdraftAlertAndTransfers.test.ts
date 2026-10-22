import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { performAutoVisitBomDeduction } from "../autoBomDeductionEngine.js";

describe("CLINICAL WAREHOUSE: Overdraft Alert & Transfers", () => {
	it("фоновый движок performAutoVisitBomDeduction отправляет alert на /overdraft-alert", async () => {
		const capturedCalls: Array<{ url: string; body: any }> = [];
		const mockFetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			capturedCalls.push({
				url: String(url),
				body: init?.body ? JSON.parse(String(init.body)) : null,
			});
			return new Response(JSON.stringify({ success: true, recordedCount: 1 }), { status: 200 });
		};

		const result = await performAutoVisitBomDeduction({
			visitId: "VIS-INQ-001",
			visitNumber: "№144",
			cabinetId: "Кабинет 2 (Терапия)",
			chairId: "Кресло 1 (A-dec)",
			patientId: "PAT-INQ-01",
			doctorId: "DOC-INQ-01",
			organizationId: "org-inquisitor-test",
			renderedServices: [
				{
					code: "A11.07.012",
					name: "Анестезия",
					quantity: 2,
				},
			],
			currentStockMap: {
				"mat-anes-art-100k": 0,
			},
			allowOverdraft: true,
			includeStandardPpe: false,
			fetchFn: mockFetch as unknown as typeof fetch,
		});

		assert.equal(result.hasOverdraft, true);

		const alertCall = capturedCalls.find((c) => c.url.endsWith("/overdraft-alert"));
		assert.ok(alertCall, "Должен быть вызван эндпоинт /overdraft-alert");
		assert.equal(alertCall.body.visitId, "VIS-INQ-001");
		assert.equal(alertCall.body.cabinetId, "Кабинет 2 (Терапия)");
		assert.equal(alertCall.body.chairId, "Кресло 1 (A-dec)");
		assert.equal(alertCall.body.items[0].deficitQty, 2);
	});

	it("корректно формирует пакет списания при перемещении между филиалами с allowOverdraft: true", () => {
		const transferLines = [
			{
				itemId: "item-anes-01",
				nameRu: "Ультракаин Д-С Форте",
				dispatchedQuantity: 10,
				requestedQuantity: 10,
				batchNumber: "LOT-TRANS-01",
				expiryDate: "2027-10-31",
			},
			{
				itemId: "item-implant-02",
				nameRu: "Имплантат Dentium SuperLine Ø4.0 x 10 мм",
				dispatchedQuantity: 2,
				requestedQuantity: 2,
				batchNumber: "LOT-DENT-88",
				expiryDate: "2029-05-31",
			},
		];

		const deductPayload = {
			items: transferLines.map((line) => ({
				inventoryItemId: line.itemId,
				name: line.nameRu,
				quantity: line.dispatchedQuantity,
				allowOverdraft: true,
				reason: "Перемещение ТОРГ-13 №ТОРГ-13-2026/10-001 (central_hub → branch_center)",
				lotNumber: line.batchNumber,
				expirationDate: line.expiryDate,
			})),
			allowOverdraft: true,
			reason: "Перемещение ТОРГ-13 №ТОРГ-13-2026/10-001",
		};

		assert.equal(deductPayload.items.length, 2);
		assert.equal(deductPayload.allowOverdraft, true);
		assert.equal(deductPayload.items[0]?.quantity, 10);
		assert.equal(deductPayload.items[1]?.quantity, 2);
		assert.equal(deductPayload.items[0]?.lotNumber, "LOT-TRANS-01");
	});
});
