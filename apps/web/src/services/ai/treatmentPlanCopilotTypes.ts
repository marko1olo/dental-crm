/**
 * treatmentPlanCopilotTypes.ts — Types, contracts and stage recalculation for Treatment Plan Copilot.
 *
 * Mandate 8s (SSOT & Anti-Bloat)
 */

import {
	type Kopecks,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import type {
	TreatmentPlanStage,
} from "../../components/treatment-plans/types";

export type CopilotCommandType =
	| "budget_optimize"
	| "implant_to_bridge"
	| "all_on_4_upper"
	| "all_on_4_lower"
	| "bone_graft_bio_oss"
	| "recalculate_anesthesia_isolation"
	| "custom_ai";

export interface CopilotOptimizationOptions {
	readonly targetBudgetRub?: number | undefined;
	readonly keepMandatoryTherapy?: boolean | undefined;
	readonly materialPreference?: ("economy" | "standard" | "premium") | undefined;
	readonly upperJawOnly?: boolean | undefined;
	readonly replaceToothNumbers?: readonly number[] | undefined;
}

export interface CopilotModificationAuditItem {
	readonly action: "added" | "removed" | "modified" | "replaced";
	readonly description: string;
	readonly stageNumber: number;
	readonly oldPriceRub?: number | undefined;
	readonly newPriceRub?: number | undefined;
	readonly code804n?: string | undefined;
	readonly toothNumber?: number | undefined;
}

export interface CopilotModificationResult {
	readonly success: boolean;
	readonly commandType: CopilotCommandType;
	readonly commandTitle: string;
	readonly explanation: string;
	readonly stages: readonly TreatmentPlanStage[];
	readonly auditTrail: readonly CopilotModificationAuditItem[];
	readonly oldTotalRub: number;
	readonly newTotalRub: number;
	readonly deltaRub: number;
}

export interface CopilotPresetAction {
	readonly id: CopilotCommandType;
	readonly title: string;
	readonly promptText: string;
	readonly badge: string;
	readonly description: string;
}

export const COPILOT_PRESET_ACTIONS: readonly CopilotPresetAction[] = [
	{
		id: "budget_optimize",
		title: "Оптимизировать под бюджет",
		promptText: "Оптимизировать план лечения под заданный бюджет",
		badge: "Бюджет",
		description: "Заменяет премиальные конструкции на экономичные аналоги без потери санации",
	},
	{
		id: "implant_to_bridge",
		title: "Заменить имплантацию на мостовидный протез",
		promptText: "Заменить хирургическую имплантацию на несъемный мостовидный протез",
		badge: "Ортопедия",
		description: "Исключает хирургический этап и костную пластику, формирует мост на соседних зубах",
	},
	{
		id: "all_on_4_upper",
		title: "Добавить All-on-4 на верхнюю челюсть",
		promptText: "Добавить тотальный протокол All-on-4 на верхнюю челюсть",
		badge: "All-on-4 ВЧ",
		description: "Установка 4 имплантатов + Multi-unit + немедленный адаптационный винтовой мост на ВЧ",
	},
	{
		id: "all_on_4_lower",
		title: "Добавить All-on-4 на нижнюю челюсть",
		promptText: "Добавить тотальный протокол All-on-4 на нижнюю челюсть",
		badge: "All-on-4 НЧ",
		description: "Установка 4 имплантатов + Multi-unit + немедленный адаптационный винтовой мост на НЧ",
	},
	{
		id: "bone_graft_bio_oss",
		title: "Включить костную пластику Bio-Oss",
		promptText: "Включить направленную костную регенерацию Bio-Oss и мембрану Bio-Gide",
		badge: "Костная пластика",
		description: "Добавляет операцию НКР с ксеноматериалом Geistlich Bio-Oss и мембраной Bio-Gide",
	},
	{
		id: "recalculate_anesthesia_isolation",
		title: "Пересчитать анестезию и коффердам",
		promptText: "Проверить и добавить анестезию и изоляцию коффердам для всех процедур",
		badge: "Безопасность и стандарт",
		description: "Автоматически добавляет карпульную анестезию и коффердам на каждый инвазивный визит",
	},
];

export interface TreatmentPlanAiAuditOptions {
	readonly patientContext?: {
		readonly patientId?: string | undefined;
		readonly patientName?: string | undefined;
		readonly diagnosisSummary?: string | undefined;
		readonly clinicalReason?: string | undefined;
		readonly complaint?: string | undefined;
	} | undefined;
	readonly targetBudgetRub?: number | undefined;
	readonly installmentMonths?: number | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly userPrompt?: string | undefined;
	readonly authHeaders?: Record<string, string> | undefined;
}

/**
 * Пересчет этапа: суммирует цены, копейки, коды 804н и визиты
 */
export function recalculateStage(stage: TreatmentPlanStage): TreatmentPlanStage {
	const totalRub = stage.items.reduce((acc, it) => acc + it.priceRub, 0);
	const kopecksArray = stage.items.map((it) => parseKopecks(it.priceRub));
	const totalKopecks: Kopecks = sumKopecks(kopecksArray);
	const order804nCodes = Array.from(
		new Set(stage.items.map((it) => it.code804n).filter(Boolean)),
	);

	// Оценка визитов и недель по числу процедур
	const estimatedVisits = Math.max(1, Math.ceil(stage.items.length / 2));
	const estimatedWeeks = stage.stageNumber === 1 ? estimatedVisits : stage.stageNumber === 2 ? Math.max(8, estimatedVisits * 4) : Math.max(3, estimatedVisits * 2);

	return {
		...stage,
		items: stage.items,
		totalRub,
		totalKopecks,
		order804nCodes,
		estimatedVisits,
		estimatedWeeks,
	};
}
