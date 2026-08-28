/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RVG TWAIN & DENTAL RADIOGRAPHY HARDWARE ENGINE
 * Direct Capture, Hardware Calibration, 16-Bit Grayscale & DICOM IO Binding
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

/**
 * ─── 1. ТИПЫ И ХАРАКТЕРИСТИКИ СТОМАТОЛОГИЧЕСКИХ ДАТЧИКОВ (РФ / МЕЖДУНАРОДНЫЕ) ───
 */

export type RvgSensorVendor =
	| "vatech"
	| "kavo_gendex"
	| "planmeca"
	| "fona"
	| "woodpecker"
	| "handy"
	| "generic_twain";

export type RvgSensorSize = "SIZE_0" | "SIZE_1" | "SIZE_1_5" | "SIZE_2";

export type RvgCaptureProtocol = "TWAIN_2_4" | "WIA_2_0" | "NATIVE_USB_DRIVER";

export type RvgCaptureState =
	| "DISCONNECTED"
	| "INITIALIZING"
	| "IDLE_READY"
	| "ARMED_WAITING_FOR_XRAY"
	| "EXPOSURE_DETECTED"
	| "ACQUIRING_RAW_FRAME"
	| "APPLYING_CALIBRATION"
	| "FRAME_READY"
	| "ERROR";

export interface RvgSensorSpecification {
	readonly vendor: RvgSensorVendor;
	readonly modelName: string;
	readonly sensorSize: RvgSensorSize;
	readonly activeAreaMm: readonly [number, number]; // [widthMm, heightMm]
	readonly matrixResolutionPx: readonly [number, number]; // [widthPx, heightPx]
	readonly theoreticalResolutionLpMm: number; // line pairs per mm (lp/mm)
	readonly pixelPitchMicrons: number; // in micrometers (e.g. 19.5 um)
	readonly nativeBitDepth: 12 | 14 | 16;
	readonly vendorUsbId: {
		readonly vendorId: number; // e.g. 0x0E8F
		readonly productId: number;
	};
	readonly defaultWindowWidth: number;
	readonly defaultWindowCenter: number;
}

/**
 * Каталог поддерживаемых стоматологических датчиков на рынке РФ
 */
