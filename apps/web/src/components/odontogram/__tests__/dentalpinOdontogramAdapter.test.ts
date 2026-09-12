import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
	getToothTransform,
	getNapkinUnfoldingTransform,
	NAPKIN_SYMMETRY_CONFIG,
	isUpperTooth,
	isDeciduousTooth,
	getToothPosition,
	getShapePosition,
	getToothDisplayConfig,
	getLateralPath,
	getOcclusalPath,
	getIconAnchors,
	getCanalObturationClipConfig,
	PERIAPICAL_LESION_SIZES,
	LATERAL_ICONS,
	CIRCULAR_SURFACES,
} from "../ToothSVGPaths";
import {
	isToothAbutment,
	isToothPontic,
	detectBridgeSpans,
	type BridgeSpanInfo,
} from "../anatomicalToothGeometries";
import { DEFAULT_GLOBAL_PRESETS, type GlobalTreatmentItem } from "../GlobalTreatmentsStrip";
import type { ToothData } from "../ToothChart";

describe("DentalPin Odontogram Adapter — Napkin Unfolding Quadrant Symmetry", () => {
	test("Q1 (11-18) maintains original orientation without transform", () => {
		for (let pos = 1; pos <= 8; pos++) {
			const toothNum = 10 + pos;
			assert.equal(getToothTransform(toothNum), "", `Tooth ${toothNum} in Q1 must have empty transform`);
			assert.equal(getNapkinUnfoldingTransform(toothNum), "");
		}
	});

	test("Q2 (21-28) applies scaleX(-1) horizontal mirror across midline", () => {
		for (let pos = 1; pos <= 8; pos++) {
			const toothNum = 20 + pos;
			assert.equal(getToothTransform(toothNum), "scaleX(-1)", `Tooth ${toothNum} in Q2 must have scaleX(-1)`);
			assert.equal(getNapkinUnfoldingTransform(toothNum), "scaleX(-1)");
		}
	});

	test("Q4 (41-48) applies scaleY(-1) vertical mirror across occlusal plane", () => {
		for (let pos = 1; pos <= 8; pos++) {
			const toothNum = 40 + pos;
			assert.equal(getToothTransform(toothNum), "scaleY(-1)", `Tooth ${toothNum} in Q4 must have scaleY(-1)`);
			assert.equal(getNapkinUnfoldingTransform(toothNum), "scaleY(-1)");
		}
	});

	test("Q3 (31-38) applies scaleX(-1) scaleY(-1) diagonal mirror", () => {
		for (let pos = 1; pos <= 8; pos++) {
			const toothNum = 30 + pos;
			assert.equal(getToothTransform(toothNum), "scaleX(-1) scaleY(-1)", `Tooth ${toothNum} in Q3 must have diagonal mirror`);
			assert.equal(getNapkinUnfoldingTransform(toothNum), "scaleX(-1) scaleY(-1)");
		}
	});

	test("Deciduous quadrants (Q5-Q8) correctly mirror napkin unfolding", () => {
		assert.equal(getToothTransform(51), ""); // Q5: upper right
		assert.equal(getToothTransform(61), "scaleX(-1)"); // Q6: upper left
		assert.equal(getToothTransform(71), "scaleX(-1) scaleY(-1)"); // Q7: lower left
		assert.equal(getToothTransform(81), "scaleY(-1)"); // Q8: lower right
	});

	test("NAPKIN_SYMMETRY_CONFIG matches quadrant mappings", () => {
		assert.equal(NAPKIN_SYMMETRY_CONFIG.Q1.transform, "");
		assert.equal(NAPKIN_SYMMETRY_CONFIG.Q2.transform, "scaleX(-1)");
		assert.equal(NAPKIN_SYMMETRY_CONFIG.Q3.transform, "scaleX(-1) scaleY(-1)");
		assert.equal(NAPKIN_SYMMETRY_CONFIG.Q4.transform, "scaleY(-1)");
	});

	test("isUpperTooth and isDeciduousTooth correctly categorize teeth", () => {
		assert.equal(isUpperTooth(11), true);
		assert.equal(isUpperTooth(26), true);
		assert.equal(isUpperTooth(55), true);
		assert.equal(isUpperTooth(63), true);
		assert.equal(isUpperTooth(41), false);
		assert.equal(isUpperTooth(36), false);
		assert.equal(isUpperTooth(71), false);
		assert.equal(isUpperTooth(85), false);

		assert.equal(isDeciduousTooth(11), false);
		assert.equal(isDeciduousTooth(46), false);
		assert.equal(isDeciduousTooth(51), true);
		assert.equal(isDeciduousTooth(65), true);
		assert.equal(isDeciduousTooth(73), true);
		assert.equal(isDeciduousTooth(84), true);
	});

	test("Circular occlusal view defines 5 standard surfaces with mesial on left in Q1", () => {
		const occ = getOcclusalPath(11);
		assert.ok(occ.surfaces.O, "Must have O (occlusal) center circle");
		assert.ok(occ.surfaces.V, "Must have V (vestibular) top sector");
		assert.ok(occ.surfaces.L, "Must have L (lingual) bottom sector");
		assert.ok(occ.surfaces.M, "Must have M (mesial) left sector");
		assert.ok(occ.surfaces.D, "Must have D (distal) right sector");

		// When scaleX(-1) is applied in Q2, M (left) flips to right, pointing towards tooth 11 / midline
		assert.equal(CIRCULAR_SURFACES.M.includes("18,18"), true);
	});
});

