/**
 * outboxFollowupBuilders.ts
 *
 * Builders for follow-up outbox items: appointment reminders, post-visit instructions, checkups, reviews, daily digests.
 */

import type {
	Appointment,
	CommunicationTask,
	DenteTelegramBotSettings,
	DenteTelegramOutboxItem,
	GeneratedDocument,
	Payment,
	PostVisitCareTopic,
	StaffMember,
	Visit,
} from "@dental/shared";
import type { DomainState } from "../../../types/domainState.js";
import type {
	DenteTelegramOutboxRuntimeScope,
	ResolvedDenteTelegramOutboxRuntimeScope,
} from "./types.js";
import {
	appointmentClinicDateKey,
	appointmentReminderDispatchGraceMs,
	auditEvents,
	denteTelegramChatLinks,
	inMemoryDomainState,
	isOpenCommunicationTask,
	appointments,
	activeVisit,
	nowIso,
	communicationTasks,
	patients,
	findVisitById,
	normalizePostVisitCheckupDelayHoursByTopic,
} from "./storeState.js";
import {
	denteTelegramBotSettings,
	getDenteTelegramBotSettings,
	resolveDenteTelegramOutboxRuntimeScope,
	normalizeAppointmentReminderLeadTimes,
	normalizeReviewRequestDelayHours,
} from "./botSettings.js";
import {
	activeTelegramChatLinkFor,
} from "./appointmentCallbacks.js";
import {
	buildDenteTelegramOutboxItem,
	issuedPostVisitRecommendationExists,
	telegramOutboxSafeTitle,
	telegramOutboxItemAlreadySent,
} from "./outboxItemBuilders.js";

function reviewRequestOutboxIdForVisit(
	visitId: string,
	patientId: string,
): string {
	return `review:${visitId}:${patientId}`;
}

function reviewRequestScheduledAtFromBase(
	baseAt: string | null | undefined,
	fallbackAt = nowIso,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): string {
	const baseMs = Date.parse(baseAt ?? "");
	if (!Number.isFinite(baseMs)) return fallbackAt;
	return new Date(
		baseMs +
			normalizeReviewRequestDelayHours(settings.reviewRequestDelayHours) *
				60 *
				60 *
				1000,
	).toISOString();
}

function reviewRequestScheduledAt(
	payment: Payment,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): string {
	return reviewRequestScheduledAtFromBase(
		payment.paidAt ?? payment.createdAt,
		payment.createdAt,
		settings,
	);
}

function reviewRequestScheduledAtForVisit(
	visit: Visit,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): string {
	const appointment =
		appointments.find((item) => item.id === visit.appointmentId) ?? null;
	return reviewRequestScheduledAtFromBase(
		appointment?.endsAt ?? visit.updatedAt ?? visit.createdAt,
		visit.updatedAt ?? visit.createdAt,
		settings,
	);
}

function reviewRequestAlreadySent(outboxItemId: string): boolean {
	return telegramOutboxItemAlreadySent(outboxItemId);
}



function postVisitInstructionOutboxId(
	visitId: string,
	patientId: string,
): string {
	return `post-visit:${visitId}:${patientId}`;
}

function postVisitInstructionScheduledAt(visitId: string): string {
	const appointment =
		activeVisit.id === visitId
			? (appointments.find((item) => item.id === activeVisit.appointmentId) ??
				null)
			: null;
	if (!appointment?.endsAt) return nowIso;
	const baseMs = Date.parse(appointment.endsAt);
	if (!Number.isFinite(baseMs)) return nowIso;
	return new Date(baseMs + 15 * 60 * 1000).toISOString();
}

function postVisitInstructionTaskKeepsOutboxClaim(
	task: CommunicationTask,
): boolean {
	if (["sent", "delivered", "completed"].includes(task.status)) return true;
	return task.channel === "telegram" && isOpenCommunicationTask(task);
}

