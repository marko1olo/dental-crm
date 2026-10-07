/**
 * paidContractEngine.ts
 *
 * Фасадный модуль Договора на оказание платных медицинских услуг (ПП РФ № 736).
 * Декомпозирован на модули в папке ./paidContract/ в строгом соответствии с Мандатом 8b:
 * - ./paidContract/types.ts: интерфейсы и типы данных
 * - ./paidContract/money.ts: пропись, копейки, расчет сметы
 * - ./paidContract/crypto.ts: SHA-256, SMS OTP ПЭП (63-ФЗ), хеш целостности
 * - ./paidContract/validation.ts: 11 шлюзов ПП РФ № 736, экстренная помощь (8n) и бланки
 * - ./paidContract/defaults.ts: генерация договоров по умолчанию и номеров ДПМУ
 * - ./paidContract/print.ts: генерация текста, HTML (А4 ГОСТ) и печать
 */

export * from "./paidContract/index";
