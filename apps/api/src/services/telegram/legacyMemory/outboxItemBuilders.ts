/**
 * outboxItemBuilders.ts
 *
 * Builders for core outbox items: payment reminders, recalls, tax documents, document ready.
 */

import type {
	Appointment,
	CommunicationTask,
	DenteTelegramOutboxDeliveryStatus,
	DenteTelegramOutboxItem,
	DenteTelegramOutboxResponse,
	DenteTelegramTemplateKind,
	DocumentKind,
	GeneratedDocument,
	Patient,
	TreatmentPlanItem,
} from "@dental/shared";
import {
	buildPatientLedger,
	debtNumericText,
	type Kopecks,
	patientOwesClinicKopecks,
	MoneyPrecisionError,
	QuantityContractError,
} from "../../../money/patientDebt.js";
import type { DomainState } from "../../../types/domainState.js";
import type {
	DenteTelegramOutboxRuntimeScope,
	ResolvedDenteTelegramOutboxRuntimeScope,
} from "./types.js";
import {
	appointmentReminderDispatchGraceMs,
	denteTelegramChatLinks,
	inMemoryDomainState,
	isOpenCommunicationTask,
	documents,
	appointments,
	nowIso,
	uniqueStrings,
	communicationTasks,
	findVisitById,
	getServiceCatalogItem,
	auditEvents,
} from "./storeState.js";
import {
	denteTelegramPortalUrlForTemplate,
	denteTelegramVisualCardUrlForTemplate,
} from "./botUrlHelpers.js";
import {
	denteTelegramBotSettings,
	getDenteTelegramBotSettings,
	resolveDenteTelegramOutboxRuntimeScope,
} from "./botSettings.js";
import {
	activeTelegramChatLinkFor,
	telegramFeatureForTemplate,
} from "./appointmentCallbacks.js";
import {
	decryptTelegramChatTransportRef,
} from "./linkCodes.js";
import {
	renderDenteTelegramMessagePreview,
} from "./messageRenderer.js";
import {
	telegramReplyMarkupFor,
} from "./replyMarkups.js";

export function telegramOutboxSafeTitle(
	templateKind: DenteTelegramTemplateKind,
	subjectType: "patient" | "staff",
): string {
	if (subjectType === "staff") return "Ежедневная сводка DENTE";
	const titles: Record<DenteTelegramTemplateKind, string> = {
		appointment_reminder: "Напоминание о приеме",
		appointment_confirmation: "Подтверждение приема",
		payment_reminder_notice: "Напоминание об оплате",
		document_ready_notice: "Документ готов",
		tax_document_request_status: "Статус налоговых документов",
		callback_request_received: "Запрос обратного звонка",
		post_visit_instruction_link: "Памятка после приема",
		post_visit_checkup: "Контроль после приема",
		recall_notice: "Профилактическое напоминание",
		review_request: "Просьба оценить визит",
		staff_daily_digest: "Ежедневная сводка DENTE",
	};
	return titles[templateKind];
}

export function issuedPostVisitRecommendationExists(
	input: {
		patientId: string;
		visitId?: string | null;
		documentId?: string | null;
	},
	organizationScope = denteTelegramBotSettings.organizationId,
): boolean {
	if (!input.visitId && !input.documentId) return false;
	return documents.some((document) => {
		if (document.organizationId !== organizationScope) return false;
		if (document.patientId !== input.patientId) return false;
		if (document.kind !== "post_visit_recommendations") return false;
		if (document.status !== "issued") return false;
		if (!document.payload?.postVisitRecommendations?.safeForTelegramSending)
			return false;
		if (input.documentId && document.id !== input.documentId) return false;
		if (input.visitId && document.visitId !== input.visitId) return false;
		return true;
	});
}

