/**
 * DENTE CRM — Desktop Secondary Monitor CT / CBCT Popout Controller
 * Mandate 8b (<= 120 lines).
 */

import { logger } from "../../utils/logger";
import { getDesktopNativeApi } from "./platformDetection";

export async function openCbctPopoutWindow(params: {
	url?: string | undefined;
	studyId?: string | undefined;
	patientId?: string | undefined;
	patientName?: string | undefined;
	title?: string | undefined;
	targetDisplayId?: number | undefined;
	width?: number | undefined;
	height?: number | undefined;
}): Promise<{
	success: boolean;
	windowId?: number | undefined;
	isNewWindow?: boolean | undefined;
	url?: string | undefined;
	popoutWindow?: Window | null | undefined;
	fallbackUrl?: string | undefined;
	error?: string | undefined;
}> {
	const api = getDesktopNativeApi();
	if (api?.openCbctPopoutWindow) {
		try {
			const res = await api.openCbctPopoutWindow(params);
			const out: Record<string, any> = { success: res.success };
			if (res.windowId !== undefined) out.windowId = res.windowId;
			if (res.isNewWindow !== undefined) out.isNewWindow = res.isNewWindow;
			if (res.url !== undefined) { out.url = res.url; out.fallbackUrl = res.url; }
			if (res.error !== undefined) out.error = res.error;
			return out as any;
		} catch (err: unknown) {
			logger.warn("[desktopBridge] native openCbctPopoutWindow failed:", err);
		}
	}

	if (typeof window !== "undefined") {
		const targetUrl = params.url ||
			`/cbct-studio?studyId=${encodeURIComponent(params.studyId || "")}&patientId=${encodeURIComponent(params.patientId || "")}${params.patientName ? `&patientName=${encodeURIComponent(params.patientName)}` : ""}`;
		const width = params.width ?? 1600;
		const height = params.height ?? 1000;
		const features = `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`;
		try {
			const winName = params.title ? `dente-ct-${encodeURIComponent(params.title)}` : "dente_cbct_studio";
			const opened = window.open(targetUrl, winName, features);
			if (opened) return { success: true, popoutWindow: opened, fallbackUrl: targetUrl, url: targetUrl, isNewWindow: true };
			return { success: false, popoutWindow: null, fallbackUrl: targetUrl, url: targetUrl, error: "popup_blocked" };
		} catch (err: unknown) {
			return { success: false, popoutWindow: null, fallbackUrl: targetUrl, url: targetUrl, error: err instanceof Error ? err.message : String(err) };
		}
	}
	return { success: false, error: "window_unavailable" };
}

export async function openInNewWindow(params: {
	url: string;
	title?: string | undefined;
	studyId?: string | undefined;
	patientId?: string | undefined;
}): Promise<{ success: boolean; error?: string | undefined }> {
	const api = getDesktopNativeApi();
	if (api?.openInNewWindow) {
		try {
			return await api.openInNewWindow(params);
		} catch (err: unknown) {
			return { success: false, error: err instanceof Error ? err.message : "Сбой запуска отдельного окна" };
		}
	}
	const popoutParams: Parameters<typeof openCbctPopoutWindow>[0] = { url: params.url };
	if (params.title !== undefined) popoutParams.title = params.title;
	if (params.studyId !== undefined) popoutParams.studyId = params.studyId;
	if (params.patientId !== undefined) popoutParams.patientId = params.patientId;
	const res = await openCbctPopoutWindow(popoutParams);
	const out: { success: boolean; error?: string | undefined } = { success: res.success };
	if (res.error !== undefined) out.error = res.error;
	return out;
}
