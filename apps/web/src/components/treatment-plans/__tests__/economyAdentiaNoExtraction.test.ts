/**
 * economyAdentiaNoExtraction.test.ts — Инвариант исключения удаления корня при адентии (PLN-06)
 *
 * При генерации тарифа «Эконом» для зубов со статусом "Missing" (адентия)
 * КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО начислять платное удаление разрушенного корня (SimpleExtraction),
 * поскольку зуб уже отсутствует.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { ToothData } from "../../odontogram/ToothChart";
import { generateTierPlanStages } from "../treatmentPlanTierStagesGenerator";

describe("PLN-06: Economy tier adentia generator must not bill extractions for missing teeth", () => {
	test("Отсутствующий зуб 36 (Missing) в тарифе Эконом не создает удаление зуба в хирургическом этапе", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 36, state: "Missing" },
		];

		const stages = generateTierPlanStages("economy", teeth, undefined, 0, { isDemoMode: false });
		const [, stage2, stage3] = stages;

		// В этапе 2 (хирургия) НЕ должно быть никакого удаления для отсутствующего зуба 36
		const extractionsFor36 = stage2!.items.filter(
			(i) => i.toothNumber === 36 && (i.code804n === "A16.07.001" || i.id.includes("eco-ext")),
		);
		assert.equal(
			extractionsFor36.length,
			0,
			"PLN-06: Удаление несуществующего зуба при адентии категорически запрещено",
		);

		// В этапе 3 (ортопедия) должен присутствовать мостовидный протез для восстановления дефекта
		const bridgeFor36 = stage3!.items.find((i) => i.toothNumber === 36 && i.id.includes("eco-bridge"));
		assert.ok(bridgeFor36, "Для отсутствующего зуба формируется ортопедический мостовидный протез");
	});
});
