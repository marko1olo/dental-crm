/**
 * apps/web/src/components/shift/index.ts
 *
 * Implements Mandate 8s (Law of Single Indivisible Authority) & SSOT:
 * Unifies doctor shift control bar, ShiftStudioModal, DirectShiftLauncher,
 * and canonical cash register shift closing & Z-report views.
 */

// Canonical SSOT Shift Studio & Fiscal Z-Report
export {
	ShiftStudioModal,
	type ShiftStudioModalProps,
} from "./ShiftStudioModal";
export { DirectShiftLauncher } from "./DirectShiftLauncher";
export * from "./shiftCatalogData";

// Re-exports for Cash Shift Closing & Journal SSOT
export {
	CashShiftClosingModal,
	type CashShiftClosingModalProps,
} from "./CashShiftClosingModal";
export {
	CashShiftJournalView,
	type CashShiftJournalViewProps,
	type CashShiftItem,
} from "./CashShiftJournalView";

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

export type { DoctorShiftSummaryCardProps } from "./DoctorShiftSummaryCard";
export { DoctorShiftSummaryCard } from "./DoctorShiftSummaryCard";

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

export {
	DoctorShiftEarningsCard,
	type DoctorShiftEarningsCardProps,
} from "./cashSection/DoctorShiftEarningsCard";
