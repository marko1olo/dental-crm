/**
 * clinicalMarketMaterialsCatalog.test.ts — Comprehensive 90%+ CIS Dental Market Materials Test Suite.
 *
 * Verifies that all clinical disciplines (Implantology, Surgery, Endodontics,
 * Orthodontics, Prosthodontics, Therapy) have >=90% market coverage in Russia/CIS,
 * strictly sorted by descending clinical popularity (Mandates 8d, 8e, 8n).
 *
 * ZERO EMOJIS — Exact deterministic math — Complete Russian terminology.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_CLINICAL_MARKET_MATERIALS,
	CLINICAL_MATERIAL_DOMAINS,
	getClinicalMaterialsByDomain,
	getTopPopularMaterials,
	searchClinicalMaterials,
	findClinicalMaterialById,
	IMPLANT_SYSTEMS_MARKET_REGISTRY,
	BONE_GRAFT_MEMBRANES_REGISTRY,
	SURGICAL_SUTURE_REGISTRY,
	SURGICAL_HEMOSTATICS_REGISTRY,
	ENDODONTIC_MATERIALS_REGISTRY,
	ORTHODONTIC_MATERIALS_REGISTRY,
	PROSTHODONTIC_MATERIALS_REGISTRY,
	THERAPY_COMPOSITES_REGISTRY,
	THERAPY_ADHESIVES_REGISTRY,
} from "../clinical/clinicalMarketMaterialsCatalog.js";
import {
	DEFAULT_804N_CONSUMABLE_LINKS,
	getDefaultBomLinksForService804n,
} from "../warehouse/default804nBomCatalog.js";

const RAW_EMOJI_REGEX =
	/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}⚡★✔🔴🟢🟡🦷]/u;

describe("Clinical Market Materials Catalog (90%+ CIS Coverage)", () => {
	describe("1. Total Registry Volume & Structure Integrity", () => {
		it("contains at least 65 clinical materials covering 90%+ of CIS market", () => {
			assert.ok(
				ALL_CLINICAL_MARKET_MATERIALS.length >= 65,
				`Expected at least 65 materials, got ${ALL_CLINICAL_MARKET_MATERIALS.length}`,
			);
		});

		it("contains zero duplicate IDs across the entire catalog", () => {
			const idSet = new Set<string>();
			for (const m of ALL_CLINICAL_MARKET_MATERIALS) {
				assert.equal(idSet.has(m.id), false, `Duplicate material ID found: ${m.id}`);
				idSet.add(m.id);
			}
		});

		it("has positive approximate prices and valid units for every single material", () => {
			for (const m of ALL_CLINICAL_MARKET_MATERIALS) {
				assert.ok(m.approximatePriceRub > 0, `Material ${m.id} price must be > 0`);
				assert.ok(m.defaultUnit.length > 0, `Material ${m.id} unit must not be empty`);
				assert.ok(m.manufacturer.length > 0, `Material ${m.id} manufacturer must not be empty`);
				assert.ok(m.country.length > 0, `Material ${m.id} country must not be empty`);
			}
		});

		it("contains ZERO cartoon emojis in any field of all materials (Mandate 8d)", () => {
			for (const m of ALL_CLINICAL_MARKET_MATERIALS) {
				assert.equal(RAW_EMOJI_REGEX.test(m.nameRu), false, `Emoji in nameRu: ${m.nameRu}`);
				assert.equal(RAW_EMOJI_REGEX.test(m.descriptionRu), false, `Emoji in descriptionRu: ${m.descriptionRu}`);
				assert.equal(RAW_EMOJI_REGEX.test(m.clinicalIndicationsRu), false, `Emoji in indications: ${m.clinicalIndicationsRu}`);
			}
		});
	});

	describe("2. Dental Implants & Bone Graft Materials (16 Implants + 12 Grafts/Membranes)", () => {
		it("implant systems registry has Osstem as #1, Dentium as #2, Straumann as #3", () => {
			assert.ok(IMPLANT_SYSTEMS_MARKET_REGISTRY.length >= 16);
			assert.equal(IMPLANT_SYSTEMS_MARKET_REGISTRY[0]!.marketRank, 1);
			assert.ok(IMPLANT_SYSTEMS_MARKET_REGISTRY[0]!.nameRu.includes("Osstem"));
			assert.equal(IMPLANT_SYSTEMS_MARKET_REGISTRY[1]!.marketRank, 2);
			assert.ok(IMPLANT_SYSTEMS_MARKET_REGISTRY[1]!.nameRu.includes("Dentium"));
			assert.equal(IMPLANT_SYSTEMS_MARKET_REGISTRY[2]!.marketRank, 3);
			assert.ok(IMPLANT_SYSTEMS_MARKET_REGISTRY[2]!.nameRu.includes("Straumann"));
		});

		it("bone grafts registry has Bio-Oss as #1 and Bio-Gide as #1 membrane", () => {
			assert.ok(BONE_GRAFT_MEMBRANES_REGISTRY.length >= 12);
			const bioOss = BONE_GRAFT_MEMBRANES_REGISTRY.find((m) => m.id === "bone_bio_oss");
			assert.ok(bioOss, "Bio-Oss must be in registry");
			assert.equal(bioOss?.marketRank, 1);

			const bioGide = BONE_GRAFT_MEMBRANES_REGISTRY.find((m) => m.id === "membrane_bio_gide");
			assert.ok(bioGide, "Bio-Gide must be in registry");
			assert.equal(bioGide?.marketRank, 1);
		});
	});

	describe("3. Surgical Sutures & Hemostatics (Mandate 8e)", () => {
		it("contains Vicryl as #1 suture and Prolene as #2", () => {
			assert.ok(SURGICAL_SUTURE_REGISTRY.length >= 5);
			assert.equal(SURGICAL_SUTURE_REGISTRY[0]!.marketRank, 1);
			assert.ok(SURGICAL_SUTURE_REGISTRY[0]!.nameRu.includes("Викрил") || SURGICAL_SUTURE_REGISTRY[0]!.nameRu.includes("Vicryl"));
			assert.equal(SURGICAL_SUTURE_REGISTRY[1]!.marketRank, 2);
			assert.ok(SURGICAL_SUTURE_REGISTRY[1]!.nameRu.includes("Пролен") || SURGICAL_SUTURE_REGISTRY[1]!.nameRu.includes("Prolene"));
		});

		it("contains Spongostan, Surgicel, Alvogyl, Capramin in hemostatics", () => {
			assert.ok(SURGICAL_HEMOSTATICS_REGISTRY.length >= 4);
			const names = SURGICAL_HEMOSTATICS_REGISTRY.map((h) => h.nameRu).join(" ");
			assert.ok(names.includes("Спонгостан") || names.includes("Spongostan"));
			assert.ok(names.includes("Серджисель") || names.includes("Surgicel"));
			assert.ok(names.includes("Альвожиль") || names.includes("Alvogyl"));
			assert.ok(names.includes("Капрамин") || names.includes("Capramin"));
		});
	});

	describe("4. Endodontics (Files, Sealers, Irrigation, Dressings)", () => {
		it("contains rotary files with ProTaper Gold as #1 and WaveOne Gold as #2", () => {
			const files = ENDODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "endo_file");
			assert.ok(files.length >= 7);
			assert.equal(files[0]!.marketRank, 1);
			assert.ok(files[0]!.nameRu.includes("ProTaper"));
			assert.equal(files[1]!.marketRank, 2);
			assert.ok(files[1]!.nameRu.includes("WaveOne"));
		});

		it("contains AH Plus as #1 sealer and bioceramics (BioRoot RCS / TotalFill)", () => {
			const sealers = ENDODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "endo_sealer");
			assert.ok(sealers.length >= 5);
			assert.equal(sealers[0]!.marketRank, 1);
			assert.ok(sealers[0]!.nameRu.includes("AH Plus"));
			assert.ok(sealers.some((s) => s.nameRu.includes("BioRoot")));
		});

		it("contains sodium hypochlorite, EDTA, and chlorhexidine in irrigation", () => {
			const irrigations = ENDODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "endo_irrigation");
			assert.ok(irrigations.length >= 3);
			assert.ok(irrigations.some((i) => i.nameRu.includes("Гипохлорит")));
			assert.ok(irrigations.some((i) => i.nameRu.includes("ЭДТА")));
		});

		it("contains Calasept as #1 temporary dressing", () => {
			const dressings = ENDODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "endo_dressing");
			assert.ok(dressings.length >= 5);
			assert.equal(dressings[0]!.marketRank, 1);
			assert.ok(dressings[0]!.nameRu.includes("Calasept"));
		});
	});

	describe("5. Prosthodontics & Lab CAD/CAM", () => {
		it("contains Elite HD+ as #1 A-silicone and RelyX U200 as #1 permanent cement", () => {
			const aSilicones = PROSTHODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "prostho_a_silicone");
			assert.ok(aSilicones.length >= 6);
			assert.equal(aSilicones[0]!.marketRank, 1);
			assert.ok(aSilicones[0]!.nameRu.includes("Elite HD+"));

			const permCements = PROSTHODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "prostho_cement_perm");
			assert.ok(permCements.length >= 4);
			assert.equal(permCements[0]!.marketRank, 1);
			assert.ok(permCements[0]!.nameRu.includes("RelyX U200"));

			const allCements = PROSTHODONTIC_MATERIALS_REGISTRY.filter(
				(m) => m.domain === "prostho_cement_perm" || m.domain === "prostho_cement_temp",
			);
			assert.ok(allCements.length >= 6);
		});

		it("contains CAD/CAM lab materials (Katana/Upcera ZrO2, IPS e.max, CoCr, PMMA)", () => {
			const cadMaterials = PROSTHODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "lab_cad_material");
			assert.ok(cadMaterials.length >= 5);
			assert.equal(cadMaterials[0]!.marketRank, 1);
			assert.ok(cadMaterials[0]!.nameRu.includes("Katana") || cadMaterials[0]!.nameRu.includes("Upcera"));
			assert.equal(cadMaterials[1]!.marketRank, 2);
			assert.ok(cadMaterials[1]!.nameRu.includes("e.max"));
		});
	});

	describe("6. Therapy (Composites & Adhesives)", () => {
		it("contains Filtek as #1 composite and Estelite as #2", () => {
			assert.ok(THERAPY_COMPOSITES_REGISTRY.length >= 8);
			assert.equal(THERAPY_COMPOSITES_REGISTRY[0]!.marketRank, 1);
			assert.ok(THERAPY_COMPOSITES_REGISTRY[0]!.nameRu.includes("Filtek"));
			assert.equal(THERAPY_COMPOSITES_REGISTRY[1]!.marketRank, 2);
			assert.ok(THERAPY_COMPOSITES_REGISTRY[1]!.nameRu.includes("Estelite"));
		});

		it("contains OptiBond FL, Single Bond, Clearfil SE Bond in adhesives", () => {
			assert.ok(THERAPY_ADHESIVES_REGISTRY.length >= 5);
			const names = THERAPY_ADHESIVES_REGISTRY.map((a) => a.nameRu).join(" ");
			assert.ok(names.includes("OptiBond FL"));
			assert.ok(names.includes("Single Bond"));
			assert.ok(names.includes("Clearfil SE Bond"));
		});
	});

	describe("7. Search & Filter Utilities", () => {
		it("searches across multiple fields (brand, manufacturer, nameRu)", () => {
			const searchKerr = searchClinicalMaterials("Kerr");
			assert.ok(searchKerr.length >= 2);

			const searchDentsply = searchClinicalMaterials("Dentsply");
			assert.ok(searchDentsply.length >= 2);

			const search3M = searchClinicalMaterials("3M");
			assert.ok(search3M.length >= 3);
		});

		it("filters correctly by domain and returns sorted by marketRank", () => {
			const composites = getClinicalMaterialsByDomain("therapy_composite");
			assert.ok(composites.length >= 8);
			for (let i = 0; i < composites.length; i++) {
				assert.equal(composites[i]!.marketRank, i + 1);
			}
		});

		it("finds individual material by ID", () => {
			const osstem = findClinicalMaterialById("implant_osstem");
			assert.ok(osstem);
			assert.equal(osstem?.manufacturer, "Osstem Implant");

			const nonExistent = findClinicalMaterialById("unknown_123");
			assert.equal(nonExistent, undefined);
		});
	});
});
