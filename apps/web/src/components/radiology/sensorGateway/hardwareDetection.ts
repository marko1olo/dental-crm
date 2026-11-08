/**
 * hardwareDetection.ts — Layer 2: Автоматическое обнаружение оборудования и диагностический тест соединения.
 *
 * Implements Mandate 8e (Doctor Autonomy, instant response <20ms, non-conflicting USB policy).
 * Defect Fix [RAD-03]: Eliminates fake simulation of visiograph in production.
 * Honest status: isDetected: false when physical hardware is not present.
 */

import type { SensorDetectionResult, SensorConnectionStatus } from "./types";
import { UNIVERSAL_SENSOR_CATALOG } from "./sensorCatalogs";
import { lookupSensorByUsbVidPid, NON_CONFLICTING_USB_POLICY } from "./twainAndUsbDrivers";
import { isDemoShowcaseMode } from "../../../lib/demoMode";

/**
 * Autonomously checks connected hardware (Passive WebUSB, Desktop Bridge, Hot Folder gateway)
 * and selects the active dental sensor without requiring doctor configuration or conflicting with vendor drivers.
 * In production: returns honest isDetected: false if no sensor is physically attached.
 */
export async function autoDetectConnectedSensor(): Promise<SensorDetectionResult> {
	// 1. Passive check if physical sensor device VID/PID is present on USB bus
	if (typeof navigator !== "undefined" && "usb" in navigator && (navigator as any).usb?.getDevices) {
		try {
			const usbDevices = await (navigator as any).usb.getDevices();
			for (const dev of usbDevices) {
				const match = lookupSensorByUsbVidPid(dev.vendorId, dev.productId);
				if (match) {
					const model = UNIVERSAL_SENSOR_CATALOG.find((s) => s.id === match.defaultModelId) || UNIVERSAL_SENSOR_CATALOG[0]!;
					return {
						isDetected: true,
						sensorModelId: model.id,
						sensorModelName: model.name,
						brand: match.brand,
						brandName: match.brandName,
						intakeChannel: "hot_folder", // Бесконфликтный приоритет: софт вендора держит USB, CRM подхватывает готовый кадр
						calibratedPixelSpacingMm: model.pixelSpacing,
						calibratedResolution: model.resolution,
						statusMessage: `Ожидание снимка (Hot Folder / Автоподхват) — Обнаружен сенсор: ${model.name}`,
						details: `Контроллер: ${match.controllerChip}. ${NON_CONFLICTING_USB_POLICY.notice}`,
						nonConflictingNotice: NON_CONFLICTING_USB_POLICY.notice,
					};
				}
			}
		} catch {
			// WebUSB silent fall-through
		}
	}

	// 2. Query local hardware bridge or Fastify hardware route (/api/hardware/sensor-status)
	try {
		if (typeof fetch === "function") {
			const resp = await fetch("/api/hardware/sensor-status", {
				headers: { Accept: "application/json" },
				signal: typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(500) : undefined,
			});
			if (resp.ok) {
				const data = await resp.json();
				if (data?.isDetected && data.sensorModelId && data.sensorModelId !== "none") {
					const model = UNIVERSAL_SENSOR_CATALOG.find((s) => s.id === data.sensorModelId) || UNIVERSAL_SENSOR_CATALOG[0]!;
					return {
						isDetected: true,
						sensorModelId: model.id,
						sensorModelName: model.name,
						brand: model.brand,
						brandName: model.brandName,
						intakeChannel: data.intakeChannel || "hot_folder",
						calibratedPixelSpacingMm: model.pixelSpacing,
						calibratedResolution: model.resolution,
						statusMessage: data.statusMessage || `Ожидание снимка (Hot Folder / Автоподхват) — Обнаружен сенсор: ${model.name}`,
						details: data.details || `Шлюз оборудования: ${model.name}. ${NON_CONFLICTING_USB_POLICY.notice}`,
						nonConflictingNotice: NON_CONFLICTING_USB_POLICY.notice,
					};
				}
			}
		}
	} catch {
		// Quiet network fallback
	}

	// 3. Isolated showcase demo mode: provides virtual sensor for presentations
	if (isDemoShowcaseMode()) {
		const demoSensor = UNIVERSAL_SENSOR_CATALOG.find((s) => s.id === "vatech_ezsensor_hd") || UNIVERSAL_SENSOR_CATALOG[0]!;
		return {
			isDetected: true,
			sensorModelId: demoSensor.id,
			sensorModelName: demoSensor.name,
			brand: demoSensor.brand,
			brandName: demoSensor.brandName,
			intakeChannel: "hot_folder",
			calibratedPixelSpacingMm: demoSensor.pixelSpacing,
			calibratedResolution: demoSensor.resolution,
			statusMessage: `Демо-стенд: Эмуляция сенсора ${demoSensor.name} (${demoSensor.resolution})`,
			details: `Демонстрационный режим витрины. Папка автозахвата: ${demoSensor.recommendedHotFolder}. ${NON_CONFLICTING_USB_POLICY.notice}`,
			nonConflictingNotice: NON_CONFLICTING_USB_POLICY.notice,
		};
	}

	// 4. Honest Production State: No physical sensor attached to workstation
	return {
		isDetected: false,
		sensorModelId: "none",
		sensorModelName: "Датчик не обнаружен",
		brand: "generic",
		brandName: "Оборудование не подключено",
		intakeChannel: "hot_folder",
		calibratedPixelSpacingMm: 0.035,
		calibratedResolution: "—",
		statusMessage: "Датчик не обнаружен",
		details: "Подключите USB-визиограф или выберите сетевую папку (Hot Folder) вендорного ПО",
		nonConflictingNotice: NON_CONFLICTING_USB_POLICY.notice,
	};
}

