/**
 * packages/shared/src/analytics/callTracking/types.ts
 *
 * Types, Zod Schemas & Domain Contracts for Dental Call Tracking & Analytics.
 */

import { z } from "zod";
import type { RomiPerformanceStatus } from "../../marketing/marketingRomiEngine.js";

// ─── 1. UTM PARAMETERS & CALLTRACKING EXTERNAL IDS SCHEMAS ──────────────────

export const utmParametersSchema = z.object({
	utm_source: z.string().optional().default(""),
	utm_medium: z.string().optional().default(""),
	utm_campaign: z.string().optional().default(""),
	utm_content: z.string().optional().default(""),
	utm_term: z.string().optional().default(""),
	referrer: z.string().optional().default(""),
	landingPage: z.string().optional().default(""),
});

export type UtmParameters = z.infer<typeof utmParametersSchema>;

export const externalCallTrackingIdsSchema = z.object({
	calltouchId: z.string().optional(),
	roistatId: z.string().optional(),
	uisId: z.string().optional(),
	comagicId: z.string().optional(),
	mangoCallId: z.string().optional(),
	yandexClientId: z.string().optional(),
	googleClientId: z.string().optional(),
	customSessionId: z.string().optional(),
});

export type ExternalCallTrackingIds = z.infer<typeof externalCallTrackingIdsSchema>;

// ─── 2. PATIENT ATTRIBUTION & CALL RECORD SCHEMAS ────────────────────────────

export type FunnelStage = "click" | "call" | "booked" | "attended" | "paid_plan" | "lost";

export const patientAttributionRecordSchema = z.object({
	id: z.string().min(1),
	patientId: z.string().min(1),
	patientFullName: z.string().min(1),
	phone: z.string().min(1),
	createdAtIso: z.string().min(1),
	channelKey: z.string().min(1),
	channelNameRu: z.string().min(1),
	categoryRu: z.string().default("Реклама"),
	utm: utmParametersSchema.default({}),
	externalIds: externalCallTrackingIdsSchema.default({}),
	currentStage: z.enum(["click", "call", "booked", "attended", "paid_plan", "lost"]),
	sipCallDurationSeconds: z.number().int().nonnegative().optional().default(0),
	sipProvider: z.string().optional().default("mango"),
	doctorName: z.string().optional(),
	specialtyRu: z.string().optional(),
	appointmentDateIso: z.string().optional(),
	treatmentPlanTitle: z.string().optional(),
	totalPaidKopecks: z.number().int().nonnegative().default(0),
	notes: z.string().optional(),
});

export type PatientAttributionRecord = z.infer<typeof patientAttributionRecordSchema>;

// ─── 3. ROMI STATUS & CHANNEL METRIC CONTRACTS ──────────────────────────────

export const advertisingChannelPerformanceInputSchema = z.object({
	id: z.string().min(1),
	channelKey: z.string().min(1),
	nameRu: z.string().min(1, "Укажите название рекламного канала"),
	categoryRu: z.string().default("Реклама"),
	adSpendKopecks: z.number().int().nonnegative("Сумма затрат не может быть отрицательной"),
	clicksCount: z.number().int().nonnegative().default(0),
	callsCount: z.number().int().nonnegative().default(0),
	bookedAppointmentsCount: z.number().int().nonnegative().default(0),
	attendedVisitsCount: z.number().int().nonnegative().default(0),
	paidPlansCount: z.number().int().nonnegative().default(0),
	revenueKopecks: z.number().int().nonnegative("Выручка не может быть отрицательной"),
	notes: z.string().optional(),
});

export type AdvertisingChannelPerformanceInput = z.infer<
	typeof advertisingChannelPerformanceInputSchema
>;

export interface ChannelConversionRates {
	clickToCallRate: number;     // (calls / clicks) * 100%
	callToBookRate: number;      // (booked / calls) * 100%
	bookToAttendRate: number;    // (attended / booked) * 100%
	attendToPaidRate: number;    // (paid / attended) * 100%
	overallConversionRate: number; // (paid / clicks) * 100% or (paid / calls) * 100%
}

export interface AdvertisingChannelPerformanceMetric {
	id: string;
	channelKey: string;
	nameRu: string;
	categoryRu: string;
	adSpendKopecks: number;
	clicksCount: number;
	callsCount: number;
	bookedAppointmentsCount: number;
	attendedVisitsCount: number;
	paidPlansCount: number;
	revenueKopecks: number;
	profitKopecks: number;
	romiPercent: number | null;
	cplKopecks: number | null;
	cpaKopecks: number | null;
	cacKopecks: number | null;
	averageCheckKopecks: number | null;
	conversionRates: ChannelConversionRates;
	romiStatus: RomiPerformanceStatus;
	adSpendFormatted: string;
	revenueFormatted: string;
	profitFormatted: string;
	cplFormatted: string;
	cpaFormatted: string;
	cacFormatted: string;
	averageCheckFormatted: string;
	romiFormatted: string;
	notes?: string | undefined;
}

// ─── 4. SUMMARY FUNNEL CONTRACT ─────────────────────────────────────────────

export interface FunnelStageMetric {
	stage: FunnelStage;
	stageLabelRu: string;
	count: number;
	conversionFromPrevious: number; // %
	conversionFromFirst: number;    // %
	dropOffCount: number;
	dropOffPercent: number;
	unitCostKopecks: number | null;
	unitCostFormatted: string;
}

export interface MarketingFunnelSummary {
	totalChannelsCount: number;
	activeChannelsCount: number;
	totalAdSpendKopecks: number;
	totalClicksCount: number;
	totalCallsCount: number;
	totalBookedAppointmentsCount: number;
	totalAttendedVisitsCount: number;
	totalPaidPlansCount: number;
	totalRevenueKopecks: number;
	totalProfitKopecks: number;
	overallRomiPercent: number | null;
	overallCplKopecks: number | null;
	overallCpaKopecks: number | null;
	overallCacKopecks: number | null;
	overallAverageCheckKopecks: number | null;
	conversionRates: ChannelConversionRates;
	funnelStages: FunnelStageMetric[];
	profitableChannelsCount: number;
	lossChannelsCount: number;
	organicChannelsCount: number;
	topChannelName: string | null;
	totalAdSpendFormatted: string;
	totalRevenueFormatted: string;
	totalProfitFormatted: string;
	overallCplFormatted: string;
	overallCpaFormatted: string;
	overallCacFormatted: string;
	overallAverageCheckFormatted: string;
	overallRomiFormatted: string;
}
