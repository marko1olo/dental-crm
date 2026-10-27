/**
 * doctorFreeSlotsEngine.ts — Facade for doctor free slots calculation engine.
 */
export * from "./freeSlotsModules";
export {
	findFreeScheduleIntervals,
	type FreeScheduleInterval,
	type FindFreeScheduleIntervalsParams,
	findPreventiveInspectionCandidates,
	type PreventiveInspectionCandidate,
	type PreventiveInspectionCategory,
} from "@dental/shared";
