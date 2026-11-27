import type { FastifyPluginAsync } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { handleAsteriskAmiEvent } from "./sip/handleAsteriskAmiEvent.js";
import { handleSipCallTransfer } from "./sip/handleSipCallTransfer.js";
import { handleSipCredentials } from "./sip/handleSipCredentials.js";
import { handleSipFailover, handleSipStatus } from "./sip/handleSipStatusAndFailover.js";

export const telephonySipRoutes: FastifyPluginAsync = async (server) => {
	// WebRTC SIP Credentials
	defineStreamRoute(server, {
		method: "POST",
		path: "/:organizationId/sip/credentials",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleSipCredentials(request as Parameters<typeof handleSipCredentials>[0], reply),
	});
	defineStreamRoute(server, {
		method: "POST",
		path: "/sip/credentials",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleSipCredentials(request as Parameters<typeof handleSipCredentials>[0], reply),
	});

	// Gateway Status (TCP socket probing outside PG TX)
	defineStreamRoute(server, {
		method: "GET",
		path: "/:organizationId/sip/status",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleSipStatus(request as Parameters<typeof handleSipStatus>[0], reply),
	});
	defineStreamRoute(server, {
		method: "GET",
		path: "/sip/status",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleSipStatus(request as Parameters<typeof handleSipStatus>[0], reply),
	});

	// Failover (TCP socket probing outside PG TX)
	defineStreamRoute(server, {
		method: "POST",
		path: "/:organizationId/sip/failover",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleSipFailover(request as Parameters<typeof handleSipFailover>[0], reply),
	});
	defineStreamRoute(server, {
		method: "POST",
		path: "/sip/failover",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleSipFailover(request as Parameters<typeof handleSipFailover>[0], reply),
	});

	// Asterisk AMI / ARI
	defineStreamRoute(server, {
		method: "POST",
		path: "/:organizationId/asterisk/ami-event",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleAsteriskAmiEvent(request as Parameters<typeof handleAsteriskAmiEvent>[0], reply),
	});
	defineStreamRoute(server, {
		method: "POST",
		path: "/asterisk/ami-event",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleAsteriskAmiEvent(request as Parameters<typeof handleAsteriskAmiEvent>[0], reply),
	});

	// SIP Transfer (external PBX AMI / Cloud HTTP outside PG TX)
	defineStreamRoute(server, {
		method: "POST",
		path: "/:organizationId/sip/transfer",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleSipCallTransfer(request as Parameters<typeof handleSipCallTransfer>[0], reply),
	});
	defineStreamRoute(server, {
		method: "POST",
		path: "/sip/transfer",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleSipCallTransfer(request as Parameters<typeof handleSipCallTransfer>[0], reply),
	});
};
