import {
	type FieldConflictDetail,
	type MutationVector,
	mergeFieldLevelCrdt,
} from "@dental/shared";
import { APPOINTMENT_STATUS_RANK } from "./constants.js";
import type { OdontogramParsedTooth } from "./types.js";

/**
 * Result of resolving appointment status progression conflicts.
 */
export interface AppointmentStatusConflictResolution {
	effectiveStatus: string;
	conflictDetail: FieldConflictDetail | null;
}

/**
 * Deterministically resolves appointment status conflicts using clinical progression ranking
 * and LWW for cancellations.
 */
export function resolveAppointmentStatusConflict(params: {
	incomingStatus?: string;
	existingStatus?: string;
	clientUpdatedAt: string;
	serverUpdatedAt?: string | null;
}): AppointmentStatusConflictResolution {
	const { incomingStatus, existingStatus, clientUpdatedAt, serverUpdatedAt } = params;

	if (!existingStatus || !incomingStatus || incomingStatus === existingStatus) {
		return {
			effectiveStatus: incomingStatus || existingStatus || "planned",
			conflictDetail: null,
		};
	}

	const incomingRank = APPOINTMENT_STATUS_RANK[incomingStatus] ?? 1;
	const existingRank = APPOINTMENT_STATUS_RANK[existingStatus] ?? 1;

	if (incomingStatus === "cancelled" || existingStatus === "cancelled") {
		const incomingTime = new Date(clientUpdatedAt).getTime() || 0;
		const existingTime = serverUpdatedAt
			? new Date(serverUpdatedAt).getTime()
			: 0;

		if (incomingTime < existingTime) {
			return {
				effectiveStatus: existingStatus,
				conflictDetail: {
					field: "status",
					clientValue: incomingStatus,
					serverValue: existingStatus,
					resolvedValue: existingStatus,
					strategy: "lww",
					winner: "server",
					reason: `Existing server cancellation/edit timestamp (${new Date(existingTime).toISOString()}) is newer than client timestamp (${new Date(incomingTime).toISOString()})`,
				},
			};
		}

		return {
			effectiveStatus: incomingStatus,
			conflictDetail: {
				field: "status",
				clientValue: incomingStatus,
				serverValue: existingStatus,
				resolvedValue: incomingStatus,
				strategy: "lww",
				winner: "client",
				reason: "Client cancellation/edit timestamp is newer",
			},
		};
	}

	if (existingRank > incomingRank) {
		return {
			effectiveStatus: existingStatus,
			conflictDetail: {
				field: "status",
				clientValue: incomingStatus,
				serverValue: existingStatus,
				resolvedValue: existingStatus,
				strategy: "status_priority",
				winner: "server",
				reason: `Server status (${existingStatus} [rank ${existingRank}]) has higher clinical progression than incoming status (${incomingStatus} [rank ${incomingRank}])`,
			},
		};
	}

	return {
		effectiveStatus: incomingStatus,
		conflictDetail: {
			field: "status",
			clientValue: incomingStatus,
			serverValue: existingStatus,
			resolvedValue: incomingStatus,
			strategy: "status_priority",
			winner: "client",
			reason: `Client status (${incomingStatus} [rank ${incomingRank}]) advanced clinical progression over server (${existingStatus} [rank ${existingRank}])`,
		},
	};
}

/**
 * Extracts and normalizes list of teeth from an odontogram mutation payload.
 */
export function parseTeethFromPayload(
	payload: Record<string, unknown>,
	entityId: string,
): OdontogramParsedTooth[] {
	const teethList: OdontogramParsedTooth[] = [];

	if (Array.isArray(payload.teeth)) {
		for (const t of payload.teeth as Array<Record<string, unknown>>) {
			const num = Number(t.toothNumber || t.tooth || 0);
			if (num > 0) {
				teethList.push({
					toothNumber: num,
					state: String(t.statusCode || t.state || t.condition || "healthy"),
					surfaces:
						t.surfaces ??
						(t.surface
							? Array.isArray(t.surface)
								? t.surface
								: [t.surface]
							: null),
					notes: t.notes ? String(t.notes) : null,
					visitId: t.visitId
						? String(t.visitId)
						: payload.visitId
							? String(payload.visitId)
							: null,
				});
			}
		}
	} else {
		const toothNumber = Number(
			payload.toothNumber ||
				payload.tooth ||
				entityId.split(":")[1] ||
				0,
		);
		if (toothNumber > 0) {
			teethList.push({
				toothNumber,
				state: String(
					payload.state ||
						payload.statusCode ||
						payload.condition ||
						"healthy",
				),
				surfaces:
					payload.surfaces ??
					(payload.surface
						? Array.isArray(payload.surface)
							? payload.surface
							: [payload.surface]
						: null),
				notes: payload.notes ? String(payload.notes) : null,
				visitId: payload.visitId ? String(payload.visitId) : null,
			});
		}
	}

	return teethList;
}

/**
 * Evaluates Last-Write-Wins (LWW) conflict between incoming client tooth state and server tooth record.
 */
export function resolveOdontogramToothConflict(params: {
	toothItem: OdontogramParsedTooth;
	serverTooth?: { state?: string | null; updatedAt?: Date | string | null } | null;
	incomingDate: Date;
}): {
	clientWins: boolean;
	conflictDetail?: FieldConflictDetail;
} {
	const { toothItem, serverTooth, incomingDate } = params;

	const serverDate = serverTooth?.updatedAt
		? new Date(serverTooth.updatedAt)
		: new Date(0);

	const clientWins = !serverTooth || incomingDate.getTime() >= serverDate.getTime();

	if (clientWins) {
		return { clientWins: true };
	}

	return {
		clientWins: false,
		conflictDetail: {
			field: `tooth_${toothItem.toothNumber}_state`,
			clientValue: toothItem.state,
			serverValue: serverTooth?.state || "healthy",
			resolvedValue: serverTooth?.state || "healthy",
			strategy: "lww",
			winner: "server",
			reason: `Server tooth state timestamp (${serverDate.toISOString()}) is newer than client timestamp (${incomingDate.toISOString()})`,
		},
	};
}

/**
 * Builds an updated MutationVector for modified teeth in odontogram state.
 */
export function buildOdontogramVector(params: {
	serverVector: MutationVector;
	teethList: OdontogramParsedTooth[];
	incomingDate: Date;
	effectiveAuthorId?: string | null;
	clientId: string;
}): MutationVector {
	const { serverVector, teethList, incomingDate, effectiveAuthorId, clientId } = params;
	const newVector: MutationVector = { ...serverVector };

	for (const toothItem of teethList) {
		const key = `tooth_${toothItem.toothNumber}`;
		newVector[key] = {
			updatedAt: incomingDate.toISOString(),
			version: (serverVector[key]?.version ?? 0) + 1,
			authorId: effectiveAuthorId ?? undefined,
			clientId,
		};
	}

	return newVector;
}

/**
 * Dispatches standard field-level CRDT merge for entities.
 */
export function performFieldLevelCrdtMerge(params: {
	entityKind: string;
	entityId: string;
	serverEntity: Record<string, unknown> | null;
	serverVector: MutationVector;
	clientPatch: Record<string, unknown>;
	clientVector?: MutationVector;
	clientUpdatedAt: string;
	serverUpdatedAt: string | null;
	clientId: string;
	authorUserId?: string;
}) {
	return mergeFieldLevelCrdt(params);
}
