/**
 * periodontalDetailedProbeInquisition.test.ts — Детальное зондирование и синтез клинического протокола ЭМК.
 * Мандат 8b: <= 120 строк.
 */

import {
	calculateAapEfpStagingAndGrading,
	calculateClinicalAttachmentLevel,
	calculatePerioIndices,
	createDefaultPerioTeeth,
	generateComprehensivePerioProtocolText,
	PERIO_SITE_KEYS,
} from "@dental/shared";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applyHealthyPeriodontiumPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
} from "../perioCatalogData";

describe("12. Detailed Probing & Clinical Protocol Synthesis", () => {
	it("isolated pathology on tooth 16 does not require entering all 192 points", () => {
		const teeth = applyHealthyPeriodontiumPreset(createDefaultPerioTeeth());
		const updated = teeth.map((tooth) => {
			if (tooth.toothNumber !== 16) return tooth;
			const copy = { ...tooth };
			for (const k of PERIO_SITE_KEYS) {
				const existingSite = tooth[k];
				if (existingSite) {
					copy[k] = {
						...existingSite,
						probingDepthMm: 4,
						bleedingOnProbing: true,
						calMm: calculateClinicalAttachmentLevel(4, existingSite.gingivalMarginMm ?? 0),
					};
				}
			}
			return copy;
		});

		const summary = calculatePerioIndices(updated);
		assert.strictEqual(summary.moderatePocketsCount, 6);
		assert.strictEqual(summary.deepPocketsCount, 0);
		assert.ok(summary.fmbsPercent > 0);
	});

	it("AAP/EFP staging and grading diagnosis correctly resolves K05.3", () => {
		const severeTeeth = applyPeriodontitisSeverePreset(createDefaultPerioTeeth());
		const summary = calculatePerioIndices(severeTeeth);
		const diag = calculateAapEfpStagingAndGrading(severeTeeth, summary);
		assert.ok(diag.icd10Code.startsWith("K05.3"));
		assert.ok(summary.deepPocketsCount > 0);
	});

	it("generateComprehensivePerioProtocolText synthesizes structured summary", () => {
		const teeth = applyPeriodontitisModeratePreset(createDefaultPerioTeeth());
		const summary = calculatePerioIndices(teeth);
		const protocol = generateComprehensivePerioProtocolText(teeth, summary, {
			doctorName: "Д-р Смирнова Е.А.",
			customNotes: "SRP в области секстанта S1",
		});

		assert.ok(protocol.includes("ПРОТОКОЛ ПАРОДОНТОЛОГИЧЕСКОГО ОБСЛЕДОВАНИЯ"));
		assert.ok(protocol.includes("Лечащий врач: Д-р Смирнова Е.А."));
		assert.ok(protocol.includes("SRP в области секстанта S1"));
	});
});
