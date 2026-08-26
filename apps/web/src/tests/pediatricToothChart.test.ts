import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	isPrimaryTooth,
	getPrimaryToothResorptionVisual,
	calculateCariogramRisk,
	calculateEruptionTimelineByAge,
	PRIMARY_TO_PERMANENT_SUCCESSOR_MAP,
	PERMANENT_TO_PRIMARY_PREDECESSOR_MAP,
	DEFAULT_CARIOGRAM_INPUT,
	type ResorptionStagePercent,
} from "../components/odontogram/pediatricDentitionEngine";
import {
	TOP_TEETH,
	BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	MIXED_BOTTOM_TEETH,
	getQuadrantTeeth,
	getQuadrantForTooth,
	getNextFocusedTooth,
	getToothStateFromHotkey,
} from "../components/odontogram/ToothChart";
import { calculateDmft } from "../components/odontogram/ClassicGostOdontogram";

describe("Pediatric Tooth Formula & Mixed Dentition Architecture", () => {
	describe("1. Tooth Lists and Classification", () => {
		it("correctly identifies all 20 primary teeth (51–85)", () => {
			const expectedPrimary = [
				55, 54, 53, 52, 51, 61, 62, 63, 64, 65,
				85, 84, 83, 82, 81, 71, 72, 73, 74, 75,
			];

			for (const num of expectedPrimary) {
				assert.equal(isPrimaryTooth(num), true, `Tooth ${num} should be primary`);
			}

			const adultSample = [11, 12, 16, 18, 21, 26, 31, 36, 41, 46, 48];
			for (const num of adultSample) {
				assert.equal(isPrimaryTooth(num), false, `Tooth ${num} should be adult`);
			}
		});

		it("validates adult arch contains exactly 32 teeth", () => {
			assert.equal(TOP_TEETH.length, 16);
			assert.equal(BOTTOM_TEETH.length, 16);
			assert.equal([...TOP_TEETH, ...BOTTOM_TEETH].length, 32);
			assert.equal(TOP_TEETH[0], 18);
			assert.equal(TOP_TEETH[15], 28);
		});

		it("validates pediatric arch contains exactly 20 primary teeth", () => {
			assert.equal(PEDIATRIC_TOP_TEETH.length, 10);
			assert.equal(PEDIATRIC_BOTTOM_TEETH.length, 10);
			assert.equal([...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH].length, 20);
			assert.equal(PEDIATRIC_TOP_TEETH[0], 55);
			assert.equal(PEDIATRIC_TOP_TEETH[9], 65);
			assert.equal(PEDIATRIC_BOTTOM_TEETH[0], 85);
			assert.equal(PEDIATRIC_BOTTOM_TEETH[9], 75);
		});

		it("validates mixed dentition arch contains exactly 24 teeth (20 primary + 4 permanent molars)", () => {
			assert.equal(MIXED_TOP_TEETH.length, 12);
			assert.equal(MIXED_BOTTOM_TEETH.length, 12);
			assert.equal([...MIXED_TOP_TEETH, ...MIXED_BOTTOM_TEETH].length, 24);

			// Checks top mixed arch ends with permanent first molars (16, 26)
			assert.equal(MIXED_TOP_TEETH[0], 16);
			assert.equal(MIXED_TOP_TEETH[11], 26);
			// Checks bottom mixed arch ends with permanent first molars (46, 36)
			assert.equal(MIXED_BOTTOM_TEETH[0], 46);
			assert.equal(MIXED_BOTTOM_TEETH[11], 36);
		});

		it("maps primary teeth to their exact permanent successors", () => {
			assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[51], 11);
			assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[55], 15);
			assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[61], 21);
			assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[75], 35);
			assert.equal(PRIMARY_TO_PERMANENT_SUCCESSOR_MAP[85], 45);

			assert.equal(PERMANENT_TO_PRIMARY_PREDECESSOR_MAP[11], 51);
			assert.equal(PERMANENT_TO_PRIMARY_PREDECESSOR_MAP[45], 85);
		});
	});

	describe("2. Physiological Root Resorption Stages Visuals", () => {
		it("provides intact metrics for stage 0%", () => {
			const v = getPrimaryToothResorptionVisual(51, 0);
			assert.equal(v.stage, 0);
			assert.equal(v.rootOpacity, 1.0);
			assert.equal(v.rootStrokeDasharray, undefined);
			assert.equal(v.badgeText, "0%");
			assert.equal(v.clipHeightPercent, 100);
			assert.equal(v.isExfoliated, false);
			assert.match(v.descriptionRu, /резорбция корня отсутствует/);
		});

		it("provides early apical resorption metrics for stage 25%", () => {
			const v = getPrimaryToothResorptionVisual(64, 25);
			assert.equal(v.stage, 25);
			assert.equal(v.rootOpacity, 0.85);
			assert.equal(v.badgeText, "25%");
			assert.equal(v.clipHeightPercent, 75);
			assert.equal(v.isExfoliated, false);
			assert.match(v.descriptionRu, /апикальной трети/);
		});

		it("provides middle third resorption metrics for stage 50%", () => {
			const v = getPrimaryToothResorptionVisual(75, 50);
			assert.equal(v.stage, 50);
			assert.equal(v.rootOpacity, 0.65);
			assert.equal(v.rootStrokeDasharray, "3 3");
			assert.equal(v.badgeText, "50%");
			assert.equal(v.clipHeightPercent, 50);
			assert.equal(v.isExfoliated, false);
			assert.match(v.descriptionRu, /1\/2 длины/);
		});

		it("provides subtotal cervical resorption metrics for stage 75%", () => {
			const v = getPrimaryToothResorptionVisual(83, 75);
			assert.equal(v.stage, 75);
			assert.equal(v.rootOpacity, 0.35);
			assert.equal(v.rootStrokeDasharray, "2 4");
			assert.equal(v.badgeText, "75%");
			assert.equal(v.clipHeightPercent, 25);
			assert.equal(v.isExfoliated, false);
			assert.match(v.descriptionRu, /пришеечная четверть/);
		});

		it("provides complete resorption metrics for stage 100%", () => {
			const v = getPrimaryToothResorptionVisual(52, 100);
			assert.equal(v.stage, 100);
			assert.equal(v.rootOpacity, 0.08);
			assert.equal(v.badgeText, "100%");
			assert.equal(v.clipHeightPercent, 0);
			assert.equal(v.isExfoliated, true);
			assert.match(v.descriptionRu, /полностью рассосался/);
		});

		it("handles adult teeth safely by returning intact metrics", () => {
			const v = getPrimaryToothResorptionVisual(11, 50); // Adult tooth passed
			assert.equal(v.stage, 0);
			assert.equal(v.rootOpacity, 1.0);
			assert.ok(v.descriptionRu.length > 0);
		});
	});

	describe("3. Quadrant Division and Navigation", () => {
		it("correctly splits pediatric quadrants (Q5, Q6, Q7, Q8)", () => {
			const q5 = getQuadrantTeeth("Q5", PEDIATRIC_TOP_TEETH, PEDIATRIC_BOTTOM_TEETH, true);
			assert.deepEqual(q5, [55, 54, 53, 52, 51]);

			const q6 = getQuadrantTeeth("Q6", PEDIATRIC_TOP_TEETH, PEDIATRIC_BOTTOM_TEETH, true);
			assert.deepEqual(q6, [61, 62, 63, 64, 65]);

			const q8 = getQuadrantTeeth("Q8", PEDIATRIC_TOP_TEETH, PEDIATRIC_BOTTOM_TEETH, true);
			assert.deepEqual(q8, [85, 84, 83, 82, 81]);

			const q7 = getQuadrantTeeth("Q7", PEDIATRIC_TOP_TEETH, PEDIATRIC_BOTTOM_TEETH, true);
			assert.deepEqual(q7, [71, 72, 73, 74, 75]);
		});

		it("maps tooth number to correct quadrant in pediatric mode", () => {
			assert.equal(getQuadrantForTooth(53, true), "Q5");
			assert.equal(getQuadrantForTooth(62, true), "Q6");
			assert.equal(getQuadrantForTooth(74, true), "Q7");
			assert.equal(getQuadrantForTooth(85, true), "Q8");
		});

		it("navigates with arrow keys in pediatric arch", () => {
			// Moving right in top row from 55 -> 54
			assert.equal(getNextFocusedTooth(55, "right", true), 54);
			assert.equal(getNextFocusedTooth(51, "right", true), 61);
			assert.equal(getNextFocusedTooth(65, "right", true), 65); // boundary

			// Moving down from top to bottom (55 -> 85)
			assert.equal(getNextFocusedTooth(55, "down", true), 85);
			assert.equal(getNextFocusedTooth(85, "up", true), 55);
		});
	});

	describe("4. Hotkey Status Assignment", () => {
		it("maps clinical hotkeys to tooth states", () => {
			assert.equal(getToothStateFromHotkey("к"), "Caries");
			assert.equal(getToothStateFromHotkey("K"), "Caries");
			assert.equal(getToothStateFromHotkey("п"), "Filled");
			assert.equal(getToothStateFromHotkey("P"), "Filled");
			assert.equal(getToothStateFromHotkey("ф"), "Pulpitis");
			assert.equal(getToothStateFromHotkey("е"), "Periodontitis");
			assert.equal(getToothStateFromHotkey("ц"), "Crown");
			assert.equal(getToothStateFromHotkey("и"), "Implant");
			assert.equal(getToothStateFromHotkey("0"), "Missing");
			assert.equal(getToothStateFromHotkey("з"), "Healthy");
			assert.equal(getToothStateFromHotkey("x"), null);
		});
	});

	describe("5. Pediatric Cariogram Risk Engine (Bratthall Model)", () => {
		it("calculates high chance of avoiding caries (low risk) for optimal parameters", () => {
			const result = calculateCariogramRisk({
				pastCariesExperience: 0,
				dietContents: 0,
				dietFrequency: 0,
				plaqueAmount: 0,
				streptococcusMutans: 0,
				fluorideProgram: 0,
				salivaSecretionRate: 0,
				salivaBufferCapacity: 0,
				clinicalJudgment: 0,
				systemicDiseases: 0,
			});

			assert.ok(result.chanceOfAvoidingCariesPercent >= 80, `Expected chance >= 80, got ${result.chanceOfAvoidingCariesPercent}`);
			assert.equal(result.riskCategory, "very_low");
			assert.match(result.riskCategoryNameRu, /Очень низкий/);
			assert.ok(result.sectors.actualChanceOfAvoidingCaries >= 80);
		});

		it("calculates very high caries risk for compromised oral conditions", () => {
			const result = calculateCariogramRisk({
				pastCariesExperience: 3,
				dietContents: 3,
				dietFrequency: 3,
				plaqueAmount: 3,
				streptococcusMutans: 3,
				fluorideProgram: 3,
				salivaSecretionRate: 3,
				salivaBufferCapacity: 2,
				clinicalJudgment: 3,
				systemicDiseases: 2,
			});

			assert.ok(result.chanceOfAvoidingCariesPercent <= 20, `Expected chance <= 20, got ${result.chanceOfAvoidingCariesPercent}`);
			assert.equal(result.riskCategory, "very_high");
			assert.match(result.riskCategoryNameRu, /Очень высокий/);
			assert.ok(result.preventiveProgram.professionalHygieneRu.length > 0);
		});
	});

	describe("6. Tooth Eruption Timeline Math by Age", () => {
		it("detects primary dentition intact at age 5.0", () => {
			const timeline = calculateEruptionTimelineByAge(5.0);
			assert.equal(timeline.ageYears, 5.0);
			assert.equal(timeline.stageCategory, "primary");
			assert.match(timeline.stageNameRu, /Временный прикус/);
			assert.equal(timeline.expectedUpperArchTeeth.length, 10);
			assert.equal(timeline.expectedLowerArchTeeth.length, 10);
		});

		it("detects active early mixed dentition transition at age 7.0", () => {
			const timeline = calculateEruptionTimelineByAge(7.0);
			assert.equal(timeline.stageCategory, "early_mixed");
			assert.match(timeline.stageNameRu, /Ранний сменный прикус/);
			assert.ok(timeline.expectedUpperArchTeeth.includes(16), "Should include permanent upper first molar 16");
			assert.ok(timeline.expectedUpperArchTeeth.includes(26), "Should include permanent upper first molar 26");
			assert.ok(timeline.expectedLowerArchTeeth.includes(46), "Should include permanent lower first molar 46");
			assert.ok(timeline.expectedLowerArchTeeth.includes(36), "Should include permanent lower first molar 36");
		});

		it("detects permanent dentition stage at age 14.0", () => {
			const timeline = calculateEruptionTimelineByAge(14.0);
			assert.equal(timeline.stageCategory, "permanent");
			assert.match(timeline.stageNameRu, /Постоянный прикус/);
		});
	});

	describe("7. Pediatric kpu / DMFT Statistics", () => {
		it("computes pediatric kpu index for primary teeth", () => {
			const sampleTeeth: any[] = [
				{ toothNumber: 51, state: "Caries" },
				{ toothNumber: 52, state: "Filled" },
				{ toothNumber: 53, state: "Healthy" },
				{ toothNumber: 54, state: "Missing" },
				{ toothNumber: 61, state: "Caries" },
			];

			const dmft = calculateDmft(sampleTeeth);
			assert.equal(dmft.pediatricKpu.k, 2); // 51, 61
			assert.equal(dmft.pediatricKpu.p, 1); // 52
			assert.equal(dmft.pediatricKpu.u, 1); // 54
			assert.equal(dmft.pediatricKpu.total, 4);
		});
	});
});
