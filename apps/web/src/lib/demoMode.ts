/**
 * demoMode.ts
 *
 * Единый фасад для доступа к demoModeEngine.
 * Сохраняет полную обратную совместимость для всех импортов в кодовой базе.
 *
 * Все логические проверки и витринные данные централизованно определены в
 * `apps/web/src/utils/demoModeEngine.ts`.
 */

export * from "../utils/demoModeEngine.js";
