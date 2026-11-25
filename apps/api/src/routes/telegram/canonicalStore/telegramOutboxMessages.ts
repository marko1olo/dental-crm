import {
	denteTelegramMessagePreviewSchema,
	denteTelegramOutboxResponseSchema,
	type CommunicationTask,
	type DenteTelegramBotSettings,
	type DenteTelegramMessagePreview,
	type DenteTelegramMessagePreviewRequest,
	type DenteTelegramOutboxItem,
	type DenteTelegramOutboxResponse,
	type DenteTelegramTemplateKind,
} from "@dental/shared";
import { repairMojibakeText } from "../../../text/repairMojibake.js";
import { denteTelegramVisualCardUrlForTemplate } from "../telegramUrlHelpers.js";
import {
	defaultClinicProfile,
	denteTelegramBotSettings,
	denteTelegramChatLinks,
	inMemoryDomainState,
	resolveDenteTelegramOutboxRuntimeScope,
	type DenteTelegramOutboxRuntimeScope,
	type DomainState,
} from "./telegramRuntimeDefaults.js";

export type DenteTelegramOutboxStatusFilter =
	| "all"
	| "ready"
	| "blocked"
	| "sent"
	| "failed"
	| "dry_run"
	| "due"
	| "disabled"
	| "needs_chat_link"
	| "blocked_by_policy"
	| "transport_not_ready";

export type BuildDenteTelegramOutboxOptions = {
	readonly limit?: number;
	readonly cursor?: string | null;
	readonly status?: DenteTelegramOutboxStatusFilter;
	readonly templateKind?: DenteTelegramTemplateKind | "all";
};

export type NormalizedDenteTelegramOutboxOptions = {
	readonly limit: number;
	readonly cursor: string;
	readonly status: DenteTelegramOutboxStatusFilter;
	readonly templateKind: DenteTelegramTemplateKind | "all";
};

export type TelegramMessageContext = {
	clinicName: string;
	appointmentTime: string;
	hasAppointment: boolean;
	portalUrl: string | null;
	reviewUrl: string | null;
	mapsUrl: string | null;
	staffRoleLabel?: string | undefined;
	appointmentCount?: number | undefined;
	openTaskCount?: number | undefined;
	urgentTaskCount?: number | undefined;
};

export function telegramTemplateKindForTask(
	task: CommunicationTask,
): DenteTelegramTemplateKind {
	if (task.intent === "appointment_confirmation") return "appointment_confirmation";
	if (task.intent === "payment_reminder") return "payment_reminder_notice";
	if (task.intent === "document_ready") return "document_ready_notice";
	if (task.intent === "recall") return "recall_notice";
	if (task.intent === "post_visit_instruction") return "post_visit_instruction_link";
	return "callback_request_received";
}