export function buildDenteTelegramOutboxItem(
	input: {
		id: string;
		task: CommunicationTask | null;
		subjectType: "patient" | "staff";
		subjectId: string;
		appointmentId?: string | null;
		visitId?: string | null;
		documentId?: string | null;
		templateKind: DenteTelegramTemplateKind;
		scheduledAt: string;
		source:
			| "communication_task"
			| "staff_digest"
			| "document_ready"
			| "payment_reminder"
			| "review_request"
			| "post_visit_instruction"
			| "post_visit_checkup"
			| "recall"
			| "appointment_reminder"
			| "tax_document_request";
	},
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
) {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const { settings } = runtime;
	const feature = telegramFeatureForTemplate(input.templateKind);
	const chatLink = activeTelegramChatLinkFor(
		input.subjectType,
		input.subjectId,
		settings.organizationId,
		runtime.botConfigId,
	);
	const preview =
		input.task && input.subjectType === "patient"
			? renderDenteTelegramMessagePreview(
					{
						templateKind: input.templateKind,
						patientId: input.task.patientId,
						appointmentId: input.task.appointmentId ?? undefined,
						documentId: input.task.documentId ?? undefined,
						taskId: input.task.id,
						includePhi: false,
					},
					settings,
					state,
				)
			: renderDenteTelegramMessagePreview(
					{
						templateKind: input.templateKind,
						patientId:
							input.subjectType === "patient" ? input.subjectId : undefined,
						staffId:
							input.subjectType === "staff" ? input.subjectId : undefined,
						appointmentId: input.appointmentId ?? undefined,
						documentId: input.documentId ?? undefined,
						includePhi: false,
					},
					settings,
					state,
				);
	const warnings = [...preview.warnings];
	const replyMarkup = preview.allowedByDefault
		? telegramReplyMarkupFor(
				input.templateKind,
				input.appointmentId ?? input.task?.appointmentId ?? null,
				settings,
				{
					organizationId: settings.organizationId,
					clinicId: runtime.clinicId,
					botConfigId: runtime.botConfigId,
				},
			)
		: null;
	const transportReady =
		settings.mode !== "disabled" && runtime.botTokenConfigured;
	const chatTransportReady = Boolean(
		chatLink?.chatTransportRef &&
			decryptTelegramChatTransportRef(chatLink.chatTransportRef),
	);
	let deliveryStatus: DenteTelegramOutboxResponse["items"][number]["deliveryStatus"] =
		"ready";
	let blockedReason: string | null = null;

	if (settings.mode === "disabled") {
		deliveryStatus = "disabled";
		blockedReason = "telegram_bot_disabled";
	} else if (feature && !settings.enabledFeatures.includes(feature)) {
		deliveryStatus = "disabled";
		blockedReason = `feature_disabled:${feature}`;
	} else if (!preview.allowedByDefault) {
		deliveryStatus = "blocked_by_policy";
		blockedReason = preview.blockedReason ?? "blocked_by_policy";
	} else if (!chatLink) {
		deliveryStatus = "needs_chat_link";
		blockedReason = "patient_or_staff_not_linked_to_telegram";
	} else if (!transportReady || !chatTransportReady) {
		deliveryStatus = "transport_not_ready";
		blockedReason = !transportReady
			? "telegram_bot_token_missing"
			: "encrypted_chat_transport_missing_or_unreadable";
	} else if (
		input.templateKind === "post_visit_instruction_link" &&
		input.subjectType === "patient" &&
		!issuedPostVisitRecommendationExists(
			{
				patientId: input.subjectId,
				visitId: input.visitId ?? input.task?.visitId ?? null,
				documentId: input.task?.documentId ?? null,
			},
			settings.organizationId,
		)
	) {
		deliveryStatus = "blocked_by_policy";
		blockedReason = "post_visit_recommendation_document_not_issued";
	}

	if (!chatTransportReady && chatLink) {
		warnings.push(
			"Чат привязан, но отправка недоступна до настройки защищенной серверной связки и повторной привязки пользователя.",
		);
	}
	if (blockedReason === "post_visit_recommendation_document_not_issued") {
		warnings.push(
			"Сначала выпустите документ 'Рекомендации после приема' с Telegram-текстом, затем отправляйте памятку пациенту.",
		);
	}

	return {
		id: input.id,
		organizationId: settings.organizationId,
		taskId: input.task?.id ?? null,
		patientId: input.subjectType === "patient" ? input.subjectId : null,
		appointmentId: input.appointmentId ?? input.task?.appointmentId ?? null,
		subjectType: input.subjectType,
		subjectId: input.subjectId,
		chatLinkId: chatLink?.id ?? null,
		templateKind: input.templateKind,
		deliveryStatus,
		scheduledAt: input.scheduledAt,
		title: telegramOutboxSafeTitle(input.templateKind, input.subjectType),
		previewText: preview.text,
		replyMarkup,
		photoUrl: preview.photoUrl,
		warnings,
		blockedReason,
		source: input.source,
	};
}

function paymentReminderOutboxId(
	patientId: string,
	balanceDueKopecks: Kopecks,
): string {
	return `payment-reminder:${patientId}:${debtNumericText(Math.max(0, balanceDueKopecks))}`;
}

function paymentReminderAlreadyCovered(outboxItemId: string): boolean {
	return telegramOutboxItemAlreadySent(outboxItemId);
}

