/**
 * apps/web/src/components/visit/dynamicTeethSelector.ts
 *
 * Dynamic Patient Teeth Selector for DENTE Clinical Cockpit & Quick Presets Bar.
 * Eliminates hardcoded teeth presets per Red Team Mandate 8k & 8n (Zero Mocks, Real Patient Teeth).
 *
 * Architecture:
 * 1. Extracts real patient dental formula state from visit store / odontogram records.
 * 2. Filters teeth with active pathologies (caries, pulpitis, treatment, crown, missing, etc.).
 * 3. Formats pathological teeth with clinical Russian status labels & color tokens.
 * 4. Provides structured Quadrant Fallback (Q1: 18–11, Q2: 21–28, Q4: 48–41, Q3: 31–38)
 *    when patient dental formula is intact / physiologically normal.
 * 5. Provides anatomical FDI grouped lists for upper (18..11, 21..28) & lower jaw (48..41, 31..38).
 */

import type { ToothState, VisitToothTreatmentRecord } from "../../store/visitStore";

export const UPPER_JAW_FDI_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
] as const;

export const LOWER_JAW_FDI_TEETH = [
	48, 47, 46, 45, 44, 43, 42, 41,
	31, 32, 33, 34, 35, 36, 37, 38,
] as const;

export const ALL_ADULT_FDI_TEETH = [
	...UPPER_JAW_FDI_TEETH,
	...LOWER_JAW_FDI_TEETH,
] as const;

export type QuadrantId = "Q1" | "Q2" | "Q3" | "Q4";

export interface IntactQuadrant {
	id: QuadrantId;
	label: string;
	shortLabel: string;
	rangeText: string;
	teeth: readonly number[];
}

export const INTACT_QUADRANTS: readonly IntactQuadrant[] = [
	{
		id: "Q1",
		label: "Верхняя правая (Q1)",
		shortLabel: "Q1",
		rangeText: "18–11",
		teeth: [18, 17, 16, 15, 14, 13, 12, 11],
	},
	{
		id: "Q2",
		label: "Верхняя левая (Q2)",
		shortLabel: "Q2",
		rangeText: "21–28",
		teeth: [21, 22, 23, 24, 25, 26, 27, 28],
	},
	{
		id: "Q3",
		label: "Нижняя левая (Q3)",
		shortLabel: "Q3",
		rangeText: "31–38",
		teeth: [31, 32, 33, 34, 35, 36, 37, 38],
	},
	{
		id: "Q4",
		label: "Нижняя правая (Q4)",
		shortLabel: "Q4",
		rangeText: "48–41",
		teeth: [48, 47, 46, 45, 44, 43, 42, 41],
	},
];

export const TOOTH_UI_STATE_LABELS: Record<ToothState, string> = {
	idle: "Интактный",
	watch: "Наблюдение",
	planned: "План",
	done: "Пломба",
	missing: "Отсутствует",
	treatment: "Лечение",
	caries: "Кариес",
	pulpitis: "Пульпит",
	crown: "Коронка",
	Planned_Crown: "План: Коронка",
	planned_crown: "План: Коронка",
};

export type ToothColorVariant =
	| "amber"
	| "rose"
	| "indigo"
	| "emerald"
	| "slate"
	| "sky"
	| "teal"
	| "gold"
	| "default";

export function getToothColorVariant(state: ToothState): ToothColorVariant {
	switch (state) {
		case "caries":
			return "amber";
		case "pulpitis":
			return "rose";
		case "treatment":
			return "indigo";
		case "crown":
			return "gold";
		case "missing":
			return "slate";
		case "done":
			return "emerald";
		case "planned":
		case "watch":
			return "sky";
		case "idle":
		default:
			return "teal";
	}
}

export interface DynamicToothItem {
	tooth: number;
	state: ToothState;
	label: string;
	badgeText: string;
	colorVariant: ToothColorVariant;
	source: "pathology" | "record" | "selected" | "fallback";
}

export interface DynamicTeethResult {
	teeth: DynamicToothItem[];
	isIntact: boolean;
	totalPathologies: number;
}

/**
 * Returns the quadrant identifier for an adult tooth number (11..48).
 */
export function getQuadrantForTooth(tooth: number | null | undefined): QuadrantId {
	if (!tooth || typeof tooth !== "number") return "Q1";
	if (tooth >= 11 && tooth <= 18) return "Q1";
	if (tooth >= 21 && tooth <= 28) return "Q2";
	if (tooth >= 31 && tooth <= 38) return "Q3";
	if (tooth >= 41 && tooth <= 48) return "Q4";
	return "Q1";
}

/**
 * Checks whether a given ToothState represents an active pathology / condition.
 */
