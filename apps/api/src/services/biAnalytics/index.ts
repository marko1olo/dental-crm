/**
 * BI Analytics Service SSOT Index.
 * Modular sweet-spot architecture conforming to Mandates 8b and 8zi.
 */

export {
	PAID_PAYMENTS_ONLY,
	computeCohortLtvAll,
	doctorProfitabilityRow,
	computeDoctorProfitabilityAll,
	type CohortRevenuePoint,
	type DoctorProfitabilitySnapshotRow,
} from "./biAnalyticsCohorts.js";

export {
	TREATMENT_PLAN_FUNNEL_STATUSES,
	TREATMENT_PLAN_FUNNEL_APPEARANCE,
	buildPlanFunnel,
	computePlanFunnelAll,
	computeChairUtilizationAll,
	runScheduledSnapshots,
	runBiAnalyticsWorker,
	startBiAnalyticsWorker,
	stopBiAnalyticsWorker,
	type TreatmentPlanStatus,
	type PlanStatusCount,
	type PlanFunnelStage,
	type ChairUtilizationPoint,
} from "./biAnalyticsEngine.js";

export {
	computeBiAnalyticsSnapshots,
	type BiAnalyticsSnapshotRun,
} from "./biAnalyticsSnapshots.js";
