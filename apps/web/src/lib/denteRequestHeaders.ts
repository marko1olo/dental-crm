/**
 * Заголовки авторизации запроса. Модуль БЕЗ импортов, и это его главное свойство.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. `denteAdminSecretRequestHeaders` — 17 строк, зависевших ровно от одной
 * вещи внутри `AppHelpers.tsx`: константы `denteAdminSecretHeaderName`. Но жила она в файле на
 * 6158 строк, и именно она замыкала настоящий статический цикл импортов:
 *
 *   AppHelpers.tsx:305  ->  workspaceShell.tsx:32  ->  hooks/useWorkspaceProfile.ts:22  ->  AppHelpers
 *
 * `madge` этот цикл не печатал — правило 11 в `.agents/AGENTS.md` объясняет, почему его счёту
 * нельзя верить в обе стороны. Проверено, что альтернативного замыкающего ребра нет:
 * `workspaceShell.tsx` не импортирует `AppHelpers` вообще, а ребро из `AppLogicContext.tsx:2` —
 * `import type` и стирается компилятором.
 *
 * Модуль без импортов не может входить ни в один цикл, поэтому перенос сюда рвёт петлю
 * структурно, а не по договорённости. `AppHelpers.tsx` продолжает реэкспортировать оба символа,
 * так что 15 вызывающих файлов и два мёртвых импорта компилируются без изменений — миграция
 * идёт по одному файлу, а не одним атомарным свипом на 17 файлов.
 *
 * ИЗВЕСТНОЕ ДУБЛИРОВАНИЕ, оставлено сознательно. `lib/apiAuthFetch.ts` оборачивает глобальный
 * `fetch` и вставляет те же `x-dente-clinic-token` и `x-dente-staff-token` из тех же ключей
 * хранилища (:86-87), и он реально установлен — `installApiAuthFetch()` в `main.tsx:33` до
 * рендера. Обёртка идемпотентна (`!headers.has(...)`), поэтому поведение сегодня идентично, и
 * уникально эта функция даёт только `x-dente-admin-secret` и проброс `extra`. Слить их — решение
 * о поведении, а не перенос, поэтому здесь этого нет.
 *
 * ЛАТЕНТНАЯ ОШИБКА, тоже не тронута здесь. Ниже `localStorage.getItem` вызывается без try/catch,
 * в отличие от `apiAuthFetch.ts:30-38`, поэтому в приватном режиме или при заблокированном
 * хранилище он бросит исключение. Исправлять это внутри переноса означало бы смешать две правки.
 */

/** Имя заголовка админского секрета. Реэкспортируется из `AppHelpers.tsx` для совместимости. */
export const denteAdminSecretHeaderName = "x-dente-admin-secret";

export function denteAdminSecretRequestHeaders(
	extra: Record<string, string> = {},
	adminSecret?: string,
): Record<string, string> {
	const secret = adminSecret?.trim();
	const headers = secret ? { ...extra, [denteAdminSecretHeaderName]: secret } : { ...extra };

	if (typeof window !== "undefined") {
		const clinicToken = localStorage.getItem("dente_clinic_token");
		const staffToken = localStorage.getItem("dente_staff_token");
		if (clinicToken) {
			headers["x-dente-clinic-token"] = clinicToken;
		}
		if (staffToken) {
			headers["x-dente-staff-token"] = staffToken;
		}
	}

	return headers;
}
