import type { FastifyPluginAsync } from "fastify";
import { telephonyOutboxService } from "../../services/telephonyOutboxService.js";
import { telephonyRecordingStreamRoutes } from "./telephonyRecordingStreamHandler.js";
import { telephonySipRoutes } from "../telephonySipRoutes.js";
import { telephonyCallerLookupRoutes } from "../telephonyCallerLookupRoutes.js";
import { telephonyCallLifecycleRoutes } from "./telephonyCallLifecycleHandler.js";
import { telephonyCallsListHandler } from "./telephonyCallsListHandler.js";
import { telephonyCallUpdateHandler } from "./telephonyCallUpdateHandler.js";
import { telephonyMissedCallsHandler } from "./telephonyMissedCallsHandler.js";
import { telephonyOutboundHandler } from "./telephonyOutboundHandler.js";
import { telephonySmsHandler } from "./telephonySmsHandler.js";
import { telephonyWebhookHandler } from "./telephonyWebhookHandler.js";

export * from "./types.js";
export * from "./telephonyEngine.js";
export * from "./telephonyWebhookHandler.js";
export * from "./telephonyRecordingStreamHandler.js";
export * from "./telephonyMissedCallsHandler.js";
export * from "./telephonySmsHandler.js";
export * from "./telephonyOutboundHandler.js";
export * from "./telephonyCallLifecycleHandler.js";
export * from "./telephonyCallsListHandler.js";
export * from "./telephonyCallUpdateHandler.js";

export const telephonyRoutes: FastifyPluginAsync = async (server) => {
	// Webhooks
	server.post<{ Params: { organizationId: string } }>("/:organizationId/webhook", telephonyWebhookHandler);
	server.post<{ Params: { organizationId?: string } }>("/webhook", telephonyWebhookHandler);

	// Instant-Ack Outbox Webhook endpoints (<50ms ACK)
	server.post<{ Params: { organizationId: string } }>("/:organizationId/webhook/async", async (req, reply) => {
		return telephonyOutboxService.handleInstantAck(req, reply);
	});
	server.post<{ Params: { organizationId?: string } }>("/webhook/async", async (req, reply) => {
		return telephonyOutboxService.handleInstantAck(req, reply);
	});

	// SMS Webhooks
	server.post<{ Params: { organizationId: string } }>("/:organizationId/sms/webhook", telephonySmsHandler);
	server.post<{ Params: { organizationId?: string } }>("/sms/webhook", telephonySmsHandler);

	// Missed calls SLA
	server.get<{ Params: { organizationId?: string }; Querystring: { page?: number; limit?: number; onlyOpen?: boolean } }>("/missed-calls", telephonyMissedCallsHandler);
	server.get<{ Params: { organizationId: string }; Querystring: { page?: number; limit?: number; onlyOpen?: boolean } }>("/:organizationId/missed-calls", telephonyMissedCallsHandler);

	// Telephony Calls List (GET /api/telephony/calls)
	server.get("/calls", telephonyCallsListHandler);
	server.get("/:organizationId/calls", telephonyCallsListHandler);

	// Update Call Note (PATCH /api/telephony/calls/:id)
	server.patch<{ Params: { id: string; organizationId?: string }; Body: { note?: string; clinicalNote?: string; message?: string; patientId?: string } }>("/calls/:id", telephonyCallUpdateHandler);
	server.patch<{ Params: { id: string; organizationId: string }; Body: { note?: string; clinicalNote?: string; message?: string; patientId?: string } }>("/:organizationId/calls/:id", telephonyCallUpdateHandler);

	// 1-Click Outbound call (Mandate 8e: Doctor Autonomy)
	server.post<{ Params: { organizationId: string }; Body: { phone: string; patientId?: string; patientName?: string } }>("/:organizationId/outbound-call", telephonyOutboundHandler);
	server.post<{ Params: { organizationId?: string }; Body: { phone: string; patientId?: string; patientName?: string } }>("/outbound-call", telephonyOutboundHandler);
	server.post<{ Params: { organizationId: string }; Body: { phone: string; patientId?: string; patientName?: string } }>("/:organizationId/outbound", telephonyOutboundHandler);
	server.post<{ Params: { organizationId?: string }; Body: { phone: string; patientId?: string; patientName?: string } }>("/outbound", telephonyOutboundHandler);

	await server.register(telephonyRecordingStreamRoutes);
	await server.register(telephonySipRoutes);
	await server.register(telephonyCallerLookupRoutes);
	await server.register(telephonyCallLifecycleRoutes);
};
