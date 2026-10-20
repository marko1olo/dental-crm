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
	configureClinicSetupTool,
	createAppointmentTool,
	createInvoiceDraftTool,
	getPatientEmrTool,
	importClinicDataFileTool,
	printDocumentTool,
	searchServicesTool,
	updateToothStatusTool,
} from "./crmDatabaseTools.js";
import { manageTaskPlanTool } from "./taskPlanTools.js";
import {
	callLocalMcpToolTool,
	captureWorkstationScreenTool,
	launchWorkstationAppTool,
	listLocalMcpToolsTool,
	listPatientStudyDirectoryTool,
	manageTaskTool,
	openPatientDropzoneFolderTool,
	readClinicalFileTool,
	readLocalClinicalFileTool,
	readLocalMcpResourceTool,
	replaceFileContentTool,
	runWorkstationCommandTool,
	scheduleTool,
	searchWorkstationFilesTool,
	writeClinicalFileTool,
} from "./desktopSystemTools.js";
import type {
	AgentRuntimeMode,
	AnyDentalToolEntry,
	DentalToolContext,
	OpenAIToolDefinition,
} from "./types.js";

export * from "./clinicalCalculators.js";
export * from "./crmDatabaseTools.js";
export * from "./desktopSystemTools.js";
export * from "./taskPlanTools.js";
export * from "./types.js";

/**
 * Полный реестр стоматологических, CRM и нативных системных инструментов
 */
