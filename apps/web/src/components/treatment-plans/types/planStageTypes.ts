/**
 * apps/web/src/components/treatment-plans/types/planStageTypes.ts
 *
 * Контракты клинических этапов, статусов и функций маппинга.
 */

import type { Kopecks } from "@dental/shared";
import type { TreatmentPlanItem } from "./planItemTypes";

export type TreatmentPlanStageKind =
	| "stage_1_therapy"
	| "stage_2_surgery"
	| "stage_3_orthopedics"
	| "stage_4_orthodontics"
	| "stage_5_periodontics"
	| "stage_custom";

export function romanizeStageNumber(num: number): string {
	const romanMap: Record<number, string> = {
		1: "I",
		2: "II",
		3: "III",
		4: "IV",
		5: "V",
		6: "VI",
		7: "VII",
		8: "VIII",
		9: "IX",
		10: "X",
	};
	return romanMap[num] || String(num);
}

export type TreatmentPlanStageStatus = "draft" | "agreed" | "in_progress" | "completed";

export type TreatmentPlanWorkflowStatus =
	| "DRAFT"
	| "PRESENTED"
	| "ACCEPTED"
	| "IN_PROGRESS"
	| "COMPLETED";

export function formatWarrantyYearsText(warrantyYears: number | string): string {
	if (typeof warrantyYears === "string") return warrantyYears;
	if (warrantyYears === 1) return "1 год";
	if (warrantyYears >= 2 && warrantyYears <= 4) return `${warrantyYears} года`;
	return `${warrantyYears} лет`;
}

export function mapWorkflowStatusToDbStatus(
	status: TreatmentPlanWorkflowStatus | string,
): "Draft" | "Active" | "Approved" | "Completed" | "Rejected" {
	const normalized = (status || "").toUpperCase();
	switch (normalized) {
		case "DRAFT":
		case "PRESENTED":
			return "Draft";
		case "ACCEPTED":
		case "AGREED":
		case "APPROVED":
			return "Approved";
		case "IN_PROGRESS":
		case "ACTIVE":
			return "Active";
		case "COMPLETED":
		case "SIGNED":
			return "Completed";
		case "REJECTED":
			return "Rejected";
		default:
			return "Draft";
	}
}

export interface TreatmentPlanStage {
	readonly id?: string | undefined;
	readonly stageNumber: number;
	readonly stageKind: TreatmentPlanStageKind;
	readonly title: string;
	readonly subtitle: string;
	readonly clinicalGoal: string;
	readonly items: readonly TreatmentPlanItem[];
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly estimatedVisits: number;
	readonly estimatedWeeks: number;
	readonly serviceCatalogCodes?: readonly string[] | undefined;
	readonly order804nCodes?: readonly string[] | undefined;
	readonly status?: TreatmentPlanStageStatus | undefined;
	readonly doctorId?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
}

export type TreatmentPlanStageItem = TreatmentPlanItem;
