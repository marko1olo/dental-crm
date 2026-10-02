/**
 * dentalSpeechGrammar.ts — Клинический грамматический парсер стоматологической речи
 * для серверного разбора диктовки врача за креслом (MANDATES 8l, 8e, 8k, 8s).
 *
 * Фасадный модуль (Anti-monolith decomposition < 800 LOC):
 * - clinicalGrammarTypes: Типы данных и структуры (ToothUpdateResult, AnesthesiaResult, SoapRecordResult)
 * - toothSpeechParser: FDI/ISO распознавание зубов и поверхностей (Black/FDI)
 * - diagnosisSpeechParser: МКБ-10 и клинические нозологии (K02.1, K04.0, K04.5...)
 * - anesthesiaAndProceduresParser: Анестетики (дозировки, техники) и Номенклатура 804н
 * - soapRecordSynthesizer: Синтез медицинской карты Форма 043/у (SOAP протокол)
 */

export * from "./grammar/clinicalGrammarTypes.js";
export * from "./grammar/toothSpeechParser.js";
export * from "./grammar/diagnosisSpeechParser.js";
export * from "./grammar/anesthesiaAndProceduresParser.js";
export * from "./grammar/soapRecordSynthesizer.js";
