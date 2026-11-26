/**
 * appRoutingHelpers.ts — Реэкспорты и вспомогательные функции URL-маршрутизации.
 * Заменяет прежние 125 standalone-токенов единым SSOT (`routeResolver.ts`),
 * сохраняя рабочее место смонтированным на любом URL-маршруте.
 */

import { parseTopLevelSurface, resolveClinicRoute } from "../router/routeResolver.js";

export function hasLocationToken(
	customSearch: string,
	customHash: string,
	tokens: readonly string[],
): boolean {
	const search = customSearch.toLowerCase();
	const hash = customHash.toLowerCase();
	const hashToken = extractHashRouteToken(hash);
	const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
	const stand = params.get("stand")?.toLowerCase() || params.get("standalone")?.toLowerCase() || "";

	return tokens.some((rawToken) => {
		const token = rawToken.toLowerCase();
		if (token.includes("=")) {
			const [k, v] = token.split("=");
			return (k && params.get(k)?.toLowerCase() === v) || hash.includes(token);
		}
		if (hashToken === token || stand === token) return true;
		const flag = params.get(token)?.toLowerCase();
		return flag === "1" || flag === "true" || flag === "studio" || flag === "direct";
	});
}

export function isDemoUrlActive(): boolean {
	if (typeof window === "undefined") return false;
	const params = new URLSearchParams(window.location.search);
	return params.get("demo") === "1" || params.get("demo") === "true";
}

export function isCbctDirectActive(customSearch?: string, customHash?: string): boolean {
	const surface = parseTopLevelSurface({ search: customSearch, hash: customHash });
	return surface.surface === "aux_display" && surface.kind === "cbct_direct";
}

export function isCbctTunerActive(customSearch?: string, customHash?: string): boolean {
	const surface = parseTopLevelSurface({ search: customSearch, hash: customHash });
	return surface.surface === "aux_display" && surface.kind === "cbct_tuner";
}

export function extractHashRouteToken(rawHash: string): string {
	const cleaned = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
	const qIndex = cleaned.indexOf("?");
	const aIndex = cleaned.indexOf("&");
	const splitAt = qIndex >= 0 ? qIndex : aIndex;
	const beforeQuery = splitAt >= 0 ? cleaned.slice(0, splitAt) : cleaned;
	const slashIndex = beforeQuery.indexOf("/");
	const token = slashIndex >= 0 ? beforeQuery.slice(0, slashIndex) : beforeQuery;
	return token.replace(/^\/+/, "").toLowerCase();
}

/**
 * Однокаркасная архитектура: рабочее место не демонтируется при открытии студий.
 * Возвращает false для всех маршрутов рабочего контура, чтобы DentalWorkspace и AppNavigationShell оставались живыми.
 */
export function isStandaloneActive(_customSearch?: string, _customHash?: string): boolean {
	return false;
}

export function isStandalonePatientCardActive(customSearch?: string, customHash?: string): boolean {
	if (typeof window === "undefined" && customSearch === undefined && customHash === undefined) {
		return false;
	}
	const s = customSearch ?? (typeof window !== "undefined" ? window.location.search : "");
	const h = customHash ?? (typeof window !== "undefined" ? window.location.hash : "");
	return resolveClinicRoute(s, h).studio?.kind === "patient_card";
}
