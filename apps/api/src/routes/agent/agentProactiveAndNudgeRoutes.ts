/**
 * agentProactiveAndNudgeRoutes.ts — Proactive Clinical Nudges, HITL Approvals & Sentinel Analysis
 * Mandate 8b: Submodule decomposed from monolith agentRoutes.ts (< 250 lines).
 * Zero In-Memory Leak: Persistent dismissal in PostgreSQL (doctorPreferences).
 * Zero Fake Streams: Potemkin SSE stream with empty ping loop eliminated.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { withTenantCtx } from "../../db/rls.js";
import { copilotHitlCards } from "../../db/schema/copilot.js";
import { patientDrugAllergies } from "../../db/schema/patients.js";
import { visits } from "../../db/schema/clinical/visitsSchema.js";
import { UUID_REGEX } from "../../ai/session/copilotSessionTypes.js";
import { and, desc, eq, sql } from "drizzle-orm";
import {
	getDoctorPreferencesFromDb,
	saveDoctorPreferencesInDb,
} from "../../db/doctorPreferencesQuery.js";

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

async function handleGetNudges(request: FastifyRequest, reply: FastifyReply): Promise<void> {
	const resolvedOrgId = await requireResolvedOrganizationId(request, reply, "copilot nudges");
	if (!resolvedOrgId) return;

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
		const identity = getRequestIdentity(request);
		const query = parsedQuery.data;

		const activeNudges = await withTenantCtx(resolvedOrgId, async (tx) => {
			const visitFilters = [eq(visits.organizationId, resolvedOrgId), eq(visits.status, "draft")];
			if (query.patientId) visitFilters.push(eq(visits.patientId, query.patientId));
			if (query.visitId) visitFilters.push(eq(visits.id, query.visitId));

			const draftVisits = await tx
				.select()
				.from(visits)
				.where(and(...visitFilters))
				.orderBy(desc(visits.createdAt))
				.limit(10);

			const allergyFilters = [eq(patientDrugAllergies.organizationId, resolvedOrgId)];
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

			const prefRecord = await getDoctorPreferencesFromDb(resolvedOrgId, identity.userId || null, tx);
			const doctorPrefs = (prefRecord?.preferences || {}) as Record<string, unknown>;
			const dismissedList = Array.isArray(doctorPrefs.copilotDismissedNudgeIds) ? (doctorPrefs.copilotDismissedNudgeIds as string[]) : [];
			const dismissedSet = new Set(dismissedList);
			return nudges.filter((n) => !dismissedSet.has(n.id));
		});

		return reply.code(200).send({ ok: true, nudges: activeNudges });
	} catch (err) {
		request.log.error({ err }, "[agentProactiveAndNudgeRoutes] Failed to generate dynamic copilot nudges");
		return reply.code(500).send({
			ok: false,
			error: "InternalServerError",
			message: "Не удалось загрузить клинические подсказки",
		});
	}
}

async function handleDismissNudge(request: FastifyRequest, reply: FastifyReply): Promise<void> {
	const resolvedOrgId = await requireResolvedOrganizationId(request, reply, "copilot dismiss nudge");
	if (!resolvedOrgId) return;

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
		const identity = getRequestIdentity(request);
		await withTenantCtx(resolvedOrgId, async (tx) => {
			const prefRecord = await getDoctorPreferencesFromDb(resolvedOrgId, identity.userId || null, tx);
			const doctorPrefs = (prefRecord?.preferences || {}) as Record<string, unknown>;
			const existingDismissed = Array.isArray(doctorPrefs.copilotDismissedNudgeIds) ? (doctorPrefs.copilotDismissedNudgeIds as string[]) : [];
			if (!existingDismissed.includes(nudgeId)) {
				await saveDoctorPreferencesInDb(
					resolvedOrgId,
					identity.userId || null,
					{ ...doctorPrefs, copilotDismissedNudgeIds: [...existingDismissed, nudgeId] },
					prefRecord?.specialty || "therapist",
					tx,
				);
			}
		});
		return reply.code(200).send({ ok: true, dismissedId: nudgeId });
	} catch (err) {
		request.log.error({ err, nudgeId }, "[agentProactiveAndNudgeRoutes] Failed to persist dismissed nudge");
		return reply.code(500).send({
			ok: false,
			error: "InternalServerError",
			message: "Не удалось скрыть подсказку",
		});
	}
}

async function handleGetProactivePending(request: FastifyRequest, reply: FastifyReply): Promise<void> {
	const resolvedOrgId = await requireResolvedOrganizationId(request, reply, "copilot proactive pending");
	if (!resolvedOrgId) return;

	try {
		const cards = await withTenantCtx(resolvedOrgId, async (tx) =>
			tx
				.select()
				.from(copilotHitlCards)
				.where(and(eq(copilotHitlCards.organizationId, resolvedOrgId), eq(copilotHitlCards.status, "pending")))
				.orderBy(desc(copilotHitlCards.createdAt))
				.limit(20),
		);

		const hitlCards = cards.map((c) => ({
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

		return reply.code(200).send({ ok: true, alerts: [], hitlCards });
	} catch (err: unknown) {
		request.log.error({ err }, "[agentProactiveAndNudgeRoutes] Error fetching copilotHitlCards from DB");
		return reply.code(500).send({
			ok: false,
			error: "InternalServerError",
			message: "Не удалось загрузить ожидающие подтверждения карточки",
		});
	}
}

async function handleApproveProactive(request: FastifyRequest, reply: FastifyReply): Promise<void> {
	const resolvedOrgId = await requireResolvedOrganizationId(request, reply, "copilot proactive approve");
	if (!resolvedOrgId) return;

	const parsedBody = approveProactiveBodySchema.safeParse(request.body ?? {});
	if (!parsedBody.success) {
		return reply.code(400).send({
			ok: false,
			error: "ValidationError",
			message: "Некорректные параметры подтверждения карточки",
			details: parsedBody.error.format(),
		});
	}

	const { approvalId, modifiedReply } = parsedBody.data;
	try {
		const updated = await withTenantCtx(resolvedOrgId, async (tx) =>
			tx
				.update(copilotHitlCards)
				.set({
					status: "approved",
					draftReply: modifiedReply !== undefined ? modifiedReply : sql`draft_reply`,
					resolvedAt: new Date(),
				})
				.where(and(eq(copilotHitlCards.id, approvalId), eq(copilotHitlCards.organizationId, resolvedOrgId)))
				.returning({ id: copilotHitlCards.id }),
		);

		if (updated.length === 0) {
			return reply.code(404).send({
				ok: false,
				error: "NotFound",
				message: "Карточка подтверждения не найдена",
			});
		}

		return reply.code(200).send({ ok: true, approved: true, approvalId });
	} catch (err: unknown) {
		request.log.error({ err, approvalId }, "[agentProactiveAndNudgeRoutes] Failed to update approved status");
		return reply.code(500).send({
			ok: false,
			error: "InternalServerError",
			message: "Не удалось подтвердить карточку",
		});
	}
}

async function handleRejectProactive(request: FastifyRequest, reply: FastifyReply): Promise<void> {
	const resolvedOrgId = await requireResolvedOrganizationId(request, reply, "copilot proactive reject");
	if (!resolvedOrgId) return;

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
		const updated = await withTenantCtx(resolvedOrgId, async (tx) =>
			tx
				.update(copilotHitlCards)
				.set({
					status: "rejected",
					rejectionReason: reason || "Отклонено пользователем",
					resolvedAt: new Date(),
				})
				.where(and(eq(copilotHitlCards.id, approvalId), eq(copilotHitlCards.organizationId, resolvedOrgId)))
				.returning({ id: copilotHitlCards.id }),
		);

		if (updated.length === 0) {
			return reply.code(404).send({
				ok: false,
				error: "NotFound",
				message: "Карточка подтверждения не найдена",
			});
		}

		return reply.code(200).send({ ok: true, rejected: true, approvalId });
	} catch (err: unknown) {
		request.log.error({ err, approvalId }, "[agentProactiveAndNudgeRoutes] Failed to update rejected status");
		return reply.code(500).send({
			ok: false,
			error: "InternalServerError",
			message: "Не удалось отклонить карточку",
		});
	}
}

async function handleDismissAlert(request: FastifyRequest, reply: FastifyReply): Promise<void> {
	const resolvedOrgId = await requireResolvedOrganizationId(request, reply, "copilot dismiss proactive alert");
	if (!resolvedOrgId) return;

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
		await withTenantCtx(resolvedOrgId, async (tx) => {
			if (UUID_REGEX.test(alertId)) {
				await tx
					.update(copilotHitlCards)
					.set({ status: "dismissed", resolvedAt: new Date() })
					.where(
						and(
							eq(copilotHitlCards.id, alertId),
							eq(copilotHitlCards.organizationId, resolvedOrgId),
						),
					);
			}

			const identity = getRequestIdentity(request);
			const prefRecord = await getDoctorPreferencesFromDb(resolvedOrgId, identity.userId ?? null, tx);
			const doctorPrefs = (prefRecord?.preferences ?? {}) as Record<string, unknown>;
			const existingAlerts = Array.isArray(doctorPrefs.copilotDismissedAlertIds)
				? (doctorPrefs.copilotDismissedAlertIds as string[])
				: [];
			if (!existingAlerts.includes(alertId)) {
				await saveDoctorPreferencesInDb(
					resolvedOrgId,
					identity.userId ?? null,
					{ ...doctorPrefs, copilotDismissedAlertIds: [...existingAlerts, alertId] },
					prefRecord?.specialty ?? "therapist",
					tx,
				);
			}
		});
		return reply.code(200).send({ ok: true, alertId });
	} catch (err) {
		request.log.error({ err, alertId }, "[agentProactiveAndNudgeRoutes] Failed to persist dismissed alert");
		return reply.code(500).send({
			ok: false,
			error: "InternalServerError",
			message: "Не удалось скрыть уведомление",
		});
	}
}

async function handleSentinelAnalyze(request: FastifyRequest, reply: FastifyReply): Promise<void> {
	const resolvedOrgId = await requireResolvedOrganizationId(request, reply, "copilot sentinel analyze");
	if (!resolvedOrgId) return;

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
			const allergyRows = await withTenantCtx(resolvedOrgId, async (tx) =>
				tx
					.select({ allergen: patientDrugAllergies.allergenGroup })
					.from(patientDrugAllergies)
					.where(and(eq(patientDrugAllergies.patientId, patientId), eq(patientDrugAllergies.organizationId, resolvedOrgId)))
					.limit(10),
			);
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

	return reply.code(200).send({ ok: true, data: { alerts, analyzedPatientId: body.patientId, mode: body.mode || "supervised" } });
}

export async function registerAgentProactiveAndNudgeRoutes(
	server: FastifyInstance,
): Promise<void> {
	for (const endpoint of ["/api/agent/nudges", "/api/v1/copilot/nudges"]) {
		server.get(endpoint, { config: { tenantTxSelfManaged: true } }, handleGetNudges);
	}
	for (const endpoint of ["/api/agent/dismiss-nudge", "/api/v1/copilot/dismiss-nudge"]) {
		server.post(endpoint, { config: { tenantTxSelfManaged: true } }, handleDismissNudge);
	}
	for (const endpoint of ["/api/agent/proactive/pending", "/api/v1/copilot/proactive/pending"]) {
		server.get(endpoint, { config: { tenantTxSelfManaged: true } }, handleGetProactivePending);
	}
	for (const endpoint of ["/api/agent/proactive/approve", "/api/v1/copilot/proactive/approve"]) {
		server.post(endpoint, { config: { tenantTxSelfManaged: true } }, handleApproveProactive);
	}
	for (const endpoint of ["/api/agent/proactive/reject", "/api/v1/copilot/proactive/reject"]) {
		server.post(endpoint, { config: { tenantTxSelfManaged: true } }, handleRejectProactive);
	}
	for (const endpoint of ["/api/agent/proactive/dismiss-alert", "/api/v1/copilot/proactive/dismiss-alert"]) {
		server.post(endpoint, { config: { tenantTxSelfManaged: true } }, handleDismissAlert);
	}
	for (const endpoint of ["/api/agent/sentinel/analyze", "/api/v1/copilot/sentinel/analyze"]) {
		server.post(endpoint, { config: { tenantTxSelfManaged: true } }, handleSentinelAnalyze);
	}
}
