/**
 * types.ts
 *
 * Типы этапов, планов послеоперационного теле-ухода и интерфейсы триажа
 * для пайплайна послеоперационного теле-мониторинга DENTE.
 */

import type {
	TelegramInlineKeyboard,
	TriageScreenResult,
} from "../TelegramInteractiveTriageService.js";

export type { TelegramInlineKeyboard, TriageScreenResult };

export type PostOpStage = "3_hours" | "day_1" | "day_3" | "day_7";

export type PostOpStageItem = {
	stage: PostOpStage;
	dueAt: number; // timestamp ms
	status: "pending" | "sent" | "answered" | "skipped";
	sentAt?: number | undefined;
	answeredAt?: number | undefined;
	patientResponse?: unknown | undefined;
};

export type PostOpCarePlan = {
	id: string;
	organizationId: string;
	clinicId?: string | null | undefined;
	visitId: string;
	patientId: string;
	doctorId?: string | null | undefined;
	chatFingerprint?: string | null | undefined;
	telegramChatId?: string | null | undefined;
	surgeryTitle: string;
	surgeryCompletedAt: number; // timestamp ms
	stages: PostOpStageItem[];
	isEmergencyTriggered?: boolean | undefined;
	createdAt: number;
};

export type SchedulePostOpCareParams = {
	organizationId: string;
	clinicId?: string | null | undefined;
	visitId: string;
	patientId: string;
	doctorId?: string | null | undefined;
	surgeryTitle: string;
	surgeryCompletedAt?: number | undefined;
	chatFingerprint?: string | null | undefined;
	telegramChatId?: string | null | undefined;
};

export type SchedulePostVisitSurveyParams = {
	organizationId: string;
	clinicId?: string | null | undefined;
	visitId: string;
	patientId: string;
	doctorId?: string | null | undefined;
	appointmentId?: string | null | undefined;
	diagnosis?: string | null | undefined;
	treatmentPlan?: string | null | undefined;
	complaint?: string | null | undefined;
	objectiveStatus?: string | null | undefined;
	doctorSummary?: string | null | undefined;
};

export type SchedulePostVisitSurveyResult = {
	isSurgery: boolean;
	scheduled: boolean;
	taskId?: string | null | undefined;
	planId?: string | null | undefined;
};

export type HandlePostOpCallbackParams = {
	callbackData: string;
	callbackQueryId: string | null;
	chatFingerprint: string;
	chatId: string;
	messageId: number | null;
	botToken: string;
	organizationId: string;
	clinicId?: string | null | undefined;
};

export type HandlePostOpCallbackResult = {
	handled: boolean;
	screen?: TriageScreenResult | undefined;
	isEmergency?: boolean | undefined;
};

export type SymptomTriageEvaluationResult = {
	targetScreen: TriageScreenResult | null;
	isEmergency: boolean;
};

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (val: string | null | undefined): val is string =>
	typeof val === "string" && UUID_REGEX.test(val);
