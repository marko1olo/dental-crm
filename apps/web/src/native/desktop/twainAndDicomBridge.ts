/**
 * DENTE CRM — Desktop Windows (.EXE) TWAIN Sensors & DICOM Bridge (Layer 2)
 *
 * Direct hardware access for:
 * - Dental visiograph TWAIN acquisition & error classification.
 * - Local filesystem DICOM folder watching for incoming radiographs.
 * - COM/USB serial port listing.
 */

import { logger } from "../../utils/logger";
import { getDesktopNativeApi } from "./platformDetection";
import type {
	DesktopDicomFileEvent,
	DesktopSerialPortInfo,
	DesktopTwainDevice,
	TwainAcquisitionResult,
	TwainErrorCategory,
} from "./types";

/**
 * Safe wrapper for listing COM/USB serial ports in Desktop mode.
 */
export async function listDesktopSerialPorts(): Promise<DesktopSerialPortInfo[]> {
	const api = getDesktopNativeApi();
	if (!api) return [];
	try {
		return await api.listSerialPorts();
	} catch (err: unknown) {
		console.warn("[desktopBridge] listSerialPorts failed:", err);
		return [];
	}
}

/**
 * Safe wrapper for listing TWAIN dental sensors/scanners in Desktop mode.
 */
export async function listDesktopTwainDevices(): Promise<DesktopTwainDevice[]> {
	const api = getDesktopNativeApi();
	if (!api) return [];
	try {
		return await api.listTwainDevices();
	} catch (err: unknown) {
		console.warn("[desktopBridge] listTwainDevices failed:", err);
		return [];
	}
}

/**
 * Classifies raw TWAIN error strings and hardware fault codes into structured clinical diagnostics.
 */
export function classifyTwainHardwareError(rawError: string): {
	category: TwainErrorCategory;
	userFriendlyMessageRu: string;
} {
	const lower = (rawError || "").toLowerCase();

	if (
		lower.includes("disconnect") ||
		lower.includes("unplug") ||
		lower.includes("not found") ||
		lower.includes("not connected") ||
		lower.includes("twcc_nods") ||
		lower.includes("nodatasource") ||
		lower.includes("device_not_found") ||
		lower.includes("no device") ||
		lower.includes("usb")
	) {
		return {
			category: "usb_disconnected",
			userFriendlyMessageRu: "Визиограф отключен, проверьте USB-кабель и надежность подключения датчика к компьютеру.",
		};
	}

	if (
		lower.includes("crash") ||
		lower.includes("twrc_failure") ||
		lower.includes("driver") ||
		lower.includes("ds_failed") ||
		lower.includes("exception") ||
		lower.includes("dll") ||
		lower.includes("unhandled")
	) {
		return {
			category: "driver_crash",
			userFriendlyMessageRu: "Сбой драйвера TWAIN визиографа. Переподключите USB-датчик или перезапустите службу визиографа.",
		};
	}

	if (
		lower.includes("timeout") ||
		lower.includes("exposure") ||
		lower.includes("no radiation") ||
		lower.includes("time out")
	) {
		return {
			category: "exposure_timeout",
			userFriendlyMessageRu: "Время ожидания экспозиции рентген-луча истекло. Нажмите кнопку захвата и произведите снимок на рентген-аппарате.",
		};
	}

	if (
		lower.includes("cancel") ||
		lower.includes("abort") ||
		lower.includes("twrc_cancel") ||
		lower.includes("user")
	) {
		return {
			category: "user_cancelled",
			userFriendlyMessageRu: "Захват радиовизиографического снимка отменен врачом.",
		};
	}

	if (
		lower.includes("busy") ||
		lower.includes("in use") ||
		lower.includes("locked") ||
		lower.includes("acquiring")
	) {
		return {
			category: "device_busy",
			userFriendlyMessageRu: "Визиограф занят другим процессом. Дождитесь завершения предыдущего снимка.",
		};
	}

	return {
		category: "unknown_hardware_fault",
		userFriendlyMessageRu: rawError || "Ошибка работы с TWAIN-оборудованием визиографа.",
	};
}

/**
 * Safe wrapper for acquiring TWAIN dental radiographs in Desktop mode with error resilience.
 */
export async function acquireDesktopVisiographImage(deviceId: string): Promise<TwainAcquisitionResult> {
	const api = getDesktopNativeApi();
	if (!api) {
		return {
			success: false,
			error: "Функция прямого захвата TWAIN доступна только в приложении DENTE Desktop (.exe). В браузере используйте загрузку файлов или локальный мост.",
			errorCategory: "desktop_required",
			userFriendlyMessageRu: "Прямой захват снимков с USB-визиографа доступен в приложении DENTE Desktop (.exe).",
		};
	}

	try {
		const result = await api.acquireTwainImage(deviceId);
		if (result.success && result.dataBase64) {
			const dataUri = result.dataBase64.startsWith("data:")
				? result.dataBase64
				: `data:image/jpeg;base64,${result.dataBase64}`;
			return {
				success: true,
				dataUri,
			};
		}

		const rawError = result.error || "Не удалось получить снимок с TWAIN-датчика";
		const diag = classifyTwainHardwareError(rawError);

		return {
			success: false,
			error: rawError,
			errorCategory: diag.category,
			userFriendlyMessageRu: diag.userFriendlyMessageRu,
		};
	} catch (err: unknown) {
		const rawError = err instanceof Error ? err.message : "Ошибка работы с TWAIN-оборудованием";
		const diag = classifyTwainHardwareError(rawError);

		return {
			success: false,
			error: rawError,
			errorCategory: diag.category,
			userFriendlyMessageRu: diag.userFriendlyMessageRu,
		};
	}
}

/**
 * Watch local incoming X-ray DICOM directory for automatic image workup.
 */
export async function watchDesktopDicomFolder(
	folderPath: string,
	callbackId: string,
): Promise<{ success: boolean; error?: string }> {
	const api = getDesktopNativeApi();
	if (!api) {
		return {
			success: false,
			error: "Автоматический мониторинг локальных папок DICOM доступен в DENTE Desktop (.exe).",
		};
	}

	try {
		return await api.watchLocalDicomFolder(folderPath, callbackId);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Ошибка мониторинга папки DICOM";
		return { success: false, error: message };
	}
}

/**
 * Unwatch local incoming X-ray DICOM directory.
 */
export async function unwatchDesktopDicomFolder(
	folderPath: string,
): Promise<{ success: boolean }> {
	const api = getDesktopNativeApi();
	if (!api) return { success: false };
	try {
		return await api.unwatchLocalDicomFolder(folderPath);
	} catch (err: unknown) {
		logger.warn("[desktopBridge] unwatchLocalDicomFolder failed:", err);
		return { success: false };
	}
}

/**
 * Subscribe to incoming DICOM / Visiograph files detected in watched directory.
 */
export function subscribeDesktopDicomFiles(
	callback: (event: DesktopDicomFileEvent) => void,
): () => void {
	const api = getDesktopNativeApi();
	if (!api || !api.onDicomFileDetected) {
		return () => {};
	}
	return api.onDicomFileDetected(callback);
}
