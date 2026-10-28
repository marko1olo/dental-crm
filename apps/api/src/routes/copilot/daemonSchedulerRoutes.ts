/**
 * daemonSchedulerRoutes.ts — Background Daemons & Autonomous AI Scheduler Routes.
 *
 * Implements autonomous scanning daemons:
 * - ZTL Look-Ahead Scan (08:00 AM)
 * - EMR Savior Scan (21:00 PM)
 * - Retention Hunter Scan (Weekly)
 * - Smart Gap-Filler (on-demand on cancellations)
 * - Chairside Sentinel Analysis & Autonomous ReAct Execution (Mandate 8b).
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	defaultAutonomousDenteAgent,
	defaultChairsideSentinel,
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

export const daemonSchedulerRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// POST /api/v1/copilot/daemons/ztl-scan — Trigger ZTL Look-Ahead scan on demand
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

	// POST /api/v1/copilot/daemons/emr-savior — Trigger EMR Savior scan on demand
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

	// POST /api/v1/copilot/daemons/retention-scan — Trigger Retention Hunter scan on demand
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

	// POST /api/v1/copilot/agent/execute — Autonomous ReAct Clinical AI Engine
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
