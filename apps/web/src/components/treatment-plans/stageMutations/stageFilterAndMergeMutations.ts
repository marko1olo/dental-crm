import type { TreatmentPlanItem, TreatmentPlanStage } from "../types.js";
import { computeStageItemsTotalKopecks } from "./common.js";

export function filterStagesBySpecialty(
	stages: readonly TreatmentPlanStage[],
	specialtyFilter: "all" | "therapy" | "surgery" | "orthopedics" | "orthodontics" | "periodontics",
): readonly TreatmentPlanStage[] {
	if (specialtyFilter === "all") return stages;
	return stages.filter((s) => {
		if (specialtyFilter === "therapy") {
			return (
				s.stageKind === "stage_1_therapy" ||
				s.items.some((i) => {
					const c = (i.category || "").toLowerCase();
					return c.includes("терап") || c.includes("кариес") || c.includes("эндо");
				})
			);
		}
		if (specialtyFilter === "surgery") {
			return (
				s.stageKind === "stage_2_surgery" ||
				s.items.some((i) => {
					const c = (i.category || "").toLowerCase();
					return c.includes("хирург") || c.includes("имплант") || c.includes("удал");
				})
			);
		}
		if (specialtyFilter === "orthopedics") {
			return (
				s.stageKind === "stage_3_orthopedics" ||
				s.items.some((i) => {
					const c = (i.category || "").toLowerCase();
					return c.includes("ортопед") || c.includes("коронк") || c.includes("протез") || c.includes("мост");
				})
			);
		}
		if (specialtyFilter === "orthodontics") {
			return (
				s.stageKind === "stage_4_orthodontics" ||
				s.items.some((i) => {
					const c = (i.category || "").toLowerCase();
					return c.includes("ортодонт") || c.includes("брекет") || c.includes("элайнер");
				})
			);
		}
		if (specialtyFilter === "periodontics") {
			return (
				s.stageKind === "stage_5_periodontics" ||
				s.items.some((i) => {
					const c = (i.category || "").toLowerCase();
					return c.includes("пародонт") || c.includes("гигиен") || c.includes("десн");
				})
			);
		}
		return true;
	});
}

export function mergeIncomingPlanItem(
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