export const KNOWN_RVG_SENSOR_CATALOG: Record<string, RvgSensorSpecification> = {
	"vatech_ezsensor_hd_size1": {
		vendor: "vatech",
		modelName: "Vatech EzSensor HD Size 1.0",
		sensorSize: "SIZE_1",
		activeAreaMm: [20.0, 30.0],
		matrixResolutionPx: [1025, 1538],
		theoreticalResolutionLpMm: 33.7,
		pixelPitchMicrons: 14.8,
		nativeBitDepth: 14,
		vendorUsbId: { vendorId: 0x0e8f, productId: 0x1201 },
		defaultWindowWidth: 16384,
		defaultWindowCenter: 8192,
	},
	"vatech_ezsensor_hd_size2": {
		vendor: "vatech",
		modelName: "Vatech EzSensor HD Size 2.0",
		sensorSize: "SIZE_2",
		activeAreaMm: [26.0, 36.0],
		matrixResolutionPx: [1333, 1846],
		theoreticalResolutionLpMm: 33.7,
		pixelPitchMicrons: 14.8,
		nativeBitDepth: 14,
		vendorUsbId: { vendorId: 0x0e8f, productId: 0x1202 },
		defaultWindowWidth: 16384,
		defaultWindowCenter: 8192,
	},
	"kavo_gendex_gxs700_size1": {
		vendor: "kavo_gendex",
		modelName: "KaVo Gendex GXS-700 Size 1",
		sensorSize: "SIZE_1",
		activeAreaMm: [20.0, 30.0],
		matrixResolutionPx: [1024, 1536],
		theoreticalResolutionLpMm: 25.6,
		pixelPitchMicrons: 19.5,
		nativeBitDepth: 14,
		vendorUsbId: { vendorId: 0x0f0c, productId: 0x0701 },
		defaultWindowWidth: 16384,
		defaultWindowCenter: 7500,
	},
	"kavo_gendex_gxs700_size2": {
		vendor: "kavo_gendex",
		modelName: "KaVo Gendex GXS-700 Size 2",
		sensorSize: "SIZE_2",
		activeAreaMm: [26.0, 36.0],
		matrixResolutionPx: [1333, 1846],
		theoreticalResolutionLpMm: 25.6,
		pixelPitchMicrons: 19.5,
		nativeBitDepth: 14,
		vendorUsbId: { vendorId: 0x0f0c, productId: 0x0702 },
		defaultWindowWidth: 16384,
		defaultWindowCenter: 7500,
	},
	"planmeca_prosensor_hd_size1": {
		vendor: "planmeca",
		modelName: "Planmeca ProSensor HD Size 1",
		sensorSize: "SIZE_1",
		activeAreaMm: [20.0, 30.0],
		matrixResolutionPx: [1333, 2000],
		theoreticalResolutionLpMm: 33.3,
		pixelPitchMicrons: 15.0,
		nativeBitDepth: 16,
		vendorUsbId: { vendorId: 0x24c3, productId: 0x0110 },
		defaultWindowWidth: 65535,
		defaultWindowCenter: 32768,
	},
	"planmeca_prosensor_hd_size2": {
		vendor: "planmeca",
		modelName: "Planmeca ProSensor HD Size 2",
		sensorSize: "SIZE_2",
		activeAreaMm: [26.0, 36.0],
		matrixResolutionPx: [1733, 2400],
		theoreticalResolutionLpMm: 33.3,
		pixelPitchMicrons: 15.0,
		nativeBitDepth: 16,
		vendorUsbId: { vendorId: 0x24c3, productId: 0x0120 },
		defaultWindowWidth: 65535,
		defaultWindowCenter: 32768,
	},
	"fona_stellaris_size1": {
		vendor: "fona",
		modelName: "Fona Stellaris / CDR Elite Size 1",
		sensorSize: "SIZE_1",
		activeAreaMm: [20.0, 30.0],
		matrixResolutionPx: [1050, 1580],
		theoreticalResolutionLpMm: 26.3,
		pixelPitchMicrons: 19.0,
		nativeBitDepth: 12,
		vendorUsbId: { vendorId: 0x0a5c, productId: 0x217f },
		defaultWindowWidth: 4095,
		defaultWindowCenter: 2048,
	},
	"woodpecker_isensor_h1": {
		vendor: "woodpecker",
		modelName: "Woodpecker i-Sensor H1",
		sensorSize: "SIZE_1",
		activeAreaMm: [20.0, 30.0],
		matrixResolutionPx: [1000, 1500],
		theoreticalResolutionLpMm: 25.0,
		pixelPitchMicrons: 20.0,
		nativeBitDepth: 16,
		vendorUsbId: { vendorId: 0x2e3c, productId: 0x5740 },
		defaultWindowWidth: 65535,
		defaultWindowCenter: 30000,
	},
	"woodpecker_isensor_h2": {
		vendor: "woodpecker",
		modelName: "Woodpecker i-Sensor H2",
		sensorSize: "SIZE_2",
		activeAreaMm: [26.0, 36.0],
		matrixResolutionPx: [1300, 1800],
		theoreticalResolutionLpMm: 25.0,
		pixelPitchMicrons: 20.0,
		nativeBitDepth: 16,
		vendorUsbId: { vendorId: 0x2e3c, productId: 0x5741 },
		defaultWindowWidth: 65535,
		defaultWindowCenter: 30000,
	},
	"handy_hdr_500": {
		vendor: "handy",
		modelName: "Handy HDR-500 Size 1",
		sensorSize: "SIZE_1",
		activeAreaMm: [20.0, 30.0],
		matrixResolutionPx: [1000, 1500],
		theoreticalResolutionLpMm: 25.0,
		pixelPitchMicrons: 20.0,
		nativeBitDepth: 12,
		vendorUsbId: { vendorId: 0x04d8, productId: 0x00df },
		defaultWindowWidth: 4095,
		defaultWindowCenter: 2000,
	},
	"handy_hdr_600": {
		vendor: "handy",
		modelName: "Handy HDR-600 Size 2",
		sensorSize: "SIZE_2",
		activeAreaMm: [26.0, 36.0],
		matrixResolutionPx: [1300, 1800],
		theoreticalResolutionLpMm: 25.0,
		pixelPitchMicrons: 20.0,
		nativeBitDepth: 16,
		vendorUsbId: { vendorId: 0x04d8, productId: 0x00e0 },
		defaultWindowWidth: 65535,
		defaultWindowCenter: 32000,
	},
};

