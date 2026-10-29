/**
 * Заголовки авторизации запроса.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. `denteAdminSecretRequestHeaders` зависела от константы
 * `denteAdminSecretHeaderName` внутри `AppHelpers.tsx` (~6158 строк) и замыкала
 * статический цикл импортов:
 *
 *   AppHelpers.tsx:305  ->  workspaceShell.tsx:32  ->  hooks/useWorkspaceProfile.ts:22  ->  AppHelpers
 *
 * Перенос сюда рвёт петлю структурно. `AppHelpers.tsx` реэкспортирует оба символа
 * для совместимости вызывающих.
 *
 * ИЗВЕСТНОЕ ДУБЛИРОВАНИЕ, оставлено сознательно. `lib/apiAuthFetch.ts` оборачивает
 * глобальный `fetch` и вставляет те же clinic/staff токены (`installApiAuthFetch()`
 * в `main.tsx`). Обёртка идемпотентна (`!headers.has(...)`); уникально эта функция
 * даёт `x-dente-admin-secret` и проброс `extra`.
 *
 * Токены читаются через `safeLocalStorage` (`readDenteClinicToken` /
 * `readDenteStaffToken`) — try/catch внутри, без throw в private mode.
 */

import {
	readDenteClinicToken,
	readDenteStaffToken,
	safeLocalStorageGetItem,
} from "./safeLocalStorage";

/** Имя заголовка админского секрета. Реэкспортируется из `AppHelpers.tsx` для совместимости. */
export const denteAdminSecretHeaderName = "x-dente-admin-secret";

/**
 * Проверка активного демо-режима без импорта `demoModeEngine` (чтобы не замыкать цикл с `AppHelpers`).
 */
export function isDemoRuntimeContext(): boolean {
	try {
		if (safeLocalStorageGetItem("dente_demo_showcase") === "true") {
			return true;
		}
		if (typeof window !== "undefined" && window.location) {
			const search = window.location.search || "";
			const hash = window.location.hash || "";
			if (
				search.includes("demo=false") ||
				hash.includes("demo=false") ||
				search.includes("showcase=false")
			) {
				return false;
			}
			if (
				search.includes("demo=true") ||
				search.includes("demo=1") ||
				search.includes("showcase=true") ||
				hash.includes("demo=true") ||
				hash === "#demo"
			) {
				return true;
			}
		}
	} catch {
		// ignore
	}
	return false;
}

export function getDenteAuthHeaders(
	extra: Record<string, string> = {},
): Record<string, string> {
	const headers: Record<string, string> = { ...extra };
	const rawClinicToken = readDenteClinicToken();
	const rawStaffToken = readDenteStaffToken();
	const inDemoContext = isDemoRuntimeContext();
	const useDemoFallback =
		inDemoContext ||
		Boolean(rawClinicToken?.startsWith("demo-")) ||
		Boolean(rawStaffToken?.startsWith("demo-"));
	const clinicToken = inDemoContext
		? (rawClinicToken?.startsWith("demo-") ? rawClinicToken : "demo-showcase-token-owner")
		: (rawClinicToken || (useDemoFallback ? "demo-showcase-token-owner" : null));
	const staffToken = inDemoContext
		? (rawStaffToken?.startsWith("demo-") ? rawStaffToken : "demo-showcase-staff-token-owner")
		: (rawStaffToken || (useDemoFallback ? "demo-showcase-staff-token-owner" : null));
	if (clinicToken) {
		headers["x-dente-clinic-token"] = clinicToken;
	}
	if (staffToken) {
		headers["x-dente-staff-token"] = staffToken;
	}
	const token = staffToken || clinicToken;
	if (token && !headers.Authorization) {
		headers.Authorization = `Bearer ${token}`;
	}
	return headers;
}

export function denteAdminSecretRequestHeaders(
	extra: Record<string, string> = {},
	adminSecret?: string,
): Record<string, string> {
	const secret = adminSecret?.trim();
	const headers = secret
		? { ...extra, [denteAdminSecretHeaderName]: secret }
		: { ...extra };

	return getDenteAuthHeaders(headers);
}

/** Совместимость для клинических мутаций (студия визиографа, ЭМК, диагностика) */
export const denteClinicalMutationHeaders = getDenteAuthHeaders;

