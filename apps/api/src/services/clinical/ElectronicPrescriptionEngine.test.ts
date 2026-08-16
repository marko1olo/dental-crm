/**
 * ElectronicPrescriptionEngine.test.ts — Юнит-тесты движка электронных рецептов
 * (Приказ Минздрава РФ № 1094н, формы 107-1/у и 148-1/у-88, клиническая безопасность и ЭП).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ElectronicPrescriptionEngine,
	type PatientClinicalProfile,
	type PrescriptionHeaderInput,
	type PrescriptionItemInput,
} from "./ElectronicPrescriptionEngine.js";

const dummyOrg = {
	organizationId: "org-001-clinic",
	organizationName: "ООО Стоматология ДЕНТЕ",
	organizationOgrn: "1027700132195",
	organizationAddress: "г. Москва, ул. Стоматологов, д. 12, стр. 1",
	organizationPhone: "+7 (495) 123-45-67",
};

const dummyDoctor = {
	prescribingDoctorId: "doc-999-ivanov",
	doctorFullName: "Иванов Иван Иванович",
	doctorSpecialty: "Врач-стоматолог-хирург",
	doctorSnils: "123-456-789 00",
};

const defaultAdultPatient: PatientClinicalProfile = {
	patientId: "pat-100-smirnov",
	fullName: "Смирнов Алексей Петрович",
	birthDate: "1988-05-14",
	ageYears: 38,
	gender: "male",
	knownAllergies: [],
	currentMedications: [],
	chronicDiseases: [],
};

describe("ElectronicPrescriptionEngine — Order 1094n & Clinical Safety", () => {
	// ========================================================================
	// 1. ЛАТИНСКАЯ РЕЦЕПТУРНАЯ ПРОПИСЬ (Rp: ... D.t.d. ... S. ...)
	// ========================================================================
	describe("1. Latin Prescription Grammar & Formats", () => {
		it("formats standard tablet prescription according to Russian Pharmacopoeia", () => {
			const block = ElectronicPrescriptionEngine.buildLatinPrescriptionBlock({
				innLatin: "Amoxicillini",
				dosageFormLatin: "Tab.",
				dosageDoseConcentration: "0.5",
				dispenseInstructionLatin: "N 20 in tab.",
				signatureDirectionRussian:
					"Внутрь по 1 таблетке 3 раза в день после еды в течение 7 дней.",
			});

			assert.ok(block.includes("Rp.: Tab. Amoxicillini 0.5"));
			assert.ok(block.includes("D.t.d. N 20 in tab."));
			assert.ok(
				block.includes(
					"S.: Внутрь по 1 таблетке 3 раза в день после еды в течение 7 дней.",
				),
			);
		});

		it("formats capsules and solutions with custom dosages and concentration", () => {
			const blockCaps = ElectronicPrescriptionEngine.buildLatinPrescriptionBlock(
				{
					innLatin: "Clindamycini",
					dosageFormLatin: "Caps.",
					dosageDoseConcentration: "0.3",
					dispenseInstructionLatin: "D.t.d. N 16 in caps.",
					signatureDirectionRussian: "S.: По 1 капсуле 4 раза в день (каждые 6 часов).",
				},
			);
			assert.ok(blockCaps.includes("Rp.: Caps. Clindamycini 0.3"));
			assert.ok(blockCaps.includes("D.t.d. N 16 in caps."));
			assert.ok(
				blockCaps.includes(
					"S.: По 1 капсуле 4 раза в день (каждые 6 часов).",
				),
			);

			const blockSol = ElectronicPrescriptionEngine.buildLatinPrescriptionBlock(
				{
					innLatin: "Ketorolaci trometamoli",
					dosageFormLatin: "Sol.",
					dosageDoseConcentration: "3% - 1.0 ml",
					dispenseInstructionLatin: "N 5 in ampull.",
					signatureDirectionRussian: "Внутримышечно по 1 мл при сильной боли.",
				},
			);
			assert.ok(blockSol.includes("Rp.: Sol. Ketorolaci trometamoli 3% - 1.0 ml"));
			assert.ok(blockSol.includes("D.t.d. N 5 in ampull."));
			assert.ok(
				blockSol.includes("S.: Внутримышечно по 1 мл при сильной боли."),
			);
		});
	});

	// ========================================================================
	// 2. РЕГУЛЯТОРНЫЕ ПРАВИЛА БЛАНКОВ (107-1/у и 148-1/у-88)
	// ========================================================================
	describe("2. Order 1094n Form Constraints & Expiration Rules", () => {
		it("enforces maximum 1 item and 15 days validity for Form 148-1/u-88", () => {
			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Tramadoli hydrochloridi",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.05",
					dispenseInstructionLatin: "N 20 in tab.",
					signatureDirectionRussian: "По 1 таблетке при острой боли.",
					quantityPackages: 1,
					durationDays: 5,
					frequencyTimesPerDay: 2,
					mealRelation: "independent",
				},
				{
					innLatin: "Diazepamum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.005",
					dispenseInstructionLatin: "N 10 in tab.",
					signatureDirectionRussian: "По 1 таблетке на ночь.",
					quantityPackages: 1,
					durationDays: 3,
					frequencyTimesPerDay: 1,
					mealRelation: "after_meal",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				defaultAdultPatient,
				items,
				"form_148_1_u_88",
				"days_60", // Недопустимый срок для 148-1/у-88
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some((c) => c.id === "REG-1094N-148-SINGLE-ITEM"),
			);
			assert.ok(
				audit.conflicts.some((c) => c.id === "REG-1094N-148-VALIDITY-15D"),
			);
		});

		it("enforces maximum 3 items for Form 107-1/u and handles 1-year chronic mark", () => {
			const fourItems: PrescriptionItemInput[] = [
				{
					innLatin: "Amoxicillini",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.5",
					dispenseInstructionLatin: "N 20",
					signatureDirectionRussian: "По 1 таб 3 раза в день.",
					quantityPackages: 1,
					durationDays: 7,
					frequencyTimesPerDay: 3,
					mealRelation: "after_meal",
				},
				{
					innLatin: "Ibuprofenum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.4",
					dispenseInstructionLatin: "N 20",
					signatureDirectionRussian: "По 1 таб 2 раза в день.",
					quantityPackages: 1,
					durationDays: 5,
					frequencyTimesPerDay: 2,
					mealRelation: "after_meal",
				},
				{
					innLatin: "Chlorhexidini",
					dosageFormLatin: "Sol.",
					dosageDoseConcentration: "0.05% - 100 ml",
					dispenseInstructionLatin: "N 1 in flac.",
					signatureDirectionRussian: "Полоскать рот 2 раза в день.",
					quantityPackages: 1,
					durationDays: 10,
					frequencyTimesPerDay: 2,
					mealRelation: "after_meal",
				},
				{
					innLatin: "Cetirizinum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.01",
					dispenseInstructionLatin: "N 10",
					signatureDirectionRussian: "По 1 таб 1 раз в день.",
					quantityPackages: 1,
					durationDays: 5,
					frequencyTimesPerDay: 1,
					mealRelation: "independent",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				defaultAdultPatient,
				fourItems,
				"form_107_1_u",
				"year_1",
				false, // нет отметки о спец. назначении
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some((c) => c.id === "REG-1094N-107-MAX-3-ITEMS"),
			);
			assert.ok(
				audit.conflicts.some(
					(c) => c.id === "REG-1094N-107-CHRONIC-MARK-REQUIRED",
				),
			);
		});

		it("calculates exact expiry dates for 15 days, 60 days, and 1 year", () => {
			const baseDate = new Date("2026-08-15T12:00:00Z");

			const exp15 = ElectronicPrescriptionEngine.calculateExpiryDate(
				baseDate,
				"form_148_1_u_88",
				"days_15",
			);
			assert.equal(exp15.toISOString().slice(0, 10), "2026-08-30");

			const exp60 = ElectronicPrescriptionEngine.calculateExpiryDate(
				baseDate,
				"form_107_1_u",
				"days_60",
			);
			assert.equal(exp60.toISOString().slice(0, 10), "2026-10-14");

			const expYear = ElectronicPrescriptionEngine.calculateExpiryDate(
				baseDate,
				"form_107_1_u",
				"year_1",
			);
			assert.equal(expYear.toISOString().slice(0, 10), "2027-08-15");
		});
	});

	// ========================================================================
	// 3. ВОЗРАСТНЫЕ ПРОТИВОПОКАЗАНИЯ И ПЕДИАТРИЧЕСКИЙ РАСЧЕТ
	// ========================================================================
	describe("3. Age Contraindications & Pediatric Dosing", () => {
		it("blocks Nimesulide for pediatric patient under 12 years (hepatotoxicity)", () => {
			const childPatient: PatientClinicalProfile = {
				...defaultAdultPatient,
				patientId: "pat-child-01",
				fullName: "Кузнецов Дима",
				birthDate: "2018-03-10",
				ageYears: 8,
			};

			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Nimesulidum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.1",
					dispenseInstructionLatin: "N 10 in tab.",
					signatureDirectionRussian: "По 1 таблетке 2 раза в день.",
					quantityPackages: 1,
					durationDays: 3,
					frequencyTimesPerDay: 2,
					mealRelation: "after_meal",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				childPatient,
				items,
				"form_107_1_u",
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some((c) => c.id === "AGE-NIMESULIDE-PEDIATRIC"),
			);
		});

		it("blocks Ketorolac for patient under 16 years (GI ulceration & bleeding)", () => {
			const teenPatient: PatientClinicalProfile = {
				...defaultAdultPatient,
				patientId: "pat-teen-01",
				fullName: "Попов Артем",
				birthDate: "2012-07-20",
				ageYears: 14,
			};

			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Ketorolacum trometamolum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.01",
					dispenseInstructionLatin: "N 10 in tab.",
					signatureDirectionRussian: "По 1 таблетке при боли.",
					quantityPackages: 1,
					durationDays: 3,
					frequencyTimesPerDay: 2,
					mealRelation: "after_meal",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				teenPatient,
				items,
				"form_107_1_u",
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some((c) => c.id === "AGE-KETOROLAC-PEDIATRIC"),
			);
		});

		it("blocks Tetracyclines for child under 8 years due to tooth enamel discoloration", () => {
			const youngChild: PatientClinicalProfile = {
				...defaultAdultPatient,
				patientId: "pat-child-young",
				fullName: "Петрова Аня",
				birthDate: "2021-02-15",
				ageYears: 5,
			};

			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Doxycyclinum",
					dosageFormLatin: "Caps.",
					dosageDoseConcentration: "0.1",
					dispenseInstructionLatin: "N 10 in caps.",
					signatureDirectionRussian: "По 1 капсуле в день.",
					quantityPackages: 1,
					durationDays: 5,
					frequencyTimesPerDay: 1,
					mealRelation: "with_meal",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				youngChild,
				items,
				"form_107_1_u",
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some(
					(c) => c.id === "AGE-TETRACYCLINE-DENTAL-DYSPLASIA",
				),
			);
		});

		it("blocks Fluoroquinolones for patients under 18 years due to cartilage damage", () => {
			const teenPatient: PatientClinicalProfile = {
				...defaultAdultPatient,
				ageYears: 17,
			};

			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Ciprofloxacinum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.5",
					dispenseInstructionLatin: "N 10",
					signatureDirectionRussian: "По 1 таб 2 раза в день.",
					quantityPackages: 1,
					durationDays: 5,
					frequencyTimesPerDay: 2,
					mealRelation: "before_meal",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				teenPatient,
				items,
				"form_107_1_u",
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some(
					(c) => c.id === "AGE-FLUOROQUINOLONE-ARTHROPATHY",
				),
			);
		});

		it("calculates pediatric dose based on body weight and flags overdose", () => {
			const pediatricPatientWithWeight: PatientClinicalProfile = {
				...defaultAdultPatient,
				ageYears: 6,
				weightKg: 20, // 20 кг: макс суточная доза амоксициллина 20*90 = 1800 мг/сут
			};

			// Назначено 1000 мг 3 раза в день = 3000 мг/сут (превышение)
			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Amoxicillinum",
					dosageFormLatin: "Susp.",
					dosageDoseConcentration: "500 mg / 5 ml",
					dispenseInstructionLatin: "N 1 in flac.",
					signatureDirectionRussian: "По 10 мл (1000 мг) 3 раза в день.",
					quantityPackages: 1,
					durationDays: 7,
					frequencyTimesPerDay: 3,
					singleDoseMg: 1000,
					dailyDoseMg: 3000,
					mealRelation: "after_meal",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				pediatricPatientWithWeight,
				items,
				"form_107_1_u",
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some((c) => c.id === "PED-DOSE-AMOXICILLIN-OVERDOSE"),
			);
			assert.equal(audit.pediatricDoseAudit.length, 1);
			assert.equal(audit.pediatricDoseAudit[0]!.isExceeded, true);
		});

		it("warns on prolonged NSAID course in geriatric patients (age >= 65)", () => {
			const elderlyPatient: PatientClinicalProfile = {
				...defaultAdultPatient,
				ageYears: 72,
			};

			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Ketorolacum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.01",
					dispenseInstructionLatin: "N 20",
					signatureDirectionRussian: "По 1 таб 2 раза в день в течение 10 дней.",
					quantityPackages: 1,
					durationDays: 10, // > 5 дней у пожилого
					frequencyTimesPerDay: 2,
					mealRelation: "after_meal",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				elderlyPatient,
				items,
				"form_107_1_u",
			);

			assert.ok(
				audit.conflicts.some((c) => c.id === "GERIATRIC-NSAID-DURATION"),
			);
			assert.ok(audit.warningsCount >= 1);
		});
	});

	// ========================================================================
	// 4. АЛЛЕРГИИ И ПЕРЕКРЕСТНАЯ РЕАКТИВНОСТЬ
	// ========================================================================
	describe("4. Allergies & Cross-Reactivity Engine", () => {
		it("detects direct penicillin allergy and cross-allergy to cephalosporins", () => {
			const allergicPatient: PatientClinicalProfile = {
				...defaultAdultPatient,
				knownAllergies: [
					{
						allergenGroup: "Пенициллины (Amoxicillin)",
						reactionSeverity: "severe",
					},
				],
			};

			// Пытаемся выписать Цефтриаксон при тяжелой аллергии на пенициллин
			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Ceftriaxonum",
					dosageFormLatin: "Sol.",
					dosageDoseConcentration: "1.0",
					dispenseInstructionLatin: "N 5 in flac.",
					signatureDirectionRussian: "Внутримышечно 1 раз в день.",
					quantityPackages: 1,
					durationDays: 5,
					frequencyTimesPerDay: 1,
					mealRelation: "independent",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				allergicPatient,
				items,
				"form_107_1_u",
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some(
					(c) => c.id === "ALLERGY-PENICILLIN-CEPHALOSPORIN-CROSS",
				),
			);
		});

		it("strictly blocks all NSAIDs in Samter Triad (Aspirin asthma)", () => {
			const samterPatient: PatientClinicalProfile = {
				...defaultAdultPatient,
				knownAllergies: [
					{
						allergenGroup: "Аспирин",
						hasSamterTriad: true,
						reactionSeverity: "anaphylaxis",
					},
				],
			};

			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Ibuprofenum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.4",
					dispenseInstructionLatin: "N 20",
					signatureDirectionRussian: "По 1 таблетке 3 раза в день.",
					quantityPackages: 1,
					durationDays: 5,
					frequencyTimesPerDay: 3,
					mealRelation: "after_meal",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				samterPatient,
				items,
				"form_107_1_u",
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some((c) => c.id === "ALLERGY-SAMTER-TRIAD-FATAL"),
			);
		});
	});

	// ========================================================================
	// 5. ОПАСНЫЕ МЕЖЛЕКАРСТВЕННЫЕ ВЗАИМОДЕЙСТВИЯ (DRUG-DRUG)
	// ========================================================================
	describe("5. Dangerous Drug-Drug Interactions", () => {
		it("blocks NSAID + Anticoagulant combination (severe socket bleeding risk)", () => {
			const cardiacPatient: PatientClinicalProfile = {
				...defaultAdultPatient,
				currentMedications: ["Rivaroxaban 20 mg (Ксарелто)"],
			};

			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Ketorolacum trometamolum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.01",
					dispenseInstructionLatin: "N 10",
					signatureDirectionRussian: "По 1 таблетке при боли.",
					quantityPackages: 1,
					durationDays: 3,
					frequencyTimesPerDay: 2,
					mealRelation: "after_meal",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				cardiacPatient,
				items,
				"form_107_1_u",
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some(
					(c) => c.id === "INT-NSAID-ANTICOAGULANT-HEMORRHAGE",
				),
			);
		});

		it("blocks Aminopenicillins + Methotrexate (myelosuppression & pancytopenia)", () => {
			const rhaPatient: PatientClinicalProfile = {
				...defaultAdultPatient,
				currentMedications: ["Methotrexate 15 mg weekly"],
			};

			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Amoxicillinum et Acidum clavulanicum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.875 + 0.125",
					dispenseInstructionLatin: "N 14",
					signatureDirectionRussian: "По 1 таб 2 раза в день.",
					quantityPackages: 1,
					durationDays: 7,
					frequencyTimesPerDay: 2,
					mealRelation: "before_meal",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				rhaPatient,
				items,
				"form_107_1_u",
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some(
					(c) => c.id === "INT-PENICILLIN-METHOTREXATE-TOXICITY",
				),
			);
		});

		it("blocks Macrolides + Statins (CYP3A4 inhibition -> acute rhabdomyolysis)", () => {
			const statinPatient: PatientClinicalProfile = {
				...defaultAdultPatient,
				currentMedications: ["Atorvastatin 40 mg"],
			};

			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Clarithromycinum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.5",
					dispenseInstructionLatin: "N 10",
					signatureDirectionRussian: "По 1 таб 2 раза в день.",
					quantityPackages: 1,
					durationDays: 5,
					frequencyTimesPerDay: 2,
					mealRelation: "independent",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				statinPatient,
				items,
				"form_107_1_u",
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some(
					(c) => c.id === "INT-MACROLIDE-STATIN-RHABDOMYOLYSIS",
				),
			);
		});

		it("blocks Tramadol + SSRIs (Serotonin Syndrome risk)", () => {
			const depressedPatient: PatientClinicalProfile = {
				...defaultAdultPatient,
				currentMedications: ["Sertraline 50 mg"],
			};

			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Tramadoli hydrochloridum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.05",
					dispenseInstructionLatin: "N 10",
					signatureDirectionRussian: "По 1 таб при сильной боли.",
					quantityPackages: 1,
					durationDays: 3,
					frequencyTimesPerDay: 2,
					mealRelation: "independent",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				depressedPatient,
				items,
				"form_148_1_u_88",
				"days_15",
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some(
					(c) => c.id === "INT-TRAMADOL-SSRI-SEROTONIN-SYNDROME",
				),
			);
		});

		it("blocks Epinephrine anesthetic when patient takes non-selective Beta-blockers", () => {
			const betaBlockerPatient: PatientClinicalProfile = {
				...defaultAdultPatient,
				currentMedications: ["Propranolol 40 mg (Анаприлин)"],
				vasoconstrictorPlanned: "1:100000",
			};

			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Amoxicillinum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.5",
					dispenseInstructionLatin: "N 20",
					signatureDirectionRussian: "По 1 таб 3 раза в день.",
					quantityPackages: 1,
					durationDays: 7,
					frequencyTimesPerDay: 3,
					mealRelation: "after_meal",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				betaBlockerPatient,
				items,
				"form_107_1_u",
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some(
					(c) => c.id === "INT-EPINEPHRINE-BETABLOCKER-HYPERTENSION",
				),
			);
		});
	});

	// ========================================================================
	// 6. БЕРЕМЕННОСТЬ, ЛАКТАЦИЯ И СОМАТИКА
	// ========================================================================
	describe("6. Pregnancy & Disease Contraindications", () => {
		it("strictly blocks NSAIDs in pregnancy 3rd trimester (premature ductus arteriosus closure)", () => {
			const pregnantPatient: PatientClinicalProfile = {
				...defaultAdultPatient,
				gender: "female",
				isPregnant: true,
				pregnancyTrimester: 3,
			};

			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Ibuprofenum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.4",
					dispenseInstructionLatin: "N 10",
					signatureDirectionRussian: "По 1 таб 2 раза в день.",
					quantityPackages: 1,
					durationDays: 3,
					frequencyTimesPerDay: 2,
					mealRelation: "after_meal",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				pregnantPatient,
				items,
				"form_107_1_u",
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some(
					(c) => c.id === "PREG-NSAID-TRIMESTER-3-DUCTUS",
				),
			);
		});

		it("blocks NSAIDs in patients with active peptic ulcer disease", () => {
			const ulcerPatient: PatientClinicalProfile = {
				...defaultAdultPatient,
				chronicDiseases: ["Язвенная болезнь 12-перстной кишки (peptic_ulcer)"],
			};

			const items: PrescriptionItemInput[] = [
				{
					innLatin: "Ketorolacum",
					dosageFormLatin: "Tab.",
					dosageDoseConcentration: "0.01",
					dispenseInstructionLatin: "N 10",
					signatureDirectionRussian: "По 1 таб при боли.",
					quantityPackages: 1,
					durationDays: 3,
					frequencyTimesPerDay: 2,
					mealRelation: "after_meal",
				},
			];

			const audit = ElectronicPrescriptionEngine.evaluateSafety(
				ulcerPatient,
				items,
				"form_107_1_u",
			);

			assert.equal(audit.isPrescriptionSafe, false);
			assert.ok(
				audit.conflicts.some((c) => c.id === "DISEASE-PEPTIC-ULCER-NSAID"),
			);
		});
	});

	// ========================================================================
	// 7. ЦИФРОВАЯ ПОДПИСЬ ВРАЧА (ЭП / SHA-256 / ТАМПЕРИНГ)
	// ========================================================================
	describe("7. Doctor Digital Signature (SHA-256 & Verification)", () => {
		const validHeader: PrescriptionHeaderInput = {
			organization: dummyOrg,
			doctor: dummyDoctor,
			prescriptionNumber: "REC-2026-0001",
			formType: "form_107_1_u",
			validityPeriod: "days_60",
			issuedAt: "2026-08-16T12:00:00Z",
		};

		const safeItems: PrescriptionItemInput[] = [
			{
				innLatin: "Amoxicillini",
				dosageFormLatin: "Tab.",
				dosageDoseConcentration: "0.5",
				dispenseInstructionLatin: "N 20 in tab.",
				signatureDirectionRussian: "По 1 таблетке 3 раза в день в течение 7 дней.",
				quantityPackages: 1,
				durationDays: 7,
				frequencyTimesPerDay: 3,
				mealRelation: "after_meal",
			},
		];

		it("compiles prescription with valid Simple Electronic Signature (ПЭП)", () => {
			const pin = "7412";
			const compiled = ElectronicPrescriptionEngine.compilePrescription({
				header: validHeader,
				patient: defaultAdultPatient,
				items: safeItems,
				doctorPinOrCert: { pin },
			});

			assert.ok(compiled.signature);
			assert.equal(compiled.signature.signatureType, "SIMPLE_PIN_EP");
			assert.equal(compiled.signature.signerDoctorId, dummyDoctor.prescribingDoctorId);
			assert.equal(compiled.signature.verificationStatus, "valid");
			assert.ok(compiled.canonicalDigestSha256.length === 64);

			// Верифицируем подпись
			const verification =
				ElectronicPrescriptionEngine.verifyPrescriptionSignature(
					{
						id: compiled.id,
						orgId: compiled.organization.organizationId,
						orgOgrn: compiled.organization.organizationOgrn,
						doctorId: compiled.doctor.prescribingDoctorId,
						patientId: compiled.patient.patientId,
						patientBirthDate: compiled.patient.birthDate,
						formType: compiled.formType,
						series: compiled.prescriptionSeries,
						number: compiled.prescriptionNumber,
						validityPeriod: compiled.validityPeriod,
						issuedAt: compiled.issuedAt,
						expiresAt: compiled.expiresAt,
						items: compiled.items.map((i) => ({
							inn: i.innLatin,
							form: i.dosageFormLatin,
							dose: i.dosageDoseConcentration,
							dtd: i.dispenseInstructionLatin,
							sig: i.signatureDirectionRussian,
							qty: i.quantityPackages,
						})),
					},
					compiled.signature,
					pin,
				);

			assert.equal(verification.isValid, true);
		});

		it("detects data tampering and invalidates digital signature", () => {
			const pin = "7412";
			const compiled = ElectronicPrescriptionEngine.compilePrescription({
				header: validHeader,
				patient: defaultAdultPatient,
				items: safeItems,
				doctorPinOrCert: { pin },
			});

			// Злоумышленник пытается изменить дозировку в теле рецепта
			const tamperedPayload = {
				id: compiled.id,
				orgId: compiled.organization.organizationId,
				orgOgrn: compiled.organization.organizationOgrn,
				doctorId: compiled.doctor.prescribingDoctorId,
				patientId: compiled.patient.patientId,
				patientBirthDate: compiled.patient.birthDate,
				formType: compiled.formType,
				series: compiled.prescriptionSeries,
				number: compiled.prescriptionNumber,
				validityPeriod: compiled.validityPeriod,
				issuedAt: compiled.issuedAt,
				expiresAt: compiled.expiresAt,
				items: [
					{
						inn: "Amoxicillini",
						form: "Tab.",
						dose: "1.0", // ПОДМЕНА ДОЗЫ С 0.5 НА 1.0!
						dtd: "N 20 in tab.",
						sig: "По 1 таблетке 3 раза в день в течение 7 дней.",
						qty: 1,
					},
				],
			};

			const verification =
				ElectronicPrescriptionEngine.verifyPrescriptionSignature(
					tamperedPayload,
					compiled.signature!,
					pin,
				);

			assert.equal(verification.isValid, false);
			assert.ok(verification.reason?.includes("модифицированы"));
		});

		it("rejects signature verification when doctor PIN or secret is wrong", () => {
			const correctPin = "7412";
			const wrongPin = "0000";
			const compiled = ElectronicPrescriptionEngine.compilePrescription({
				header: validHeader,
				patient: defaultAdultPatient,
				items: safeItems,
				doctorPinOrCert: { pin: correctPin },
			});

			const payload = {
				id: compiled.id,
				orgId: compiled.organization.organizationId,
				orgOgrn: compiled.organization.organizationOgrn,
				doctorId: compiled.doctor.prescribingDoctorId,
				patientId: compiled.patient.patientId,
				patientBirthDate: compiled.patient.birthDate,
				formType: compiled.formType,
				series: compiled.prescriptionSeries,
				number: compiled.prescriptionNumber,
				validityPeriod: compiled.validityPeriod,
				issuedAt: compiled.issuedAt,
				expiresAt: compiled.expiresAt,
				items: compiled.items.map((i) => ({
					inn: i.innLatin,
					form: i.dosageFormLatin,
					dose: i.dosageDoseConcentration,
					dtd: i.dispenseInstructionLatin,
					sig: i.signatureDirectionRussian,
					qty: i.quantityPackages,
				})),
			};

			const verification =
				ElectronicPrescriptionEngine.verifyPrescriptionSignature(
					payload,
					compiled.signature!,
					wrongPin,
				);

			assert.equal(verification.isValid, false);
			assert.ok(verification.reason?.includes("недействительна"));
		});
	});

	// ========================================================================
	// 8. ГЕНЕРАЦИЯ ОФИЦИАЛЬНЫХ БЛАНКОВ 107-1/у И 148-1/у-88
	// ========================================================================
	describe("8. Official Prescription Blank Printing & EGISZ URL", () => {
		it("generates complete Form 107-1/u official printable text", () => {
			const compiled = ElectronicPrescriptionEngine.compilePrescription({
				header: {
					organization: dummyOrg,
					doctor: dummyDoctor,
					prescriptionNumber: "107-RU-9921",
					formType: "form_107_1_u",
					validityPeriod: "days_60",
					clinicalDiagnosisMkb10: "K04.0",
					clinicalDiagnosisDescription: "Острый пульпит зуба 26",
				},
				patient: defaultAdultPatient,
				items: [
					{
						innLatin: "Amoxicillini",
						dosageFormLatin: "Tab.",
						dosageDoseConcentration: "0.5",
						dispenseInstructionLatin: "N 20 in tab.",
						signatureDirectionRussian: "По 1 таблетке 3 раза в день.",
						quantityPackages: 1,
						durationDays: 7,
						frequencyTimesPerDay: 3,
						mealRelation: "after_meal",
					},
				],
				doctorPinOrCert: { pin: "1234" },
			});

			assert.ok(compiled.officialBlankText.includes("Форма № 107-1/у"));
			assert.ok(compiled.officialBlankText.includes(dummyOrg.organizationName));
			assert.ok(compiled.officialBlankText.includes(defaultAdultPatient.fullName));
			assert.ok(compiled.officialBlankText.includes("Rp.: Tab. Amoxicillini 0.5"));
			assert.ok(compiled.officialBlankText.includes("ЕГИСЗ Проверка:"));
			assert.ok(compiled.egiszVerificationUrl.includes("107-RU-9921"));
		});

		it("generates complete Form 148-1/u-88 official printable text", () => {
			const compiled = ElectronicPrescriptionEngine.compilePrescription({
				header: {
					organization: dummyOrg,
					doctor: dummyDoctor,
					prescriptionNumber: "148-PKU-0012",
					formType: "form_148_1_u_88",
					validityPeriod: "days_15",
					clinicalDiagnosisMkb10: "K05.2",
					clinicalDiagnosisDescription: "Острый пародонтит с болевым синдромом",
				},
				patient: defaultAdultPatient,
				items: [
					{
						innLatin: "Tramadoli hydrochloridi",
						dosageFormLatin: "Tab.",
						dosageDoseConcentration: "0.05",
						dispenseInstructionLatin: "N 10 in tab.",
						signatureDirectionRussian: "По 1 таб при сильной боли.",
						quantityPackages: 1,
						durationDays: 3,
						frequencyTimesPerDay: 2,
						mealRelation: "independent",
					},
				],
				doctorPinOrCert: {
					certSerialNumber: "7700-1234-5678-ABCD",
					certIssuer: "Минздрав РФ УЦ",
				},
			});

			assert.ok(compiled.officialBlankText.includes("Форма № 148-1/у-88"));
			assert.ok(
				compiled.officialBlankText.includes("ПРЕДМЕТНО-КОЛИЧЕСТВЕННЫЙ УЧЕТ"),
			);
			assert.ok(compiled.officialBlankText.includes("15 ДНЕЙ"));
			assert.ok(
				compiled.officialBlankText.includes("Rp.: Tab. Tramadoli hydrochloridi 0.05"),
			);
			assert.ok(compiled.signature?.signatureType === "QUALIFIED_EP");
			assert.ok(
				compiled.officialBlankText.includes("УКЭП (Квалифицированная ЭП)"),
			);
		});
	});
});
