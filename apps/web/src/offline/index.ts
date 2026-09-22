/**
 * DENTE CRM — Unified Offline Subsystem
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8c: Low-spec 5400 RPM HDD zero-seek optimization.
 * - Mandate 8e: Doctor autonomy — zero blocked buttons, autosave Form 043/u, offline resilience.
 * - Mandate 8n: Solo doctor & small clinic resilience without internet connection.
 * - Mandate 8s: Friction-killer — unified offline entry point.
 */

export * from "./offlineVisitDrafting.js";
export * from "./offlineAppointmentQueue.js";
export * from "./offlinePricelistCache.js";
export * from "./offlinePaymentQueue.js";
export * from "./networkResilience.js";
export * from "../services/offline/index.js";
