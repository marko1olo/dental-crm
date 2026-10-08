/**
 * replyMarkups.ts
 *
 * Telegram bot inline keyboard and reply markup builders.
 */

import type {
	Appointment,
	DenteTelegramBotSettings,
	GeneratedDocument,
	Payment,
	StaffMember,
} from "@dental/shared";
import type { DomainState } from "../../../types/domainState.js";
import type {
	DenteTelegramAppointmentCallbackScope,
} from "./types.js";
import {
	denteTelegramBotSettings,
} from "./botSettings.js";
import {
	denteTelegramPortalUrlForSection,
	denteTelegramPortalUrlForTemplate,
	denteTelegramPortalRowForTemplate,
} from "./botUrlHelpers.js";
import {
	buildDenteTelegramAppointmentCallbackData,
	denteTelegramAppointmentCallbacksReady,
	normalizeDenteTelegramAppointmentCallbackScope,
} from "./appointmentCallbacks.js";

export function denteTelegramMainMenuRow(): Array<{
	text: string;
	callback_data: string;
}> {
	return [{ text: "Главное меню", callback_data: "dente:start" }];
}

export function telegramReplyMarkupForReviewRequest(
	settings: DenteTelegramBotSettings,
): Record<string, unknown> | null {
	const reviewUrl = safeHttpsUrl(settings.clinicReviewUrl);
	const mapsUrl = safeHttpsUrl(settings.clinicMapsUrl);
	const buttons: Array<{ text: string; url: string }> = [];
	if (reviewUrl) buttons.push({ text: "Оценить клинику", url: reviewUrl });
	if (mapsUrl) buttons.push({ text: "Открыть карту", url: mapsUrl });
	return buttons.length
		? { inline_keyboard: [buttons, denteTelegramMainMenuRow()] }
		: null;
}

export function telegramReplyMarkupForAppointment(
	appointmentId: string | null,
	signedAppointmentCallbackScope: Record<string, unknown>,
): Record<string, unknown> | null {
	if (appointmentId) {
		if (!denteTelegramAppointmentCallbacksReady()) {
			return {
				inline_keyboard: [
					[
						{ text: "Связаться с клиникой", callback_data: "dente:contact" },
						{ text: "Конфиденциальность", callback_data: "dente:privacy" },
					],
					denteTelegramMainMenuRow(),
				],
			};
		}
		return {
			inline_keyboard: [
				[
					{
						text: "Подтвердить",
						callback_data: buildDenteTelegramAppointmentCallbackData(
							"confirm",
							appointmentId,
							signedAppointmentCallbackScope,
						),
					},
					{
						text: "Перенести",
						callback_data: buildDenteTelegramAppointmentCallbackData(
							"reschedule",
							appointmentId,
							signedAppointmentCallbackScope,
						),
					},
				],
				[
					{
						text: "Позвоните мне",
						callback_data: buildDenteTelegramAppointmentCallbackData(
							"call_request",
							appointmentId,
							signedAppointmentCallbackScope,
						),
					},
					{ text: "Конфиденциальность", callback_data: "dente:privacy" },
				],
				denteTelegramMainMenuRow(),
			],
		};
	}

	return {
		inline_keyboard: [
			[
				{ text: "Связаться с клиникой", callback_data: "dente:contact" },
				{ text: "Конфиденциальность", callback_data: "dente:privacy" },
			],
			denteTelegramMainMenuRow(),
		],
	};
}

export function telegramReplyMarkupForDocumentReadyNotice(
	portalRow: Array<{ text: string; url: string }>,
): Record<string, unknown> | null {
	const rows = [
		portalRow,
		[
			{ text: "Документы", callback_data: "dente:documents" },
			{ text: "Связаться", callback_data: "dente:contact" },
		],
		[{ text: "Конфиденциальность", callback_data: "dente:privacy" }],
		denteTelegramMainMenuRow(),
	].filter((row) => row.length);
	return rows.length ? { inline_keyboard: rows } : null;
}

export function telegramReplyMarkupForTaxDocumentRequestStatus(
	portalRow: Array<{ text: string; url: string }>,
): Record<string, unknown> | null {
	const rows = [
		portalRow,
		[
			{ text: "Налоговая", callback_data: "dente:tax" },
			{ text: "Документы", callback_data: "dente:documents" },
		],
		[
			{ text: "Связаться", callback_data: "dente:contact" },
			{ text: "Конфиденциальность", callback_data: "dente:privacy" },
		],
		denteTelegramMainMenuRow(),
	].filter((row) => row.length);
	return rows.length ? { inline_keyboard: rows } : null;
}

