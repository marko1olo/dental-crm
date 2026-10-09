/**
 * labCostDeductionEngine.ts — Deduction engine for dental laboratory costs and clinical consumables.
 * Layer 1: Pure Utilities & Domain Deduction Rules (0 side effects).
 */

import type { Kopecks } from "../../money.js";
import type { IdentMaterialWriteoffResult } from "../../warehouse/identMaterialWriteoffEngine.js";
import type { DentalSpecialtyCategory } from "./types.js";

/**
 * Определяет, относится ли расходный материал к общеклиническим накладным расходам
 * (салфетки, ватные валики, слюноотсосы, перчатки, маски, стаканчики, нагрудники, бахилы).
 * Общеклинические расходники оплачиваются клиникой и НЕ подлежат удержанию из зарплаты врача!
 */
export function isGeneralClinicOverheadConsumable(materialName: string): boolean {
	if (!materialName || typeof materialName !== "string") return false;
	return /салфетк|ватн.*валик|валик.*стомат|слюноотсос|нагрудник|бахил|стаканчик|перчатк|маск|чехол для позиционер|дезинфицирующ.*салфетк/i.test(
		materialName.trim(),
	);
}

/**
 * Классифицирует услугу по медицинской категории (терапия, ортопедия, хирургия, ортодонтия, гигиена).
 */
export function classifyServiceCategory(
	categoryOrTitle?: string | null,
	order804nCode?: string | null,
): DentalSpecialtyCategory {
	const code = (order804nCode || "").trim().toUpperCase();
	const text = (categoryOrTitle || "").toLowerCase();

	if (text.includes("therap") || text.includes("терап") || text.includes("пломб") || text.includes("кариес") || text.includes("пульпит") || text.includes("эндодонт")) {
		return "therapy";
	}
	if (text.includes("prosthet") || text.includes("ортопед") || text.includes("коронк") || text.includes("протез") || text.includes("винир") || text.includes("вкладк")) {
		return "orthopedics";
	}
	if (text.includes("surg") || text.includes("хирург") || text.includes("имплант") || text.includes("удалени") || text.includes("синус") || text.includes("костн")) {
		return "surgery";
	}
	if (text.includes("orthodont") || text.includes("ортодонт") || text.includes("брекет") || text.includes("элайнер") || text.includes("дуг") || text.includes("пластинк")) {
		return "orthodontics";
	}
	if (text.includes("hygien") || text.includes("гигиен") || text.includes("отбеливан") || text.includes("air flow") || text.includes("чистк")) {
		return "hygiene";
	}
	if (text.includes("periodont") || text.includes("пародонт") || text.includes("вектор") || text.includes("кюретаж")) {
		return "periodontology";
	}

	// Коды Номенклатуры 804н
	if (code.startsWith("A16.07.002") || code.startsWith("A16.07.003") || code.startsWith("A16.07.030") || code.startsWith("A16.07.082")) {
		return "therapy";
	}
	if (code.startsWith("A16.07.004") || code.startsWith("A16.07.005") || code.startsWith("A16.07.006") || code.startsWith("A16.07.023")) {
		return "orthopedics";
	}
	if (code.startsWith("A16.07.001") || code.startsWith("A16.07.007") || code.startsWith("A16.07.011") || code.startsWith("A16.07.012") || code.startsWith("A16.07.041")) {
		return "surgery";
	}
	if (code.startsWith("A16.07.028") || code.startsWith("A16.07.047") || code.startsWith("A16.07.048")) {
		return "orthodontics";
	}
	if (code.startsWith("A16.07.051") || code.startsWith("A22.07.001")) {
		return "hygiene";
	}

	return "other";
}

/**
 * Извлекает себестоимость материалов для уменьшения расчетной базы врача из результатов 2-уровневого списания IDENT.
 * Уровень 1 (общеклинические overhead-материалы: салфетки, валики, слюноотсосы) оплачивается клиникой и НЕ удерживается (ст. 129 ТК РФ).
 * Уровень 2 (дорогие клинические материалы: импланты, мембраны, абатменты) подлежит вычету в модели Net.
 */
export function extractDeductibleMaterialsFromWriteoff(
	writeoffResult: IdentMaterialWriteoffResult,
): {
	expensiveClinicalCostKop: Kopecks;
	cheapOverheadCostKop: Kopecks;
	totalDoctorDeductibleKop: Kopecks;
} {
	return {
		expensiveClinicalCostKop: writeoffResult.clinicalTotalCostKopecks,
		cheapOverheadCostKop: writeoffResult.overheadTotalCostKopecks,
		totalDoctorDeductibleKop: writeoffResult.totalDoctorDeductibleCostKopecks,
	};
}
