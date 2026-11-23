/**
 * apps/api/src/services/websocket/wsBroker.ts — Канонический фасад WebSocket-брокера DENTE CRM.
 * Реэкспортирует единый брокер websocketBroker.ts (SSOT, Мандат 8bf).
 */

export * from "../websocketBroker.js";
export { wsBroker as default } from "../websocketBroker.js";
