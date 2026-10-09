import type { ReactNode } from "react";
import type { DentalLabOrderData } from "../../lab/DentalLabOrderModal";
import type { DentalLabWorkflowOrder, LabWorkflowStatus } from "../../lab/dentalLabWorkflowEngine";
import type { LabPriceMatrixItem } from "../DentalLabPriceMatrixModal";
import type { ReadyInClinicLabOrder } from "../../lab/DentalLabReadyInClinicModal";
import type { LabPromptDialogState } from "../../lab/LabActionPromptModal";

export type LabOrdersViewMode = "table" | "cards" | "kanban";

export interface DentalLabOrdersViewProps {
	readonly initialOrders?: readonly DentalLabOrderData[];
	readonly onOrdersChanged?: (orders: readonly DentalLabOrderData[]) => void;
}

export interface CanonicalStageFilter {
	readonly id: string;
	readonly label: string;
	readonly shortLabel: string;
	readonly statuses: readonly string[];
}

export interface DentalLabDetailedStageKey {
	readonly id: string;
	readonly label: string;
}

export interface DentalLabMetrics {
	readonly total: number;
	readonly inProgress: number;
	readonly tryIn: number;
	readonly ready: number;
	readonly completed: number;
	readonly overdue: number;
}

export interface LabOrdersFilterBarProps {
	readonly metrics: DentalLabMetrics;
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly doctorFilter: string;
	readonly onDoctorFilterChange: (doctor: string) => void;
	readonly doctorsList: readonly string[];
	readonly isCourierBarOpen: boolean;
	readonly onToggleCourierBar: () => void;
	readonly onOpenPriceMatrix: () => void;
	readonly onOpenTrackerModal: () => void;
	readonly onOpenHubModal: () => void;
	readonly onRefresh: () => void;
	readonly isLoading: boolean;
	readonly onOpenNewOrder: () => void;
}

export interface LabOrdersSegmentedNavProps {
	readonly canonicalFilters: readonly CanonicalStageFilter[];
	readonly statusFilter: string;
	readonly onStatusFilterChange: (status: string) => void;
	readonly stageCounts: Record<string, number>;
	readonly viewMode: LabOrdersViewMode;
	readonly onViewModeChange: (mode: LabOrdersViewMode) => void;
}

export interface LabOrdersTableProps {
	readonly orders: readonly DentalLabOrderData[];
	readonly openMenuOrderId: string | null;
	readonly setOpenMenuOrderId: (id: string | null) => void;
	readonly onSelectTimelineOrder: (id: string) => void;
	readonly onOpenReadyInClinicPrompt: (order: DentalLabOrderData) => void;
	readonly onOpenPrintOrder: (order: DentalLabOrderData) => void;
	readonly onOpenTracking: (order: DentalLabOrderData) => void;
	readonly onView3DScan: (order: DentalLabOrderData) => void;
	readonly onPayFromCashbox: (order: DentalLabOrderData) => void;
	readonly onMarkInstalled: (order: DentalLabOrderData) => void;
	readonly onAttach3DScan: (order: DentalLabOrderData) => void;
	readonly onAttachBitePhoto: (order: DentalLabOrderData) => void;
	readonly onTechnicianComment: (order: DentalLabOrderData) => void;
	readonly onRepeatFitting: (order: DentalLabOrderData) => void;
	readonly onReclamation: (order: DentalLabOrderData) => void;
	readonly onOpenEditOrder: (order: DentalLabOrderData) => void;
	readonly copyPortalLink: (token?: string) => void;
	readonly getStatusBadge: (status?: string) => ReactNode;
}

export interface LabOrderCardsGridProps {
	readonly orders: readonly DentalLabOrderData[];
	readonly openMenuOrderId: string | null;
	readonly setOpenMenuOrderId: (id: string | null) => void;
	readonly handleOpenPrintOrder: (order: DentalLabOrderData) => void;
	readonly handleOpenTracking: (order: DentalLabOrderData) => void;
	readonly handleAttach3DScan: (order: DentalLabOrderData) => void;
	readonly handleAttachBitePhoto: (order: DentalLabOrderData) => void;
	readonly handleTechnicianComment: (order: DentalLabOrderData) => void;
	readonly handleRepeatFitting: (order: DentalLabOrderData) => void;
	readonly handleReclamation: (order: DentalLabOrderData) => void;
	readonly handleOpenEditOrder: (order: DentalLabOrderData) => void;
	readonly copyPortalLink: (token?: string) => void;
	readonly getStatusBadge: (status?: string) => ReactNode;
	readonly handleOpenReadyInClinicPrompt: (order: DentalLabOrderData) => void;
	readonly handlePayFromCashbox: (order: DentalLabOrderData) => void;
	readonly handleMarkInstalled: (order: DentalLabOrderData) => void;
	readonly handleView3DScan: (order: DentalLabOrderData) => void;
}

export interface LabOrderModalsState {
	readonly isWorkOrderModalOpen: boolean;
	readonly selectedOrderForEdit: DentalLabOrderData | null;
	readonly modalInitialTab: "main" | "shades" | "stages" | "print";
	readonly isPriceMatrixModalOpen: boolean;
	readonly isTrackerModalOpen: boolean;
	readonly isTrackingDrawerOpen: boolean;
	readonly selectedOrderForTracking: DentalLabOrderData | null;
	readonly promptState: LabPromptDialogState | null;
	readonly isScanModalOpen: boolean;
	readonly scanAttachOrder: DentalLabOrderData | null;
	readonly scanAttachType: "stl" | "ply" | "photo";
	readonly isReadyInClinicModalOpen: boolean;
	readonly readyInClinicOrder: ReadyInClinicLabOrder | null;
	readonly view3DScanOrder: DentalLabOrderData | null;
	readonly isHubModalOpen: boolean;
}