/**
 * ─── 2. КАЛИБРОВОЧНЫЕ МАТРИЦЫ И ПРОФИЛИ СЕНСОРА ───
 */

export interface BadPixelLocation {
	readonly x: number;
	readonly y: number;
}

export interface RvgHardwareCalibrationProfile {
	readonly sensorSerialNumber: string;
	readonly darkFrameMatrix?: Uint16Array | undefined; // Thermal / dark current offset
	readonly flatFieldGainMatrix?: Float32Array | undefined; // Relative gain map (normalized around 1.0)
	readonly badPixelMap: readonly BadPixelLocation[]; // Defective pixel coordinates
	readonly exposureThresholdAdc: number; // Trigger threshold for auto-exposure detection
	readonly calibrationDate: string;
}

/**
 * ─── 3. СТРУКТУРА ЗАХВАЧЕННОГО КАДРА И МЕТАДАННЫЕ ───
 */

export interface RvgRawFrame {
	readonly width: number;
	readonly height: number;
	readonly bitDepth: 12 | 14 | 16;
	readonly pixelBuffer: Uint16Array;
	readonly acquisitionTimestamp: number;
	readonly sensorInfo: RvgSensorSpecification;
	readonly calibrationApplied: boolean;
	readonly exposureTimeMs?: number | undefined;
	readonly triggerLevelAdc?: number | undefined;
}

export interface RvgPatientStudyBinding {
	readonly patientId: string;
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientSex?: "M" | "F" | "O" | undefined;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly visitId?: string | undefined;
	readonly toothFdiNumber?: number | undefined; // 11–48 (постоянные), 51–85 (молочные)
	readonly studyDescription?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly xRayTubeKv?: number | undefined;
	readonly xRayTubeMa?: number | undefined;
	readonly xRayExposureSec?: number | undefined;
}

export interface RvgDicomDatasetEnriched {
	readonly sopInstanceUid: string;
	readonly studyInstanceUid: string;
	readonly seriesInstanceUid: string;
	readonly modality: "IO" | "DX" | "RVG";
	readonly studyDate: string; // YYYYMMDD
	readonly studyTime: string; // HHMMSS
	readonly patientId: string;
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientSex?: string | undefined;
	readonly toothFdiNumber?: number | undefined;
	readonly toothFdiString?: string | undefined;
	readonly anatomicRegion: string;
	readonly rows: number;
	readonly columns: number;
	readonly bitsAllocated: 16;
	readonly bitsStored: 12 | 14 | 16;
	readonly highBit: number; // bitsStored - 1
	readonly pixelRepresentation: 0; // Unsigned integer
	readonly samplesPerPixel: 1;
	readonly photometricInterpretation: "MONOCHROME2";
	readonly pixelSpacingMm: readonly [number, number]; // [rowSpacing, colSpacing] in mm
	readonly windowCenter: number;
	readonly windowWidth: number;
	readonly manufacturer: string;
	readonly manufacturerModelName: string;
	readonly deviceSerialNumber: string;
	readonly softwareVersions: string;
	readonly kvp?: number | undefined;
	readonly tubeCurrentMa?: number | undefined;
	readonly exposureTimeSec?: number | undefined;
	readonly rawPixelBuffer: Uint16Array;
}

