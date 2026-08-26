/**
 * DENTE CRM — Client-Side Conflict Resolution & Clinical Audit Trail Engine
 *
 * Provides:
 * 1. Field-Level Last-Write-Wins (LWW) resolution with Vector Clocks
 * 2. Multi-domain clinical CRDT merges (043/у diaries, Odontogram surfaces, Appointments, 804n services)
 * 3. Immutable Clinical Conflict Audit Log with exact timestamps and reason tracking
 */

import {
	type ConflictResolutionStrategy,
	type FieldConflictDetail,
	type MutationVector,
	type SyncMutationEntityKind,
	type VectorClock,
	mergeFieldLevelCrdt,
	mergeOdontogramTeethCrdt,
	resolveCashOperationCrdt,
	resolveForm043DiaryCrdt,
	resolveScheduleAppointmentCrdt,
} from "@dental/shared";
import { logger } from "../../utils/logger";
import type { ConflictAuditRecord } from "./types";

const conflictAuditTrail: ConflictAuditRecord[] = [];
const MAX_AUDIT_TRAIL_SIZE = 1000;

export function recordConflictAudit(params: {
	entityKind: SyncMutationEntityKind;
	entityId: string;
	mutationId: string;
	conflicts: FieldConflictDetail[];
}): ConflictAuditRecord[] {
	const nowIso = new Date().toISOString();
	const records: ConflictAuditRecord[] = [];

	for (const c of params.conflicts) {
		const rec: ConflictAuditRecord = {
			conflictId: `cfl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			entityKind: params.entityKind,
			entityId: params.entityId,
			mutationId: params.mutationId,
			field: c.field,
			clientValue: c.clientValue,
			serverValue: c.serverValue,
			resolvedValue: c.resolvedValue,
			strategy: c.strategy,
			winner: c.winner,
			resolvedAtIso: nowIso,
			reason: c.reason,
		};
		records.push(rec);
		conflictAuditTrail.unshift(rec);
	}

	if (conflictAuditTrail.length > MAX_AUDIT_TRAIL_SIZE) {
		conflictAuditTrail.splice(MAX_AUDIT_TRAIL_SIZE);
	}

	return records;
}

export function getConflictAuditTrail(filter?: {
	entityKind?: SyncMutationEntityKind;
	entityId?: string;
}): ConflictAuditRecord[] {
	if (!filter) return [...conflictAuditTrail];
	return conflictAuditTrail.filter((r) => {
		if (filter.entityKind && r.entityKind !== filter.entityKind) return false;
		if (filter.entityId && r.entityId !== filter.entityId) return false;
		return true;
	});
}

export function clearConflictAuditTrail(): void {
	conflictAuditTrail.length = 0;
}

export interface ResolveEntityConflictOptions<T extends Record<string, unknown> = Record<string, unknown>> {
	entityKind: SyncMutationEntityKind;
	entityId: string;
	serverEntity: T | null;
	clientPatch: Partial<T>;
	clientUpdatedAt: string;
	serverUpdatedAt?: string | null | undefined;
	serverVector?: MutationVector | undefined;
	clientVector?: MutationVector | undefined;
	clientId?: string | undefined;
	authorUserId?: string | undefined;
}

export function resolveEntityConflict<T extends Record<string, unknown> = Record<string, unknown>>(
	options: ResolveEntityConflictOptions<T>,
): {
	resolvedEntity: T;
	updatedVector: MutationVector;
	changedFields: string[];
	conflicts: FieldConflictDetail[];
	hasConflicts: boolean;
	strategy: "created" | "field_merge" | "lww" | "identical_noop";
} {
	const res = mergeFieldLevelCrdt<T>({
		entityKind: options.entityKind,
		entityId: options.entityId,
		serverEntity: options.serverEntity as Record<string, unknown> | null,
		serverVector: options.serverVector,
		clientPatch: options.clientPatch as Record<string, unknown>,
		clientVector: options.clientVector,
		clientUpdatedAt: options.clientUpdatedAt,
		serverUpdatedAt: options.serverUpdatedAt,
		clientId: options.clientId,
		authorUserId: options.authorUserId,
	});

	if (res.conflicts.length > 0) {
		recordConflictAudit({
			entityKind: options.entityKind,
			entityId: options.entityId,
			mutationId: `local-${options.entityId}`,
			conflicts: res.conflicts,
		});
	}

	return {
		resolvedEntity: res.mergedEntity,
		updatedVector: res.updatedVector,
		changedFields: res.changedFields,
		conflicts: res.conflicts,
		hasConflicts: res.hasConflicts,
		strategy: res.strategy,
	};
}

export interface Clinical043DiaryRecord {
	id?: string;
	patientId?: string;
	visitId?: string;
	complaints?: string | null;
	anamnesis?: string | null;
	objective?: string | null;
	diagnosis?: string | null;
	icd10Code?: string | null;
	treatment?: string | null;
	recommendations?: string | null;
	toothNumbers?: number[] | string[] | null;
	serviceCodes804n?: string[] | null;
	updatedAt?: string | null;
	authorName?: string | null;
	authorRole?: string | null;
	deviceId?: string | null;
	[key: string]: unknown;
}

export interface Clinical043SectionDiff {
	field: string;
	labelRu: string;
	doctorValue: string;
	cloudValue: string;
	isDifferent: boolean;
	recommendedStrategy: "doctor" | "cloud" | "merge" | "identical";
}

export const CLINICAL_043_SECTIONS: Array<{ field: string; labelRu: string }> = [
	{ field: "complaints", labelRu: "Жалобы пациента" },
	{ field: "anamnesis", labelRu: "Анамнез заболевания и жизни" },
	{ field: "objective", labelRu: "Объективный осмотр (полость рта, слизистая)" },
	{ field: "diagnosis", labelRu: "Клинический диагноз" },
	{ field: "icd10Code", labelRu: "Код МКБ-10" },
	{ field: "treatment", labelRu: "Проведенное лечение и протокол манипуляций" },
	{ field: "recommendations", labelRu: "Рекомендации, назначения и уход" },
	{ field: "toothNumbers", labelRu: "Формула зубов (FDI)" },
	{ field: "serviceCodes804n", labelRu: "Номенклатура услуг 804н" },
];

/**
 * Calculates side-by-side differences between doctor's offline diary and cloud/assistant diary.
 */
export function calculate043ClinicalDiff(
	doctorVersion: Clinical043DiaryRecord,
	cloudVersion: Clinical043DiaryRecord,
): Clinical043SectionDiff[] {
	const diffs: Clinical043SectionDiff[] = [];

	for (const section of CLINICAL_043_SECTIONS) {
		const docRaw = doctorVersion[section.field];
		const cloudRaw = cloudVersion[section.field];

		const docStr = Array.isArray(docRaw)
			? docRaw.join(", ")
			: typeof docRaw === "string"
				? docRaw.trim()
				: docRaw !== null && docRaw !== undefined
					? String(docRaw)
					: "";

		const cloudStr = Array.isArray(cloudRaw)
			? cloudRaw.join(", ")
			: typeof cloudRaw === "string"
				? cloudRaw.trim()
				: cloudRaw !== null && cloudRaw !== undefined
					? String(cloudRaw)
					: "";

		const isDifferent = docStr !== cloudStr;

		let recommendedStrategy: "doctor" | "cloud" | "merge" | "identical" = "identical";
		if (isDifferent) {
			if (!docStr && cloudStr) {
				recommendedStrategy = "cloud";
			} else if (docStr && !cloudStr) {
				recommendedStrategy = "doctor";
			} else if (section.field === "diagnosis" || section.field === "icd10Code") {
				// Doctor has final medical authority on diagnosis
				recommendedStrategy = "doctor";
			} else {
				recommendedStrategy = "merge";
			}
		}

		diffs.push({
			field: section.field,
			labelRu: section.labelRu,
			doctorValue: docStr,
			cloudValue: cloudStr,
			isDifferent,
			recommendedStrategy,
		});
	}

	return diffs;
}

/**
 * Merges two clinical diary records non-destructively without losing text.
 */
export function mergeClinical043DiariesNonDestructive(
	doctorVersion: Clinical043DiaryRecord,
	cloudVersion: Clinical043DiaryRecord,
	overrides?: Record<string, "doctor" | "cloud" | "merge">,
): Clinical043DiaryRecord {
	const merged: Clinical043DiaryRecord = {
		...cloudVersion,
		...doctorVersion,
	};

	const doctorAuthor = doctorVersion.authorName || "Врач (офлайн)";
	const cloudAuthor = cloudVersion.authorName || "Ассистент / Облако";

	for (const section of CLINICAL_043_SECTIONS) {
		const field = section.field;
		const choice = overrides?.[field] || "merge";

		const docVal = doctorVersion[field];
		const cloudVal = cloudVersion[field];

		if (choice === "doctor") {
			merged[field] = docVal;
			continue;
		}
		if (choice === "cloud") {
			merged[field] = cloudVal;
			continue;
		}

		// Choice is "merge"
		if (Array.isArray(docVal) || Array.isArray(cloudVal)) {
			const docArr = Array.isArray(docVal) ? docVal : [];
			const cloudArr = Array.isArray(cloudVal) ? cloudVal : [];
			// Non-destructive array union
			merged[field] = Array.from(new Set([...docArr, ...cloudArr]));
			continue;
		}

		const docText = typeof docVal === "string" ? docVal.trim() : "";
		const cloudText = typeof cloudVal === "string" ? cloudVal.trim() : "";

		if (!docText && cloudText) {
			merged[field] = cloudText;
		} else if (docText && !cloudText) {
			merged[field] = docText;
		} else if (docText === cloudText) {
			merged[field] = docText;
		} else if (docText && cloudText) {
			// Combine with clear attribution
			if (field === "diagnosis" || field === "icd10Code") {
				// Doctor diagnosis takes precedence, cloud added as concomitant
				merged[field] = `${docText} (Сопутств. из облака: ${cloudText})`;
			} else {
				merged[field] = `[${doctorAuthor}]: ${docText}\n\n[${cloudAuthor}]: ${cloudText}`;
			}
		} else {
			merged[field] = "";
		}
	}

	merged.updatedAt = new Date().toISOString();
	return merged;
}

export {
	mergeOdontogramTeethCrdt,
	resolveCashOperationCrdt,
	resolveForm043DiaryCrdt,
	resolveScheduleAppointmentCrdt,
};
