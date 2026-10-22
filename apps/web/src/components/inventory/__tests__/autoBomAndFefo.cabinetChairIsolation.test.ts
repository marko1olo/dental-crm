import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { performAutoVisitBomDeduction } from "../autoBomDeductionEngine.js";

describe("Auto-BOM Chair/Cabinet Isolation", () => {
	it("строго изолирует списание по креслу/кабинету: остатки чужого кресла не списываются", async () => {
		let capturedToast = "";
		let capturedAlert: any = null;

		const warehouseItems = [
			{
				id: "mat-comp-filtek-01",
				name: "Композит светового отверждения (Filtek Z250, шприц 4г)",
				stockQuantity: 10,
				cabinetId: "cab-2",
				chairId: "chair-2",
			},
			{
				id: "mat-comp-filtek-01",
				name: "Композит светового отверждения (Filtek Z250, шприц 4г)",
				stockQuantity: 0,
				cabinetId: "cab-1",
				chairId: "chair-1",
			},
		];

		const result = await performAutoVisitBomDeduction({
			visitId: "visit-scoping-101",
			visitNumber: "В-101",
			patientId: "pat-1",
			doctorId: "doc-1",
			cabinetId: "cab-1",
			chairId: "chair-1",
			renderedServices: [
				{
					serviceCode: "A16.07.002",
					name: "Лечение кариеса 36",
					quantity: 1,
					toothNumber: 36,
				},
			],
			warehouseItems: warehouseItems as any,
			allowOverdraft: true,
			includeStandardPpe: false,
			onToast: (msg) => {
				capturedToast = msg;
			},
			onOverdraftAlert: (alert) => {
				capturedAlert = alert;
			},
		});

		assert.equal(result.hasOverdraft, true);
		assert.ok(capturedToast.includes("Мягкий овердрафт"));
		assert.ok(capturedAlert !== null);
		assert.equal(capturedAlert.chairId, "chair-1");
		assert.equal(capturedAlert.cabinetId, "cab-1");
	});
});
