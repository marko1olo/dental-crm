/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ШАБЛОНИЗАТОР И РЕЗОЛВЕР ПЕРЕМЕННЫХ МЕДИЦИНСКИХ БЛАНКОВ DENTE CRM
 * Стандарт StomX: 10 рубрик, 49 бланков Минздрава РФ, 74+ системных токена
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Реэкспорт финансовых утилит
export {
	formatKopecksRu,
	kopecksToNumericString,
	parseKopecks,
	rublesToKopecks,
} from "../../money.js";

export {
	kopecksToWordsRu,
	legalMoneyInWordsFromKopecksRu,
	legalMoneyInWordsRu,
	rublesToWordsRu,
} from "../../moneyWordsRu.js";

// Полный реестр 74+ стандартизированных токенов подстановки
export * from "../templateVariablesRegistry.js";

// Layer 0: Контракты типов и контекстов
export type * from "./types.js";

// Layer 0: Чистые функции форматирования дат, возраста, паспорта и денег
export * from "./dateAndAgeHelpers.js";

// Layer 1: Каталог встроенных системных шаблонов
export * from "./builtinTemplates.js";

// Layer 1: Построение карты переменных и интерполяция
export * from "./variableResolver.js";

// Layer 2: Функции рендеринга документов и сообщений
export * from "./renderer.js";

// Layer 3: Класс движка шаблонов и глобальный экземпляр
export * from "./engineClass.js";