function postVisitInstructionAlreadyCovered(
	visitId: string,
	patientId: string,
	outboxItemId: string,
): boolean {
	const hasTask = communicationTasks.some(
		(task) =>
			task.patientId === patientId &&
			task.visitId === visitId &&
			task.intent === "post_visit_instruction" &&
			postVisitInstructionTaskKeepsOutboxClaim(task),
	);
	if (hasTask) return true;
	return auditEvents.some(
		(event) =>
			event.entityType === "telegram_outbox" &&
			event.entityId === outboxItemId &&
			event.action === "telegram_outbound_sent",
	);
}

function appointmentReminderOutboxId(
	appointment: Appointment,
	leadTimeHours: number,
): string {
	return `appointment-reminder:${appointment.id}:${leadTimeHours}h:${appointment.patientId ?? "unknown"}`;
}

function appointmentReminderScheduledAt(
	appointment: Appointment,
	leadTimeHours: number,
): string {
	const startsAtMs = Date.parse(appointment.startsAt);
	if (!Number.isFinite(startsAtMs)) return nowIso;
	return new Date(startsAtMs - leadTimeHours * 60 * 60 * 1000).toISOString();
}

function appointmentReminderInsideDispatchWindow(
	appointment: Appointment,
	leadTimeHours: number,
	nowMs: number,
): boolean {
	const startsAtMs = Date.parse(appointment.startsAt);
	if (!Number.isFinite(startsAtMs) || startsAtMs <= nowMs) return false;
	const scheduledAtMs = startsAtMs - leadTimeHours * 60 * 60 * 1000;
	if (!Number.isFinite(scheduledAtMs) || scheduledAtMs >= startsAtMs)
		return false;
	return (
		scheduledAtMs >= nowMs ||
		nowMs - scheduledAtMs <= appointmentReminderDispatchGraceMs
	);
}

function appointmentReminderAlreadySent(outboxItemId: string): boolean {
	return auditEvents.some(
		(event) =>
			event.entityType === "telegram_outbox" &&
			event.entityId === outboxItemId &&
			event.action === "telegram_outbound_sent",
	);
}


export function staffDailyDigestOutboxId(staffId: string, now = new Date()): string {
	return `staff-digest:${appointmentClinicDateKey(now.toISOString())}:${staffId}`;
}

export function staffDailyDigestAlreadySent(outboxItemId: string): boolean {
	return auditEvents.some(
		(event) =>
			event.entityType === "telegram_outbox" &&
			event.entityId === outboxItemId &&
			event.action === "telegram_outbound_sent",
	);
}

export function buildDenteTelegramAppointmentReminderItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const { settings } = runtime;
	const nowMs = Date.now();
	const activePatientsMap = new Map(
		state.patients.filter((p) => p.status === "active").map((p) => [p.id, p]),
	);
	return state.appointments.flatMap((appointment) => {
		if (appointment.organizationId !== settings.organizationId) return [];
		if (!appointment.patientId) return [];
		const patientId = appointment.patientId;
		if (!["planned", "confirmed"].includes(appointment.status)) return [];
		const startsAtMs = Date.parse(appointment.startsAt);
		if (!Number.isFinite(startsAtMs) || startsAtMs <= nowMs) return [];
		const patient = activePatientsMap.get(patientId);
		if (!patient) return [];
		return normalizeAppointmentReminderLeadTimes(
			settings.appointmentReminderLeadTimesHours,
		).flatMap((leadTimeHours) => {
			const itemId = appointmentReminderOutboxId(appointment, leadTimeHours);
			if (appointmentReminderAlreadySent(itemId)) return [];
			if (
				!appointmentReminderInsideDispatchWindow(
					appointment,
					leadTimeHours,
					nowMs,
				)
			)
				return [];

			return [
				buildDenteTelegramOutboxItem(
					{
						id: itemId,
						task: null,
						subjectType: "patient",
						subjectId: patientId,
						appointmentId: appointment.id,
						templateKind: "appointment_reminder",
						scheduledAt: appointmentReminderScheduledAt(
							appointment,
							leadTimeHours,
						),
						source: "appointment_reminder",
					},
					runtime,
					state,
				),
			];
		});
	});
}

export function buildDenteTelegramPostVisitInstructionItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	const visitPatientPairs = new Map<
		string,
		{ visitId: string; patientId: string }
	>();
	const activePatientsMap = new Map(
		state.patients.filter((p) => p.status === "active").map((p) => [p.id, p]),
	);
	for (const item of state.treatmentPlanItems) {
		if (!item.visitId || item.organizationId !== organizationScope) continue;
		if (item.status !== "completed" && item.status !== "in_progress") continue;
		const patient = activePatientsMap.get(item.patientId);
		if (!patient) continue;
		visitPatientPairs.set(`${item.visitId}:${item.patientId}`, {
			visitId: item.visitId,
			patientId: item.patientId,
		});
	}
	for (const document of state.documents) {
		if (document.organizationId !== organizationScope) continue;
		if (document.kind !== "post_visit_recommendations") continue;
		if (document.status !== "issued") continue;
		if (
			!document.visitId ||
			!document.payload?.postVisitRecommendations?.safeForTelegramSending
		)
			continue;
		const patient = activePatientsMap.get(document.patientId);
		if (!patient) continue;
		visitPatientPairs.set(`${document.visitId}:${document.patientId}`, {
			visitId: document.visitId,
			patientId: document.patientId,
		});
	}

	return [...visitPatientPairs.values()].flatMap(({ visitId, patientId }) => {
		const itemId = postVisitInstructionOutboxId(visitId, patientId);
		if (postVisitInstructionAlreadyCovered(visitId, patientId, itemId))
			return [];
		return [
			buildDenteTelegramOutboxItem(
				{
					id: itemId,
					task: null,
					subjectType: "patient",
					subjectId: patientId,
					visitId,
					templateKind: "post_visit_instruction_link",
					scheduledAt: postVisitInstructionScheduledAt(visitId),
					source: "post_visit_instruction",
				},
				runtime,
				state,
			),
		];
	});
}

function postVisitCheckupOutboxId(document: GeneratedDocument): string {
	return `post-visit-checkup:${document.visitId ?? document.id}:${document.patientId}`;
}

function postVisitCheckupDelayHours(
	careTopic: PostVisitCareTopic,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): number {
	const delays = normalizePostVisitCheckupDelayHoursByTopic(
		settings.postVisitCheckupDelayHoursByTopic,
	);
	return delays[careTopic] ?? delays.other;
}

function postVisitCheckupScheduledAt(
	document: GeneratedDocument,
	settings: DenteTelegramBotSettings = denteTelegramBotSettings,
): string {
	const issuedAtMs = Date.parse(document.issuedAt ?? "");
	const baseMs = Number.isFinite(issuedAtMs) ? issuedAtMs : Date.now();
	const careTopic =
		document.payload?.postVisitRecommendations?.careTopic ?? "other";
	return new Date(
		baseMs + postVisitCheckupDelayHours(careTopic, settings) * 60 * 60 * 1000,
	).toISOString();
}

function postVisitCheckupAlreadyCovered(outboxItemId: string): boolean {
	return telegramOutboxItemAlreadySent(outboxItemId);
}

export function buildDenteTelegramPostVisitCheckupItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	return state.documents.flatMap((document) => {
		if (document.organizationId !== organizationScope) return [];
		if (document.kind !== "post_visit_recommendations") return [];
		if (document.status !== "issued") return [];
		if (!document.visitId) return [];
		if (!document.payload?.postVisitRecommendations?.safeForTelegramSending)
			return [];
		const patient = state.patients.find(
			(candidate) =>
				candidate.id === document.patientId && candidate.status === "active",
		);
		if (!patient) return [];

		const itemId = postVisitCheckupOutboxId(document);
		if (postVisitCheckupAlreadyCovered(itemId)) return [];

		return [
			buildDenteTelegramOutboxItem(
				{
					id: itemId,
					task: null,
					subjectType: "patient",
					subjectId: document.patientId,
					visitId: document.visitId,
					documentId: document.id,
					templateKind: "post_visit_checkup",
					scheduledAt: postVisitCheckupScheduledAt(document, runtime.settings),
					source: "post_visit_checkup",
				},
				runtime,
				state,
			),
		];
	});
}

