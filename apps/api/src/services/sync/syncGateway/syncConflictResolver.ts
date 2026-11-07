import {
	type FieldConflictDetail,
	type MutationVector,
	type SyncMutationEntityKind,
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
	incomingStatus?: string | undefined;
	existingStatus?: string | undefined;
	clientUpdatedAt: string;
	serverUpdatedAt?: string | null | undefined;
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

const CANONICAL_SURFACES = [
	"mesial",
	"occlusal",
	"distal",
	"vestibular",
	"lingual",
	"cervical",
	"root",
	"cusp",
] as const;

/**
 * Normalizes tooth surface designations into a unique canonical array.
 */
export function normalizeSurfaces(raw: unknown): string[] {
	if (!raw) return [];
	let list: string[] = [];

	if (Array.isArray(raw)) {
		list = raw.map((item) => String(item ?? "").trim().toLowerCase()).filter(Boolean);
	} else if (typeof raw === "string") {
		const trimmed = raw.trim();
		if (!trimmed) return [];
		if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
			try {
				const parsed = JSON.parse(trimmed);
				if (Array.isArray(parsed)) {
					list = parsed.map((item) => String(item ?? "").trim().toLowerCase()).filter(Boolean);
				}
			} catch {
				list = trimmed
					.replace(/[\[\]"']/g, "")
					.split(",")
					.map((s) => s.trim().toLowerCase())
					.filter(Boolean);
			}
		} else if (trimmed.includes(",")) {
			list = trimmed.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
		} else if (trimmed.includes(" ")) {
			list = trimmed.split(/\s+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
		} else {
			list = [trimmed.toLowerCase()];
		}
	}

	const uniqueSet = new Set<string>();
	for (const s of list) {
		if (s) uniqueSet.add(s);
	}

	return Array.from(uniqueSet).sort((a, b) => {
		const idxA = CANONICAL_SURFACES.indexOf(a as (typeof CANONICAL_SURFACES)[number]);
		const idxB = CANONICAL_SURFACES.indexOf(b as (typeof CANONICAL_SURFACES)[number]);
		if (idxA !== -1 && idxB !== -1) return idxA - idxB;
		if (idxA !== -1) return -1;
		if (idxB !== -1) return 1;
		return a.localeCompare(b);
	});
}

/**
 * Checks whether the tooth condition is terminal/irreversible (extraction, absent).
 */
export function isTerminalIrreversibleState(state: string | null | undefined): boolean {
	if (!state) return false;
	const s = state.trim().toLowerCase();
	return (
		s === "extracted" ||
		s === "absent" ||
		s === "missing" ||
		s === "удален" ||
		s === "адентия" ||
		s === "о" ||
		s === "o"
	);
}

/**
 * Checks whether the tooth is replaced by an artificial construct (implant, crown).
 */
export function isImplantOrCrownState(state: string | null | undefined): boolean {
	if (!state) return false;
	const s = state.trim().toLowerCase();
	return (
		s === "implant" ||
		s === "имплант" ||
		s === "и" ||
		s === "crown" ||
		s === "коронка" ||
		s === "к"
	);
}

/**
 * Checks whether the state represents a carious lesion.
 */
export function isCariesState(state: string | null | undefined): boolean {
	if (!state) return false;
	const s = state.trim().toLowerCase();
	return (
		s === "caries" ||
		s === "кариес" ||
		s === "c" ||
		s === "с" ||
		s.startsWith("c1") ||
		s.startsWith("c2") ||
		s.startsWith("c3") ||
		s.startsWith("c4") ||
		s.startsWith("k02")
	);
}

/**
 * Checks whether the state represents a restorative filling.
 */
export function isFillingState(state: string | null | undefined): boolean {
	if (!state) return false;
	const s = state.trim().toLowerCase();
	return (
		s === "filling" ||
		s === "f" ||
		s === "пломба" ||
		s === "plomba" ||
		s === "п" ||
		s === "p" ||
		s === "restoration" ||
		s === "inlay" ||
		s === "onlay"
	);
}

/**
 * Determines if two tooth clinical states allow Surface Union Merge
 * (e.g. concurrent caries on different surfaces, Class II Black).
 */
export function areToothStatesSurfaceMergeable(stateA: string, stateB: string): boolean {
	const a = stateA.trim().toLowerCase();
	const b = stateB.trim().toLowerCase();

	if (a === b) return true;

	if (isTerminalIrreversibleState(a) || isTerminalIrreversibleState(b)) {
		return false;
	}

	if (isImplantOrCrownState(a) || isImplantOrCrownState(b)) {
		return false;
	}

	if (isCariesState(a) && isCariesState(b)) return true;
	if (isFillingState(a) && isFillingState(b)) return true;
	if ((isCariesState(a) && isFillingState(b)) || (isFillingState(a) && isCariesState(b))) {
		return true;
	}

	return false;
}

/**
 * Comprehensive result of odontogram tooth conflict evaluation.
 */
export interface OdontogramToothConflictResult {
	clientWins: boolean;
	effectiveState: string;
	effectiveSurfaces: string[] | null;
	isMerged: boolean;
	mergedSurfaces?: string[];
	conflictDetail?: FieldConflictDetail;
}

/**
 * Evaluates conflict between incoming client tooth mutation and server tooth record.
 * Implements Surface Union Merge [OFF-06]: if clinical diagnoses are compatible (e.g. caries on
 * different surfaces like distal and occlusal), surfaces are merged without data loss.
 * Terminal states (extraction/absent) take clinical precedence over surface lesions.
 */
export function resolveOdontogramToothConflict(params: {
	toothItem: OdontogramParsedTooth;
	serverTooth?: {
		state?: string | null | undefined;
		surfaces?: unknown;
		notes?: string | null | undefined;
		updatedAt?: Date | string | null | undefined;
	} | null | undefined;
	incomingDate: Date;
}): OdontogramToothConflictResult {
	const { toothItem, serverTooth, incomingDate } = params;

	const clientSurfaces = normalizeSurfaces(toothItem.surfaces);
	const clientState = toothItem.state || "healthy";

	if (!serverTooth) {
		return {
			clientWins: true,
			effectiveState: clientState,
			effectiveSurfaces: clientSurfaces.length > 0 ? clientSurfaces : null,
			isMerged: false,
		};
	}

	const serverDate = serverTooth.updatedAt
		? new Date(serverTooth.updatedAt)
		: new Date(0);
	const serverState = serverTooth.state || "healthy";
	const serverSurfaces = normalizeSurfaces(serverTooth.surfaces);
	const isClientNewerOrEqual = incomingDate.getTime() >= serverDate.getTime();

	// 1. Terminal state precedence (extraction / absent tooth):
	// Server extraction takes absolute precedence over incoming surface lesions.
	if (isTerminalIrreversibleState(serverState)) {
		if (!isTerminalIrreversibleState(clientState)) {
			return {
				clientWins: false,
				effectiveState: serverState,
				effectiveSurfaces: null,
				isMerged: false,
				conflictDetail: {
					field: `tooth_${toothItem.toothNumber}_state`,
					clientValue: clientState,
					serverValue: serverState,
					resolvedValue: serverState,
					strategy: "status_priority",
					winner: "server",
					reason: `Terminal state (${serverState}) on server has absolute clinical priority over incoming pathology (${clientState}) for tooth ${toothItem.toothNumber}`,
				},
			};
		}
		return {
			clientWins: isClientNewerOrEqual,
			effectiveState: serverState,
			effectiveSurfaces: null,
			isMerged: false,
		};
	}

	// Client marks extraction:
	if (isTerminalIrreversibleState(clientState)) {
		return {
			clientWins: true,
			effectiveState: clientState,
			effectiveSurfaces: null,
			isMerged: false,
			conflictDetail: {
				field: `tooth_${toothItem.toothNumber}_state`,
				clientValue: clientState,
				serverValue: serverState,
				resolvedValue: clientState,
				strategy: "status_priority",
				winner: "client",
				reason: `Terminal state (${clientState}) from client overrides existing condition (${serverState}) for tooth ${toothItem.toothNumber}`,
			},
		};
	}

	// 2. Implant / Crown precedence over stale surface edits:
	if (isImplantOrCrownState(serverState) && !isImplantOrCrownState(clientState)) {
		if (!isClientNewerOrEqual) {
			return {
				clientWins: false,
				effectiveState: serverState,
				effectiveSurfaces: serverSurfaces.length > 0 ? serverSurfaces : null,
				isMerged: false,
				conflictDetail: {
					field: `tooth_${toothItem.toothNumber}_state`,
					clientValue: clientState,
					serverValue: serverState,
					resolvedValue: serverState,
					strategy: "lww",
					winner: "server",
					reason: `Server restoration/implant (${serverState}) is newer than client pathology (${clientState})`,
				},
			};
		}
	}

	// 3. Surface Union Merge [OFF-06]:
	// When diagnoses are compatible (e.g. caries or fillings across different surfaces),
	// perform set union merge to prevent doctor's clinical findings from being erased.
	const isMergeable = areToothStatesSurfaceMergeable(clientState, serverState);

	if (isMergeable) {
		const combinedSet = new Set([...clientSurfaces, ...serverSurfaces]);
		const mergedSurfaces = normalizeSurfaces(Array.from(combinedSet));

		const surfacesDiffer =
			clientSurfaces.length !== serverSurfaces.length ||
			clientSurfaces.some((s) => !serverSurfaces.includes(s));

		if (surfacesDiffer && mergedSurfaces.length > 0) {
			let effectiveState = isClientNewerOrEqual ? clientState : serverState;
			if (isCariesState(clientState) && isFillingState(serverState)) {
				effectiveState = clientState;
			} else if (isFillingState(clientState) && isCariesState(serverState)) {
				effectiveState = serverState;
			}

			return {
				clientWins: isClientNewerOrEqual || clientSurfaces.some((s) => !serverSurfaces.includes(s)),
				effectiveState,
				effectiveSurfaces: mergedSurfaces,
				isMerged: true,
				mergedSurfaces,
				conflictDetail: {
					field: `tooth_${toothItem.toothNumber}_surfaces`,
					clientValue: clientSurfaces,
					serverValue: serverSurfaces,
					resolvedValue: mergedSurfaces,
					strategy: "surface_union_merge",
					winner: "merged",
					reason: `Surface Union Merge combined client surfaces [${clientSurfaces.join(", ")}] and server surfaces [${serverSurfaces.join(", ")}] into [${mergedSurfaces.join(", ")}] for tooth ${toothItem.toothNumber}`,
				},
			};
		}
	}

	// 4. Standard LWW fallback for non-mergeable or identical surface sets:
	if (isClientNewerOrEqual) {
		return {
			clientWins: true,
			effectiveState: clientState,
			effectiveSurfaces: clientSurfaces.length > 0 ? clientSurfaces : null,
			isMerged: false,
		};
	}

	return {
		clientWins: false,
		effectiveState: serverState,
		effectiveSurfaces: serverSurfaces.length > 0 ? serverSurfaces : null,
		isMerged: false,
		conflictDetail: {
			field: `tooth_${toothItem.toothNumber}_state`,
			clientValue: clientState,
			serverValue: serverState,
			resolvedValue: serverState,
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
	entityKind: SyncMutationEntityKind;
	entityId: string;
	serverEntity: Record<string, unknown> | null;
	serverVector: MutationVector;
	clientPatch: Record<string, unknown>;
	clientVector?: MutationVector | undefined;
	clientUpdatedAt: string;
	serverUpdatedAt: string | null;
	clientId: string;
	authorUserId?: string | undefined;
}) {
	return mergeFieldLevelCrdt(params);
}
