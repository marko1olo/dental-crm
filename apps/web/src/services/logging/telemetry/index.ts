/**
 * DENTE CRM — Staff Telemetry Subsystem Public API
 *
 * Единая точка экспорта подсистемы аудита действий персонала, транспорта, очередей и хелперов.
 */

export * from "./types.js";
export * from "./batchTransport.js";
export * from "./eventQueue.js";
export * from "./clinicalActionHelpers.js";
export * from "./staffTelemetryCore.js";
export { default } from "./staffTelemetryCore.js";
