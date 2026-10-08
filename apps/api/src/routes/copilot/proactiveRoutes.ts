/**
 * proactiveRoutes.ts — Layer 2: Fastify Routes for Proactive Alerts, Streaming Hub, Daemons and Sentinel.
 */

import { randomUUID } from "node:crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { appointments } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	defaultAutonomousDenteAgent,
	defaultChairsideSentinel,
	defaultCopilotStreamManager,
	defaultWhatsAppBridge,
	formatSseEvent,
} from "../../services/agent/index.js";
import { defaultDaemonScheduler } from "../../services/daemons/index.js";
import {
	autonomousAgentExecuteBodySchema,
	chairsideSentinelAnalyzeBodySchema,
	emrSaviorBodySchema,
	gapFillerBodySchema,
	proactiveAlertsQuerySchema,
	retentionScanBodySchema,
	ztlScanBodySchema,
} from "./types.js";

export const proactiveRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// GET /api/v1/copilot/nudges — Proactive clinic nudges and recommendations
	server.get("/api/v1/copilot/nudges", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"copilot read nudges",
		);
		if (!resolvedOrgId) return;

		const now = new Date();
		const startOfDay = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);
		const endOfDay = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			23,
			59,
			59,
			999,
		);

		const nudges: Array<{
			id: string;
			kind: string;
			payload: Record<string, unknown>;
			created_at: string;
			expires_at: string;
		}> = [];

		try {
			// 1. Check today's appointments for pending visits
			const todayAppts = await db
				.select({
					id: appointments.id,
					status: appointments.status,
					startsAt: appointments.startsAt,
					patientId: appointments.patientId,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, resolvedOrgId),
						gte(appointments.startsAt, startOfDay),
						lte(appointments.startsAt, endOfDay),
					),
				)
				.limit(10);

			const plannedCount = todayAppts.filter(
				(a) => a.status === "planned" || a.status === "confirmed",
			).length;
			if (plannedCount > 0) {
				nudges.push({
					id: `nudge_today_appts_${startOfDay.getTime()}`,
					kind: "schedule_reminder",
					payload: {
						title: `Сегодня запланировано ${plannedCount} приёмов`,
						description:
							"Проверьте готовность кабинетов и амбулаторных карт 043/у",
						count: plannedCount,
					},
					created_at: now.toISOString(),
					expires_at: endOfDay.toISOString(),
				});
			}
		} catch {
			// If DB query encounters table locks or empty state, fall back safely
		}

		// Fallback default proactive nudges if list is empty
		if (nudges.length === 0) {
			nudges.push({
				id: `nudge_clinical_protocol_${now.getTime()}`,
				kind: "clinical_hint",
				payload: {
					title: "Заполнение дневника приёма 043/у",
					description:
						"Используйте диктовку голосом или команду 'Заполни дневник по шаблону'",
				},
				created_at: now.toISOString(),
				expires_at: new Date(now.getTime() + 8 * 3600 * 1000).toISOString(),
			});
		}

		return { data: nudges };
	});

	// POST /api/v1/copilot/dismiss-nudge — Dismiss proactive suggestion
	server.post<{ Body: { id?: string } }>(
		"/api/v1/copilot/dismiss-nudge",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot dismiss nudge",
			);
			if (!resolvedOrgId) return;

			return reply.send({ ok: true });
		},
	);

	// =========================================================================
	// SERVER-INITIATED PROACTIVE MESSAGES & SSE STREAM HUB
	// =========================================================================

	// Handler for persistent SSE connection
	const handleCopilotProactiveStream = async (
		request: any,
		reply: any,
	) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"copilot proactive stream",
		);
		if (!resolvedOrgId) return;

		const identity = getRequestIdentity(request);
		const userId = identity.userId ?? undefined;
		const query = (request.query as Record<string, string>) || {};
		const sessionId = query.sessionId || undefined;
		const subscriberId = `sub_${Date.now()}_${randomUUID().slice(0, 8)}`;

		// Setup SSE Headers
		reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
		reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
		reply.raw.setHeader("Connection", "keep-alive");
		reply.raw.setHeader("X-Accel-Buffering", "no");
		reply.raw.flushHeaders?.();

		// Initial connection handshake
		const welcomeChunk = formatSseEvent({
			type: "connected",
			subscriberId,
			organizationId: resolvedOrgId,
			timestamp: new Date().toISOString(),
		});
		reply.raw.write(welcomeChunk);

		// Stream existing active proactive alerts for this tenant on connect
		const activeAlerts = defaultWhatsAppBridge
			.getHitLQueue()
			.listProactiveAlerts(resolvedOrgId);
		for (const alert of activeAlerts) {
			reply.raw.write(formatSseEvent({ type: "proactive_alert", data: alert }));
		}

		// Register subscriber in CopilotStreamManager
		const unsubscribe = defaultCopilotStreamManager.subscribe({
			id: subscriberId,
			organizationId: resolvedOrgId,
			userId,
			sessionId,
			send: (chunk: string) => {
				try {
					if (!reply.raw.writableEnded && !reply.raw.destroyed) {
						reply.raw.write(chunk);
						return true;
					}
					return false;
				} catch {
					return false;
				}
			},
			close: () => {
				try {
					if (!reply.raw.writableEnded) reply.raw.end();
				} catch (closeErr) {
					console.warn("[Copilot SSE] Error ending raw response stream:", closeErr);
				}
			},
		});

		// 20-second heartbeat to keep SSE alive
		const heartbeatTimer = setInterval(() => {
			try {
				if (!reply.raw.writableEnded && !reply.raw.destroyed) {
					reply.raw.write(`: ping ${Date.now()}\n\n`);
				} else {
					clearInterval(heartbeatTimer);
					unsubscribe();
				}
			} catch {
				clearInterval(heartbeatTimer);
				unsubscribe();
			}
		}, 20000);

		request.raw.on("close", () => {
			clearInterval(heartbeatTimer);
			unsubscribe();
		});
	};

	server.get(
		"/api/v1/copilot/stream",
		{ config: { tenantTxSelfManaged: true } },
		handleCopilotProactiveStream,
	);

	server.post(
		"/api/v1/copilot/stream",
		{ config: { tenantTxSelfManaged: true } },
		handleCopilotProactiveStream,
	);

	// GET /api/v1/copilot/proactive/pending — List active emergency alerts & HitL cards
	server.get(
		"/api/v1/copilot/proactive/pending",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot list proactive pending",
			);
			if (!resolvedOrgId) return;

			const queue = defaultWhatsAppBridge.getHitLQueue();
			const alerts = queue.listProactiveAlerts(resolvedOrgId);
			const hitlCards = queue.listPendingCards(resolvedOrgId);

			return reply.send({
				ok: true,
				alerts,
				hitlCards,
			});
		},
	);

	// POST /api/v1/copilot/proactive/approve — 1-Click Approve WhatsApp/HitL message
	server.post<{
		Body: {
			approvalId: string;
			modifiedReply?: string;
			sendNow?: boolean;
		};
	}>(
		"/api/v1/copilot/proactive/approve",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot approve proactive card",
			);
			if (!resolvedOrgId) return;

			const { approvalId, modifiedReply, sendNow } = request.body || {};
			if (!approvalId) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Не указан approvalId",
				});
			}

			try {
				const queue = defaultWhatsAppBridge.getHitLQueue();
				const approveOptions: { modifiedReply?: string; sendNow?: boolean } = {};
				if (modifiedReply !== undefined) approveOptions.modifiedReply = modifiedReply;
				if (sendNow !== undefined) approveOptions.sendNow = sendNow;
				const result = await queue.approveCard(approvalId, resolvedOrgId, approveOptions);

				// Broadcast resolution to active copilot streams
				defaultCopilotStreamManager.broadcastToOrganization(
					resolvedOrgId,
					"proactive_alert_resolved",
					{
						id: approvalId,
						status: "approved",
						sent: result.sent,
					},
				);

				return reply.send(result);
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				return reply.code(404).send({
					error: "ApprovalError",
					message: errMsg,
				});
			}
		},
	);

	// POST /api/v1/copilot/proactive/reject — 1-Click Reject WhatsApp/HitL card
	server.post<{
		Body: {
			approvalId: string;
			reason?: string;
		};
	}>(
		"/api/v1/copilot/proactive/reject",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot reject proactive card",
			);
			if (!resolvedOrgId) return;

			const { approvalId, reason } = request.body || {};
			if (!approvalId) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Не указан approvalId",
				});
			}

			try {
				const queue = defaultWhatsAppBridge.getHitLQueue();
				const result = await queue.rejectCard(
					approvalId,
					resolvedOrgId,
					reason,
				);

				// Broadcast resolution to active copilot streams
				defaultCopilotStreamManager.broadcastToOrganization(
					resolvedOrgId,
					"proactive_alert_resolved",
					{
						id: approvalId,
						status: "rejected",
						reason,
					},
				);

				return reply.send(result);
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				return reply.code(404).send({
					error: "RejectionError",
					message: errMsg,
				});
			}
		},
	);

	// POST /api/v1/copilot/proactive/dismiss-alert — Dismiss proactive alert card
	server.post<{
		Body: {
			alertId: string;
		};
	}>(
		"/api/v1/copilot/proactive/dismiss-alert",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot dismiss proactive alert",
			);
			if (!resolvedOrgId) return;

			const { alertId } = request.body || {};
			if (!alertId) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Не указан alertId",
				});
			}

			const deleted = defaultWhatsAppBridge
				.getHitLQueue()
				.dismissProactiveAlert(alertId);

			defaultCopilotStreamManager.broadcastToOrganization(
				resolvedOrgId,
				"proactive_alert_dismissed",
				{ alertId },
			);

			return reply.send({ ok: true, deleted });
		},
	);

	// POST /api/v1/copilot/proactive/trigger-triage — Trigger Triage on message
	server.post<{
		Body: {
			text: string;
			fromPhone?: string;
			patientId?: string;
			patientName?: string;
		};
	}>(
		"/api/v1/copilot/proactive/trigger-triage",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot trigger triage",
			);
			if (!resolvedOrgId) return;

			const { text, fromPhone, patientId, patientName } = request.body || {};
			if (!text || !text.trim()) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Текст сообщения не может быть пустым",
				});
			}

			const result = await defaultWhatsAppBridge.handleIncomingMessage({
				messageId: `msg_${Date.now()}`,
				fromPhone: fromPhone || "+79990000000",
				rawText: text,
				patientId: patientId || null,
				patientName: patientName || null,
				organizationId: resolvedOrgId,
			});

			return reply.send({ ok: true, data: result });
		},
	);

	// =========================================================================
	// BACKGROUND DAEMONS & SCHEDULER CONTROL ENDPOINTS
	// =========================================================================

	// POST /api/v1/copilot/daemons/ztl-scan — Trigger 08:00 AM ZTL Look-Ahead scan on demand
	server.post(
		"/api/v1/copilot/daemons/ztl-scan",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot trigger ztl scan",
			);
			if (!resolvedOrgId) return;

			const parsedBody = ztlScanBodySchema.safeParse(request.body ?? {});
			const body = parsedBody.success ? parsedBody.data : {};
			const orgId = body.organizationId ?? resolvedOrgId;

			const alerts = await defaultDaemonScheduler.triggerZtlScan({
				organizationId: orgId,
				...(body.lookAheadHours !== undefined ? { lookAheadHours: body.lookAheadHours } : {}),
			});

			return reply.send({ ok: true, data: alerts, count: alerts.length });
		},
	);

	// POST /api/v1/copilot/daemons/emr-savior — Trigger 21:00 PM EMR Savior scan on demand
	server.post(
		"/api/v1/copilot/daemons/emr-savior",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot trigger emr savior",
			);
			if (!resolvedOrgId) return;

			const parsedBody = emrSaviorBodySchema.safeParse(request.body ?? {});
			const body = parsedBody.success ? parsedBody.data : {};
			const orgId = body.organizationId ?? resolvedOrgId;

			const alerts = await defaultDaemonScheduler.triggerEmrSaviorScan({
				organizationId: orgId,
				...(body.targetDate ? { targetDate: new Date(body.targetDate) } : {}),
			});

			return reply.send({ ok: true, data: alerts, count: alerts.length });
		},
	);

	// POST /api/v1/copilot/daemons/retention-scan — Trigger Weekly Retention Hunter scan on demand
	server.post(
		"/api/v1/copilot/daemons/retention-scan",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot trigger retention scan",
			);
			if (!resolvedOrgId) return;

			const parsedBody = retentionScanBodySchema.safeParse(request.body ?? {});
			const body = parsedBody.success ? parsedBody.data : {};
			const orgId = body.organizationId ?? resolvedOrgId;

			const summaries = await defaultDaemonScheduler.triggerRetentionScan({
				organizationId: orgId,
			});

			return reply.send({ ok: true, data: summaries, count: summaries.length });
		},
	);

	// POST /api/v1/copilot/daemons/gap-filler — Trigger Smart Gap-Filler when appointment is cancelled
	server.post(
		"/api/v1/copilot/daemons/gap-filler",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot trigger gap filler",
			);
			if (!resolvedOrgId) return;

			const parsedBody = gapFillerBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный запрос: укажите cancelledAppointmentId",
				});
			}

			const alert = await defaultDaemonScheduler.triggerGapFiller(
				parsedBody.data.cancelledAppointmentId,
				{
					organizationId: parsedBody.data.organizationId ?? resolvedOrgId,
					...(parsedBody.data.maxCandidates !== undefined
						? { maxCandidates: parsedBody.data.maxCandidates }
						: {}),
				},
			);

			if (!alert) {
				return reply.code(404).send({
					error: "NotFound",
					message: "Отмененный прием не найден",
				});
			}

			return reply.send({ ok: true, data: alert });
		},
	);

	// GET /api/v1/copilot/proactive/alerts — Get aggregated proactive alerts (ZTL, EMR Savior, Retention)
	server.get(
		"/api/v1/copilot/proactive/alerts",
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"copilot get proactive alerts",
			);
			if (!resolvedOrgId) return;

			const parsedQuery = proactiveAlertsQuerySchema.safeParse(request.query ?? {});
			const query = parsedQuery.success ? parsedQuery.data : {};
			const orgId = query.organizationId ?? resolvedOrgId;
			const liveScan = query.liveScan === "true" || query.liveScan === undefined;

			const aggregate = await defaultDaemonScheduler.getProactiveAlerts({
				organizationId: orgId,
				liveScan,
			});

			return reply.send({ ok: true, data: aggregate });
		},
	);

	// POST /api/v1/copilot/sentinel/analyze — Autonomous Proactive Chairside Sentinel Engine
	server.post(
		"/api/v1/copilot/sentinel/analyze",
		async (request, reply) => {
			const parsedBody = chairsideSentinelAnalyzeBodySchema.safeParse(
				request.body ?? {},
			);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный контекст визита: patientId обязателен",
					details: parsedBody.error.errors,
				});
			}

			const result = await defaultChairsideSentinel.analyzeVisitContext(
				parsedBody.data,
			);
			return reply.send({ ok: true, data: result });
		},
	);

	// POST /api/v1/copilot/agent/execute — Autonomous Antigravity ReAct Clinical AI Engine
	server.post(
		"/api/v1/copilot/agent/execute",
		async (request, reply) => {
			const parsedBody = autonomousAgentExecuteBodySchema.safeParse(
				request.body ?? {},
			);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный запрос к автономному агенту: patientId обязателен",
					details: parsedBody.error.errors,
				});
			}

			const identity = getRequestIdentity(request);
			const userId = identity.userId ?? undefined;

			const result = await defaultAutonomousDenteAgent.execute({
				...parsedBody.data,
				userId: parsedBody.data.organizationId ? undefined : userId,
			});
			return reply.send({ ok: true, data: result });
		},
	);
};
