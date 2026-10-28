/**
 * DENTE CRM — Desktop CT / CBCT Viewer Detection
 * Mandate 8b (<= 120 lines).
 */

import { logger } from "../../utils/logger";
import { getDesktopNativeApi } from "./platformDetection";
import type { DesktopExternalViewerInfo, InstalledCtViewerInfo, RecentDownloadsCtItem, ScanDownloadsCtOptions } from "./types";

/** Scan local user Downloads folder for fresh CT / CBCT archives and DICOM folders. */
export async function scanDownloadsForCt(options?: ScanDownloadsCtOptions): Promise<RecentDownloadsCtItem[]> {
	const api = getDesktopNativeApi();
	if (api?.scanDownloadsForCt) {
		try {
			return await api.scanDownloadsForCt(options);
		} catch (err: unknown) {
			logger.warn("[desktopBridge] scanDownloadsForCt failed:", err);
			return [];
		}
	}
	return [];
}

/** Detects installed CT / CBCT viewers on Windows system or returns built-in MPR studio. */
export async function detectInstalledCtViewers(): Promise<InstalledCtViewerInfo[]> {
	const api = getDesktopNativeApi();
	if (api?.detectInstalledCtViewers) {
		try {
			return await api.detectInstalledCtViewers();
		} catch (err: unknown) {
			logger.warn("[desktopBridge] detectInstalledCtViewers failed:", err);
		}
	}
	return [
		{
			id: "dente-cbct-studio",
			name: "DENTE 3D MPR Студия (Встроенная)",
			vendor: "dente",
			exePath: "internal://cbct-studio",
			iconKey: "dente",
			isDefault: true,
		},
	];
}

/** Legacy alias for detectInstalledCtViewers returning DesktopExternalViewerInfo[]. */
export async function detectExternalCtViewers(): Promise<DesktopExternalViewerInfo[]> {
	const installed = await detectInstalledCtViewers();
	return installed.map((v) => {
		const info: DesktopExternalViewerInfo = {
			id: v.id,
			name: v.name,
			vendor: v.vendor,
			executablePath: v.exePath,
			isAvailable: Boolean(v.exePath) && v.exePath !== "",
			isDefault: v.isDefault,
		};
		if (v.iconKey) info.icon = v.iconKey;
		return info;
	});
}
