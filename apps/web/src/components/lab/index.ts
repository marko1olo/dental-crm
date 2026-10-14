/**
 * apps/web/src/components/lab/index.ts
 *
 * Canonical SSOT for Dental Laboratory (ЗТЛ) components, models, and engines.
 * Consolidates all laboratory modals, tracking drawers, and financial gate modules.
 */

// Core Modals & Work Order Components
export {
	DentalLabOrderModal,
	DentalLabWorkOrderModal,
	type DentalLabOrderModalProps,
	type DentalLabOrderData,
	formatJawScopeLabel,
	formatLabOrderTeethOrJaw,
} from "./DentalLabOrderModal";

export {
	DentalLabCreateOrderModal,
	type DentalLabCreateOrderModalProps,
} from "./DentalLabCreateOrderModal";

export {
	DentalLabOrdersHubModal,
	type DentalLabOrdersHubModalProps,
} from "./DentalLabOrdersHubModal";

export {
	DentalLabOrdersKanbanBoard,
	type DentalLabOrdersKanbanBoardProps,
} from "./DentalLabOrdersKanbanBoard";

export {
	DentalLabOrdersTrackerModal,
	type DentalLabOrdersTrackerModalProps,
} from "./DentalLabOrdersTrackerModal";

export {
	DentalLabReadyInClinicModal,
	type DentalLabReadyInClinicModalProps,
} from "./DentalLabReadyInClinicModal";

// Drawers & Cards
export {
	DentalLabOrderDrawer,
	type DentalLabOrderDrawerProps,
} from "./DentalLabOrderDrawer";

export {
	LabTrackingDrawer,
} from "./LabTrackingDrawer";

export {
	LabOrderCard,
	type LabOrderCardProps,
} from "./LabOrderCard";

export {
	DentalLabTrackerCard,
} from "./DentalLabTrackerCard";

// Financial Gate & Doctor Autonomy
export {
	DentalLabFinancialGate,
	type DentalLabFinancialGateProps,
} from "./DentalLabFinancialGate";

export {
	checkDentalLabFinancialGate,
	createDoctorClinicalOverride,
	createChiefDoctorOverride,
	type DentalLabGateStatus,
	type DentalLabFinancialGateParams,
	type DentalLabFinancialGateResult,
} from "./dentalLabFinancialGateEngine";

// Configurator, Shading, Odontogram
export {
	DentalLabExpressConfigurator,
} from "./DentalLabExpressConfigurator";

export {
	DentalLabShadeSelector,
	type DentalLabShadeSelectorProps,
} from "./DentalLabShadeSelector";

export {
	DentalLabFdiOdontogramPicker,
} from "./DentalLabFdiOdontogramPicker";

export {
	DentalLabRestorationTab,
} from "./DentalLabRestorationTab";

export {
	DentalLabStagesTab,
} from "./DentalLabStagesTab";

export {
	DentalLabPrintBlank,
} from "./DentalLabPrintBlank";

// Helper utilities & Math
export * from "./labMath";
export { generateBarcodeSvg, generateQrCodeSvg } from "./labMath";
export * from "./guestLabPortalHelpers";

// Dispatch, Timelines & Matrix
export {
	DentalLabOrdersView,
	type DentalLabOrdersViewProps,
} from "./DentalLabOrdersView";
export {
	DentalLabCourierDispatchBar,
	type DentalLabCourierDispatchBarProps,
} from "./DentalLabCourierDispatchBar";
export {
	DentalLabPriceMatrixModal,
	type DentalLabPriceMatrixModalProps,
	type LabPriceMatrixItem,
} from "./DentalLabPriceMatrixModal";
export {
	DentalLabStageTrackingTimeline,
	type DentalLabStageTrackingTimelineProps,
} from "./DentalLabStageTrackingTimeline";
export {
	LabAttachScanModal,
	is3DScanUrl,
} from "./LabAttachScanModal";
export {
	LabActionPromptModal,
	type LabPromptDialogState,
} from "./LabActionPromptModal";
export * from "./dentalLabWorkflowEngine";
export * from "./dentalLabApiMapper";
export * from "./ordersView";
export * from "./mobile/MobileLabOrdersTimeline";
