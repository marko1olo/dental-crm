/**
 * apps/web/src/components/shift/index.ts
 *
 * Implements Mandate 8s (Law of Single Indivisible Authority):
 * Unifies doctor shift control bar, callouts, and full doctor mobile shift cockpit.
 */

export type { ShiftCalloutProps } from "./ShiftCallout";
export { ShiftCallout } from "./ShiftCallout";
export type {
	DoctorShiftControlBarProps,
	DoctorShiftStats,
} from "./DoctorShiftControlBar";
export { DoctorShiftControlBar } from "./DoctorShiftControlBar";

export * from "../doctor-portal";
export {
	DoctorMobileShiftModal as DoctorShiftModal,
	type DoctorMobileShiftModalProps as DoctorShiftModalProps,
} from "../doctor-portal";
