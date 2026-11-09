/**
 * leadStageTransition.ts — Stage transition audit history and WebSocket broadcasts.
 * Mandate 8b (Strict <= 120 lines). Mandates 8e, 8n (Zero-friction & Full Audit Trail).
 */

import { and, eq } from "drizzle-orm";
import { crmLeads, crmLeadStageHistory } from "../../db/schema.js";
import type { wsBroker } from "../../services/websocketBroker.js";
import type { DbExecutor } from "./patientCreationBridge.js";

export interface StageTransitionDbExecutor {
	insert: (table: any) => { values: (vals: Record<string, unknown>) => Promise<unknown> | void };
	update: (table: any) => { set: (vals: Record<string, unknown>) => { where: (clause?: unknown) => Promise<unknown> | void } };
}

export interface RecordStageTransitionParams {
	tx: DbExecutor | StageTransitionDbExecutor;
	organizationId: string;
	leadId: string;
	fromStage: string | null;
	toStage: string;
	stageEnteredAt: Date | null;
	changedByUserId: string | null;
	patientId?: string | null;
}

/**
 * Records an immutable lead stage transition audit entry in crmLeadStageHistory
 * and updates stageEnteredAt and status in crmLeads (persisting patientId on conversion).
 */
export async function recordLeadStageTransition(params: RecordStageTransitionParams): Promise<Date> {
	const { tx, organizationId, leadId, fromStage, toStage, stageEnteredAt, changedByUserId, patientId } = params;
	const now = new Date();
	const stageStart = stageEnteredAt || now;
	const durationSeconds = Math.max(0, Math.floor((now.getTime() - stageStart.getTime()) / 1000));

	await tx.insert(crmLeadStageHistory).values({
		organizationId,
		leadId,
		fromStage,
		toStage,
		changedByUserId,
		durationSeconds,
		createdAt: now,
	});

	const updateValues: Record<string, unknown> = { status: toStage, stageEnteredAt: now };
	if (patientId) {
		updateValues.patientId = patientId;
	}

	await tx
		.update(crmLeads)
		.set(updateValues)
		.where(and(eq(crmLeads.id, leadId), eq(crmLeads.organizationId, organizationId)));

	return now;
}

/**
 * Broadcasts real-time events to the organization websocket channels.
 */
export function broadcastLeadConversion(params: {
	wsBroker: typeof wsBroker;
	organizationId: string;
	leadId: string;
	toStage: string;
	patient: unknown;
	appointment?: unknown;
}): void {
	const { wsBroker, organizationId, leadId, toStage, patient, appointment } = params;
	wsBroker.broadcastToOrganization(organizationId, {
		type: "LEAD_UPDATED",
		payload: { id: leadId, organizationId, status: toStage },
	});
	if (appointment) {
		wsBroker.broadcastToOrganization(organizationId, {
			type: "APPOINTMENT_CREATED",
			payload: appointment,
		});
	} else if (patient) {
		wsBroker.broadcastToOrganization(organizationId, {
			type: "PATIENT_CREATED",
			payload: patient,
		});
	}
}
