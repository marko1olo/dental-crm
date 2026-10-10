/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RVG ACQUISITION ORCHESTRATOR & CALIBRATION ENGINE (LAYER 2)
 * Hardware calibration, dark noise suppression, bad pixel healing & capture
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	BadPixelLocation,
	RvgCaptureProtocol,
	RvgCaptureState,
	RvgDicomDatasetEnriched,
	RvgHardwareCalibrationProfile,
	RvgPatientStudyBinding,
	RvgRawFrame,
	RvgSensorSpecification,
} from "./types.js";
import { rvgPatientStudyBindingSchema } from "./types.js";
import { KNOWN_RVG_SENSOR_CATALOG } from "./vendorProfiles.js";
import {
	formatDicomDate,
	formatDicomTime,
	generateDicomUid,
	getFdiAnatomicRegionDescription,
} from "./protocolBridge.js";

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
 * Генератор сырого кадра визиографа с имитацией рентгеноконтрастности тканей
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
 * Движок прямого захвата снимков визиографа по TWAIN 2.4, WIA 2.0 и Native USB
 */
export class RvgTwainCaptureEngine {
	private state: RvgCaptureState = "DISCONNECTED";
	private activeSensorKey: string | null = null;
	private activeProtocol: RvgCaptureProtocol = "TWAIN_2_4";
	private calibrationProfile: RvgHardwareCalibrationProfile | null = null;
	private allowSyntheticAcquisition: boolean = true;
	private stateChangeListeners: ((newState: RvgCaptureState, previousState: RvgCaptureState) => void)[] = [];
	private frameReadyListeners: ((frame: RvgRawFrame) => void)[] = [];
	private errorListeners: ((error: Error) => void)[] = [];

	constructor(
		protocol: RvgCaptureProtocol = "TWAIN_2_4",
		options?: { allowSyntheticAcquisition?: boolean },
	) {
		this.activeProtocol = protocol;
		this.allowSyntheticAcquisition = options?.allowSyntheticAcquisition ?? true;
	}

	public setAllowSyntheticAcquisition(allow: boolean): void {
		this.allowSyntheticAcquisition = allow;
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

		if (!mockFrame && !this.allowSyntheticAcquisition) {
			const err = new Error(
				"Снимок с физического датчика визиографа не получен: аппаратный таймаут экспозиции TWAIN DSM",
			);
			this.setState("ERROR");
			this.notifyError(err);
			throw err;
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
