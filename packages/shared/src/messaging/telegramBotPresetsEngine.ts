import { z } from "zod";
import type { TelegramInlineButton } from "./omnichannelBotEngine.js";

// ============================================================================
// ИДЕНТИФИКАТОРЫ И ТИПЫ ПРЕСЕТОВ TELEGRAM-БОТОВ CLINIC MVP (DENTE)
// ============================================================================

export const telegramBotPresetIdSchema = z.enum([
	"premium_implants",
	"family_pediatric",
	"orthodontics",
	"solo_doctor",
	"universal_clinic",
]);
export type TelegramBotPresetId = z.infer<typeof telegramBotPresetIdSchema>;

export const telegramInlineButtonSchema = z.object({
	text: z.string().min(1),
	callback_data: z.string().optional(),
	url: z.string().optional(),
});
export type { TelegramInlineButton };

export const telegramBotCommandItemSchema = z.object({
	command: z.string().regex(/^[a-z0-9_]{1,32}$/),
	description: z.string().min(1).max(256),
});
export type TelegramBotCommandItem = z.infer<typeof telegramBotCommandItemSchema>;

export const telegramInPlaceScreenSchema = z.object({
	id: z.string(),
	title: z.string(),
	text: z.string(),
	parentScreenId: z.string().nullable().optional(),
	buttons: z.array(z.array(telegramInlineButtonSchema)),
});
export type TelegramInPlaceScreen = z.infer<typeof telegramInPlaceScreenSchema>;

export const telegramBotPresetMetadataSchema = z.object({
	id: telegramBotPresetIdSchema,
	name: z.string(),
	tagline: z.string(),
	icon: z.string(),
	targetClinicProfile: z.string(),
	description: z.string(), // Для Telegram setMyDescription
	shortDescription: z.string(), // Для Telegram setMyShortDescription
	commands: z.array(telegramBotCommandItemSchema),
	welcomeText: z.string(),
	screens: z.record(z.string(), telegramInPlaceScreenSchema),
});
export type TelegramBotPresetMetadata = z.infer<typeof telegramBotPresetMetadataSchema>;

// ============================================================================
// ТРИАЖ СИМПТОМОВ И CITO ЭКСТРЕННЫЙ ПРОТОКОЛ
// ============================================================================

export const triageSymptomKeySchema = z.enum([
	"acute_pain_cito",
	"broken_tooth_restoration",
	"gum_bleeding_perio",
	"aesthetic_smile_veneers",
	"kids_adaptation_visit",
	"orthodontic_alignment",
	"hygiene_recall",
	"general_consultation",
]);
export type TriageSymptomKey = z.infer<typeof triageSymptomKeySchema>;

export const triageSeveritySchema = z.enum([
	"cito_emergency",
	"urgent_same_day",
	"routine_planned",
]);
export type TriageSeverity = z.infer<typeof triageSeveritySchema>;

export const triageEvaluationResultSchema = z.object({
	severity: triageSeveritySchema,
	isCito: z.boolean(),
	clinicalGuidance: z.string(),
	suggestedSlotType: z.string(),
	firstAidAdvice: z.array(z.string()),
	alertStaffText: z.string().nullable(),
});
export type TriageEvaluationResult = z.infer<typeof triageEvaluationResultSchema>;

// ============================================================================
// ПОСЛЕОПЕРАЦИОННЫЙ ОПРОС (DAY 1 / DAY 3 RECOVERY SURVEY)
// ============================================================================

export const postOpSurveyDaySchema = z.union([z.literal(1), z.literal(3)]);
export type PostOpSurveyDay = z.infer<typeof postOpSurveyDaySchema>;

export const postOpSurveyInputSchema = z.object({
	patientId: z.string().optional(),
	organizationId: z.string().optional(),
	appointmentId: z.string().optional(),
	day: postOpSurveyDaySchema,
	painScore: z.number().int().min(1).max(5),
	hasFever: z.boolean().default(false),
	hasHeavyBleeding: z.boolean().default(false),
	hasSevereSwelling: z.boolean().default(false),
	additionalNotes: z.string().optional(),
});
export type PostOpSurveyInput = z.infer<typeof postOpSurveyInputSchema>;

export const postOpSurveyResultSchema = z.object({
	isCriticalAlert: z.boolean(),
	patientMessage: z.string(),
	alertDoctorText: z.string().nullable(),
	requiresSameDayCallback: z.boolean(),
});
export type PostOpSurveyResult = z.infer<typeof postOpSurveyResultSchema>;

// ============================================================================
// РЕЖИМ «ПОЗВАТЬ ЧЕЛОВЕКА» (HUMAN ESCALATION)
// ============================================================================

export const humanEscalationStatusSchema = z.enum([
	"bot_automated",
	"human_agent_active",
]);
export type HumanEscalationStatus = z.infer<typeof humanEscalationStatusSchema>;