export const dentalToolsRegistry: readonly AnyDentalToolEntry[] = [
	// Когнитивное планирование и многошаговый трекинг (везде)
	manageTaskPlanTool,
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
	configureClinicSetupTool,
	importClinicDataFileTool,
	// Workstation / Управление ПК врача (desktop_native)
	readClinicalFileTool,
	readLocalClinicalFileTool,
	writeClinicalFileTool,
	replaceFileContentTool,
	searchWorkstationFilesTool,
	listPatientStudyDirectoryTool,
	openPatientDropzoneFolderTool,
	runWorkstationCommandTool,
	manageTaskTool,
	scheduleTool,
	launchWorkstationAppTool,
	captureWorkstationScreenTool,
	callLocalMcpToolTool,
	listLocalMcpToolsTool,
	readLocalMcpResourceTool,
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
 * Нормализует общепринятые псевдонимы системных инструментов (Cline/Antigravity/OpenHands)
 * в канонические системные имена реестра DENTE.
 */
export function normalizeToolName(toolName: string): string {
	switch (toolName) {
		case "read_file":
		case "view_file":
			return "read_clinical_file";
		case "write_file":
			return "write_clinical_file";
		case "edit_file":
			return "replace_file_content";
		case "run_command":
			return "run_workstation_command";
		case "launch_app":
			return "launch_workstation_app";
		case "capture_screen":
			return "capture_workstation_screen";
		case "search_files":
			return "search_workstation_files";
		case "task_plan":
			return "manage_task_plan";
		default:
			return toolName;
	}
}

/**
 * Единый диспетчер выполнения стоматологического инструмента
 */
export async function executeDentalTool(
	toolName: string,
	rawArgs: unknown,
	context: DentalToolContext,
): Promise<unknown> {
	const normalizedToolName = normalizeToolName(toolName);

	const entry =
		dentalToolsRegistry.find((t) => t.name === normalizedToolName) ||
		dentalToolsRegistry.find((t) => t.name === toolName);

	if (!entry) {
		return {
			success: false,
			code: "TOOL_NOT_FOUND",
			error: `Инструмент с именем '${toolName}' не найден в реестре Dental Tool Arsenal.`,
			suggestion: "Используйте доступные инструменты клинического анализа или системного харнесса рабочей станции.",
			recoverable: true,
		};
	}

	const currentMode: AgentRuntimeMode = context.runtimeMode || "web_browser";

	// Проверка доступности в текущем профиле рантайма
	if (!entry.supportedModes.includes(currentMode)) {
		return {
			success: false,
			code: "DESKTOP_DENIED",
			error: `Отказ: данная операция ('${toolName}') доступна только в режиме локальной станции врача (DENTE Desktop / EXE на Windows). В облачном браузере доступно управление CRM и клиническими протоколами.`,
			suggestion: "В браузере используйте инструменты медицинской карты, одонтограммы и прейскуранта; системные операции ПК доступны в DENTE Desktop.",
			availableInWeb: false,
			recoverable: true,
		};
	}

	// Валидация аргументов через Zod
	const parsedArgsResult = entry.schema.safeParse(rawArgs);
	if (!parsedArgsResult.success) {
		return {
			success: false,
			code: "VALIDATION_FAILED",
			error: `Ошибка валидации входных параметров для инструмента '${toolName}': ${parsedArgsResult.error.message}`,
			suggestion: "Скорректируйте аргументы в соответствии со схемой инструмента.",
			validationIssues: parsedArgsResult.error.issues,
			recoverable: true,
		};
	}

	return await entry.handler(parsedArgsResult.data, context);
}

/**
 * Реестр имен инструментов, изменяющих персистентное состояние БД или локальной ОС (State Mutation).
 * В соответствии с Мандатом 8e (Doctor Autonomy) и двухфазным гейтом, данные инструменты
 * помечаются как требующие подтверждения пользователя в интерактивных UI-сессиях.
 */
export const DESTRUCTIVE_TOOL_NAMES: readonly string[] = Object.freeze([
	"update_tooth_status",
	"create_appointment",
	"create_invoice_draft",
	"print_document",
	"configure_clinic_setup",
	"import_clinic_data_file",
	"write_clinical_file",
	"replace_file_content",
	"run_workstation_command",
]);

/**
 * Проверяет, является ли стоматологический или системный инструмент деструктивным
 */
export function isDestructiveDentalTool(toolName: string): boolean {
	const canonical = normalizeToolName(toolName);
	const entry = dentalToolsRegistry.find((t) => t.name === canonical);
	if (entry && typeof entry.destructive === "boolean") {
		return entry.destructive;
	}
	return DESTRUCTIVE_TOOL_NAMES.includes(canonical);
}

/**
 * Возвращает полное мета-описание инструмента из реестра по его системному имени
 */
export function getDentalToolEntry(
	toolName: string,
): AnyDentalToolEntry | undefined {
	const canonical = normalizeToolName(toolName);
	return dentalToolsRegistry.find((t) => t.name === canonical);
}

/**
 * Возвращает читаемое русскоязычное наименование действия для UI-уведомлений и карточек подтверждения.
 * Строго понятный язык врача без бюрократических номеров приказов и форм.
 */
export function getToolDescriptionRu(toolName: string): string {
	const canonical = normalizeToolName(toolName);
	const entry = dentalToolsRegistry.find((t) => t.name === canonical);
	if (entry?.titleRu) return entry.titleRu;
	switch (canonical) {
		case "manage_task_plan":
			return "Управление планом действий";
		case "update_tooth_status":
			return "Обновление статуса зуба в одонтограмме";
		case "create_appointment":
			return "Создание записи на приём в расписании";
		case "create_invoice_draft":
			return "Формирование счёта на оплату";
		case "print_document":
			return "Отправка медицинского документа на печать";
		case "configure_clinic_setup":
			return "Автономная настройка клиники под ключ";
		case "import_clinic_data_file":
			return "Пакетный импорт данных клиники из файла";
		case "search_workstation_files":
			return "Поиск файлов на дисках рабочей станции";
		case "replace_file_content":
			return "Редактирование содержимого файла на ПК";
		case "write_clinical_file":
			return "Запись файла на диск рабочей станции";
		case "read_clinical_file":
		case "read_local_clinical_file":
			return "Чтение файла с диска рабочей станции";
		case "list_patient_study_directory":
			return "Просмотр папки снимков пациента";
		case "open_patient_dropzone_folder":
			return "Открытие папки снимков в Проводнике";
		case "run_workstation_command":
			return "Выполнение системной команды на ПК";
		case "manage_task":
			return "Управление фоновыми задачами станции";
		case "schedule":
			return "Установка таймера или напоминания";
		case "launch_workstation_app":
			return "Запуск медицинской программы клиники";
		case "capture_workstation_screen":
			return "Захват снимка экрана или датчика визиографа";
		case "call_local_mcp_tool":
			return "Вызов оборудования через локальный аппаратный мост";
		case "calculate_anesthesia":
			return "Расчёт безопасной дозировки анестетика";
		case "check_somatic_risks":
			return "Скрининг соматических противопоказаний";
		case "get_patient_emr_and_odontogram":
			return "Запрос электронной медицинской карты";
		case "search_clinic_services_and_prices":
			return "Поиск услуг в прейскуранте";
		case "generate_form_043_entry":
			return "Синтез дневника амбулаторной карты приёма";
		case "multidisciplinary_concilium":
			return "Формирование консилиума специалистов";
		case "chairside_emergency_rescue":
			return "Алгоритм экстренной помощи у кресла";
		case "translate_patient_complaint":
			return "Перевод жалоб на медицинский диагноз";
		case "compare_dental_materials":
			return "Сравнение свойств стоматологических материалов";
		default:
			return `Выполнение действия '${toolName}'`;
	}
}
