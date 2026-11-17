import { createHmac } from "node:crypto";
import type {
	AppointmentStatus,
	DenteTelegramChatLink,
	DenteTelegramTemplateKind,
	DenteTelegramBotSettings,
} from "@dental/shared";
import type {
	DenteTelegramAppointmentCallbackAction,
	DenteTelegramAppointmentCallbackScope,
} from "./types.js";
import {
	denteTelegramChatLinks,
	clinicProfile,
} from "./storeState.js";
import {
	configuredTelegramBotConfigId,
	denteTelegramBotSettings,
	safeTelegramBotUsername,
	denteTelegramBotConfigIdForSettings,
} from "./botSettings.js";

const denteTelegramAppointmentCallbackCodes: Record<
	DenteTelegramAppointmentCallbackAction,
	string
> = {
	confirm: "c",
	reschedule: "r",
	call_request: "p",
};

function denteTelegramCallbackSecret(): string | null {
	return (
		process.env.DENTE_TELEGRAM_CALLBACK_SECRET?.trim() ||
		process.env.DENTE_TELEGRAM_WEBHOOK_SECRET?.trim() ||
		null
	);
}

export function denteTelegramAppointmentCallbacksReady(): boolean {
	return Boolean(denteTelegramCallbackSecret());
}

export function normalizeDenteTelegramAppointmentCallbackScope(
	scope: DenteTelegramAppointmentCallbackScope | undefined,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): { organizationId: string; clinicId: string; botConfigId: string } {
	const organizationId =
		scope?.organizationId?.trim() ||
		settings.organizationId ||
		denteTelegramBotSettings.organizationId;
	const clinicId = scope?.clinicId?.trim() || organizationId;
	const settingsBotUsername = safeTelegramBotUsername(
		settings.mode === "clinic_owned_bot"
			? settings.ownBotUsername
			: settings.botUsername,
	);
	const botConfigId =
		scope?.botConfigId?.trim() ||
		denteTelegramBotConfigIdForSettings(settings, settingsBotUsername);
	return { organizationId, clinicId, botConfigId };
}

function denteTelegramAppointmentCallbackSignature(
	action: DenteTelegramAppointmentCallbackAction,
	appointmentId: string,
	expiresAtSecondsBase36: string,
	scope: DenteTelegramAppointmentCallbackScope | undefined,
): string {
	const secret = denteTelegramCallbackSecret();
	if (!secret) {
		throw new Error(
			"Подписанные Telegram-кнопки приема отключены: включите секрет подписанных кнопок в серверных настройках.",
		);
	}
	const scoped = normalizeDenteTelegramAppointmentCallbackScope(scope);
	return createHmac("sha256", secret)
		.update(
			`${scoped.organizationId}:${scoped.clinicId}:${scoped.botConfigId}:${appointmentId}:${action}:${expiresAtSecondsBase36}`,
		)
		.digest("base64url")
		.slice(0, 10);
}

function appointmentCallbackExpiryBase36(startsAtIso?: string | null): string {
	const startsAtMs = startsAtIso ? Date.parse(startsAtIso) : NaN;
	const fallbackMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
	return Math.floor(
		(Number.isFinite(startsAtMs) ? startsAtMs : fallbackMs) / 1000,
	).toString(36);
}

export function buildDenteTelegramAppointmentCallbackData(
	action: DenteTelegramAppointmentCallbackAction,
	appointmentId: string,
	scope?: DenteTelegramAppointmentCallbackScope,
	startsAtIso?: string | null,
): string {
	if (!denteTelegramAppointmentCallbacksReady()) {
		throw new Error(
			"Подписанные Telegram-кнопки приема отключены: включите секрет подписанных кнопок в серверных настройках.",
		);
	}
	const actionCode = denteTelegramAppointmentCallbackCodes[action];
	const compactAppointmentId = appointmentId.replace(/-/g, "").toLowerCase();
	const expiresAtSecondsBase36 = appointmentCallbackExpiryBase36(startsAtIso);
	return `d1.${actionCode}.${compactAppointmentId}.${expiresAtSecondsBase36}.${denteTelegramAppointmentCallbackSignature(
		action,
		appointmentId,
		expiresAtSecondsBase36,
		scope,
	)}`;
}

export function appointmentStatusLabelForTelegram(status: AppointmentStatus): string {
	const labels: Record<AppointmentStatus, string> = {
		planned: "запланирован",
		confirmed: "подтвержден",
		arrived: "пациент прибыл",
		in_treatment: "идет прием",
		completed: "завершен",
		cancelled: "отменен",
		no_show: "неявка",
	};
	return labels[status] ?? status;
}

export function telegramFeatureForTemplate(templateKind: DenteTelegramTemplateKind) {
	const map: Partial<
		Record<
			DenteTelegramTemplateKind,
			DenteTelegramBotSettings["enabledFeatures"][number]
		>
	> = {
		appointment_reminder: "appointment_reminders",
		appointment_confirmation: "appointment_confirmation",
		payment_reminder_notice: "payment_reminders",
		document_ready_notice: "document_ready_notice",
		tax_document_request_status: "tax_document_request",
		callback_request_received: "callback_requests",
		post_visit_instruction_link: "post_visit_instructions",
		post_visit_checkup: "post_visit_instructions",
		recall_notice: "recalls",
		review_request: "review_requests",
		staff_daily_digest: "staff_daily_digest",
	};
	return map[templateKind] ?? null;
}

export function activeTelegramChatLinkFor(
	subjectType: "patient" | "staff",
	subjectId: string,
	organizationScope = denteTelegramBotSettings.organizationId,
	botConfigId = configuredTelegramBotConfigId(),
): DenteTelegramChatLink | null {
	return (
		denteTelegramChatLinks.find(
			(link) =>
				link.organizationId === organizationScope &&
				link.botConfigId === botConfigId &&
				link.subjectType === subjectType &&
				link.subjectId === subjectId &&
				link.status === "active",
		) ?? null
	);
}

export const telegramScheduleVisibleStatuses = new Set<AppointmentStatus>([
	"planned",
	"confirmed",
	"arrived",
	"in_treatment",
]);

export function activeTelegramChatLinkByFingerprint(
	chatFingerprintValue: string | null,
	scope: {
		organizationId?: string | null;
		clinicId?: string | null;
		botConfigId?: string | null;
	} = {},
): DenteTelegramChatLink | null {
	if (!chatFingerprintValue) return null;
	const organizationId =
		scope.organizationId?.trim() || denteTelegramBotSettings.organizationId;
	const currentClinicId =
		scope.clinicId?.trim() || clinicProfile.organizationId;
	const botConfigId =
		scope.botConfigId?.trim() || configuredTelegramBotConfigId();
	return (
		denteTelegramChatLinks.find(
			(link) =>
				link.organizationId === organizationId &&
				link.botConfigId === botConfigId &&
				(link.clinicId === currentClinicId || link.clinicId === null) &&
				link.chatFingerprint === chatFingerprintValue &&
				link.status === "active",
		) ?? null
	);
}
