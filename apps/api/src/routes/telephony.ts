import type { FastifyPluginAsync } from "fastify";
import {
	authenticatePbxWebhook,
	detectMarketingAttribution,
	isForbiddenPrivateIp,
	normalizePhoneNumber,
	type NormalizedPhone,
	UUID_REGEX,
	validateSsrfSafeRecordingUrl,
} from "../services/telephony/telephonySecurity.js";
import { telephonyOutboxService } from "../services/telephonyOutboxService.js";
import { telephonyCallerLookupRoutes } from "./telephonyCallerLookupRoutes.js";
import { telephonyRecordingRoutes } from "./telephonyRecordingRoutes.js";
import { telephonySipRoutes } from "./telephonySipRoutes.js";
import {
	telephonyCallLifecycleRoutes,
	telephonyMissedCallsHandler,
	telephonyOutboundHandler,
	telephonySmsHandler,
	telephonyWebhookHandler,
} from "./telephony/index.js";

// Re-export security utilities for backward compatibility
export {
	UUID_REGEX,
	type NormalizedPhone,
	normalizePhoneNumber,
	authenticatePbxWebhook,
	detectMarketingAttribution,
	isForbiddenPrivateIp,
	validateSsrfSafeRecordingUrl,
	telephonyOutboxService,
};

export * from "./telephony/index.js";

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

	// 1-Click Outbound call (Mandate 8e: Doctor Autonomy)
	server.post<{ Params: { organizationId: string }; Body: { phone: string; patientId?: string; patientName?: string } }>("/:organizationId/outbound-call", telephonyOutboundHandler);
	server.post<{ Params: { organizationId?: string }; Body: { phone: string; patientId?: string; patientName?: string } }>("/outbound-call", telephonyOutboundHandler);

	await server.register(telephonyRecordingRoutes);
	await server.register(telephonySipRoutes);
	await server.register(telephonyCallerLookupRoutes);
	await server.register(telephonyCallLifecycleRoutes);
};
