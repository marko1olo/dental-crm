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
} from "./dentalLabCatalogData";
export {
	DentalLabStudioModal,
	type DentalLabStudioModalProps,
	DentalLabHubModal,
	DentalLabOrdersHubModal,
	type DentalLabHubModalProps,
	type DentalLabOrdersHubModalProps,
	LaboratoryStudioModal,
	WorkOrdersList,
	LabStudioModal,
	type LabStudioModalProps,
	LabOrderModal,
	DentalLabOrderModal,
	DentalLabOrdersModal,
	DentalLabOrderModal as DentalLabWorkOrderModal,
	type DentalLabOrderModalProps,
	type DentalLabOrderModalProps as DentalLabWorkOrderModalProps,
	type ExtendedDentalLabOrderModalProps,
	DentalLabOrderDrawer,
	type DentalLabOrderDrawerProps,
	buildLabOrderMessengerSummary,
	type LabOrderMessengerParams,
} from "./DentalLabStudioModal";
export {
	CANONICAL_LAB_STAGES,
	CANONICAL_LAB_MATERIALS,
	VITA_SHADES_SSOT,
	FDI_QUICK_TEETH,
	CLINIC_LABORATORIES,
	SEED_LAB_ORDERS,
	type DentalLabOrderEntry,
	type DentalLabStage,
	type OrthopedicMaterialMeta,
	type VitaShadeMeta,
	formatKopecksToRubles,
	getStageMeta,
	getMaterialMeta,
	isOrderOverdue,
	calcNetRevenueKopecks,
} from "./dentalLabCatalogData";
export {
	DirectDentalLabLauncher,
	DirectDentalLabOrderLauncher,
	DirectLabLauncher,
} from "./DirectDentalLabLauncher";

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
	DentalLabPriceMatrixModal,
	CANONICAL_LAB_PRICE_MATRIX,
	type DentalLabPriceMatrixModalProps,
	type LabPriceMatrixItem,
} from "./DentalLabPriceMatrixModal";

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

// Shading, Odontogram & Catalogs
export {
	DentalLabShadePicker,
	type DentalLabShadePickerProps,
	DentalLabShadeSelector,
	type DentalLabShadeSelectorProps,
} from "./DentalLabShadePicker";

export {
	CHAIRSIDE_EXPRESS_PRESETS,
	VITA_EXPRESS_SHADES,
	getBridgeSpanTeeth,
} from "./dentalLabCatalogData";

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