export function buildDenteTelegramMessagePreviewData(
	templateKind: DenteTelegramTemplateKind,
	context: TelegramMessageContext,
	baseWarning: string,
): Omit<DenteTelegramMessagePreview, "replyMarkup" | "photoUrl"> {
	switch (templateKind) {
		case "appointment_reminder":
			return {
				templateKind: "appointment_reminder",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: напоминаем о приеме в ${context.clinicName} ${context.appointmentTime}. Если нужно перенести запись, свяжитесь с клиникой.`,
				variablesUsed: [
					"clinicName",
					...(context.hasAppointment ? ["appointmentTime"] : []),
				],
				warnings: [
					baseWarning,
					"Напоминание содержит только административное время приема и не раскрывает причину визита.",
				],
				blockedReason: null,
			};
		case "appointment_confirmation":
			return {
				templateKind: "appointment_confirmation",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: напоминание о записи от ${context.clinicName}. Подтвердите прием, перенесите его или позвоните в клинику.`,
				variablesUsed: ["clinicName"],
				warnings: [baseWarning],
				blockedReason: null,
			};
		case "payment_reminder_notice":
			return {
				templateKind: "payment_reminder_notice",
				classification: "limited_admin",
				allowedByDefault: true,
				text: context.portalUrl
					? `DENTE: у клиники есть вопрос по оплате. Свяжитесь с ${context.clinicName} или откройте защищенный портал: ${context.portalUrl}`
					: `DENTE: у клиники есть вопрос по оплате. Свяжитесь с ${context.clinicName}.`,
				variablesUsed: context.portalUrl
					? ["clinicName", "patientPortalBaseUrl"]
					: ["clinicName"],
				warnings: [
					baseWarning,
					"Сумма, детализация лечения и фискальные данные не отправляются через Telegram.",
				],
				blockedReason: null,
			};
		case "staff_daily_digest":
			return {
				templateKind: "staff_daily_digest",
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: сводка на сегодня для роли "${context.staffRoleLabel}": приемов ${context.appointmentCount}, открытых задач ${context.openTaskCount}, срочных ${context.urgentTaskCount}. Откройте расписание или очередь связи в DENTE.`,
				variablesUsed: [
					"staffRole",
					"appointmentCount",
					"openTaskCount",
					"urgentTaskCount",
				],
				warnings: [
					baseWarning,
					"Сводка содержит только счетчики и не раскрывает пациентов, диагнозы, зубы, оплату и документы.",
				],
				blockedReason: null,
			};
		default:
			return {
				templateKind,
				classification: "limited_admin",
				allowedByDefault: true,
				text: `DENTE: оповещение клиники ${context.clinicName}.`,
				variablesUsed: ["clinicName"],
				warnings: [baseWarning],
				blockedReason: null,
			};
	}
}

export function renderDenteTelegramMessagePreview(
	input: DenteTelegramMessagePreviewRequest,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
	state: DomainState = inMemoryDomainState,
): DenteTelegramMessagePreview {
	const clinicName = repairMojibakeText(
		state.clinicProfile?.clinicName || defaultClinicProfile.clinicName,
	);
	const text = `DENTE: оповещение клиники ${clinicName}.`;

	return denteTelegramMessagePreviewSchema.parse({
		templateKind: input.templateKind,
		classification: "limited_admin",
		allowedByDefault: true,
		text,
		replyMarkup: null,
		photoUrl: denteTelegramVisualCardUrlForTemplate(input.templateKind, settings),
		variablesUsed: ["clinicName"],
		warnings: [
			"Медицинские диагнозы и финансовые суммы защищены врачебной тайной.",
		],
		blockedReason: null,
	});
}

export function buildAllDenteTelegramOutboxItems(
	now: string,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;

	return state.communicationTasks
		.filter(
			(task) =>
				task.channel === "telegram" &&
				task.organizationId === organizationScope &&
				task.status === "needs_call",
		)
		.map((task) => {
			const templateKind = telegramTemplateKindForTask(task);
			return {
				id: `task:${task.id}`,
				organizationId: organizationScope,
				subjectType: "patient",
				subjectId: task.patientId ?? "00000000-0000-0000-0000-000000000000",
				chatLinkId: null,
				templateKind,
				title: task.title,
				previewText: task.body.slice(0, 100),
				scheduledAt: task.dueAt ?? now,
				deliveryStatus: "ready",
				taskId: task.id,
				patientId: task.patientId ?? null,
				appointmentId: task.appointmentId ?? null,
				replyMarkup: null,
				photoUrl: null,
				warnings: [],
				blockedReason: null,
				source: "communication_task",
			};
		});
}

export function buildDenteTelegramOutbox(
	options: number | BuildDenteTelegramOutboxOptions = 100,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxResponse {
	const opts = typeof options === "number" ? { limit: options } : options;
	const limit = Math.max(1, Math.min(300, opts.limit ?? 100));
	const now = new Date().toISOString();
	const items = buildAllDenteTelegramOutboxItems(now, runtimeScope, state);
	const dueItems = items.filter(
		(item) => Date.parse(item.scheduledAt) <= Date.now(),
	);

	return denteTelegramOutboxResponseSchema.parse({
		generatedAt: now,
		mode: denteTelegramBotSettings.mode,
		transportReady: true,
		totalCount: items.length,
		filteredCount: items.length,
		limit,
		cursor: null,
		nextCursor: null,
		readyCount: items.filter((i) => i.deliveryStatus === "ready").length,
		dueCount: dueItems.length,
		notDueCount: items.length - dueItems.length,
		blockedCount: items.filter((i) => i.deliveryStatus !== "ready").length,
		items: items.slice(0, limit),
		warnings: [],
	});
}

export function prepareDenteTelegramOutboxDelivery(
	outboxItemId: string,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
):
	| {
			ok: true;
			item: DenteTelegramOutboxItem;
			chatId: string;
			text: string;
			photoUrl: string | null;
			replyMarkup: Record<string, unknown> | null;
			warnings: string[];
	  }
	| {
			ok: false;
			statusCode: number;
			blockedReason: string;
			warnings: string[];
			item: DenteTelegramOutboxItem | null;
	  } {
	const outbox = buildDenteTelegramOutbox(300, runtimeScope, state);
	const item =
		outbox.items.find((candidate) => candidate.id === outboxItemId) ?? null;
	if (!item) {
		return {
			ok: false,
			statusCode: 404,
			blockedReason: "outbox_item_not_found",
			warnings: ["Позиция исходящих Telegram не найдена."],
			item: null,
		};
	}

	const chatLink = denteTelegramChatLinks.find(
		(link) =>
			link.subjectType === item.subjectType &&
			link.subjectId === item.subjectId &&
			link.status === "active",
	);

	if (!chatLink?.chatTransportRef) {
		return {
			ok: false,
			statusCode: 409,
			blockedReason: "telegram_chat_not_linked",
			warnings: ["Чат пациента или сотрудника не привязан к Telegram."],
			item,
		};
	}

	return {
		ok: true,
		item,
		chatId: chatLink.chatTransportRef,
		text: item.previewText,
		photoUrl: item.photoUrl,
		replyMarkup: (item.replyMarkup as Record<string, unknown> | null) ?? null,
		warnings: item.warnings,
	};
}
