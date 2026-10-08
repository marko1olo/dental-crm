/**
 * @file apps/web/src/helpers/telegramHelpers.ts
 * @description Decomposed helper module extracted verbatim from AppHelpers.tsx
 */

import {
	type DenteTelegramBotMode,
	type DenteTelegramLinkCodePublic,
	type DenteTelegramMessagePreview,
	type DenteTelegramOutboxResponse,
	type DenteTelegramPrivacyMode,
	type DenteTelegramVisualCardKey,
	type DenteTelegramVisualCardUrls,
} from "@dental/shared";
import {
	isBrowserMigrationScanAbortError,
} from "../utils/browserScanUtils";
import {
	telegramVisualCardFields,
} from "../workspaceStaticOptions";
import {
	isRecordKey,
} from "./guardUtils";
import {
	type DenteTelegramHandoffTarget,
	type DenteTelegramPortalSection,
	type TelegramInlineButtonPreview,
	type TelegramLinkSubjectType,
	type TelegramOutboxStatusFilter,
	type TelegramOutboxTemplateFilter,
} from "./types";

export const telegramBlockedReasonLabels: Record<string, string> = {
	missing_patient_portal_base_url: "Не настроена ссылка на портал пациента.",
	missing_clinic_review_url: "Не настроена ссылка клиники для отзывов.",
	phi_requires_consent:
		"Шаблон содержит медданные и требует согласий перед отправкой.",
	telegram_bot_disabled: "Telegram выключен в настройках клиники.",
	telegram_bot_token_missing:
		"В серверных настройках клиники не подключен бот Telegram.",
	encrypted_chat_transport_missing_or_unreadable:
		"Чат пациента еще не привязан или защищенная ссылка недоступна.",
	patient_or_staff_not_linked_to_telegram:
		"Чат еще не связан через QR-код или одноразовую ссылку.",
	post_visit_recommendation_document_not_issued:
		"Сначала выпустите памятку после приема.",
	telegram_outbox_item_not_found_or_no_longer_open:
		"Задача уже не доступна для отправки.",
	telegram_outbox_already_sent: "Это сообщение уже отправлено.",
	telegram_outbox_not_due_yet: "Время отправки еще не наступило.",
	telegram_outbox_preview_empty: "В сообщении нет текста для отправки.",
	telegram_delivery_processing: "Отправка уже обрабатывается.",
	telegram_transport_failed:
		"Telegram не принял сообщение. Проверьте подключение бота, сеть и связанный чат.",
	// Без этих двух строк telegramHumanMessage не находит подписи и выдаёт общее «Нужна проверка
	// настройки Telegram», то есть отправляет оператора чинить настройки при полностью исправных
	// настройках. Для частичной доставки это ещё и опасно: оператор жмёт «отправить» снова, и пациент
	// получает фото второй раз.
	telegram_photo_sent_text_failed:
		"Фото уже доставлено пациенту, а текст под ним не ушёл. Повторная отправка дошлёт только текст — фото заново не уйдёт.",
	telegram_outbox_schedule_unreadable:
		"Время отправки в задаче не распознано как дата. Сообщение не отправлено; исправьте время в задаче коммуникации.",
};

export const telegramWarningLabels: Record<string, string> = {
	idempotent_replay: "Повторная отправка распознана и не продублирована.",
};

export function telegramHumanMessage(value: string | null | undefined): string {
	if (!value) return "";
	if (value.startsWith("feature_disabled:"))
		return "Сценарий выключен в настройках Telegram.";
	const mapped =
		telegramBlockedReasonLabels[value] ?? telegramWarningLabels[value];
	if (mapped) return mapped;
	if (!/^[a-z0-9_.:-]+$/.test(value)) return value;
	return (
		telegramBlockedReasonLabels[value] ??
		telegramWarningLabels[value] ??
		"Нужна проверка настройки Telegram."
	);
}

export function isTelegramOutboxItemDueForUi(
	item: Pick<DenteTelegramOutboxResponse["items"][number], "scheduledAt">,
): boolean {
	const scheduledAtMs = Date.parse(item.scheduledAt);
	if (!Number.isFinite(scheduledAtMs)) return false;
	return scheduledAtMs <= Date.now();
}

