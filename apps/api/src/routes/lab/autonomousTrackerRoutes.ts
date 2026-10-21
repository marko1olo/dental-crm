/**
 * autonomousTrackerRoutes.ts — Standalone Trojan API for Dental Lab & Courier Tracker («Лаба в кармане»).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { evaluateLabSlaRisk, anonymizePatientForExternalLab, type AutonomousLabOrder } from "@dental/shared";
import { autonomousOrdersStore } from "./trackerModules/autonomousTrackerStore.js";
import {
	handleCreateAutonomousOrder,
	handleGetAutonomousOrder,
	handleScanAdvanceAutonomousOrder,
	handleDefectAutonomousOrder,
} from "./trackerModules/autonomousTrackerHandlers.js";

export async function registerAutonomousTrackerRoutes(app: FastifyInstance) {
	/**
	 * POST /api/clinical/dental-lab/autonomous/orders
	 */
	app.post("/api/clinical/dental-lab/autonomous/orders", handleCreateAutonomousOrder);

	/**
	 * GET /api/clinical/dental-lab/autonomous/orders/:ref
	 */
	app.get("/api/clinical/dental-lab/autonomous/orders/:ref", handleGetAutonomousOrder);

	/**
	 * POST /api/clinical/dental-lab/autonomous/orders/:ref/scan
	 */
	app.post("/api/clinical/dental-lab/autonomous/orders/:ref/scan", handleScanAdvanceAutonomousOrder);

	/**
	 * POST /api/clinical/dental-lab/autonomous/orders/:ref/defect
	 */
	app.post("/api/clinical/dental-lab/autonomous/orders/:ref/defect", handleDefectAutonomousOrder);

	/**
	 * GET /api/clinical/dental-lab/autonomous/sla-alerts
	 */
	app.get("/api/clinical/dental-lab/autonomous/sla-alerts", async (_request: FastifyRequest, reply: FastifyReply) => {
		const now = new Date();
		const criticalOrders: AutonomousLabOrder[] = [];

		for (const order of autonomousOrdersStore.values()) {
			const risk = evaluateLabSlaRisk(order, now);
			if (risk === "critical_under_24h" || risk === "breached_overdue") {
				criticalOrders.push({ ...order, slaRiskLevel: risk });
			}
		}

		return reply.send({
			checkedAt: now.toISOString(),
			criticalOrdersCount: criticalOrders.length,
			criticalOrders,
		});
	});

	/**
	 * POST /api/clinical/dental-lab/autonomous/anonymize-preview
	 */
	app.post("/api/clinical/dental-lab/autonomous/anonymize-preview", async (request: FastifyRequest, reply: FastifyReply) => {
		const body = request.body as { fullName?: string };
		if (!body?.fullName) {
			return reply.code(400).send({ error: "Missing fullName" });
		}
		const result = anonymizePatientForExternalLab(body.fullName);
		return reply.send(result);
	});
}
