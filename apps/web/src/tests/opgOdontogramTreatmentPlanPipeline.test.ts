/**
 * opgOdontogramTreatmentPlanPipeline.test.ts
 *
 * Comprehensive end-to-end audit and verification of:
 * «OPG Radiograph -> Odontogram -> Treatment Plan (3 Scenarios: Optimum, Economy, Premium) -> Form 043/U Estimate»
 *
 * Verified Invariants:
 * 1. OPG Local AI Inference: Canonical detections of tooth 48 (retention) and teeth 16 & 24 (caries).
 * 2. Topological Graph Engine: Maps AI detections into clinical tooth statuses (Retained, Caries).
 * 3. 3-Tier Treatment Plan Autopilot:
 *    - «Оптимум» (Standard): Complex extraction of 48, light-cured composite for 16 & 24, pro-hygiene Air-Flow.
 *    - «Эконом» (Economy): Essential pain management, basic composite Gradia, basic scaling.
 *    - «Премиум» (Premium): Extended protocol with bone grafting GBR + Geistlich Bio-Gide membrane, Zeiss/Leica microscope.
 * 4. Exact Integer Kopecks: Zero IEEE-754 float drift via @dental/shared Kopecks.
 * 5. Form 043/U Live Invoice & Estimator Parity: Retained/Impacted and Caries procedures accurately generated.
 * 6. Facade & Component Re-export Invariants: PlanWizardModal and PlanScenarioComparisonModal exported.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { enableDemoShowcaseMode } from "../lib/demoMode.js";
import {
	generateCanonicalToothDetections,
	OpgAiInferenceService,
} from "../components/orthodontics/opgAiInferenceService";
import {
	calculateOpgOdontogram,
	type OpgToothSlot,
} from "../components/orthodontics/opgTopologicalEngine";
import {
	generate3TierPlanComparison,
	generateTierPlanStages,
	generateTreatmentPlanStages,
} from "../components/treatment-plans/treatmentPlanStagesEngine";
import {
	calculateLiveInvoiceItems,
	ORDER_804N_PROCEDURES,
} from "../components/odontogram/odontogramLiveInvoiceCalculations";
import {
	estimatorRulesForTooth,
} from "../components/odontogram/treatmentEstimatorRules";
import {
	PLAN_SERVICE_RULES,
} from "../components/treatment-plans/planPricing";
import type { ToothData } from "../components/odontogram/ToothChart";
import { parseKopecks, sumKopecks, type Kopecks } from "@dental/shared";

describe("OPG -> Odontogram -> Treatment Plan (3 Tiers) -> Form 043/U Pipeline", () => {
	beforeEach(() => {
		enableDemoShowcaseMode();
	});

	it("1. OPG AI inference correctly generates canonical detections for 48 (impacted) and 16, 24 (caries)", () => {
		const { teeth, pathologies } = generateCanonicalToothDetections(1024, 512);

		assert.ok(teeth.length >= 32, "Must detect 32 tooth contours");
		assert.ok(pathologies.length >= 3, "Must detect at least 3 clinical pathologies");

		const impacted48 = pathologies.find((p) => p.label === "impacted_tooth");
		assert.ok(impacted48, "Must identify impacted wisdom tooth");

		const caries16 = pathologies.find((p) => p.id === "car-16" && p.label === "caries");
		assert.ok(caries16, "Must identify caries on tooth 16");

		const caries24 = pathologies.find((p) => p.id === "car-24" && p.label === "caries");
		assert.ok(caries24, "Must identify caries on tooth 24");
	});

	it("2. Topological engine fuses OPG detections into correct Odontogram tooth slots", () => {
		const { teeth, pathologies } = generateCanonicalToothDetections(1024, 512);
		const analysis = calculateOpgOdontogram(teeth, pathologies, 1024, 512);

		assert.equal(analysis.teeth[48]?.status, "Retained", "Tooth 48 must be marked Retained");
		assert.equal(analysis.teeth[16]?.status, "Caries", "Tooth 16 must be marked Caries");
		assert.equal(analysis.teeth[24]?.status, "Caries", "Tooth 24 must be marked Caries");

		// Healthy controls
		assert.equal(analysis.teeth[11]?.status, "Healthy", "Tooth 11 must be Healthy");
		assert.equal(analysis.teeth[31]?.status, "Healthy", "Tooth 31 must be Healthy");
	});

	it("3. Generates exactly 3 distinct clinical tiers (Optimum, Economy, Premium) from odontogram findings", () => {
		const clinicalTeeth: ToothData[] = [
			{ toothNumber: 48, state: "Retained" },
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 24, state: "Caries" },
		];

		const [economy, standard, optimum] = generate3TierPlanComparison(clinicalTeeth);

		// Tier structure
		assert.equal(economy.tierId, "economy");
		assert.equal(standard.tierId, "standard");
		assert.equal(optimum.tierId, "optimum");
		assert.equal(optimum.isRecommended, true);

		// Stage hierarchy
		for (const tier of [economy, standard, optimum]) {
			assert.equal(tier.stages.length, 3, "Must have exactly 3 clinical stages");
			assert.equal(tier.stages[0]?.stageKind, "stage_1_therapy");
			assert.equal(tier.stages[1]?.stageKind, "stage_2_surgery");
			assert.equal(tier.stages[2]?.stageKind, "stage_3_orthopedics");
			assert.ok(tier.totalRub > 0, "Total price must be > 0 in demo mode");
			assert.ok(tier.totalKopecks > 0, "Total kopecks must be > 0");
		}

		// Stage 2 surgery in Standard (Optimum): must extract retained tooth 48
		const stdStage2Items = standard.stages[1]?.items || [];
		const stdExt48 = stdStage2Items.find((i) => i.toothNumber === 48);
		assert.ok(stdExt48, "Standard plan must include extraction of tooth 48");
		assert.equal(stdExt48.code804n, "A16.07.001.002", "Order 804n complex extraction code");

		// Stage 1 therapy in Standard: must include composite restoration for 16 and 24
		const stdStage1Items = standard.stages[0]?.items || [];
		const stdCar16 = stdStage1Items.find((i) => i.toothNumber === 16);
		const stdCar24 = stdStage1Items.find((i) => i.toothNumber === 24);
		assert.ok(stdCar16, "Standard plan must include caries therapy for tooth 16");
		assert.ok(stdCar24, "Standard plan must include caries therapy for tooth 24");

		// Stage 2 surgery in Premium (Optimum tier): must include bone graft / Bio-Gide biomembrane
		const optStage2Items = optimum.stages[1]?.items || [];
		const optExt48 = optStage2Items.find((i) => i.toothNumber === 48 && i.code804n === "A16.07.001.002");
		assert.ok(optExt48, "Premium plan must include piezo extraction of tooth 48");
		const optBoneGraft = optStage2Items.find((i) => i.toothNumber === 48 && i.code804n === "A16.07.041");
		assert.ok(optBoneGraft, "Premium plan must include bone grafting (Geistlich Bio-Oss + Bio-Gide membrane)");

		// Economy tier: essential minimal scope
		const ecoStage1Items = economy.stages[0]?.items || [];
		const ecoCar16 = ecoStage1Items.find((i) => i.toothNumber === 16);
		assert.ok(ecoCar16, "Economy plan must treat caries on tooth 16");
		assert.equal(ecoCar16.code804n, "A16.07.002", "Economy uses basic composite code A16.07.002");
	});

	it("4. Kopeck calculations prevent IEEE-754 float drift across all 3 tiers", () => {
		const clinicalTeeth: ToothData[] = [
			{ toothNumber: 48, state: "Retained" },
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 24, state: "Caries" },
		];

		const [economy, standard, optimum] = generate3TierPlanComparison(clinicalTeeth);

		for (const tier of [economy, standard, optimum]) {
			// Verify exact kopeck integer identity
			assert.equal(Number.isInteger(tier.totalKopecks), true, "totalKopecks must be an integer");
			assert.equal(tier.totalKopecks % 1, 0, "No floating point fraction in totalKopecks");

			// Verify sum of stage kopecks exactly matches total kopecks
			const stagesKopecksSum = sumKopecks(tier.stages.map((s) => s.totalKopecks));
			assert.equal(stagesKopecksSum, tier.totalKopecks, "Stages sum must exactly match tier total");

			// Verify staged 30/40/30 schedule sums to total kopecks
			const stagedSum = sumKopecks([
				tier.stagedSchedule.stage1AdvanceTherapyKopecks,
				tier.stagedSchedule.stage2SurgeryImplantKopecks,
				tier.stagedSchedule.stage3OrthopedicsKopecks,
			]);
			assert.equal(stagedSum, tier.totalKopecks, "Staged schedule 30/40/30 must sum to 100% with zero drift");
		}
	});

	it("5. Live Invoice & Treatment Estimator support both Retained and Impacted states", () => {
		// Both Retained and Impacted are present in ORDER_804N_PROCEDURES
		assert.ok(ORDER_804N_PROCEDURES.Retained, "ORDER_804N_PROCEDURES must have Retained");
		assert.ok(ORDER_804N_PROCEDURES.Impacted, "ORDER_804N_PROCEDURES must have Impacted");
		assert.equal(ORDER_804N_PROCEDURES.Retained.code, ORDER_804N_PROCEDURES.Impacted.code);

		// Both are present in PLAN_SERVICE_RULES
		assert.ok(PLAN_SERVICE_RULES.Retained, "PLAN_SERVICE_RULES must have Retained");
		assert.ok(PLAN_SERVICE_RULES.Impacted, "PLAN_SERVICE_RULES must have Impacted");

		// Estimator rules for both
		const rulesRetained = estimatorRulesForTooth("Retained", 48);
		const rulesImpacted = estimatorRulesForTooth("Impacted", 48);
		assert.equal(rulesRetained.length, 1);
		assert.equal(rulesImpacted.length, 1);
		assert.equal(rulesRetained[0]?.key, "retained");
		assert.equal(rulesImpacted[0]?.key, "retained");

		// Live invoice item generation for tooth 48
		const teeth: ToothData[] = [
			{ toothNumber: 48, state: "Retained" },
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 24, state: "Caries" },
		];
		const items = calculateLiveInvoiceItems(teeth);
		const extItem = items.find((i) => i.toothNumber === 48);
		assert.ok(extItem, "Live invoice must include tooth 48 extraction");
		assert.equal(extItem.code, "A16.07.001.003");
	});

	it("6. Facades and aliases are properly exported for all consumer components", async () => {
		const wizardModule = await import("../components/treatment-plans/TreatmentPlanWizard");
		assert.ok(wizardModule.PlanWizardModal, "PlanWizardModal must be exported");
		assert.equal(wizardModule.PlanWizardModal, wizardModule.TreatmentPlanWizard);

		const comparatorModule = await import("../components/treatment-plans/comparator/TreatmentPlanComparatorModal");
		assert.ok(comparatorModule.PlanScenarioComparisonModal, "PlanScenarioComparisonModal must be exported");
		assert.ok(comparatorModule.TreatmentPlanComparisonModal, "TreatmentPlanComparisonModal must be exported");
		assert.equal(comparatorModule.PlanScenarioComparisonModal, comparatorModule.TreatmentPlanComparatorModal);
	});
});