function patientPaymentDebtKopecks(
	patientId: string,
	organizationScope = denteTelegramBotSettings.organizationId,
	state: DomainState = inMemoryDomainState,
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
	organizationScope = denteTelegramBotSettings.organizationId,
	state: DomainState = inMemoryDomainState,
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

export function buildDenteTelegramPaymentReminderItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	return state.patients.flatMap((patient) => {
		if (patient.organizationId !== organizationScope) return [];
		if (patient.status !== "active") return [];

		/*
		 * Отказ модуля ловится, а не летит наверх. Модуль отвергает суммы,
		 * потерявшие точность, и количество вне общего контракта; одна такая
		 * строка у одного пациента не должна ронять ВСЮ очередь отправок клиники
		 * пятисоткой — иначе из-за одной испорченной цены не уйдёт ни одно
		 * напоминание, ни одно подтверждение записи, ни одна памятка. Цена этой
		 * ветки названа прямо: напоминание этому пациенту не уйдёт, и причина
		 * обязана быть в журнале целиком, иначе потерянные деньги никто не найдёт.
		 */
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
				console.error(
					`[Telegram] Напоминание об оплате пациенту ${patient.id} не построено: ${error.message} ` +
						"Долг не рассчитан, поэтому напоминание не уйдёт — почините строку денег, названную в причине.",
				);
				return [];
			}
			throw error;
		}
		if (balanceDueKopecks <= 0) return [];

		const itemId = paymentReminderOutboxId(patient.id, balanceDueKopecks);
		if (paymentReminderAlreadyCovered(itemId)) return [];

		return [
			buildDenteTelegramOutboxItem(
				{
					id: itemId,
					task: null,
					subjectType: "patient",
					subjectId: patient.id,
					templateKind: "payment_reminder_notice",
					scheduledAt: patientPaymentReminderScheduledAt(
						patient.id,
						organizationScope,
						state,
					),
					source: "payment_reminder",
				},
				runtime,
				state,
			),
		];
	});
}

function recallOutboxId(item: TreatmentPlanItem): string {
	return `recall:${item.visitId ?? item.id}:${item.patientId}`;
}

function recallAlreadyCovered(outboxItemId: string): boolean {
	return telegramOutboxItemAlreadySent(outboxItemId);
}

function treatmentPlanItemAppointment(
	item: TreatmentPlanItem,
): Appointment | null {
	if (!item.visitId) return null;
	const visit = findVisitById(item.visitId);
	return visit
		? (appointments.find(
				(appointment) => appointment.id === visit.appointmentId,
			) ?? null)
		: null;
}

function recallScheduledAt(item: TreatmentPlanItem): string {
	const appointment = treatmentPlanItemAppointment(item);
	const appointmentEndMs = appointment ? Date.parse(appointment.endsAt) : NaN;
	const base = new Date(
		Number.isFinite(appointmentEndMs) ? appointmentEndMs : Date.now(),
	);
	base.setUTCMonth(base.getUTCMonth() + 6);
	return base.toISOString();
}

export function buildDenteTelegramRecallItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	const activePatientsMap = new Map(
		state.patients.filter((p) => p.status === "active").map((p) => [p.id, p]),
	);
	return state.treatmentPlanItems.flatMap((item) => {
		if (item.organizationId !== organizationScope) return [];
		if (item.status !== "completed") return [];

		// БЫЛО: только индекс, без запасного поиска по прайсу. Услуга, добавленная
		// после построения индекса, не находилась, и напоминание о гигиене
		// пациенту не уходило вовсе.
		const service = getServiceCatalogItem(item.serviceId, state);
		if (service?.category !== "hygiene") return [];

		const patient = activePatientsMap.get(item.patientId);
		if (!patient) return [];

		const itemId = recallOutboxId(item);
		if (recallAlreadyCovered(itemId)) return [];

		return [
			buildDenteTelegramOutboxItem(
				{
					id: itemId,
					task: null,
					subjectType: "patient",
					subjectId: item.patientId,
					visitId: item.visitId,
					templateKind: "recall_notice",
					scheduledAt: recallScheduledAt(item),
					source: "recall",
				},
				runtime,
				state,
			),
		];
	});
}


export function telegramOutboxItemAlreadySent(outboxItemId: string): boolean {
	return auditEvents.some(
		(event) =>
			event.entityType === "telegram_outbox" &&
			event.entityId === outboxItemId &&
			event.action === "telegram_outbound_sent",
	);
}

function taxDocumentRequestOutboxId(document: GeneratedDocument): string {
	return `tax-request:${document.id}:${document.patientId}`;
}

function taxDocumentRequestAlreadySent(outboxItemId: string): boolean {
	return telegramOutboxItemAlreadySent(outboxItemId);
}

