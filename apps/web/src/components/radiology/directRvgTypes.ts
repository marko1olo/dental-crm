import type { RadiologyStudy } from "./types";

export type SensorCaptureStatus = "ready" | "acquiring" | "captured";

export type CaptureSourceMode = "io_sensor" | "io_camera" | "twain" | "dslr" | "import";

export interface CaptureSourceModeOption {
	id: CaptureSourceMode;
	label: string;
	shortLabel: string;
	description: string;
}

export const CAPTURE_SOURCE_MODES: readonly CaptureSourceModeOption[] = [
	{
		id: "io_sensor",
		label: "IO-сенсор (Внутриротовой)",
		shortLabel: "IO-сенсор",
		description: "Прямой аппаратный захват с USB EzSensor / горячая папка",
	},
	{
		id: "io_camera",
		label: "IO-камера (Видеокамера)",
		shortLabel: "IO-камера",
		description: "Захват видеопотока с интраоральной USB-камеры",
	},
	{
		id: "twain",
		label: "TWAIN (Сканеры и PSP)",
		shortLabel: "TWAIN",
		description: "Универсальный TWAIN шлюз для фосфорных пластин и сканеров",
	},
	{
		id: "dslr",
		label: "Авто DSLR (Фотоаппарат)",
		shortLabel: "Авто DSLR",
		description: "Импорт дентальных снимков с фотоаппарата по Wi-Fi / кабелю",
	},
	{
		id: "import",
		label: "Импорт (Файлы с диска)",
		shortLabel: "Импорт",
		description: "Загрузка файлов DICOM, TIFF, PNG, JPG, BMP с диска",
	},
] as const;

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
	// Vatech Series
	{ id: "vatech_ezsensor", name: "Vatech EzSensor", resolution: "25.0 lp/mm (35.0 мкм)", pixelSpacing: 0.035 },
	{ id: "vatech_ezsensor_classic", name: "Vatech EzSensor Classic", resolution: "25.0 lp/mm (35.0 мкм)", pixelSpacing: 0.035 },
	{ id: "vatech_ezsensor_soft", name: "Vatech EzSensor Soft", resolution: "29.2 lp/mm (29.0 мкм)", pixelSpacing: 0.029 },
	{ id: "vatech_ezsensor_1_5", name: "Vatech EzSensor 1.5", resolution: "29.2 lp/mm (35.0 мкм)", pixelSpacing: 0.035 },
	{ id: "vatech_ezsensor_2_0", name: "Vatech EzSensor 2.0", resolution: "29.2 lp/mm (35.0 мкм)", pixelSpacing: 0.035 },
	// Carestream Series
	{ id: "carestream_rvg_5100", name: "Carestream RVG 5100", resolution: "14.0 lp/mm (19.0 мкм)", pixelSpacing: 0.019 },
	{ id: "carestream_rvg_5200", name: "Carestream RVG 5200", resolution: "16.0 lp/mm (19.0 мкм)", pixelSpacing: 0.019 },
	{ id: "carestream_rvg_6100", name: "Carestream / Kodak RVG 6100", resolution: "20.0 lp/mm (18.5 мкм)", pixelSpacing: 0.0185 },
	{ id: "carestream_rvg_6500", name: "Carestream RVG 6500 Wireless", resolution: "20.0 lp/mm (18.5 мкм)", pixelSpacing: 0.0185 },
	// Planmeca Series
	{ id: "planmeca_prosensor_hd", name: "Planmeca ProSensor HD (15 мкм)", resolution: "33.7 lp/mm (15.0 мкм)", pixelSpacing: 0.015 },
	// Dentsply Sirona / Schick
	{ id: "sirona_xios_xg", name: "Dentsply Sirona Xios XG", resolution: "16.7 lp/mm (30.0 мкм)", pixelSpacing: 0.03 },
	{ id: "sirona_xios_plus", name: "Dentsply Sirona Xios Plus", resolution: "20.0 lp/mm (25.0 мкм)", pixelSpacing: 0.025 },
	{ id: "sirona_xios_supreme", name: "Dentsply Sirona Xios Supreme", resolution: "33.3 lp/mm (15.0 мкм)", pixelSpacing: 0.015 },
	{ id: "schick_33", name: "Schick 33", resolution: "33.3 lp/mm (15.0 мкм)", pixelSpacing: 0.015 },
	{ id: "schick_elite", name: "Schick Elite", resolution: "25.0 lp/mm (20.0 мкм)", pixelSpacing: 0.02 },
	// Dexis
	{ id: "dexis_titanium", name: "Dexis Titanium", resolution: "25.0 lp/mm (20.0 мкм)", pixelSpacing: 0.02 },
	{ id: "dexis_platinum", name: "Dexis Platinum", resolution: "20.0 lp/mm (20.0 мкм)", pixelSpacing: 0.02 },
	// Acteon / Sopro
	{ id: "acteon_sopix", name: "Acteon / Sopro Sopix", resolution: "22.7 lp/mm (22.0 мкм)", pixelSpacing: 0.022 },
	{ id: "acteon_sopix2", name: "Acteon / Sopro Sopix2 (ACE)", resolution: "25.0 lp/mm (22.0 мкм)", pixelSpacing: 0.022 },
	{ id: "acteon_pspix", name: "Acteon PSPIX (PSP Scanner)", resolution: "20.0 lp/mm (25.0 мкм)", pixelSpacing: 0.025 },
	// Woodpecker / DTE
	{ id: "woodpecker_isensor_h1", name: "Woodpecker i-Sensor H1", resolution: "25.0 lp/mm (20.0 мкм)", pixelSpacing: 0.02 },
	{ id: "woodpecker_isensor_h2", name: "Woodpecker i-Sensor H2", resolution: "25.0 lp/mm (20.0 мкм)", pixelSpacing: 0.02 },
	{ id: "woodpecker_rvg", name: "Woodpecker RVG / DTE Sensor", resolution: "25.0 lp/mm (20.0 мкм)", pixelSpacing: 0.02 },
	// Handy
	{ id: "handy_hdr_500", name: "Handy HDR-500", resolution: "26.3 lp/mm (19.0 мкм)", pixelSpacing: 0.019 },
	{ id: "handy_hdr_600", name: "Handy HDR-600", resolution: "26.3 lp/mm (19.0 мкм)", pixelSpacing: 0.019 },
	// Fona
	{ id: "fona_cdr", name: "FONA CDR", resolution: "25.0 lp/mm (20.0 мкм)", pixelSpacing: 0.02 },
	{ id: "fona_stellaris", name: "FONA Stellaris", resolution: "28.0 lp/mm (17.8 мкм)", pixelSpacing: 0.0178 },
	// MyRay
	{ id: "myray_zen_x", name: "MyRay Zen-X", resolution: "25.0 lp/mm (20.0 мкм)", pixelSpacing: 0.02 },
	// Owandy
	{ id: "owandy_opteo", name: "Owandy Opteo", resolution: "25.0 lp/mm (20.0 мкм)", pixelSpacing: 0.02 },
	{ id: "owandy_one", name: "Owandy One", resolution: "22.0 lp/mm (22.7 мкм)", pixelSpacing: 0.0227 },
	// Eighteeth
	{ id: "eighteeth_nanopix_1", name: "Eighteeth NanoPix 1", resolution: "25.0 lp/mm (20.0 мкм)", pixelSpacing: 0.02 },
	{ id: "eighteeth_nanopix_2", name: "Eighteeth NanoPix 2", resolution: "25.0 lp/mm (20.0 мкм)", pixelSpacing: 0.02 },
	// Xpect Vision
	{ id: "xpect_vision_photon", name: "Xpect Vision Photon-Counting", resolution: "33.0 lp/mm (15.0 мкм)", pixelSpacing: 0.015 },
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
		label: "Прицельный",
		shortLabel: "Прицельный",
		description: "",
		typicalExposureSec: 0.08,
	},
	{
		id: "bitewing",
		label: "Интерпроксимальный (Bite-wing)",
		shortLabel: "Bite-wing",
		description: "",
		typicalExposureSec: 0.09,
	},
	{
		id: "occlusal",
		label: "Окклюзионный",
		shortLabel: "Окклюзионный",
		description: "",
		typicalExposureSec: 0.12,
	},
];
