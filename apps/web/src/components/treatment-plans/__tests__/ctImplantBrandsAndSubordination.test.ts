/**
 * ctImplantBrandsAndSubordination.test.ts — тестирование 5 мировых брендов имплантов и субординации цен.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it as test } from "node:test";
import {
	BRAND_DEFAULTS,
	buildImplantSurgicalPackageItems,
	type CbctImplantFinding,
} from "../ctImplantIntegrationBridge";
import { ALL_FIVE_BRANDS } from "./helpers/ctBridgeTestHelpers";

describe("ctImplantIntegrationBridge — 5 брендов имплантатов и субординация", () => {
	test("BRAND_DEFAULTS contains verified pricing and clinical labels for all 5 brands", () => {
		for (const brand of ALL_FIVE_BRANDS) {
			const info = BRAND_DEFAULTS[brand];
			assert.ok(info, `Brand ${brand} must exist in BRAND_DEFAULTS`);
			assert.ok(info.label.length > 5, `Brand ${brand} must have valid Russian label`);
			assert.ok(info.economy > 0, `Brand ${brand} economy price must be > 0`);
			assert.ok(info.standard >= info.economy, `Brand ${brand} standard price >= economy`);
			assert.ok(info.premium >= info.standard, `Brand ${brand} premium price >= standard`);
		}
	});

	test("buildImplantSurgicalPackageItems generates complete 4-item surgical package for each of the 5 brands", () => {
		for (const brand of ALL_FIVE_BRANDS) {
			const finding: CbctImplantFinding = {
				toothFdi: 36,
				brand,
				diameterMm: 4.1,
				lengthMm: 11.5,
				ridgeHeightMm: 13.0,
				ridgeWidthMm: 7.5,
				mischClass: "D2",
				meanHU: 800,
				nerveClearanceMm: 3.5,
				recommendedTorqueNcm: "35-45 Н·см",
			};

			const items = buildImplantSurgicalPackageItems(finding, "standard");
			assert.equal(items.length, 4, `Brand ${brand} must generate exactly 4 surgical items`);

			const codes = items.map((i) => i.code804n);
			assert.ok(codes.includes("A16.07.054.001"), "A16.07.054.001 Implantation");
			assert.ok(codes.includes("A16.07.054.002"), "A16.07.054.002 Abutment / Healing");
			assert.ok(codes.includes("A11.07.012"), "A11.07.012 Anesthesia");
			assert.ok(codes.includes("A16.07.097"), "A16.07.097 Suture");

			const implantItem = items.find((i) => i.code804n === "A16.07.054.001")!;
			assert.equal(implantItem.toothNumber, 36);
			assert.ok(implantItem.name.includes("Ø4.1"));
			assert.ok(implantItem.name.includes("11.5 мм"));
			assert.ok(implantItem.priceRub > 0);
		}
	});

	test("price subordination holds across tiers for all 5 brands (Economy < Standard < Premium)", () => {
		for (const brand of ALL_FIVE_BRANDS) {
			const finding: CbctImplantFinding = { toothFdi: 46, brand };
			const econ = buildImplantSurgicalPackageItems(finding, "economy");
			const std = buildImplantSurgicalPackageItems(finding, "standard");
			const opt = buildImplantSurgicalPackageItems(finding, "optimum");

			const econPrice = econ.reduce((sum, it) => sum + it.priceRub, 0);
			const stdPrice = std.reduce((sum, it) => sum + it.priceRub, 0);
			const optPrice = opt.reduce((sum, it) => sum + it.priceRub, 0);

			assert.ok(econPrice < stdPrice, `Brand ${brand}: economy (${econPrice}) must be < standard (${stdPrice})`);
			assert.ok(stdPrice < optPrice, `Brand ${brand}: standard (${stdPrice}) must be < optimum (${optPrice})`);
		}
	});
});
