import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { executeShiftCloseClassBWasteDisposal } from "../autoBomDeductionEngine.js";

describe("4. SanPiN Class B Carpule Disposal Act (СанПиН 2.1.3684-21 / 3.3686-21)", () => {
	it("учитывает бой стеклянных карпул и неполные дозы с дезинфекцией 3% Аламинол", async () => {
		const disposal = await executeShiftCloseClassBWasteDisposal({
			organizationId: "org-dente",
			shiftDate: "2026-05-15",
			accumulatedCarpulesCount: 10,
			brokenCarpulesCount: 2,
			partiallyUsedCarpulesCount: 1,
			accumulatedNeedlesCount: 10,
			accumulatedSharpsCount: 2,
			contaminatedItemsCount: 20,
			customTareKg: 0.15,
			responsibleStaffName: "Иванова М. С.",
			responsibleStaffPosition: "Старшая медицинская сестра",
			cabinetId: "cab-3",
			chairId: "chair-1",
			clinicName: "ООО «ДЕНТЕ» СТОМАТОЛОГИЧЕСКАЯ КЛИНИКА",
		});

		assert.equal(disposal.brokenCarpulesCount, 2);
		assert.equal(disposal.partiallyUsedCarpulesCount, 1);
		assert.equal(disposal.cabinetId, "cab-3");
		assert.equal(disposal.chairId, "chair-1");
		assert.ok(disposal.disinfectionProtocol.includes("3% Аламинол"));

		const html = disposal.actHtml;
		assert.ok(html.includes("Разбитые стеклянные карпулы анестетиков (бой при установке"));
		assert.ok(html.includes("Не полностью израсходованные карпулы анестетика с остатками раствора"));
		assert.ok(html.includes("Химическая дезинфекция 3% Аламинол (замачивание 60 мин)"));
		assert.ok(html.includes("без комиссии из 3 человек"));
		assert.ok(html.includes("Кабинет: cab-3 (Кресло chair-1)"));
	});
});
