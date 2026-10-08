/**
 * botUrlHelpers.ts
 *
 * URL validation, sensitive query filtering, visual cards and portal links.
 */

import type {
	DenteTelegramBotSettings,
	DenteTelegramTemplateKind,
	DenteTelegramVisualCardKey,
	DenteTelegramVisualCardUrls,
} from "@dental/shared";
import type { DenteTelegramPortalSection } from "./types.js";

const telegramPublicUrlSensitiveQueryKeys = new Set([
	"patient",
	"patientid",
	"patient_id",
	"pid",
	"fio",
	"name",
	"phone",
	"tel",
	"email",
	"inn",
	"snils",
	"passport",
	"visit",
	"visitid",
	"visit_id",
	"appointment",
	"appointmentid",
	"appointment_id",
	"document",
	"documentid",
	"document_id",
	"doc",
	"diagnosis",
	"tooth",
	"treatment",
	"payment",
	"receipt",
	"order",
	"token",
	"code",
]);

const telegramPublicUrlSensitivePathSegments = new Set([
	"patient",
	"patients",
	"person",
	"people",
	"visit",
	"visits",
	"appointment",
	"appointments",
	"document",
	"documents",
	"medical-record",
	"medical-records",
	"record",
	"records",
	"tax",
	"payment",
	"payments",
	"receipt",
	"receipts",
	"order",
	"orders",
	"token",
	"code",
	"passport",
	"snils",
	"inn",
]);

function assertTelegramPublicUrlPathIsSafe(
	fieldName: string,
	parsed: URL,
): void {
	const segments = parsed.pathname
		.split("/")
		.map((segment) => {
			try {
				return decodeURIComponent(segment).trim().toLowerCase();
			} catch {
				throw new Error(`${fieldName}: invalid_path_encoding`);
			}
		})
		.filter(Boolean);
	for (const segment of segments) {
		const compactDigits = segment.replace(/\D/g, "");
		if (telegramPublicUrlSensitivePathSegments.has(segment)) {
			throw new Error(
				`${fieldName}: patient_identifying_path_not_allowed:${segment}`,
			);
		}
		if (
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
				segment,
			)
		) {
			throw new Error(
				`${fieldName}: patient_identifying_path_value_not_allowed`,
			);
		}
		if (compactDigits.length >= 10 || /\b\d{12}\b/.test(segment)) {
			throw new Error(
				`${fieldName}: patient_identifying_path_value_not_allowed`,
			);
		}
	}
}

export function normalizeTelegramBotUsername(
	value: string | null | undefined,
): string | null {
	const normalized = value?.trim().replace(/^@/, "") ?? "";
	if (!normalized) return null;
	if (!/^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/.test(normalized)) {
		throw new Error(
			"Имя Telegram-бота должно содержать 5-32 символа: буквы, цифры, подчёркивания и окончание bot.",
		);
	}
	return normalized;
}

export function safeTelegramBotUsername(
	value: string | null | undefined,
): string | null {
	try {
		return normalizeTelegramBotUsername(value);
	} catch {
		return null;
	}
}

export function normalizeTelegramPublicHttpsUrl(
	fieldName: string,
	value: string | null | undefined,
): string | null {
	const raw = value?.trim();
	if (!raw) return null;

	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		throw new Error(`${fieldName}: invalid_url`);
	}

	if (parsed.protocol !== "https:") {
		throw new Error(`${fieldName}: https_required`);
	}
	if (parsed.username || parsed.password) {
		throw new Error(`${fieldName}: credentials_not_allowed`);
	}

	assertTelegramPublicUrlPathIsSafe(fieldName, parsed);

	const sensitiveKeys = Array.from(parsed.searchParams.keys()).filter((key) =>
		telegramPublicUrlSensitiveQueryKeys.has(key.trim().toLowerCase()),
	);
	if (sensitiveKeys.length) {
		throw new Error(
			`${fieldName}: patient_identifying_query_not_allowed:${sensitiveKeys.join(",")}`,
		);
	}

	for (const valuePart of parsed.searchParams.values()) {
		const compact = valuePart.replace(/\D/g, "");
		if (compact.length >= 10 || /\b\d{12}\b/.test(valuePart)) {
			throw new Error(
				`${fieldName}: patient_identifying_query_value_not_allowed`,
			);
		}
	}

	parsed.hash = "";
	return parsed.toString();
}

export function safeDenteTelegramPublicHttpsUrl(
	fieldName: string,
	value: string | null | undefined,
): string | null {
	try {
		return normalizeTelegramPublicHttpsUrl(fieldName, value);
	} catch {
		return null;
	}
}

