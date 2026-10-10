/**
 * sentinelEngineCore.ts — Main Chairside Sentinel Evaluation Pipeline.
 *
 * Layer 3: Sentinel Engine Core Orchestration.
 * - Multi-step autonomous action chain:
 *     Step 1: check_drug_interaction (drug-drug, allergies, somatic contraindications).
 *     Step 2: generate_visit_diary (043/у SOAP note compliant with Russian StAR protocols).
 *     Step 3: calculate_order_804n (statutory Order 804n package in integer kopecks).
 *     Step 4: assemble_proactive_card (unified draft ready for 1-click apply).
 * - Mandate 8e (Doctor Autonomy): zero blocking disabled buttons, 1-click draft application.
 */

import {
	calculateOrder804nPackage,
	detectClinicalCategory,
	formatFdiTooth,
	generateSoapDiary,
	getCanalsForTooth,
	parseFdiTooth,
} from "./protocolCompletenessRules.js";
import { checkDrugInteractionsAndSomatic } from "./somaticGuardRules.js";
import type {
	ChairsideActionChainStep,
	ChairsideOrder804nItem,
	ChairsideSentinelAnalysisResult,
	ChairsideSoapDiary,
	ChairsideVisitContextInput,
	ClinicalCategoryDetectionResult,
	DrugAndSomaticCheckResult,
	Order804nCalculationParams,
	SoapDiaryGenerationParams,
} from "./types.js";

export class ChairsideSentinelEngine {
	/**
	 * Analyzes clinical visit context at chairside:
	 * 1. Checks allergies and somatic history for drug conflicts & contraindications.
	 * 2. Parses tooth number and ICD-10 diagnosis.
	 * 3. Generates 043/у SOAP diary draft according to StAR protocols.
	 * 4. Assembles recommended Order 804n services package with integer kopecks.
	 * 5. Builds unified autonomous draft ready for 1-click application.
	 */
	public async analyzeVisitContext(
		visitData: ChairsideVisitContextInput,
	): Promise<ChairsideSentinelAnalysisResult> {
		const actionChain: ChairsideActionChainStep[] = [];
		const now = new Date().toISOString();

		// ─── STEP 0: PARSE TOOTH AND DIAGNOSIS CONTEXT ──────────────────────────
		let resolvedTooth = parseFdiTooth(visitData.toothNumber);

		if (!resolvedTooth && visitData.diagnoses) {
			for (const diag of visitData.diagnoses) {
				const candidate = parseFdiTooth(diag);
				if (candidate) {
					resolvedTooth = candidate;
					break;
				}
			}
		}
		if (!resolvedTooth && visitData.complaints) {
			resolvedTooth = parseFdiTooth(visitData.complaints);
		}

		const canalCount = getCanalsForTooth(resolvedTooth);
		const { primaryIcd10, diagnosisName, clinicalCategory } =
			this.detectClinicalCategory(visitData.diagnoses, visitData.complaints);

		// ─── STEP 1: CHECK DRUG INTERACTIONS, ALLERGIES & SOMATICS ───────────────
		const { alerts, somaticStatus, allergiesStatus, isPhysiologicalNorm } =
			this.checkDrugInteractionsAndSomatic(
				visitData.allergies || [],
				visitData.somaticHistory || [],
				visitData.activeServices || [],
			);

		actionChain.push({
			step: "check_drug_interaction",
			description:
				"Проверка лекарственных конфликтов, аллергий и соматического статуса",
			status: "completed",
			timestamp: now,
			details: {
				alertsCount: alerts.length,
				isPhysiologicalNorm,
				somaticStatus,
				allergiesStatus,
			},
		});

		// ─── STEP 2: GENERATE VISIT DIARY (SOAP 043/У) ───────────────────────────
		const soapDiary = this.generateSoapDiary({
			toothNumber: resolvedTooth,
			canalCount,
			primaryIcd10,
			diagnosisName,
			clinicalCategory,
			complaints: visitData.complaints,
			somaticStatus,
			allergiesStatus,
		});

		actionChain.push({
			step: "generate_visit_diary",
			description:
				"Генерация проекта SOAP-дневника 043/у по клиническим протоколам СтАР",
			status: "completed",
			timestamp: now,
			details: {
				icd10: primaryIcd10,
				tooth: resolvedTooth,
			},
		});

		// ─── STEP 3: CALCULATE ORDER 804N BILLING PACKAGE ────────────────────────
		const order804nServices = this.calculateOrder804nPackage({
			toothNumber: resolvedTooth,
			canalCount,
			clinicalCategory,
			primaryIcd10,
		});

		let totalRub = 0;
		let totalKopecks = 0;
		for (const s of order804nServices) {
			totalRub += s.totalRub;
			totalKopecks += s.totalKopecks;
		}

		actionChain.push({
			step: "calculate_order_804n",
			description: "Подбор актуальных кодов и расчет сметы услуг",
			status: "completed",
			timestamp: now,
			details: {
				servicesCount: order804nServices.length,
				totalRub,
				totalKopecks,
			},
		});

		// ─── STEP 4: ASSEMBLE PROACTIVE RECOMMENDATION CARD ──────────────────────
		const mode = visitData.mode ?? "autonomous";
		const autoApprovedDraft = mode === "autonomous";
		const status = autoApprovedDraft
			? "auto_approved_draft"
			: "draft_pending_review";

		actionChain.push({
			step: "assemble_proactive_card",
			description:
				"Сборка единой карточки визита у кресла (готово к применению в 1 клик)",
			status: "completed",
			timestamp: now,
			details: {
				mode,
				status,
			},
		});

		return {
			patientId: visitData.patientId,
			toothNumber: resolvedTooth,
			fdiToothFormatted: formatFdiTooth(resolvedTooth),
			mode,
			status,
			autoApprovedDraft,
			readyForOneClickApply: true,
			doctorAutonomyGuaranteed: true,
			somaticStatus,
			allergiesStatus,
			isPhysiologicalNorm,
			alerts,
			soapDiary,
			order804n: {
				services: order804nServices,
				totalRub,
				totalKopecks,
				formattedTotal: `${totalRub.toLocaleString("ru-RU")} ₽`,
			},
			actionChain,
		};
	}

	private checkDrugInteractionsAndSomatic(
		allergies: string[],
		somaticHistory: string[],
		activeServices: string[],
	): DrugAndSomaticCheckResult {
		return checkDrugInteractionsAndSomatic(
			allergies,
			somaticHistory,
			activeServices,
		);
	}

	private detectClinicalCategory(
		diagnoses?: string[],
		complaints?: string,
	): ClinicalCategoryDetectionResult {
		return detectClinicalCategory(diagnoses, complaints);
	}

	private generateSoapDiary(
		params: SoapDiaryGenerationParams,
	): ChairsideSoapDiary {
		return generateSoapDiary(params);
	}

	private calculateOrder804nPackage(
		params: Order804nCalculationParams,
	): ChairsideOrder804nItem[] {
		return calculateOrder804nPackage(params);
	}
}

export const defaultChairsideSentinel = new ChairsideSentinelEngine();
