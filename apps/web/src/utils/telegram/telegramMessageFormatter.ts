import type {
	DenteTelegramBotMode,
	DenteTelegramMessagePreview,
	DenteTelegramOutboxResponse,
	DenteTelegramPrivacyMode,
	DenteTelegramLinkCodePublic,
} from "@dental/shared";
import { isRecordKey } from "../CommonHelpers.js";

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

export type TelegramOutboxStatusFilter =
	| DenteTelegramOutboxResponse["items"][number]["deliveryStatus"]
	| "all"
	| "due";

export type TelegramOutboxTemplateFilter =
	| DenteTelegramMessagePreview["templateKind"]
	| "all";

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

export function isTelegramLinkSubjectTypePreference(
	value: unknown,
): value is "patient" | "staff" {
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
): "patient" | "staff" {
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