const defaultDenteTelegramVisualCardUrls: DenteTelegramVisualCardUrls = {
	mainMenu: null,
	appointment: null,
	documents: null,
	tax: null,
	billing: null,
	care: null,
	review: null,
	staff: null,
};

export function normalizeDenteTelegramVisualCardUrls(
	input: unknown,
): DenteTelegramVisualCardUrls {
	const source =
		input && typeof input === "object" && !Array.isArray(input)
			? (input as Partial<Record<DenteTelegramVisualCardKey, unknown>>)
			: {};
	return {
		mainMenu: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.mainMenu",
			typeof source.mainMenu === "string" ? source.mainMenu : null,
		),
		appointment: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.appointment",
			typeof source.appointment === "string" ? source.appointment : null,
		),
		documents: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.documents",
			typeof source.documents === "string" ? source.documents : null,
		),
		tax: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.tax",
			typeof source.tax === "string" ? source.tax : null,
		),
		billing: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.billing",
			typeof source.billing === "string" ? source.billing : null,
		),
		care: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.care",
			typeof source.care === "string" ? source.care : null,
		),
		review: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.review",
			typeof source.review === "string" ? source.review : null,
		),
		staff: normalizeTelegramPublicHttpsUrl(
			"visualCardUrls.staff",
			typeof source.staff === "string" ? source.staff : null,
		),
	};
}

export function normalizeExistingDenteTelegramVisualCardUrls(
	input: unknown,
): DenteTelegramVisualCardUrls {
	try {
		return normalizeDenteTelegramVisualCardUrls(input);
	} catch {
		return defaultDenteTelegramVisualCardUrls;
	}
}


export function safeHttpsUrl(value: string | null | undefined): string | null {
	try {
		return normalizeTelegramPublicHttpsUrl("telegramPublicUrl", value);
	} catch {
		return null;
	}
}

export function denteTelegramVisualCardUrlFor(
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
	cardKey: DenteTelegramVisualCardKey = "mainMenu",
): string | null {
	return (
		safeHttpsUrl(settings.visualCardUrls?.[cardKey]) ??
		safeHttpsUrl(settings.welcomeImageUrl)
	);
}

function denteTelegramVisualCardKeyForTemplate(
	templateKind: DenteTelegramTemplateKind,
): DenteTelegramVisualCardKey {
	if (
		templateKind === "appointment_reminder" ||
		templateKind === "appointment_confirmation"
	)
		return "appointment";
	if (templateKind === "document_ready_notice") return "documents";
	if (templateKind === "tax_document_request_status") return "tax";
	if (templateKind === "payment_reminder_notice") return "billing";
	if (
		templateKind === "post_visit_instruction_link" ||
		templateKind === "post_visit_checkup"
	)
		return "care";
	if (templateKind === "recall_notice") return "care";
	if (templateKind === "review_request") return "review";
	if (templateKind === "staff_daily_digest") return "staff";
	return "mainMenu";
}

export function denteTelegramVisualCardUrlForTemplate(
	templateKind: DenteTelegramTemplateKind,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): string | null {
	return denteTelegramVisualCardUrlFor(
		settings,
		denteTelegramVisualCardKeyForTemplate(templateKind),
	);
}


function denteTelegramPortalSectionForTemplate(
	templateKind: DenteTelegramTemplateKind,
): DenteTelegramPortalSection {
	if (templateKind === "document_ready_notice") return "documents";
	if (templateKind === "tax_document_request_status") return "tax";
	if (templateKind === "payment_reminder_notice") return "billing";
	if (
		templateKind === "post_visit_instruction_link" ||
		templateKind === "post_visit_checkup"
	)
		return "care";
	if (
		templateKind === "recall_notice" ||
		templateKind === "appointment_reminder" ||
		templateKind === "appointment_confirmation"
	)
		return "schedule";
	return "home";
}

export function denteTelegramPortalUrlForSection(
	section: DenteTelegramPortalSection,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): string | null {
	const portal = safeHttpsUrl(settings.patientPortalBaseUrl);
	if (!portal) return null;
	try {
		const url = new URL(portal);
		url.search = "";
		url.searchParams.set("dente_source", "telegram");
		url.searchParams.set("dente_section", section);
		url.hash = "";
		return url.toString();
	} catch {
		return null;
	}
}

export function denteTelegramPortalUrlForTemplate(
	templateKind: DenteTelegramTemplateKind,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): string | null {
	return denteTelegramPortalUrlForSection(
		denteTelegramPortalSectionForTemplate(templateKind),
		settings,
	);
}

export function denteTelegramPortalRowForTemplate(
	templateKind: DenteTelegramTemplateKind,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): Array<{ text: string; url: string }> {
	const portal = denteTelegramPortalUrlForTemplate(templateKind, settings);
	return portal ? [{ text: "Открыть DENTE", url: portal }] : [];
}

