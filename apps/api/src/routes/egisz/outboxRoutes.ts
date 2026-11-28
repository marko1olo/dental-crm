/**
 * outboxRoutes.ts — Fastify routes for EGISZ REMD Outbox and Journal.
 * Mandate 8b compliant (<= 120 lines). Decomposed into ./outbox/
 */

import type { FastifyInstance } from "fastify";
import { defineStreamRoute, defineTenantQuery } from "../../core/routeFactories.js";
import { handleEgiszJournalQuery } from "./outbox/outboxJournalQuery.js";
import { handleOutboxReceipt, handleVisitReceipt } from "./outbox/outboxReceiptHandlers.js";
import {
	handleOutboxDispatch,
	handleOutboxStatus,
	handleOutboxSyncStatus,
	outboxDispatchRouteOptions,
} from "./outbox/outboxActionHandlers.js";

const EGISZ_AUTH_OPTIONS = {
	allowAdminSecretBypass: true,
	allowClinicTokenWithoutStaff: true,
} as const;

export function registerEgiszOutboxRoutes(app: FastifyInstance): void {
	// Action routes (external REMD/OIIS HTTP I/O stays outside open PG transactions)
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/egisz/outbox/dispatch",
		permission: "egisz.submit",
		authOptions: EGISZ_AUTH_OPTIONS,
		schema: outboxDispatchRouteOptions.schema,
		handler: async ({ request, reply }) => handleOutboxDispatch(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/egisz/outbox/dispatch",
		permission: "egisz.submit",
		authOptions: EGISZ_AUTH_OPTIONS,
		schema: outboxDispatchRouteOptions.schema,
		handler: async ({ request, reply }) => handleOutboxDispatch(request, reply),
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/egisz/outbox/sync-status",
		permission: "egisz.submit",
		authOptions: EGISZ_AUTH_OPTIONS,
		handler: async ({ request, reply }) => handleOutboxSyncStatus(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/egisz/outbox/sync-status",
		permission: "egisz.submit",
		authOptions: EGISZ_AUTH_OPTIONS,
		handler: async ({ request, reply }) => handleOutboxSyncStatus(request, reply),
	});
	defineTenantQuery(app, {
		path: "/api/clinical/egisz/outbox/status",
		permission: "egisz.submit",
		authOptions: EGISZ_AUTH_OPTIONS,
		handler: async ({ request, reply }) => handleOutboxStatus(request, reply),
	});
	defineTenantQuery(app, {
		path: "/api/egisz/outbox/status",
		permission: "egisz.submit",
		authOptions: EGISZ_AUTH_OPTIONS,
		handler: async ({ request, reply }) => handleOutboxStatus(request, reply),
	});

	// Journal & Queue list queries
	defineTenantQuery(app, {
		path: "/api/clinical/egisz/outbox",
		permission: "egisz.submit",
		authOptions: EGISZ_AUTH_OPTIONS,
		handler: async ({ tx, organizationId, request, reply }) =>
			handleEgiszJournalQuery(request, reply, "egisz outbox list", tx, organizationId),
	});
	defineTenantQuery(app, {
		path: "/api/egisz/outbox",
		permission: "egisz.submit",
		authOptions: EGISZ_AUTH_OPTIONS,
		handler: async ({ tx, organizationId, request, reply }) =>
			handleEgiszJournalQuery(request, reply, "egisz outbox list", tx, organizationId),
	});
	defineTenantQuery(app, {
		path: "/api/egisz/journal",
		permission: "egisz.submit",
		authOptions: EGISZ_AUTH_OPTIONS,
		handler: async ({ tx, organizationId, request, reply }) =>
			handleEgiszJournalQuery(request, reply, "egisz journal list", tx, organizationId),
	});

	// Receipt routes
	defineTenantQuery(app, {
		path: "/api/clinical/egisz/outbox/:outboxId/receipt",
		permission: "egisz.submit",
		authOptions: EGISZ_AUTH_OPTIONS,
		handler: async ({ request, reply }) => handleOutboxReceipt(request, reply),
	});
	defineTenantQuery(app, {
		path: "/api/egisz/outbox/:outboxId/receipt",
		permission: "egisz.submit",
		authOptions: EGISZ_AUTH_OPTIONS,
		handler: async ({ request, reply }) => handleOutboxReceipt(request, reply),
	});
	defineTenantQuery(app, {
		path: "/api/clinical/egisz/visits/:visitId/receipt",
		permission: "egisz.submit",
		authOptions: EGISZ_AUTH_OPTIONS,
		handler: async ({ request, reply }) => handleVisitReceipt(request, reply),
	});
}
