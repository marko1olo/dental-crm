/**
 * proactiveStreamRoutes.ts — Layer 2: Fastify Routes for Proactive Nudges, SSE Stream Hub, and HitL.
 *
 * Implements real-time proactive alerts, HitL queue management, and SSE broadcasting (Mandate 8b).
 */

import { randomUUID } from "node:crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { appointments } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	defaultCopilotStreamManager,
	defaultWhatsAppBridge,
	formatSseEvent,
} from "../../services/agent/index.js";

export const proactiveStreamRoutes: FastifyPluginAsync = async (
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
							"Проверьте готовность кабинетов и амбулаторных карт",
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
					title: "Заполнение дневника приёма",
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
};
