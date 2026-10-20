/**
 * DENTE CRM — Runtime Route Matcher (Layer 1)
 *
 * Pure route, hash, URL and role permission matching engine.
 * Free of side-effects.
 */

import type { StaffRole } from "@dental/shared";
import { type AppView, appViews, getFilteredAppViews, getFallbackAppView } from "../routeUtils.js";
import type {
	CbctStudioRouteParams,
	CephStudioRouteParams,
	RuntimeRouteMatch,
} from "./runtimeRouterTypes.js";

/**
 * Validates whether the given staff role is permitted to access the requested view.
 */
export function validateRouteRoleAccess(route: AppView, role?: StaffRole): boolean {
	if (!role) return true;
	const allowed = getFilteredAppViews(role);
	return allowed.includes(route);
}

/**
 * Resolves alias routes (e.g. #emk -> visit, #sanpin -> scanner, etc.) to canonical AppView.
 */
export function normalizeRouteToken(rawToken: string): AppView {
	const cleaned = rawToken.toLowerCase().trim();
	if (cleaned === "emk" || cleaned === "visits") return "visit";
	if (cleaned === "sanpin" || cleaned === "sterilization") return "scanner";
	if (cleaned === "cmo") return "analytics";
	if (cleaned === "telephony") return "communications";
	if (cleaned === "lab-orders" || cleaned === "lab_orders") return "lab";
	if (cleaned === "invoices") return "finance";
	if (cleaned === "radiology" || cleaned === "ct" || cleaned === "cbct") return "imaging";

	return (appViews as readonly string[]).includes(cleaned)
		? (cleaned as AppView)
		: "shift";
}

/**
 * Matches an input URL or location hash to an authoritative RuntimeRouteMatch.
 */
