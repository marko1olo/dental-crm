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
	type Kopecks,
} from "@dental/shared";
import {
	buildPatientLedger,
	debtNumericText,
	MoneyPrecisionError,
	patientOwesClinicKopecks,
	QuantityContractError,
} from "../../../money/patientDebt.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import { repairMojibakeText } from "../../../text/repairMojibake.js";
import {
	denteTelegramPortalUrlForTemplate,
	denteTelegramVisualCardUrlForTemplate,
} from "../telegramUrlHelpers.js";
import {
	defaultClinicProfile,
	denteTelegramBotSettings,
	denteTelegramChatLinks,
	denteTelegramOutboxDeliveryReceipts,
	inMemoryDomainState,
	resolveDenteTelegramOutboxRuntimeScope,
	type DenteTelegramOutboxRuntimeScope,
	type DomainState,
} from "./telegramRuntimeDefaults.js";

const logger = createApiLogger("telegramOutboxMessages");

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

function paymentReminderOutboxId(
	patientId: string,
	balanceDueKopecks: Kopecks,
): string {
	return `payment-reminder:${patientId}:${debtNumericText(Math.max(0, balanceDueKopecks))}`;
}

function telegramOutboxItemAlreadySent(outboxItemId: string): boolean {
	return denteTelegramOutboxDeliveryReceipts.some(
		(receipt) => receipt.outboxItemId === outboxItemId && receipt.status === "sent",
	);
}

function patientPaymentDebtKopecks(
	patientId: string,
	organizationScope: string,
	state: DomainState,
): Kopecks {
	const ledger = buildPatientLedger(
		patientId,
		state.treatmentPlanItems.filter(
			(item) => item.organizationId === organizationScope,
		),
		state.payments.filter((payment) => payment.organizationId === organizationScope),
	);
	return patientOwesClinicKopecks(ledger);
}

function patientPaymentReminderScheduledAt(
	patientId: string,
	organizationScope: string,
	state: DomainState,
): string {
	const latestPaidAtMs = state.payments
		.filter(
			(payment) =>
				payment.organizationId === organizationScope &&
				payment.patientId === patientId &&
				payment.status === "paid",
		)
		.reduce((latest, payment) => {
			const paidAtMs = Date.parse(payment.paidAt ?? payment.createdAt);
			return Number.isFinite(paidAtMs) ? Math.max(latest, paidAtMs) : latest;
		}, 0);
	const baseMs = latestPaidAtMs || Date.now();
	return new Date(baseMs + 30 * 60 * 1000).toISOString();
}

function buildDenteTelegramPaymentReminderItems(
	runtimeScope: DenteTelegramOutboxRuntimeScope | undefined,
	state: DomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	const clinicName = repairMojibakeText(
		state.clinicProfile?.clinicName || defaultClinicProfile.clinicName,
	);
	const portalUrl = denteTelegramPortalUrlForTemplate(
		"payment_reminder_notice",
		runtime.settings,
	);
	const photoUrl = denteTelegramVisualCardUrlForTemplate(
		"payment_reminder_notice",
		runtime.settings,
	);
	const previewData = buildDenteTelegramMessagePreviewData(
		"payment_reminder_notice",
		{
			clinicName,
			appointmentTime: "",
			hasAppointment: false,
			portalUrl,
			reviewUrl: runtime.settings.clinicReviewUrl ?? null,
			mapsUrl: runtime.settings.clinicMapsUrl ?? null,
		},
		"Медицинские диагнозы и финансовые суммы защищены врачебной тайной.",
	);

	return state.patients.flatMap((patient) => {
		if (patient.organizationId !== organizationScope) return [];
		if (patient.status !== "active") return [];

		let balanceDueKopecks: Kopecks;
		try {
			balanceDueKopecks = patientPaymentDebtKopecks(
				patient.id,
				organizationScope,
				state,
			);
		} catch (error) {
			if (
				error instanceof MoneyPrecisionError ||
				error instanceof QuantityContractError
			) {
				logger.error(
					{ err: safeLogError(error), patientId: patient.id, organizationId: organizationScope },
					"Напоминание об оплате пациенту не построено: ошибка точности суммы или количества",
				);
				return [];
			}
			throw error;
		}
		if (balanceDueKopecks <= 0) return [];

		const itemId = paymentReminderOutboxId(patient.id, balanceDueKopecks);
		if (telegramOutboxItemAlreadySent(itemId)) return [];

		const chatLink = denteTelegramChatLinks.find(
			(link) =>
				link.organizationId === organizationScope &&
				link.subjectType === "patient" &&
				link.subjectId === patient.id &&
				link.status === "active",
		);
		let deliveryStatus: DenteTelegramOutboxResponse["items"][number]["deliveryStatus"] =
			"ready";
		let blockedReason: string | null = null;
		if (runtime.settings.mode === "disabled") {
			deliveryStatus = "disabled";
			blockedReason = "telegram_bot_disabled";
		} else if (!chatLink) {
			deliveryStatus = "needs_chat_link";
			blockedReason = "patient_or_staff_not_linked_to_telegram";
		} else if (!runtime.botTokenConfigured || !chatLink.chatTransportRef) {
			deliveryStatus = "transport_not_ready";
			blockedReason = !runtime.botTokenConfigured
				? "telegram_bot_token_missing"
				: "encrypted_chat_transport_missing_or_unreadable";
		}

		return [
			{
				id: itemId,
				organizationId: organizationScope,
				subjectType: "patient",
				subjectId: patient.id,
				chatLinkId: chatLink?.id ?? null,
				templateKind: "payment_reminder_notice",
				title: "Напоминание об оплате",
				previewText: previewData.text,
				scheduledAt: patientPaymentReminderScheduledAt(
					patient.id,
					organizationScope,
					state,
				),
				deliveryStatus,
				taskId: null,
				patientId: patient.id,
				appointmentId: null,
				replyMarkup: null,
				photoUrl,
				warnings: [...previewData.warnings],
				blockedReason,
				source: "payment_reminder",
			},
		];
	});
}

