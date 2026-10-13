/**
 * @file dentalTools.ts
 * @description Канонический фасад стоматологических инструментов для DENTE AI Copilot / Agent.
 * Реализация декомпозирована в ./dentalTools/ согласно Мандату 8b (Anti-monolith architecture < 800 LOC):
 * - types.ts: Типы данных, рантайм-матрица и zodToJsonSchema
 * - clinicalCalculators.ts: Анестезия, соматика, Форма 043/у, консилиум, экстренная помощь, перевод жалоб, материалы
 * - crmDatabaseTools.ts: ЭМК, одонтограмма, прайс 804н, обновление статуса зуба, запись, счета, печать
 * - desktopSystemTools.ts: Запуск стоматологического ПО, папка снимков, чтение DICOM/логов, диагностика ПК
 */

export * from "./dentalTools/index.js";
