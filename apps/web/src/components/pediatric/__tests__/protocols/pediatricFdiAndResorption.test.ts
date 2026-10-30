import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { isValidFdiTooth } from "../../VisitPediatricProtocolWidget";
import { PediatricTeethChart, PERMANENT_SIX_TEETH } from "../../PediatricTeethChart";
import { ALL_PRIMARY_TEETH, isPrimaryTooth, RESORPTION_STAGE_DEFINITIONS, type ResorptionStagePercent } from "../../../odontogram/pediatricDentitionEngine";

describe("Pediatric FDI Numbering & Quadrants (Teeth 51..85)", () => {
	it("validates all 20 primary teeth in canonical FDI quadrants 5, 6, 7, 8", () => {
		assert.strictEqual(ALL_PRIMARY_TEETH.length, 20, "Must contain exactly 20 primary teeth");
		const expectedPrimary = [
			51, 52, 53, 54, 55, 61, 62, 63, 64, 65,
			71, 72, 73, 74, 75, 81, 82, 83, 84, 85,
		] as const;
		for (const tooth of expectedPrimary) {
			assert.ok(ALL_PRIMARY_TEETH.includes(tooth), `ALL_PRIMARY_TEETH must include tooth ${tooth}`);
			assert.strictEqual(isPrimaryTooth(tooth), true, `Tooth ${tooth} must be primary`);
			assert.strictEqual(isValidFdiTooth(tooth), true, `Tooth ${tooth} must be valid FDI tooth`);
		}
	});

	it("rejects non-existent deciduous tooth numbers (e.g. 56..60, 66..70, 76..80, 86..90)", () => {
		const invalidDeciduous = [56, 57, 58, 59, 60, 66, 67, 70, 76, 79, 80, 86, 89, 90];
		for (const tooth of invalidDeciduous) {
			assert.strictEqual(isValidFdiTooth(tooth), false, `Invalid tooth ${tooth} rejected`);
			assert.strictEqual(isPrimaryTooth(tooth), false, `Invalid tooth ${tooth} not primary`);
		}
	});

	it("verifies mixed dentition permanent first molars (16, 26, 36, 46)", () => {
		for (const tooth of [16, 26, 36, 46]) {
			assert.strictEqual(isValidFdiTooth(tooth), true, `Permanent molar ${tooth} valid FDI`);
			assert.strictEqual(isPrimaryTooth(tooth), false, `Permanent molar ${tooth} NOT primary`);
			assert.ok(PERMANENT_SIX_TEETH[tooth], `PERMANENT_SIX_TEETH has definition for ${tooth}`);
		}
	});

	it("PediatricTeethChart renders 20 teeth in primary mode and 24 teeth in mixed mode", () => {
		const primaryHtml = renderToString(createElement(PediatricTeethChart, { mode: "primary", activeTooth: 54 }));
		for (const tooth of [51, 52, 53, 54, 55, 61, 62, 63, 64, 65, 71, 72, 73, 74, 75, 81, 82, 83, 84, 85]) {
			assert.ok(primaryHtml.includes(`data-testid="pediatric-tooth-btn-${tooth}"`), `Primary renders ${tooth}`);
		}
		assert.ok(!primaryHtml.includes('data-testid="pediatric-tooth-btn-16"'), "Primary mode must NOT render 16");

		const mixedHtml = renderToString(createElement(PediatricTeethChart, { mode: "mixed", activeTooth: 16 }));
		for (const six of [16, 26, 36, 46]) {
			assert.ok(mixedHtml.includes(`data-testid="pediatric-tooth-btn-${six}"`), `Mixed renders ${six}`);
		}
	});
});

describe("Milk Teeth Root Resorption Stages & Visualization", () => {
	it("registers all 5 canonical resorption stages with clinical descriptions", () => {
		const stages: ResorptionStagePercent[] = [0, 25, 50, 75, 100];
		for (const stage of stages) {
			const def = RESORPTION_STAGE_DEFINITIONS[stage];
			assert.ok(def, `Resorption stage ${stage}% must exist`);
			assert.strictEqual(def.stage, stage);
			assert.ok(def.descriptionRu.length > 10);
			assert.ok(def.badgeColor.length > 0);
			assert.ok(def.badgeBg.length > 0);
		}
	});

	it("renders resorption badges on deciduous teeth when resorption > 0", () => {
		const html = renderToString(createElement(PediatricTeethChart, {
			mode: "primary", activeTooth: 74,
			resorptionStages: { 74: 50, 85: 75, 51: 100 },
		}));
		assert.ok(html.includes('data-testid="tooth-resorption-badge-74"'));
		assert.ok(html.includes("R50%"));
		assert.ok(html.includes('data-testid="tooth-resorption-badge-85"'));
		assert.ok(html.includes("R75%"));
		assert.ok(html.includes('data-testid="tooth-resorption-badge-51"'));
		assert.ok(html.includes("R100%"));
		assert.ok(!html.includes('data-testid="tooth-resorption-badge-54"'));
	});

	it("renders 1-click resorption selector buttons in active tooth toolbar for primary teeth", () => {
		const html = renderToString(createElement(PediatricTeethChart, {
			mode: "primary", activeTooth: 54, resorptionStages: { 54: 25 }, onResorptionChange: () => {},
		}));
		assert.ok(html.includes('data-testid="pediatric-active-tooth-toolbar"'));
		assert.ok(html.includes('data-testid="active-tooth-resorption-group"'));
		for (const r of [0, 25, 50, 75, 100]) {
			assert.ok(html.includes(`data-testid="active-tooth-resorption-${r}"`));
		}
	});

	it("does NOT render resorption buttons in active tooth toolbar for permanent teeth", () => {
		const html = renderToString(createElement(PediatricTeethChart, {
			mode: "mixed", activeTooth: 16, onResorptionChange: () => {},
		}));
		assert.ok(!html.includes('data-testid="active-tooth-resorption-group"'));
	});
});
