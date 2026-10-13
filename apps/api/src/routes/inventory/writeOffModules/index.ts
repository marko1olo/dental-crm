/**
 * index.ts — Единая точка экспорта модулей списания ТМЦ writeOffModules.
 * Соблюдает контракт /decomposer: фасады и модули <= 500 строк.
 */

export * from "./writeOffTypes.js";
export * from "./writeOffFefoExecution.js";
export * from "./writeOffVisitBundleExecution.js";
