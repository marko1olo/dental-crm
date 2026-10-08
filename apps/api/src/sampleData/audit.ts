/**
 * @file audit.ts
 * @description Layer 2: Audit events, import batches, and audit recording.
 */

import { randomUUID } from "node:crypto";
import type { AuditEvent, ImportBatch } from "@dental/shared";
import { persistMutableState } from "./stateNotifier.js";
import { organizationId, doctorUserId, activeVisitId, nowIso } from "./fixtureIds.js";

const importBatches: ImportBatch[] = [];

export const auditEvents: AuditEvent[] = [
	{
		id: "cdac781e-6a56-4bbb-a4bd-1e2da6efc047",
		organizationId,
		actorUserId: doctorUserId,
		entityType: "visit",
		entityId: activeVisitId,
		action: "visit_opened",
		reason: "Смена открыта, карта пациента доступна врачу.",
		createdAt: nowIso,
	},
	{
		id: "5caa31eb-f50e-4d85-aa5e-c328d8d08229",
		organizationId,
		actorUserId: doctorUserId,
		entityType: "document",
		entityId: "f9d274b4-3730-4eaa-aeac-20bf5f2f1bc5",
		action: "document_prepared",
		reason: "Договор создан как черновик перед приемом.",
		createdAt: nowIso,
	},
];


function _recordImportBatch(input: {
	sourceName: string;
	totalRows: number;
	importedRows: number;
	skippedRows: number;
	warningRows: number;
	blockedRows: number;
}): ImportBatch {
	const batch: ImportBatch = {
		id: randomUUID(),
		organizationId,
		sourceName: input.sourceName,
		status: input.skippedRows > 0 ? "completed_with_skips" : "completed",
		totalRows: input.totalRows,
		importedRows: input.importedRows,
		skippedRows: input.skippedRows,
		warningRows: input.warningRows,
		blockedRows: input.blockedRows,
		createdAt: new Date().toISOString(),
	};
	importBatches.unshift(batch);
	persistMutableState();
	return batch;
}


export function recordAuditEvent(input: {
	organizationId?: string | null | undefined;
	actorUserId?: string | null | undefined;
	entityType: string;
	entityId: string;
	action: string;
	reason?: string | null | undefined;
}): AuditEvent {
	const event: AuditEvent = {
		id: randomUUID(),
		organizationId: input.organizationId?.trim() || organizationId,
		actorUserId: input.actorUserId ?? null,
		entityType: input.entityType,
		entityId: input.entityId,
		action: input.action,
		reason: input.reason ?? null,
		createdAt: new Date().toISOString(),
	};
	auditEvents.unshift(event);
	persistMutableState();
	return event;
}


export { importBatches };