export function telegramReplyMarkupForPaymentReminderNotice(
	portalRow: Array<{ text: string; url: string }>,
): Record<string, unknown> | null {
	const rows = [
		portalRow,
		[
			{ text: "Оплата и чеки", callback_data: "dente:billing" },
			{ text: "Документы", callback_data: "dente:documents" },
		],
		[
			{ text: "Связаться", callback_data: "dente:contact" },
			{ text: "Конфиденциальность", callback_data: "dente:privacy" },
		],
		denteTelegramMainMenuRow(),
	].filter((row) => row.length);
	return rows.length ? { inline_keyboard: rows } : null;
}

export function telegramReplyMarkupForPostVisit(
	portalRow: Array<{ text: string; url: string }>,
): Record<string, unknown> | null {
	const rows = [
		portalRow,
		[
			{ text: "Памятки", callback_data: "dente:care" },
			{ text: "Связаться", callback_data: "dente:contact" },
		],
		[{ text: "Конфиденциальность", callback_data: "dente:privacy" }],
		denteTelegramMainMenuRow(),
	].filter((row) => row.length);
	return rows.length ? { inline_keyboard: rows } : null;
}

export function telegramReplyMarkupForRecallNotice(
	portalRow: Array<{ text: string; url: string }>,
): Record<string, unknown> | null {
	const rows = [
		portalRow,
		[
			{ text: "Расписание", callback_data: "dente:schedule" },
			{ text: "Связаться", callback_data: "dente:contact" },
		],
		[{ text: "Конфиденциальность", callback_data: "dente:privacy" }],
		denteTelegramMainMenuRow(),
	].filter((row) => row.length);
	return rows.length ? { inline_keyboard: rows } : null;
}

export function telegramReplyMarkupForStaffDailyDigest(
	portalRow: Array<{ text: string; url: string }>,
): Record<string, unknown> | null {
	const rows = [
		portalRow,
		[
			{ text: "Расписание", callback_data: "dente:schedule" },
			{ text: "Связь", callback_data: "dente:contact" },
		],
		denteTelegramMainMenuRow(),
	].filter((row) => row.length);
	return rows.length ? { inline_keyboard: rows } : null;
}

export function telegramReplyMarkupFor(
	templateKind: DenteTelegramTemplateKind,
	appointmentId: string | null = null,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
	appointmentCallbackScope: DenteTelegramAppointmentCallbackScope = {},
): Record<string, unknown> | null {
	const portalRow = denteTelegramPortalRowForTemplate(templateKind, settings);
	const signedAppointmentCallbackScope =
		normalizeDenteTelegramAppointmentCallbackScope(
			appointmentCallbackScope,
			settings,
		);

	switch (templateKind) {
		case "review_request":
			return telegramReplyMarkupForReviewRequest(settings);
		case "appointment_reminder":
		case "appointment_confirmation":
			return telegramReplyMarkupForAppointment(
				appointmentId,
				signedAppointmentCallbackScope,
			);
		case "document_ready_notice":
			return telegramReplyMarkupForDocumentReadyNotice(portalRow);
		case "tax_document_request_status":
			return telegramReplyMarkupForTaxDocumentRequestStatus(portalRow);
		case "payment_reminder_notice":
			return telegramReplyMarkupForPaymentReminderNotice(portalRow);
		case "post_visit_instruction_link":
		case "post_visit_checkup":
			return telegramReplyMarkupForPostVisit(portalRow);
		case "recall_notice":
			return telegramReplyMarkupForRecallNotice(portalRow);
		case "staff_daily_digest":
			return telegramReplyMarkupForStaffDailyDigest(portalRow);
		default:
			return null;
	}
}

export function telegramScheduleReplyMarkupForPatientAppointment(
	appointmentId: string,
	scope: DenteTelegramAppointmentCallbackScope = {},
): Record<string, unknown> {
	const appointmentMarkup = telegramReplyMarkupFor(
		"appointment_confirmation",
		appointmentId,
		denteTelegramBotSettings,
		scope,
	);
	const appointmentRows = Array.isArray(appointmentMarkup?.inline_keyboard)
		? appointmentMarkup.inline_keyboard
		: [];
	return {
		inline_keyboard: [
			...appointmentRows,
			[
				{ text: "Расписание", callback_data: "dente:schedule" },
				{ text: "Документы", callback_data: "dente:documents" },
			],
		],
	};
}