function denteTelegramOutboxItemMatchesStatus(
	item: DenteTelegramOutboxItem,
	status: DenteTelegramOutboxStatusFilter,
	nowMs: number,
): boolean {
	if (status === "all") return true;
	if (status === "due") {
		if (item.deliveryStatus !== "ready") return false;
		const scheduledAtMs = Date.parse(item.scheduledAt);
		return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;
	}
	return item.deliveryStatus === status;
}

export function buildAllDenteTelegramOutboxItems(
	now: string,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;

	const taskItems: DenteTelegramOutboxItem[] = state.communicationTasks
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

	const paymentReminderItems = buildDenteTelegramPaymentReminderItems(
		runtime,
		state,
	);

	return [...taskItems, ...paymentReminderItems].sort((left, right) =>
		left.scheduledAt.localeCompare(right.scheduledAt),
	);
}

export function buildDenteTelegramOutbox(
	options: number | BuildDenteTelegramOutboxOptions = 100,
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxResponse {
	const opts = typeof options === "number" ? { limit: options } : options;
	const limit = Math.max(1, Math.min(300, Math.trunc(opts.limit ?? 100)));
	const statusFilter = opts.status ?? "all";
	const templateKindFilter = opts.templateKind ?? "all";
	const parsedOffset = Number.parseInt(opts.cursor ?? "0", 10);
	const safeOffset = Math.max(0, Number.isFinite(parsedOffset) ? parsedOffset : 0);
	const now = new Date().toISOString();
	const nowMs = Date.now();
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const allItems = buildAllDenteTelegramOutboxItems(now, runtime, state);
	const dueItems = allItems.filter((item) => {
		const scheduledAtMs = Date.parse(item.scheduledAt);
		return item.deliveryStatus === "ready" && (!Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs);
	});
	const filteredItems = allItems.filter((item) => {
		if (!denteTelegramOutboxItemMatchesStatus(item, statusFilter, nowMs)) {
			return false;
		}
		if (
			templateKindFilter !== "all" &&
			item.templateKind !== templateKindFilter
		) {
			return false;
		}
		return true;
	});
	const pagedItems = filteredItems.slice(safeOffset, safeOffset + limit);
	const nextOffset = safeOffset + pagedItems.length;
	const nextCursor = nextOffset < filteredItems.length ? String(nextOffset) : null;

	return denteTelegramOutboxResponseSchema.parse({
		generatedAt: now,
		mode: runtime.settings.mode,
		transportReady: runtime.botTokenConfigured,
		totalCount: allItems.length,
		filteredCount: filteredItems.length,
		limit,
		cursor: String(safeOffset),
		nextCursor,
		readyCount: allItems.filter((i) => i.deliveryStatus === "ready").length,
		dueCount: dueItems.length,
		notDueCount: allItems.filter((i) => i.deliveryStatus === "ready").length - dueItems.length,
		blockedCount: allItems.filter((i) => i.deliveryStatus !== "ready").length,
		items: pagedItems,
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
