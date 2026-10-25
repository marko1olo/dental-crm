import type { ReferralRewardPreset } from "../presets/index";

export interface PatientReferralRecord {
	readonly id: string;
	readonly referrerPatientId: string;
	readonly referrerPatientName: string;
	readonly referredPatientName?: string | undefined;
	readonly invitedPatientName?: string | undefined;
	readonly referredPatientPhone?: string | undefined;
	readonly invitedPatientPhone?: string | undefined;
	readonly status: "pending" | "rewarded" | "cancelled" | "registered" | "first_visit_completed" | "reward_credited";
	readonly statusRu?: string | undefined;
	readonly createdAtIso: string;
	readonly rewardKop?: number | undefined;
	readonly rewardRub?: number | undefined;
	readonly firstVisitInvoiceKop?: number | undefined;
	readonly rewardPreset?: ReferralRewardPreset | undefined;
	readonly isRewardCredited?: boolean | undefined;
	readonly rewardedAtIso?: string | undefined;
	readonly noteRu?: string | undefined;
}

export interface CalculateReferralRewardInput {
	readonly friendInvoicePaidKop: number;
	readonly customRewardKop?: number;
	readonly minSpendKop?: number;
}

export interface CalculateReferralRewardResult {
	readonly isEligible: boolean;
	readonly rewardKop: number;
	readonly rewardRub: number;
	readonly referrerBonusKop: number;
	readonly referrerBonusRub: number;
	readonly invitedDiscountKop: number;
	readonly invitedDiscountRub: number;
	readonly missingSpendKop: number;
	readonly explanationRu: string;
	readonly messageRu: string;
}
