/**
 * apps/web/src/components/lab/index.ts
 *
 * Canonical SSOT for Dental Laboratory (ЗТЛ) components, models, and engines.
 * Consolidated into strictly 2 Single Sources of Truth:
 * 1. DentalLabOrderDrawer — Right-side drawer for order creation/editing, FDI, VITA shades, 3D scans.
 * 2. DentalLabOrdersKanbanBoard — 4-column clinical Kanban board for order lifecycle.
 */

// SSOT Lab Hub, Catalog, Card & Launcher
export {
	type DentalLabCatalogItem,
	DENTAL_LAB_CATALOG,
	type VitaShadeItem,
	VITA_SHADES,
	getVitaHex,
	type LabStageId,
	type LabStageDef,
	LAB_STAGES,
	type PartnerDentalLab,
	PARTNER_LABS,
	type DentalLabOrder,
	SAMPLE_LAB_ORDERS,
	formatDateIso,
	formatRuDate,
	formatKopecks,
} from "./dentalLabData";
export {
	DentalLabHubModal,
	DentalLabOrdersHubModal,
	type DentalLabHubModalProps,
} from "./DentalLabHubModal";
export {
	DentalLabOrderCard,
	type DentalLabOrderCardProps,
} from "./DentalLabOrderCard";
export {
	DirectDentalLabLauncher,
	DirectDentalLabOrderLauncher,
} from "./DirectDentalLabLauncher";

// SSOT 1: Order Creation, Editing & Specification Drawer
export {
	DentalLabOrderDrawer,
	type DentalLabOrderDrawerProps,
} from "./DentalLabOrderDrawer";

// SSOT 2: Clinical Kanban Board (4 Lifecycle Stages) & Cards
export {
	DentalLabOrdersKanbanBoard,
	type DentalLabOrdersKanbanBoardProps,
	CANONICAL_4_KANBAN_COLUMNS,
	type CanonicalKanbanColumnDef,
} from "./DentalLabOrdersKanbanBoard";

export {
	DentalLabKanbanCard,
	type DentalLabKanbanCardProps,
	type CanonicalKanbanStageId,
} from "./DentalLabKanbanCard";

export {
	DentalLabKanbanCardMenu,
	type DentalLabKanbanCardMenuProps,
} from "./DentalLabKanbanCardMenu";

// Registry View & Cards
export {
	DentalLabOrdersView,
	type DentalLabOrdersViewProps,
} from "./DentalLabOrdersView";

export {
	LabOrderCard,
	type LabOrderCardProps,
} from "./LabOrderCard";

export {
	DentalLabTrackerCard,
} from "./DentalLabTrackerCard";

export {
	DentalLabPriceMatrixModal,
	CANONICAL_LAB_PRICE_MATRIX,
	type DentalLabPriceMatrixModalProps,
	type LabPriceMatrixItem,
} from "./DentalLabPriceMatrixModal";

export {
	DentalLabOrdersModal,
	DentalLabOrderModal,
	DentalLabOrderModal as DentalLabWorkOrderModal,
	type DentalLabOrderModalProps,
	type DentalLabOrderModalProps as DentalLabWorkOrderModalProps,
	type ExtendedDentalLabOrderModalProps,
} from "./DentalLabOrdersModal";

export {
	DentalLabStageTrackingTimeline,
	type DentalLabStageTrackingTimelineProps,
} from "./DentalLabStageTrackingTimeline";

// Financial Gate & Doctor Autonomy (Mandates 8e, 8n)
export {
	checkDentalLabFinancialGate,
	createDoctorClinicalOverride,
	createChiefDoctorOverride,
	type DentalLabGateStatus,
	type DentalLabFinancialGateParams,
	type DentalLabFinancialGateResult,
} from "./dentalLabFinancialGateEngine";

// Shading, Odontogram & Print Blanks
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

// Helper utilities & Domain Types
export {
	STUMP_NATURAL_DIE_SHADES,
	VITA_BLEACH_SHADES,
	VITA_CLASSICAL_SHADES,
} from "./dentalLabDefinitions";
export * from "./dentalLabDefinitions";
export {
	LAB_MATERIALS,
	VITA_3D_MASTER_SHADES,
	generateBarcodeSvg,
	generateQrCodeSvg,
} from "./labMath";
export * from "./labMath";
export * from "./guestLabPortalHelpers";
export * from "./dentalLabWorkflowEngine";
export * from "./dentalLabApiMapper";
export * from "./ordersView";
export * from "./mobile/MobileLabOrdersTimeline";
