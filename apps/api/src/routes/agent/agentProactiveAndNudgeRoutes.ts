/**
 * agentProactiveAndNudgeRoutes.ts — Proactive Clinical Nudges, HITL Approvals & Sentinel Analysis
 * Mandate 8b: Submodule decomposed from monolith agentRoutes.ts.
 * Zero In-Memory Leak: Persistent dismissal in PostgreSQL (doctorPreferences).
 * Zero Fake Streams: Potemkin SSE stream with empty ping loop eliminated.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { defineTenantMutation, defineTenantQuery } from "../../core/routeFactories.js";
import { copilotHitlCards } from "../../db/schema/copilot.js";
import { patientDrugAllergies, patients } from "../../db/schema/patients.js";
import { visits } from "../../db/schema/clinical/visitsSchema.js";
import { UUID_REGEX } from "../../ai/session/copilotSessionTypes.js";
import {
	getDoctorPreferencesFromDb,
	saveDoctorPreferencesInDb,
} from "../../db/doctorPreferencesQuery.js";
import { isMachineDeliverableChannel } from "../../services/communications/channelRouter.js";
import { resolveRecipientAddress } from "../../services/communications/dispatch/channelAdapters.js";
import { enqueueMessage } from "../../services/communications/dispatch/dispatcherCore.js";

const nudgesQuerySchema = z
	.object({
		patientId: z.string().uuid().optional(),
		visitId: z.string().uuid().optional(),
	})
	.strict();

const dismissNudgeBodySchema = z
	.object({
		id: z.string().trim().min(1).max(200),
	})
	.strict();

const approveProactiveBodySchema = z
	.object({
		approvalId: z.string().uuid(),
		modifiedReply: z.string().max(10000).optional(),
		sendNow: z.boolean().optional(),
	})
	.strict();

const rejectProactiveBodySchema = z
	.object({
		approvalId: z.string().uuid(),
		reason: z.string().max(2000).optional(),
	})
	.strict();

const dismissAlertBodySchema = z
	.object({
		alertId: z.string().trim().min(1).max(200),
	})
	.strict();

const sentinelAnalyzeBodySchema = z
	.object({
		patientId: z.string().uuid().optional(),
		mode: z.string().trim().min(1).max(64).optional(),
	})
	.strict();

const PROACTIVE_AUTH_OPTIONS = {
	allowClinicTokenWithoutStaff: false,
} as const;

export async function registerAgentProactiveAndNudgeRoutes(
	server: FastifyInstance,
): Promise<void> {
	for (const endpoint of ["/api/agent/nudges", "/api/v1/copilot/nudges"]) {
		defineTenantQuery(server, {
			method: "GET",
			path: endpoint,
			permission: "agent.read",
			authOptions: PROACTIVE_AUTH_OPTIONS,
			handler: async ({ tx, principal, organizationId, request, reply }) => {
				const parsedQuery = nudgesQuerySchema.safeParse(request.query ?? {});
				if (!parsedQuery.success) {
					return reply.code(400).send({
						ok: false,
						error: "ValidationError",
						message: "Некорректные параметры запроса подсказок",
						details: parsedQuery.error.format(),
					});
				}

				try {
					const query = parsedQuery.data;
					const visitFilters = [eq(visits.organizationId, organizationId), eq(visits.status, "draft")];
					if (query.patientId) visitFilters.push(eq(visits.patientId, query.patientId));
					if (query.visitId) visitFilters.push(eq(visits.id, query.visitId));

					const draftVisits = await tx
						.select()
						.from(visits)
						.where(and(...visitFilters))
						.orderBy(desc(visits.createdAt))
						.limit(10);

					const allergyFilters = [eq(patientDrugAllergies.organizationId, organizationId)];
					if (query.patientId) allergyFilters.push(eq(patientDrugAllergies.patientId, query.patientId));

					const allergies = await tx
						.select()
						.from(patientDrugAllergies)
						.where(and(...allergyFilters))
						.orderBy(desc(patientDrugAllergies.createdAt))
						.limit(10);

					const nudges: Array<{ id: string; kind: string; title: string; text: string; priority: "low" | "medium" | "high"; payload?: Record<string, unknown>; created_at: string }> = [];

					for (const v of draftVisits) {
						if (!v.diagnosis || !v.diagnosis.trim()) {
							nudges.push({
								id: `nudge_missing_diag_${v.id}`,
								kind: "missing_diagnosis",
								title: "Незаполнен диагноз в черновике приёма",
								text: "В открытом черновике приёма пациента не указан диагноз по МКБ-10. Рекомендуется заполнить протокол.",
								priority: "high",
								payload: { visitId: v.id, patientId: v.patientId },
								created_at: v.createdAt.toISOString(),
							});
						}
						if (!v.complaint || !v.complaint.trim()) {
							nudges.push({
								id: `nudge_missing_complaint_${v.id}`,
								kind: "missing_complaint",
								title: "Отсутствуют жалобы пациента",
								text: "Зафиксируйте жалобы пациента или подтвердите норму («Жалоб нет»).",
								priority: "medium",
								payload: { visitId: v.id, patientId: v.patientId },
								created_at: v.createdAt.toISOString(),
							});
						}
					}

					for (const a of allergies) {
						nudges.push({
							id: `nudge_allergy_${a.id}`,
							kind: "allergy_alert",
							title: `⚠️ Аллергический стоп-фактор: ${a.allergenGroup}`,
							text: `Зафиксирована реакция (${a.reactionSeverity}) на ${a.allergenGroup}${a.drugInnLatin ? ` (${a.drugInnLatin})` : ""}: ${a.clinicalManifestations || "соблюдайте осторожность при выборе анестезии и фармпрепаратов"}.`,
							priority: "high",
							payload: { allergyId: a.id, patientId: a.patientId, allergenGroup: a.allergenGroup, severity: a.reactionSeverity },
							created_at: a.createdAt.toISOString(),
						});
					}

					const prefRecord = await getDoctorPreferencesFromDb(organizationId, principal.userId || null, tx);
					const doctorPrefs = (prefRecord?.preferences || {}) as Record<string, unknown>;
					const dismissedList = Array.isArray(doctorPrefs.copilotDismissedNudgeIds) ? (doctorPrefs.copilotDismissedNudgeIds as string[]) : [];
					const dismissedSet = new Set(dismissedList);
					const activeNudges = nudges.filter((n) => !dismissedSet.has(n.id));

					return { ok: true, nudges: activeNudges };
				} catch (err) {
					request.log.error({ err }, "[agentProactiveAndNudgeRoutes] Failed to generate dynamic copilot nudges");
					return reply.code(500).send({
						ok: false,
						error: "InternalServerError",
						message: "Не удалось загрузить клинические подсказки",
					});
				}
			},
		});
	}

	for (const endpoint of ["/api/agent/dismiss-nudge", "/api/v1/copilot/dismiss-nudge"]) {
		defineTenantMutation(server, {
			method: "POST",
			path: endpoint,
			permission: "agent.write",
			authOptions: PROACTIVE_AUTH_OPTIONS,
			idempotency: "optional_header",
			execute: async ({ tx, principal, organizationId, request, reply }) => {
				const parsedBody = dismissNudgeBodySchema.safeParse(request.body ?? {});
				if (!parsedBody.success) {
					return reply.code(400).send({
						ok: false,
						error: "ValidationError",
						message: "Некорректный идентификатор подсказки",
						details: parsedBody.error.format(),
					});
				}

				const nudgeId = parsedBody.data.id;
				try {
					const prefRecord = await getDoctorPreferencesFromDb(organizationId, principal.userId || null, tx);
					const doctorPrefs = (prefRecord?.preferences || {}) as Record<string, unknown>;
					const existingDismissed = Array.isArray(doctorPrefs.copilotDismissedNudgeIds) ? (doctorPrefs.copilotDismissedNudgeIds as string[]) : [];
					if (!existingDismissed.includes(nudgeId)) {
						await saveDoctorPreferencesInDb(
							organizationId,
							principal.userId || null,
							{ ...doctorPrefs, copilotDismissedNudgeIds: [...existingDismissed, nudgeId] },
							prefRecord?.specialty || "therapist",
							tx,
						);
					}
					return { ok: true, dismissedId: nudgeId };
				} catch (err) {
					request.log.error({ err, nudgeId }, "[agentProactiveAndNudgeRoutes] Failed to persist dismissed nudge");
					return reply.code(500).send({
						ok: false,
						error: "InternalServerError",
						message: "Не удалось скрыть подсказку",
					});
				}
			},
		});
	}

	for (const endpoint of ["/api/agent/proactive/pending", "/api/v1/copilot/proactive/pending"]) {
		defineTenantQuery(server, {
			method: "GET",
			path: endpoint,
			permission: "agent.read",
			authOptions: PROACTIVE_AUTH_OPTIONS,
			handler: async ({ tx, principal, organizationId, request, reply }) => {
				const parsedQuery = nudgesQuerySchema.safeParse(request.query ?? {});
				if (!parsedQuery.success) {
					return reply.code(400).send({
						ok: false,
						error: "ValidationError",
						message: "Некорректные параметры запроса уведомлений",
						details: parsedQuery.error.format(),
					});
				}

				try {
					const query = parsedQuery.data;
					const cardFilters = [
						eq(copilotHitlCards.organizationId, organizationId),
						eq(copilotHitlCards.status, "pending"),
					];
					if (query.patientId) {
						cardFilters.push(eq(copilotHitlCards.patientId, query.patientId));
					}

					const cards = await tx
						.select()
						.from(copilotHitlCards)
						.where(and(...cardFilters))
						.orderBy(desc(copilotHitlCards.createdAt))
						.limit(20);

					const mappedHitlCards = cards.map((c) => ({
						approvalId: c.id,
						patientId: c.patientId,
						patientName: c.patientName,
						phone: c.phone,
						intent: c.intent,
						urgency: c.urgency,
						incomingSnippet: c.incomingSnippet,
						draftReply: c.draftReply,
						channel: c.channel,
						confidenceScore: c.confidenceScore ? Number(c.confidenceScore) : 0.95,
						actionPrompt: c.actionPrompt || undefined,
						category: c.category || "chairside_triage",
						metadata: (c.metadata as Record<string, unknown>) || {},
						createdAt: c.createdAt.toISOString(),
					}));

					const prefRecord = await getDoctorPreferencesFromDb(organizationId, principal.userId ?? null, tx);
					const doctorPrefs = (prefRecord?.preferences ?? {}) as Record<string, unknown>;
					const dismissedAlerts = Array.isArray(doctorPrefs.copilotDismissedAlertIds)
						? (doctorPrefs.copilotDismissedAlertIds as string[])
						: [];
					const dismissedSet = new Set(dismissedAlerts);

					const allergyFilters = [eq(patientDrugAllergies.organizationId, organizationId)];
					if (query.patientId) {
						allergyFilters.push(eq(patientDrugAllergies.patientId, query.patientId));
					}

					const allergyRows = await tx
						.select({
							id: patientDrugAllergies.id,
							patientId: patientDrugAllergies.patientId,
							patientName: patients.fullName,
							allergenGroup: patientDrugAllergies.allergenGroup,
							drugInnLatin: patientDrugAllergies.drugInnLatin,
							reactionSeverity: patientDrugAllergies.reactionSeverity,
							clinicalManifestations: patientDrugAllergies.clinicalManifestations,
							createdAt: patientDrugAllergies.createdAt,
						})
						.from(patientDrugAllergies)
						.leftJoin(patients, eq(patients.id, patientDrugAllergies.patientId))
						.where(and(...allergyFilters))
						.orderBy(desc(patientDrugAllergies.createdAt))
						.limit(10);

					const visitFilters = [eq(visits.organizationId, organizationId), eq(visits.status, "draft")];
					if (query.patientId) visitFilters.push(eq(visits.patientId, query.patientId));
					if (query.visitId) visitFilters.push(eq(visits.id, query.visitId));

					const draftVisitRows = await tx
						.select({
							id: visits.id,
							patientId: visits.patientId,
							patientName: patients.fullName,
							diagnosis: visits.diagnosis,
							createdAt: visits.createdAt,
						})
						.from(visits)
						.leftJoin(patients, eq(patients.id, visits.patientId))
						.where(and(...visitFilters))
						.orderBy(desc(visits.createdAt))
						.limit(5);

					const builtAlerts: Array<{
						id: string;
						urgency: "CRITICAL" | "URGENT" | "NORMAL";
						title: string;
						subtitle?: string;
						description: string;
						timestamp: string;
						patientId?: string | null;
						patientName?: string | null;
						patientPhone?: string | null;
						category:
							| "whatsapp_emergency"
							| "ztl_status"
							| "retention"
							| "gap_filler"
							| "emr_draft"
							| "clinical_alert"
							| "general_message";
						actions: Array<{
							id: string;
							label: string;
							kind: "primary" | "secondary" | "danger";
							prompt?: string;
							actionType?: string;
							payload?: Record<string, unknown>;
						}>;
					}> = [];

					for (const a of allergyRows) {
						const isCritical =
							a.reactionSeverity === "anaphylaxis" || a.reactionSeverity === "severe";
						builtAlerts.push({
							id: `alert_allergy_${a.id}`,
							urgency: isCritical ? "CRITICAL" : "URGENT",
							title: `Аллергический стоп-фактор: ${a.allergenGroup}`,
							subtitle: a.patientName ?? a.drugInnLatin ?? "Контроль фармакобезопасности",
							description: `Реакция (${a.reactionSeverity}): ${a.clinicalManifestations || "соблюдайте осторожность при выборе анестезии и препаратов"}.`,
							timestamp: a.createdAt.toISOString(),
							patientId: a.patientId,
							patientName: a.patientName ?? null,
							category: "clinical_alert",
							actions: [
								{
									id: "dismiss_allergy_alert",
									label: "Принято к сведению",
									kind: "secondary",
									actionType: "dismiss",
								},
							],
						});
					}

					for (const c of cards) {
						if (c.urgency !== "CRITICAL" && c.urgency !== "URGENT") continue;
						const cardUrgency: "CRITICAL" | "URGENT" =
							c.urgency === "CRITICAL" ? "CRITICAL" : "URGENT";
						builtAlerts.push({
							id: c.id,
							urgency: cardUrgency,
							title: `${c.patientName}: ${c.intent}`,
							subtitle: c.channel === "whatsapp" ? "WhatsApp Триаж" : "Входящее обращение",
							description: c.incomingSnippet,
							timestamp: c.createdAt.toISOString(),
							patientId: c.patientId,
							patientName: c.patientName,
							patientPhone: c.phone,
							category: c.category === "whatsapp_emergency" ? "whatsapp_emergency" : "general_message",
							actions: [
								{
									id: "approve_hitl",
									label: "Утвердить ответ",
									kind: "primary",
									actionType: "approve_hitl",
									payload: { approvalId: c.id },
								},
							],
						});
					}

					for (const v of draftVisitRows) {
						if (v.diagnosis && v.diagnosis.trim().length > 0) continue;
						builtAlerts.push({
							id: `alert_emr_draft_${v.id}`,
							urgency: "NORMAL",
							title: "Незавершённый черновик приёма",
							subtitle: v.patientName ?? "Электронная медкарта",
							description: "В открытом приёме не заполнен диагноз по МКБ-10 и итоговый протокол.",
							timestamp: v.createdAt.toISOString(),
							patientId: v.patientId,
							patientName: v.patientName ?? null,
							category: "emr_draft",
							actions: [
								{
									id: "fill_emr_draft",
									label: "Заполнить протокол",
									kind: "primary",
									prompt: "Сформируй черновик дневника приёма и предложи код диагноза МКБ-10",
								},
							],
						});
					}

					return {
						ok: true,
						alerts: builtAlerts.filter((a) => !dismissedSet.has(a.id)),
						hitlCards: mappedHitlCards,
					};
				} catch (err: unknown) {
					request.log.error({ err }, "[agentProactiveAndNudgeRoutes] Error fetching copilotHitlCards and proactive alerts from DB");
					return reply.code(500).send({
						ok: false,
						error: "InternalServerError",
						message: "Не удалось загрузить ожидающие подтверждения карточки",
					});
				}
			},
		});
	}

	for (const endpoint of ["/api/agent/proactive/approve", "/api/v1/copilot/proactive/approve"]) {
		defineTenantMutation(server, {
			method: "POST",
			path: endpoint,
			permission: "agent.write",
			authOptions: PROACTIVE_AUTH_OPTIONS,
			idempotency: "optional_header",
			execute: async ({ tx, organizationId, request, reply }) => {
				const parsedBody = approveProactiveBodySchema.safeParse(request.body ?? {});
				if (!parsedBody.success) {
					return reply.code(400).send({
						ok: false,
						error: "ValidationError",
						message: "Некорректные параметры подтверждения карточки",
						details: parsedBody.error.format(),
					});
				}

				const { approvalId, modifiedReply, sendNow } = parsedBody.data;
				try {
					const [updatedCard] = await tx
						.update(copilotHitlCards)
						.set({
							status: "approved",
							draftReply: modifiedReply !== undefined ? modifiedReply : sql`draft_reply`,
							resolvedAt: new Date(),
						})
						.where(and(eq(copilotHitlCards.id, approvalId), eq(copilotHitlCards.organizationId, organizationId)))
						.returning({
							id: copilotHitlCards.id,
							patientId: copilotHitlCards.patientId,
							channel: copilotHitlCards.channel,
							phone: copilotHitlCards.phone,
							draftReply: copilotHitlCards.draftReply,
						});

					if (!updatedCard) {
						return reply.code(404).send({
							ok: false,
							error: "NotFound",
							message: "Карточка подтверждения не найдена",
						});
					}

					if (!sendNow) {
						return {
							ok: true,
							approved: true,
							approvalId,
							queuedForDelivery: false,
							deliveryStatus: "approved_only",
						};
					}

					const replyText = (modifiedReply ?? updatedCard.draftReply ?? "").trim();
					if (!replyText) {
						return {
							ok: true,
							approved: true,
							approvalId,
							queuedForDelivery: false,
							deliveryStatus: "empty_reply",
							deliveryReason: "Текст ответа пуст.",
						};
					}

					if (!isMachineDeliverableChannel(updatedCard.channel)) {
						return {
							ok: true,
							approved: true,
							approvalId,
							queuedForDelivery: false,
							deliveryStatus: "unsupported_channel",
							deliveryReason: `Канал ${updatedCard.channel} не поддерживает автоматическую отправку.`,
						};
					}

					const validPatientUuid = UUID_REGEX.test(updatedCard.patientId)
						? updatedCard.patientId
						: null;
					let recipientAddress: string | null = null;
					let recipientReason: string | null = null;

					if (validPatientUuid) {
						const resolved = await resolveRecipientAddress(
							organizationId,
							updatedCard.channel,
							validPatientUuid,
						);
						recipientAddress = resolved.address;
						recipientReason = resolved.reason;
					}
					if (
						!recipientAddress &&
						updatedCard.phone &&
						updatedCard.phone.trim().length > 0 &&
						(updatedCard.channel === "whatsapp" || updatedCard.channel === "sms")
					) {
						recipientAddress = updatedCard.phone.trim();
					}

					if (!recipientAddress) {
						return {
							ok: true,
							approved: true,
							approvalId,
							queuedForDelivery: false,
							deliveryStatus: "missing_recipient",
							deliveryReason:
								recipientReason ?? "У пациента не указан контакт для отправки в выбранный канал.",
						};
					}

					const enqueueRes = await enqueueMessage(
						{
							organizationId,
							patientId: validPatientUuid,
							channel: updatedCard.channel,
							intent: "general",
							scope: "service",
							recipientAddress,
							body: replyText,
							dedupeKey: `hitl-approve:${approvalId}`,
						},
						tx,
					);

					if (!enqueueRes.ok) {
						return {
							ok: true,
							approved: true,
							approvalId,
							queuedForDelivery: false,
							deliveryStatus: "suppressed",
							deliveryReason: enqueueRes.reason,
						};
					}

					return {
						ok: true,
						approved: true,
						approvalId,
						queuedForDelivery: true,
						deliveryStatus: "queued",
						outboxId: enqueueRes.outboxId,
						duplicate: enqueueRes.duplicate,
					};
				} catch (err: unknown) {
					request.log.error({ err, approvalId }, "[agentProactiveAndNudgeRoutes] Failed to update approved status");
					return reply.code(500).send({
						ok: false,
						error: "InternalServerError",
						message: "Не удалось подтвердить карточку",
					});
				}
			},
		});
	}

	for (const endpoint of ["/api/agent/proactive/reject", "/api/v1/copilot/proactive/reject"]) {
		defineTenantMutation(server, {
			method: "POST",
			path: endpoint,
			permission: "agent.write",
			authOptions: PROACTIVE_AUTH_OPTIONS,
			idempotency: "optional_header",
			execute: async ({ tx, organizationId, request, reply }) => {
				const parsedBody = rejectProactiveBodySchema.safeParse(request.body ?? {});
				if (!parsedBody.success) {
					return reply.code(400).send({
						ok: false,
						error: "ValidationError",
						message: "Некорректные параметры отклонения карточки",
						details: parsedBody.error.format(),
					});
				}

				const { approvalId, reason } = parsedBody.data;
				try {
					const updated = await tx
						.update(copilotHitlCards)
						.set({
							status: "rejected",
							rejectionReason: reason || "Отклонено пользователем",
							resolvedAt: new Date(),
						})
						.where(and(eq(copilotHitlCards.id, approvalId), eq(copilotHitlCards.organizationId, organizationId)))
						.returning({ id: copilotHitlCards.id });

					if (updated.length === 0) {
						return reply.code(404).send({
							ok: false,
							error: "NotFound",
							message: "Карточка подтверждения не найдена",
						});
					}

					return { ok: true, rejected: true, approvalId };
				} catch (err: unknown) {
					request.log.error({ err, approvalId }, "[agentProactiveAndNudgeRoutes] Failed to update rejected status");
					return reply.code(500).send({
						ok: false,
						error: "InternalServerError",
						message: "Не удалось отклонить карточку",
					});
				}
			},
		});
	}

	for (const endpoint of ["/api/agent/proactive/dismiss-alert", "/api/v1/copilot/proactive/dismiss-alert"]) {
		defineTenantMutation(server, {
			method: "POST",
			path: endpoint,
			permission: "agent.write",
			authOptions: PROACTIVE_AUTH_OPTIONS,
			idempotency: "optional_header",
			execute: async ({ tx, principal, organizationId, request, reply }) => {
				const parsedBody = dismissAlertBodySchema.safeParse(request.body ?? {});
				if (!parsedBody.success) {
					return reply.code(400).send({
						ok: false,
						error: "ValidationError",
						message: "Некорректный идентификатор уведомления",
						details: parsedBody.error.format(),
					});
				}

				const alertId = parsedBody.data.alertId;
				try {
					if (UUID_REGEX.test(alertId)) {
						await tx
							.update(copilotHitlCards)
							.set({ status: "dismissed", resolvedAt: new Date() })
							.where(
								and(
									eq(copilotHitlCards.id, alertId),
									eq(copilotHitlCards.organizationId, organizationId),
								),
							);
					}

					const prefRecord = await getDoctorPreferencesFromDb(organizationId, principal.userId ?? null, tx);
					const doctorPrefs = (prefRecord?.preferences ?? {}) as Record<string, unknown>;
					const existingAlerts = Array.isArray(doctorPrefs.copilotDismissedAlertIds)
						? (doctorPrefs.copilotDismissedAlertIds as string[])
						: [];
					if (!existingAlerts.includes(alertId)) {
						await saveDoctorPreferencesInDb(
							organizationId,
							principal.userId ?? null,
							{ ...doctorPrefs, copilotDismissedAlertIds: [...existingAlerts, alertId] },
							prefRecord?.specialty ?? "therapist",
							tx,
						);
					}
					return { ok: true, alertId };
				} catch (err) {
					request.log.error({ err, alertId }, "[agentProactiveAndNudgeRoutes] Failed to persist dismissed alert");
					return reply.code(500).send({
						ok: false,
						error: "InternalServerError",
						message: "Не удалось скрыть уведомление",
					});
				}
			},
		});
	}

	for (const endpoint of ["/api/agent/sentinel/analyze", "/api/v1/copilot/sentinel/analyze"]) {
		defineTenantMutation(server, {
			method: "POST",
			path: endpoint,
			permission: "agent.write",
			authOptions: PROACTIVE_AUTH_OPTIONS,
			idempotency: "optional_header",
			execute: async ({ tx, organizationId, request, reply }) => {
				const parsedBody = sentinelAnalyzeBodySchema.safeParse(request.body ?? {});
				if (!parsedBody.success) {
					return reply.code(400).send({
						ok: false,
						error: "ValidationError",
						message: "Некорректные параметры анализа пациента",
						details: parsedBody.error.format(),
					});
				}

				const body = parsedBody.data;
				const alerts: Array<{ id: string; severity: "critical" | "warning" | "info"; title: string; description: string }> = [];

				if (body.patientId) {
					const patientId = body.patientId;
					try {
						const allergyRows = await tx
							.select({ allergen: patientDrugAllergies.allergenGroup })
							.from(patientDrugAllergies)
							.where(and(eq(patientDrugAllergies.patientId, patientId), eq(patientDrugAllergies.organizationId, organizationId)))
							.limit(10);
						if (allergyRows.length > 0) {
							alerts.push({ id: `alert_allergy_${patientId}`, severity: "warning", title: "Аллергоанамнез пациента", description: `Зафиксированы аллергии: ${allergyRows.map((r) => r.allergen).join(", ")}` });
						}
					} catch (err: unknown) {
						request.log.error({ err, patientId }, "[agentProactiveAndNudgeRoutes] Error analyzing patient in sentinel");
						return reply.code(500).send({
							ok: false,
							error: "InternalServerError",
							message: "Не удалось выполнить анализ карты пациента",
						});
					}
				}

				return { ok: true, data: { alerts, analyzedPatientId: body.patientId, mode: body.mode || "supervised" } };
			},
		});
	}
}
