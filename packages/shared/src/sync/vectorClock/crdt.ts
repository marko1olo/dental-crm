import { ANESTHESIA_RISK_RANK } from "../crdt.js";
import type {
	ClinicalDiaryEntry,
	OdontogramToothCrdtState,
	PerSurfaceState,
} from "./types.js";

export function unionMergeSomaticAllergies(
	localAllergies: unknown,
	remoteAllergies: unknown,
): { merged: string[] | string; isArray: boolean; addedCount: number } {
	const extractItems = (val: unknown): string[] => {
		if (Array.isArray(val)) {
			return val
				.map((x) => (typeof x === "string" ? x.trim() : String(x).trim()))
				.filter(Boolean);
		}
		if (typeof val === "string") {
			return val
				.split(/[;,]/)
				.map((x) => x.trim())
				.filter(Boolean);
		}
		return [];
	};

	const localItems = extractItems(localAllergies);
	const remoteItems = extractItems(remoteAllergies);

	const union: string[] = [];
	const seen = new Set<string>();

	for (const item of [...localItems, ...remoteItems]) {
		const lower = item.toLowerCase();
		if (!seen.has(lower)) {
			seen.add(lower);
			union.push(item);
		}
	}

	const isArray = Array.isArray(localAllergies) || Array.isArray(remoteAllergies);
	const addedCount = union.length - localItems.length;

	return {
		merged: isArray ? union : union.join("; "),
		isArray,
		addedCount: Math.max(0, addedCount),
	};
}

function normalizeToothSurfaces(
	tooth: OdontogramToothCrdtState,
	fallbackMs: number,
	defaultDoctorId?: string,
): Map<string, PerSurfaceState> {
	const map = new Map<string, PerSurfaceState>();

	if (tooth.surfaceStates && typeof tooth.surfaceStates === "object") {
		for (const [surf, state] of Object.entries(tooth.surfaceStates)) {
			if (!surf || !state) continue;
			const safeSurf = surf.toUpperCase().trim();
			const rec = state as Record<string, unknown>;
			map.set(safeSurf, {
				...rec,
				surface: safeSurf,
				status: (rec.status as string) || tooth.statusCode || "treated",
				updatedAtMs: (rec.updatedAtMs as number) ?? tooth.updatedAtMs ?? fallbackMs,
				doctorId: (rec.doctorId as string) ?? defaultDoctorId,
				doctorName: rec.doctorName as string | undefined,
			});
		}
		return map;
	}

	if (tooth.surfaces && typeof tooth.surfaces === "object" && !Array.isArray(tooth.surfaces)) {
		for (const [surf, state] of Object.entries(tooth.surfaces as Record<string, unknown>)) {
			if (!surf || !state) continue;
			const safeSurf = surf.toUpperCase().trim();
			const rec = (typeof state === "object" && state !== null ? state : { status: String(state) }) as Record<string, unknown>;
			map.set(safeSurf, {
				...rec,
				surface: safeSurf,
				status: (rec.status as string) || tooth.statusCode || "treated",
				updatedAtMs: (rec.updatedAtMs as number) ?? tooth.updatedAtMs ?? fallbackMs,
				doctorId: (rec.doctorId as string) ?? defaultDoctorId,
				doctorName: rec.doctorName as string | undefined,
			});
		}
		return map;
	}

	if (Array.isArray(tooth.surfaces)) {
		for (const item of tooth.surfaces) {
			if (typeof item === "string" && item.trim()) {
				const safeSurf = item.toUpperCase().trim();
				map.set(safeSurf, {
					surface: safeSurf,
					status: tooth.statusCode || "treated",
					updatedAtMs: tooth.updatedAtMs ?? fallbackMs,
					doctorId: defaultDoctorId,
				});
			}
		}
	}

	return map;
}

export function toothHasRecordSurfaces(tooth: OdontogramToothCrdtState): boolean {
	return Boolean(
		(tooth.surfaces && typeof tooth.surfaces === "object" && !Array.isArray(tooth.surfaces)) ||
		tooth.surfaceStates,
	);
}

