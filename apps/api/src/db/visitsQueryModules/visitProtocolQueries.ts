/**
 * Фасад SQL-запросов клинических протоколов приёма, дневников SOAP и версионирования.
 * Декомпозиция Wave 25 по Мандатам 8b, 8zi, 8e и 8ap.
 * Модульная реализация расположена в ./protocol/
 */

export * from "./protocol/visitSoapQueries.js";
export * from "./protocol/visitProtocolRevisions.js";
export * from "./protocol/visitProtocolTemplates.js";
