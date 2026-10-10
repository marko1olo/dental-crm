import type { ClinicalErrorCode } from "./types.js";

/**
 * Словарь перевода HTTP-статусов на понятный русский язык врача и оператора клиники.
 */
export const httpStatusTranslations: Record<number, string> = {
	0: "нет ответа сервера или сеть недоступна",
	400: "сервер не принял данные (проверьте корректность ввода)",
	401: "сессия истекла, требуется повторный вход",
	403: "нет доступа к запрошенному действию",
	404: "нужный маршрут или запись не найдены",
	408: "время ожидания ответа сервера истекло",
	409: "данные уже изменились на другом устройстве, обновите экран",
	413: "файл или запрос слишком большой",
	422: "данные не прошли клиническую валидацию",
	429: "слишком много запросов, подождите пару секунд",
	500: "сервер клиники столкнулся с внутренней ошибкой",
	502: "шлюз сервера клиники временно недоступен",
	503: "сервис временно на техническом обслуживании",
	504: "шлюз не дождался ответа от базы данных",
};

/**
 * Словарь перевода кодов ошибок СУБД PostgreSQL (SQLSTATE) на клинический язык.
 */
export const postgresErrorTranslations: Record<string, string> = {
	"23505": "Запись с такими ключевыми данными уже существует в клинике (дубликат)",
	"23503": "Невозможно удалить или изменить: запись связана с другими документами или визитами",
	"23502": "Обязательное клиническое поле не заполнено",
	"23514": "Данные не соответствуют правилам клинического ограничения",
	"40P01": "Конфликт одновременного редактирования записи двумя врачами (дедлок)",
	"40001": "Транзакция прервана из-за параллельного изменения, повторите операцию",
	"08006": "Связь с базой данных клиники потеряна",
	"57014": "Запрос был отменен по таймауту базы данных",
};

/**
 * Словарь перевода кодов валидации Fastify и Zod.
 */
export const fastifyValidationTranslations: Record<string, string> = {
	FST_ERR_VALIDATION: "Ошибка проверки введенных клинических данных",
	invalid_type: "Неверный тип данных в поле",
	too_small: "Значение меньше допустимого клинического минимума",
	too_big: "Значение превышает допустимый максимум",
	invalid_string: "Некорректный формат строки или спецсимволы",
	invalid_date: "Некорректная дата визита или рождения",
	custom: "Не выполнено клиническое правило валидации",
};

/**
 * Перевод кодов категорий ошибок.
 */
export const clinicalCategoryTranslations: Record<ClinicalErrorCode, string> = {
	NETWORK_OFFLINE: "Отсутствует сетевое подключение к серверу клиники",
	SERVER_TIMEOUT: "Время ожидания сервера истекло",
	AUTH_UNAUTHORIZED: "Требуется авторизация сотрудника",
	AUTH_FORBIDDEN: "Недостаточно прав для выполнения действия",
	RESOURCE_NOT_FOUND: "Запрашиваемый документ или пациент не найден",
	DATA_CONFLICT: "Конфликт версий данных",
	VALIDATION_FAILED: "Ошибка валидации клинических данных",
	RATE_LIMITED: "Превышен лимит обращений к серверу",
	INTERNAL_SERVER_ERROR: "Внутренняя ошибка сервера клиники",
	UNKNOWN_ERROR: "Неизвестная ошибка выполнения",
};

/**
 * Перевод HTTP-статуса в человекочитаемый текст.
 */
export function translateHttpStatus(status: number): string {
	if (status in httpStatusTranslations) {
		return httpStatusTranslations[status]!;
	}
	if (status >= 500) {
		return "сервер клиники не смог выполнить действие";
	}
	return `сервер вернул код ${status}`;
}

/**
 * Перевод кода ошибки PostgreSQL.
 */
export function translatePostgresErrorCode(code: string): string | null {
	return postgresErrorTranslations[code] ?? null;
}

/**
 * Перевод кода ошибки Fastify.
 */
export function translateFastifyErrorCode(code: string): string | null {
	return fastifyValidationTranslations[code] ?? null;
}

/**
 * Универсальный переводчик любого технического кода ошибки.
 */
export function getClinicalErrorTranslation(
	code: string | number,
	fallback?: string,
): string | null {
	if (typeof code === "number") {
		return httpStatusTranslations[code] ?? fallback ?? null;
	}
	return (
		postgresErrorTranslations[code] ??
		fastifyValidationTranslations[code] ??
		fallback ??
		null
	);
}