export function mergeOdontogramToothPerSurface(
	localTooth: OdontogramToothCrdtState,
	remoteTooth: OdontogramToothCrdtState,
	localDefaultMs = 0,
	remoteDefaultMs = 0,
): {
	mergedTooth: OdontogramToothCrdtState;
	surfacesMergedCount: number;
	surfaces: Record<string, PerSurfaceState>;
} {
	const localSurfaceMap = normalizeToothSurfaces(localTooth, localDefaultMs);
	const remoteSurfaceMap = normalizeToothSurfaces(remoteTooth, remoteDefaultMs);

	const allSurfaces = new Set([...localSurfaceMap.keys(), ...remoteSurfaceMap.keys()]);
	const mergedSurfaceMap = new Map<string, PerSurfaceState>();

	for (const surf of allSurfaces) {
		const localState = localSurfaceMap.get(surf);
		const remoteState = remoteSurfaceMap.get(surf);

		if (localState && !remoteState) {
			mergedSurfaceMap.set(surf, { ...localState });
		} else if (!localState && remoteState) {
			mergedSurfaceMap.set(surf, { ...remoteState });
		} else if (localState && remoteState) {
			if (remoteState.updatedAtMs > localState.updatedAtMs) {
				mergedSurfaceMap.set(surf, { ...remoteState });
			} else if (localState.updatedAtMs > remoteState.updatedAtMs) {
				mergedSurfaceMap.set(surf, { ...localState });
			} else {
				const remoteWins = (remoteState.status || "").localeCompare(localState.status || "") >= 0;
				mergedSurfaceMap.set(surf, remoteWins ? { ...remoteState } : { ...localState });
			}
		}
	}

	const localTime = localTooth.updatedAtMs ?? localDefaultMs;
	const remoteTime = remoteTooth.updatedAtMs ?? remoteDefaultMs;
	const latestTooth = remoteTime >= localTime ? remoteTooth : localTooth;
	const olderTooth = remoteTime >= localTime ? localTooth : remoteTooth;

	const surfaceStatesRecord: Record<string, PerSurfaceState> = {};
	const surfaceNames: string[] = [];

	for (const [surf, state] of mergedSurfaceMap.entries()) {
		surfaceStatesRecord[surf] = state;
		surfaceNames.push(surf);
	}
	surfaceNames.sort();

	const isRecordSurfaces = toothHasRecordSurfaces(localTooth) || toothHasRecordSurfaces(remoteTooth);

	const mergedTooth: OdontogramToothCrdtState = {
		...olderTooth,
		...latestTooth,
		toothNumber: localTooth.toothNumber ?? remoteTooth.toothNumber,
		statusCode: latestTooth.statusCode || olderTooth.statusCode || "healthy",
		surfaces: isRecordSurfaces ? surfaceStatesRecord : surfaceNames,
		surfaceStates: surfaceStatesRecord,
		mobility: latestTooth.mobility ?? olderTooth.mobility,
		notes: latestTooth.notes || olderTooth.notes,
		updatedAtMs: Math.max(localTime, remoteTime),
		updatedAt: new Date(Math.max(localTime, remoteTime)).toISOString(),
	};

	return {
		mergedTooth,
		surfacesMergedCount: surfaceNames.length,
		surfaces: surfaceStatesRecord,
	};
}

export function mergeOdontogramListPerSurface(
	localTeeth: OdontogramToothCrdtState[] = [],
	remoteTeeth: OdontogramToothCrdtState[] = [],
	localDefaultMs = Date.now(),
	remoteDefaultMs = Date.now(),
): { mergedTeeth: OdontogramToothCrdtState[]; totalSurfacesMerged: number } {
	const toothMap = new Map<number, OdontogramToothCrdtState>();
	let totalSurfacesMerged = 0;

	for (const tooth of localTeeth) {
		if (typeof tooth?.toothNumber === "number") {
			toothMap.set(tooth.toothNumber, { ...tooth });
		}
	}

	for (const remoteTooth of remoteTeeth) {
		if (typeof remoteTooth?.toothNumber !== "number") continue;
		const localTooth = toothMap.get(remoteTooth.toothNumber);
		if (!localTooth) {
			toothMap.set(remoteTooth.toothNumber, { ...remoteTooth });
			totalSurfacesMerged += Array.isArray(remoteTooth.surfaces) ? remoteTooth.surfaces.length : 0;
		} else {
			const { mergedTooth, surfacesMergedCount } = mergeOdontogramToothPerSurface(
				localTooth,
				remoteTooth,
				localDefaultMs,
				remoteDefaultMs,
			);
			toothMap.set(remoteTooth.toothNumber, mergedTooth);
			totalSurfacesMerged += surfacesMergedCount;
		}
	}

	const sorted = Array.from(toothMap.values()).sort((a, b) => a.toothNumber - b.toothNumber);
	return {
		mergedTeeth: sorted,
		totalSurfacesMerged,
	};
}

