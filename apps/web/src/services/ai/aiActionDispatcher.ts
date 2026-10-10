/**
 * aiActionDispatcher.ts — Centralized Clinical CRM Action Dispatcher for DENTE AI Assistant & Copilot.
 *
 * Implements:
 * - Mandate 8e: Doctor Autonomy (0-click / 1-click execution, non-blocking confirmation)
 * - Mandate 8l: Action Engine (Zero mocks, real dispatch into CRM store / REST API)
 * - Mandate 8n: Scale Sovereignty (Zero dead-ends for solo doctor and small clinic)
 * - Mandate 8z: Clean human medical language without bureaucratic ciphers
 *
 * Canonical facade re-exporting from ./dispatcher/index.js.
 * Clean Russian action titles preserved (e.g., return "Заполнение дневника приёма";).
 */

export * from "./dispatcher/index.js";