export function matchRuntimeRoute(rawUrlOrHash?: string, userRole?: StaffRole): RuntimeRouteMatch {
	let raw = rawUrlOrHash;
	if (raw === undefined && typeof window !== "undefined") {
		raw = window.location.hash || window.location.pathname;
	}
	const safeRaw = raw || "#shift";

	const [hashBeforeQuery, queryString] = safeRaw.replace(/^#\/?/, "").split("?");
	const parts = (hashBeforeQuery ?? "").split("/").filter(Boolean);
	const primaryToken = parts[0] || "shift";
	const subPath = parts.slice(1).join("/") || undefined;

	const queryParams: Record<string, string> = {};
	if (queryString) {
		const searchParams = new URLSearchParams(queryString);
		for (const [key, val] of searchParams.entries()) {
			queryParams[key] = val;
		}
	}

	const route = normalizeRouteToken(primaryToken);
	const isAllowed = validateRouteRoleAccess(route, userRole);
	const fallbackRoute = isAllowed ? undefined : (userRole ? getFallbackAppView(userRole) : "shift");

	return {
		route: isAllowed ? route : (fallbackRoute ?? "shift"),
		rawHash: safeRaw,
		subPath,
		queryParams,
		isAllowed,
		userRole,
		fallbackRoute,
	};
}

/**
 * Authoritatively parses whether the current window/URL is directed to the standalone
 * CBCT Radiology Studio Cockpit (/cbct-studio or ?view=cbct-studio).
 */
export function parseCbctStudioRoute(
	targetUrl?: string | Location | { pathname?: string; search?: string; hash?: string },
): CbctStudioRouteParams {
	if (typeof window === "undefined" && !targetUrl) {
		return { isCbctStudio: false };
	}

	let pathname = "";
	let search = "";
	let hash = "";

	if (typeof targetUrl === "string") {
		try {
			const parsed = new URL(targetUrl, "http://localhost");
			pathname = parsed.pathname;
			search = parsed.search;
			hash = parsed.hash;
		} catch {
			pathname = targetUrl;
		}
	} else if (targetUrl) {
		pathname = targetUrl.pathname || "";
		search = targetUrl.search || "";
		hash = targetUrl.hash || "";
	} else if (typeof window !== "undefined") {
		pathname = window.location.pathname || "";
		search = window.location.search || "";
		hash = window.location.hash || "";
	}

	const searchParams = new URLSearchParams(search);
	const hashClean = hash.replace(/^#\/?/, "");
	const hashParams = new URLSearchParams(hashClean.includes("?") ? hashClean.slice(hashClean.indexOf("?")) : "");

	const isPathMatch =
		pathname === "/cbct-studio" ||
		pathname.startsWith("/cbct-studio/") ||
		pathname === "/cbct" ||
		pathname.startsWith("/cbct/");

	const isSearchMatch =
		searchParams.get("view") === "cbct-studio" ||
		searchParams.get("view") === "cbct" ||
		searchParams.get("cbct") === "studio" ||
		searchParams.get("cbct") === "standalone";

	const isHashMatch =
		hashClean === "cbct-studio" ||
		hashClean.startsWith("cbct-studio?") ||
		hashClean.startsWith("cbct-studio/") ||
		hashParams.get("view") === "cbct-studio";

	const isCbctStudio = isPathMatch || isSearchMatch || isHashMatch;

	const studyId =
		searchParams.get("studyId") ||
		searchParams.get("study_id") ||
		hashParams.get("studyId") ||
		undefined;

	const patientId =
		searchParams.get("patientId") ||
		searchParams.get("patient_id") ||
		hashParams.get("patientId") ||
		undefined;

	const patientName =
		searchParams.get("patientName") ||
		searchParams.get("patient_name") ||
		hashParams.get("patientName") ||
		undefined;

	const mode =
		searchParams.get("mode") ||
		hashParams.get("mode") ||
		undefined;

	const isDemo =
		searchParams.get("demo") === "true" ||
		searchParams.get("cbct") === "demo" ||
		searchParams.get("cbct") === "1" ||
		hashClean.includes("demo") ||
		undefined;

	return {
		isCbctStudio,
		studyId,
		patientId,
		patientName,
		mode,
		isDemo,
	};
}

/**
 * Authoritatively parses whether the current window/URL is directed to the standalone
 * Cephalometric TRG Studio (/radiology/ceph-studio, /ceph-studio or ?view=ceph-studio).
 */
export function parseCephStudioRoute(targetUrl?: string | Location): CephStudioRouteParams {
	if (typeof window === "undefined" && !targetUrl) {
		return { isCephStudio: false };
	}

	let pathname = "";
	let search = "";
	let hash = "";

	if (typeof targetUrl === "string") {
		try {
			const parsed = new URL(targetUrl, "http://localhost");
			pathname = parsed.pathname;
			search = parsed.search;
			hash = parsed.hash;
		} catch {
			pathname = targetUrl;
		}
	} else if (targetUrl) {
		pathname = targetUrl.pathname || "";
		search = targetUrl.search || "";
		hash = targetUrl.hash || "";
	} else if (typeof window !== "undefined") {
		pathname = window.location.pathname || "";
		search = window.location.search || "";
		hash = window.location.hash || "";
	}

	const searchParams = new URLSearchParams(search);
	const hashClean = hash.replace(/^#\/?/, "");
	const hashParams = new URLSearchParams(hashClean.includes("?") ? hashClean.slice(hashClean.indexOf("?")) : "");

	const isPathMatch =
		pathname === "/ceph-studio" ||
		pathname.startsWith("/ceph-studio/") ||
		pathname === "/radiology/ceph-studio" ||
		pathname.startsWith("/radiology/ceph-studio/") ||
		pathname === "/ceph" ||
		pathname.startsWith("/ceph/");

	const isSearchMatch =
		searchParams.get("view") === "ceph-studio" ||
		searchParams.get("view") === "ceph" ||
		searchParams.get("ceph") === "studio" ||
		searchParams.get("ceph") === "standalone";

	const isHashMatch =
		hashClean === "ceph" ||
		hashClean.startsWith("ceph?") ||
		hashClean.startsWith("ceph/") ||
		hashClean === "ceph-studio" ||
		hashClean.startsWith("ceph-studio?") ||
		hashClean.startsWith("ceph-studio/") ||
		hashClean === "radiology/ceph-studio" ||
		hashParams.get("view") === "ceph-studio" ||
		hashParams.get("view") === "ceph";

	const isCephStudio = isPathMatch || isSearchMatch || isHashMatch;

	const patientId =
		searchParams.get("patientId") ||
		searchParams.get("patient_id") ||
		hashParams.get("patientId") ||
		undefined;

	const patientName =
		searchParams.get("patientName") ||
		searchParams.get("patient_name") ||
		hashParams.get("patientName") ||
		undefined;

	const imageUrl =
		searchParams.get("imageUrl") ||
		searchParams.get("image_url") ||
		hashParams.get("imageUrl") ||
		undefined;

	const mode =
		searchParams.get("mode") ||
		hashParams.get("mode") ||
		undefined;

	const isDemo =
		searchParams.get("demo") === "true" ||
		searchParams.get("ceph") === "demo" ||
		hashClean.includes("demo") ||
		undefined;

	const demoMode =
		searchParams.get("patientDemo") === "true" ||
		hashParams.get("patientDemo") === "true" ||
		undefined;

	return {
		isCephStudio,
		patientId,
		patientName,
		imageUrl,
		mode,
		isDemo,
		demoMode,
	};
}