function reviewRequestVisitIsClosedByVisit(visit: Visit): boolean {
	if (visit.status === "signed") return true;
	const appointment =
		appointments.find((item) => item.id === visit.appointmentId) ?? null;
	return appointment?.status === "completed";
}

function reviewRequestClosedVisitCandidates(
	organizationScope = denteTelegramBotSettings.organizationId,
): Visit[] {
	return [activeVisit].filter((visit) => {
		if (visit.organizationId !== organizationScope) return false;
		const patient =
			patients.find(
				(candidate) =>
					candidate.id === visit.patientId && candidate.status === "active",
			) ?? null;
		return Boolean(patient && reviewRequestVisitIsClosedByVisit(visit));
	});
}

export function buildDenteTelegramReviewRequestItems(
	runtimeScope?: DenteTelegramOutboxRuntimeScope,
	state: DomainState = inMemoryDomainState,
): DenteTelegramOutboxItem[] {
	const runtime = resolveDenteTelegramOutboxRuntimeScope(runtimeScope);
	const organizationScope = runtime.settings.organizationId;
	const seenSubjects = new Set<string>();
	const items: DenteTelegramOutboxItem[] = [];
	const pushReviewRequest = (input: {
		patientId: string;
		visitId: string | null;
		appointmentId?: string | null;
		paymentId?: string | null;
		scheduledAt: string;
	}) => {
		const sourceId = input.visitId ?? input.paymentId;
		if (!sourceId) return;
		const subjectKey = `${sourceId}:${input.patientId}`;
		if (seenSubjects.has(subjectKey)) return;
		const itemId = input.visitId
			? reviewRequestOutboxIdForVisit(input.visitId, input.patientId)
			: `review:${sourceId}:${input.patientId}`;
		if (reviewRequestAlreadySent(itemId)) return;
		seenSubjects.add(subjectKey);
		items.push(
			buildDenteTelegramOutboxItem(
				{
					id: itemId,
					task: null,
					subjectType: "patient",
					subjectId: input.patientId,
					appointmentId: input.appointmentId ?? null,
					visitId: input.visitId,
					templateKind: "review_request",
					scheduledAt: input.scheduledAt,
					source: "review_request",
				},
				runtime,
				state,
			),
		);
	};

	const closedVisits = reviewRequestClosedVisitCandidates(
		organizationScope,
	).sort((left, right) =>
		(right.updatedAt ?? right.createdAt).localeCompare(
			left.updatedAt ?? left.createdAt,
		),
	);
	for (const visit of closedVisits) {
		pushReviewRequest({
			patientId: visit.patientId,
			visitId: visit.id,
			appointmentId: visit.appointmentId,
			scheduledAt: reviewRequestScheduledAtForVisit(visit, runtime.settings),
		});
	}

	const paidMilestones = [...state.payments]
		.filter(
			(payment) =>
				payment.organizationId === organizationScope &&
				payment.status === "paid",
		)
		.sort((left, right) =>
			(right.paidAt ?? right.createdAt).localeCompare(
				left.paidAt ?? left.createdAt,
			),
		);

	const activePatientsById = new Map(
		state.patients.filter((p) => p.status === "active").map((p) => [p.id, p]),
	);

	for (const payment of paidMilestones) {
		const patient = activePatientsById.get(payment.patientId) ?? null;
		if (!patient || !reviewRequestVisitIsClosed(payment)) continue;
		const visit = payment.visitId ? findVisitById(payment.visitId) : null;
		pushReviewRequest({
			patientId: payment.patientId,
			visitId: payment.visitId ?? null,
			appointmentId: visit?.appointmentId ?? null,
			paymentId: payment.id,
			scheduledAt: reviewRequestScheduledAt(payment, runtime.settings),
		});
	}

	return items;
}

function reviewRequestVisitIsClosed(payment: Payment): boolean {
	if (!payment.visitId) return false;
	const visit = findVisitById(payment.visitId);
	if (!visit) return false;
	return reviewRequestVisitIsClosedByVisit(visit);
}

