/**
 * packages/shared/src/clinical/__tests__/wave131OdontogramTreatment.test.ts
 *
 * Unit tests for Odontogram Multi-Tooth Treatment & Surface Condition Engine (Wave 131).
 * Reverse-engineered & adapted from DentalPin odontogram module (constants.py, models.py, schemas.py, service.py).
 *
 * Requirements:
 * 1. 1-click physiological norm preset for adult (11..48) and child (51..85) dentition (Mandate 8e).
 * 2. Surface-specific condition assignments (MOD caries, vestibular filling, whole-tooth conditions).
 * 3. Multi-tooth bridge construction (pillars 14, 16 + pontic 15) with arch continuity validation.
 * 4. Caries-Missing-Filled (КПУ / DMFT) index and clinical statistics calculation.
 * 5. Printable Form 043/u A4 protocol with strictly 0 cartoon emojis (Mandate 8d item 7).
 * 6. Zod schemas validation and functional parity across @dental/shared entry points.
 * 7. 100% Zero Mocks.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_FDI_TEETH,
	BRIDGE_ROLE_LABELS_RU,
	BRIDGE_TOOTH_ROLES,
	CONDITION_LABELS_RU,
	DECIDUOUS_TEETH,
	DECIDUOUS_TEETH_QUADRANT_5,
	DECIDUOUS_TEETH_QUADRANT_6,
	DECIDUOUS_TEETH_QUADRANT_7,
	DECIDUOUS_TEETH_QUADRANT_8,
	DENTITION_TYPES,
	LOWER_ARCH_SEQUENCE,
	PERMANENT_TEETH,
	PERMANENT_TEETH_QUADRANT_1,
	PERMANENT_TEETH_QUADRANT_2,
	PERMANENT_TEETH_QUADRANT_3,
	PERMANENT_TEETH_QUADRANT_4,
	SURFACE_NAMES_RU,
	TOOTH_CONDITIONS,
	TOOTH_SURFACES,
	TREATMENT_STATUSES,
	UPPER_ARCH_SEQUENCE,
	applyToothCondition,
	bridgeToothConfigSchema,
	bridgeToothRoleSchema,
	calculateOdontogramStats,
	createBridgeTreatment,
	createIntactOdontogram,
	dentitionTypeSchema,
	formatOdontogramForm043A4Protocol,
	getArchSequenceForTooth,
	getToothArch,
	getToothDentitionType,
	getToothStatusForm043Code,
	isDeciduousTooth,
	isPermanentTooth,
	isValidFdiTooth,
	multiToothTreatmentSchema,
	odontogramStateSchema,
	odontogramStatsSchema,
	surfaceSchema,
	toothConditionSchema,
	toothStateSchema,
	treatmentStatusSchema,
	type BridgeToothConfig,
	type BridgeToothRole,
	type DentitionType,
	type MultiToothTreatment,
	type OdontogramState,
	type OdontogramStats,
	type Surface,
	type ToothCondition,
	type ToothState,
	type TreatmentStatus,
} from "../odontogramTreatmentEngine.js";

import {
	createIntactOdontogram as createIntactFromClinicalIndex,
	applyToothCondition as applyToothConditionFromClinicalIndex,
	createBridgeTreatment as createBridgeTreatmentFromClinicalIndex,
	calculateOdontogramStats as calculateOdontogramStatsFromClinicalIndex,
	formatOdontogramForm043A4Protocol as formatOdontogramForm043A4ProtocolFromClinicalIndex,
} from "../index.js";

import {
	createIntactOdontogram as createIntactFromSharedRoot,
	applyToothCondition as applyToothConditionFromSharedRoot,
	createBridgeTreatment as createBridgeTreatmentFromSharedRoot,
	calculateOdontogramStats as calculateOdontogramStatsFromSharedRoot,
	formatOdontogramForm043A4Protocol as formatOdontogramForm043A4ProtocolFromSharedRoot,
} from "../../index.js";

describe("Wave 131: Odontogram Multi-Tooth Treatment Engine (DentalPin Reverse-Engineering)", () => {
	describe("1. FDI Classification & Anatomical Constants", () => {
		it("validates 32 permanent teeth across 4 quadrants", () => {
			assert.equal(PERMANENT_TEETH.length, 32);
			assert.equal(PERMANENT_TEETH_QUADRANT_1.length, 8);
			assert.equal(PERMANENT_TEETH_QUADRANT_2.length, 8);
			assert.equal(PERMANENT_TEETH_QUADRANT_3.length, 8);
			assert.equal(PERMANENT_TEETH_QUADRANT_4.length, 8);

			assert.ok(isPermanentTooth(11));
			assert.ok(isPermanentTooth(18));
			assert.ok(isPermanentTooth(28));
			assert.ok(isPermanentTooth(38));
			assert.ok(isPermanentTooth(48));
			assert.equal(isPermanentTooth(51), false);
			assert.equal(isPermanentTooth(99), false);
		});

		it("validates 20 deciduous teeth across quadrants 5..8", () => {
			assert.equal(DECIDUOUS_TEETH.length, 20);
			assert.equal(DECIDUOUS_TEETH_QUADRANT_5.length, 5);
			assert.equal(DECIDUOUS_TEETH_QUADRANT_6.length, 5);
			assert.equal(DECIDUOUS_TEETH_QUADRANT_7.length, 5);
			assert.equal(DECIDUOUS_TEETH_QUADRANT_8.length, 5);

			assert.ok(isDeciduousTooth(55));
			assert.ok(isDeciduousTooth(61));
			assert.ok(isDeciduousTooth(75));
			assert.ok(isDeciduousTooth(85));
			assert.equal(isDeciduousTooth(11), false);
		});

		it("validates all 52 FDI teeth and dentition types", () => {
			assert.equal(ALL_FDI_TEETH.length, 52);
			assert.ok(isValidFdiTooth(16));
			assert.ok(isValidFdiTooth(65));
			assert.equal(isValidFdiTooth(49), false);
			assert.equal(isValidFdiTooth(0), false);

			assert.equal(getToothDentitionType(21), "permanent");
			assert.equal(getToothDentitionType(71), "deciduous");
			assert.throws(() => getToothDentitionType(99), /Invalid FDI tooth number/);
		});

		it("maps teeth to correct dental arches (upper/lower)", () => {
			assert.equal(getToothArch(16), "upper");
			assert.equal(getToothArch(21), "upper");
			assert.equal(getToothArch(55), "upper");
			assert.equal(getToothArch(61), "upper");

			assert.equal(getToothArch(46), "lower");
			assert.equal(getToothArch(31), "lower");
			assert.equal(getToothArch(85), "lower");
			assert.equal(getToothArch(71), "lower");

			assert.throws(() => getToothArch(99), /Invalid FDI tooth number/);
		});

		it("defines 5 canonical tooth surfaces with Russian labels", () => {
			assert.deepEqual(TOOTH_SURFACES, ["M", "D", "O", "V", "L"]);
			assert.equal(SURFACE_NAMES_RU.M, "Медиальная (M)");
			assert.equal(SURFACE_NAMES_RU.D, "Дистальная (D)");
			assert.equal(SURFACE_NAMES_RU.O, "Окклюзионная/Режущая (O)");
			assert.equal(SURFACE_NAMES_RU.V, "Вестибулярная (V)");
			assert.equal(SURFACE_NAMES_RU.L, "Язычная/Нёбная (L)");
		});
	});

	describe("2. 1-Click Physiological Norm Preset (Mandate 8e)", () => {
		it("creates intact adult dentition with 32 healthy teeth", () => {
			const odontogram = createIntactOdontogram("adult");

			assert.equal(odontogram.dentitionType, "adult");
			assert.equal(Object.keys(odontogram.teeth).length, 32);
			assert.equal(odontogram.treatments.length, 0);

			for (const toothNumber of PERMANENT_TEETH) {
				const tooth = odontogram.teeth[toothNumber];
				assert.ok(tooth, `Tooth ${toothNumber} must exist`);
				assert.equal(tooth.toothNumber, toothNumber);
				assert.equal(tooth.toothType, "permanent");
				assert.equal(tooth.generalCondition, "healthy");
				assert.deepEqual(tooth.surfaces, {
					M: "healthy",
					D: "healthy",
					O: "healthy",
					V: "healthy",
					L: "healthy",
				});
				assert.equal(tooth.bridgeRole, undefined);
			}

			const stats = calculateOdontogramStats(odontogram);
			assert.equal(stats.kpuIndex, 0);
			assert.equal(stats.decayed, 0);
			assert.equal(stats.filled, 0);
			assert.equal(stats.missing, 0);
			assert.equal(stats.intactCount, 32);
			assert.equal(stats.crownsCount, 0);
			assert.equal(stats.implantsCount, 0);
			assert.equal(stats.rootCanalsCount, 0);
			assert.equal(stats.totalTeethTracked, 32);
		});

		it("creates intact child dentition with 20 healthy teeth", () => {
			const odontogram = createIntactOdontogram("child");

			assert.equal(odontogram.dentitionType, "child");
			assert.equal(Object.keys(odontogram.teeth).length, 20);
			assert.equal(odontogram.treatments.length, 0);

			for (const toothNumber of DECIDUOUS_TEETH) {
				const tooth = odontogram.teeth[toothNumber];
				assert.ok(tooth, `Tooth ${toothNumber} must exist`);
				assert.equal(tooth.toothNumber, toothNumber);
				assert.equal(tooth.toothType, "deciduous");
				assert.equal(tooth.generalCondition, "healthy");
				assert.equal(tooth.surfaces.O, "healthy");
			}

			const stats = calculateOdontogramStats(odontogram);
			assert.equal(stats.kpuIndex, 0);
			assert.equal(stats.intactCount, 20);
			assert.equal(stats.totalTeethTracked, 20);
		});

		it("creates intact mixed dentition with all 52 FDI teeth", () => {
			const odontogram = createIntactOdontogram("mixed");

			assert.equal(odontogram.dentitionType, "mixed");
			assert.equal(Object.keys(odontogram.teeth).length, 52);
			assert.equal(odontogram.teeth[16]!.toothType, "permanent");
			assert.equal(odontogram.teeth[55]!.toothType, "deciduous");

			const stats = calculateOdontogramStats(odontogram);
			assert.equal(stats.kpuIndex, 0);
			assert.equal(stats.intactCount, 52);
			assert.equal(stats.totalTeethTracked, 52);
		});
	});

	describe("3. Surface-Specific Condition Assignment", () => {
		it("assigns MOD caries on tooth 16 without affecting unselected surfaces", () => {
			const base = createIntactOdontogram("adult");
			const updated = applyToothCondition(base, 16, "caries", ["M", "O", "D"]);

			assert.notEqual(base, updated, "Must return a new immutable state");
			const tooth16 = updated.teeth[16]!;
			assert.equal(tooth16.generalCondition, "caries");
			assert.equal(tooth16.surfaces.M, "caries");
			assert.equal(tooth16.surfaces.O, "caries");
			assert.equal(tooth16.surfaces.D, "caries");
			assert.equal(tooth16.surfaces.V, "healthy");
			assert.equal(tooth16.surfaces.L, "healthy");

			// Original state remains intact
			assert.equal(base.teeth[16]!.generalCondition, "healthy");
			assert.equal(base.teeth[16]!.surfaces.M, "healthy");
		});

		it("assigns vestibular filling on tooth 24", () => {
			const base = createIntactOdontogram("adult");
			const updated = applyToothCondition(base, 24, "filling", ["V"]);

			const tooth24 = updated.teeth[24]!;
			assert.equal(tooth24.generalCondition, "filling");
			assert.equal(tooth24.surfaces.V, "filling");
			assert.equal(tooth24.surfaces.M, "healthy");
			assert.equal(tooth24.surfaces.D, "healthy");
			assert.equal(tooth24.surfaces.O, "healthy");
			assert.equal(tooth24.surfaces.L, "healthy");
		});

		it("applies whole-tooth condition when surfaces parameter is omitted", () => {
			const base = createIntactOdontogram("adult");
			const updated = applyToothCondition(base, 36, "root_canal");

			const tooth36 = updated.teeth[36]!;
			assert.equal(tooth36.generalCondition, "root_canal");
			for (const surface of TOOTH_SURFACES) {
				assert.equal(tooth36.surfaces[surface], "root_canal");
			}
		});

		it("rejects invalid tooth number or surface", () => {
			const base = createIntactOdontogram("adult");
			assert.throws(() => applyToothCondition(base, 99, "caries"), /Invalid FDI tooth number/);
			assert.throws(
				() => applyToothCondition(base, 16, "caries", ["X" as Surface]),
				/Invalid tooth surface/,
			);
		});
	});

	describe("4. Multi-Tooth Bridge Construction & Continuity Validation", () => {
		it("constructs valid 3-unit bridge with abutments 14, 16 and pontic 15", () => {
			const base = createIntactOdontogram("adult");
			const bridgeConfig: BridgeToothConfig[] = [
				{ toothNumber: 14, role: "pillar" },
				{ toothNumber: 15, role: "pontic" },
				{ toothNumber: 16, role: "pillar" },
			];

			const updated = createBridgeTreatment(base, bridgeConfig, "Диоксид циркония");

			assert.equal(updated.treatments.length, 1);
			const tr = updated.treatments[0]!;
			assert.equal(tr.type, "bridge");
			assert.equal(tr.material, "Диоксид циркония");
			assert.equal(tr.status, "planned");
			assert.equal(tr.teeth.length, 3);

			// Check tooth 14 (pillar)
			const t14 = updated.teeth[14]!;
			assert.equal(t14.bridgeRole, "pillar");
			assert.equal(t14.bridgeId, tr.id);
			assert.equal(t14.generalCondition, "crown");

			// Check tooth 15 (pontic / missing)
			const t15 = updated.teeth[15]!;
			assert.equal(t15.bridgeRole, "pontic");
			assert.equal(t15.bridgeId, tr.id);
			assert.equal(t15.generalCondition, "missing");
			assert.equal(t15.surfaces.O, "missing");

			// Check tooth 16 (pillar)
			const t16 = updated.teeth[16]!;
			assert.equal(t16.bridgeRole, "pillar");
			assert.equal(t16.bridgeId, tr.id);
			assert.equal(t16.generalCondition, "crown");
		});

		it("rejects bridge with gap in arch sequence (discontinuous span)", () => {
			const base = createIntactOdontogram("adult");
			// 14 and 16 without 15 has a gap
			const brokenConfig: BridgeToothConfig[] = [
				{ toothNumber: 14, role: "pillar" },
				{ toothNumber: 16, role: "pillar" },
			];

			assert.throws(
				() => createBridgeTreatment(base, brokenConfig),
				/Bridge teeth must form a contiguous sequence along the dental arch without gaps/,
			);
		});

		it("rejects bridge with cross-arch teeth (upper and lower mix)", () => {
			const base = createIntactOdontogram("adult");
			const crossArchConfig: BridgeToothConfig[] = [
				{ toothNumber: 14, role: "pillar" },
				{ toothNumber: 44, role: "pillar" },
			];

			assert.throws(
				() => createBridgeTreatment(base, crossArchConfig),
				/All bridge teeth must belong to the same dental arch/,
			);
		});

		it("rejects bridge with less than 2 teeth", () => {
			const base = createIntactOdontogram("adult");
			assert.throws(
				() => createBridgeTreatment(base, [{ toothNumber: 14, role: "pillar" }]),
				/Bridge construction requires at least 2 teeth/,
			);
		});

		it("rejects bridge without any pillar (abutment) tooth", () => {
			const base = createIntactOdontogram("adult");
			const allPonticConfig: BridgeToothConfig[] = [
				{ toothNumber: 14, role: "pontic" },
				{ toothNumber: 15, role: "pontic" },
			];

			assert.throws(
				() => createBridgeTreatment(base, allPonticConfig),
				/Bridge construction requires at least one pillar \(abutment\) tooth/,
			);
		});

		it("rejects duplicate tooth numbers in bridge", () => {
			const base = createIntactOdontogram("adult");
			const duplicateConfig: BridgeToothConfig[] = [
				{ toothNumber: 14, role: "pillar" },
				{ toothNumber: 14, role: "pontic" },
			];

			assert.throws(
				() => createBridgeTreatment(base, duplicateConfig),
				/Duplicate tooth numbers in bridge configuration/,
			);
		});
	});

	describe("5. WHO / Minzdrav RF Caries-Missing-Filled (КПУ) Calculation", () => {
		it("calculates accurate КПУ index across multiple clinical findings", () => {
			let state = createIntactOdontogram("adult");

			// 1. Add MOD caries on tooth 26 (Caries = 1)
			state = applyToothCondition(state, 26, "caries", ["M", "O", "D"]);

			// 2. Add vestibular filling on tooth 24 (Filled = 1)
			state = applyToothCondition(state, 24, "filling", ["V"]);

			// 3. Add occlusal filling on tooth 37 (Filled = 2)
			state = applyToothCondition(state, 37, "filling", ["O"]);

			// 4. Add bridge on 14 (pillar), 15 (pontic), 16 (pillar) -> tooth 15 is Missing (Missing = 1)
			state = createBridgeTreatment(state, [
				{ toothNumber: 14, role: "pillar" },
				{ toothNumber: 15, role: "pontic" },
				{ toothNumber: 16, role: "pillar" },
			]);

			// 5. Add dental implant on missing tooth 46
			state = applyToothCondition(state, 46, "implant");

			// 6. Add endodontic treatment on tooth 11
			state = applyToothCondition(state, 11, "root_canal");

			const stats = calculateOdontogramStats(state);

			// Decayed: tooth 26 = 1
			assert.equal(stats.decayed, 1);
			// Filled: teeth 24, 37 = 2
			assert.equal(stats.filled, 2);
			// Missing: tooth 15 = 1
			assert.equal(stats.missing, 1);
			// КПУ = 1 + 2 + 1 = 4
			assert.equal(stats.kpuIndex, 4);

			// Crowns: 14, 16 = 2
			assert.equal(stats.crownsCount, 2);
			// Implants: 46 = 1
			assert.equal(stats.implantsCount, 1);
			// Root canals: 11 = 1
			assert.equal(stats.rootCanalsCount, 1);
			// Total tracked: 32
			assert.equal(stats.totalTeethTracked, 32);

			// Intact teeth: 32 - 1(decayed) - 2(filled) - 1(missing) - 2(crowns) - 1(implant) - 1(root canal) = 24
			assert.equal(stats.intactCount, 24);
		});
	});

	describe("6. Russian Form 043/u Printable A4 Protocol (Strictly 0 Emojis)", () => {
		it("generates regulatory Form 043/u protocol with 0 cartoon emojis", () => {
			let state = createIntactOdontogram("adult");
			state = applyToothCondition(state, 16, "caries", ["M", "O", "D"]);
			state = applyToothCondition(state, 24, "filling", ["V"]);
			state = createBridgeTreatment(state, [
				{ toothNumber: 14, role: "pillar" },
				{ toothNumber: 15, role: "pontic" },
				{ toothNumber: 16, role: "pillar" },
			]);

			const protocol = formatOdontogramForm043A4Protocol(
				state,
				"Соколов Дмитрий Иванович",
				"д-р Михайлов А.В.",
			);

			// 1. Check official headings and regulatory citations
			assert.ok(protocol.includes("МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ"));
			assert.ok(protocol.includes("ФОРМА N 043/У"));
			assert.ok(protocol.includes("ЗУБНАЯ ФОРМУЛА (FDI / ISO 3950)"));
			assert.ok(protocol.includes("Приказом Минздрава РФ N 834н"));

			// 2. Check metadata
			assert.ok(protocol.includes("Соколов Дмитрий Иванович"));
			assert.ok(protocol.includes("д-р Михайлов А.В."));
			assert.ok(protocol.includes("Постоянный (взрослый)"));

			// 3. Check Form 043/u teeth numbers and codes
			assert.ok(protocol.includes("18  17  16  15  14  13  12  11"));
			assert.ok(protocol.includes("21  22  23  24  25  26  27  28"));
			assert.ok(protocol.includes("48  47  46  45  44  43  42  41"));
			assert.ok(protocol.includes("31  32  33  34  35  36  37  38"));

			// 4. Check detailed registries and indices
			assert.ok(protocol.includes("Зуб 24: Пломбирован (поверхности: V)"));
			assert.ok(protocol.includes("Мостовидный протез"));
			assert.ok(protocol.includes("Индекс КПУ (интенсивность кариеса): 3 (К=1, П=1, У=1)"));

			// 5. Mandate 8d item 7 / Mandate 8p item 5: STRICTLY ZERO CARTOON EMOJIS!
			const emojiRegex =
				/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}]/u;
			assert.equal(
				emojiRegex.test(protocol),
				false,
				"Form 043/u protocol must strictly contain ZERO cartoon emojis",
			);

			// Check extended pictographic regex
			const pictographicRegex = /\p{Extended_Pictographic}/u;
			assert.equal(
				pictographicRegex.test(protocol),
				false,
				"Form 043/u protocol must strictly contain ZERO pictographic symbols",
			);
		});

		it("generates child dentition protocol with deciduous teeth correctly", () => {
			let childState = createIntactOdontogram("child");
			childState = applyToothCondition(childState, 54, "caries", ["O"]);

			const protocol = formatOdontogramForm043A4Protocol(
				childState,
				"Петров Ваня",
				"д-р Смирнова Е.Н.",
			);

			assert.ok(protocol.includes("Временный (детский)"));
			assert.ok(protocol.includes("55  54  53  52  51"));
			assert.ok(protocol.includes("61  62  63  64  65"));
			assert.ok(protocol.includes("Петров Ваня"));
			assert.ok(protocol.includes("Индекс КПУ (интенсивность кариеса): 1 (К=1, П=0, У=0)"));

			const pictographicRegex = /\p{Extended_Pictographic}/u;
			assert.equal(pictographicRegex.test(protocol), false);
		});
	});

	describe("7. Zod Schema Integrity & Validation", () => {
		it("validates compliant odontogram state, teeth and treatments", () => {
			const state = createIntactOdontogram("adult");
			assert.ok(odontogramStateSchema.parse(state));

			const tooth = state.teeth[11];
			assert.ok(toothStateSchema.parse(tooth));

			const stats = calculateOdontogramStats(state);
			assert.ok(odontogramStatsSchema.parse(stats));

			const treatment: MultiToothTreatment = {
				id: "test-bridge-1",
				type: "bridge",
				material: "Керамика",
				status: "planned",
				teeth: [
					{ toothNumber: 14, role: "pillar" },
					{ toothNumber: 15, role: "pontic" },
				],
			};
			assert.ok(multiToothTreatmentSchema.parse(treatment));
		});

		it("rejects invalid conditions, surfaces or roles", () => {
			assert.throws(() => toothConditionSchema.parse("alien_condition"));
			assert.throws(() => surfaceSchema.parse("Z"));
			assert.throws(() => bridgeToothRoleSchema.parse("invalid_role"));
			assert.throws(() => treatmentStatusSchema.parse("in_progress"));
			assert.throws(() => dentitionTypeSchema.parse("senior"));
		});
	});

	describe("8. Re-Export Parity across Modules", () => {
		it("provides full functional parity from packages/shared/src/clinical/index.js", () => {
			const state = createIntactFromClinicalIndex("adult");
			const updated = applyToothConditionFromClinicalIndex(state, 16, "caries", ["O"]);
			const bridged = createBridgeTreatmentFromClinicalIndex(updated, [
				{ toothNumber: 14, role: "pillar" },
				{ toothNumber: 15, role: "pontic" },
				{ toothNumber: 16, role: "pillar" },
			]);
			const stats = calculateOdontogramStatsFromClinicalIndex(bridged);
			assert.equal(stats.kpuIndex, 2);
			const text = formatOdontogramForm043A4ProtocolFromClinicalIndex(bridged);
			assert.ok(text.includes("ФОРМА N 043/У"));
		});

		it("provides full functional parity from packages/shared/src/index.js root", () => {
			const state = createIntactFromSharedRoot("adult");
			const updated = applyToothConditionFromSharedRoot(state, 26, "caries", ["M", "O"]);
			const bridged = createBridgeTreatmentFromSharedRoot(updated, [
				{ toothNumber: 24, role: "pillar" },
				{ toothNumber: 25, role: "pontic" },
				{ toothNumber: 26, role: "pillar" },
			]);
			const stats = calculateOdontogramStatsFromSharedRoot(bridged);
			assert.equal(stats.kpuIndex, 2);
			const text = formatOdontogramForm043A4ProtocolFromSharedRoot(bridged);
			assert.ok(text.includes("ФОРМА N 043/У"));
		});
	});
});
