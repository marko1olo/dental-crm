/**
 * apps/api/src/tests/routeParity/knownDebtLists.ts
 *
 * Храповик известного технического долга по маршрутам API.
 * Каждая строка — адрес или пара метод+адрес, который интерфейс зовёт, а сервер
 * не обслуживает (или обслуживает другим методом).
 *
 * Инварианты:
 * 1. Список не должен расти молча.
 * 2. Адрес, которого никто не зовёт, — не долг, а мусор в списке.
 * 3. Починенные адреса удаляются из списка долга немедленно.
 */

/**
 * Известные расхождения путей на момент введения проверки.
 * Каждая строка — адрес, который интерфейс зовёт, а сервер не обслуживает.
 */
export const KNOWN_MISSING: readonly string[] = [
	/*
	 * ЕГИСЗ логи: журнал обмена с ЕГИСЗ. Маршрут /api/egisz/logs объявлен в UI,
	 * пока сохраняется в списке контролируемого долга.
	 */
	"/api/egisz/logs",
];

/**
 * Известные пары «путь есть, метода нет» — храповик по методам.
 *
 * Аудит расхождений:
 * - GET /api/settings/staff: в PayrollStandaloneLauncher.tsx зовётся GET, но на сервере сотрудники живут на /api/staff
 * - POST /api/fiscal/report/x: печать X-отчёта кассы
 * - POST /api/portal/auth/request-otp: запрос OTP пациентом
 * - POST /api/clinical/tasks: в clinicalTasksState.ts зовётся POST на /api/clinical/tasks вместо /api/tasks
 */
export const KNOWN_METHOD_MISMATCH: readonly string[] = [
	"GET /api/settings/staff",
	"POST /api/fiscal/report/x",
	"POST /api/portal/auth/request-otp",
	"POST /api/clinical/tasks",
];

/**
 * Потолки списков долга. Любое увеличение требует явного пересмотра лимита.
 */
export const MAX_KNOWN_MISSING = 4;
export const MAX_KNOWN_METHOD_MISMATCH = 4;
