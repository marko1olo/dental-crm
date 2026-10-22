import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { performAutoVisitBomDeduction } from "../autoBomDeductionEngine.js";

describe("Doctor Autonomy & Soft Overdraft Protection", () => {
	it("нулевой остаток никогда не блокирует завершение приёма", async () => {
		let alertTriggered = false;
		let alertData: any = null;

		const result = await performAutoVisitBomDeduction({
			visitId: "visit-autonomy-777",
			visitNumber: "777",
			patientId: "pat-99",
			doctorId: "doc-sokolov",
			cabinetId: "cab-chir-1",
			chairId: "chair-1",
			renderedServices: [
				{
					serviceCode: "A11.07.012",
					name: "Анестезия инфильтрационная",
					quantity: 2,
				},
			],
			currentStockMap: {
				"mat-anes-art-100k": 0,
				"mat-anes-needle-30g": 0,
			},
			allowOverdraft: true,
			includeStandardPpe: false,
			onOverdraftAlert: (data) => {
				alertTriggered = true;
				alertData = data;
			},
		});

		assert.equal(result.hasOverdraft, true);
		assert.ok(result.items.length > 0);
		assert.ok(result.softOverdrafts.length >= 2);
		assert.equal(alertTriggered, true);
		assert.equal(alertData.visitNumber, "777");
		assert.equal(
			alertData.message,
			"Требуется оприходование: материал списан в овердрафт по визиту №777",
		);
		assert.equal(alertData.cabinetId, "cab-chir-1");
		assert.equal(alertData.chairId, "chair-1");
	});
});
