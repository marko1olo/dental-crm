import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { performAutoVisitBomDeduction } from "../autoBomDeductionEngine.js";

describe("BOM Deduction: Web Orchestrator (performAutoVisitBomDeduction)", () => {
	it("принимает различные форматы входящих услуг и сопоставляет остатки склада", async () => {
		const warehouseItems = [
			{ id: "mat-anes-art-100k", name: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)", stockQuantity: 5, priceKopecks: 14500, minStock: 2, unit: "карпула", category: "anesthetic" },
			{ id: "mat-anes-needle-30g", name: "Игла карпульная стоматологическая 30G евростандарт (25 мм)", stockQuantity: 20, priceKopecks: 2500, minStock: 5, unit: "шт", category: "anesthetic" },
			{ id: "mat-anes-wipe", name: "Антисептическая спиртовая салфетка стерильная", stockQuantity: 50, priceKopecks: 500, minStock: 10, unit: "шт", category: "disinfectant" },
		];

		let toastCalled = false;
		let toastType = "";
		const result = await performAutoVisitBomDeduction({
			visitId: "VIS-AUTO-01",
			patientId: "PAT-01",
			patientFullName: "Сидоров В. В.",
			doctorId: "DOC-01",
			doctorFullName: "Д-р Смирнов А. А.",
			renderedServices: [{ serviceCode: "A11.07.012", serviceTitle: "Инфильтрационная анестезия", quantity: 1, toothNumber: 47 }],
			warehouseItems: warehouseItems as unknown as any,
			allowOverdraft: true,
			includeStandardPpe: false,
			onToast: (_msg, type) => {
				toastCalled = true;
				toastType = type;
			},
		});

		assert.equal(toastCalled, true);
		assert.equal(toastType, "success");
		assert.ok(result.totalDeductedItems >= 1);
		assert.equal(result.hasOverdraft, false);

		const deductedArticaine = result.items.find((i) => i.inventoryItemId === "mat-anes-art-100k");
		assert.ok(deductedArticaine);
		assert.equal(deductedArticaine.remainingQty, 4);
	});

	it("при дефиците отправляет warning-уведомление без блокировки выполнения", async () => {
		let capturedType = "";
		let capturedMsg = "";

		const result = await performAutoVisitBomDeduction({
			visitId: "VIS-AUTO-02",
			patientId: "PAT-02",
			doctorId: "DOC-02",
			renderedServices: [{ code: "A11.07.012", name: "Анестезия", quantity: 3, toothNumber: "15" }],
			currentStockMap: { "mat-anes-art-100k": 1 },
			allowOverdraft: true,
			includeStandardPpe: false,
			onToast: (msg, type) => {
				capturedMsg = msg;
				capturedType = type;
			},
		});

		assert.equal(capturedType, "warning");
		assert.ok(capturedMsg.includes("Мягкий овердрафт"));
		assert.ok(capturedMsg.includes("Приём сохранён"));
		assert.equal(result.hasOverdraft, true);
	});

	it("при возникновении овердрафта отправляет alert на /api/inventory/:org/overdraft-alert", async () => {
		const postedRequests: Array<{ url: string; body: Record<string, unknown> | null }> = [];
		const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
			postedRequests.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
			return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
		};

		const result = await performAutoVisitBomDeduction({
			visitId: "VIS-AUTO-ALERT",
			patientId: "PAT-02",
			doctorId: "DOC-02",
			organizationId: "org-overdraft-test",
			cabinetId: "CAB-3",
			chairId: "CHAIR-1",
			renderedServices: [{ code: "A11.07.012", name: "Анестезия", quantity: 2 }],
			currentStockMap: { "mat-anes-art-100k": 0 },
			allowOverdraft: true,
			includeStandardPpe: false,
			fetchFn: mockFetch as unknown as typeof fetch,
		});

		assert.equal(result.hasOverdraft, true);
		const alertReq = postedRequests.find((r) => r.url.includes("/overdraft-alert"));
		assert.ok(alertReq);
		assert.equal(alertReq.url, "/api/inventory/org-overdraft-test/overdraft-alert");
		assert.equal(alertReq.body?.visitId, "VIS-AUTO-ALERT");
		assert.equal(alertReq.body?.cabinetId, "CAB-3");
		assert.equal(alertReq.body?.chairId, "CHAIR-1");
		const alertItems = alertReq.body?.items as Array<{ deficitQty: number }>;
		assert.ok(alertItems && alertItems.length >= 1);
		assert.equal(alertItems[0]?.deficitQty, 2);
	});
});