function extractDiaryEntries(
	diaryVal: unknown,
	defaultDoctorName: string,
	defaultDoctorId?: string | undefined,
	defaultSignature?: string | undefined,
	defaultTimestampMs = Date.now(),
): ClinicalDiaryEntry[] {
	if (!diaryVal) return [];

	const results: ClinicalDiaryEntry[] = [];

	if (Array.isArray(diaryVal)) {
		for (const item of diaryVal) {
			if (typeof item === "object" && item !== null) {
				const rec = item as Record<string, unknown>;
				const tsMs =
					typeof rec.timestampMs === "number"
						? rec.timestampMs
						: typeof rec.timestamp === "number"
							? rec.timestamp
							: typeof rec.timestampIso === "string"
								? new Date(rec.timestampIso).getTime() || defaultTimestampMs
								: defaultTimestampMs;
				const note =
					(rec.note as string) ||
					(rec.text as string) ||
					(rec.content as string) ||
					"";
				if (note.trim()) {
					const entryId = (rec.id as string) || (rec.entryId as string) || undefined;
					const docName = (rec.doctorName as string) || (rec.authorName as string) || defaultDoctorName;
					const sig = (rec.doctorSignature as string) || (rec.signature as string) || defaultSignature;
					const entry: ClinicalDiaryEntry = {
						id: entryId,
						entryId,
						timestampMs: tsMs,
						timestampIso:
							(rec.timestampIso as string) || new Date(tsMs).toISOString(),
						doctorName: docName,
						authorName: docName,
						doctorId: (rec.doctorId as string) || defaultDoctorId,
						note: note.trim(),
						text: note.trim(),
						signature: sig,
						doctorSignature: sig,
						category: (rec.category as string) || undefined,
					};
					results.push(entry);
				}
			} else if (typeof item === "string" && item.trim()) {
				const entry: ClinicalDiaryEntry = {
					timestampMs: defaultTimestampMs,
					timestampIso: new Date(defaultTimestampMs).toISOString(),
					doctorName: defaultDoctorName,
					authorName: defaultDoctorName,
					doctorId: defaultDoctorId,
					note: item.trim(),
					text: item.trim(),
					signature: defaultSignature,
					doctorSignature: defaultSignature,
				};
				results.push(entry);
			}
		}
		return results;
	}

	if (typeof diaryVal === "string" && diaryVal.trim()) {
		return [
			{
				timestampMs: defaultTimestampMs,
				timestampIso: new Date(defaultTimestampMs).toISOString(),
				doctorName: defaultDoctorName,
				doctorId: defaultDoctorId,
				note: diaryVal.trim(),
				signature: defaultSignature,
			},
		];
	}

	return [];
}

export function mergeClinicalDiaryChronological(
	localVal: unknown,
	remoteVal: unknown,
	localContext: {
		doctorName?: string | undefined;
		doctorId?: string | undefined;
		signature?: string | undefined;
		timestampMs?: number | undefined;
	} = {},
	remoteContext: {
		doctorName?: string | undefined;
		doctorId?: string | undefined;
		signature?: string | undefined;
		timestampMs?: number | undefined;
	} = {},
): {
	mergedEntries: ClinicalDiaryEntry[];
	mergedString: string;
	appendedCount: number;
} {
	const localEntries = extractDiaryEntries(
		localVal,
		localContext.doctorName || "Врач-стоматолог (Локально)",
		localContext.doctorId,
		localContext.signature,
		localContext.timestampMs || Date.now(),
	);

	const remoteEntries = extractDiaryEntries(
		remoteVal,
		remoteContext.doctorName || "Врач-стоматолог (Удаленно)",
		remoteContext.doctorId,
		remoteContext.signature,
		remoteContext.timestampMs || Date.now(),
	);

	const combined: ClinicalDiaryEntry[] = [];
	const seen = new Set<string>();

	for (const entry of [...localEntries, ...remoteEntries]) {
		const key = `${entry.timestampIso}|${entry.doctorName}|${entry.signature || ""}|${entry.note.trim()}`;
		if (!seen.has(key)) {
			seen.add(key);
			combined.push(entry);
		}
	}

	combined.sort((a, b) => a.timestampMs - b.timestampMs);

	const formattedStrings = combined.map((entry) => {
		const sigBadge = entry.signature ? ` [ЭЦП: ${entry.signature}]` : "";
		const doc = entry.doctorName ? `Врач: ${entry.doctorName}` : "Врач";
		return `[${entry.timestampIso}] ${doc}${sigBadge}:\n${entry.note}`;
	});

	const appendedCount = combined.length - localEntries.length;

	return {
		mergedEntries: combined,
		mergedString: formattedStrings.join("\n\n---\n\n"),
		appendedCount: Math.max(0, appendedCount),
	};
}

export const EXTENDED_ANESTHESIA_RISK_RANK: Record<string, number> = {
	normal: 1,
	норма: 1,
	low: 2,
	низкий: 2,
	"asa i": 1,
	"asa 1": 1,
	"asa ii": 2,
	"asa 2": 2,
	moderate: 3,
	умеренный: 3,
	средний: 3,
	"asa iii": 3,
	"asa 3": 3,
	high: 4,
	высокий: 4,
	"asa iv": 4,
	"asa 4": 4,
	critical: 5,
	критический: 5,
	"asa v": 5,
	"asa 5": 5,
	"asa vi": 6,
	"asa 6": 6,
};

export function getAnesthesiaRiskRank(val: unknown): number {
	if (typeof val !== "string") return 0;
	const normalized = val.toLowerCase().trim();
	if (normalized in EXTENDED_ANESTHESIA_RISK_RANK) {
		return EXTENDED_ANESTHESIA_RISK_RANK[normalized]!;
	}
	const match = normalized.match(/asa\s*([0-9ivx]+)/i);
	if (match && match[1]) {
		const token = match[1].toLowerCase();
		if (token === "1" || token === "i") return 1;
		if (token === "2" || token === "ii") return 2;
		if (token === "3" || token === "iii") return 3;
		if (token === "4" || token === "iv") return 4;
		if (token === "5" || token === "v") return 5;
		if (token === "6" || token === "vi") return 6;
	}
	return ANESTHESIA_RISK_RANK[normalized] ?? 0;
}