/**
 * ─── 4. TWAIN 2.4 / WIA 2.0 PROTOCOL CODES & CONSTANTS ───
 */

export const TWAIN_CONSTANTS = {
	DG_CONTROL: 0x0001,
	DG_IMAGE: 0x0002,
	DAT_IDENTITY: 0x0003,
	DAT_USERINTERFACE: 0x0009,
	DAT_IMAGEINFO: 0x0101,
	DAT_IMAGENATIVEXFER: 0x0104,
	DAT_IMAGEMEMXFER: 0x0103,
	DAT_CAPABILITY: 0x0001,
	MSG_OPENDSM: 0x0301,
	MSG_CLOSEDSM: 0x0302,
	MSG_OPENDS: 0x0401,
	MSG_CLOSEDS: 0x0402,
	MSG_ENABLEDS: 0x0501,
	MSG_DISABLEDS: 0x0502,
	MSG_XFERREADY: 0x0101,
	MSG_GET: 0x0001,
	MSG_SET: 0x0002,
	CAP_XFERMECH: 0x0103,
	TWSX_NATIVE: 0,
	TWSX_MEMORY: 2,
	TWRC_SUCCESS: 0,
	TWRC_CANCEL: 3,
	TWRC_NOTDSDONE: 8,
} as const;

export const WIA_CONSTANTS = {
	WIA_IPA_DATATYPE: 4103,
	WIA_IPA_BITS_PER_PIXEL: 4104,
	WIA_IPA_BYTES_PER_LINE: 4106,
	WIA_IPA_NUMBER_OF_LINES: 4107,
	WIA_IPA_PIXELS_PER_LINE: 4108,
	WIA_IPS_BRIGHTNESS: 6147,
	WIA_IPS_CONTRAST: 6148,
	WIA_DATA_GRAYSCALE: 2,
	WIA_DATA_RAW: 3,
} as const;

/**
 * ─── 5. ZOD SCHEMAS ДЛЯ ВАЛИДАЦИИ СЕССИИ И МЕТАДАННЫХ ───
 */

export const toothFdiCodeSchema = z
	.number()
	.int()
	.refine(
		(code) =>
			(code >= 11 && code <= 18) ||
			(code >= 21 && code <= 28) ||
			(code >= 31 && code <= 38) ||
			(code >= 41 && code <= 48) ||
			(code >= 51 && code <= 55) ||
			(code >= 61 && code <= 65) ||
			(code >= 71 && code <= 75) ||
			(code >= 81 && code <= 85),
		{ message: "Некорректный номер зуба по стандарту FDI (11-48 для постоянных, 51-85 для молочных)" },
	);

export const rvgPatientStudyBindingSchema = z.object({
	patientId: z.string().min(1, "Идентификатор пациента обязателен"),
	patientName: z.string().min(1, "ФИО пациента обязательно"),
	patientBirthDate: z.string().optional(),
	patientSex: z.enum(["M", "F", "O"]).optional(),
	doctorId: z.string().min(1, "Идентификатор врача обязателен"),
	doctorName: z.string().min(1, "ФИО врача обязательно"),
	visitId: z.string().optional(),
	toothFdiNumber: toothFdiCodeSchema.optional(),
	studyDescription: z.string().optional(),
	clinicName: z.string().optional(),
	xRayTubeKv: z.number().min(40).max(100).optional(),
	xRayTubeMa: z.number().min(1).max(20).optional(),
	xRayExposureSec: z.number().min(0.01).max(5.0).optional(),
});

/**
 * ─── 6. ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ГЕНЕРАЦИИ UID И DICOM-ДАТЫ ───
 */

let uidCounter = 1;

