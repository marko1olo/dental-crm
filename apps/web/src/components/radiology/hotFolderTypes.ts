import { SAMPLE_PATIENT_RVG_URL, type RadiologyStudy } from "./types";

export type HotFolderSource =
	| "all"
	| "ezdent"
	| "romexis"
	| "sidexis"
	| "carestream"
	| "cliniview"
	| "dicom_network";

export interface HotFolderItem {
	id: string;
	filename: string;
	source: Exclude<HotFolderSource, "all">;
	sourceLabel: string;
	folderPath: string;
	detectedModality: "intraoral_rvg" | "optg_panoramic" | "cbct_3d" | "bitewing";
	modalityLabel: string;
	detectedTeeth: string[];
	sizeBytes: number;
	sizeFormatted: string;
	timestampIso: string;
	relativeTime: string;
	imageUrl: string;
	status: "new" | "processing" | "imported";
	patientMatch?: {
		patientName: string;
		cardNumber: string;
		confidence: number;
	};
	metadata: {
		kv: number;
		ma: number;
		exposureSec: number;
		pixelSpacingMm: number;
		apparatusModel: string;
		sensorResolution?: string;
	};
}

export interface HotFolderIntakeModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string;
	patientName?: string;
	patientCardNumber?: string;
	patientBirthDate?: string;
	doctorName?: string;
	onAttachToEmr?: (result: {
		study: RadiologyStudy;
		teethFdi: string[];
		protocolNote: string;
		clinicalPurpose: string;
		doseMicrosv: number;
	}) => void;
	onExportDicom?: (item: HotFolderItem) => void;
	onSendToLab?: (item: HotFolderItem, note: string) => void;
}

export const INITIAL_HOT_FOLDER_ITEMS: HotFolderItem[] = [
	{
		id: "hf-01",
		filename: "RVG_Tooth16_20260828_114210.dcm",
		source: "ezdent",
		sourceLabel: "Vatech EzDent-i",
		folderPath: "\\\\XRAY-SERVER\\EzDent-i\\Export\\AutoIntake",
		detectedModality: "intraoral_rvg",
		modalityLabel: "Прицельный RVG",
		detectedTeeth: ["16"],
		sizeBytes: 1468006,
		sizeFormatted: "1.4 МБ",
		timestampIso: "2026-08-28T11:42:10.000Z",
		relativeTime: "1 мин назад",
		imageUrl: SAMPLE_PATIENT_RVG_URL,
		status: "new",
		patientMatch: {
			patientName: "Пациент",
			cardNumber: "043/у-2026/891",
			confidence: 98,
		},
		metadata: {
			kv: 65,
			ma: 7.0,
			exposureSec: 0.08,
			pixelSpacingMm: 0.035,
			apparatusModel: "Vatech EzSensor HD",
			sensorResolution: "29.2 lp/mm",
		},
	},
	{
		id: "hf-02",
		filename: "Romexis_OPTG_Panoramic_20260828_113000.png",
		source: "romexis",
		sourceLabel: "Planmeca Romexis",
		folderPath: "\\\\ROMEXIS-SRV\\Exchange\\2D_Panoramic",
		detectedModality: "optg_panoramic",
		modalityLabel: "ОПТГ Панорама",
		detectedTeeth: [
			"18", "17", "16", "15", "14", "13", "12", "11",
			"21", "22", "23", "24", "25", "26", "27", "28",
			"48", "47", "46", "45", "44", "43", "42", "41",
			"31", "32", "33", "34", "35", "36", "37", "38",
		],
		sizeBytes: 8598322,
		sizeFormatted: "8.2 МБ",
		timestampIso: "2026-08-28T11:30:00.000Z",
		relativeTime: "12 мин назад",
		imageUrl: SAMPLE_PATIENT_RVG_URL,
		status: "new",
		patientMatch: {
			patientName: "Пациент",
			cardNumber: "043/у-2026/891",
			confidence: 95,
		},
		metadata: {
			kv: 68,
			ma: 10.0,
			exposureSec: 14.2,
			pixelSpacingMm: 0.096,
			apparatusModel: "Planmeca ProMax 2D",
			sensorResolution: "16.0 lp/mm",
		},
	},
	{
		id: "hf-03",
		filename: "Sidexis_Bitewing_Q1Q4_20260828_105512.jpg",
		source: "sidexis",
		sourceLabel: "Dentsply Sirona Sidexis",
		folderPath: "\\\\SIDEXIS-SRV\\PDATA\\Incoming_Captures",
		detectedModality: "bitewing",
		modalityLabel: "Bite-wing",
		detectedTeeth: ["17", "16", "15", "14", "47", "46", "45", "44"],
		sizeBytes: 2202009,
		sizeFormatted: "2.1 МБ",
		timestampIso: "2026-08-28T10:55:12.000Z",
		relativeTime: "45 мин назад",
		imageUrl: SAMPLE_PATIENT_RVG_URL,
		status: "new",
		patientMatch: {
			patientName: "Пациент",
			cardNumber: "043/у-2026/891",
			confidence: 92,
		},
		metadata: {
			kv: 60,
			ma: 7.0,
			exposureSec: 0.10,
			pixelSpacingMm: 0.040,
			apparatusModel: "Sirona XIOS XG Supreme",
			sensorResolution: "33.3 lp/mm",
		},
	},
	{
		id: "hf-04",
		filename: "EzDent_Periapical_21_20260828_091522.dcm",
		source: "ezdent",
		sourceLabel: "Vatech EzDent-i",
		folderPath: "\\\\XRAY-SERVER\\EzDent-i\\Export\\AutoIntake",
		detectedModality: "intraoral_rvg",
		modalityLabel: "Прицельный RVG",
		detectedTeeth: ["21"],
		sizeBytes: 1363148,
		sizeFormatted: "1.3 МБ",
		timestampIso: "2026-08-28T09:15:22.000Z",
		relativeTime: "2 ч назад",
		imageUrl: SAMPLE_PATIENT_RVG_URL,
		status: "new",
		patientMatch: {
			patientName: "Пациент",
			cardNumber: "043/у-2026/891",
			confidence: 90,
		},
		metadata: {
			kv: 65,
			ma: 7.0,
			exposureSec: 0.08,
			pixelSpacingMm: 0.035,
			apparatusModel: "Vatech EzSensor HD",
			sensorResolution: "29.2 lp/mm",
		},
	},
	{
		id: "hf-05",
		filename: "Carestream_EndoControl_46_20260828_084011.tif",
		source: "carestream",
		sourceLabel: "Carestream CS Imaging",
		folderPath: "C:\\ProgramData\\Carestream\\Captures\\Inbox",
		detectedModality: "intraoral_rvg",
		modalityLabel: "Прицельный RVG",
		detectedTeeth: ["46"],
		sizeBytes: 1887436,
		sizeFormatted: "1.8 МБ",
		timestampIso: "2026-08-28T08:40:11.000Z",
		relativeTime: "3 ч назад",
		imageUrl: SAMPLE_PATIENT_RVG_URL,
		status: "imported",
		patientMatch: {
			patientName: "Пациент клиники",
			cardNumber: "043/у-2026/042",
			confidence: 94,
		},
		metadata: {
			kv: 65,
			ma: 7.0,
			exposureSec: 0.09,
			pixelSpacingMm: 0.042,
			apparatusModel: "Carestream RVG 6200",
			sensorResolution: "24.0 lp/mm",
		},
	},
];