describe("DentalPin Odontogram Adapter — Endodontic Canal Obturation Levels (Pulp Fill)", () => {
	test("Full obturation (100% apex) requires no clipping", () => {
		const clipFull = getCanalObturationClipConfig(11, "full");
		assert.equal(clipFull.needsClip, false);
		assert.equal(clipFull.clipId, "canal-obturation-clip-11");

		const clipDefault = getCanalObturationClipConfig(11, undefined);
		assert.equal(clipDefault.needsClip, false);
	});

	test("Two-thirds obturation clips upper 20% from root apex", () => {
		const clipTwoThirds = getCanalObturationClipConfig(11, "two_thirds", {
			x: 0,
			y: 0,
			width: 60,
			height: 100,
		});
		assert.equal(clipTwoThirds.needsClip, true);
		assert.equal(clipTwoThirds.y, 20); // 0 + 100 * 0.2
		assert.equal(clipTwoThirds.height, 80); // 100 * 0.8
	});

	test("Half obturation clips upper 35% from root apex", () => {
		const clipHalf = getCanalObturationClipConfig(11, "half", {
			x: 0,
			y: 0,
			width: 60,
			height: 100,
		});
		assert.equal(clipHalf.needsClip, true);
		assert.equal(clipHalf.y, 35); // 0 + 100 * 0.35
		assert.equal(clipHalf.height, 65); // 100 * 0.65
	});
});

describe("DentalPin Odontogram Adapter — Lateral Pathology Anchors", () => {
	test("All 8 permanent tooth positions provide complete icon anchors", () => {
		for (let pos = 1; pos <= 8; pos++) {
			const anchors = getIconAnchors(10 + pos);
			assert.ok(anchors, `Tooth position ${pos} must have anchors`);
			assert.ok(typeof anchors.crownCenter.x === "number");
			assert.ok(typeof anchors.crownCenter.y === "number");
			assert.ok(typeof anchors.apex.x === "number");
			assert.ok(typeof anchors.apex.y === "number");
			assert.ok(typeof anchors.beyondApex.y === "number");
			assert.ok(typeof anchors.rootCenter.y === "number");
			assert.ok(typeof anchors.aboveCrown.y === "number");
			assert.ok(typeof anchors.besideCrown.x === "number");
		}
	});

	test("Periapical lesion size constants define 6px, 10px, 16px radii", () => {
		assert.equal(PERIAPICAL_LESION_SIZES.small, 6);
		assert.equal(PERIAPICAL_LESION_SIZES.medium, 10);
		assert.equal(PERIAPICAL_LESION_SIZES.large, 16);
	});

	test("LATERAL_ICONS contains fracture, apicoectomy, post, and periapical configs", () => {
		assert.ok(LATERAL_ICONS.fracture, "Must have fracture config");
		assert.equal(LATERAL_ICONS.fracture.anchorPosition, "crownCenter");
		assert.ok(LATERAL_ICONS.fracture.path?.includes("L"));

		assert.ok(LATERAL_ICONS.apicoectomy, "Must have apicoectomy config");
		assert.equal(LATERAL_ICONS.apicoectomy.anchorPosition, "apex");

		assert.ok(LATERAL_ICONS.post, "Must have post config");
		assert.equal(LATERAL_ICONS.post.anchorPosition, "rootCenter");

		assert.equal(LATERAL_ICONS.periapical_small.radius, 6);
		assert.equal(LATERAL_ICONS.periapical_medium.radius, 10);
		assert.equal(LATERAL_ICONS.periapical_large.radius, 16);
	});
});

