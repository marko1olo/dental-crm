/**
 * ctImplantCanalSafetyAndAcidIntegrity.test.ts — безопасность нижнечелюстного канала, ACID и запрет эмодзи.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import { sumKopecks } from "@dental/shared";
import {
	buildImplantSurgicalPackageItems,
	generateCbctAutoPlanScenarios,
	type CbctAutoPlanFindingsInput,
	type CbctImplantFinding,
} from "../ctImplantIntegrationBridge";

describe("ctImplantIntegrationBridge — Безопасность канала, ACID и чистота UI", () => {
	test("records calm objective distance when nerve canal clearance is safe (>= 2.0 mm)", () => {
		const finding: CbctImplantFinding = {
			toothFdi: 46,
			brand: "dentium",
			nerveClearanceMm: 3.8,
		};

		const items = buildImplantSurgicalPackageItems(finding, "standard");
		const rationale = items[0]!.clinicalRationale || "";

		assert.ok(rationale.includes("3.8 мм"));
		assert.ok(!rationale.includes("ОПАСНОСТЬ"));
		assert.ok(!rationale.includes("ТРЕВОГА"));
	});

	test("provides objective critical buffer notice without alarmist shouting when clearance < 2.0 mm", () => {
		const finding: CbctImplantFinding = {
			toothFdi: 36,
			brand: "straumann",
			nerveClearanceMm: 1.2,
		};

		const items = buildImplantSurgicalPackageItems(finding, "optimum");
		const rationale = items[0]!.clinicalRationale || "";

		assert.ok(rationale.includes("1.2 мм"));
		assert.ok(rationale.includes("зазор до нижнечелюстного нерва"));
	});

	test("handles unmeasured canal gracefully with calm fallback", () => {
		const finding: CbctImplantFinding = {
			toothFdi: 11,
			brand: "straumann",
			nerveClearanceMm: null,
		};

		const items = buildImplantSurgicalPackageItems(finding, "optimum");
		const rationale = items[0]!.clinicalRationale || "";

		assert.ok(rationale.includes("Безопасная зона") || rationale.includes("не измерялась"));
	});

	test("total tier kopecks strictly equals the exact sum of all 4 stage kopecks", () => {
		const input: CbctAutoPlanFindingsInput = {
			patientId: "pat-acid-test",
			patientName: "Дмитрий Ковалев",
			implants: [
				{ toothFdi: 46, brand: "dentium", diameterMm: 4.5, lengthMm: 10.0 },
				{ toothFdi: 16, brand: "dentium", diameterMm: 4.5, lengthMm: 10.0, needsSinusLift: true },
			],
			toothDestructions: [
				{ toothFdi: 47, destructionLevel: "pulpitis", rootCanalCount: 3 },
				{ toothFdi: 38, destructionLevel: "subgingival_fracture_hopeless", isHopelessForExtraction: true },
			],
		};

		const tiers = generateCbctAutoPlanScenarios(input);

		for (const tier of tiers) {
			const stageSumKopecks = sumKopecks(tier.stages.map((s) => s.totalKopecks));
			assert.equal(tier.totalKopecks, stageSumKopecks);
			assert.ok(tier.stagedSchedule?.isBalanced);
			const inst12 = tier.installments[12]!;
			assert.ok(inst12.monthlyPaymentRub > 0);
			assert.ok(tier.ndflRefundRub > 0);
			assert.equal(tier.ndflDetails.isHighCostCode02, true);
		}
	});

	test("contains zero cartoon emojis in generated treatment plan item names or stages", () => {
		const input: CbctAutoPlanFindingsInput = {
			patientId: "pat-emoji-check",
			patientName: "Елена Воронова",
			implants: [{ toothFdi: 46, brand: "straumann", diameterMm: 4.1, lengthMm: 10.0 }],
			toothDestructions: [{ toothFdi: 47, destructionLevel: "caries" }],
		};

		const tiers = generateCbctAutoPlanScenarios(input);
		const emojiRegex = /[\u{1F300}-\u{1F9FF}]/u;

		for (const tier of tiers) {
			assert.doesNotMatch(tier.title, emojiRegex);
			for (const stage of tier.stages) {
				assert.doesNotMatch(stage.title, emojiRegex);
				for (const item of stage.items) {
					assert.doesNotMatch(item.name, emojiRegex);
				}
			}
		}
	});
});
