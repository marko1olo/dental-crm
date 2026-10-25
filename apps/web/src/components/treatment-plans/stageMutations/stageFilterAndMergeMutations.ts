import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanStageKind } from "../types.js";
import { computeStageItemsTotalKopecks } from "./common.js";

const KIND_MAP: Record<string, string> = {
	therapy: "stage_1_therapy", surgery: "stage_2_surgery", orthopedics: "stage_3_orthopedics",
	orthodontics: "stage_4_orthodontics", periodontics: "stage_5_periodontics",
};

export function filterStagesBySpecialty(
	stages: readonly TreatmentPlanStage[],
	specialty: TreatmentPlanStageKind | "all" | "therapy" | "surgery" | "orthopedics" | "orthodontics" | "periodontics",
): TreatmentPlanStage[] {
	if (specialty === "all") return [...stages];
	const targetKind = KIND_MAP[specialty] || specialty;
	return stages.filter((s) => s.stageKind === targetKind || s.stageKind === specialty);
}

export function filterStagesBySearch(stages: readonly TreatmentPlanStage[], query: string): TreatmentPlanStage[] {
	const clean = query.trim().toLowerCase();
	if (!clean) return [...stages];
	return stages
		.map((s) => {
			if (s.title.toLowerCase().includes(clean)) return s;
			const matching = s.items.filter((i) =>
				i.name.toLowerCase().includes(clean) || i.code804n.toLowerCase().includes(clean) ||
				(i.toothNumber !== undefined && i.toothNumber.toString().includes(clean)));
			return matching.length > 0 ? { ...s, items: matching } : null;
		})
		.filter((s): s is TreatmentPlanStage => s !== null);
}

export function updateStageStatusInList(
	stages: readonly TreatmentPlanStage[],
	stageNumber: number,
	status: TreatmentPlanStage["status"],
): TreatmentPlanStage[] {
	return stages.map((s) => (s.stageNumber === stageNumber ? { ...s, status } : s));
}

export function deleteStageFromList(
	stages: readonly TreatmentPlanStage[],
	stageNumber: number,
): TreatmentPlanStage[] {
	const filtered = stages.filter((s) => s.stageNumber !== stageNumber);
	return filtered.map((s, idx) => ({ ...s, stageNumber: idx + 1 }));
}

export function appendStageToList(
	stages: readonly TreatmentPlanStage[],
	newStage: TreatmentPlanStage,
): TreatmentPlanStage[] {
	const maxNum = stages.reduce((acc, s) => Math.max(acc, s.stageNumber), 0);
	const stageNumber = newStage.stageNumber || maxNum + 1;
	const sanitizedStage = { ...newStage, stageNumber };
	return [...stages, sanitizedStage].sort((a, b) => a.stageNumber - b.stageNumber);
}

export function appendItemToExistingStage(
	currentStages: readonly TreatmentPlanStage[],
	newItem: TreatmentPlanItem,
): TreatmentPlanStage[] {
	return currentStages.map((st) => {
		if (st.stageKind === newItem.stageKind || (newItem.phase && st.stageNumber === newItem.phase)) {
			if (st.items.some((it) => it.id === newItem.id)) return st;
			const updatedItems = [...st.items, newItem];
			const totalKopecks = computeStageItemsTotalKopecks(updatedItems);
			const existingCodes = st.serviceCatalogCodes || st.order804nCodes || [];
			const nextCodes = Array.from(new Set([...existingCodes, newItem.code804n]));
			return {
				...st,
				items: updatedItems,
				totalRub: totalKopecks / 100,
				totalKopecks,
				serviceCatalogCodes: nextCodes,
				order804nCodes: nextCodes,
			};
		}
		return st;
	});
}

export const mergeIncomingPlanItem = appendItemToExistingStage;

export function mergePersistedPlanItems(
	currentStages: readonly TreatmentPlanStage[],
	persistedItems: readonly TreatmentPlanItem[],
): { updatedStages: TreatmentPlanStage[]; changed: boolean } {
	let changed = false;
	const updatedStages = currentStages.map((st) => {
		const matching = persistedItems.filter(
			(it) => it.stageKind === st.stageKind || (it.phase && st.stageNumber === it.phase),
		);
		if (matching.length === 0) return st;
		const newUnique = matching.filter((m) => !st.items.some((it) => it.id === m.id));
		if (newUnique.length === 0) return st;
		changed = true;
		const updatedItems = [...st.items, ...newUnique];
		const totalKopecks = computeStageItemsTotalKopecks(updatedItems);
		const existingCodes = st.serviceCatalogCodes || st.order804nCodes || [];
		const nextCodes = Array.from(new Set([...existingCodes, ...newUnique.map((it) => it.code804n)]));
		return {
			...st,
			items: updatedItems,
			totalRub: totalKopecks / 100,
			totalKopecks,
			serviceCatalogCodes: nextCodes,
			order804nCodes: nextCodes,
		};
	});
	return { updatedStages, changed };
}
