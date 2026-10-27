/**
 * periodontalChairsideHygieneInvoiceBridge.test.ts — Сквозной мост плана лечения и счета (A16.07.051).
 * Мандат 8b: <= 120 строк.
 */

import {
	calculateClinicalAttachmentLevel,
	createDefaultPerioTeeth,
	PERIO_SITE_KEYS,
} from "@dental/shared";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPeriodontalTreatmentPlanJustification } from "../chart/perioSideEffectsEngine";
import { applyHealthyPeriodontiumPreset } from "../perioMath";

describe("11. Chairside Hygiene & Treatment Plan Invoice Bridge", () => {
	it("proposes prophy and curettage for tooth 46 with pocket 5 mm and BOP", () => {
		const intactTeeth = applyHealthyPeriodontiumPreset(createDefaultPerioTeeth());
		assert.strictEqual(intactTeeth.length, 32);

		const updatedTeeth = intactTeeth.map((tooth) => {
			if (tooth.toothNumber !== 46) return tooth;
			const copy = { ...tooth, mobility: 1 as const };
			for (const k of PERIO_SITE_KEYS) {
				copy[k] = {
					...tooth[k]!,
					probingDepthMm: 5,
					bleedingOnProbing: true,
					calMm: calculateClinicalAttachmentLevel(5, tooth[k]?.gingivalMarginMm ?? 0),
				};
			}
			return copy;
		});

		const tooth46 = updatedTeeth.find((t) => t.toothNumber === 46);
		assert.ok(tooth46);
		assert.strictEqual(tooth46.distoBuccal.probingDepthMm, 5);
		assert.strictEqual(tooth46.distoBuccal.bleedingOnProbing, true);

		const affected = updatedTeeth.filter((t) =>
			!t.isMissing &&
			PERIO_SITE_KEYS.some((k) => (t[k]?.probingDepthMm ?? 0) >= 4 && t[k]?.bleedingOnProbing),
		);
		assert.strictEqual(affected.length, 1);
		assert.strictEqual(affected[0]!.toothNumber, 46);

		const { planText, prophyService, curettageServices } = buildPeriodontalTreatmentPlanJustification(affected);
		assert.ok(planText.includes("A16.07.051"));
		assert.ok(planText.includes("A16.07.011"));
		assert.ok(planText.includes("#46"));
		assert.strictEqual(prophyService.code804n, "A16.07.051");
		assert.strictEqual(curettageServices.length, 1);
		assert.strictEqual(curettageServices[0]!.toothNumber, 46);
		assert.strictEqual(curettageServices[0]!.code804n, "A16.07.011");
	});
});
