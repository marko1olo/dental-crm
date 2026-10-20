/**
 * DENTE CRM — Runtime Navigation Actions (Layer 2)
 *
 * Programmatic client-side navigation, deep-linking URL builders,
 * and popout window dispatches across Desktop .EXE and Web Browser.
 */

import type { NavigationOptions } from "./runtimeRouterTypes.js";

/**
 * Programmatically transitions the active route/view without page reload or white flashes.
 */
export function navigateTo(targetRoute: string, options?: NavigationOptions): void {
	if (typeof window === "undefined") return;

	let cleanRoute = targetRoute.trim();
	if (cleanRoute.startsWith("#")) {
		cleanRoute = cleanRoute.slice(1);
	}

	const queryParts: string[] = [];
	if (options?.query) {
		const searchParams = new URLSearchParams();
		for (const [key, val] of Object.entries(options.query)) {
			if (val !== undefined && val !== null) {
				searchParams.set(key, String(val));
			}
		}
		const qs = searchParams.toString();
		if (qs) {
			queryParts.push(qs);
		}
	}

	const finalHash = `#${cleanRoute}${queryParts.length > 0 ? `?${queryParts.join("&")}` : ""}`;

	if (options?.replace) {
		const currentUrl = new URL(window.location.href);
		currentUrl.hash = finalHash;
		window.history.replaceState(options.state ?? null, "", currentUrl.toString());
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	} else {
		window.location.hash = finalHash;
	}
}

/**
 * Updates query parameters on the current location without changing the main view or reloading.
 */
export function updateQueryParams(
	params: Record<string, string | number | boolean | null | undefined>,
	replace = true,
): void {
	if (typeof window === "undefined") return;

	const [hashRoute, currentQuery] = window.location.hash.replace(/^#\/?/, "").split("?");
	const searchParams = new URLSearchParams(currentQuery || "");

	for (const [key, val] of Object.entries(params)) {
		if (val === undefined || val === null) {
			searchParams.delete(key);
		} else {
			searchParams.set(key, String(val));
		}
	}

	const qs = searchParams.toString();
	const newHash = `#${hashRoute || "shift"}${qs ? `?${qs}` : ""}`;

	if (replace) {
		const currentUrl = new URL(window.location.href);
		currentUrl.hash = newHash;
		window.history.replaceState(null, "", currentUrl.toString());
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	} else {
		window.location.hash = newHash;
	}
}

/**
 * Builds the canonical URL for launching the standalone CBCT Studio in a separate window.
 */
export function buildCbctStudioPopoutUrl(params: {
	studyId?: string | undefined;
	patientId?: string | undefined;
	patientName?: string | undefined;
	mode?: string | undefined;
	demo?: boolean | undefined;
}): string {
	const query = new URLSearchParams();
	query.set("view", "cbct-studio");
	if (params.studyId) query.set("studyId", params.studyId);
	if (params.patientId) query.set("patientId", params.patientId);
	if (params.patientName) query.set("patientName", params.patientName);
	if (params.mode) query.set("mode", params.mode);
	if (params.demo) query.set("demo", "true");

	return `/cbct-studio?${query.toString()}`;
}

/**
 * Dispatches opening the CBCT Studio into an autonomous window across Desktop .EXE and Web Browser.
 */
export async function routeOpenCbctPopout(params: {
	studyId?: string | undefined;
	patientId?: string | undefined;
	patientName?: string | undefined;
	mode?: string | undefined;
	demo?: boolean | undefined;
	width?: number | undefined;
	height?: number | undefined;
}): Promise<{ success: boolean; popoutWindow?: Window | null; fallbackUrl?: string; error?: string }> {
	const url = buildCbctStudioPopoutUrl(params);
	const { openCbctPopoutWindow } = await import("../../native/desktopBridge.js");
	const res = await openCbctPopoutWindow({
		url,
		...(params.studyId !== undefined ? { studyId: params.studyId } : {}),
		...(params.patientId !== undefined ? { patientId: params.patientId } : {}),
		...(params.patientName !== undefined ? { patientName: params.patientName } : {}),
		width: params.width ?? 1600,
		height: params.height ?? 1000,
	});
	return {
		success: res.success,
		...(res.popoutWindow !== undefined ? { popoutWindow: res.popoutWindow } : {}),
		...(res.fallbackUrl !== undefined ? { fallbackUrl: res.fallbackUrl } : {}),
		...(res.error !== undefined ? { error: res.error } : {}),
	};
}

/**
 * Builds the canonical URL for launching the standalone Cephalometric TRG Studio in a separate window.
 */
export function buildCephStudioPopoutUrl(params: {
	patientId?: string | undefined;
	patientName?: string | undefined;
	imageUrl?: string | undefined;
	mode?: string | undefined;
	demo?: boolean | undefined;
	patientDemo?: boolean | undefined;
}): string {
	const query = new URLSearchParams();
	query.set("view", "ceph-studio");
	if (params.patientId) query.set("patientId", params.patientId);
	if (params.patientName) query.set("patientName", params.patientName);
	if (params.imageUrl) query.set("imageUrl", params.imageUrl);
	if (params.mode) query.set("mode", params.mode);
	if (params.demo) query.set("demo", "true");
	if (params.patientDemo) query.set("patientDemo", "true");

	return `/radiology/ceph-studio?${query.toString()}`;
}

/**
 * Dispatches opening the Cephalometric TRG Studio into an autonomous window across Desktop .EXE and Web Browser.
 */
export async function routeOpenCephPopout(params: {
	patientId?: string | undefined;
	patientName?: string | undefined;
	imageUrl?: string | undefined;
	mode?: string | undefined;
	demo?: boolean | undefined;
	width?: number | undefined;
	height?: number | undefined;
}): Promise<{ success: boolean; popoutWindow?: Window | null | undefined; fallbackUrl?: string | undefined; error?: string | undefined }> {
	const url = buildCephStudioPopoutUrl(params);
	const { openCbctPopoutWindow } = await import("../../native/desktopBridge.js");
	const res = await openCbctPopoutWindow({
		url,
		...(params.patientId !== undefined ? { patientId: params.patientId } : {}),
		...(params.patientName !== undefined ? { patientName: params.patientName } : {}),
		title: `ТРГ Цефалометрия - ${params.patientName || "Пациент"}`,
		width: params.width ?? 1600,
		height: params.height ?? 1000,
	});
	return {
		success: res.success,
		...(res.popoutWindow !== undefined ? { popoutWindow: res.popoutWindow } : {}),
		...(res.fallbackUrl !== undefined ? { fallbackUrl: res.fallbackUrl } : {}),
		...(res.error !== undefined ? { error: res.error } : {}),
	};
}
