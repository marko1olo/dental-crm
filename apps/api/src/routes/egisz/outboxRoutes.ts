/**
 * outboxRoutes.ts — Fastify routes for EGISZ REMD Outbox and Journal.
 * Mandate 8b compliant (<= 120 lines). Decomposed into ./outbox/
 */

import type { FastifyInstance } from "fastify";
import { handleEgiszJournalQuery } from "./outbox/outboxJournalQuery.js";
import { handleOutboxReceipt, handleVisitReceipt } from "./outbox/outboxReceiptHandlers.js";
import {
	handleOutboxDispatch,
	handleOutboxStatus,
	handleOutboxSyncStatus,
} from "./outbox/outboxActionHandlers.js";

export function registerEgiszOutboxRoutes(app: FastifyInstance): void {
	// Action routes
	app.post("/api/clinical/egisz/outbox/dispatch", handleOutboxDispatch);
	app.post("/api/egisz/outbox/dispatch", handleOutboxDispatch);
	app.post("/api/clinical/egisz/outbox/sync-status", handleOutboxSyncStatus);
	app.post("/api/egisz/outbox/sync-status", handleOutboxSyncStatus);
	app.get("/api/clinical/egisz/outbox/status", handleOutboxStatus);
	app.get("/api/egisz/outbox/status", handleOutboxStatus);

	// Journal & Queue list queries
	app.get("/api/clinical/egisz/outbox", (req, rep) => handleEgiszJournalQuery(req, rep, "egisz outbox list"));
	app.get("/api/egisz/outbox", (req, rep) => handleEgiszJournalQuery(req, rep, "egisz outbox list"));
	app.get("/api/egisz/journal", (req, rep) => handleEgiszJournalQuery(req, rep, "egisz journal list"));

	// Receipt routes
	app.get("/api/clinical/egisz/outbox/:outboxId/receipt", handleOutboxReceipt);
	app.get("/api/egisz/outbox/:outboxId/receipt", handleOutboxReceipt);
	app.get("/api/clinical/egisz/visits/:visitId/receipt", handleVisitReceipt);
}
