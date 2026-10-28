/**
 * proactiveRoutes.ts — Layer 2: Fastify Routes for Proactive Alerts, Streaming Hub, Daemons and Sentinel.
 *
 * Mandate 8b: Refactored and decomposed into:
 * - proactiveStreamRoutes.ts (nudges, SSE stream hub, HitL approve/reject/dismiss, triage)
 * - daemonSchedulerRoutes.ts (daemons: ztl-scan, emr-savior, retention-scan, gap-filler, alerts, sentinel, autonomous agent execute)
 *
 * Coordinates proactive intelligence and autonomous clinic daemons.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { daemonSchedulerRoutes } from "./daemonSchedulerRoutes.js";
import { proactiveStreamRoutes } from "./proactiveStreamRoutes.js";

export const proactiveRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	await server.register(proactiveStreamRoutes);
	await server.register(daemonSchedulerRoutes);
};
