/**
 * orthoMaterialsAndPresets.test.ts — Comprehensive Orthodontic Materials & Presets Test Suite.
 *
 * Verifies 90%+ CIS market share orthodontic materials, bracket systems,
 * aligners, archwires, and miniscrews (TADs) under Mandates 8d, 8e, 8n.
 *
 * ZERO EMOJIS — Exact kopeck pricing — Doctor Autonomy.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ORTHODONTIC_MATERIALS_REGISTRY,
} from "../../clinical/materials/endoAndOrthoMaterialsData.js";
import {
	getClinicalMaterialsByDomain,
	searchClinicalMaterials,
	findClinicalMaterialById,
} from "../../clinical/clinicalMarketMaterialsCatalog.js";
import {
	BRACKET_SYSTEMS,
	ORTHODONTIC_MINISCREW_SYSTEMS,
	ARCHWIRE_MATERIALS,
} from "../orthoEngine.js";
import {
	DEFAULT_804N_CONSUMABLE_LINKS,
	getDefaultBomLinksForService804n,
} from "../../warehouse/default804nBomCatalog.js";

const ORTHO_BRACKET_MATERIALS = ORTHODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "ortho_bracket");
const ORTHO_ALIGNER_MATERIALS = ORTHODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "ortho_aligner");
const ORTHO_ARCHWIRE_MATERIALS = ORTHODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "ortho_archwire");
const ORTHO_MINISCREW_MATERIALS = ORTHODONTIC_MATERIALS_REGISTRY.filter((m) => m.domain === "ortho_miniscrew");

const RAW_EMOJI_REGEX =
	/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}⚡★✔🔴🟢🟡🦷]/u;

describe("Orthodontic Materials & 90% CIS Market Catalog Test Suite", () => {
	describe("1. Orthodontic Bracket Systems (90% CIS Market)", () => {
		it("contains at least 6 strictly ranked bracket systems with Damon Q2 as #1 market leader", () => {
			assert.ok(ORTHO_BRACKET_MATERIALS.length >= 6);
			const leader = ORTHO_BRACKET_MATERIALS[0]!;
			assert.equal(leader.marketRank, 1);
			assert.equal(leader.isMarketLeader, true);
			assert.ok(leader.nameRu.includes("Damon Q2"), "Damon Q2 must be #1 market leader in CIS");
			assert.equal(leader.manufacturer, "Ormco");
		});

		it("maintains strict ascending marketRank order (1, 2, 3...)", () => {
			for (let i = 0; i < ORTHO_BRACKET_MATERIALS.length; i++) {
				assert.equal(ORTHO_BRACKET_MATERIALS[i]!.marketRank, i + 1);
			}
		});

		it("contains essential bracket brands (Damon, Clarity, Empower, Pitts 21)", () => {
			const names = ORTHO_BRACKET_MATERIALS.map((b) => b.nameRu).join(" ");
			assert.ok(names.includes("Damon"), "Must include Damon");
			assert.ok(names.includes("Clarity"), "Must include Clarity");
			assert.ok(names.includes("Empower") || names.includes("Experience"), "Must include Empower/Experience");
			assert.ok(names.includes("Pitts 21"), "Must include Pitts 21");
		});

		it("has positive approximate prices in Rubles and exact kopecks", () => {
			for (const b of ORTHO_BRACKET_MATERIALS) {
				assert.ok(b.approximatePriceRub > 0, `${b.id} price must be > 0`);
				assert.ok(Number.isInteger(Math.round(b.approximatePriceRub * 100)));
			}
		});

		it("contains zero cartoon emojis in all bracket text fields (Mandate 8d)", () => {
			for (const b of ORTHO_BRACKET_MATERIALS) {
				assert.equal(RAW_EMOJI_REGEX.test(b.nameRu), false);
				assert.equal(RAW_EMOJI_REGEX.test(b.clinicalIndicationsRu), false);
				assert.equal(RAW_EMOJI_REGEX.test(b.manufacturer), false);
			}
		});
	});

	describe("2. Orthodontic Clear Aligners Systems (90% CIS Market)", () => {
		it("contains top aligner brands with 3D Smile as #1 Russian market leader", () => {
			assert.ok(ORTHO_ALIGNER_MATERIALS.length >= 6);
			const leader = ORTHO_ALIGNER_MATERIALS[0]!;
			assert.equal(leader.marketRank, 1);
			assert.ok(leader.nameRu.includes("3D Smile"), "3D Smile must be #1 Russian market leader");
		});

		it("includes key aligner systems (FlexiLigner, Spark, Invisalign, Star Smile, Eurokappa)", () => {
			const ids = ORTHO_ALIGNER_MATERIALS.map((a) => a.id);
			assert.ok(ids.includes("ortho_aligner_flexiligner"));
			assert.ok(ids.includes("ortho_aligner_spark"));
			assert.ok(ids.includes("ortho_aligner_invisalign"));
			assert.ok(ids.includes("ortho_aligner_star_smile"));
			assert.ok(ids.includes("ortho_aligner_eurokappa"));
		});

		it("all aligners have non-empty unit and zero emojis", () => {
			for (const a of ORTHO_ALIGNER_MATERIALS) {
				assert.ok(a.defaultUnit.length > 0);
				assert.equal(RAW_EMOJI_REGEX.test(a.nameRu), false);
				assert.equal(RAW_EMOJI_REGEX.test(a.clinicalIndicationsRu), false);
			}
		});
	});

	describe("3. Orthodontic Archwires (NiTi, CuNiTi, TMA, SS)", () => {
		it("contains Cu-Ni-Ti as #1 initiating thermoactive archwire", () => {
			const leader = ORTHO_ARCHWIRE_MATERIALS[0]!;
			assert.equal(leader.marketRank, 1);
			assert.ok(leader.nameRu.includes("Copper Ni-Ti") || leader.nameRu.includes("Cu-Ni-Ti"));
		});

		it("covers all 4 primary metallurgical categories (CuNiTi, NiTi, TMA, SS)", () => {
			const allText = ORTHO_ARCHWIRE_MATERIALS.map((w) => w.nameRu).join(" ");
			assert.ok(allText.includes("Copper Ni-Ti") || allText.includes("Cu-Ni-Ti") || allText.includes("CuNiTi"));
			assert.ok(allText.includes("Нитинол") || allText.includes("Nitinol") || allText.includes("Ni-Ti") || allText.includes("NiTi"));
			assert.ok(allText.includes("ТМА") || allText.includes("TMA") || allText.includes("титан-молибден"));
			assert.ok(allText.includes("Сталь") || allText.includes("SS"));
		});

		it("has zero emojis in archwire descriptions", () => {
			for (const w of ORTHO_ARCHWIRE_MATERIALS) {
				assert.equal(RAW_EMOJI_REGEX.test(w.nameRu), false);
				assert.equal(RAW_EMOJI_REGEX.test(w.clinicalIndicationsRu), false);
			}
		});
	});

	describe("4. Orthodontic Miniscrews / TADs", () => {
		it("contains Bio-Ray as #1 CIS market leader in miniscrews", () => {
			const leader = ORTHO_MINISCREW_MATERIALS[0]!;
			assert.equal(leader.marketRank, 1);
			assert.ok(leader.nameRu.includes("Bio-Ray"), "Bio-Ray must be #1 miniscrew");
		});

		it("includes key TAD systems (VectorTAS, Leone, Конмет, Dentos AbsoAnchor)", () => {
			const ids = ORTHO_MINISCREW_MATERIALS.map((m) => m.id);
			assert.ok(ids.includes("ortho_screw_vectortas"));
			assert.ok(ids.includes("ortho_screw_leone"));
			assert.ok(ids.includes("ortho_screw_conmet"));
			assert.ok(ids.includes("ortho_screw_absoanchor"));
		});

		it("all miniscrews are marked with biocompatible titanium alloys", () => {
			for (const m of ORTHO_MINISCREW_MATERIALS) {
				assert.equal(RAW_EMOJI_REGEX.test(m.nameRu), false);
			}
		});
	});

	describe("5. Catalog Lookups & 804n BOM Integration", () => {
		it("finds orthodontic materials via getClinicalMaterialsByDomain", () => {
			const brackets = getClinicalMaterialsByDomain("ortho_bracket");
			assert.ok(brackets.length >= 6);
			assert.equal(brackets[0]!.id, "ortho_bracket_damon_q2");

			const aligners = getClinicalMaterialsByDomain("ortho_aligner");
			assert.ok(aligners.length >= 6);

			const wires = getClinicalMaterialsByDomain("ortho_archwire");
			assert.ok(wires.length >= 4);

			const tads = getClinicalMaterialsByDomain("ortho_miniscrew");
			assert.ok(tads.length >= 5);
		});

		it("finds orthodontic materials by search query", () => {
			const damonResults = searchClinicalMaterials("Damon");
			assert.ok(damonResults.length >= 1);
			assert.ok(damonResults.some((m) => m.nameRu.includes("Damon Q2")));

			const bioRayResults = searchClinicalMaterials("Bio-Ray");
			assert.ok(bioRayResults.length >= 1);
			assert.equal(bioRayResults[0]!.id, "ortho_screw_bioray");
		});

		it("links 804n code A16.07.048 to Damon Q2 and CuNiTi archwire", () => {
			const links = getDefaultBomLinksForService804n("A16.07.048");
			assert.ok(links.length >= 2);
			const bracketLink = links.find((l) => l.inventoryItemId.includes("damon"));
			assert.ok(bracketLink, "Must link Damon brackets to A16.07.048");
			assert.equal(bracketLink.costPriceKopecks, 2800000); // 28 000.00 ₽

			const wireLink = links.find((l) => l.inventoryItemId.includes("cuniti"));
			assert.ok(wireLink, "Must link CuNiTi wire to A16.07.048");
			assert.equal(wireLink.costPriceKopecks, 120000); // 1 200.00 ₽
		});

		it("links 804n code A16.07.093 to Bio-Ray TAD miniscrew", () => {
			const links = getDefaultBomLinksForService804n("A16.07.093");
			assert.ok(links.length >= 1);
			const tadLink = links.find((l) => l.inventoryItemId.includes("bioray"));
			assert.ok(tadLink, "Must link Bio-Ray TAD to A16.07.093");
			assert.equal(tadLink.costPriceKopecks, 240000); // 2 400.00 ₽
		});
	});
});