export function generateDicomUid(rootPrefix = "1.2.643.5.1.13.2"): string {
	const timestamp = Date.now();
	const count = uidCounter++;
	const random = Math.floor(Math.random() * 899999 + 100000);
	return `${rootPrefix}.${timestamp}.${count}.${random}`;
}

export function formatDicomDate(d = new Date()): string {
	const y = d.getFullYear().toString().padStart(4, "0");
	const m = (d.getMonth() + 1).toString().padStart(2, "0");
	const day = d.getDate().toString().padStart(2, "0");
	return `${y}${m}${day}`;
}

export function formatDicomTime(d = new Date()): string {
	const h = d.getHours().toString().padStart(2, "0");
	const m = d.getMinutes().toString().padStart(2, "0");
	const s = d.getSeconds().toString().padStart(2, "0");
	return `${h}${m}${s}`;
}

export function getFdiAnatomicRegionDescription(tooth: number): string {
	if (tooth >= 11 && tooth <= 18) return `Верхняя челюсть справа (квадрант 1, зуб ${tooth})`;
	if (tooth >= 21 && tooth <= 28) return `Верхняя челюсть слева (квадрант 2, зуб ${tooth})`;
	if (tooth >= 31 && tooth <= 38) return `Нижняя челюсть слева (квадрант 3, зуб ${tooth})`;
	if (tooth >= 41 && tooth <= 48) return `Нижняя челюсть справа (квадрант 4, зуб ${tooth})`;
	if (tooth >= 51 && tooth <= 55) return `Молочный зуб верхний правый (${tooth})`;
	if (tooth >= 61 && tooth <= 65) return `Молочный зуб верхний левый (${tooth})`;
	if (tooth >= 71 && tooth <= 75) return `Молочный зуб нижний левый (${tooth})`;
	if (tooth >= 81 && tooth <= 85) return `Молочный зуб нижний правый (${tooth})`;
	return `Зубная дуга (FDI ${tooth})`;
}

/**
 * ─── 7. КАЛИБРОВКА СЫРОГО ИЗОБРАЖЕНИЯ (DARK FRAME, GAIN & BAD PIXELS) ───
 */

/**
 * Применяет полную аппаратную калибровку к 16-битному кадру визиографа:
 * 1. Вычитание темнового шума (Dark Frame Subtraction)
 * 2. Нормализация неравномерности чувствительности сцинтиллятора (Flat Field Gain)
 * 3. Интерполяция дефектных пикселей (Bad Pixel Map Restoration)
 */
export function applySensorHardwareCalibration(
	rawPixels: Uint16Array,
	width: number,
	height: number,
	profile?: RvgHardwareCalibrationProfile | undefined,
	maxBitDepth: 12 | 14 | 16 = 16,
): Uint16Array {
	const totalPixels = width * height;
	const maxVal = (1 << maxBitDepth) - 1;
	const calibrated = new Uint16Array(totalPixels);

	const hasDark = profile?.darkFrameMatrix && profile.darkFrameMatrix.length === totalPixels;
	const hasGain = profile?.flatFieldGainMatrix && profile.flatFieldGainMatrix.length === totalPixels;

	// Шаг 1 & 2: Dark frame subtraction + Flat field gain normalization
	for (let i = 0; i < totalPixels; i++) {
		let val = rawPixels[i]!;

		if (hasDark) {
			const darkVal = profile!.darkFrameMatrix![i]!;
			val = val > darkVal ? val - darkVal : 0;
		}

		if (hasGain) {
			const gain = profile!.flatFieldGainMatrix![i]!;
			if (gain > 0) {
				val = Math.round(val * gain);
			}
		}

		calibrated[i] = Math.min(maxVal, Math.max(0, val));
	}

	// Шаг 3: Bad pixel interpolation (замена битых/горячих пикселей средним значением 8 соседей)
	if (profile?.badPixelMap && profile.badPixelMap.length > 0) {
		const badMap = profile.badPixelMap;
		for (let b = 0; b < badMap.length; b++) {
			const { x, y } = badMap[b]!;
			if (x < 0 || x >= width || y < 0 || y >= height) continue;

			let sum = 0;
			let validCount = 0;

			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					if (dx === 0 && dy === 0) continue;
					const nx = x + dx;
					const ny = y + dy;
					if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
						const nIdx = ny * width + nx;
						sum += calibrated[nIdx]!;
						validCount++;
					}
				}
			}

			const targetIdx = y * width + x;
			if (validCount > 0) {
				calibrated[targetIdx] = Math.round(sum / validCount);
			}
		}
	}

	return calibrated;
}

