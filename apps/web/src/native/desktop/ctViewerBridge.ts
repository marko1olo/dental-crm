/**
 * DENTE CRM — Desktop Windows (.EXE) 3D CT / CBCT Viewer Bridge (Layer 2)
 *
 * External DICOM viewer launcher and secondary monitor pop-out controller:
 * - Detects installed CT viewers (Picasso, Ez3D / EzDent-i, Romexis, OnDemand3D).
 * - Scans local Downloads folder for fresh CT archives.
 * - Opens CBCT 3D MPR Radiology Studio in dedicated secondary desktop window.
 */

import { logger } from "../../utils/logger";
import { getDesktopNativeApi } from "./platformDetection";
import type {
	DesktopExternalViewerInfo,
	InstalledCtViewerInfo,
	LaunchCtViewerParams,
	LaunchCtViewerResult,
	RecentDownloadsCtItem,
	ScanDownloadsCtOptions,
} from "./types";

/**
 * Scan local user Downloads folder for fresh CT / CBCT archives and DICOM folders.
 * In desktop mode queries native bridge; in web mode returns empty array (zero mocks).
 */
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

/**
 * Detects installed CT / CBCT viewers on Windows system or returns built-in MPR studio.
 * Supports Picasso, Ez3D2009/Ez3D-i, Romexis, OnDemand3D and internal DENTE CBCT Studio.
 */
export async function detectInstalledCtViewers(): Promise<InstalledCtViewerInfo[]> {
	const api = getDesktopNativeApi();
	if (api?.detectInstalledCtViewers) {
		try {
			return await api.detectInstalledCtViewers();
		} catch (err: unknown) {
			logger.warn("[desktopBridge] detectInstalledCtViewers failed:", err);
		}
	}
	// Fallback when not running in Electron or bridge call failed:
	// Always guarantee internal DENTE CBCT Studio availability (Mandate Zero Dead-Ends).
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

/**
 * Legacy alias for detectInstalledCtViewers returning DesktopExternalViewerInfo[].
 */
export async function detectExternalCtViewers(): Promise<DesktopExternalViewerInfo[]> {
	const installed = await detectInstalledCtViewers();
	return installed.map((v) => ({
		id: v.id,
		name: v.name,
		vendor: v.vendor,
		executablePath: v.exePath,
		isAvailable: Boolean(v.exePath) && v.exePath !== "",
		icon: v.iconKey,
		isDefault: v.isDefault,
	}));
}

/**
 * Opens CBCT 3D MPR Radiology Studio in dedicated secondary desktop window or browser pop-out.
 * Automatically targets secondary monitor if available or opens popup window (1600x1000).
 */
export async function openCbctPopoutWindow(params: {
	url?: string;
	studyId?: string;
	patientId?: string;
	patientName?: string;
	title?: string;
	targetDisplayId?: number;
	width?: number;
	height?: number;
}): Promise<{
	success: boolean;
	windowId?: number;
	isNewWindow?: boolean;
	url?: string;
	popoutWindow?: Window | null;
	fallbackUrl?: string;
	error?: string;
}> {
	const api = getDesktopNativeApi();
	if (api?.openCbctPopoutWindow) {
		try {
			const res = await api.openCbctPopoutWindow(params);
			return {
				success: res.success,
				windowId: res.windowId,
				isNewWindow: res.isNewWindow,
				url: res.url,
				fallbackUrl: res.url,
				error: res.error,
			};
		} catch (err: unknown) {
			logger.warn("[desktopBridge] native openCbctPopoutWindow failed:", err);
		}
	}

	if (typeof window !== "undefined") {
		const targetUrl =
			params.url ||
			`/cbct-studio?studyId=${encodeURIComponent(params.studyId || "")}&patientId=${encodeURIComponent(params.patientId || "")}${params.patientName ? `&patientName=${encodeURIComponent(params.patientName)}` : ""}`;
		const width = params.width ?? 1600;
		const height = params.height ?? 1000;
		const features = `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`;
		try {
			const winName = params.title ? `dente-ct-${encodeURIComponent(params.title)}` : "dente_cbct_studio";
			const opened = window.open(targetUrl, winName, features);
			if (opened) {
				return {
					success: true,
					popoutWindow: opened,
					fallbackUrl: targetUrl,
					url: targetUrl,
					isNewWindow: true,
				};
			}
			return {
				success: false,
				popoutWindow: null,
				fallbackUrl: targetUrl,
				url: targetUrl,
				error: "popup_blocked",
			};
		} catch (err: unknown) {
			return {
				success: false,
				popoutWindow: null,
				fallbackUrl: targetUrl,
				url: targetUrl,
				error: err instanceof Error ? err.message : String(err),
			};
		}
	}

	return { success: false, error: "window_unavailable" };
}

/**
 * Safely launches external CT / DICOM viewer process (Picasso, Ez3D, Romexis, OnDemand3D)
 * or opens internal DENTE 3D MPR Studio.
 */
export async function launchExternalCtViewer(params: LaunchCtViewerParams): Promise<LaunchCtViewerResult> {
	const api = getDesktopNativeApi();
	if (api?.launchExternalCtViewer) {
		try {
			return await api.launchExternalCtViewer(params);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Сбой запуска просмотрщика КТ";
			logger.warn("[desktopBridge] launchExternalCtViewer failed:", err);
			return { success: false, error: message };
		}
	}

	// Web / PWA fallback for internal studio
	if (params.viewerId === "dente-cbct-studio" || params.exePath === "internal://cbct-studio" || !params.viewerId) {
		const popout = await openCbctPopoutWindow({
			url: params.studyPath ? `/cbct-studio?studyId=${encodeURIComponent(params.studyPath)}` : undefined,
			studyId: params.studyPath,
		});
		return {
			success: popout.success,
			viewerName: "DENTE 3D MPR Studio (Web)",
			windowId: popout.windowId,
			error: popout.error,
		};
	}

	return {
		success: false,
		error: "Запуск нативного вьюера томографа (Picasso, Ez3D, Romexis) доступен в приложении DENTE Desktop (.exe).",
	};
}

/**
 * Open CT scan in external standalone viewer app (legacy wrapper).
 */
export async function openInExternalViewer(params: {
	viewerId: string;
	filePath?: string;
	archivePath?: string;
}): Promise<{ success: boolean; error?: string }> {
	const res = await launchExternalCtViewer({
		viewerId: params.viewerId,
		studyPath: params.filePath || params.archivePath,
	});
	return { success: res.success, error: res.error };
}

/**
 * Launch CT viewer in a dedicated standalone window (e.g. for secondary medical monitor).
 */
export async function openInNewWindow(params: {
	url: string;
	title?: string;
	studyId?: string;
	patientId?: string;
}): Promise<{ success: boolean; error?: string }> {
	const api = getDesktopNativeApi();
	if (api?.openInNewWindow) {
		try {
			return await api.openInNewWindow(params);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Сбой запуска отдельного окна";
			return { success: false, error: message };
		}
	}

	const res = await openCbctPopoutWindow({
		url: params.url,
		title: params.title,
		studyId: params.studyId,
		patientId: params.patientId,
	});
	return { success: res.success, error: res.error };
}
