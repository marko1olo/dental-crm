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
export { DoctorShiftControlBar, DoctorShiftHeaderBar } from "./DoctorShiftControlBar";

export type {
	DoctorShiftCloseModalProps,
	DoctorShiftCashSummary,
	DoctorShiftEmrSummary,
} from "./DoctorShiftCloseModal";
export { DoctorShiftCloseModal } from "./DoctorShiftCloseModal";

export type { DoctorShiftCashSectionProps } from "./DoctorShiftCashSection";
export { DoctorShiftCashSection } from "./DoctorShiftCashSection";

export type { CabinetHandoverModalProps } from "./CabinetHandoverModal";
export { CabinetHandoverModal } from "./CabinetHandoverModal";

export type { DoctorShiftVisitsKpiSectionProps } from "./DoctorShiftVisitsKpiSection";
export { DoctorShiftVisitsKpiSection } from "./DoctorShiftVisitsKpiSection";

export type { ShiftIntelligenceSectionProps } from "./ShiftIntelligenceSection";
export { ShiftIntelligenceSection } from "./ShiftIntelligenceSection";

export type { DoctorShiftHeroCardProps } from "./DoctorShiftHeroCard";
export { DoctorShiftHeroCard } from "./DoctorShiftHeroCard";

export type { ShiftTodoListSectionProps } from "./ShiftTodoListSection";
export { ShiftTodoListSection } from "./ShiftTodoListSection";

export type { PatientCockpitFeatureGridProps } from "./PatientCockpitFeatureGrid";
export { PatientCockpitFeatureGrid } from "./PatientCockpitFeatureGrid";

export {
	useDoctorShiftData,
	useShiftRealtimeTelemetry,
	useShiftFinancialSummary,
	formatClockTime,
	type UseDoctorShiftDataOptions,
} from "./useDoctorShiftData";
export { printEncashmentStatement, type PrintEncashmentOptions } from "./shiftPrintStatements";

export * from "../doctor-portal";
export {
	DoctorMobileShiftModal as DoctorShiftModal,
	type DoctorMobileShiftModalProps as DoctorShiftModalProps,
} from "../doctor-portal";

export {
	MobileShiftCockpit,
	type MobileShiftCockpitProps,
	type MobileShiftConsumableItem,
	type MobileShiftAppointmentSummary,
} from "./MobileShiftCockpit";

export {
	ChairRentalShiftWidget,
	type ChairRentalShiftWidgetProps,
} from "./ChairRentalShiftWidget";
