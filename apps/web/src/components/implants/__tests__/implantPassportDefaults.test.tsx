import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	createDefaultPassportRecord,
	getBoneDensityByToothFdi,
	getAnatomicalImplantDefaults,
} from "../implantQuickPresets";

describe("Implant Passport Defaults & Anatomical Norms", () => {
	it("1. Preset catalog contains standard systems with 35 N/cm default torque", () => {
		const brands = FAST_IMPLANT_SYSTEM_PRESETS.map((p) => p.brand);
		assert.ok(brands.includes("Osstem"), "Must have Osstem");
		assert.ok(brands.includes("Straumann"), "Must have Straumann");
		assert.ok(brands.includes("Nobel Biocare"), "Must have Nobel Biocare");
		assert.ok(brands.includes("Dentium"), "Must have Dentium");

		for (const preset of FAST_IMPLANT_SYSTEM_PRESETS) {
			assert.equal(preset.defaultTorqueNcm, 35, `Preset ${preset.brand} must default to 35 N/cm`);
			assert.ok(preset.defaultDiameterMm >= 3.5, `Preset ${preset.brand} diameter valid`);
			assert.ok(preset.defaultLengthMm >= 8.0, `Preset ${preset.brand} length valid`);
		}
	});

	it("2. createDefaultPassportRecord builds valid passport data without blocking fields", () => {
		const record = createDefaultPassportRecord({
			toothFdi: 46,
			brand: "Osstem",
			patientName: "Сидоров А. В.",
			patientId: "PAT-001",
			doctorName: "Др. Громов",
		});
		assert.equal(record.toothFdi, 46);
		assert.equal(record.brand, "Osstem");
		assert.equal(record.torqueNcm, 35);
		assert.ok(record.lotNumber.includes("LOT-"));
		assert.ok(record.serialNumber.includes("SN-"));
		assert.equal(record.patientName, "Сидоров А. В.");
	});

	it("6. Fast implant presets include capType, ISQ 72, and top 4 implant brands", () => {
		const record = createDefaultPassportRecord({
			toothFdi: 36,
			brand: "Dentium",
			patientName: "Иванов И. И.",
		});
		assert.equal(record.isqDay0, 72, "Default ISQ must be 72");
		assert.equal(record.torqueNcm, 35, "Default torque must be 35 N/cm");
		assert.equal(record.capType, "fdm", "Default capType must be fdm");

		const systems = FAST_IMPLANT_SYSTEM_PRESETS.map((s) => s.brand);
		assert.deepEqual(systems.slice(0, 4), ["Osstem", "Dentium", "Straumann", "Nobel Biocare"]);
	});

	it("12. createDefaultPassportRecord supports doctorId and custom articles", () => {
		const record = createDefaultPassportRecord({
			toothFdi: 14,
			brand: "Dentium",
			doctorId: "DOC-IMPL-007",
			catalogArticle: "FX4010",
		});
		assert.equal(record.doctorId, "DOC-IMPL-007");
		assert.equal(record.catalogArticle, "FX4010");
		assert.equal(record.toothFdi, 14);
	});

	it("14. getAnatomicalImplantDefaults accurately chooses anatomical sizes", () => {
		const molar36 = getAnatomicalImplantDefaults(36);
		assert.equal(molar36.diameterMm, 4.5);
		assert.equal(molar36.lengthMm, 10.0);
		assert.equal(molar36.torqueNcm, 35);
		assert.equal(molar36.boneDensity, "D2");

		const molar46 = getAnatomicalImplantDefaults(46);
		assert.equal(molar46.diameterMm, 4.5);
		assert.equal(molar46.lengthMm, 10.0);

		const incisor11 = getAnatomicalImplantDefaults(11);
		assert.equal(incisor11.diameterMm, 3.5);
		assert.equal(incisor11.lengthMm, 12.0);
		assert.equal(incisor11.boneDensity, "D3");

		const incisor21 = getAnatomicalImplantDefaults(21);
		assert.equal(incisor21.diameterMm, 3.5);
		assert.equal(incisor21.lengthMm, 12.0);

		const premolar14 = getAnatomicalImplantDefaults(14);
		assert.equal(premolar14.diameterMm, 4.0);

		const lowerIncisor31 = getAnatomicalImplantDefaults(31);
		assert.equal(lowerIncisor31.boneDensity, "D1");
	});

	it("15. getBoneDensityByToothFdi determines anatomical Misch bone density (D1..D4)", () => {
		assert.equal(getBoneDensityByToothFdi(41), "D1");
		assert.equal(getBoneDensityByToothFdi(46), "D2");
		assert.equal(getBoneDensityByToothFdi(21), "D3");
		assert.equal(getBoneDensityByToothFdi(17), "D4");
		assert.equal(getBoneDensityByToothFdi(28), "D4");
	});

	it("28. 1-click express surgical protocol defaults to 4.5x10 mm size on molar, Misch D2, 35 N*cm", () => {
		const record = createDefaultPassportRecord({ toothFdi: 46, brand: "Osstem" });
		assert.equal(record.torqueNcm, 35);
		assert.equal(record.boneDensity, "D2");
		assert.equal(record.capType, "fdm");
		assert.equal(record.isqDay0, 72);
	});
});
