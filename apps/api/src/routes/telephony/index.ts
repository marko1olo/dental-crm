import type { FastifyPluginAsync } from "fastify";
import { defineStreamRoute, defineWebhookRoute } from "../../core/routeFactories.js";
import { telephonyOutboxService } from "../../services/telephonyOutboxService.js";
import { telephonyRecordingStreamRoutes } from "./telephonyRecordingStreamHandler.js";
import { telephonySipRoutes } from "./telephonySipRoutes.js";
import { telephonyCallerLookupRoutes } from "./telephonyCallerLookupRoutes.js";
import { telephonyCallLifecycleRoutes } from "./telephonyCallLifecycleHandler.js";
import { telephonyCallsListHandler } from "./telephonyCallsListHandler.js";
import { telephonyCallUpdateHandler } from "./telephonyCallUpdateHandler.js";
import { telephonyTranscriptSaveHandler } from "./telephonyTranscriptHandler.js";
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
export * from "./telephonySipRoutes.js";
export * from "./telephonyCallerLookupRoutes.js";
export {
	UUID_REGEX,
	type NormalizedPhone,
	normalizePhoneNumber,
	authenticatePbxWebhook,
	detectMarketingAttribution,
	isForbiddenPrivateIp,
	validateSsrfSafeRecordingUrl,
} from "../../services/telephony/telephonySecurity.js";
export { telephonyOutboxService } from "../../services/telephonyOutboxService.js";

export const telephonyRoutes: FastifyPluginAsync = async (server) => {
	// Webhooks (SSRF DNS validation & short TX managed inside handler)
	defineWebhookRoute(server, {
		method: "POST",
		path: "/:organizationId/webhook",
		handler: async ({ request, reply }) =>
			telephonyWebhookHandler(
				request as Parameters<typeof telephonyWebhookHandler>[0],
				reply,
			),
	});
	defineWebhookRoute(server, {
		method: "POST",
		path: "/webhook",
		handler: async ({ request, reply }) =>
			telephonyWebhookHandler(
				request as Parameters<typeof telephonyWebhookHandler>[0],
				reply,
			),
	});

	// Instant-Ack Outbox Webhook endpoints (<50ms ACK)
	defineWebhookRoute(server, {
		method: "POST",
		path: "/:organizationId/webhook/async",
		handler: async ({ request, reply }) =>
			telephonyOutboxService.handleInstantAck(
				request as Parameters<typeof telephonyOutboxService.handleInstantAck>[0],
				reply,
			),
	});
	defineWebhookRoute(server, {
		method: "POST",
		path: "/webhook/async",
		handler: async ({ request, reply }) =>
			telephonyOutboxService.handleInstantAck(
				request as Parameters<typeof telephonyOutboxService.handleInstantAck>[0],
				reply,
			),
	});

	// SMS Webhooks
	defineWebhookRoute(server, {
		method: "POST",
		path: "/:organizationId/sms/webhook",
		handler: async ({ request, reply }) =>
			telephonySmsHandler(
				request as Parameters<typeof telephonySmsHandler>[0],
				reply,
			),
	});
	defineWebhookRoute(server, {
		method: "POST",
		path: "/sms/webhook",
		handler: async ({ request, reply }) =>
			telephonySmsHandler(
				request as Parameters<typeof telephonySmsHandler>[0],
				reply,
			),
	});

	// Missed calls SLA
	defineStreamRoute(server, {
		method: "GET",
		path: "/missed-calls",
		permission: "public",
		handler: async ({ request, reply }) =>
			telephonyMissedCallsHandler(
				request as Parameters<typeof telephonyMissedCallsHandler>[0],
				reply,
			),
	});
	defineStreamRoute(server, {
		method: "GET",
		path: "/:organizationId/missed-calls",
		permission: "public",
		handler: async ({ request, reply }) =>
			telephonyMissedCallsHandler(
				request as Parameters<typeof telephonyMissedCallsHandler>[0],
				reply,
			),
	});

	// Telephony Calls List (GET /api/telephony/calls)
	defineStreamRoute(server, {
		method: "GET",
		path: "/calls",
		permission: "public",
		handler: async ({ request, reply }) =>
			telephonyCallsListHandler(
				request as Parameters<typeof telephonyCallsListHandler>[0],
				reply,
			),
	});
	defineStreamRoute(server, {
		method: "GET",
		path: "/:organizationId/calls",
		permission: "public",
		handler: async ({ request, reply }) =>
			telephonyCallsListHandler(
				request as Parameters<typeof telephonyCallsListHandler>[0],
				reply,
			),
	});

	// Update Call Note (PATCH /api/telephony/calls/:id)
	defineStreamRoute(server, {
		method: "PATCH",
		path: "/calls/:id",
		permission: "public",
		handler: async ({ request, reply }) =>
			telephonyCallUpdateHandler(
				request as Parameters<typeof telephonyCallUpdateHandler>[0],
				reply,
			),
	});
	defineStreamRoute(server, {
		method: "PATCH",
		path: "/:organizationId/calls/:id",
		permission: "public",
		handler: async ({ request, reply }) =>
			telephonyCallUpdateHandler(
				request as Parameters<typeof telephonyCallUpdateHandler>[0],
				reply,
			),
	});

	// Persist / update Call Speech Transcript in uis_call_speech_transcripts
	defineStreamRoute(server, {
		method: "POST",
		path: "/calls/:id/transcript",
		permission: "public",
		handler: async ({ request, reply }) =>
			telephonyTranscriptSaveHandler(
				request as Parameters<typeof telephonyTranscriptSaveHandler>[0],
				reply,
			),
	});
	defineStreamRoute(server, {
		method: "POST",
		path: "/:organizationId/calls/:id/transcript",
		permission: "public",
		handler: async ({ request, reply }) =>
			telephonyTranscriptSaveHandler(
				request as Parameters<typeof telephonyTranscriptSaveHandler>[0],
				reply,
			),
	});

	// 1-Click Outbound call (external PBX HTTP/AMI dispatch runs outside PG TX)
	defineStreamRoute(server, {
		method: "POST",
		path: "/:organizationId/outbound-call",
		permission: "public",
		handler: async ({ request, reply }) =>
			telephonyOutboundHandler(
				request as Parameters<typeof telephonyOutboundHandler>[0],
				reply,
			),
	});
	defineStreamRoute(server, {
		method: "POST",
		path: "/outbound-call",
		permission: "public",
		handler: async ({ request, reply }) =>
			telephonyOutboundHandler(
				request as Parameters<typeof telephonyOutboundHandler>[0],
				reply,
			),
	});
	defineStreamRoute(server, {
		method: "POST",
		path: "/:organizationId/outbound",
		permission: "public",
		handler: async ({ request, reply }) =>
			telephonyOutboundHandler(
				request as Parameters<typeof telephonyOutboundHandler>[0],
				reply,
			),
	});
	defineStreamRoute(server, {
		method: "POST",
		path: "/outbound",
		permission: "public",
		handler: async ({ request, reply }) =>
			telephonyOutboundHandler(
				request as Parameters<typeof telephonyOutboundHandler>[0],
				reply,
			),
	});

	await server.register(telephonyRecordingStreamRoutes);
	await server.register(telephonySipRoutes);
	await server.register(telephonyCallerLookupRoutes);
	await server.register(telephonyCallLifecycleRoutes);
};
