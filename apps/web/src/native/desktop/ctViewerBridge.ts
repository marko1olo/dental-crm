/**
 * DENTE CRM — Desktop Windows (.EXE) 3D CT / CBCT Viewer Bridge (Facade)
 * Standards: DICOM Part 3, Mandate 8b (<= 120 lines).
 */

import { logger } from "../../utils/logger";
import { getDesktopNativeApi } from "./platformDetection";
import type { LaunchCtViewerParams, LaunchCtViewerResult } from "./types";
import { openCbctPopoutWindow } from "./ctPopoutWindow";

export { scanDownloadsForCt, detectInstalledCtViewers, detectExternalCtViewers } from "./ctInstalledDetection";
export { openCbctPopoutWindow, openInNewWindow } from "./ctPopoutWindow";

/**
 * Safely launches external CT / DICOM viewer process (Picasso, Ez3D, Romexis, OnDemand3D, Sidexis, 3Shape)
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
			return { success: false, error: message, canFallbackToInternalStudio: true };
		}
	}

	if (params.viewerId === "dente-cbct-studio" || params.exePath === "internal://cbct-studio" || !params.viewerId) {
		const popoutParams: Parameters<typeof openCbctPopoutWindow>[0] = {};
		if (params.studyPath) {
			popoutParams.url = `/cbct-studio?studyId=${encodeURIComponent(params.studyPath)}`;
			popoutParams.studyId = params.studyPath;
		}
		const popout = await openCbctPopoutWindow(popoutParams);
		const result: LaunchCtViewerResult = {
			success: popout.success,
			viewerName: "DENTE 3D MPR Studio (Web)",
		};
		if (popout.windowId !== undefined) result.windowId = popout.windowId;
		if (popout.error !== undefined) result.error = popout.error;
		return result;
	}

	if (typeof window !== "undefined") {
		try {
			const res = await fetch("/api/imaging/launch-external-viewer", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(params),
			});
			if (res.ok) {
				const data = (await res.json()) as {
					success: boolean;
					viewerName?: string;
					error?: string;
					canFallbackToInternalStudio?: boolean;
				};
				if (data.success) {
					return { success: true, viewerName: data.viewerName || "Нативный просмотрщик КТ" };
				}
				return {
					success: false,
					error: data.error || "Просмотрщик КТ не найден на данном компьютере",
					canFallbackToInternalStudio: true,
				};
			}
		} catch {
			// Backend offline or unreachable
		}
	}

	return {
		success: false,
		error: "Для запуска нативного просмотрщика томографа используйте приложение DENTE Desktop (.EXE) на Windows.",
		canFallbackToInternalStudio: true,
	};
}

/** Open CT scan in external standalone viewer app (legacy wrapper). */
export async function openInExternalViewer(params: {
	viewerId: string;
	filePath?: string | undefined;
	archivePath?: string | undefined;
}): Promise<{ success: boolean; error?: string | undefined; canFallbackToInternalStudio?: boolean | undefined }> {
	const launchParams: LaunchCtViewerParams = { viewerId: params.viewerId };
	const p = params.filePath || params.archivePath;
	if (p) launchParams.studyPath = p;
	const res = await launchExternalCtViewer(launchParams);
	const out: { success: boolean; error?: string | undefined; canFallbackToInternalStudio?: boolean | undefined } = {
		success: res.success,
	};
	if (res.error !== undefined) out.error = res.error;
	if (res.canFallbackToInternalStudio !== undefined) out.canFallbackToInternalStudio = res.canFallbackToInternalStudio;
	return out;
}