/**
 * ─── 8. ГЕНЕРАТОР ТЕСТОВОГО СЫРОГО КАДРА ВИЗИОГРАФА (ДЛЯ АВТОТЕСТОВ И ЭМУЛЯЦИИ) ───
 */

export function createSyntheticRvgRawFrame(options: {
	readonly sensorKey: string;
	readonly baseAdcValue?: number;
	readonly addRootCanalPattern?: boolean;
	readonly corruptedPixels?: readonly BadPixelLocation[];
	readonly darkNoiseAdc?: number;
}): RvgRawFrame {
	const spec = KNOWN_RVG_SENSOR_CATALOG[options.sensorKey] ?? KNOWN_RVG_SENSOR_CATALOG["vatech_ezsensor_hd_size1"]!;
	const [width, height] = spec.matrixResolutionPx;
	const totalPixels = width * height;
	const buffer = new Uint16Array(totalPixels);
	const baseVal = options.baseAdcValue ?? (1 << (spec.nativeBitDepth - 2)); // ~25% dynamic range
	const darkNoise = options.darkNoiseAdc ?? 45;

	// Заполнение базовым фоном с имитацией анатомии зуба и корней
	const centerX = Math.floor(width / 2);
	const crownY = Math.floor(height * 0.3);
	const apexY = Math.floor(height * 0.85);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = y * width + x;
			let val = baseVal + Math.floor((Math.sin(x * 0.05) + Math.cos(y * 0.05)) * 100) + darkNoise;

			if (options.addRootCanalPattern) {
				// Эмаль (высокая рентгеноконтрастность -> ярче)
				const distCrown = Math.hypot(x - centerX, y - crownY);
				if (distCrown < width * 0.25) {
					val += 4000;
				}

				// Дентин и корень
				if (y >= crownY && y <= apexY) {
					const rootWidth = (width * 0.18) * (1 - (y - crownY) / (apexY - crownY) * 0.6);
					if (Math.abs(x - centerX) < rootWidth) {
						val += 2500; // Плотный корень
						// Корневой канал (рентгенопрозрачность -> темнее)
						if (Math.abs(x - centerX) < rootWidth * 0.2) {
							val -= 1800; // Просвет канала
						}
					}
				}
			}

			const maxVal = (1 << spec.nativeBitDepth) - 1;
			buffer[idx] = Math.min(maxVal, Math.max(0, val));
		}
	}

	// Искусственные битые пиксели при необходимости
	if (options.corruptedPixels) {
		for (const pt of options.corruptedPixels) {
			if (pt.x >= 0 && pt.x < width && pt.y >= 0 && pt.y < height) {
				buffer[pt.y * width + pt.x] = 0; // Dead pixel
			}
		}
	}

	return {
		width,
		height,
		bitDepth: spec.nativeBitDepth,
		pixelBuffer: buffer,
		acquisitionTimestamp: Date.now(),
		sensorInfo: spec,
		calibrationApplied: false,
		exposureTimeMs: 120,
		triggerLevelAdc: 1200,
	};
}

/**
 * ─── 9. RVG TWAIN & HARDWARE CAPTURE ENGINE ───
 */

