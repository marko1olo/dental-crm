/**
 * treatmentPlanStageMutations.ts — чистые функции иммутабельного обновления этапов и услуг плана лечения.
 * Вынесены из useTreatmentPlanLogic.ts строго по Мандату 8b (лимит строк <= 800).
 */

import {
	type Kopecks,
	classifyProcedureStage,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import type {
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanStageKind,
} from "./types";
import { romanizeStageNumber } from "./types";
import type { TreatmentPlanStageStatus } from "./TreatmentPlanStageCard";

function computeStageItemsTotalKopecks(items: readonly TreatmentPlanItem[]): Kopecks {
	return sumKopecks(items.map((it) => parseKopecks(it.priceRub || 0)));
}

export function updateItemQuantityInStages(
	stages: readonly TreatmentPlanStage[],
	itemId: string,
	newQty: number,
	discountPercent: number,
): TreatmentPlanStage[] {
	const safeQty = Math.max(1, Math.round(newQty));
	return stages.map((st) => {
		let modified = false;
		const updatedItems = st.items.map((it) => {
			if (it.id === itemId) {
				modified = true;
				const unitPriceRub =
					it.unitPriceRub > 0
						? it.unitPriceRub
						: Math.round(
								(it.priceRub + (it.discountRub || 0)) /
									Math.max(1, it.quantity || 1),
							);
				const unitKop = parseKopecks(unitPriceRub);
				const discountPct = discountPercent || 0;
				const unitDiscountKop =
					discountPct > 0 ? Math.round((unitKop * discountPct) / 100) : 0;
				const finalUnitKop = Math.max(0, unitKop - unitDiscountKop);
				const totalLineKop = finalUnitKop * safeQty;
				const totalDiscountKop = unitDiscountKop * safeQty;

				return {
					...it,
					quantity: safeQty,
					unitPriceRub: unitKop / 100,
					discountRub: totalDiscountKop / 100,
					priceRub: totalLineKop / 100,
				};
			}
			return it;
		});
		if (!modified) return st;

		const stTotalKopecks = computeStageItemsTotalKopecks(updatedItems);
		return {
			...st,
			items: updatedItems,
			totalRub: stTotalKopecks / 100,
			totalKopecks: stTotalKopecks,
		};
	});
}

export function updateItemPriceInStages(
	stages: readonly TreatmentPlanStage[],
	itemId: string,
	newPriceRub: number,
	discountPercent: number,
): TreatmentPlanStage[] {
	return stages.map((st) => {
		let modified = false;
		const updatedItems = st.items.map((it) => {
			if (it.id === itemId) {
				modified = true;
				const safeQty = Math.max(1, it.quantity || 1);
				const unitKop = parseKopecks(newPriceRub);
				const discountPct = discountPercent || 0;
				const unitDiscountKop =
					discountPct > 0 ? Math.round((unitKop * discountPct) / 100) : 0;
				const finalUnitKop = Math.max(0, unitKop - unitDiscountKop);
				const totalLineKop = finalUnitKop * safeQty;
				const totalDiscountKop = unitDiscountKop * safeQty;

				return {
					...it,
					quantity: safeQty,
					unitPriceRub: newPriceRub,
					discountRub: totalDiscountKop / 100,
					priceRub: totalLineKop / 100,
					requiresManualPricing: false,
				};
			}
			return it;
		});
		if (!modified) return st;

		const stTotalKopecks = computeStageItemsTotalKopecks(updatedItems);
		return {
			...st,
			items: updatedItems,
			totalRub: stTotalKopecks / 100,
			totalKopecks: stTotalKopecks,
		};
	});
}

export function updateItemInStages(
	stages: readonly TreatmentPlanStage[],
	updatedItem: TreatmentPlanItem,
	discountPercent: number,
): TreatmentPlanStage[] {
	return stages.map((st) => {
		let modified = false;
		const updatedItems = st.items.map((it) => {
			if (it.id === updatedItem.id) {
				modified = true;
				const safeQty = Math.max(1, updatedItem.quantity || 1);
				const unitPriceRub =
					updatedItem.unitPriceRub > 0
						? updatedItem.unitPriceRub
						: Math.round(
								(updatedItem.priceRub + (updatedItem.discountRub || 0)) /
									safeQty,
							);
				const unitKop = parseKopecks(unitPriceRub);
				const discountPct = discountPercent || 0;
				const unitDiscountKop =
					discountPct > 0 ? Math.round((unitKop * discountPct) / 100) : 0;
				const finalUnitKop = Math.max(0, unitKop - unitDiscountKop);
				const totalLineKop = finalUnitKop * safeQty;
				const totalDiscountKop = unitDiscountKop * safeQty;

				return {
					...updatedItem,
					quantity: safeQty,
					unitPriceRub: unitKop / 100,
					discountRub: totalDiscountKop / 100,
					priceRub: totalLineKop / 100,
					requiresManualPricing: false,
				};
			}
			return it;
		});
		if (!modified) return st;

		const stTotalKopecks = computeStageItemsTotalKopecks(updatedItems);
		return {
			...st,
			items: updatedItems,
			totalRub: stTotalKopecks / 100,
			totalKopecks: stTotalKopecks,
		};
	});
}

export function removeItemFromStages(
	stages: readonly TreatmentPlanStage[],
	itemId: string,
): TreatmentPlanStage[] {
	return stages.map((st) => {
		if (!st.items.some((it) => it.id === itemId)) return st;
		const updatedItems = st.items.filter((it) => it.id !== itemId);
		const stTotalKopecks = computeStageItemsTotalKopecks(updatedItems);
		return {
			...st,
			items: updatedItems,
			totalRub: stTotalKopecks / 100,
			totalKopecks: stTotalKopecks,
		};
	});
}

export function addItemToPlanStages(
	stages: readonly TreatmentPlanStage[],
	targetStageNumber: number,
	newItemData: Partial<TreatmentPlanItem>,
): TreatmentPlanStage[] {
	const unitPriceRub = newItemData.unitPriceRub || 0;
	const qty = newItemData.quantity || 1;
	const discRub = newItemData.discountRub || 0;
	const unitPriceKop = parseKopecks(unitPriceRub);
	const grossKopecks = (unitPriceKop * qty) as Kopecks;
	const discKopecks = parseKopecks(discRub);
	const netKopecks = Math.max(0, grossKopecks - discKopecks) as Kopecks;
	const netRub = netKopecks / 100;

	const stageKind: TreatmentPlanStageKind =
		newItemData.stageKind ||
		(targetStageNumber === 2
			? "stage_2_surgery"
			: targetStageNumber === 3
				? "stage_3_orthopedics"
				: targetStageNumber === 4
					? "stage_4_orthodontics"
					: targetStageNumber === 5
						? "stage_5_periodontics"
						: "stage_1_therapy");

	const existingStage = stages.find((s) => s.stageNumber === targetStageNumber);
	const stageItemIndex = (existingStage?.items.length ?? 0) + 1;
	const serviceCodeClean = (newItemData.code804n || "A16_07_002").replace(/[^\w-]/g, "_");
	const toothPart = newItemData.toothNumber !== undefined ? `_tooth_${newItemData.toothNumber}` : "";
	const deterministicId =
		newItemData.id ||
		`stage_item_${targetStageNumber}_${serviceCodeClean}${toothPart}_seq_${stageItemIndex}_ts_${Date.now()}`;

	const newItem: TreatmentPlanItem = {
		id: deterministicId,
		toothNumber: newItemData.toothNumber,
		code804n: newItemData.code804n || "A16.07.002",
		name: newItemData.name || "Медицинская услуга",
		category: newItemData.category || "Общее",
		priceRub: netRub,
		unitPriceRub,
		discountRub: discRub,
		quantity: qty,
		phase: targetStageNumber,
		stageKind,
		priceId: newItemData.code804n || "A16.07.002",
		fromCatalog: true,
		isAuto: false,
	};

	if (existingStage) {
		return stages.map((s) => {
			if (s.stageNumber !== targetStageNumber) return s;
			const updatedItems = [...s.items, newItem];
			const totalKopecks = computeStageItemsTotalKopecks(updatedItems);
			return {
				...s,
				items: updatedItems,
				totalKopecks,
				totalRub: totalKopecks / 100,
				order804nCodes: Array.from(new Set(updatedItems.map((i) => i.code804n))),
			};
		});
	}

	const newStage: TreatmentPlanStage = {
		stageNumber: targetStageNumber,
		stageKind,
		title: `Этап ${romanizeStageNumber(targetStageNumber)}: Клинический этап`,
		subtitle: "Процедуры по назначению врача",
		clinicalGoal: "Достижение согласованного клинического результата",
		items: [newItem],
		totalRub: netRub,
		totalKopecks: netKopecks as Kopecks,
		estimatedVisits: 1,
		estimatedWeeks: 2,
		order804nCodes: [newItem.code804n],
		status: "agreed",
	};
	return [...stages, newStage].sort((a, b) => a.stageNumber - b.stageNumber);
}

export function createNewStageInPlan(
	stages: readonly TreatmentPlanStage[],
	presetKind: "therapy" | "surgery" | "orthopedics" | "orthodontics" | "periodontics" | "custom",
	customTitle?: string,
): { nextStages: TreatmentPlanStage[]; createdTitle: string } {
	const newStageNumber = stages.length > 0 ? Math.max(...stages.map((s) => s.stageNumber)) + 1 : 1;
	let stageKind: TreatmentPlanStageKind = "stage_1_therapy";
	let title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Терапевтический этап"}`;
	let subtitle = "Санация и терапевтические процедуры";
	let clinicalGoal = "Полная санация и купирование воспалительных процессов";

	if (presetKind === "surgery") {
		stageKind = "stage_2_surgery";
		title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Хирургический этап и имплантация"}`;
		subtitle = "Удаление несостоятельных зубов, пластика и имплантация";
		clinicalGoal = "Восстановление костной опоры и подготовка к протезированию";
	} else if (presetKind === "orthopedics") {
		stageKind = "stage_3_orthopedics";
		title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Ортопедическая реабилитация"}`;
		subtitle = "Коронки, мостовидные протезы и функциональная окклюзия";
		clinicalGoal = "Восстановление жевательной функции и эстетики";
	} else if (presetKind === "orthodontics") {
		stageKind = "stage_4_orthodontics";
		title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Ортодонтическое лечение"}`;
		subtitle = "Нормализация окклюзии, исправление прикуса";
		clinicalGoal = "Формирование стабильного правильного прикуса";
	} else if (presetKind === "periodontics") {
		stageKind = "stage_5_periodontics";
		title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Пародонтология и профилактика"}`;
		subtitle = "Вектор-терапия, кюретаж и стабилизация пародонта";
		clinicalGoal = "Купирование воспаления десны и защита от рецидивов";
	} else if (presetKind === "custom") {
		stageKind = "stage_custom";
		title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Индивидуальный клинический этап"}`;
		subtitle = "Специализированный протокол лечения";
		clinicalGoal = "Выполнение индивидуальных клинических назначений";
	}

	const newStage: TreatmentPlanStage = {
		stageNumber: newStageNumber,
		stageKind,
		title,
		subtitle,
		clinicalGoal,
		items: [],
		totalRub: 0,
		totalKopecks: 0 as Kopecks,
		estimatedVisits: 1,
		estimatedWeeks: 2,
		order804nCodes: [],
		status: "agreed",
	};

	return {
		nextStages: [...stages, newStage],
		createdTitle: title,
	};
}

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
			if (st.items.some((it) => it.id === newItem.id)) {
				return st;
			}
			const updatedItems = [...st.items, newItem];
			const totalKopecks = computeStageItemsTotalKopecks(updatedItems);
			return {
				...st,
				items: updatedItems,
				totalRub: totalKopecks / 100,
				totalKopecks,
				order804nCodes: Array.from(new Set([...st.order804nCodes, newItem.code804n])),
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
		return {
			...st,
			items: updatedItems,
			totalRub: totalKopecks / 100,
			totalKopecks,
			order804nCodes: Array.from(new Set([...st.order804nCodes, ...newUnique.map((it) => it.code804n)])),
		};
	});
	return { updatedStages, changed };
}
