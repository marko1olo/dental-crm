/**
 * DENTE CRM — Treatment Plan Roadmap Types & Data Contracts
 * (Layer 0: Types & DTOs — 0 runtime dependencies)
 */

import type React from "react";
import type {
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "../types.js";

export type RoadmapStageKind =
	| "stage_1_emergency"
	| "stage_2_therapy"
	| "stage_3_surgery"
	| "stage_4_orthopedics"
	| "stage_5_hygiene_checkup";

export interface RoadmapProcedureItem {
	id: string;
	code804n?: string | undefined;
	medicalTitleRu: string;
	patientFriendlyTitleRu: string;
	toothNumber?: number | string | undefined;
	toothFdi?: string | undefined;
	priceRub: number;
	priceKopecks: number;
	quantity: number;
	isCompleted?: boolean | undefined;
	doctorName?: string | undefined;
	categoryCode?: "1" | "2" | undefined; // 1 = standard, 2 = expensive (surgery/implant)
}

export interface RoadmapStageData {
	stageNumber: 1 | 2 | 3 | 4 | 5;
	stageKind: RoadmapStageKind;
	titleRu: string;
	subtitleRu: string;
	patientGoalRu: string;
	timelineRu: string;
	preparationRu: string;
	warrantyRu: string;
	status: "completed" | "in_progress" | "planned";
	teethFdiList: string[];
	procedures: RoadmapProcedureItem[];
	totalRub: number;
	totalKopecks: number;
	completedRub: number;
	completedKopecks: number;
	remainingRub: number;
	remainingKopecks: number;
	estimatedVisitsCount: number;
	targetMonthRu?: string;
	paidRub?: number | undefined;
	paidKopecks?: number | undefined;
	isFullyPaid?: boolean | undefined;
}

export interface RoadmapStageMeta {
	stageNumber: 1 | 2 | 3 | 4 | 5;
	titleRu: string;
	subtitleRu: string;
	patientGoalRu: string;
	timelineRu: string;
	preparationRu: string;
	warrantyRu: string;
	icon: React.ReactNode;
}

export interface TreatmentPlanRoadmapProps {
	tier?: TreatmentPlanTier | undefined;
	stages?: readonly TreatmentPlanStage[] | undefined;
	customRoadmapStages?: readonly RoadmapStageData[] | undefined;
	planTitle?: string | undefined;
	planNumber?: string | undefined;
	planId?: string | undefined;
	patientId?: string | undefined;
	curatingDoctorName?: string | undefined;
	doctorName?: string | undefined;
	patientFullName?: string | undefined;
	patientName?: string | undefined;
	clinicName?: string | undefined;
	displayContractNumber?: string | undefined;
	todayRu?: string | undefined;
	getTierLetter?: ((tierId: TreatmentPlanTierId) => string) | undefined;
	onPrint?: (() => void) | undefined;
	onConfirmPatientChoice?: (() => void) | undefined;
	onBookStage?: ((stage: RoadmapStageData) => void) | undefined;
	onSelectStage?: ((stage: RoadmapStageData) => void) | undefined;
	onBookStageSlot?: ((stageNumber: number, stage: RoadmapStageData) => void) | undefined;
	onRequestTaxCertificate?: (() => void) | undefined;
	className?: string | undefined;
}