export function telegramQrSvgToDataUrl(svg: string): string {
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const telegramPublicUrlSensitiveQueryKeys = new Set([
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

export const telegramPublicUrlSensitivePathSegments = new Set([
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

export function normalizeTelegramPublicHttpsUrlDraft(
	fieldLabel: string,
	value: string | null | undefined,
): string | null {
	const raw = value?.trim() ?? "";
	if (!raw) return null;

	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		throw new Error(`${fieldLabel}: укажите полный адрес вида https://...`);
	}

	if (parsed.protocol !== "https:") {
		throw new Error(`${fieldLabel}: нужна ссылка https://...`);
	}
	if (parsed.username || parsed.password) {
		throw new Error(`${fieldLabel}: уберите логин и пароль из ссылки.`);
	}

	const pathSegments = parsed.pathname
		.split("/")
		.map((segment) => {
			try {
				return decodeURIComponent(segment).trim().toLowerCase();
			} catch (scanError) {
				if (isBrowserMigrationScanAbortError(scanError)) throw scanError;
				throw new Error(`${fieldLabel}: исправьте кодировку пути в ссылке.`);
			}
		})
		.filter(Boolean);
	for (const segment of pathSegments) {
		const compactDigits = segment.replace(/\D/g, "");
		if (telegramPublicUrlSensitivePathSegments.has(segment)) {
			throw new Error(
				`${fieldLabel}: ссылка должна вести на общую публичную страницу, без patient/visit/document/token в пути.`,
			);
		}
		if (
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
				segment,
			)
		) {
			throw new Error(
				`${fieldLabel}: уберите идентификатор пациента, визита или документа из пути.`,
			);
		}
		if (compactDigits.length >= 10 || /\b\d{12}\b/.test(segment)) {
			throw new Error(
				`${fieldLabel}: уберите телефон, ИНН, СНИЛС или другой личный номер из пути.`,
			);
		}
	}

	const sensitiveQueryKeys = Array.from(parsed.searchParams.keys()).filter(
		(key) => telegramPublicUrlSensitiveQueryKeys.has(key.trim().toLowerCase()),
	);
	if (sensitiveQueryKeys.length) {
		throw new Error(
			`${fieldLabel}: уберите персональные параметры из ссылки: ${sensitiveQueryKeys.join(", ")}.`,
		);
	}
	for (const valuePart of parsed.searchParams.values()) {
		const compactDigits = valuePart.replace(/\D/g, "");
		if (compactDigits.length >= 10 || /\b\d{12}\b/.test(valuePart)) {
			throw new Error(
				`${fieldLabel}: уберите телефон, ИНН, СНИЛС или другой личный номер из параметров.`,
			);
		}
	}

	parsed.hash = "";
	return parsed.toString();
}

export function normalizeTelegramVisualCardUrlDraftsForSave(
	drafts: DenteTelegramVisualCardUrls,
): DenteTelegramVisualCardUrls {
	const fieldLabel = (key: DenteTelegramVisualCardKey) =>
		telegramVisualCardFields.find((field) => field.key === key)?.label ??
		`Картинка Telegram ${key}`;
	return {
		mainMenu: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("mainMenu"),
			drafts.mainMenu,
		),
		appointment: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("appointment"),
			drafts.appointment,
		),
		documents: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("documents"),
			drafts.documents,
		),
		tax: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("tax"), drafts.tax),
		billing: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("billing"),
			drafts.billing,
		),
		care: normalizeTelegramPublicHttpsUrlDraft(fieldLabel("care"), drafts.care),
		review: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("review"),
			drafts.review,
		),
		staff: normalizeTelegramPublicHttpsUrlDraft(
			fieldLabel("staff"),
			drafts.staff,
		),
	};
}