function taxApplicationScheduledAt(document: GeneratedDocument): string {
	const requestedAt =
		document.payload?.taxDeductionApplication?.requestedAt ??
		document.issuedAt ??
		nowIso;
	const requestedAtMs = Date.parse(requestedAt);
	if (!Number.isFinite(requestedAtMs)) return nowIso;
	return new Date(requestedAtMs + 15 * 60 * 1000).toISOString();
}

function taxApplicationSlaWarning(document: GeneratedDocument): string | null {
	const requestedAt =
		document.payload?.taxDeductionApplication?.requestedAt ?? document.issuedAt;
	const requestedAtMs = Date.parse(requestedAt ?? "");
	if (!Number.isFinite(requestedAtMs)) return null;
	const ageDays = Math.floor(
		(Date.now() - requestedAtMs) / (24 * 60 * 60 * 1000),
	);
	if (ageDays >= 30) {
		return "Заявление на налоговую справку старше 30 дней. Если клиника отправляет сведения в ФНС электронно, проверьте ТКС/КЭП и корректировку вручную.";
	}
	if (ageDays >= 25) {
		return "До 30-дневного срока по электронному направлению сведений в ФНС осталось меньше недели. Проверьте готовность справки и ТКС-выгрузки.";
	}
	return null;
}

export function buildDenteTelegramTaxDocumentRequestItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	// Один индекс активных пациентов вместо линейного поиска на каждый документ.
	const activePatientIds = new Set(
		state.patients
			.filter((candidate) => candidate.status === "active")
			.map((candidate) => candidate.id),
	);
	return state.documents.flatMap((document) => {
		if (document.organizationId !== organizationScope) return [];
		if (document.kind !== "tax_deduction_application") return [];
		if (document.status !== "issued") return [];
		if (!document.payload?.taxDeductionApplication) return [];
		if (!document.patientId) return [];
		if (!activePatientIds.has(document.patientId)) return [];

		const itemId = taxDocumentRequestOutboxId(document);
		if (taxDocumentRequestAlreadySent(itemId)) return [];

		const item = buildDenteTelegramOutboxItem(
			{
				id: itemId,
				task: null,
				subjectType: "patient",
				subjectId: document.patientId,
				documentId: document.id,
				templateKind: "tax_document_request_status",
				scheduledAt: taxApplicationScheduledAt(document),
				source: "tax_document_request",
			},
			runtime,
			state,
		);
		const warning = taxApplicationSlaWarning(document);
		return warning
			? [{ ...item, warnings: uniqueStrings([...item.warnings, warning]) }]
			: [item];
	});
}

const documentReadyNoticeExcludedKinds = new Set<DocumentKind>([
	"tax_deduction_application",
	"post_visit_recommendations",
]);

function documentReadyOutboxId(document: GeneratedDocument): string {
	return `document-ready:${document.id}:${document.patientId}`;
}

function documentReadyScheduledAt(document: GeneratedDocument): string {
	const issuedAtMs = Date.parse(document.issuedAt ?? "");
	if (!Number.isFinite(issuedAtMs)) return nowIso;
	return new Date(issuedAtMs + 5 * 60 * 1000).toISOString();
}

function documentReadyTaskKeepsOutboxClaim(task: CommunicationTask): boolean {
	if (["sent", "delivered", "completed"].includes(task.status)) return true;
	return task.channel === "telegram" && isOpenCommunicationTask(task);
}

function documentReadyAlreadyCovered(
	document: GeneratedDocument,
	outboxItemId: string,
): boolean {
	const hasTask = communicationTasks.some(
		(task) =>
			task.patientId === document.patientId &&
			task.documentId === document.id &&
			task.intent === "document_ready" &&
			task.channel === "telegram" &&
			documentReadyTaskKeepsOutboxClaim(task),
	);
	return hasTask || telegramOutboxItemAlreadySent(outboxItemId);
}

export function buildDenteTelegramDocumentReadyItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;

	const activePatients = new Map<string, Patient>();
	for (const p of state.patients) {
		if (p.status === "active") {
			activePatients.set(p.id, p);
		}
	}

	return state.documents.flatMap((document) => {
		if (document.organizationId !== organizationScope) return [];
		if (document.status !== "issued") return [];
		if (documentReadyNoticeExcludedKinds.has(document.kind)) return [];
		const patient = activePatients.get(document.patientId);
		if (!patient) return [];

		const itemId = documentReadyOutboxId(document);
		if (documentReadyAlreadyCovered(document, itemId)) return [];

		return [
			buildDenteTelegramOutboxItem(
				{
					id: itemId,
					task: null,
					subjectType: "patient",
					subjectId: document.patientId,
					documentId: document.id,
					templateKind: "document_ready_notice",
					scheduledAt: documentReadyScheduledAt(document),
					source: "document_ready",
				},
				runtime,
				state,
			),
		];
	});
}

