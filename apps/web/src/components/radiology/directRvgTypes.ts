import type { RadiologyStudy } from "./types";

export type SensorCaptureStatus = "ready" | "acquiring" | "captured";

export type ProjectionAngleType = "periapical" | "bitewing" | "occlusal";

export interface DirectRvgCaptureModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string | undefined;
	patientName?: string | undefined;
	patientCardNumber?: string | undefined;
	doctorName?: string | undefined;
	initialToothFdi?: string | undefined;
	initialImageUrl?: string | undefined;
	onSaveToEmr?: ((study: RadiologyStudy) => void) | undefined;
	onSendToLab?: ((orderData: {
		study: RadiologyStudy;
		toothFdi: string;
		note: string;
	}) => void) | undefined;
	onExportDicom?: ((study: RadiologyStudy) => void) | undefined;
}

export const SENSOR_MODELS = [
	{
		id: "vatech_ezsensor_hd",
		name: "Vatech EzSensor HD",
		resolution: "29.2 lp/mm (CMOS)",
		pixelSpacing: 0.035,
	},
	{
		id: "kavo_gxs_700",
		name: "KaVo Gendex GXS-700",
		resolution: "25.0 lp/mm (Direct USB)",
		pixelSpacing: 0.04,
	},
	{
		id: "planmeca_prosensor",
		name: "Planmeca ProSensor HD",
		resolution: "33.7 lp/mm (Fiber-Optic)",
		pixelSpacing: 0.03,
	},
	{
		id: "carestream_rvg_6200",
		name: "Carestream RVG 6200",
		resolution: "24.0 lp/mm (True Res)",
		pixelSpacing: 0.042,
	},
	{
		id: "fona_cdrelite",
		name: "FONA CDRelite / Schick",
		resolution: "28.0 lp/mm (Active CMOS)",
		pixelSpacing: 0.038,
	},
] as const;

export const PROJECTION_TYPES: Array<{
	id: ProjectionAngleType;
	label: string;
	shortLabel: string;
	description: string;
	typicalExposureSec: number;
}> = [
	{
		id: "periapical",
		label: "Интраоральный прицельный (Периапикальный)",
		shortLabel: "Прицельный",
		description: "Отображение верхушки корня, периодонта и периапикальной кости",
		typicalExposureSec: 0.08,
	},
	{
		id: "bitewing",
		label: "Интерпроксимальный (Bite-wing)",
		shortLabel: "Bite-wing",
		description: "Коронковые части верхних и нижних зубов для скрытого кариеса",
		typicalExposureSec: 0.09,
	},
	{
		id: "occlusal",
		label: "Окклюзионный (Аксиальный)",
		shortLabel: "Окклюзионный",
		description: "Поперечный срез альвеолярного отростка и свода челюсти",
		typicalExposureSec: 0.12,
	},
];
