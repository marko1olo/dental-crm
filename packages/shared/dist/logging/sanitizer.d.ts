/**
 * DENTE CRM — 152-ФЗ Personal Data & Credentials Sanitizer
 *
 * Маскирует и санитизирует персональные данные, токены, пароли и реквизиты
 * платежей в строках, объектах и телах сетевых запросов.
 */
/**
 * Проверяет, является ли имя свойства чувствительным ключом (пароль, токен, карта, и т.д.)
 */
export declare function isSensitiveKey(key: string): boolean;
/**
 * Маскирует строковые данные (JWT, Bearer-токены, номера карт, СНИЛС, паспорта, URL-параметры).
 */
export declare function sanitizeString(value: string): string;
/**
 * Рекурсивно санитизирует любые структуры данных (объекты, массивы, примитивы, ошибки, Map, Set).
 * Защищен от циклических ссылок, глубокой рекурсии, выбрасывающих геттеров и несериализуемых типов (BigInt).
 */
export declare function sanitizePayload<T>(payload: T, maxDepth?: number, seen?: WeakSet<object>, isParentSensitive?: boolean): T;
