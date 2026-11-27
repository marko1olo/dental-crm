/**
 * outboxRoutes.ts — Fastify routes for EGISZ REMD Outbox and Journal.
 * Mandate 8b compliant (<= 120 lines). Decomposed into ./outbox/
 */

import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { handleEgiszJournalQuery } from "./outbox/outboxJournalQuery.js";
import { handleOutboxReceipt, handleVisitReceipt } from "./outbox/outboxReceiptHandlers.js";
import {
	handleOutboxDispatch,
	handleOutboxStatus,
	handleOutboxSyncStatus,
	outboxDispatchRouteOptions,
} from "./outbox/outboxActionHandlers.js";

export function registerEgiszOutboxRoutes(app: FastifyInstance): void {
	// Action routes
	app.post("/api/clinical/egisz/outbox/dispatch", outboxDispatchRouteOptions, handleOutboxDispatch);
	app.post("/api/egisz/outbox/dispatch", outboxDispatchRouteOptions, handleOutboxDispatch);

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/egisz/outbox/sync-status",
		permission: "public",
		handler: async ({ request, reply }) => handleOutboxSyncStatus(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/egisz/outbox/sync-status",
		permission: "public",
		handler: async ({ request, reply }) => handleOutboxSyncStatus(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/egisz/outbox/status",
		permission: "public",
		handler: async ({ request, reply }) => handleOutboxStatus(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/egisz/outbox/status",
		permission: "public",
		handler: async ({ request, reply }) => handleOutboxStatus(request, reply),
	});

	// Journal & Queue list queries
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/egisz/outbox",
		permission: "public",
		handler: async ({ request, reply }) => handleEgiszJournalQuery(request, reply, "egisz outbox list"),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/egisz/outbox",
		permission: "public",
		handler: async ({ request, reply }) => handleEgiszJournalQuery(request, reply, "egisz outbox list"),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/egisz/journal",
		permission: "public",
		handler: async ({ request, reply }) => handleEgiszJournalQuery(request, reply, "egisz journal list"),
	});

	// Receipt routes
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/egisz/outbox/:outboxId/receipt",
		permission: "public",
		handler: async ({ request, reply }) => handleOutboxReceipt(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/egisz/outbox/:outboxId/receipt",
		permission: "public",
		handler: async ({ request, reply }) => handleOutboxReceipt(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/egisz/visits/:visitId/receipt",
		permission: "public",
		handler: async ({ request, reply }) => handleVisitReceipt(request, reply),
	});
}