export function isPathologicalToothState(state: string | null | undefined): state is ToothState {
	if (!state) return false;
	const s = state.trim().toLowerCase();
	return (
		s !== "idle" &&
		s !== "healthy" &&
		s !== "0" &&
		s !== ""
	);
}

/**
 * Normalizes raw tooth state string into a known VisitToothUiState.
 */
export function normalizeToothUiState(state: string | null | undefined): ToothState {
	if (!state) return "idle";
	const s = state.trim().toLowerCase();
	if (s === "caries") return "caries";
	if (s === "pulpitis") return "pulpitis";
	if (s.includes("pulp")) return "pulpitis";
	if (s.includes("periodontitis") || s.includes("perio") || s.includes("treatment")) return "treatment";
	if (s.includes("crown") || s.includes("bridge") || s.includes("inlay") || s.includes("veneer")) return "crown";
	if (s.includes("missing") || s.includes("extract")) return "missing";
	if (s.includes("done") || s.includes("fill")) return "done";
	if (s.includes("planned")) return "planned";
	if (s.includes("watch")) return "watch";
	return "idle";
}

/**
 * Extracts and formats patient teeth dynamically based on real store state.
 */
export function getDynamicPatientTeeth(params: {
	toothStates?: Record<string, ToothState | string> | null;
	toothRecords?: Record<string, VisitToothTreatmentRecord> | null;
	activeTooth?: number | null;
	maxItems?: number;
}): DynamicTeethResult {
	const { toothStates, toothRecords, activeTooth, maxItems = 12 } = params;

	const seenTeeth = new Map<number, DynamicToothItem>();

	// 1. Scan toothStates for real pathologies
	if (toothStates) {
		for (const [codeStr, rawState] of Object.entries(toothStates)) {
			if (!rawState) continue;
			const toothNum = Number.parseInt(codeStr, 10);
			if (!Number.isFinite(toothNum) || toothNum < 11 || toothNum > 48) continue;

			if (isPathologicalToothState(rawState)) {
				const normState = normalizeToothUiState(rawState);
				const label = TOOTH_UI_STATE_LABELS[normState] || "Патология";
				seenTeeth.set(toothNum, {
					tooth: toothNum,
					state: normState,
					label,
					badgeText: `${toothNum} ${label}`,
					colorVariant: getToothColorVariant(normState),
					source: "pathology",
				});
			}
		}
	}

	// 2. Scan toothRecords for treatment history / clinical records
	if (toothRecords) {
		for (const [codeStr, record] of Object.entries(toothRecords)) {
			if (!record) continue;
			const toothNum = record.toothNumber ?? Number.parseInt(codeStr, 10);
			if (!Number.isFinite(toothNum) || toothNum < 11 || toothNum > 48) continue;

			const existing = seenTeeth.get(toothNum);
			const normState = record.state
				? normalizeToothUiState(record.state)
				: existing?.state || "treatment";

			let label = existing?.label;
			if (record.diagnosis) {
				label = record.diagnosis.length > 15 ? record.diagnosis.slice(0, 15) + "…" : record.diagnosis;
			} else if (!label) {
				label = TOOTH_UI_STATE_LABELS[normState] || "Лечение";
			}

			seenTeeth.set(toothNum, {
				tooth: toothNum,
				state: normState,
				label: label || "Лечение",
				badgeText: `${toothNum} ${label || "Лечение"}`,
				colorVariant: getToothColorVariant(normState),
				source: "record",
			});
		}
	}

	const totalPathologies = seenTeeth.size;
	const isIntact = totalPathologies === 0;

	// Sort pathological teeth in anatomical FDI sequence
	const sortedItems: DynamicToothItem[] = Array.from(seenTeeth.values()).sort((a, b) => {
		// Put activeTooth first if it's among the items
		if (activeTooth && a.tooth === activeTooth) return -1;
		if (activeTooth && b.tooth === activeTooth) return 1;
		return a.tooth - b.tooth;
	});

	// If activeTooth is passed, and not among the items, optionally include it if requested
	if (activeTooth && Number.isFinite(activeTooth) && activeTooth >= 11 && activeTooth <= 48 && !seenTeeth.has(activeTooth)) {
		// We only prepend active tooth if there are other items, to allow quick return
		if (sortedItems.length > 0) {
			sortedItems.unshift({
				tooth: activeTooth,
				state: "idle",
				label: "Выбран",
				badgeText: `${activeTooth} Выбран`,
				colorVariant: "teal",
				source: "selected",
			});
		}
	}

	return {
		teeth: sortedItems.slice(0, maxItems),
		isIntact,
		totalPathologies,
	};
}
