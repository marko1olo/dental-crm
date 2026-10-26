/**
 * marketingRecallsTypes.ts
 * Type definitions for Marketing Recalls Hub and Patient Prophylaxis Invitations.
 * Governed by Mandate 8b (Strict <= 120 lines).
 */

export type RecallCategoryFilter = "all" | "hygiene" | "ortho" | "implant" | "overdue";

export interface MarketingRecallCandidate {
	readonly id: string;
	readonly patientId: string;
	readonly fullName: string;
	readonly phone: string | null;
	readonly badgeType: "hygiene" | "ortho" | "implant" | "general";
	readonly badgeText: string;
	readonly procedureTitle: string;
	readonly lastVisitDate: string | null;
	readonly monthsSinceLastVisit: number | null;
	readonly attendingDoctorName?: string | null;
	readonly isCalled?: boolean;
}

export interface RecallStatsSummary {
	readonly total: number;
	readonly hygieneCount: number;
	readonly orthoCount: number;
	readonly implantCount: number;
	readonly overdueCount: number;
}
