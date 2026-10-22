/**
 * toolMeta.ts — Workstation & Clinical tool metadata mapping
 */

export interface ToolMeta {
	title: string;
	isWorkstation: boolean;
	iconName: "tool" | "monitor" | "folder" | "camera" | "stethoscope" | "pill" | "file";
}

export const WORKSTATION_TOOL_NAMES = new Set([
	"launch_workstation_app",
	"launchWorkstationApp",
	"open_patient_dropzone_folder",
	"openPatientDropzoneFolder",
	"capture_workstation_screen",
	"captureWorkstationScreen",
	"import_dicom_studies",
	"importDicomStudies",
	"sync_visiograph_tray",
	"syncVisiographTray",
]);

export const HUMAN_TOOL_TITLES: Record<string, { title: string; iconName: ToolMeta["iconName"] }> = {
	getPatientEmk043u: { title: "Анализ ЭМК и зубной формулы", iconName: "stethoscope" },
	get_patient_emr_and_odontogram: { title: "Анализ ЭМК и зубной формулы", iconName: "stethoscope" },
	checkDrugInteractions: { title: "Проверка соматики и лекарств", iconName: "pill" },
	check_somatic_risks: { title: "Проверка соматики и лекарств", iconName: "pill" },
	calculateAnestheticDosage: { title: "Расчет дозировки анестетика", iconName: "pill" },
	calculate_anesthesia: { title: "Расчет дозировки анестетика", iconName: "pill" },
	calculate804nEstimate: { title: "Расчет сметы по каталогу услуг", iconName: "file" },
	calculate_estimate_804n: { title: "Расчет сметы по каталогу услуг", iconName: "file" },
	updateToothStatus: { title: "Обновление зубной формулы", iconName: "stethoscope" },
	update_tooth_status: { title: "Обновление зубной формулы", iconName: "stethoscope" },
	draft043uSoapDiary: { title: "Формирование медицинской карты", iconName: "file" },
	draft_soap_diary: { title: "Формирование медицинской карты", iconName: "file" },
	checkWarehouseSupplies: { title: "Проверка остатков медикаментов", iconName: "tool" },
	check_warehouse_supplies: { title: "Проверка остатков медикаментов", iconName: "tool" },
	createDentalLabOrder: { title: "Наряд в зуботехническую лабораторию", iconName: "file" },
	create_lab_order: { title: "Наряд в зуботехническую лабораторию", iconName: "file" },
	bookChairsideAppointment: { title: "Планирование визита", iconName: "file" },
	book_appointment: { title: "Планирование визита", iconName: "file" },
	generateInformedConsentIds: { title: "Подготовка бланка ИДС", iconName: "file" },
	generate_ids: { title: "Подготовка бланка ИДС", iconName: "file" },
	launch_workstation_app: { title: "Запуск программы визиографа", iconName: "monitor" },
	launchWorkstationApp: { title: "Запуск программы визиографа", iconName: "monitor" },
	open_patient_dropzone_folder: { title: "Открытие папки снимков пациента", iconName: "folder" },
	openPatientDropzoneFolder: { title: "Открытие папки снимков пациента", iconName: "folder" },
	capture_workstation_screen: { title: "Захват экрана визиографа", iconName: "camera" },
	captureWorkstationScreen: { title: "Захват экрана визиографа", iconName: "camera" },
	import_dicom_studies: { title: "Импорт снимков КЛКТ / визиографа", iconName: "folder" },
	importDicomStudies: { title: "Импорт снимков КЛКТ / визиографа", iconName: "folder" },
};

export function isWorkstationTool(toolName: string): boolean {
	return WORKSTATION_TOOL_NAMES.has(toolName);
}

export function getHumanToolMeta(toolName: string): ToolMeta {
	const isWorkstation = isWorkstationTool(toolName);
	const mapped = HUMAN_TOOL_TITLES[toolName];
	if (mapped) {
		return {
			title: isWorkstation ? `[🖥️ ПК] ${mapped.title}` : mapped.title,
			isWorkstation,
			iconName: mapped.iconName,
		};
	}
	return {
		title: isWorkstation ? `[🖥️ ПК] ${toolName}` : `Вызов инструмента: ${toolName}`,
		isWorkstation,
		iconName: isWorkstation ? "monitor" : "tool",
	};
}

export function detectWorkstationEnvironment(): boolean {
	if (typeof window === "undefined") return false;
	const hostname = window.location.hostname;
	const isLocalhost =
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname === "0.0.0.0" ||
		hostname.endsWith(".local");
	const isDesktopApp = Boolean(
		(window as unknown as { __DENTE_DESKTOP__?: boolean }).__DENTE_DESKTOP__ ||
		(window as unknown as { electron?: unknown }).electron,
	);
	return isLocalhost || isDesktopApp;
}
