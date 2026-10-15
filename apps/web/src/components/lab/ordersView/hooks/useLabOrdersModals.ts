import { useState, useCallback } from "react";
import type { DentalLabOrderData } from "../../DentalLabOrderModal";
import type { LabPromptDialogState } from "../../LabActionPromptModal";
import type { ReadyInClinicLabOrder } from "../../DentalLabReadyInClinicModal";

export function useLabOrdersModals() {
	const [isHubModalOpen, setIsHubModalOpen] = useState(false);
	const [isCourierBarOpen, setIsCourierBarOpen] = useState(false);
	const [selectedTimelineOrderId, setSelectedTimelineOrderId] = useState<string | null>(null);
	const [kanbanStageLimits, setKanbanStageLimits] = useState<Record<string, number>>({});
	const [kanbanActiveMenuId, setKanbanActiveMenuId] = useState<string | null>(null);
	const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);
	const [promptState, setPromptState] = useState<LabPromptDialogState | null>(null);
	const [isScanModalOpen, setIsScanModalOpen] = useState(false);
	const [scanAttachOrder, setScanAttachOrder] = useState<DentalLabOrderData | null>(null);
	const [scanAttachType, setScanAttachType] = useState<"stl" | "ply" | "photo">("stl");
	const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
	const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
	const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<DentalLabOrderData | null>(null);
	const [modalInitialTab, setModalInitialTab] = useState<"main" | "shades" | "stages" | "print">("main");
	const [isPriceMatrixModalOpen, setIsPriceMatrixModalOpen] = useState(false);
	const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
	const [isTrackingDrawerOpen, setIsTrackingDrawerOpen] = useState(false);
	const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<DentalLabOrderData | null>(null);
	const [isReadyInClinicModalOpen, setIsReadyInClinicModalOpen] = useState(false);
	const [readyInClinicOrder, setReadyInClinicOrder] = useState<ReadyInClinicLabOrder | null>(null);
	const [view3DScanOrder, setView3DScanOrder] = useState<DentalLabOrderData | null>(null);

	const handleOpenReadyInClinicPrompt = useCallback((order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		setReadyInClinicOrder({
			id: order.id || "ztl-order",
			orderNumber: (order as any).orderNumber || (order.id ? order.id.slice(0, 8) : "ЗТЛ-1"),
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
		setIsReadyInClinicModalOpen(true);
	}, []);

	return {
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
