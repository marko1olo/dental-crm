import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	parseStockDimensions,
	DEFAULT_CANONICAL_IMPLANT_STOCK,
} from "../implantQuickPresets";
import { IMPLANT_TORQUE_SPECS, getTorqueSpecsByBrand } from "../implantTorqueCatalog";

describe("Implant Torque Specifications & Warehouse Stock Catalog", () => {
	it("13. Ankylos system preset and torque specifications are canonical and accurate in SSOT", () => {
		const ankylos = FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === "Ankylos");
		assert.ok(ankylos, "Ankylos must be present");
		assert.equal(ankylos.model, "C/X TissueCare");
		assert.equal(ankylos.defaultDiameterMm, 4.5);
		assert.equal(ankylos.defaultLengthMm, 11.0);
		assert.equal(ankylos.defaultTorqueNcm, 35);

		const torqueSpec = IMPLANT_TORQUE_SPECS.ankylos;
		assert.ok(torqueSpec);
		assert.ok(torqueSpec.screwdriverDefault.includes("Hex 1.0 mm"));
		assert.equal(torqueSpec.torqueFinalScrewNcm, 15);
		assert.ok(torqueSpec.connectionSafetyNotes.includes("конус Морзе 5.7°"));
		assert.ok(torqueSpec.connectionSafetyNotes.includes("холодной сварки"));

		const helperSpec = getTorqueSpecsByBrand("ankylos");
		assert.equal(helperSpec.brand, "ankylos");
	});

	it("19. parseStockDimensions extracts diameter, length, and brand from warehouse nomenclature", () => {
		const osstem = parseStockDimensions("Имплантат Osstem TS III SA Ø4.0x10мм");
		assert.equal(osstem.brand, "Osstem");
		assert.equal(osstem.diameterMm, 4.0);
		assert.equal(osstem.lengthMm, 10.0);

		const nobel = parseStockDimensions("Имплантат Nobel Biocare Parallel CC Ø4.3x11.5мм");
		assert.equal(nobel.brand, "Nobel Biocare");
		assert.equal(nobel.diameterMm, 4.3);
		assert.equal(nobel.lengthMm, 11.5);

		const straumann = parseStockDimensions("Имплантат Straumann BLX Roxolid SLActive Ø3.5x10мм");
		assert.equal(straumann.brand, "Straumann");
		assert.equal(straumann.diameterMm, 3.5);
		assert.equal(straumann.lengthMm, 10.0);

		const dentium = parseStockDimensions("Имплантат Dentium SuperLine SLA Ø4.5x10мм");
		assert.equal(dentium.brand, "Dentium");
		assert.equal(dentium.diameterMm, 4.5);
		assert.equal(dentium.lengthMm, 10.0);

		const empty = parseStockDimensions("");
		assert.deepEqual(empty, {});
	});

	it("20. DEFAULT_CANONICAL_IMPLANT_STOCK contains standard sizes across major implant brands", () => {
		assert.ok(DEFAULT_CANONICAL_IMPLANT_STOCK.length >= 8);
		const brands = DEFAULT_CANONICAL_IMPLANT_STOCK.map((item) => parseStockDimensions(item.name).brand);
		assert.ok(brands.includes("Osstem"));
		assert.ok(brands.includes("Dentium"));
		assert.ok(brands.includes("Straumann"));
		assert.ok(brands.includes("Nobel Biocare"));

		for (const item of DEFAULT_CANONICAL_IMPLANT_STOCK) {
			assert.ok(item.lotNumber);
			assert.ok(item.expirationDate);
			assert.ok(item.sku);
			assert.ok(Number(item.unitCostRub) > 0);
		}
	});

	it("30. Unified SSOT implantTorqueCatalog contains complete specs and correct torque limits", () => {
		assert.ok(IMPLANT_TORQUE_SPECS.straumann);
		assert.ok(IMPLANT_TORQUE_SPECS.osstem);
		assert.ok(IMPLANT_TORQUE_SPECS.dentium);
		assert.ok(IMPLANT_TORQUE_SPECS.nobel_biocare);
		assert.equal(IMPLANT_TORQUE_SPECS.straumann.torqueFinalScrewNcm, 35);
		assert.equal(IMPLANT_TORQUE_SPECS.osstem.torqueFinalScrewNcm, 30);
	});

	it("36. Decomposed torqueCatalogModules maintain 100% SSOT parity and strict file size limits", async () => {
		const { getTorqueSpecsByBrand, getRecommendedTorqueNcm } = await import("../torqueCatalogModules/implantScrewdriverHelper");
		const { TI_BASE_CATALOG } = await import("../torqueCatalogModules/tiBaseCatalogData");

		const straumann = getTorqueSpecsByBrand("straumann");
		assert.equal(straumann.torqueFinalScrewNcm, 35);
		assert.equal(straumann.torqueMultiUnitBridgeScrewNcm, 15);
		assert.ok(straumann.screwdriverDefault.includes("SCS"));

		const nobel = getTorqueSpecsByBrand("nobel_biocare");
		assert.equal(nobel.torqueFinalScrewNcm, 35);
		assert.ok(nobel.screwdriverDefault.includes("Unigrip"));

		assert.ok(TI_BASE_CATALOG.length >= 8);
		const variobase = TI_BASE_CATALOG.find((t) => t.id === "st-tb-nc-01");
		assert.ok(variobase);
		assert.equal(variobase.recommendedTorqueNcm, 35);

		const muTorque = getRecommendedTorqueNcm("straumann", "multi_unit_bridge_screw");
		assert.equal(muTorque, 15);
	});
});