export class RvgTwainCaptureEngine {
	private state: RvgCaptureState = "DISCONNECTED";
	private activeSensorKey: string | null = null;
	private activeProtocol: RvgCaptureProtocol = "TWAIN_2_4";
	private calibrationProfile: RvgHardwareCalibrationProfile | null = null;
	private stateChangeListeners: ((newState: RvgCaptureState, previousState: RvgCaptureState) => void)[] = [];
	private frameReadyListeners: ((frame: RvgRawFrame) => void)[] = [];
	private errorListeners: ((error: Error) => void)[] = [];

	constructor(protocol: RvgCaptureProtocol = "TWAIN_2_4") {
		this.activeProtocol = protocol;
	}

	public getState(): RvgCaptureState {
		return this.state;
	}

	public getActiveSensor(): RvgSensorSpecification | null {
		if (!this.activeSensorKey) return null;
		return KNOWN_RVG_SENSOR_CATALOG[this.activeSensorKey] ?? null;
	}

	public getActiveProtocol(): RvgCaptureProtocol {
		return this.activeProtocol;
	}

	public onStateChange(listener: (newState: RvgCaptureState, previousState: RvgCaptureState) => void): () => void {
		this.stateChangeListeners.push(listener);
		return () => {
			this.stateChangeListeners = this.stateChangeListeners.filter((l) => l !== listener);
		};
	}

	public onFrameReady(listener: (frame: RvgRawFrame) => void): () => void {
		this.frameReadyListeners.push(listener);
		return () => {
			this.frameReadyListeners = this.frameReadyListeners.filter((l) => l !== listener);
		};
	}

	public onError(listener: (error: Error) => void): () => void {
		this.errorListeners.push(listener);
		return () => {
			this.errorListeners = this.errorListeners.filter((l) => l !== listener);
		};
	}

	private setState(nextState: RvgCaptureState): void {
		const prev = this.state;
		if (prev === nextState) return;
		this.state = nextState;
		for (const listener of this.stateChangeListeners) {
			try {
				listener(nextState, prev);
			} catch (e) {
				console.error("[RvgTwainEngine] Error in state listener:", e);
			}
		}
	}

	/**
	 * Подключение и инициализация датчика визиографа
	 */
	public async connectSensor(
		sensorKey: string,
		calibration?: RvgHardwareCalibrationProfile,
	): Promise<RvgSensorSpecification> {
		const spec = KNOWN_RVG_SENSOR_CATALOG[sensorKey];
		if (!spec) {
			const err = new Error(`Неизвестная модель датчика визиографа: '${sensorKey}'`);
			this.setState("ERROR");
			this.notifyError(err);
			throw err;
		}

		this.setState("INITIALIZING");
		this.activeSensorKey = sensorKey;
		this.calibrationProfile = calibration ?? null;

		// Имитация этапа рукопожатия USB / TWAIN DSM
		await new Promise((resolve) => setTimeout(resolve, 10));

		this.setState("IDLE_READY");
		return spec;
	}

	/**
	 * Перевод сенсора в режим ожидания рентгеновского импульса (ARMED)
	 */
	public armSensorForXRay(): void {
		if (this.state !== "IDLE_READY" && this.state !== "FRAME_READY") {
			throw new Error(`Невозможно взвести датчик из текущего состояния: ${this.state}`);
		}
		this.setState("ARMED_WAITING_FOR_XRAY");
	}

