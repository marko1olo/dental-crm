/**
 * MULTI-CHAIR CLINICAL SCHEDULE COLLISION & EMERGENCY RESERVE ENGINE
 * Ported & adapted from Dentalpin agenda module & DENTE multi-chair scheduling invariants.
 *
 * Capabilities:
 * 1. Multi-chair doctor, cabinet, and patient schedule collision detection (checkScheduleOverlap).
 * 2. Dedicated emergency reserve slot buffer calculation (e.g. 30 min per shift for acute toothache / острая боль).
 * 3. Sweeping-line + Disjoint Set Union (DSU) side-by-side timeline overlap grouping (calculateScheduleOverlapGroups).
 * 4. Free slot intervals discovery with shift boundaries and emergency reserve respect.
 * 5. Full Zod validation contracts and pure zero-dependency TypeScript implementation.
 */

export * from "./collision/collisionSchemas.js";
export * from "./collision/overlapAndReserveEngine.js";
export {
	type FreeSlotDiscoveryOptions,
	findAvailableSlots,
	timeZoneOffsetMinutes,
	timeZoneOffsetSuffix,
	buildZonedIsoString,
	type TimeOfDayFilter,
	getTimeOfDayCategory,
} from "./collision/freeSlotDiscoveryEngine.js";
export * from "./collision/shiftGapFinder.js";
