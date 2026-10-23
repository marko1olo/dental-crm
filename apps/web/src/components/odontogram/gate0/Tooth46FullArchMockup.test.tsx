/**
 * DENTE Dental CRM — 32-Tooth Full Arch Mockup & Badge Size Laboratory Tests
 * Tests 32 teeth, badge sizes (S, M, L, XL, XXL), and FDI orientation (Mandate 8b <= 120 lines).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	ArchMacroComparison,
	ArchToothBadge,
	ArchToothCell,
	BADGE_SIZE_CONFIGS,
	createMockupTeeth,
	DEFAULT_32_ASSIGNMENTS,
	getEffectiveBadgeRadius,
	Tooth46FullArchMockup,
	UPPER_TEETH_FDI,
	LOWER_TEETH_FDI,
} from "./archMockup";

describe("Gate 0 — 32-Tooth Full Arch Mockup & Badge Size Matrix", () => {
	it("satisfies 32-tooth dental formula: 16 maxilla + 16 mandible", () => {
		assert.equal(UPPER_TEETH_FDI.length, 16);
		assert.equal(LOWER_TEETH_FDI.length, 16);
		const teeth = createMockupTeeth(DEFAULT_32_ASSIGNMENTS);
		assert.equal(teeth.length, 32);
		assert.equal(teeth.filter((t) => t.isUpper).length, 16);
		assert.equal(teeth.filter((t) => !t.isUpper).length, 16);
	});

	it("renders all 5 badge size configs: S, M, L, XL, XXL with exact radii & diameters", () => {
		assert.equal(BADGE_SIZE_CONFIGS.s.radius, 8.5);
		assert.equal(BADGE_SIZE_CONFIGS.s.pixelDiameter, 18);
		assert.equal(BADGE_SIZE_CONFIGS.m.radius, 11);
		assert.equal(BADGE_SIZE_CONFIGS.m.pixelDiameter, 22);
		assert.equal(BADGE_SIZE_CONFIGS.l.radius, 13.5);
		assert.equal(BADGE_SIZE_CONFIGS.l.pixelDiameter, 27);
		assert.equal(BADGE_SIZE_CONFIGS.xl.radius, 16);
		assert.equal(BADGE_SIZE_CONFIGS.xl.pixelDiameter, 32);
		assert.equal(BADGE_SIZE_CONFIGS.xxl.radius, 18.5);
		assert.equal(BADGE_SIZE_CONFIGS.xxl.pixelDiameter, 37);
	});

	it("calculates quadrant-based radii in compare mode: Q1=S, Q2=M, Q4=L, Q3=XL", () => {
		assert.equal(getEffectiveBadgeRadius("compare", 1), 8.5);
		assert.equal(getEffectiveBadgeRadius("compare", 2), 11);
		assert.equal(getEffectiveBadgeRadius("compare", 4), 13.5);
		assert.equal(getEffectiveBadgeRadius("compare", 3), 16);
	});

	it("renders ArchToothBadge with dynamic SVG scaling and clinical codes", () => {
		const htmlMo = renderToStaticMarkup(<ArchToothBadge presetId="caries_class2_mo" radius={13.5} />);
		assert.ok(htmlMo.includes("MO"));
		assert.ok(htmlMo.includes('width="27"'));
		assert.ok(htmlMo.includes('fill="#ef4444"'));

		const htmlMod = renderToStaticMarkup(<ArchToothBadge presetId="caries_class2_mod" radius={18.5} />);
		assert.ok(htmlMod.includes("MOD"));
		assert.ok(htmlMod.includes('width="37"'));
	});

	it("renders ArchToothCell with anatomical Wheeler vertical inversion on maxilla", () => {
		const upperTooth = { toothNumber: 16, presetId: "crown_pfm", isUpper: true, quadrant: 1 as const };
		const htmlUpper = renderToStaticMarkup(
			<ArchToothCell item={upperTooth} radius={11} isDark={false} placement="root_apex" />,
		);
		assert.ok(htmlUpper.includes("transform:scaleY(-1)"));
		assert.ok(htmlUpper.includes("МК"));

		const lowerTooth = { toothNumber: 46, presetId: "caries_class2_mod", isUpper: false, quadrant: 4 as const };
		const htmlLower = renderToStaticMarkup(
			<ArchToothCell item={lowerTooth} radius={16} isDark={false} placement="root_apex" />,
		);
		assert.ok(!htmlLower.includes("transform:scaleY(-1)"));
		assert.ok(htmlLower.includes("MOD"));
	});

	it("renders ArchMacroComparison with all 5 sizes side-by-side on tooth 46", () => {
		const html = renderToStaticMarkup(<ArchMacroComparison isDark={false} />);
		assert.ok(html.includes("S (18px)"));
		assert.ok(html.includes("M (22px)"));
		assert.ok(html.includes("L (27px)"));
		assert.ok(html.includes("XL (32px)"));
		assert.ok(html.includes("XXL (37px)"));
	});

	it("renders Tooth46FullArchMockup in Light & Dark modes with full 32-tooth grid", () => {
		const htmlLight = renderToStaticMarkup(<Tooth46FullArchMockup isDark={false} initialSize="l" />);
		assert.ok(htmlLight.includes('data-testid="tooth46-full-arch-mockup"'));
		assert.ok(htmlLight.includes("Верхняя челюсть"));
		assert.ok(htmlLight.includes("Нижняя челюсть"));
		assert.ok(htmlLight.includes("Окклюзионная плоскость"));

		const htmlDark = renderToStaticMarkup(<Tooth46FullArchMockup isDark={true} initialSize="xl" />);
		assert.ok(htmlDark.includes('data-testid="tooth46-full-arch-mockup"'));
	});
});
