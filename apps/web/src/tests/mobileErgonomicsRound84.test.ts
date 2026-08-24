/**
 * Unit Test Suite for Round 84: Mobile Adaptability (375px–414px) & Touch-First Ergonomics
 * (DOMAIN: MOBILE TOUCH TARGETS & ADAPTIVE ODONTOGRAM ARCH)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { TOP_TEETH, BOTTOM_TEETH, ALL_ADULT_TEETH_NUMBERS } from "../components/odontogram/ToothChart";
import { CLINICAL_PRESETS } from "../components/visit/ClinicalQuickPresetsBar";

test("Round 84: Mobile Adaptability (375px-414px) & Touch-First Ergonomics Suite", async (t) => {
	await t.test("1. Dental arch scaling covers all 32 teeth without clipping edge molars (18, 28, 38, 48)", () => {
		assert.equal(ALL_ADULT_TEETH_NUMBERS.length, 32, "Must contain all 32 adult teeth");
		assert.ok(TOP_TEETH.includes(18), "Upper arch must include tooth 18");
		assert.ok(TOP_TEETH.includes(28), "Upper arch must include tooth 28");
		assert.ok(BOTTOM_TEETH.includes(48), "Lower arch must include tooth 48");
		assert.ok(BOTTOM_TEETH.includes(38), "Lower arch must include tooth 38");

		// Verify ToothChart source has MIN_ARCH_SCALE <= 0.35 for 375px iPhone SE screens
		const toothChartPath = path.resolve(process.cwd(), "src/components/odontogram/ToothChart.tsx");
		const toothChartSrc = fs.readFileSync(toothChartPath, "utf-8");
		assert.ok(toothChartSrc.includes("MIN_ARCH_SCALE = 0.35"), "MIN_ARCH_SCALE must be 0.35 for 375px mobile viewport fit");
	});

	await t.test("2. ScheduleGrid contains >= 48px touch targets for quick status toggles and actions", () => {
		const scheduleGridPath = path.resolve(process.cwd(), "src/components/schedule/ScheduleGrid.tsx");
		const scheduleGridSrc = fs.readFileSync(scheduleGridPath, "utf-8");

		// Quick status buttons have min-h-[48px] min-w-[48px]
		assert.ok(scheduleGridSrc.includes("min-h-[48px] min-w-[48px]"), "ScheduleGrid must have min-h-[48px] min-w-[48px] buttons");
		assert.ok(scheduleGridSrc.includes("min-h-[48px] rounded-xl border border-dashed"), "Empty slot button must have min-h-[48px]");
	});

	await t.test("3. ClinicalQuickPresetsBar defines 2-column responsive layout and >= 48-50px touch targets", () => {
		assert.ok(CLINICAL_PRESETS.length >= 10, "Must have comprehensive library of clinical presets");
		for (const preset of CLINICAL_PRESETS) {
			assert.ok(preset.id, "Preset must have id");
			assert.ok(preset.title, "Preset must have title");
			assert.ok(preset.shortBadge, "Preset must have shortBadge");
			assert.ok(preset.icd10, "Preset must have icd10");
			assert.ok(preset.treatmentDescription, "Preset must have treatmentDescription");
		}

		const barPath = path.resolve(process.cwd(), "src/components/visit/ClinicalQuickPresetsBar.tsx");
		const barSrc = fs.readFileSync(barPath, "utf-8");
		assert.ok(barSrc.includes("grid-cols-2"), "ClinicalQuickPresetsBar must use grid-cols-2 on smartphones");
		assert.ok(barSrc.includes("min-h-[50px]") || barSrc.includes("min-h-[48px]"), "Preset buttons must be >= 48-50px");
	});

	await t.test("4. CSS verification: touch-targets.css & mobile-touch.css enforce 0 horizontal overflow and touch-first targets", () => {
		const touchTargetsPath = path.resolve(process.cwd(), "src/styles/touch-targets.css");
		const touchTargetsCss = fs.readFileSync(touchTargetsPath, "utf-8");

		assert.ok(touchTargetsCss.includes("overflow-x: hidden"), "Must enforce overflow-x: hidden on root elements");
		assert.ok(touchTargetsCss.includes("min-height: 48px"), "Must enforce min-height: 48px on touch targets");
		assert.ok(touchTargetsCss.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"), "Must define 2-column grid for mobile templates");

		const mobileTouchPath = path.resolve(process.cwd(), "src/styles/modules/mobile-touch.css");
		const mobileTouchCss = fs.readFileSync(mobileTouchPath, "utf-8");
		assert.ok(mobileTouchCss.includes("overflow-x: hidden"), "mobile-touch.css must enforce overflow-x: hidden");
		assert.ok(mobileTouchCss.includes("touch-action: manipulation"), "mobile-touch.css must eliminate double-tap delays");
	});
});
