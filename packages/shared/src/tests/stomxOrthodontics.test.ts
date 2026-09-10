/**
 * stomxOrthodontics.test.ts — StomX Orthodontic Taxonomy & Diagnostic Protocol Tests (@dental/shared)
 * 
 * Verifies:
 * 1. Zod Schemas & Domain Contracts for Orthodontic Form 043/u
 * 2. 1-Click Physiological Norm Record Factory (Mandate 8e: Doctor Autonomy)
 * 3. 6 Specialized Clinical Case Presets (Norm, II/1, II/2, III, Open Bite, Crossbite)
 * 4. Cephalometric Steiner/Tweed/Bjork Classification Math (SNA, SNB, ANB, FMA, Jarabak)
 * 5. Form 043/u Statutory Protocol Text Generator (Sin 7: ZERO raw emojis)
 * 6. StomX Catalog Options & Arch Taxonomy Completeness
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ANGLE_CLASSES_DETAILED,
	BAD_HABITS_OPTIONS,
	DENTAL_ARCH_FORMS_LOWER,
	DENTAL_ARCH_FORMS_UPPER,
	ICD10_ORTHODONTIC_CODES,
	ORTHODONTIC_DIAGNOSTIC_PRESETS,
	PROFILE_TYPES,
	SAGITTAL_RELATION_OPTIONS,
	TRANSVERSAL_RELATION_OPTIONS,
	VERTICAL_RELATION_OPTIONS,
	calculateCephalometricClassification,
	createDefaultOrthodonticNormRecord,
	generateOrthodonticDiagnosticProtocol,
	orthodonticComplaintsAnamnesisSchema,
	orthodonticDiagnosticRecordSchema,
	orthodonticFaceExaminationSchema,
	orthodonticOralExaminationSchema,
	orthodonticTrgCephDiagnosticsSchema,
} from "../orthodontics/stomxTaxonomy.js";

const RAW_EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA70}-\u{1FAFF}⚡★✔🔴🟢🟡]/u;

describe("StomX Orthodontic Taxonomy & Clinical Card (@dental/shared)", () => {
	describe("1. Zod Schemas & Validation Contracts", () => {
		it("validates empty object with defaults in orthodonticComplaintsAnamnesisSchema", () => {
			const parsed = orthodonticComplaintsAnamnesisSchema.parse({});
			assert.equal(parsed.aesthetic, false);
			assert.equal(parsed.morphological, false);
			assert.equal(parsed.tmjDysfunction, false);
			assert.equal(parsed.lipIncompetence, false);
			assert.equal(parsed.infantileSwallowing, false);
			assert.equal(parsed.speechDisorders, false);
			assert.equal(parsed.mandibularHabitualShift, "none");
			assert.equal(parsed.mouthBreathing, false);
			assert.equal(parsed.bruxism, false);
			assert.deepEqual(parsed.badHabits, ["none"]);
			assert.equal(parsed.deliveryTerm, "on_time");
			assert.equal(parsed.feedingType, "natural");
		});

		it("validates empty object with defaults in orthodonticFaceExaminationSchema", () => {
			const parsed = orthodonticFaceExaminationSchema.parse({});
			assert.equal(parsed.faceSymmetry, "symmetric");
			assert.equal(parsed.chinShift, "none");
			assert.equal(parsed.chinShiftMm, 0);
			assert.equal(parsed.supramentalFold, "normal");
			assert.equal(parsed.nasolabialFolds, "normal");
			assert.equal(parsed.lipsClosedInRepose, "closed_relaxed");
			assert.equal(parsed.gummySmile, false);
			assert.equal(parsed.profileType, "straight");
			assert.equal(parsed.upperLipPosition, "normal");
			assert.equal(parsed.lowerLipPosition, "normal");
			assert.equal(parsed.chinPosition, "normal");
			assert.equal(parsed.incisorDisplayRestMm, 2.5);
			assert.equal(parsed.incisorDisplaySmilePercent, 85);
		});

		it("validates empty object with defaults in orthodonticOralExaminationSchema", () => {
			const parsed = orthodonticOralExaminationSchema.parse({});
			assert.equal(parsed.upperArchForm, "semi_ellipse");
			assert.equal(parsed.lowerArchForm, "parabola");
			assert.equal(parsed.archSymmetry, "preserved");
			assert.equal(parsed.midlineShift, "none");
			assert.equal(parsed.midlineShiftMm, 0);
			assert.equal(parsed.angleMolarLeft, "class_1");
			assert.equal(parsed.angleMolarRight, "class_1");
			assert.equal(parsed.angleCanineLeft, "class_1");
			assert.equal(parsed.angleCanineRight, "class_1");
			assert.equal(parsed.sagittalRelation, "normal");
			assert.equal(parsed.verticalRelation, "normal");
			assert.equal(parsed.transversalRelation, "normal");
			assert.equal(parsed.crowdingUpper, "none");
			assert.equal(parsed.crowdingLower, "none");
		});

		it("validates empty object with defaults in orthodonticTrgCephDiagnosticsSchema", () => {
			const parsed = orthodonticTrgCephDiagnosticsSchema.parse({});
			assert.equal(parsed.sna, 82);
			assert.equal(parsed.snb, 80);
			assert.equal(parsed.anb, 2);
			assert.equal(parsed.wits, 0);
			assert.equal(parsed.fma, 25);
			assert.equal(parsed.u1NaAngle, 22);
			assert.equal(parsed.u1NaMm, 4);
			assert.equal(parsed.l1NbAngle, 25);
			assert.equal(parsed.l1NbMm, 4);
			assert.equal(parsed.u1Nl, 110);
			assert.equal(parsed.l1Ml, 90);
			assert.equal(parsed.interincisalAngle, 131);
			assert.equal(parsed.bjorkSum, 396);
			assert.equal(parsed.jarabakRatio, 63.5);
			assert.equal(parsed.skeletalClass, "class_1");
			assert.equal(parsed.growthDirection, "neutral");
			assert.equal(parsed.maxillarySagittalType, "normognathic");
			assert.equal(parsed.mandibularSagittalType, "normognathic");
		});

		it("validates complete orthodonticDiagnosticRecordSchema", () => {
			const defaultRecord = createDefaultOrthodonticNormRecord();
			const validated = orthodonticDiagnosticRecordSchema.safeParse(defaultRecord);
			assert.equal(validated.success, true);
		});
	});

	describe("2. 1-Click Physiological Norm Factory (Mandate 8e: Doctor Autonomy)", () => {
		it("creates 100% complete physiological norm record instantly", () => {
			const record = createDefaultOrthodonticNormRecord();
			assert.ok(record.id.startsWith("ortho_norm_"));
			assert.equal(record.complaintsAnamnesis.aesthetic, false);
			assert.equal(record.complaintsAnamnesis.morphological, false);
			assert.equal(record.faceExamination.faceSymmetry, "symmetric");
			assert.equal(record.faceExamination.profileType, "straight");
			assert.equal(record.oralExamination.upperArchForm, "semi_ellipse");
			assert.equal(record.oralExamination.lowerArchForm, "parabola");
			assert.equal(record.oralExamination.angleMolarLeft, "class_1");
			assert.equal(record.oralExamination.angleMolarRight, "class_1");
			assert.equal(record.trgDiagnostics.skeletalClass, "class_1");
			assert.equal(record.clinicalDiagnosisIcd10, "K07.2");
		});

		it("allows selective partial overrides while preserving physiological norm elsewhere", () => {
			const record = createDefaultOrthodonticNormRecord({
				patientName: "Алексей Смирнов",
				cardNumber: "ОРТО-1029",
				oralExamination: {
					...createDefaultOrthodonticNormRecord().oralExamination,
					diastemaUpperMm: 2.5,
					tremasUpper: true,
				},
			});
			assert.equal(record.patientName, "Алексей Смирнов");
			assert.equal(record.cardNumber, "ОРТО-1029");
			assert.equal(record.oralExamination.diastemaUpperMm, 2.5);
			assert.equal(record.oralExamination.tremasUpper, true);
			// Untouched domains remain in norm:
			assert.equal(record.faceExamination.faceSymmetry, "symmetric");
			assert.equal(record.trgDiagnostics.anb, 2);
		});
	});

	describe("3. Specialized Clinical Presets (StomX Diagnostic Profiles)", () => {
		it("contains all 6 mandatory clinical case presets", () => {
			const ids = ORTHODONTIC_DIAGNOSTIC_PRESETS.map((p) => p.id);
			assert.ok(ids.includes("norm_class_1"), "norm_class_1 must exist");
			assert.ok(ids.includes("class_2_div_1"), "class_2_div_1 must exist");
			assert.ok(ids.includes("class_2_div_2"), "class_2_div_2 must exist");
			assert.ok(ids.includes("class_3_progenia"), "class_3_progenia must exist");
			assert.ok(ids.includes("open_bite_vertical"), "open_bite_vertical must exist");
			assert.ok(ids.includes("crossbite_transverse"), "crossbite_transverse must exist");
		});

		it("all presets pass orthodonticDiagnosticRecordSchema validation", () => {
			for (const preset of ORTHODONTIC_DIAGNOSTIC_PRESETS) {
				const res = orthodonticDiagnosticRecordSchema.safeParse(preset.record);
				assert.equal(res.success, true, `Preset ${preset.id} must be valid schema`);
			}
		});

		it("contains zero raw emojis across all presets (Mandate 8d & Sin 7)", () => {
			for (const preset of ORTHODONTIC_DIAGNOSTIC_PRESETS) {
				assert.equal(RAW_EMOJI_REGEX.test(preset.label), false, `Emoji in label: ${preset.id}`);
				assert.equal(RAW_EMOJI_REGEX.test(preset.shortLabel), false, `Emoji in shortLabel: ${preset.id}`);
				assert.equal(RAW_EMOJI_REGEX.test(preset.description), false, `Emoji in description: ${preset.id}`);
				assert.equal(RAW_EMOJI_REGEX.test(preset.record.clinicalDiagnosisText), false, `Emoji in diagnosis: ${preset.id}`);
				assert.equal(RAW_EMOJI_REGEX.test(preset.record.treatmentPlanText), false, `Emoji in treatment plan: ${preset.id}`);
			}
		});

		it("verifies specific clinical parameters in Class II div 1 preset", () => {
			const preset = ORTHODONTIC_DIAGNOSTIC_PRESETS.find((p) => p.id === "class_2_div_1")!;
			assert.equal(preset.record.oralExamination.sagittalRelation, "sagittal_cleft");
			assert.equal(preset.record.oralExamination.sagittalCleftMm, 6);
			assert.equal(preset.record.faceExamination.profileType, "convex");
			assert.equal(preset.record.trgDiagnostics.anb, 6);
			assert.equal(preset.record.trgDiagnostics.skeletalClass, "class_2");
			assert.equal(preset.record.trgDiagnostics.eschlerBittnerTest, "improved");
		});

		it("verifies specific clinical parameters in Class II div 2 preset", () => {
			const preset = ORTHODONTIC_DIAGNOSTIC_PRESETS.find((p) => p.id === "class_2_div_2")!;
			assert.equal(preset.record.oralExamination.verticalRelation, "traumatic_occlusion");
			assert.equal(preset.record.oralExamination.upperArchForm, "trapezoid");
			assert.equal(preset.record.trgDiagnostics.fma, 18);
			assert.equal(preset.record.trgDiagnostics.growthDirection, "horizontal");
			assert.equal(preset.record.complaintsAnamnesis.bruxism, true);
		});

		it("verifies specific clinical parameters in Class III Progenia preset", () => {
			const preset = ORTHODONTIC_DIAGNOSTIC_PRESETS.find((p) => p.id === "class_3_progenia")!;
			assert.equal(preset.record.oralExamination.sagittalRelation, "reverse_incisal_occlusion");
			assert.equal(preset.record.faceExamination.profileType, "concave");
			assert.equal(preset.record.trgDiagnostics.anb, -5);
			assert.equal(preset.record.trgDiagnostics.skeletalClass, "class_3");
			assert.equal(preset.record.trgDiagnostics.mandibularSagittalType, "prognathic");
		});

		it("verifies specific clinical parameters in Open Bite preset", () => {
			const preset = ORTHODONTIC_DIAGNOSTIC_PRESETS.find((p) => p.id === "open_bite_vertical")!;
			assert.equal(preset.record.oralExamination.verticalRelation, "open_bite");
			assert.equal(preset.record.oralExamination.verticalOpenBiteMm, 4);
			assert.equal(preset.record.complaintsAnamnesis.infantileSwallowing, true);
			assert.equal(preset.record.complaintsAnamnesis.mouthBreathing, true);
			assert.equal(preset.record.trgDiagnostics.fma, 34);
			assert.equal(preset.record.trgDiagnostics.growthDirection, "vertical");
		});

		it("verifies specific clinical parameters in Crossbite Transverse preset", () => {
			const preset = ORTHODONTIC_DIAGNOSTIC_PRESETS.find((p) => p.id === "crossbite_transverse")!;
			assert.equal(preset.record.oralExamination.transversalRelation, "crossbite_buccal");
			assert.equal(preset.record.oralExamination.transversalSide, "right");
			assert.equal(preset.record.oralExamination.midlineShift, "right");
			assert.equal(preset.record.oralExamination.midlineShiftMm, 3);
			assert.equal(preset.record.faceExamination.faceSymmetry, "asymmetric");
		});
	});

	describe("4. Cephalometric Steiner/Tweed/Bjork Classification Math", () => {
		it("correctly identifies Skeletal Class I and Neutral growth", () => {
			const result = calculateCephalometricClassification({
				sna: 82,
				snb: 80,
				anb: 2,
				fma: 25,
				bjorkSum: 396,
				jarabakRatio: 63.5,
			});
			assert.equal(result.skeletalClass, "class_1");
			assert.equal(result.growthDirection, "neutral");
			assert.equal(result.maxillarySagittalType, "normognathic");
			assert.equal(result.mandibularSagittalType, "normognathic");
			assert.ok(result.summary.includes("Скелетный I класс"));
			assert.ok(result.summary.includes("Нейтральный"));
		});

		it("correctly identifies Skeletal Class II and Mandibular Retrognathia", () => {
			const result = calculateCephalometricClassification({
				sna: 82,
				snb: 76,
				anb: 6,
				fma: 24,
			});
			assert.equal(result.skeletalClass, "class_2");
			assert.equal(result.mandibularSagittalType, "retrognathic");
			assert.ok(result.summary.includes("Скелетный II класс"));
		});

		it("correctly identifies Skeletal Class III and Mandibular Prognathia", () => {
			const result = calculateCephalometricClassification({
				sna: 80,
				snb: 85,
				anb: -5,
				fma: 27,
			});
			assert.equal(result.skeletalClass, "class_3");
			assert.equal(result.mandibularSagittalType, "prognathic");
			assert.ok(result.summary.includes("Скелетный III класс"));
		});

		it("correctly classifies Vertical Hyperdivergent growth pattern", () => {
			const result = calculateCephalometricClassification({
				sna: 82,
				snb: 80,
				anb: 2,
				fma: 32, // >28
				bjorkSum: 405, // >402
				jarabakRatio: 59, // <62
			});
			assert.equal(result.growthDirection, "vertical");
			assert.ok(result.growthDirectionLabel.includes("Вертикальный"));
		});

		it("correctly classifies Horizontal Hypodivergent growth pattern", () => {
			const result = calculateCephalometricClassification({
				sna: 82,
				snb: 80,
				anb: 2,
				fma: 19, // <22
				bjorkSum: 385, // <390
				jarabakRatio: 67, // >65
			});
			assert.equal(result.growthDirection, "horizontal");
			assert.ok(result.growthDirectionLabel.includes("Горизонтальный"));
		});
	});

	describe("5. Statutory Form 043/u Protocol Generator (Sin 7: Zero Emojis)", () => {
		it("generates publication-grade Russian clinical protocol for Norm", () => {
			const record = createDefaultOrthodonticNormRecord({
				patientName: "Иванова Мария Сергеевна",
				cardNumber: "О-4412",
				doctorName: "Д-р Петров А.В.",
			});
			const protocol = generateOrthodonticDiagnosticProtocol(record);

			assert.ok(protocol.includes("ПЕРВИЧНЫЙ ОРТОДОНТИЧЕСКИЙ ОСМОТР"), "Header present");
			assert.ok(protocol.includes("Иванова Мария Сергеевна"), "Patient name present");
			assert.ok(protocol.includes("1. ЖАЛОБЫ И АНАМНЕЗ:"), "Section 1 present");
			assert.ok(protocol.includes("2. ОСМОТР ЛИЦА И ПРОФИЛЯ:"), "Section 2 present");
			assert.ok(protocol.includes("3. ВНУТРИРОТОВОЙ ОСМОТР"), "Section 3 present");
			assert.ok(protocol.includes("4. ТЕЛЕРЕНТГЕНОГРАФИЯ (ТРГ)"), "Section 4 present");
			assert.ok(protocol.includes("5. КЛИНИЧЕСКИЙ ДИАГНОЗ"), "Section 5 present");
			assert.ok(protocol.includes("K07.2"), "ICD-10 code present");
			assert.equal(RAW_EMOJI_REGEX.test(protocol), false, "Must contain ZERO raw emojis");
		});

		it("accurately renders pathology details in protocol for complex case", () => {
			const class2Preset = ORTHODONTIC_DIAGNOSTIC_PRESETS.find((p) => p.id === "class_2_div_1")!;
			const protocol = generateOrthodonticDiagnosticProtocol(class2Preset.record);

			assert.ok(protocol.includes("сагиттальная щель"), "Overjet present");
			assert.ok(protocol.includes("6 мм"), "Overjet mm present");
			assert.ok(protocol.includes("Выпуклый"), "Convex profile present");
			assert.ok(protocol.includes("V-образная"), "V-shaped arch present");
			assert.ok(protocol.includes("II/1 класс"), "Angle II/1 present");
			assert.ok(protocol.includes("SNA = 83°"), "TRG SNA present");
			assert.ok(protocol.includes("ANB = 6°"), "TRG ANB present");
			assert.ok(protocol.includes("Проба Эшлера-Битнера"), "Eschler-Bittner test present");
			assert.equal(RAW_EMOJI_REGEX.test(protocol), false, "Must contain ZERO raw emojis");
		});
	});

	describe("6. StomX Taxonomic Catalogs & Dictionaries", () => {
		it("upper dental arch forms contain all 7 StomX anatomical options", () => {
			const values = DENTAL_ARCH_FORMS_UPPER.map((f) => f.value);
			assert.ok(values.includes("semi_ellipse"));
			assert.ok(values.includes("parabola"));
			assert.ok(values.includes("v_shaped"));
			assert.ok(values.includes("trapezoid"));
			assert.ok(values.includes("triangular"));
			assert.ok(values.includes("saddle"));
			assert.ok(values.includes("asymmetric"));
		});

		it("lower dental arch forms contain all 6 StomX anatomical options", () => {
			const values = DENTAL_ARCH_FORMS_LOWER.map((f) => f.value);
			assert.ok(values.includes("parabola"));
			assert.ok(values.includes("trapezoid"));
			assert.ok(values.includes("v_shaped"));
			assert.ok(values.includes("triangular"));
			assert.ok(values.includes("saddle"));
			assert.ok(values.includes("asymmetric"));
		});

		it("profile types contain straight, convex, concave", () => {
			const values = PROFILE_TYPES.map((p) => p.value);
			assert.deepEqual(values, ["straight", "convex", "concave"]);
		});

		it("bad habits options cover all StomX catalog items", () => {
			const values = BAD_HABITS_OPTIONS.map((h) => h.value);
			assert.ok(values.includes("none"));
			assert.ok(values.includes("fingers"));
			assert.ok(values.includes("up_lip"));
			assert.ok(values.includes("down_lip"));
			assert.ok(values.includes("tongue"));
			assert.ok(values.includes("objects"));
		});

		it("vertical relations cover normal, deep, traumatic, edge-to-edge, open bite", () => {
			const values = VERTICAL_RELATION_OPTIONS.map((v) => v.value);
			assert.ok(values.includes("normal"));
			assert.ok(values.includes("deep_1_3"));
			assert.ok(values.includes("deep_1_2"));
			assert.ok(values.includes("traumatic_occlusion"));
			assert.ok(values.includes("straight_incisal"));
			assert.ok(values.includes("open_bite"));
		});

		it("sagittal relations cover normal, overjet, reverse occlusion, reverse overjet", () => {
			const values = SAGITTAL_RELATION_OPTIONS.map((s) => s.value);
			assert.ok(values.includes("normal"));
			assert.ok(values.includes("sagittal_cleft"));
			assert.ok(values.includes("reverse_incisal_occlusion"));
			assert.ok(values.includes("reverse_sagittal_cleft"));
		});

		it("transversal relations cover normal, buccal, lingual, palatal crossbites", () => {
			const values = TRANSVERSAL_RELATION_OPTIONS.map((t) => t.value);
			assert.ok(values.includes("normal"));
			assert.ok(values.includes("crossbite_buccal"));
			assert.ok(values.includes("crossbite_lingual"));
			assert.ok(values.includes("crossbite_palatal"));
		});

		it("angle classes cover all 4 Angle classes with detailed clinical descriptions", () => {
			assert.equal(ANGLE_CLASSES_DETAILED.length, 4);
			const ids = ANGLE_CLASSES_DETAILED.map((a) => a.id);
			assert.deepEqual(ids, ["class_1", "class_2_div_1", "class_2_div_2", "class_3"]);
		});

		it("ICD-10 codes contain standard orthodontic K07 classifications", () => {
			const codes = ICD10_ORTHODONTIC_CODES.map((c) => c.code);
			assert.ok(codes.includes("K07.0"));
			assert.ok(codes.includes("K07.1"));
			assert.ok(codes.includes("K07.2"));
			assert.ok(codes.includes("K07.3"));
		});
	});
});
