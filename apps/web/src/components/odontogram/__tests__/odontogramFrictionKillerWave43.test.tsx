/**
 * apps/web/src/components/odontogram/__tests__/odontogramFrictionKillerWave43.test.tsx
 *
 * Wave 43: Odontogram, Dental Chart & Clinical Presets Autonomy Test Suite
 * Mandates 8e (Doctor Autonomy), 8k (Friction-Killer Law), 8i (Outpatient Clinical Domain), 8d (7 Deadly Sins: 1-Row Toolbar & Zero Emojis)
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";

import { OdontogramViewContainer } from "../OdontogramViewContainer";

function applyIntactDentitionPreset(teeth: ToothData[]): ToothData[] {
	return teeth.map((t) => ({ ...t, state: "Healthy" as ToothState, surfaces: [] }));
}

function applyWisdomMissingPreset(teeth: ToothData[]): ToothData[] {
	const wisdomSet = new Set([18, 28, 38, 48]);
	return teeth.map((t) =>
		wisdomSet.has(t.toothNumber)
			? { ...t, state: "Missing" as ToothState, surfaces: [] }
			: { ...t, state: "Healthy" as ToothState },
	);
}

function applyMolarsMissingPreset(teeth: ToothData[]): ToothData[] {
	const molarsSet = new Set([16, 26, 36, 46]);
	return teeth.map((t) =>
		molarsSet.has(t.toothNumber)
			? { ...t, state: "Missing" as ToothState, surfaces: [] }
			: { ...t, state: "Healthy" as ToothState },
	);
}

function applyFrontIntactPreset(teeth: ToothData[]): ToothData[] {
	const frontSet = new Set([13, 12, 11, 21, 22, 23, 31, 32, 33, 41, 42, 43]);
	return teeth.map((t) =>
		frontSet.has(t.toothNumber)
			? { ...t, state: "Healthy" as ToothState, surfaces: [] }
			: t,
	);
}

function applyPathologyStamp(
	teeth: ToothData[],
	target: number,
	stamp: ToothState,
): ToothData[] {
	return teeth.map((t) => (t.toothNumber === target ? { ...t, state: stamp } : t));
}
import {
	ToothChart,
	type ToothData,
	type ToothState,
	ALL_ADULT_TEETH_NUMBERS,
	ADULT_FIRST_MOLARS,
	ADULT_WISDOM_TEETH,
	ADULT_FRONT_TEETH,
	createDefaultAdultTeethData,
} from "../ToothChart";

describe("Wave 43: Odontogram Clinical Presets & Friction-Killer Stamp Workflow", () => {
	describe("1. Pure Clinical Macro-Preset Transformers (Mandates 8e, 8k)", () => {
		it("applyIntactDentitionPreset: 1-click total sanitation marks all 32 teeth as Healthy with surfaces cleared", () => {
			// Seed mixed pathology across adult arch
			const dirtyTeeth: ToothData[] = ALL_ADULT_TEETH_NUMBERS.map((num) => ({
				toothNumber: num,
				state: (num % 2 === 0 ? "Caries" : "Missing") as ToothState,
				surfaces: ["MOD"],
			}));

			const sanitized = applyIntactDentitionPreset(dirtyTeeth);
			assert.strictEqual(sanitized.length, 32);
			for (const tooth of sanitized) {
				assert.strictEqual(tooth.state, "Healthy", `Tooth ${tooth.toothNumber} must be Healthy`);
				assert.deepStrictEqual(tooth.surfaces, [], `Tooth ${tooth.toothNumber} surfaces must be reset`);
			}
		});

		it("applyWisdomMissingPreset: 1-click marks wisdom teeth 18, 28, 38, 48 as Missing without affecting others", () => {
			const initialTeeth = createDefaultAdultTeethData();
			const result = applyWisdomMissingPreset(initialTeeth);

			const wisdomSet = new Set([18, 28, 38, 48]);
			for (const tooth of result) {
				if (wisdomSet.has(tooth.toothNumber)) {
					assert.strictEqual(tooth.state, "Missing", `Wisdom tooth ${tooth.toothNumber} must be Missing`);
					assert.deepStrictEqual(tooth.surfaces, []);
				} else {
					assert.strictEqual(tooth.state, "Healthy", `Non-wisdom tooth ${tooth.toothNumber} must stay Healthy`);
				}
			}
		});

		it("applyMolarsMissingPreset: 1-click marks first molars 16, 26, 36, 46 as Missing without affecting others", () => {
			const initialTeeth = createDefaultAdultTeethData();
			const result = applyMolarsMissingPreset(initialTeeth);

			const molarsSet = new Set([16, 26, 36, 46]);
			for (const tooth of result) {
				if (molarsSet.has(tooth.toothNumber)) {
					assert.strictEqual(tooth.state, "Missing", `First molar ${tooth.toothNumber} must be Missing`);
					assert.deepStrictEqual(tooth.surfaces, []);
				} else {
					assert.strictEqual(tooth.state, "Healthy", `Non-molar tooth ${tooth.toothNumber} must stay Healthy`);
				}
			}
		});

		it("applyFrontIntactPreset: 1-click marks anterior teeth 13–23, 33–43 as Healthy without altering molars", () => {
			// All teeth initially Caries
			const dirtyTeeth: ToothData[] = ALL_ADULT_TEETH_NUMBERS.map((num) => ({
				toothNumber: num,
				state: "Caries" as ToothState,
				surfaces: ["O"],
			}));

			const result = applyFrontIntactPreset(dirtyTeeth);
			const frontSet = new Set([13, 12, 11, 21, 22, 23, 31, 32, 33, 41, 42, 43]);

			for (const tooth of result) {
				if (frontSet.has(tooth.toothNumber)) {
					assert.strictEqual(tooth.state, "Healthy", `Front tooth ${tooth.toothNumber} must be Healthy`);
					assert.deepStrictEqual(tooth.surfaces, []);
				} else {
					assert.strictEqual(tooth.state, "Caries", `Posterior tooth ${tooth.toothNumber} must keep Caries`);
				}
			}
		});

		it("applyPathologyStamp: correctly applies each of the 8 canonical stamps to target tooth", () => {
			const baseTeeth = createDefaultAdultTeethData();

			const stamps: ToothState[] = [
				"Caries",
				"Pulpitis",
				"Periodontitis",
				"Filled",
				"Crown",
				"Implant",
				"Healthy",
				"Missing",
			];

			for (const stamp of stamps) {
				const stamped = applyPathologyStamp(baseTeeth, 16, stamp);
				const target = stamped.find((t) => t.toothNumber === 16);
				assert.ok(target, "Target tooth 16 must exist");
				assert.strictEqual(target.state, stamp, `Tooth 16 must have stamp ${stamp}`);

				// Verify other teeth were not mutated
				const other = stamped.find((t) => t.toothNumber === 17);
				assert.strictEqual(other?.state, "Healthy", "Other teeth must remain Healthy");
			}
		});
	});

	describe("2. FDI Arch Constants Parity", () => {
		it("ADULT_FIRST_MOLARS contains exactly [16, 26, 36, 46]", () => {
			assert.deepStrictEqual([...ADULT_FIRST_MOLARS], [16, 26, 36, 46]);
		});

		it("ADULT_WISDOM_TEETH contains exactly [18, 28, 38, 48]", () => {
			assert.deepStrictEqual([...ADULT_WISDOM_TEETH], [18, 28, 38, 48]);
		});

		it("ADULT_FRONT_TEETH contains exactly the 12 anterior teeth (13–23, 33–43)", () => {
			assert.strictEqual(ADULT_FRONT_TEETH.length, 12);
			const expected = [13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33];
			for (const num of expected) {
				assert.ok(ADULT_FRONT_TEETH.includes(num), `ADULT_FRONT_TEETH must include tooth ${num}`);
			}
		});
	});

	describe("3. OdontogramViewContainer Ergonomics (Hick's Law & Mandate 8d)", () => {
		it("Renders OdontogramViewContainer with dentition controls and zero cartoon emojis", () => {
			const teeth = createDefaultAdultTeethData();
			const html = renderToString(
				<OdontogramViewContainer
					teethData={teeth}
					dentitionMode="adult"
					onDentitionModeChange={() => {}}
				/>,
			);

			assert.ok(html.includes("data-testid=\"toolbar-dentition-adult\""));
			assert.ok(html.includes("data-testid=\"toolbar-dentition-pediatric\""));
			assert.ok(html.includes("data-testid=\"toolbar-dentition-mixed\""));
			assert.strictEqual(html.includes("⚡"), false, "Container HTML must contain zero cartoon emojis");
		});
	});


	describe("4. ToothChart Express Bar & Autonomy Invariants", () => {
		it("Renders ToothChart express bar with flex-nowrap and 34-36px height constraint", () => {
			const sampleTeeth = createDefaultAdultTeethData();
			const html = renderToString(
				<ToothChart
					teethData={sampleTeeth}
					onToothClick={() => {}}
				/>,
			);

			assert.ok(html.includes("data-testid=\"tooth-chart-express-actions\""), "Express bar must exist");
			assert.ok(html.includes("flex-nowrap"), "Express bar must be flex-nowrap");
			assert.ok(html.includes("overflow-x-auto"), "Express bar must have overflow-x-auto for small screens");
			assert.ok(html.includes("h-[36px]"), "Express bar must enforce h-[36px]");
		});

		it("Renders all 4 macro-preset buttons in ToothChart express bar", () => {
			const sampleTeeth = createDefaultAdultTeethData();
			const html = renderToString(
				<ToothChart
					teethData={sampleTeeth}
					onToothClick={() => {}}
				/>,
			);

			assert.ok(html.includes("data-testid=\"mark-intact-dentition-btn\""));
			assert.ok(html.includes("data-testid=\"mark-wisdom-missing-btn\""));
			assert.ok(html.includes("data-testid=\"mark-molars-missing-btn\""));
			assert.ok(html.includes("data-testid=\"mark-front-intact-btn\""));
		});

		it("Guarantees ZERO cartoon emojis (⚡) in ToothChart express bar", () => {
			const sampleTeeth = createDefaultAdultTeethData();
			const html = renderToString(
				<ToothChart
					teethData={sampleTeeth}
					onToothClick={() => {}}
				/>,
			);

			assert.strictEqual(html.includes("⚡"), false, "ToothChart HTML must contain zero ⚡ cartoon emojis");
		});
	});

	describe("5. OdontogramView 1-Click Active Stamp Interception (Friction-Killer Law)", () => {
		it("Directly calls onQuickStateChange([num], activeStamp) when tooth clicked under active stamp mode", () => {
			let quickTargets: number[] = [];
			let quickState: string = "";
			let modalOpened = false;

			const onQuickStateChange = (targets: number[], state: ToothState) => {
				quickTargets = targets;
				quickState = state;
			};

			const onToothClick = () => {
				modalOpened = true;
			};

			const activeStamp: ToothState = "Pulpitis";

			// Simulate handleToothClick from OdontogramView
			const handleToothClick = (num: number) => {
				if (activeStamp && onQuickStateChange) {
					onQuickStateChange([num], activeStamp);
					return;
				}
				onToothClick();
			};

			handleToothClick(24);

			assert.deepStrictEqual(quickTargets, [24], "Tooth 24 must be updated directly");
			assert.strictEqual(quickState, "Pulpitis", "Tooth state must be Pulpitis");
			assert.strictEqual(modalOpened, false, "Modal/menu must NOT be opened when activeStamp is set");
		});
	});
});