describe("DentalPin Odontogram Adapter — Fixed Bridge Pillars & Pontics", () => {
	test("isToothAbutment correctly identifies bridge pillar role", () => {
		const pillarTooth: ToothData = {
			toothNumber: 14,
			state: "Healthy",
			bridgeRole: "pillar",
		};
		assert.equal(isToothAbutment(pillarTooth), true);

		const crownTooth: ToothData = {
			toothNumber: 16,
			state: "Crown",
		};
		assert.equal(isToothAbutment(crownTooth), true);

		const regularTooth: ToothData = {
			toothNumber: 11,
			state: "Healthy",
		};
		assert.equal(isToothAbutment(regularTooth), false);
	});

	test("isToothPontic correctly identifies bridge pontic role", () => {
		const ponticTooth: ToothData = {
			toothNumber: 15,
			state: "Healthy",
			bridgeRole: "pontic",
		};
		assert.equal(isToothPontic(ponticTooth), true);

		const missingTooth: ToothData = {
			toothNumber: 25,
			state: "Missing",
		};
		assert.equal(isToothPontic(missingTooth), true);

		const regularTooth: ToothData = {
			toothNumber: 14,
			state: "Healthy",
			bridgeRole: "pillar",
		};
		assert.equal(isToothPontic(regularTooth), false);
	});

	test("detectBridgeSpans constructs span connecting pillars with pontics in between", () => {
		const archTeeth = [17, 16, 15, 14, 13, 12, 11];
		const teethData: ToothData[] = [
			{ toothNumber: 16, state: "Healthy", bridgeRole: "pillar", material: "ceramic_emax" },
			{ toothNumber: 15, state: "Missing", bridgeRole: "pontic" },
			{ toothNumber: 14, state: "Healthy", bridgeRole: "pillar", material: "ceramic_emax" },
		];

		const spans = detectBridgeSpans(archTeeth, teethData);
		assert.equal(spans.length, 1);
		const span = spans[0]!;
		assert.equal(span.startTooth, 16);
		assert.equal(span.endTooth, 14);
		assert.deepEqual([...span.abutments], [16, 14]);
		assert.deepEqual([...span.pontics], [15]);
		assert.equal(span.material, "ceramic_emax");
	});
});

describe("DentalPin Odontogram Adapter — Global Treatments Strip", () => {
	test("DEFAULT_GLOBAL_PRESETS contains standard full-mouth and full-arch items", () => {
		assert.ok(DEFAULT_GLOBAL_PRESETS.length >= 4);

		const airFlow = DEFAULT_GLOBAL_PRESETS.find((p) => p.clinicalType === "hygiene_airflow");
		assert.ok(airFlow);
		assert.equal(airFlow.scope, "global_mouth");

		const upperAligners = DEFAULT_GLOBAL_PRESETS.find((p) => p.clinicalType === "aligners_upper");
		assert.ok(upperAligners);
		assert.equal(upperAligners.scope, "global_arch");
		assert.equal(upperAligners.arch, "upper");

		const lowerAligners = DEFAULT_GLOBAL_PRESETS.find((p) => p.clinicalType === "aligners_lower");
		assert.ok(lowerAligners);
		assert.equal(lowerAligners.scope, "global_arch");
		assert.equal(lowerAligners.arch, "lower");
	});

	test("Filtering items restricts strictly to global_mouth and global_arch scopes", () => {
		const items: (GlobalTreatmentItem | { scope: string })[] = [
			{ id: "1", scope: "global_mouth", clinicalType: "hygiene", title: "Air-Flow", status: "planned" },
			{ id: "2", scope: "global_arch", arch: "upper", clinicalType: "splint", title: "Сплинт", status: "planned" },
			{ id: "3", scope: "single_tooth", clinicalType: "caries", title: "Кариес 16", status: "existing" },
		];

		const filtered = items.filter((t) => t.scope === "global_mouth" || t.scope === "global_arch");
		assert.equal(filtered.length, 2);
		assert.equal(filtered[0]!.scope, "global_mouth");
		assert.equal(filtered[1]!.scope, "global_arch");
	});
});
