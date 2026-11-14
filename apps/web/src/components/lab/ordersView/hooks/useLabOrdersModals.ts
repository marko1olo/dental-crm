import { useState, useCallback } from "react";
import type { DentalLabOrderData } from "../../labMath";
import type { LabPromptDialogState } from "../../LabActionPromptModal";
import type { ReadyInClinicLabOrder } from "../../DentalLabReadyInClinicModal";

export type ActiveLabModalType =
	| "none"
	| "hub"
	| "work_order"
	| "order_drawer"
	| "price_matrix"
	| "tracker_modal"
	| "tracking_drawer"
	| "scan_modal"
	| "ready_in_clinic";

export function useLabOrdersModals() {
	const [activeLabModal, setActiveLabModal] = useState<ActiveLabModalType>("none");
	const [isCourierBarOpen, setIsCourierBarOpen] = useState(false);
	const [selectedTimelineOrderId, setSelectedTimelineOrderId] = useState<string | null>(null);
	const [kanbanStageLimits, setKanbanStageLimits] = useState<Record<string, number>>({});
	const [kanbanActiveMenuId, setKanbanActiveMenuId] = useState<string | null>(null);
	const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);
	const [promptState, setPromptState] = useState<LabPromptDialogState | null>(null);
	const [scanAttachOrder, setScanAttachOrder] = useState<DentalLabOrderData | null>(null);
	const [scanAttachType, setScanAttachType] = useState<"stl" | "ply" | "photo">("stl");
	const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<DentalLabOrderData | null>(null);
	const [modalInitialTab, setModalInitialTab] = useState<"main" | "shades" | "stages" | "print">("main");
	const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<DentalLabOrderData | null>(null);
	const [readyInClinicOrder, setReadyInClinicOrder] = useState<ReadyInClinicLabOrder | null>(null);
	const [view3DScanOrder, setView3DScanOrder] = useState<DentalLabOrderData | null>(null);

	const isHubModalOpen = activeLabModal === "hub";
	const setIsHubModalOpen = useCallback((open: boolean) => setActiveLabModal(open ? "hub" : "none"), []);

	const isWorkOrderModalOpen = activeLabModal === "work_order";
	const setIsWorkOrderModalOpen = useCallback((open: boolean) => setActiveLabModal(open ? "work_order" : "none"), []);

	const isOrderDrawerOpen = activeLabModal === "order_drawer";
	const setIsOrderDrawerOpen = useCallback((open: boolean) => setActiveLabModal(open ? "order_drawer" : "none"), []);

	const isPriceMatrixModalOpen = activeLabModal === "price_matrix";
	const setIsPriceMatrixModalOpen = useCallback((open: boolean) => setActiveLabModal(open ? "price_matrix" : "none"), []);

	const isTrackerModalOpen = activeLabModal === "tracker_modal";
	const setIsTrackerModalOpen = useCallback((open: boolean) => setActiveLabModal(open ? "tracker_modal" : "none"), []);

	const isTrackingDrawerOpen = activeLabModal === "tracking_drawer";
	const setIsTrackingDrawerOpen = useCallback((open: boolean) => setActiveLabModal(open ? "tracking_drawer" : "none"), []);

	const isScanModalOpen = activeLabModal === "scan_modal";
	const setIsScanModalOpen = useCallback((open: boolean) => setActiveLabModal(open ? "scan_modal" : "none"), []);

	const isReadyInClinicModalOpen = activeLabModal === "ready_in_clinic";
	const setIsReadyInClinicModalOpen = useCallback((open: boolean) => setActiveLabModal(open ? "ready_in_clinic" : "none"), []);

	const handleOpenReadyInClinicPrompt = useCallback((order: Partial<DentalLabOrderData>) => {
		setOpenMenuOrderId(null);
		setReadyInClinicOrder({
			id: order.id || "ztl-order",
			orderNumber: order.orderNumber || (order.id ? order.id.slice(0, 8) : "ЗТЛ-1"),
			patientId: order.patientId ?? undefined,
			patientName: order.patientName || "Пациент",
			doctorName: order.doctorName ?? undefined,
			doctorId: order.doctorId ?? undefined,
			toothFdi: order.toothFdi ?? undefined,
			material: order.material ?? undefined,
			colorVita: order.colorVita ?? undefined,
			constructionType: order.constructionType ?? undefined,
			clinicName: "DENTE",
		});
		setActiveLabModal("ready_in_clinic");
	}, []);

	return {
		activeLabModal, setActiveLabModal,
		isHubModalOpen, setIsHubModalOpen, isCourierBarOpen, setIsCourierBarOpen,
		selectedTimelineOrderId, setSelectedTimelineOrderId, kanbanStageLimits, setKanbanStageLimits,
		kanbanActiveMenuId, setKanbanActiveMenuId, openMenuOrderId, setOpenMenuOrderId,
		promptState, setPromptState, isScanModalOpen, setIsScanModalOpen,
		scanAttachOrder, setScanAttachOrder, scanAttachType, setScanAttachType,
		isWorkOrderModalOpen, setIsWorkOrderModalOpen, isOrderDrawerOpen, setIsOrderDrawerOpen,
		selectedOrderForEdit, setSelectedOrderForEdit, modalInitialTab, setModalInitialTab,
		isPriceMatrixModalOpen, setIsPriceMatrixModalOpen, isTrackerModalOpen, setIsTrackerModalOpen,
		isTrackingDrawerOpen, setIsTrackingDrawerOpen, selectedOrderForTracking, setSelectedOrderForTracking,
		isReadyInClinicModalOpen, setIsReadyInClinicModalOpen, readyInClinicOrder, setReadyInClinicOrder,
		view3DScanOrder, setView3DScanOrder, handleOpenReadyInClinicPrompt,
	};
}
