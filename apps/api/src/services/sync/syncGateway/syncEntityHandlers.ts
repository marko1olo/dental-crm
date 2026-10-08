import type {
	SyncMutationEnvelope,
	SyncMutationStatus,
} from "@dental/shared";
import type { TenantDb } from "../../../db/rls.js";
import { SyncAdministrativeHandlers } from "./syncAdministrativeHandlers.js";
import { SyncClinicalHandlers } from "./syncClinicalHandlers.js";
import type { EntityMutationHandlerResult } from "./types.js";

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
}
