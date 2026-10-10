import { isSomaticSafetyFieldOrRisk } from "../crdt.js";
import { incrementVectorClock, mergeVectorClocks } from "../mesh.js";
import type { FieldConflictDetail } from "../types.js";
import {
	getAnesthesiaRiskRank,
	mergeClinicalDiaryChronological,
	mergeOdontogramListPerSurface,
	mergeOdontogramToothPerSurface,
	unionMergeSomaticAllergies,
} from "./crdt.js";
import { compareEntityVectors } from "./ordering.js";
import type {
	OdontogramToothCrdtState,
	SplitBrainReconciliationInput,
	SplitBrainReconciliationResult,
} from "./types.js";

export function reconcileSplitBrainEntity<T extends Record<string, unknown> = Record<string, unknown>>(
	input: SplitBrainReconciliationInput,
): SplitBrainReconciliationResult<T> {
	const {
		entityKind,
		entityId,
		localState,
		remoteState,
		localVector = {},
		remoteVector = {},
		localUpdatedAtMs = 0,
		remoteUpdatedAtMs = 0,
		localNodeId = "local-node",
		remoteNodeId = "remote-node",
		reconcilingNodeId = localNodeId,
		localDoctorName,
		remoteDoctorName,
		localDoctorSignature,
		remoteDoctorSignature,
	} = input;

	if (!localState && !remoteState) {
		return {
			entityKind,
			entityId,
			mergedState: {} as T,
			mergedVectorClock: incrementVectorClock(remoteVector, reconcilingNodeId),
			changedFields: [],
			conflictDetails: [],
			hasDivergence: false,
			resolutionStrategy: "identical_noop",
			somaticAlertsPreserved: true,
			surfacesMergedCount: 0,
			diaryNotesAppendedCount: 0,
		};
	}

	if (!localState && remoteState) {
		const newClock = incrementVectorClock(remoteVector, reconcilingNodeId);
		return {
			entityKind,
			entityId,
			mergedState: { ...remoteState } as T,
			mergedVectorClock: newClock,
			changedFields: Object.keys(remoteState),
			conflictDetails: [],
			hasDivergence: false,
			resolutionStrategy: "remote_win",
			somaticAlertsPreserved: true,
			surfacesMergedCount: 0,
			diaryNotesAppendedCount: 0,
		};
	}

	if (localState && !remoteState) {
		const newClock = incrementVectorClock(localVector, reconcilingNodeId);
		return {
			entityKind,
			entityId,
			mergedState: { ...localState } as T,
			mergedVectorClock: newClock,
			changedFields: [],
			conflictDetails: [],
			hasDivergence: false,
			resolutionStrategy: "local_win",
			somaticAlertsPreserved: true,
			surfacesMergedCount: 0,
			diaryNotesAppendedCount: 0,
		};
	}

	const causality = compareEntityVectors(localVector, remoteVector);
	const mergedClock = incrementVectorClock(
		mergeVectorClocks(localVector, remoteVector),
		reconcilingNodeId,
	);

	const safeLocal = localState as Record<string, unknown>;
	const safeRemote = remoteState as Record<string, unknown>;

	if (JSON.stringify(safeLocal) === JSON.stringify(safeRemote)) {
		return {
			entityKind,
			entityId,
			mergedState: { ...safeLocal } as T,
			mergedVectorClock: mergedClock,
			changedFields: [],
			conflictDetails: [],
			hasDivergence: false,
			resolutionStrategy: "identical_noop",
			somaticAlertsPreserved: true,
			surfacesMergedCount: 0,
			diaryNotesAppendedCount: 0,
		};
	}

	const merged: Record<string, unknown> = { ...safeLocal };
	const changedFields: string[] = [];
	const conflicts: FieldConflictDetail[] = [];
	let surfacesMergedTotal = 0;
	let diaryAppendedTotal = 0;
	let somaticPreserved = true;

	const allKeys = new Set([...Object.keys(safeLocal), ...Object.keys(safeRemote)]);

	for (const field of allKeys) {
		if (field === "id" || field === "organizationId" || field === "organization_id") {
			continue;
		}

		const localVal = safeLocal[field];
		const remoteVal = safeRemote[field];

		if (localVal === undefined && remoteVal !== undefined) {
			merged[field] = remoteVal;
			changedFields.push(field);
			continue;
		}
		if (remoteVal === undefined && localVal !== undefined) {
			merged[field] = localVal;
			continue;
		}

		if (JSON.stringify(localVal) === JSON.stringify(remoteVal)) {
			continue;
		}

		if (isSomaticSafetyFieldOrRisk(field)) {
			if (field === "anesthesiaRisk" || field === "anesthesia_risk") {
				const localRank = getAnesthesiaRiskRank(localVal);
				const remoteRank = getAnesthesiaRiskRank(remoteVal);
				const higherVal = remoteRank > localRank ? remoteVal : localVal;
				merged[field] = higherVal;
				changedFields.push(field);
				conflicts.push({
					field,
					clientValue: remoteVal,
					serverValue: localVal,
					resolvedValue: higherVal,
					strategy: "somatic_safety_union",
					winner: remoteRank > localRank ? "client" : "server",
					reason: `Anesthesia risk level elevated to highest clinical priority (${String(higherVal)})`,
				});
			} else {
				const { merged: mergedAllergies } = unionMergeSomaticAllergies(localVal, remoteVal);
				merged[field] = mergedAllergies;
				changedFields.push(field);
				conflicts.push({
					field,
					clientValue: remoteVal,
					serverValue: localVal,
					resolvedValue: mergedAllergies,
					strategy: "somatic_safety_union",
					winner: "merged",
					reason: "Union-merged somatic allergies and alerts: zero life-critical data loss guaranteed",
				});
			}
			somaticPreserved = true;
			continue;
		}

		if (
			field === "odontogram" ||
			field === "odontogramTeeth" ||
			field === "teeth" ||
			field === "surfaces" ||
			field === "surfaceStates" ||
			(typeof localVal === "object" &&
				localVal !== null &&
				typeof remoteVal === "object" &&
				remoteVal !== null &&
				("surfaces" in localVal || "surfaces" in remoteVal || "surfaceStates" in localVal || "surfaceStates" in remoteVal))
		) {
			if (field === "surfaces" || field === "surfaceStates") {
				const toothMerged = mergeOdontogramToothPerSurface(
					{ surfaces: localVal as any, toothNumber: (safeLocal.toothNumber as number) ?? 0, statusCode: (safeLocal.condition as string) ?? "treated" },
					{ surfaces: remoteVal as any, toothNumber: (safeRemote.toothNumber as number) ?? 0, statusCode: (safeRemote.condition as string) ?? "treated" },
					localUpdatedAtMs,
					remoteUpdatedAtMs,
				);
				merged[field] = toothMerged.surfaces;
				changedFields.push(field);
				surfacesMergedTotal += toothMerged.surfacesMergedCount;
				conflicts.push({
					field,
					clientValue: remoteVal,
					serverValue: localVal,
					resolvedValue: toothMerged.surfaces,
					strategy: "crdt",
					winner: "merged",
					reason: `Per-surface Last-Write-Wins CRDT reconciliation merged ${toothMerged.surfacesMergedCount} surfaces without dropping independent treatments`,
				});
				continue;
			}

			if (Array.isArray(localVal) || Array.isArray(remoteVal)) {
				const localTeeth = (Array.isArray(localVal) ? localVal : []) as OdontogramToothCrdtState[];
				const remoteTeeth = (Array.isArray(remoteVal) ? remoteVal : []) as OdontogramToothCrdtState[];

				const { mergedTeeth, totalSurfacesMerged } = mergeOdontogramListPerSurface(
					localTeeth,
					remoteTeeth,
					localUpdatedAtMs,
					remoteUpdatedAtMs,
				);

				merged[field] = mergedTeeth;
				changedFields.push(field);
				surfacesMergedTotal += totalSurfacesMerged;

				conflicts.push({
					field,
					clientValue: remoteVal,
					serverValue: localVal,
					resolvedValue: mergedTeeth,
					strategy: "crdt",
					winner: "merged",
					reason: `Per-surface Last-Write-Wins CRDT reconciliation merged ${totalSurfacesMerged} surfaces without dropping independent treatments`,
				});
				continue;
			}

			const toothMerged = mergeOdontogramToothPerSurface(
				localVal as any,
				remoteVal as any,
				localUpdatedAtMs,
				remoteUpdatedAtMs,
			);
			merged[field] = toothMerged.mergedTooth;
			changedFields.push(field);
			surfacesMergedTotal += toothMerged.surfacesMergedCount;
			conflicts.push({
				field,
				clientValue: remoteVal,
				serverValue: localVal,
				resolvedValue: toothMerged.mergedTooth,
				strategy: "crdt",
				winner: "merged",
				reason: `Per-surface Last-Write-Wins CRDT reconciliation for tooth ${field} merged ${toothMerged.surfacesMergedCount} surfaces`,
			});
			continue;
		}

		if (
			field === "diaryNotes" ||
			field === "diary_notes" ||
			field === "diaryEntries" ||
			field === "clinicalNotes" ||
			field === "doctorNotes" ||
			(entityKind === "visit_diary" && (field === "notes" || field === "diary" || field === "objective"))
		) {
			const { mergedEntries, mergedString, appendedCount } = mergeClinicalDiaryChronological(
				localVal,
				remoteVal,
				{
					doctorName: localDoctorName,
					signature: localDoctorSignature,
					timestampMs: localUpdatedAtMs,
				},
				{
					doctorName: remoteDoctorName,
					signature: remoteDoctorSignature,
					timestampMs: remoteUpdatedAtMs,
				},
			);

			merged[field] = typeof localVal === "string" || typeof remoteVal === "string" ? mergedString : mergedEntries;
			changedFields.push(field);
			diaryAppendedTotal += appendedCount;

			conflicts.push({
				field,
				clientValue: remoteVal,
				serverValue: localVal,
				resolvedValue: merged[field],
				strategy: "field_merge",
				winner: "merged",
				reason: `Chronological append with doctor signatures preserved ${mergedEntries.length} clinical diary notes`,
			});
			continue;
		}

		if (remoteUpdatedAtMs > localUpdatedAtMs) {
			merged[field] = remoteVal;
			changedFields.push(field);
			conflicts.push({
				field,
				clientValue: remoteVal,
				serverValue: localVal,
				resolvedValue: remoteVal,
				strategy: "lww",
				winner: "client",
				reason: `Remote edit timestamp (${remoteUpdatedAtMs}ms) is strictly newer than local (${localUpdatedAtMs}ms)`,
			});
		} else if (localUpdatedAtMs > remoteUpdatedAtMs) {
			merged[field] = localVal;
			conflicts.push({
				field,
				clientValue: remoteVal,
				serverValue: localVal,
				resolvedValue: localVal,
				strategy: "lww",
				winner: "server",
				reason: `Local edit timestamp (${localUpdatedAtMs}ms) is strictly newer than remote (${remoteUpdatedAtMs}ms)`,
			});
		} else {
			const remoteStr = JSON.stringify(remoteVal);
			const localStr = JSON.stringify(localVal);
			const remoteWins = remoteStr.localeCompare(localStr) >= 0;

			merged[field] = remoteWins ? remoteVal : localVal;
			if (remoteWins) changedFields.push(field);

			conflicts.push({
				field,
				clientValue: remoteVal,
				serverValue: localVal,
				resolvedValue: merged[field],
				strategy: "crdt",
				winner: remoteWins ? "client" : "server",
				reason: "Deterministic tie-break on identical millisecond timestamps",
			});
		}
	}

	return {
		entityKind,
		entityId,
		mergedState: merged as T,
		mergedVectorClock: mergedClock,
		changedFields,
		conflictDetails: conflicts,
		hasDivergence: causality === "divergent_split_brain" || conflicts.length > 0,
		resolutionStrategy: "split_brain_crdt_merged",
		somaticAlertsPreserved: somaticPreserved,
		surfacesMergedCount: surfacesMergedTotal,
		diaryNotesAppendedCount: diaryAppendedTotal,
	};
}