export function normalizeTelegramBotUsernameDraft(
	fieldLabel: string,
	value: string | null | undefined,
): string | null {
	const normalized = value?.trim().replace(/^@/, "") ?? "";
	if (!normalized) return null;
	if (!/^[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/.test(normalized)) {
		throw new Error(
			`${fieldLabel}: укажите имя Telegram-бота без ссылки, 5-32 символа: латинские буквы, цифры, подчёркивания и окончание bot.`,
		);
	}
	return normalized;
}

export const onboardingTelegramVisualCardKeys: DenteTelegramVisualCardKey[] = [
	"mainMenu",
	"appointment",
	"documents",
	"tax",
	"billing",
	"care",
	"review",
	"staff",
];

export const telegramModeLabels: Record<DenteTelegramBotMode, string> = {
	disabled: "выключен",
	shared_dente_bot: "общий бот платформы",
	clinic_owned_bot: "бот клиники",
};

export const telegramModeHints: Record<DenteTelegramBotMode, string> = {
	disabled: "Telegram не создает новые задачи и не отправляет сообщения.",
	shared_dente_bot:
		"Одна общая основа: клиника определяется QR-кодом и связкой пациента.",
	clinic_owned_bot:
		"Собственный бот клиники: имя сохраняется в настройках, секрет бота хранится в серверных настройках клиники.",
};

export const telegramPrivacyModeLabels: Record<
	DenteTelegramPrivacyMode,
	string
> = {
	no_phi_by_default: "Без медицинских данных в Telegram",
	limited_admin_only: "Только административные сведения",
	consented_phi_templates: "Чувствительные шаблоны только по согласию",
};

export const telegramPrivacyModeHints: Record<
	DenteTelegramPrivacyMode,
	string
> = {
	no_phi_by_default:
		"В чат уходят только статусы, время, ссылки и общие памятки.",
	limited_admin_only:
		"Разрешены административные статусы без диагноза, снимков и документов.",
	consented_phi_templates:
		"Режим для будущих шаблонов с явным согласием пациента и аудитом.",
};

export const telegramTemplateLabels: Record<
	DenteTelegramMessagePreview["templateKind"],
	string
> = {
	appointment_reminder: "напоминание о приеме",
	appointment_confirmation: "подтверждение приема",
	payment_reminder_notice: "напоминание об оплате",
	document_ready_notice: "документ готов",
	tax_document_request_status: "статус налоговой справки",
	callback_request_received: "заявка на звонок",
	post_visit_instruction_link: "памятка после приема",
	post_visit_checkup: "контроль после приема",
	recall_notice: "профилактический recall",
	review_request: "просьба оставить отзыв",
	staff_daily_digest: "сводка сотруднику",
};

export const telegramClassificationLabels: Record<
	DenteTelegramMessagePreview["classification"],
	string
> = {
	no_phi: "без медтайны",
	limited_admin: "административное",
	phi_requires_consent: "медданные только с согласием",
};

export const telegramDeliveryStatusLabels: Record<
	DenteTelegramOutboxResponse["items"][number]["deliveryStatus"],
	string
> = {
	ready: "готово",
	needs_chat_link: "нужно подключить Telegram",
	blocked_by_policy: "заблокировано политикой",
	transport_not_ready: "отправка не готова",
	disabled: "выключено",
};

export const telegramLinkCodeStatusLabels: Record<
	DenteTelegramLinkCodePublic["status"],
	string
> = {
	pending: "ожидает",
	used: "использован",
	expired: "истек",
	revoked: "отозван",
};

export const telegramOutboxStatusFilterOptions: TelegramOutboxStatusFilter[] = [
	"all",
	"due",
	"ready",
	"needs_chat_link",
	"transport_not_ready",
	"blocked_by_policy",
	"disabled",
];

export const telegramOutboxStatusFilterLabels: Record<
	TelegramOutboxStatusFilter,
	string
> = {
	all: "вся очередь",
	due: "к отправке сейчас",
	...telegramDeliveryStatusLabels,
};

export const telegramOutboxTemplateFilterOptions: TelegramOutboxTemplateFilter[] =
	[
		"all",
		...(Object.keys(
			telegramTemplateLabels,
		) as DenteTelegramMessagePreview["templateKind"][]),
	];

export const telegramOutboxTemplateFilterLabels: Record<
	TelegramOutboxTemplateFilter,
	string
> = {
	all: "все сценарии",
	...telegramTemplateLabels,
};

export const telegramInlineButtonKindLabels: Record<
	TelegramInlineButtonPreview["kind"],
	string
> = {
	url: "ссылка",
	callback: "действие",
	unknown: "кнопка",
};

export function telegramInlineButtonRowsFromReplyMarkup(
	markup:
		| DenteTelegramMessagePreview["replyMarkup"]
		| DenteTelegramOutboxResponse["items"][number]["replyMarkup"]
		| null
		| undefined,
): TelegramInlineButtonPreview[][] {
	if (!markup || typeof markup !== "object" || Array.isArray(markup)) return [];
	const rows = (markup as { inline_keyboard?: unknown }).inline_keyboard;
	if (!Array.isArray(rows)) return [];
	return rows.flatMap((row) => {
		if (!Array.isArray(row)) return [];
		const buttons = row
			.map((button) => {
				if (!button || typeof button !== "object" || Array.isArray(button))
					return null;
				const candidate = button as {
					text?: unknown;
					url?: unknown;
					callback_data?: unknown;
				};
				if (typeof candidate.text !== "string") return null;
				if (typeof candidate.url === "string")
					return {
						text: candidate.text,
						target: candidate.url,
						kind: "url" as const,
					};
				if (typeof candidate.callback_data === "string") {
					return {
						text: candidate.text,
						target: candidate.callback_data,
						kind: "callback" as const,
					};
				}
				return { text: candidate.text, target: "", kind: "unknown" as const };
			})
			.filter((button): button is TelegramInlineButtonPreview =>
				Boolean(button),
			);
		return buttons.length ? [buttons] : [];
	});
}

export function telegramInlineButtonsFromReplyMarkup(
	markup:
		| DenteTelegramMessagePreview["replyMarkup"]
		| DenteTelegramOutboxResponse["items"][number]["replyMarkup"]
		| null
		| undefined,
): TelegramInlineButtonPreview[] {
	return telegramInlineButtonRowsFromReplyMarkup(markup).flat();
}

export function telegramInlineButtonsFromPreview(
	preview: DenteTelegramMessagePreview,
): TelegramInlineButtonPreview[] {
	return telegramInlineButtonsFromReplyMarkup(preview.replyMarkup);
}

export function isTelegramLinkSubjectTypePreference(
	value: unknown,
): value is TelegramLinkSubjectType {
	return value === "patient" || value === "staff";
}

export function isTelegramOutboxStatusFilterPreference(
	value: unknown,
): value is TelegramOutboxStatusFilter {
	return (
		typeof value === "string" &&
		telegramOutboxStatusFilterOptions.includes(
			value as TelegramOutboxStatusFilter,
		)
	);
}

export function isTelegramOutboxTemplateFilterPreference(
	value: unknown,
): value is TelegramOutboxTemplateFilter {
	return (
		typeof value === "string" &&
		telegramOutboxTemplateFilterOptions.includes(
			value as TelegramOutboxTemplateFilter,
		)
	);
}

export function normalizedTelegramBotMode(
	value: unknown,
): DenteTelegramBotMode {
	return isRecordKey(value, telegramModeLabels) ? value : "shared_dente_bot";
}

export function normalizedTelegramPrivacyMode(
	value: unknown,
): DenteTelegramPrivacyMode {
	return isRecordKey(value, telegramPrivacyModeLabels)
		? value
		: "no_phi_by_default";
}

export function normalizedTelegramLinkSubjectType(
	value: unknown,
): TelegramLinkSubjectType {
	return isTelegramLinkSubjectTypePreference(value) ? value : "patient";
}

export function normalizedTelegramOutboxStatusFilter(
	value: unknown,
): TelegramOutboxStatusFilter {
	return isTelegramOutboxStatusFilterPreference(value) ? value : "all";
}

export function normalizedTelegramOutboxTemplateFilter(
	value: unknown,
): TelegramOutboxTemplateFilter {
	return isTelegramOutboxTemplateFilterPreference(value) ? value : "all";
}

export const denteTelegramHandoffTargets: Record<
	DenteTelegramPortalSection,
	DenteTelegramHandoffTarget
> = {
	home: {
		section: "home",
		view: "shift",
		hash: "shift",
		title: "Рабочий стол клиники",
		detail:
			"Открыт стартовый экран клиники: ближайшие приемы, готовность команды, быстрые действия и рабочие настройки.",
	},
	documents: {
		section: "documents",
		view: "documents",
		hash: "documents",
		title: "Документы",
		detail: "Открыт раздел договоров, согласий, справок и архивов.",
		documentKind: "patient_intake_questionnaire",
	},
	tax: {
		section: "tax",
		view: "documents",
		hash: "documents",
		title: "Налоговые документы",
		detail: "Открыт раздел справок для налогового вычета, заявлений и оплат.",
		documentKind: "tax_deduction_certificate",
	},
	billing: {
		section: "billing",
		view: "finance",
		hash: "finance",
		title: "Оплаты",
		detail: "Открыт раздел оплат, чеков, счетов и налоговых реквизитов.",
	},
	care: {
		section: "care",
		view: "communications",
		hash: "communications",
		title: "Связь и памятки",
		detail:
			"Открыта очередь связи: запросы памяток, инструкции после приема и задачи администратора.",
	},
	schedule: {
		section: "schedule",
		view: "schedule",
		hash: "schedule",
		title: "Расписание",
		detail:
			"Открыта очередь записей, фильтры врачей, ассистентов и кресел сохранены.",
	},
};

export function isDenteTelegramPortalSection(
	value: string | null,
): value is DenteTelegramPortalSection {
	return Boolean(value && Object.hasOwn(denteTelegramHandoffTargets, value));
}

export function readDenteTelegramHandoffTarget(): DenteTelegramHandoffTarget | null {
	if (typeof window === "undefined") return null;
	try {
		const url = new URL(window.location.href);
		if (url.searchParams.get("dente_source") !== "telegram") return null;
		const section = url.searchParams.get("dente_section");
		return isDenteTelegramPortalSection(section)
			? denteTelegramHandoffTargets[section]
			: null;
	} catch {
		return null;
	}
}

export function stripDenteTelegramHandoffQuery(
	target: DenteTelegramHandoffTarget,
): void {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	url.search = "";
	url.hash = `#${target.hash}`;
	window.history.replaceState(null, "", `${url.pathname}${url.hash}`);
}
