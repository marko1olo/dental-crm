/**
 * freeSlotsModules/index.ts — Barrel export for doctor free slots calculation engine.
 */

export * from "./freeSlotsTypes";
export * from "./intervalIntersectionMath";
export * from "./freeSlotsChipFormatter";
export * from "./chairDoctorOccupancyTally";
export { findDoctorFreeSlots, formatRussianDayHeader } from "@dental/shared";
