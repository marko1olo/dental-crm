export * from "./DentalLabOrdersView";
export * from "./DentalLabWorkOrderModal";
export * from "./DentalLabStageTrackingTimeline";
export * from "./DentalLabCourierDispatchBar";
export * from "./DentalLabPriceMatrixModal";

// Transparent SSOT Facade from canonical lab module
export {
	DentalLabOrderModal,
	DentalLabCreateOrderModal,
	DentalLabOrdersHubModal,
	DentalLabOrdersKanbanBoard,
	DentalLabOrdersTrackerModal,
	DentalLabReadyInClinicModal,
	LabTrackingDrawer,
	LabOrderCard,
	DentalLabTrackerCard,
	DentalLabFinancialGate,
	checkDentalLabFinancialGate,
	createDoctorClinicalOverride,
	createChiefDoctorOverride,
	DentalLabExpressConfigurator,
	DentalLabShadeSelector,
	DentalLabFdiOdontogramPicker,
	DentalLabRestorationTab,
	DentalLabStagesTab,
	DentalLabPrintBlank,
	type DentalLabOrderModalProps,
	type DentalLabCreateOrderModalProps,
	type DentalLabOrdersHubModalProps,
	type DentalLabOrdersKanbanBoardProps,
	type DentalLabOrdersTrackerModalProps,
	type DentalLabReadyInClinicModalProps,
	type LabOrderCardProps,
	type DentalLabFinancialGateProps,
	type DentalLabGateStatus,
	type DentalLabFinancialGateParams,
	type DentalLabFinancialGateResult,
	type DentalLabShadeSelectorProps,
} from "../lab/index";

