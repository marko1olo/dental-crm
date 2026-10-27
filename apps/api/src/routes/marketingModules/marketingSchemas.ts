/**
 * marketingSchemas.ts — Layer 0: Zod-схемы и DTO маркетинговой сквозной аналитики,
 * UTM-кампаний, каналов привлечения и когортного анализа (Фичи #28 и #35).
 */

import { z } from "zod";
import {
	patientFieldRequirementsSchema,
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
} from "@dental/shared";

export { patientFieldRequirementsSchema, DEFAULT_PATIENT_FIELD_REQUIREMENTS };

/** Zod-схема параметров UTM метки */
export const marketingUtmSchema = z.object({
	utm_source: z.string().optional().default(""),
	utm_medium: z.string().optional().default(""),
	utm_campaign: z.string().optional().default(""),
	utm_content: z.string().optional().default(""),
	utm_term: z.string().optional().default(""),
});

export type MarketingUtmParams = z.infer<typeof marketingUtmSchema>;

/** Строгий реляционный енам каналов привлечения (Мандат 8ap) */
export const relationalMarketingChannelEnum = z.enum([
	"referral", // сарафан (рекомендации, родственники)
	"maps", // Яндекс Карты / 2ГИС
	"website", // онлайн-запись (сайт клиники)
	"telephony", // АТС (входящие вызовы)
	"partner", // страховая / партнеры
]);

export type RelationalMarketingChannel = z.infer<typeof relationalMarketingChannelEnum>;

/** Допустимые идентификаторы каналов привлечения */
export const marketingChannelKeySchema = z.enum([
	"referral",
	"maps",
	"website",
	"telephony",
	"partner",
	"website_widget",
	"yandex_maps",
	"gis_2",
	"prodoctorov",
	"tg_bot",
	"wa_bot",
]);

export type MarketingChannelKey = z.infer<typeof marketingChannelKeySchema>;

/** Статистика отдельного канала онлайн-самозаписи */
export const channelStatsSchema = z.object({
	key: z.string(),
	nameRu: z.string(),
	categoryRu: z.string(),
	isOnlineSelfBooking: z.boolean().default(true),
	viewsCount: z.number().int().nonnegative(),
	slotSelectedCount: z.number().int().nonnegative(),
	bookingsCount: z.number().int().nonnegative(),
	attendedCount: z.number().int().nonnegative(),
	noShowCount: z.number().int().nonnegative(),
	paidPatientsCount: z.number().int().nonnegative(),
	revenueKopecks: z.number().int().nonnegative(),
	spentKopecks: z.number().int().nonnegative(),
	romiPercent: z.number(),
	cacKopecks: z.number().int().nonnegative(),
});

export type ChannelStats = z.infer<typeof channelStatsSchema>;

/** Статистика воронки регистратуры и звонков */
export const telephonyAdminFunnelSchema = z.object({
	incomingCallsCount: z.number().int().nonnegative(),
	answeredCallsCount: z.number().int().nonnegative(),
	bookedAppointmentsCount: z.number().int().nonnegative(),
	attendedCount: z.number().int().nonnegative(),
	noShowCount: z.number().int().nonnegative(),
	paidPatientsCount: z.number().int().nonnegative(),
	revenueKopecks: z.number().int().nonnegative(),
	spentKopecks: z.number().int().nonnegative(),
	avgCallDurationSeconds: z.number().int().nonnegative(),
	attendanceRatePercent: z.number(),
	conversionCallToBookingPercent: z.number(),
});

export type TelephonyAdminFunnel = z.infer<typeof telephonyAdminFunnelSchema>;

/** Атрибуция отдельного пациента с защитой ПДн (152-ФЗ / 323-ФЗ) */
export const patientAttributionItemSchema = z.object({
	id: z.string(),
	patientId: z.string(),
	patientFullName: z.string(),
	phone: z.string(),
	createdAtIso: z.string(),
	channelKey: z.string(),
	channelNameRu: z.string(),
	categoryRu: z.string(),
	utm: marketingUtmSchema.optional(),
	externalIds: z.record(z.string(), z.unknown()).default({}),
	currentStage: z.enum(["call", "booked", "attended", "paid_plan"]),
	totalPaidKopecks: z.number().int().nonnegative(),
	treatmentPlanTitle: z.string(),
	notes: z.string().optional(),
});

export type PatientAttributionItem = z.infer<typeof patientAttributionItemSchema>;

/** Сводка маркетинговой атрибуции */
export const marketingAttributionSummarySchema = z.object({
	totalOnlineBookings: z.number().int().nonnegative(),
	totalOnlineAttended: z.number().int().nonnegative(),
	totalOnlineRevenueKopecks: z.number().int().nonnegative(),
	totalOnlineSpentKopecks: z.number().int().nonnegative(),
	onlineSharePercent: z.number(),
	adminSharePercent: z.number(),
	savedAdminHours: z.number(),
});

export type MarketingAttributionSummary = z.infer<typeof marketingAttributionSummarySchema>;

/** Полный ответ эндпоинта /api/marketing/attribution */
export const marketingAttributionResponseSchema = z.object({
	organizationId: z.string(),
	selfBookingChannels: z.array(channelStatsSchema),
	telephonyAdminFunnel: telephonyAdminFunnelSchema,
	attributions: z.array(patientAttributionItemSchema),
	summary: marketingAttributionSummarySchema,
});

export type MarketingAttributionResponse = z.infer<typeof marketingAttributionResponseSchema>;

/** Шаг воронки онлайн-самозаписи */
export const funnelStepSchema = z.object({
	stage: z.string(),
	title: z.string(),
	count: z.number().int().nonnegative(),
	dropoffPercent: z.number(),
});

export type FunnelStep = z.infer<typeof funnelStepSchema>;

/** Ответ пошаговой воронки онлайн-самозаписи */
export const onlineBookingFunnelResponseSchema = z.object({
	steps: z.array(funnelStepSchema),
	overallConversionPercent: z.number(),
	attendanceRatePercent: z.number(),
	totalRevenueKopecks: z.number().int().nonnegative(),
});

export type OnlineBookingFunnelResponse = z.infer<typeof onlineBookingFunnelResponseSchema>;

/** Параметры запроса сводных маркетинговых отчетов */
export const marketingReportsQuerySchema = z.object({
	format: z.enum(["json", "csv"]).optional().default("json"),
});

export type MarketingReportsQuery = z.infer<typeof marketingReportsQuerySchema>;

/** Когортный анализ маркетинга */
export const marketingCohortSchema = z.object({
	cohortMonth: z.string(), // YYYY-MM
	channelKey: z.string(),
	initialLeads: z.number().int().nonnegative(),
	firstMonthAttended: z.number().int().nonnegative(),
	activePatientsM3: z.number().int().nonnegative(),
	activePatientsM6: z.number().int().nonnegative(),
	retentionRatePercent: z.number(),
	totalRevenueKopecks: z.number().int().nonnegative(),
	ltvKopecks: z.number().int().nonnegative(),
	cacKopecks: z.number().int().nonnegative(),
	romiPercent: z.number(),
});

export type MarketingCohort = z.infer<typeof marketingCohortSchema>;
