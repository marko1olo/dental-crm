/**
 * marketingTypes.ts — Domain Contracts & Types for DENTE Clinic Marketing & Promotions.
 * Governed by Mandate 8b, 8c, 8e, 8n (Anti-Void, 2-Column Balance, Medical Density).
 */

export type PromoStatus = "active" | "archived" | "paused";

export type MessageChannel = "sms" | "whatsapp" | "telegram";

export interface PromoStats {
	readonly reach: number;
	readonly delivered: number;
	readonly deliveredPercent: number;
	readonly visits: number;
	readonly conversionPercent: number;
	readonly revenueRub: number;
	readonly budgetSpentRub: number;
	readonly romiPercent: number;
}

export interface PromoTemplates {
	readonly sms: string;
	readonly whatsapp: string;
	readonly telegram: string;
}

export interface MarketingPromo {
	readonly id: string;
	readonly title: string;
	readonly badge: string;
	readonly status: PromoStatus;
	readonly category: string;
	readonly discountText: string;
	readonly promoCode: string;
	readonly validUntil: string;
	readonly minInvoiceRub: number;
	readonly description: string;
	readonly conditions: readonly string[];
	readonly stats: PromoStats;
	readonly templates: PromoTemplates;
	readonly recommendedSegment: string;
	readonly createdAt: string;
}

export interface PatientSegmentOption {
	readonly id: string;
	readonly name: string;
	readonly count: number;
	readonly description: string;
}