/**
 * Diagnostic ping testing communication with the physical sensor.
 * Returns honest health status without fake hardcoded simulation.
 */
export async function testSensorConnection(sensorModelId: string): Promise<SensorConnectionStatus> {
	const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
	const elapsedMs = Math.max(1, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0));

	if (!sensorModelId || sensorModelId === "none") {
		return {
			isReady: false,
			statusText: "Статус: Датчик не подключен",
			latencyMs: elapsedMs,
			timestampIso: new Date().toISOString(),
			calibratedPixelSpacingMm: 0.035,
			calibratedResolution: "—",
			bitDepth: 14,
			intakeChannel: "hot_folder",
			nonConflictingNotice: NON_CONFLICTING_USB_POLICY.notice,
		};
	}

	const sensor = UNIVERSAL_SENSOR_CATALOG.find((s) => s.id === sensorModelId);
	if (!sensor) {
		return {
			isReady: false,
			statusText: "Статус: Неизвестная модель сенсора",
			latencyMs: elapsedMs,
			timestampIso: new Date().toISOString(),
			calibratedPixelSpacingMm: 0.035,
			calibratedResolution: "—",
			bitDepth: 14,
			intakeChannel: "hot_folder",
			nonConflictingNotice: NON_CONFLICTING_USB_POLICY.notice,
		};
	}

	// 1. Check if device is physically active on WebUSB
	if (typeof navigator !== "undefined" && "usb" in navigator && (navigator as any).usb?.getDevices) {
		try {
			const usbDevices = await (navigator as any).usb.getDevices();
			for (const dev of usbDevices) {
				const match = lookupSensorByUsbVidPid(dev.vendorId, dev.productId);
				if (match && (match.defaultModelId === sensor.id || match.brand === sensor.brand)) {
					return {
						isReady: true,
						statusText: `Статус: Сенсор ${sensor.name} готов к экспозиции (USB)`,
						latencyMs: Math.max(1, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0)),
						timestampIso: new Date().toISOString(),
						calibratedPixelSpacingMm: sensor.pixelSpacing,
						calibratedResolution: sensor.resolution,
						bitDepth: sensor.bitDepth,
						intakeChannel: "hot_folder",
						nonConflictingNotice: NON_CONFLICTING_USB_POLICY.notice,
					};
				}
			}
		} catch {
			// fall-through
		}
	}

	// 2. Query hardware bridge status
	try {
		if (typeof fetch === "function") {
			const resp = await fetch(`/api/hardware/sensor-status?modelId=${encodeURIComponent(sensor.id)}`, {
				headers: { Accept: "application/json" },
				signal: typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(500) : undefined,
			});
			if (resp.ok) {
				const data = await resp.json();
				if (data?.connected) {
					return {
						isReady: true,
						statusText: data.statusMessage || `Статус: Сенсор ${sensor.name} готов к экспозиции`,
						latencyMs: Math.max(1, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0)),
						timestampIso: new Date().toISOString(),
						calibratedPixelSpacingMm: sensor.pixelSpacing,
						calibratedResolution: sensor.resolution,
						bitDepth: sensor.bitDepth,
						intakeChannel: data.intakeChannel || "hot_folder",
						nonConflictingNotice: NON_CONFLICTING_USB_POLICY.notice,
					};
				}
			}
		}
	} catch {
		// fall-through
	}

	// 3. Isolated demo showcase mode
	if (isDemoShowcaseMode()) {
		return {
			isReady: true,
			statusText: `Демо: Сенсор ${sensor.name} готов к экспозиции (Эмуляция)`,
			latencyMs: Math.max(1, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0)),
			timestampIso: new Date().toISOString(),
			calibratedPixelSpacingMm: sensor.pixelSpacing,
			calibratedResolution: sensor.resolution,
			bitDepth: sensor.bitDepth,
			intakeChannel: "hot_folder",
			nonConflictingNotice: NON_CONFLICTING_USB_POLICY.notice,
		};
	}

	// 4. Honest Production State: Physical sensor hardware did not reply
	return {
		isReady: false,
		statusText: `Статус: Датчик ${sensor.name} не обнаружен (проверьте USB или Hot Folder)`,
		latencyMs: Math.max(1, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0)),
		timestampIso: new Date().toISOString(),
		calibratedPixelSpacingMm: sensor.pixelSpacing,
		calibratedResolution: sensor.resolution,
		bitDepth: sensor.bitDepth,
		intakeChannel: "hot_folder",
		nonConflictingNotice: NON_CONFLICTING_USB_POLICY.notice,
	};
}

export const detectConnectedSensors = autoDetectConnectedSensor;

