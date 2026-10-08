/**
 * Canonical Facade for Analytics Routes (Layer 5)
 * Decomposed into modular subroutes under ./analytics/
 * Preserves 100% public export contracts and behavior.
 */

export {
	registerAnalyticsRoutes,
	registerAnalyticsRoutes as default,
	RU_MONTHS,
	MONTH_LABELS_RU,
	extractCreatedAtFromUuidV7,
	calculateRebookingDeltaMinutes,
	formatDoctorSpecialty,
} from "./analytics/index.js";

export * from "./analytics/types.js";
export * from "./analytics/utils.js";
export * from "./analytics/cohortRoutes.js";
export * from "./analytics/curatorRoutes.js";
export * from "./analytics/dashboardRoutes.js";
export * from "./analytics/diagnocatRoutes.js";
export * from "./analytics/executiveRoutes.js";
export * from "./analytics/rebookingRoutes.js";
export * from "./analytics/utilizationRoutes.js";
