import type {
	SyncMutationEnvelope,
	SyncMutationStatus,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import {
	appointments,
	clinicalTasks,
	patients,
	toothStates,
	treatmentItems,
	visits,
} from "../../../db/schema.js";
import { SyncAdministrativeHandlers } from "./syncAdministrativeHandlers.js";
import { SyncClinicalHandlers } from "./syncClinicalHandlers.js";
import { SyncQueueManager } from "./syncQueueManager.js";
import type { EntityMutationHandlerResult } from "./types.js";

const ENTITY_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export { SyncAdministrativeHandlers } from "./syncAdministrativeHandlers.js";
export { SyncClinicalHandlers } from "./syncClinicalHandlers.js";

/**
 * Unified facade for entity-specific mutation handlers.
 * Delegates to administrative and clinical handlers preserving clean DAG boundaries.
 */
export class SyncEntityHandlers {
	public static handlePaymentMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
	): Promise<{ status: SyncMutationStatus; entity: Record<string, unknown> }> {
		return SyncAdministrativeHandlers.handlePaymentMutation(tx, organizationId, mutation);
	}

	public static handleInvoiceMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
	): Promise<{ status: SyncMutationStatus; entity: Record<string, unknown> }> {
		return SyncAdministrativeHandlers.handleInvoiceMutation(tx, organizationId, mutation);
	}

	public static handlePatientMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<EntityMutationHandlerResult> {
		return SyncAdministrativeHandlers.handlePatientMutation(
			tx,
			organizationId,
			mutation,
			clientId,
			authorUserId,
		);
	}

	public static handleClinicalMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<EntityMutationHandlerResult> {
		return SyncClinicalHandlers.handleClinicalMutation(
			tx,
			organizationId,
			mutation,
			clientId,
			authorUserId,
		);
	}

	public static handleAppointmentMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<EntityMutationHandlerResult> {
		return SyncAdministrativeHandlers.handleAppointmentMutation(
			tx,
			organizationId,
			mutation,
			clientId,
			authorUserId,
		);
	}

	public static handleOdontogramMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<EntityMutationHandlerResult> {
		return SyncClinicalHandlers.handleOdontogramMutation(
			tx,
			organizationId,
			mutation,
			clientId,
			authorUserId,
		);
	}

	public static handleTreatmentItemMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<EntityMutationHandlerResult> {
		return SyncClinicalHandlers.handleTreatmentItemMutation(
			tx,
			organizationId,
			mutation,
			clientId,
			authorUserId,
		);
	}

	public static handleClinicalTaskMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<EntityMutationHandlerResult> {
		return SyncClinicalHandlers.handleClinicalTaskMutation(
			tx,
			organizationId,
			mutation,
			clientId,
			authorUserId,
		);
	}

	public static handlePatientAdministrativeProfileMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<EntityMutationHandlerResult> {
		return SyncAdministrativeHandlers.handlePatientAdministrativeProfileMutation(
			tx,
			organizationId,
			mutation,
			clientId,
			authorUserId,
		);
	}

	public static async handleDeleteMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		authorUserId?: string,
	): Promise<EntityMutationHandlerResult> {
		const isUuid = ENTITY_UUID_RE.test(mutation.entityId);
		const rawReason =
			mutation.payload && typeof mutation.payload.reason === "string"
				? mutation.payload.reason
				: null;
		const validActorId =
			authorUserId && ENTITY_UUID_RE.test(authorUserId) ? authorUserId : null;

		if (isUuid) {
			if (mutation.entityKind === "patient") {
				await tx
					.update(patients)
					.set({ status: "archived", updatedAt: new Date() })
					.where(
						and(
							eq(patients.organizationId, organizationId),
							eq(patients.id, mutation.entityId),
						),
					);
			} else if (mutation.entityKind === "appointment") {
				await tx
					.update(appointments)
					.set({ status: "cancelled" })
					.where(
						and(
							eq(appointments.organizationId, organizationId),
							eq(appointments.id, mutation.entityId),
						),
					);
			} else if (mutation.entityKind === "visit") {
				await tx
					.update(visits)
					.set({ status: "voided", updatedAt: new Date() })
					.where(
						and(
							eq(visits.organizationId, organizationId),
							eq(visits.id, mutation.entityId),
						),
					);
			} else if (mutation.entityKind === "odontogram_state") {
				await tx
					.delete(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.id, mutation.entityId),
						),
					);
			} else if (mutation.entityKind === "clinical_task") {
				await tx
					.delete(clinicalTasks)
					.where(
						and(
							eq(clinicalTasks.organizationId, organizationId),
							eq(clinicalTasks.id, mutation.entityId),
						),
					);
			} else if (mutation.entityKind === "treatment_item") {
				await tx
					.delete(treatmentItems)
					.where(
						and(
							eq(treatmentItems.organizationId, organizationId),
							eq(treatmentItems.id, mutation.entityId),
						),
					);
			}
		}

		const tombstone = await SyncQueueManager.recordEntityTombstone({
			tx,
			organizationId,
			entityKind: mutation.entityKind,
			entityId: mutation.entityId,
			deletedByUserId: validActorId,
			reason: rawReason,
		});

		return {
			status: "applied",
			entity: {
				id: mutation.entityId,
				entityKind: mutation.entityKind,
				deleted: true,
				tombstoneId: tombstone.id,
				deletedAt: tombstone.deletedAt.toISOString(),
			},
		};
	}
}
