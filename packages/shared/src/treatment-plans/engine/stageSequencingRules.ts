/**
 * DENTE Dental CRM — Multi-Option Treatment Plan & Phased Clinical Estimate Engine
 * Layer 1: Stage Sequencing Rules & Order 804n Classification
 *
 * Validates clinical sequencing of dental treatment stages:
 * - Stage 1 (stage_1_therapy): Неотложная помощь, терапевтическая санация, гигиена, пародонтология, эндодонтия
 * - Stage 2 (stage_2_surgery): Хирургический этап, удаление, синус-лифтинг, НКР, дентальная имплантация
 * - Stage 3 (stage_3_orthopedics): Ортопедический этап, протезирование на зубах и имплантатах, функциональная окклюзия
 *
 * Compliant with:
 * - Приказ Минздрава России от 13.10.2017 № 804н «Об утверждении номенклатуры медицинских услуг»
 * - Постановление Правительства РФ от 08.04.2020 № 458 (Код 02 дорогостоящее лечение)
 * - Клинические рекомендации Стоматологической Ассоциации России (СтАР)
 */

import { resolveTaxDeductionCategoryShared } from "../../finance/taxDeduction.js";
import type { PlanStageKind } from "./types.js";

/**
 * Автоматическая классификация медицинской услуги по 804н по клиническим этапам.
 *
 * Приоритет классификации:
 * 1. Ортопедия и протезирование (Этап 3) — наивысший приоритет, чтобы
 *    протезирование на имплантатах (A16.07.006, коронки, мосты) не попадало в хирургию.
 * 2. Хирургия и имплантация (Этап 2) — удаление, костная пластика, синус-лифтинг, имплантаты.
 * 3. Терапия, санация, гигиена, диагностика (Этап 1) — кариес, пульпит, чистка, профгигиена.
 */
export function classifyProcedureStage(
	code804n: string,
	categoryRu?: string,
): PlanStageKind {
	const code = (code804n || "").trim().toUpperCase();
	const cat = (categoryRu || "").toLowerCase();

	// 1. Ортопедия и протезирование (Этап 3) — наивысший приоритет, чтобы
	// протезирование на имплантатах (A16.07.006, коронки, мосты) не попадало в хирургию
	if (
		code.startsWith("A16.07.004") || // Коронки
		code.startsWith("A16.07.006") || // Протезирование на имплантатах
		code.startsWith("A16.07.003") || // Вкладки, виниры
		code.startsWith("A16.07.005") || // Съемные протезы
		code.startsWith("A16.07.036") || // Бюгельные протезы
		code.startsWith("A16.07.023") || // Мостовидные протезы
		code.startsWith("A16.07.049") || // Снятие слепка/сканирование
		cat.includes("ортопед") ||
		cat.includes("протез") ||
		cat.includes("коронк") ||
		cat.includes("винир") ||
		cat.includes("бюгел") ||
		cat.includes("вкладк")
	) {
		return "stage_3_orthopedics";
	}

	// 2. Хирургия и имплантация (Этап 2)
	if (
		code.startsWith("A16.07.001") || // Удаление зуба
		code.startsWith("A16.07.041") || // Костная пластика, остеотомия
		code.startsWith("A16.07.054") || // Дентальная имплантация, ФДМ
		code.startsWith("A16.07.093") || // Навигационный шаблон
		code.startsWith("A16.07.026") || // Гингивопластика
		code.startsWith("A16.07.011") || // Вскрытие абсцесса
		cat.includes("хирург") ||
		cat.includes("имплант") ||
		cat.includes("синус") ||
		cat.includes("удален") ||
		cat.includes("костн")
	) {
		return "stage_2_surgery";
	}

	// 3. Терапия, санация, гигиена, диагностика (Этап 1)
	return "stage_1_therapy";
}

/**
 * Проверка услуги на принадлежность к дорогостоящему лечению (Код 02)
 * по Постановлению Правительства РФ от 08.04.2020 № 458.
 */
export function isProcedureHighCostCode02(
	code804n: string,
	nameRu: string,
	categoryRu?: string,
): boolean {
	const cat = resolveTaxDeductionCategoryShared(code804n, nameRu);
	return cat === "2" || (cat as string) === "02";
}
