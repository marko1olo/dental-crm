import type {
	AppointmentStatus,
	DenteTelegramChatLink,
	DenteTelegramTemplateKind,
	DenteTelegramBotSettings,
} from "@dental/shared";
import {
	denteTelegramChatLinks,
	clinicProfile,
} from "./storeState.js";
import {
	configuredTelegramBotConfigId,
	denteTelegramBotSettings,
} from "./botSettings.js";

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
