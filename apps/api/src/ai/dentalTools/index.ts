/**
 * @file index.ts
 * @description Реестр и фасад стоматологических инструментов для DENTE AI Copilot / Agent.
 */

import {
	calculateAnesthesiaTool,
	chairsideEmergencyTool,
	checkSomaticRisksTool,
	compareDentalMaterialsTool,
	generateForm043Tool,
	multidisciplinaryConciliumTool,
	translatePatientComplaintTool,
} from "./clinicalCalculators.js";
import {
	createAppointmentTool,
	createInvoiceDraftTool,
	getPatientEmrTool,
	printDocumentTool,
	searchServicesTool,
	updateToothStatusTool,
} from "./crmDatabaseTools.js";
import {
	captureWorkstationScreenTool,
	launchWorkstationAppTool,
	openPatientDropzoneFolderTool,
	readLocalClinicalFileTool,
	runWorkstationCommandTool,
} from "./desktopSystemTools.js";
import type {
	AgentRuntimeMode,
	AnyDentalToolEntry,
	DentalToolContext,
	DentalToolEntry,
	OpenAIToolDefinition,
} from "./types.js";

export * from "./types.js";
export * from "./clinicalCalculators.js";
export * from "./crmDatabaseTools.js";
export * from "./desktopSystemTools.js";

/**
 * Полный реестр всех 18 стоматологических и системных инструментов
 */
export const dentalToolsRegistry: readonly AnyDentalToolEntry[] = [
	// Клинический уровень (везде)
	calculateAnesthesiaTool,
	checkSomaticRisksTool,
	getPatientEmrTool,
	searchServicesTool,
	generateForm043Tool,
	multidisciplinaryConciliumTool,
	chairsideEmergencyTool,
	translatePatientComplaintTool,
	compareDentalMaterialsTool,
	// CRM уровень (везде)
	updateToothStatusTool,
	createAppointmentTool,
	createInvoiceDraftTool,
	printDocumentTool,
	// Workstation / Управление ПК (desktop_native)
	launchWorkstationAppTool,
	openPatientDropzoneFolderTool,
	readLocalClinicalFileTool,
	runWorkstationCommandTool,
	captureWorkstationScreenTool,
] as const;

/**
 * Возвращает массив определений инструментов в формате OpenAI Function Calling
 * с фильтрацией по профилю выполнения (web_browser vs desktop_native)
 */
export function getDentalTools(
	runtimeMode: AgentRuntimeMode = "web_browser",
): OpenAIToolDefinition[] {
	return dentalToolsRegistry
		.filter((entry) => entry.supportedModes.includes(runtimeMode))
		.map((entry) => entry.definition);
}

/**
 * Единый диспетчер выполнения стоматологического инструмента
 */
export async function executeDentalTool(
	toolName: string,
	rawArgs: unknown,
	context: DentalToolContext,
): Promise<unknown> {
	const entry = dentalToolsRegistry.find((t) => t.name === toolName);

	if (!entry) {
		return {
			success: false,
			error: `Инструмент с именем '${toolName}' не найден в реестре Dental Tool Arsenal.`,
		};
	}

	const currentMode: AgentRuntimeMode = context.runtimeMode || "web_browser";

	// Проверка доступности в текущем профиле рантайма
	if (!entry.supportedModes.includes(currentMode)) {
		return {
			success: false,
			error: `Отказ: данная операция ('${toolName}') доступна только в режиме локальной станции врача (Dente Desktop / EXE на Windows). В облачном браузере доступно управление CRM и клиническими протоколами.`,
			availableInWeb: false,
		};
	}

	// Валидация аргументов через Zod
	const parsedArgsResult = entry.schema.safeParse(rawArgs);
	if (!parsedArgsResult.success) {
		return {
			success: false,
			error: `Ошибка валидации входных параметров для инструмента '${toolName}': ${parsedArgsResult.error.message}`,
			validationIssues: parsedArgsResult.error.issues,
		};
	}

	return await entry.handler(parsedArgsResult.data, context);
}
