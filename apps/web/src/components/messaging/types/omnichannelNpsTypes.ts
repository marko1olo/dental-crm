/**
 * omnichannelNpsTypes.ts — Контракты метрик NPS, оценок и триажа отзывов.
 * Строго <= 120 строк по Мандату 8b.
 */

export type NpsCategory = "promoter" | "neutral" | "detractor";
export type NpsUrgency = "critical" | "high" | "medium" | "low";
export type NpsReviewStatus = "pending" | "in_progress" | "resolved" | "thanked" | "ignored";

export interface NpsReview {
	readonly id: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly phone: string;
	readonly score: number; // 0..10
	readonly category: NpsCategory;
	readonly urgency: NpsUrgency;
	readonly comment: string;
	readonly doctorName: string;
	readonly serviceName: string;
	readonly createdAt: string;
	readonly status: NpsReviewStatus;
	readonly resolutionNote?: string | undefined;
	readonly resolvedBy?: string | undefined;
}

export interface NpsMetrics {
	readonly totalReviews: number;
	readonly npsScore: number; // -100 to +100
	readonly promotersCount: number;
	readonly promotersPct: number;
	readonly neutralsCount: number;
	readonly neutralsPct: number;
	readonly detractorsCount: number;
	readonly detractorsPct: number;
	readonly averageScore: number;
	readonly criticalPendingCount: number;
}
