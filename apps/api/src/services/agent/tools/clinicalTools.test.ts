/**
 * clinicalTools.test.ts — Comprehensive Unit Test Suite for Clinical Copilot Tools
 * (Form 043/у Diary Generator, Prescription Form 107-1/у, 3-Tier Treatment Plans, and DDI Safety Auditing)
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import type { AgentContext } from "../context.js";
import {
	checkDrugInteractionTool,
	checkDrugInteractionsTool,
	createPrescription107Tool,
	generateVisitDiaryTool,
	performClinicalDrugSafetyAudit,
	registerClinicalTools,
	render043Text,
	renderPrescription107Text,
	suggestTreatmentPlanTool,
} from "./clinicalTools.js";
import { ToolRegistry } from "./registry.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const USER_ID = "00000000-0000-7000-8000-000000000003";

function createTestContext(overrides: Partial<AgentContext> = {}): AgentContext {
	const registry = new ToolRegistry();
	registerClinicalTools(registry, "clinical");

	return {
		organizationId: ORG_ID,
		clinicId: CLINIC_ID,
		userId: USER_ID,
		sessionId: "test-session-clinical-tools",
		mode: "autonomous",
		role: "doctor",
		permissions: ["clinical.read", "clinical.write"],
		tools: registry,
		db: null,
		...overrides,
	};
}

describe("1. Form 043/у Visit Diary Generator (clinical.generate_visit_diary)", () => {
	test("generates complete SOAP protocol and Order 804n billing for deep dentin caries (tooth 46, K02.1)", async () => {
		const ctx = createTestContext();
		const result = (await generateVisitDiaryTool.handler(ctx, {
			toothNumber: 46,
			icd10Code: "K02.1",
			surfaces: ["occlusal", "distal"],
			doctorFullName: "Д-р Иванов Иван Иванович",
			doctorSpecialty: "Врач-стоматолог терапевт",
			anestheticDrug: "septanest_1_100000",
			anesthesiaCarpules: 1,
			anesthesiaTechnique: "mandibular",
		})) as any;

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.form043.toothNumber, "46");
		assert.strictEqual(result.form043.icd10Code, "K02.1");
		assert.ok(result.form043.clinicalDiagnosis.includes("Кариес дентина"));

		// SOAP Check
		assert.ok(result.form043.complaint.length > 0, "Subjective complaints must not be empty");
		assert.ok(result.form043.objectiveStatus.length > 0, "Objective status must not be empty");
		assert.ok(result.form043.treatment.length > 0, "Procedure protocol must not be empty");
		assert.ok(result.form043.anesthesiaDetails.includes("Септанест") || result.form043.anesthesiaDetails.includes("Артикаин"));
		assert.ok(result.form043.appliedMaterials.length > 0, "Applied materials must be populated");
		assert.ok(result.form043.recommendations.length > 0, "Home care recommendations must be present");

		// Compliance with Minzdrav Order 834n
		assert.strictEqual(result.complianceReport.isCompliant, true);
		assert.ok(result.complianceReport.complianceScore >= 90);

		// Billing 804n exact kopecks
		assert.ok(result.order804nServices.length >= 2, "Must contain at least 2 services (preparation, filling, anesthesia)");
		assert.ok(Number.isInteger(result.estimate.totalKopecks), "Billing total must be integer kopecks");
		assert.ok(result.estimate.totalKopecks > 0);
		assert.ok(result.estimate.formattedTotal.includes("₽"));

		// Printed document
		assert.ok(result.form043.renderedText.includes("ДНЕВНИК ПРИЁМА ВРАЧА-СТОМАТОЛОГА"));
		assert.ok(result.form043.renderedText.includes("K02.1"));
	});

	test("generates multi-canal endodontic protocol for acute pulpitis (tooth 16, K04.0)", async () => {
		const ctx = createTestContext();
		const result = (await generateVisitDiaryTool.handler(ctx, {
			toothNumber: 16,
			icd10Code: "K04.0",
			doctorFullName: "Д-р Петрова Анна Сергеевна",
			doctorSpecialty: "Врач-стоматолог терапевт-эндодонтист",
			anestheticDrug: "ultracain_ds_forte",
			anesthesiaCarpules: 2,
		})) as any;

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.form043.toothNumber, "16");
		assert.strictEqual(result.form043.icd10Code, "K04.0");
		assert.ok(result.form043.clinicalDiagnosis.toLowerCase().includes("пульпит"));

		// Multi-canal endodontics check (tooth 16 has 3-4 canals)
		assert.ok(
			result.form043.treatment.includes("канал") ||
				result.form043.treatment.includes("обтурац") ||
				result.form043.treatment.includes("коффердам"),
			"Protocol must reflect modern endodontic isolation and canal instrumentation",
		);

		// Order 804n endodontic line items
		assert.ok(
			result.order804nServices.some((s: any) => s.code.startsWith("A16.07.030") || s.code.startsWith("A16.07.008")),
			"Must include endodontic instrumentation and obturation Order 804n codes",
		);
	});

	test("executes via ToolRegistry unified call single-chokepoint", async () => {
		const ctx = createTestContext();
		const callResult = (await ctx.tools.call(ctx, "generate_visit_diary", {
			toothNumber: 21,
			icd10Code: "K03.1",
			doctorFullName: "Д-р Смирнов",
		})) as any;

		assert.strictEqual(callResult.ok, true);
		assert.strictEqual(callResult.data.success, true);
		assert.strictEqual(callResult.data.form043.toothNumber, "21");
		assert.strictEqual(callResult.data.form043.icd10Code, "K03.1");
	});
});

describe("2. Statutory Prescription Form 107-1/у Generator (clinical.create_prescription_107)", () => {
	test("creates Form 107-1/у with Latin Rp:, D.t.d. and Russian Signa for Nimesil and Amoxiclav", async () => {
		const ctx = createTestContext();
		const result = (await createPrescription107Tool.handler(ctx, {
			patientFullName: "Соколова Елена Дмитриевна",
			patientBirthDate: "15.04.1988",
			patientAgeYears: 38,
			medicalCardNumber: "043-7842",
			doctorFullName: "Кузнецов Михаил Викторович",
			doctorSpecialty: "Врач-стоматолог хирург",
			validityDays: "60",
			items: [
				{
					presetId: "nimesulide_100",
				},
				{
					presetId: "amoxiclav_875_125",
				},
			],
			diagnosisIcd10Code: "K04.5",
		})) as any;

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.formNumber, "107-1/у");
		assert.strictEqual(result.statutoryOrder, "Приказ Минздрава России от 24.11.2021 № 1094н");
		assert.strictEqual(result.validityDays, "60");
		assert.strictEqual(result.itemsCount, 2);

		// Item 1: Nimesulide
		const item1 = result.items[0];
		assert.ok(item1.latinName.startsWith("Rp.:"));
		assert.ok(item1.latinName.includes("Nimesulidi"));
		assert.ok(item1.dispenseLatin.startsWith("D.t.d."));
		assert.ok(item1.signaRussian.startsWith("S."));
		assert.ok(item1.tradeName.includes("Нимесил"));

		// Item 2: Amoxiclav
		const item2 = result.items[1];
		assert.ok(item2.latinName.startsWith("Rp.:"));
		assert.ok(item2.latinName.includes("Amoxicillini"));
		assert.ok(item2.dispenseLatin.startsWith("D.t.d."));
		assert.ok(item2.signaRussian.startsWith("S."));
		assert.ok(item2.tradeName.includes("Амоксиклав"));

		// Formatted Print Text
		assert.ok(result.formattedPrintText.includes("Форма № 107-1/у"));
		assert.ok(result.formattedPrintText.includes("Соколова Елена Дмитриевна"));
		assert.ok(result.formattedPrintText.includes("Rp.:"));
		assert.ok(result.formattedPrintText.includes("D.t.d."));
		assert.ok(result.formattedPrintText.includes("S."));
		assert.ok(result.formattedPrintText.includes("Подпись и личная печать врача"));
	});

	test("handles custom medication proscription with manual Latin and Russian signature", async () => {
		const ctx = createTestContext();
		const result = (await createPrescription107Tool.handler(ctx, {
			patientFullName: "Иванов Иван",
			patientBirthDate: "01.01.1995",
			medicalCardNumber: "043-1234",
			doctorFullName: "Д-р Васильев",
			items: [
				{
					latinName: "Sol. Chlorhexidini bigluconatis 0.05% - 100 ml",
					tradeName: "Хлоргексидин 0.05%",
					form: "раствор для местного применения",
					dosage: "0.05%",
					quantity: "N. 1",
					dispenseLatin: "D.t.d. N 1 in flac.",
					signaRussian: "Ротовые ванночки по 15 мл 3 раза в день после чистки зубов.",
					category: "antiseptic",
				},
			],
		})) as any;

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.itemsCount, 1);
		assert.ok(result.items[0].latinName.startsWith("Rp.: Sol. Chlorhexidini"));
		assert.ok(result.items[0].dispenseLatin.startsWith("D.t.d. N 1 in flac."));
		assert.ok(result.items[0].signaRussian.startsWith("S. Ротовые ванночки"));
	});

	test("executes via ToolRegistry unified call single-chokepoint", async () => {
		const ctx = createTestContext();
		const callResult = (await ctx.tools.call(ctx, "create_prescription_107", {
			patientFullName: "Петров Петр",
			patientBirthDate: "10.10.1985",
			medicalCardNumber: "043-9999",
			doctorFullName: "Д-р Кузнецов",
			items: [{ presetId: "ibuprofen_400" }],
		})) as any;

		assert.strictEqual(callResult.ok, true);
		assert.strictEqual(callResult.data.success, true);
		assert.ok(callResult.data.items[0].tradeName.includes("Ибупрофен"));
	});
});

describe("3. 3-Tier Treatment Plan Generator (clinical.suggest_treatment_plan)", () => {
	test("generates Economy, Optimum, and Premium tiers with Order 804n integer kopecks and 3 clinical stages", async () => {
		const ctx = createTestContext();
		const result = (await suggestTreatmentPlanTool.handler(ctx, {
			patientFullName: "Ковалев Андрей Михайлович",
			doctorFullName: "Д-р Григорьев Станислав",
			discountPercent: 10,
			installmentMonths: "6",
			clinicalCases: [
				{
					toothNumber: 46,
					icd10Code: "K04.0",
					clinicalCanalCount: 3,
					notes: "Пульпит зуба 46, разрушение твердых тканей ИРОПЗ > 0.6",
				},
				{
					toothNumber: 36,
					icd10Code: "K08.1",
					notes: "Удаление несостоятельного корня 36 и дентальная имплантация",
				},
				{
					toothNumber: 11,
					icd10Code: "K02.1",
					surfaces: ["vestibular", "mesial"],
					notes: "Кариес дефекта IV класса",
				},
			],
		})) as any;

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.clinicalCasesCount, 3);
		assert.strictEqual(result.discountPercent, 10);
		assert.strictEqual(result.installmentMonths, 6);

		// Tier 1: Economy
		const eco = result.tiers.economy;
		assert.strictEqual(eco.tierKey, "economy");
		assert.strictEqual(eco.isRecommended, false);
		assert.strictEqual(eco.warrantyYears, 1);
		assert.ok(Number.isInteger(eco.totalCostKopecks), "Total cost must be exact integer kopecks");
		assert.ok(Number.isInteger(eco.laborKopecks), "Labor cost must be exact integer kopecks");
		assert.ok(Number.isInteger(eco.materialsKopecks), "Materials cost must be exact integer kopecks");
		assert.ok(Number.isInteger(eco.discountKopecks), "Discount must be exact integer kopecks");
		assert.strictEqual(eco.stages.length, 3, "Must include all 3 clinical stages");

		// Tier 2: Optimum (Recommended)
		const opt = result.tiers.optimum;
		assert.strictEqual(opt.tierKey, "optimum");
		assert.strictEqual(opt.isRecommended, true, "Optimum must be flagged as recommended");
		assert.strictEqual(opt.warrantyYears, 3);
		assert.ok(Number.isInteger(opt.totalCostKopecks));
		assert.ok(opt.totalCostKopecks > eco.totalCostKopecks, "Optimum cost must exceed Economy");
		assert.ok(opt.installment.monthlyPaymentRu.includes("₽"));
		assert.ok(opt.ndflDeduction.refundRub > 0, "NDFL refund calculation must be positive");

		// Tier 3: Premium (VIP)
		const prem = result.tiers.premium;
		assert.strictEqual(prem.tierKey, "premium");
		assert.strictEqual(prem.isRecommended, false);
		assert.ok(Number.isInteger(prem.totalCostKopecks));
		assert.ok(prem.totalCostKopecks > opt.totalCostKopecks, "Premium cost must exceed Optimum");

		// 3 Stages Verification
		for (const stage of opt.stages) {
			assert.ok(
				stage.stageKind === "stage_1_therapy" ||
					stage.stageKind === "stage_2_surgery" ||
					stage.stageKind === "stage_3_orthopedics",
			);
			assert.ok(Number.isInteger(stage.stageCostKopecks));
		}
	});

	test("executes via ToolRegistry unified call single-chokepoint", async () => {
		const ctx = createTestContext();
		const callResult = (await ctx.tools.call(ctx, "suggest_treatment_plan", {
			clinicalCases: [{ toothNumber: 26, icd10Code: "K02.1" }],
		})) as any;

		assert.strictEqual(callResult.ok, true);
		assert.strictEqual(callResult.data.success, true);
		assert.ok(callResult.data.tiers.optimum.totalCostKopecks > 0);
	});
});

describe("4. Clinical Drug Safety & DDI Interaction Auditor (clinical.check_drug_interaction)", () => {
	test("blocks Amoxicillin and Amoxiclav when Penicillin allergy is present and suggests Clindamycin / Azithromycin", async () => {
		const ctx = createTestContext();
		const audit = await performClinicalDrugSafetyAudit({
			proposedMedications: ["amoxiclav_875_125", "nimesulide_100"],
			knownAllergies: ["пенициллин"],
		});

		assert.strictEqual(audit.isSafe, false, "Must block unsafe prescription");
		assert.strictEqual(audit.riskLevel, "critical_danger");
		assert.strictEqual(audit.hasAllergyClash, true);
		assert.ok(audit.blockedPrescriptions.includes("amoxiclav_875_125"));
		assert.ok(
			audit.allergyWarnings.some((w) => w.allergenGroup.includes("Пенициллин") && w.severity === "critical"),
		);

		// Safe alternatives
		assert.ok(
			audit.safeAlternativeRecommendations.some((alt) =>
				alt.recommendedAlternatives.some((r) => r.includes("Азитромицин") || r.includes("Клиндамицин")),
			),
			"Must recommend safe alternative antibiotic",
		);
	});

	test("blocks NSAIDs (Ibuprofen, Nimesulide, Ketorolac) for patient with Samter's Triad (Aspirin asthma) and suggests Paracetamol", async () => {
		const ctx = createTestContext();
		const audit = await performClinicalDrugSafetyAudit({
			proposedMedications: ["ibuprofen_400", "ketorolac_10"],
			patientConditions: ["samter_triad", "бронхиальная астма"],
		});

		assert.strictEqual(audit.isSafe, false);
		assert.strictEqual(audit.riskLevel, "critical_danger");
		assert.ok(audit.blockedPrescriptions.includes("ibuprofen_400"));
		assert.ok(audit.blockedPrescriptions.includes("ketorolac_10"));
		assert.ok(
			audit.allergyWarnings.some((w) => w.allergenGroup.includes("НПВС") || w.allergenGroup.includes("Салицилат")),
		);
		assert.ok(
			audit.safeAlternativeRecommendations.some((alt) =>
				alt.recommendedAlternatives.some((r) => r.includes("Парацетамол")),
			),
		);
	});

	test("blocks vasoconstrictor-containing anesthetics for Sulfite allergy and suggests Mepivacaine 3% without adrenaline", async () => {
		const ctx = createTestContext();
		const audit = await performClinicalDrugSafetyAudit({
			proposedMedications: ["ultracain_ds_forte_1:100000", "septanest_1:100000"],
			knownAllergies: ["метабисульфит натрия", "сульфиты"],
		});

		assert.strictEqual(audit.isSafe, false);
		assert.strictEqual(audit.riskLevel, "critical_danger");
		assert.ok(
			audit.allergyWarnings.some((w) => w.allergenGroup.includes("Сульфит")),
		);
		assert.ok(
			audit.safeAlternativeRecommendations.some((alt) =>
				alt.recommendedAlternatives.some((r) => r.includes("Скандонест") || r.includes("Мепивакаин")),
			),
		);
	});

	test("detects critical DDI between NSAID and Anticoagulants (Warfarin / DOAC) with gastrointestinal hemorrhage alert", async () => {
		const ctx = createTestContext();
		const audit = await performClinicalDrugSafetyAudit({
			proposedMedications: ["ketorolac_10", "nimesulide_100"],
			existingMedications: ["warfarin", "xarelto_rivaroxaban"],
		});

		assert.strictEqual(audit.hasSevereDdi, true);
		assert.ok(
			audit.drugInteractions.some(
				(i) =>
					(i.severity === "critical" || i.severity === "high") &&
					(i.effectDescriptionRu.includes("кровотеч") || i.effectDescriptionRu.includes("гемостаз")),
			),
			"Must highlight critical bleeding risk between NSAID and anticoagulant",
		);
	});

	test("blocks NSAIDs in Pregnancy 3rd Trimester due to premature ductus arteriosus closure", async () => {
		const ctx = createTestContext();
		const audit = await performClinicalDrugSafetyAudit({
			proposedMedications: ["nimesulide_100", "ibuprofen_400"],
			patientConditions: ["pregnancy_3rd_trimester"],
		});

		assert.strictEqual(audit.isSafe, false);
		assert.strictEqual(audit.hasConditionContraindication, true);
		assert.ok(
			audit.conditionContraindications.some(
				(c) => c.condition.includes("III триместр") && c.severity === "critical",
			),
		);
		assert.ok(
			audit.safeAlternativeRecommendations.some((alt) =>
				alt.recommendedAlternatives.some((r) => r.includes("Парацетамол")),
			),
		);
	});

	test("approves safe prescriptions without warnings when no allergies, DDI, or contraindications exist", async () => {
		const ctx = createTestContext();
		const audit = await performClinicalDrugSafetyAudit({
			proposedMedications: ["paracetamol_500", "chlorhexidine_005"],
			existingMedications: [],
			patientConditions: [],
			knownAllergies: [],
		});

		assert.strictEqual(audit.isSafe, true);
		assert.strictEqual(audit.riskLevel, "safe");
		assert.strictEqual(audit.hasAllergyClash, false);
		assert.strictEqual(audit.hasSevereDdi, false);
		assert.strictEqual(audit.blockedPrescriptions.length, 0);
	});

	test("executes checkDrugInteractionTool and checkDrugInteractionsTool via ToolRegistry", async () => {
		const ctx = createTestContext();

		// Singular tool
		const res1 = (await ctx.tools.call(ctx, "check_drug_interaction", {
			proposedMedications: ["amoxiclav_875_125"],
			knownAllergies: ["пенициллин"],
		})) as any;
		assert.strictEqual(res1.ok, true);
		assert.strictEqual(res1.data.isSafe, false);

		// Plural legacy tool
		const res2 = (await ctx.tools.call(ctx, "check_drug_interactions", {
			patientId: "00000000-0000-7000-8000-000000000004",
			proposedMedicationIds: ["med_amox_500"],
		})) as any;
		assert.strictEqual(res2.ok, true);
		assert.ok(res2.data !== undefined);
	});
});
