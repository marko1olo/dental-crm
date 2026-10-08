import type {
	DenteTelegramBotMode,
	DenteTelegramFeature,
	DenteTelegramLinkCodePublic,
	DenteTelegramMessagePreview,
	DenteTelegramOutboxResponse,
	DenteTelegramPrivacyMode,
	DenteTelegramVisualCardKey,
	DenteTelegramVisualCardUrls,
	GeneratedDocument,
} from "@dental/shared";
import type { AppView } from "../utils/routeUtils";

export const emptyTelegramVisualCardUrlDrafts =
	(): DenteTelegramVisualCardUrls => ({
		mainMenu: null,
		appointment: null,
		documents: null,
		tax: null,
		billing: null,
		care: null,
		review: null,
		staff: null,
	});

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

export type TelegramOutboxStatusFilter =
	| DenteTelegramOutboxResponse["items"][number]["deliveryStatus"]
	| "all"
	| "due";

export type TelegramOutboxTemplateFilter =
	| DenteTelegramMessagePreview["templateKind"]
	| "all";

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

export type TelegramFeaturePlan = {
	productName: string;
	botUsername: string | null;
	modes: string[];
	enabledFeatures: DenteTelegramFeature[];
	patientSafeActions: string[];
	staffSafeActions: string[];
	blockedByDefault: string[];
};

export type TelegramLinkSubjectType = "patient" | "staff";

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

export type TelegramInlineButtonPreview = {
	text: string;
	target: string;
	kind: "url" | "callback" | "unknown";
};

export const telegramInlineButtonKindLabels: Record<
	TelegramInlineButtonPreview["kind"],
	string
> = {
	url: "ссылка",
	callback: "действие",
	unknown: "кнопка",
};

export type DenteTelegramPortalSection =
	| "home"
	| "documents"
	| "tax"
	| "billing"
	| "care"
	| "schedule";

export type DenteTelegramHandoffTarget = {
	section: DenteTelegramPortalSection;
	view: AppView;
	hash: AppView;
	title: string;
	detail: string;
	documentKind?: GeneratedDocument["kind"];
};

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