export const CLINICAL_PURPOSES = [
	{ id: "endo_control", label: "Контроль эндодонтического лечения (обтурация каналов)" },
	{ id: "primary_caries", label: "Первичная диагностика кариеса / пульпита" },
	{ id: "implant_check", label: "Контроль остеоинтеграции имплантата / костной пластики" },
	{ id: "periapical_check", label: "Оценка периапикального очага / периодонтита" },
	{ id: "orthopantomogram", label: "Обзорное исследование зубных рядов (ОПТГ)" },
	{ id: "marginal_fit", label: "Контроль краевого прилегания ортопедической конструкции" },
] as const;

export type FilterPresetKey = "standard" | "endo" | "bone" | "caries" | "sharpen" | "negative";

export const FILTER_PRESETS: Record<
	FilterPresetKey,
	{
		label: string;
		brightness: number;
		contrast: number;
		invert: boolean;
		description: string;
	}
> = {
	standard: {
		label: "Стандарт",
		brightness: 100,
		contrast: 100,
		invert: false,
		description: "Сбалансированная яркость и контрастность",
	},
	endo: {
		label: "Эндодонтия / Апекс",
		brightness: 105,
		contrast: 165,
		invert: false,
		description: "Высокий контраст для верхушек корней и гуттаперчи",
	},
	bone: {
		label: "Кость / Трабекулы",
		brightness: 95,
		contrast: 145,
		invert: false,
		description: "Четкая визуализация кортикальной пластинки и трабекул",
	},
	caries: {
		label: "Скрытый кариес",
		brightness: 110,
		contrast: 180,
		invert: true,
		description: "Негатив с контрастом для зон деминерализации эмали",
	},
	sharpen: {
		label: "Резкость (Шарп)",
		brightness: 100,
		contrast: 135,
		invert: false,
		description: "Подчеркивание краевого прилегания пломб и вкладок",
	},
	negative: {
		label: "Негатив",
		brightness: 100,
		contrast: 100,
		invert: true,
		description: "Инверсия монохромного спектра",
	},
};
