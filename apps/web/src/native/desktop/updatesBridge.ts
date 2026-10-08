/**
 * DENTE CRM — Desktop Windows (.EXE) Silent Updates Bridge (Layer 2)
 *
 * Checks, downloads and triggers silent background auto-updates
 * for Electron desktop application host process.
 */

import { getDesktopNativeApi } from "./platformDetection";
import type { DesktopUpdateInfo, DesktopUpdateInstallResult } from "./types";

/**
 * Checks for desktop application updates quietly in the background.
 */
export async function checkDesktopUpdates(): Promise<DesktopUpdateInfo> {
	const api = getDesktopNativeApi();
	if (api?.checkForUpdates) {
		try {
			return await api.checkForUpdates();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка проверки обновлений";
			return {
				updateAvailable: false,
				currentVersion: api.version || "0.1.0",
				latestVersion: api.version || "0.1.0",
				error: message,
			};
		}
	}

	return {
		updateAvailable: false,
		currentVersion: "0.1.0",
		latestVersion: "0.1.0",
		releaseNotes: "Автоматическое обновление доступно в приложении DENTE Desktop (.exe).",
	};
}

/**
 * Initiates installation and application restart for downloaded desktop update.
 */
export async function installDesktopUpdate(): Promise<DesktopUpdateInstallResult> {
	const api = getDesktopNativeApi();
	if (api?.installUpdate) {
		try {
			return await api.installUpdate();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка установки обновления";
			return { success: false, error: message };
		}
	}

	return {
		success: false,
		error: "Установка обновлений поддерживается в DENTE Desktop (.exe).",
	};
}

/**
 * Subscribes to background update notifications dispatched by Electron main process.
 */
export function subscribeDesktopUpdates(
	callback: (info: DesktopUpdateInfo) => void,
): () => void {
	const api = getDesktopNativeApi();
	if (api?.onUpdateAvailable) {
		return api.onUpdateAvailable(callback);
	}
	return () => {};
}
