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

import { readDenteClinicToken, readDenteStaffToken } from "./safeLocalStorage";

/** Имя заголовка админского секрета. Реэкспортируется из `AppHelpers.tsx` для совместимости. */
export const denteAdminSecretHeaderName = "x-dente-admin-secret";

export function denteAdminSecretRequestHeaders(
	extra: Record<string, string> = {},
	adminSecret?: string,
): Record<string, string> {
	const secret = adminSecret?.trim();
	const headers = secret ? { ...extra, [denteAdminSecretHeaderName]: secret } : { ...extra };

	const clinicToken = readDenteClinicToken();
	const staffToken = readDenteStaffToken();
	if (clinicToken) {
		headers["x-dente-clinic-token"] = clinicToken;
	}
	if (staffToken) {
		headers["x-dente-staff-token"] = staffToken;
	}

	return headers;
}