	/**
	 * Захват сырого кадра (триггер по рентгену или эмуляция экспозиции)
	 */
	public async triggerAcquisition(mockFrame?: RvgRawFrame): Promise<RvgRawFrame> {
		if (this.state !== "ARMED_WAITING_FOR_XRAY") {
			throw new Error(`Датчик не взведён для экспозиции. Текущее состояние: ${this.state}`);
		}

		this.setState("EXPOSURE_DETECTED");
		await new Promise((resolve) => setTimeout(resolve, 5));

		this.setState("ACQUIRING_RAW_FRAME");
		await new Promise((resolve) => setTimeout(resolve, 5));

		const raw =
			mockFrame ??
			createSyntheticRvgRawFrame({
				sensorKey: this.activeSensorKey || "vatech_ezsensor_hd_size1",
				addRootCanalPattern: true,
			});

		this.setState("APPLYING_CALIBRATION");
		const calibratedBuffer = applySensorHardwareCalibration(
			raw.pixelBuffer,
			raw.width,
			raw.height,
			this.calibrationProfile ?? undefined,
			raw.bitDepth,
		);

		const finalFrame: RvgRawFrame = {
			...raw,
			pixelBuffer: calibratedBuffer,
			calibrationApplied: true,
			acquisitionTimestamp: Date.now(),
		};

		this.setState("FRAME_READY");

		for (const listener of this.frameReadyListeners) {
			try {
				listener(finalFrame);
			} catch (e) {
				console.error("[RvgTwainEngine] Error in frame listener:", e);
			}
		}

		return finalFrame;
	}

	/**
	 * Привязка метаданных исследования и формирование обогащенного DICOM Dataset
	 */
	public enrichFrameWithDicomMetadata(
		frame: RvgRawFrame,
		binding: RvgPatientStudyBinding,
	): RvgDicomDatasetEnriched {
		const validated = rvgPatientStudyBindingSchema.parse(binding);
		const spec = frame.sensorInfo;

		const sopUid = generateDicomUid();
		const studyUid = generateDicomUid();
		const seriesUid = generateDicomUid();
		const studyDate = formatDicomDate();
		const studyTime = formatDicomTime();

		const [widthMm, heightMm] = spec.activeAreaMm;
		const rowSpacingMm = Number((heightMm / frame.height).toFixed(6));
		const colSpacingMm = Number((widthMm / frame.width).toFixed(6));

		const toothFdi = validated.toothFdiNumber;
		const regionDesc = toothFdi
			? getFdiAnatomicRegionDescription(toothFdi)
			: validated.studyDescription || "Прицельная дентальная радиовизиография";

		return {
			sopInstanceUid: sopUid,
			studyInstanceUid: studyUid,
			seriesInstanceUid: seriesUid,
			modality: "IO",
			studyDate,
			studyTime,
			patientId: validated.patientId,
			patientName: validated.patientName,
			patientBirthDate: validated.patientBirthDate,
			patientSex: validated.patientSex,
			toothFdiNumber: toothFdi,
			toothFdiString: toothFdi ? String(toothFdi) : undefined,
			anatomicRegion: regionDesc,
			rows: frame.height,
			columns: frame.width,
			bitsAllocated: 16,
			bitsStored: frame.bitDepth,
			highBit: frame.bitDepth - 1,
			pixelRepresentation: 0,
			samplesPerPixel: 1,
			photometricInterpretation: "MONOCHROME2",
			pixelSpacingMm: [rowSpacingMm, colSpacingMm],
			windowCenter: spec.defaultWindowCenter,
			windowWidth: spec.defaultWindowWidth,
			manufacturer: spec.vendor.toUpperCase(),
			manufacturerModelName: spec.modelName,
			deviceSerialNumber: this.calibrationProfile?.sensorSerialNumber || "RVG-SN-DEMO-2026",
			softwareVersions: "DenteEngine-Wave17-v1.0",
			kvp: validated.xRayTubeKv ?? 65,
			tubeCurrentMa: validated.xRayTubeMa ?? 7,
			exposureTimeSec: validated.xRayExposureSec ?? 0.12,
			rawPixelBuffer: frame.pixelBuffer,
		};
	}

	/**
	 * Отключение датчика и сброс состояния
	 */
	public disconnect(): void {
		this.activeSensorKey = null;
		this.calibrationProfile = null;
		this.setState("DISCONNECTED");
	}

	private notifyError(err: Error): void {
		for (const listener of this.errorListeners) {
			try {
				listener(err);
			} catch (e) {
				console.error("[RvgTwainEngine] Error in error listener:", e);
			}
		}
	}
}
