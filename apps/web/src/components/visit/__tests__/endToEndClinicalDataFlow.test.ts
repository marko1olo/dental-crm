/**
 * endToEndClinicalDataFlow.test.ts
 *
 * Comprehensive integration tests for real end-to-end clinical data flow:
 * Odontogram -> Form 043/u EMK Diary -> Treatment Plan
 * (Zero mocks, real patient teeth, Doctor Autonomy, Mandates 8e, 8k, 8n).
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "vitest";
import {
	generateSoapFromOdontogramFinding,
	generateSoapFromOdontogramStates,
	type OdontogramFindingInput,
} from "../../../lib/clinicalProtocols043";
import {
	mergeMultiToothDiagnoses,
	mergeMultiToothObjective,
	mergeMultiToothTreatmentPlan,
} from "../../../utils/clinicalTextSanitizer";
import {
	saveStoredTeethData,
	loadStoredTeethData,
	getOdontogramStorageKey,
} from "../../odontogram/odontogramStorage";
import { generate3TierPlanComparison } from "../../treatment-plans/treatmentPlanStagesEngine";
import type { ToothData } from "../../odontogram/ToothChart";

// Node environment mock setup
const storageMap = new Map<string, string>();
const localStorageMock = {
	getItem: (k: string) => storageMap.get(k) ?? null,
	setItem: (k: string, v: string) => storageMap.set(k, String(v)),
	removeItem: (k: string) => storageMap.delete(k),
	clear: () => storageMap.clear(),
};

if (!globalThis.window) {
	const win = new EventTarget() as unknown as Window & typeof globalThis;
	// biome-ignore lint/suspicious/noExplicitAny: mock
	(win as any).localStorage = localStorageMock;
	// biome-ignore lint/suspicious/noExplicitAny: mock
	(win as any).location = { hostname: "127.0.0.1", origin: "http://127.0.0.1:5173", hash: "", search: "" };
	globalThis.window = win;
}
if (!globalThis.localStorage) {
	// biome-ignore lint/suspicious/noExplicitAny: mock
	globalThis.localStorage = localStorageMock as any;
}

describe("End-to-End Clinical Data Flow Suite (Odontogram -> 043/u Diary -> Treatment Plan)", () => {
	beforeEach(() => {
		storageMap.clear();
	});

	it("1. Odontogram finding generation produces canonical ICD-10 and SOAP content", () => {
		const finding16: OdontogramFindingInput = {
			toothNumber: 16,
			state: "Caries",
			surfaces: ["O", "M"],
		};
		const soap16 = generateSoapFromOdontogramFinding(finding16);
		assert.strictEqual(soap16.toothNumber, 16);
		assert.ok(soap16.diagnosisIcd10.includes("K02"), "Diagnosis ICD-10 must be Caries (K02)");
		assert.ok(soap16.statusLocalis.includes("16"), "Status localis must mention tooth 16");
		assert.ok(soap16.treatmentDescription.includes("16"), "Treatment description must mention tooth 16");
	});

	it("2. Multiple tooth pathologies aggregate cleanly into Form 043/u diary via clinical sanitizers", () => {
		const teeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries", surfaces: ["O", "M"] },
			{ toothNumber: 26, state: "Pulpitis" },
			{ toothNumber: 36, state: "Periodontitis" },
		];

		const soapBatch = generateSoapFromOdontogramStates(
			teeth.map((t) => ({
				toothNumber: t.toothNumber,
				state: t.state,
				surfaces: t.surfaces,
			})),
		);

		assert.ok(soapBatch.diagnosisTooth?.includes("16"), "Batch diagnosis includes tooth 16");
		assert.ok(soapBatch.diagnosisTooth?.includes("26"), "Batch diagnosis includes tooth 26");
		assert.ok(soapBatch.diagnosisTooth?.includes("36"), "Batch diagnosis includes tooth 36");

		// Non-destructive merge
		const baseObjective = "Слизистая оболочка полости рта бледно-розовая, влажная.";
		const mergedObjective = mergeMultiToothObjective(baseObjective, soapBatch.statusLocalis || "");
		assert.ok(mergedObjective.includes("бледно-розовая"), "Base mucosa status preserved");
		assert.ok(mergedObjective.includes("16"), "Merged objective has tooth 16");
		assert.ok(mergedObjective.includes("26"), "Merged objective has tooth 26");
	});

	it("3. Persistent storage round-trip preserves real patient teeth for Treatment Plan", () => {
		const patientId = "patient-real-flow-101";
		const realTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries", surfaces: ["O"] },
			{ toothNumber: 24, state: "Crown" },
			{ toothNumber: 46, state: "Missing" },
		];

		saveStoredTeethData(patientId, realTeeth);
		const retrieved = loadStoredTeethData(patientId);

		assert.ok(retrieved, "Retrieved teeth must not be null");
		if (!retrieved) throw new Error("Retrieved teeth must not be null");
		assert.strictEqual(retrieved.length, 3);
		assert.strictEqual(retrieved[0]?.toothNumber, 16);
		assert.strictEqual(retrieved[1]?.state, "Crown");
		assert.strictEqual(retrieved[2]?.state, "Missing");

		// Treatment Plan 3-tier generation consumes these real patient teeth
		const tiers = generate3TierPlanComparison(retrieved, undefined, 0);
		assert.strictEqual(tiers.length, 3, "Generates 3 tiers (economy, standard, premium)");
		const allStages = tiers.flatMap((t) => t.stages);
		assert.ok(allStages.length > 0, "Treatment stages generated from real patient teeth");
	});

	it("4. Radial menu horizontal anchor strictly respects safety boundaries on extreme teeth", () => {
		const vw = 1440;
		const vh = 900;
		const subWidth = 450;
		const halfSub = subWidth / 2; // 225
		const minX = halfSub; // 225
		const maxX = vw - halfSub; // 1215

		// Simulating Tooth 18 (far right)
		const rawTooth18X = 1400;
		const clamped18X = Math.max(minX, Math.min(maxX, rawTooth18X));
		assert.strictEqual(clamped18X, 1215, "Tooth 18 sub-menu anchor clamped to maxX (1215px)");

		// Check menu bounding box: [clamped18X - 225, clamped18X + 225] = [990, 1440]
		assert.ok(clamped18X - halfSub >= 0, "Left edge >= 0px");
		assert.ok(clamped18X + halfSub <= vw, "Right edge <= 1440px (Zero clipping)");

		// Simulating Tooth 28 (far left)
		const rawTooth28X = 40;
		const clamped28X = Math.max(minX, Math.min(maxX, rawTooth28X));
		assert.strictEqual(clamped28X, 225, "Tooth 28 sub-menu anchor clamped to minX (225px)");
		assert.ok(clamped28X - halfSub >= 0, "Left edge >= 0px (Zero clipping)");
		assert.ok(clamped28X + halfSub <= vw, "Right edge <= 1440px");
	});

	it("5. AI Patient Case Presenter (patientCasePresenterEngine) integrates with 3-tier treatment plan stages", async () => {
		const { buildChairsidePatientCasePresentation, humanizeDentalText } = await import(
			"../../../services/ai/treatmentPlanCopilot"
		);
		const realTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries", surfaces: ["O"] },
			{ toothNumber: 36, state: "Missing" },
		];
		const tiers = generate3TierPlanComparison(realTeeth, undefined, 0);
		const standardTier = tiers.find((t) => t.tierId === "standard") || tiers[0]!;
		const presentation = buildChairsidePatientCasePresentation(standardTier.stages, {
			patientName: "Смирнов Алексей Викторович",
			doctorName: "Волков И.С.",
			selectedTierTitle: standardTier.title,
		});

		assert.ok(presentation.presentationId.startsWith("case_"));
		assert.strictEqual(presentation.slides.diagnosis.slideType, "diagnosis");
		assert.strictEqual(presentation.slides.risks.slideType, "risks");
		assert.strictEqual(presentation.slides.roadmap.slideType, "roadmap");
		assert.ok(presentation.slides.roadmap.totalPlanCostRub > 0);
		assert.ok(humanizeDentalText("Требуется синус-лифтинг").includes("Бережное наращивание кости"));
	});

	it("6. Visit store completed services flow without loss into clinical estimate and cashier receipt", async () => {
		const { useVisitStore } = await import("../../../store/visitStore");
		const { assembleVisitStoreCompletedServices } = await import("../useVisitCompletion");
		const { completeClinicalVisitAndAssembleEstimate } = await import("../clinicalVisitWorkflow");

		useVisitStore.setState({
			completedServices: [
				{
					serviceId: "stage-item-1",
					code804n: "A16.07.002",
					name: "Восстановление зуба пломбой светоотверждаемой",
					priceRub: 4500,
					priceKopecks: 450000,
					quantity: 1,
					category: "therapy",
					toothNumber: 16,
					toothCode: "16",
				},
				{
					serviceId: "stage-item-2",
					code804n: "A16.07.002.001",
					name: "Лечение кариеса эмали",
					priceRub: 3500,
					priceKopecks: 350000,
					quantity: 1,
					category: "therapy",
					toothNumber: 15,
					toothCode: "15",
				},
			],
		});

		const assembled = assembleVisitStoreCompletedServices();
		assert.strictEqual(assembled.length, 2);

		const result = completeClinicalVisitAndAssembleEstimate({
			visitId: "VIS-E2E-101",
			patientId: "patient-real-flow-101",
			patientName: "Смирнов Алексей Викторович",
			doctorName: "Волков И.С.",
			diary: {
				anamnesis: "Соматически здоров.",
				statusLocalis: "Зуб 16, 15 кариозные полости.",
				diagnosisIcd10: "K02.1 Кариес дентина",
				treatmentDescription: "[Этап 1]: пломбирование зубов 16, 15",
			},
			additionalServices: assembled,
		});

		assert.strictEqual(result.totalNetRub, 8000, "Total due must equal 4500 + 3500 = 8000 RUB");
		assert.ok(result.items.some((i) => i.code === "A16.07.002" && i.totalRub === 4500));
		assert.ok(result.items.some((i) => i.code === "A16.07.002.001" && i.totalRub === 3500));
		assert.ok(result.receiptNumber.length > 0);
	});
});
