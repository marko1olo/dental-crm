/**
 * packages/shared/src/clinical/__tests__/dentalFormulaSsot.test.ts
 *
 * Canonical Unit Test Suite for Dental Formula, Tooth Surfaces, States & 804n SSOT.
 * Zero Mocks.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_ADULT_TEETH,
	ALL_FDI_TEETH,
	ALL_MIXED_TEETH,
	ALL_PEDIATRIC_TEETH,
	BOTTOM_SURFACE_KEYS,
	BOTTOM_TEETH,
	CANONICAL_STAMP_MATRIX,
	CANONICAL_SURFACES,
	CANONICAL_SURFACE_DESCRIPTORS,
	CANONICAL_TOOTH_STATES,
	CLINICAL_CODES_804N,
	CLINICAL_DEFAULT_PRICES_RUB,
	DECIDUOUS_TEETH,
	MIXED_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	PERMANENT_TEETH,
	STANDARD_5_SURFACES,
	TOP_SURFACE_KEYS,
	TOP_TEETH,
	TOOTH_SURFACES,
	calculateDmft,
	createIntactAdultDentition,
	createIntactPediatricDentition,
	formatSurfacesRu,
	getArchSequenceForTooth,
	getArchSpecificAspect,
	getGostAbbreviation,
	getQuadrantForTooth,
	getToothAnatomicalNameRu,
	getToothArch,
	getToothDentitionType,
	getToothFolkAndAnatomicalNameRu,
	getToothStateLabelRu,
	isDeciduousTooth,
	isMandibularTooth,
	isMaxillaryTooth,
	isPatientLeftSide,
	isPermanentTooth,
	isSurfaceActive,
	isValidFdiToothNumber,
	normalizeAnatomicalSurfaces,
	normalizeCanonicalSurface,
	normalizeCanonicalSurfaces,
	normalizeFdiToothList,
	normalizeSurfaceKey,
	normalizeToothState,
	splitArchAtMidline,
} from "../dentalFormulaSsot.js";

describe("Dental Formula & Tooth Mesh Canonical SSOT", () => {
	describe("1. FDI Dental Formula & Arch Sequences (ISO 3950)", () => {
		it("defines exactly 32 permanent, 20 deciduous, and 52 total FDI teeth", () => {
			assert.equal(PERMANENT_TEETH.length, 32);
			assert.equal(DECIDUOUS_TEETH.length, 20);
			assert.equal(ALL_FDI_TEETH.length, 52);
			assert.equal(ALL_ADULT_TEETH.length, 32);
			assert.equal(ALL_PEDIATRIC_TEETH.length, 20);
			assert.equal(TOP_TEETH.length, 16);
			assert.equal(BOTTOM_TEETH.length, 16);
			assert.equal(PEDIATRIC_TOP_TEETH.length, 10);
			assert.equal(PEDIATRIC_BOTTOM_TEETH.length, 10);
			assert.equal(MIXED_TOP_TEETH.length, 12);
			assert.equal(MIXED_BOTTOM_TEETH.length, 12);
			assert.equal(ALL_MIXED_TEETH.length, 24);
		});

		it("correctly classifies permanent, deciduous, maxillary, mandibular, and left/right sides", () => {
			assert.equal(isValidFdiToothNumber(16), true);
			assert.equal(isValidFdiToothNumber(55), true);
			assert.equal(isValidFdiToothNumber(19), false);
			assert.equal(isValidFdiToothNumber(0), false);

			assert.equal(isPermanentTooth(16), true);
			assert.equal(isPermanentTooth(55), false);
			assert.equal(isDeciduousTooth(55), true);
			assert.equal(isDeciduousTooth(36), false);

			assert.equal(isMaxillaryTooth(11), true);
			assert.equal(isMaxillaryTooth(26), true);
			assert.equal(isMaxillaryTooth(54), true);
			assert.equal(isMaxillaryTooth(36), false);

			assert.equal(isMandibularTooth(36), true);
			assert.equal(isMandibularTooth(48), true);
			assert.equal(isMandibularTooth(75), true);
			assert.equal(isMandibularTooth(16), false);

			assert.equal(isPatientLeftSide(21), true);
			assert.equal(isPatientLeftSide(36), true);
			assert.equal(isPatientLeftSide(65), true);
			assert.equal(isPatientLeftSide(16), false);
			assert.equal(isPatientLeftSide(46), false);

			assert.equal(getQuadrantForTooth(16), 1);
			assert.equal(getQuadrantForTooth(36), 3);
			assert.equal(getQuadrantForTooth(85), 8);
			assert.equal(getToothDentitionType(24), "permanent");
			assert.equal(getToothDentitionType(64), "deciduous");
			assert.equal(getToothArch(14), "upper");
			assert.equal(getToothArch(44), "lower");
			assert.equal(getArchSequenceForTooth(16).length, 16);
			assert.equal(getArchSequenceForTooth(55).length, 10);
		});

		it("splits arch at midline accurately", () => {
			const adultTopSplit = splitArchAtMidline(TOP_TEETH);
			assert.deepEqual(adultTopSplit.left, [18, 17, 16, 15, 14, 13, 12, 11]);
			assert.deepEqual(adultTopSplit.right, [21, 22, 23, 24, 25, 26, 27, 28]);

			const pedTopSplit = splitArchAtMidline(PEDIATRIC_TOP_TEETH);
			assert.deepEqual(pedTopSplit.left, [55, 54, 53, 52, 51]);
			assert.deepEqual(pedTopSplit.right, [61, 62, 63, 64, 65]);
		});
	});

	describe("2. Bidirectional Surface Mapping (RU <-> FDI) & Compound Acronyms", () => {
		it("defines canonical 6 surfaces and 5 standard surfaces", () => {
			assert.deepEqual(CANONICAL_SURFACES, ["O", "V", "L", "M", "D", "C"]);
			assert.deepEqual(STANDARD_5_SURFACES, ["O", "V", "L", "M", "D"]);
			assert.deepEqual(TOOTH_SURFACES, ["M", "D", "O", "V", "L"]);
			assert.deepEqual(TOP_SURFACE_KEYS, ["O", "V", "P", "M", "D", "C"]);
			assert.deepEqual(BOTTOM_SURFACE_KEYS, ["O", "V", "L", "M", "D", "C"]);

			for (const surf of CANONICAL_SURFACES) {
				const desc = CANONICAL_SURFACE_DESCRIPTORS[surf];
				assert.ok(desc.nameRu.length > 5);
				assert.ok(desc.letterRu.length === 1);
				assert.equal(desc.letterEn, surf);
			}
		});

		it("normalizes Russian and International surface tokens bidirectionally", () => {
			// O (Окклюзионная / Режущий край)
			for (const tok of ["O", "О", "occ", "occlusal", "I", "incisal", "оккл", "реж", "режущий", "жевательная"]) {
				assert.equal(normalizeCanonicalSurface(tok), "O", `Failed for ${tok}`);
				assert.equal(normalizeSurfaceKey(tok), "O");
			}
			// V (Вестибулярная / Щечная / Губная)
			for (const tok of ["V", "В", "B", "Щ", "buccal", "vestibular", "labial", "вест", "щеч", "щечная", "губная"]) {
				assert.equal(normalizeCanonicalSurface(tok), "V", `Failed for ${tok}`);
			}
			// L (Язычная / Нёбная / Оральная)
			for (const tok of ["L", "Я", "P", "Н", "lingual", "palatal", "oral", "яз", "неб", "нёб", "язычная", "нёбная", "оральная"]) {
				assert.equal(normalizeCanonicalSurface(tok), "L", `Failed for ${tok}`);
			}
			// M (Медиальная / Мезиальная)
			for (const tok of ["M", "М", "mesial", "мед", "мез", "медиальная", "мезиальная"]) {
				assert.equal(normalizeCanonicalSurface(tok), "M", `Failed for ${tok}`);
			}
			// D (Дистальная)
			for (const tok of ["D", "Д", "distal", "дист", "дистальная"]) {
				assert.equal(normalizeCanonicalSurface(tok), "D", `Failed for ${tok}`);
			}
			// C (Пришеечная / Цервикальная)
			for (const tok of ["C", "П", "Ц", "cervical", "приш", "церв", "пришеечная", "цервикальная"]) {
				assert.equal(normalizeCanonicalSurface(tok), "C", `Failed for ${tok}`);
			}

			assert.equal(normalizeCanonicalSurface("UNKNOWN"), null);
			assert.equal(normalizeCanonicalSurface(""), null);
		});

		it("expands compound Black classification acronyms (MOD, MO, DO, Class V) in both RU and EN", () => {
			assert.deepEqual(normalizeCanonicalSurfaces("MOD"), ["M", "O", "D"]);
			assert.deepEqual(normalizeCanonicalSurfaces("МОД"), ["M", "O", "D"]);
			assert.deepEqual(normalizeCanonicalSurfaces("MO"), ["M", "O"]);
			assert.deepEqual(normalizeCanonicalSurfaces("МО"), ["M", "O"]);
			assert.deepEqual(normalizeCanonicalSurfaces("DO"), ["D", "O"]);
			assert.deepEqual(normalizeCanonicalSurfaces("ДО"), ["D", "O"]);
			assert.deepEqual(normalizeCanonicalSurfaces("Class V"), ["C"]);
			assert.deepEqual(normalizeCanonicalSurfaces("Класс V"), ["C"]);
			assert.deepEqual(normalizeAnatomicalSurfaces(["M", "O", "B", "P", "C"]), ["M", "O", "V", "L", "C"]);

			assert.equal(isSurfaceActive("M", ["MOD"]), true);
			assert.equal(isSurfaceActive("O", ["МОД"]), true);
			assert.equal(isSurfaceActive("V", ["MOD"]), false);
			assert.equal(isSurfaceActive("C", ["Class V"]), true);
		});

		it("resolves arch-specific palatal vs lingual aspect and Russian prose formatting", () => {
			const upperAspect = getArchSpecificAspect("L", 16);
			assert.equal(upperAspect.key, "P");
			assert.ok(upperAspect.labelRu.includes("Нёбная"));

			const lowerAspect = getArchSpecificAspect("L", 36);
			assert.equal(lowerAspect.key, "L");
			assert.ok(lowerAspect.labelRu.includes("Язычная"));

			assert.equal(
				formatSurfacesRu(["O", "M", "D"]),
				"окклюзионная (жевательная), мезиальная (медиальная), дистальная",
			);
			assert.equal(formatSurfacesRu([]), "коронковой части");
		});
	});

	describe("3. Canonical Tooth States, Stamp Matrix, DMFT (КПУ) & 804n Codes", () => {
		it("normalizes clinical tooth states and GOST abbreviations", () => {
			assert.equal(CANONICAL_TOOTH_STATES.length, 12);
			assert.equal(normalizeToothState("Кариес"), "Caries");
			assert.equal(normalizeToothState("К"), "Caries");
			assert.equal(normalizeToothState("Пломба"), "Filled");
			assert.equal(normalizeToothState("П"), "Filled");
			assert.equal(normalizeToothState("Пульпит"), "Pulpitis");
			assert.equal(normalizeToothState("Пт"), "Pulpitis");
			assert.equal(normalizeToothState("Периодонтит"), "Periodontitis");
			assert.equal(normalizeToothState("Pt"), "Periodontitis");
			assert.equal(normalizeToothState("Коронка"), "Crown");
			assert.equal(normalizeToothState("коронка в зтл"), "Planned_Crown");
			assert.equal(normalizeToothState("Имплантат"), "Implant");
			assert.equal(normalizeToothState("Отсутствует"), "Missing");
			assert.equal(normalizeToothState("0"), "Missing");

			assert.equal(getGostAbbreviation("Caries"), "К");
			assert.equal(getGostAbbreviation("Filled"), "П");
			assert.equal(getGostAbbreviation("Missing"), "0");
			assert.equal(getGostAbbreviation("Healthy"), "Зд");
			assert.equal(getToothStateLabelRu("Caries"), "кариес");

			for (const state of CANONICAL_TOOTH_STATES) {
				const stamp = CANONICAL_STAMP_MATRIX[state];
				assert.ok(stamp.badgeColor.startsWith("#"));
				assert.ok(stamp.icd10Default.length >= 3);
				assert.ok(stamp.code804nDefault.length >= 5);
			}
		});

		it("calculates WHO / Minzdrav DMFT (КПУ) and 1-click intact dentition", () => {
			const dmft = calculateDmft([
				{ toothNumber: 16, state: "Caries" },
				{ toothNumber: 26, state: "Pulpitis" },
				{ toothNumber: 36, state: "Filled" },
				{ toothNumber: 46, state: "Missing" },
				{ toothNumber: 55, state: "Caries" }, // deciduous ignored in adult DMFT
			]);
			assert.equal(dmft.c, 2);
			assert.equal(dmft.p, 1);
			assert.equal(dmft.u, 1);
			assert.equal(dmft.total, 4);
			assert.equal(dmft.dmftString, "КПУ = К(2) + П(1) + У(1) = 4");

			const adultNorm = createIntactAdultDentition();
			assert.equal(adultNorm.length, 32);
			assert.ok(adultNorm.every((t) => t.state === "Healthy"));

			const pedNorm = createIntactPediatricDentition();
			assert.equal(pedNorm.length, 20);
			assert.ok(pedNorm.every((t) => t.state === "Healthy"));
		});

		it("provides Order 804n codes, default prices, and Russian tooth nomenclature", () => {
			assert.equal(CLINICAL_CODES_804N.ANESTHESIA_INFILTRATION, "B01.003.004.005");
			assert.equal(CLINICAL_CODES_804N.ISOLATION_COFFERDAM, "A16.07.093");
			assert.equal(CLINICAL_DEFAULT_PRICES_RUB.ANESTHESIA, 800);

			assert.equal(getToothAnatomicalNameRu(16), "16 (верхний правый первый моляр)");
			assert.ok(getToothFolkAndAnatomicalNameRu(16).includes("шестерка"));
			assert.equal(normalizeFdiToothList("36, 16, 26, 16, 46, 11"), "16, 11, 26, 36, 46");
		});
	});
});
