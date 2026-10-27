/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Clinical Visit Workflow Types & Data Contracts
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Типы шагов визита, сметы, смарт-протоколов и автономии врача (Мандат 8e).
 */

import type { DiaryState } from "../../useVisitDiaryLogic";
import type { AutoVisitBomDeductionResult } from "@dental/shared";

export type ProcedureCategory =
	| "anesthesia"
	| "therapy"
	| "endodontics"
	| "surgery"
	| "hygiene"
	| "orthopedics"
	| "diagnostics"
	| "isolation"
	| "other";

export interface ClinicalEstimateItem {
	readonly id: string;
	readonly code?: string | undefined;
	readonly name: string;
	readonly quantity: number;
	readonly priceRub: number;
	readonly discountRub?: number | undefined;
	readonly totalRub: number;
	readonly category: ProcedureCategory;
	readonly toothNumber?: number | string | undefined;
}

export interface ClinicalVisitCompletionInput {
	readonly visitId?: string | undefined;
	readonly appointmentId?: string | undefined;
	readonly treatmentPlanId?: string | null | undefined;
	readonly stageNumber?: number | null | undefined;
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorUserId?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly diary: DiaryState | {
		readonly anamnesis?: string | null;
		readonly statusLocalis?: string | null;
		readonly diagnosisIcd10?: string | null;
		readonly diagnosisTooth?: string | null;
		readonly treatmentDescription?: string | null;
		readonly recommendations?: string | null | undefined;
		readonly order804nServices?: readonly any[] | undefined;
	};
	readonly completedPlanItems?: readonly any[] | undefined;
	readonly additionalServices?: readonly ClinicalEstimateItem[] | undefined;
	readonly discountPercent?: number | undefined;
	readonly completionMode?: "standard" | "aborted" | "rescheduled" | "emergency_interrupted" | undefined;
	readonly interruptionReason?: string | undefined;
	readonly rescheduledDateIso?: string | undefined;
}

export type ClinicalVisitStatus =
	| "ready_for_payment"
	| "completed"
	| "aborted"
	| "rescheduled"
	| "emergency_interrupted";

export interface ClinicalVisitCompletionResult {
	readonly visitId: string;
	readonly invoiceId: string;
	readonly receiptNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorName: string;
	readonly totalGrossRub: number;
	readonly totalDiscountRub: number;
	readonly totalNetRub: number;
	readonly totalNetKop: number;
	readonly items: readonly ClinicalEstimateItem[];
	readonly status: ClinicalVisitStatus;
	readonly statusBannerText: string;
	readonly sbpQrUrl: string;
	readonly sbpQrPayload: string;
	readonly form043uSaved: boolean;
	readonly completedAtIso: string;
	readonly materialsDeduction?: AutoVisitBomDeductionResult | undefined;
	readonly isAbortedOrRescheduled?: boolean | undefined;
	readonly interruptionReason?: string | undefined;
	readonly rescheduledDateIso?: string | undefined;
}

export interface StandardPriceItem {
	readonly code: string;
	readonly name: string;
	readonly priceRub: number;
	readonly category: ProcedureCategory;
}

export interface AbortOrRescheduleVisitInput {
	readonly visitId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly mode: "aborted" | "rescheduled" | "emergency_interrupted";
	readonly reason: string;
	readonly rescheduledDateIso?: string | undefined;
	readonly diary?: Partial<DiaryState> | undefined;
	readonly performedItems?: readonly ClinicalEstimateItem[] | undefined;
}

export type ChairsideSmartProtocolKey =
	| "caries"
	| "pulpitis"
	| "periodontitis"
	| "hygiene"
	| "extraction"
	| "extraction_complex"
	| "implant_standard"
	| "sinus_gbr"
	| "ortho_wire_change"
	| "ortho_aligner_activation"
	| "ortho_bracket_control";

export const CHAIRSIDE_SMART_PROTOCOL_KEYS: readonly ChairsideSmartProtocolKey[] = [
	"caries",
	"pulpitis",
	"periodontitis",
	"hygiene",
	"extraction",
];

export const ALL_CHAIRSIDE_SMART_PROTOCOL_KEYS: readonly ChairsideSmartProtocolKey[] = [
	"caries",
	"pulpitis",
	"periodontitis",
	"hygiene",
	"extraction",
	"extraction_complex",
	"implant_standard",
	"sinus_gbr",
	"ortho_wire_change",
	"ortho_aligner_activation",
	"ortho_bracket_control",
];

export interface ChairsideSmartProtocolResult {
	readonly key: ChairsideSmartProtocolKey;
	readonly icd10: string;
	readonly code?: string | undefined;
	readonly title: string;
	readonly diagnosis: string;
	readonly complaint: string;
	readonly anamnesis: string;
	readonly objectiveStatus: string;
	readonly treatmentPlan: string;
	readonly recommendations: string;
	readonly targetTooth?: number | null | undefined;
}

/**
 * Этапы клинического приёма врача-стоматолога.
 */
export type ClinicalWorkflowStep =
	| "intake"          // 1. Опрос, анамнез, соматический статус
	| "examination"     // 2. Осмотр, статус локалис, одонтограмма
	| "anesthesia"      // 3. Анестезия, подготовка поля
	| "protocol"        // 4. Дневник лечения, протокол лечения / манипуляции
	| "recommendations" // 5. Назначения и рецепты
	| "fiscalization"   // 6. Смета, касса, оплата и чек
	| "auto_deduction"; // 7. Фоновое списание материалов BOM

export interface ClinicalWorkflowStepValidationResult {
	readonly isValid: boolean;
	readonly softFocusFieldId?: string | undefined;
	readonly guidingHint?: string | undefined;
	readonly safeDefaultsApplied?: boolean | undefined;
	readonly resolvedData: Record<string, any>;
}
