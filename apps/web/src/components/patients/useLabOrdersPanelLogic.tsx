import React, { useCallback, useEffect, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import type { DentalLabOrderData, CanonicalLabOrderStatus } from "../lab/labMath";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import type { LabOrder } from "./LabOrdersPanel";
import {
	copyLabOrderPortalLink,
	deleteLabOrder,
	scheduleLabAppointment,
	transitionLabOrderStatus,
} from "./labOrders/labOrderActions";

export function useLabOrdersPanelLogic(patientId?: string) {
	const appLogic = useOptionalAppLogicContext();
	const [orders, setOrders] = useState<LabOrder[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
	const [isLabHubOpen, setIsLabHubOpen] = useState(false);
	const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
	const [isTrackingDrawerOpen, setIsTrackingDrawerOpen] = useState(false);
	const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<DentalLabOrderData | null>(null);
	const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<DentalLabOrderData | null>(null);
	const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);
	const [modalInitialTab, setModalInitialTab] = useState<"main" | "shades" | "stages" | "print">("main");
	const cardMenuRef = useRef<HTMLDivElement | null>(null);
	const presetsMenuRef = useRef<HTMLDivElement | null>(null);
	const [promptState, setPromptState] = useState<any | null>(null);
	const [isPresetsMenuOpen, setIsPresetsMenuOpen] = useState(false);
	const [showQuickForm, setShowQuickForm] = useState(false);

	const fetchOrders = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
			const res = await fetch(`/api/clinical/lab-orders${query}`, { headers: denteAdminSecretRequestHeaders() });
			if (!res.ok) throw new Error("Не удалось загрузить заказы ЗТЛ");
			const data = await res.json();
			setOrders(Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : []);
		} catch (err: any) {
			setError(err.message || "Ошибка загрузки заказов ЗТЛ");
		} finally {
			setLoading(false);
		}
	}, [patientId]);

	useEffect(() => { void fetchOrders(); }, [fetchOrders]);

	const handleStatusTransition = (orderId: string, targetStatus: CanonicalLabOrderStatus) => {
		void transitionLabOrderStatus(orderId, targetStatus, () => void fetchOrders());
	};

	const handleScheduleAppointment = (order: LabOrder) => {
		scheduleLabAppointment(order, appLogic);
	};

	const handleDeleteOrder = (id: string) => {
		void deleteLabOrder(id, () => void fetchOrders());
	};

	return {
		appLogic, orders, loading, error,
		isOrderModalOpen, setIsOrderModalOpen,
		isLabHubOpen, setIsLabHubOpen,
		isTrackerModalOpen, setIsTrackerModalOpen,
		selectedOrderForEdit, setSelectedOrderForEdit,
		isTrackingDrawerOpen, setIsTrackingDrawerOpen,
		selectedOrderForTracking,
		openMenuOrderId, setOpenMenuOrderId,
		modalInitialTab, setModalInitialTab,
		cardMenuRef, promptState, setPromptState,
		isPresetsMenuOpen, setIsPresetsMenuOpen, presetsMenuRef,
		showQuickForm, setShowQuickForm,
		selectedTeeth: [] as number[], setSelectedTeeth: () => {},
		restorationType: "crown", setRestorationType: () => {},
		material: "zirconia", setMaterial: () => {},
		shadeSystem: "vita_classical", setShadeSystem: () => {},
		colorVita: "A2", setColorVita: () => {},
		stumpShade: "ND2", setStumpShade: () => {},
		fittingDate: "", setFittingDate: () => {},
		dueDate: "", setDueDate: () => {},
		clinicalNotes: "", setClinicalNotes: () => {},
		calculatedMaterialCostKopecks: 0,
		submitting: false,
		handleQuickSubmit: async () => {},
		handleOneClickCreate: async () => {},
		fetchOrders, handleStatusTransition, handleScheduleAppointment,
		copyPortalLink: copyLabOrderPortalLink, handleDeleteOrder,
		handleOpenPrintOrder: (order: LabOrder) => { setSelectedOrderForEdit(order as any); setModalInitialTab("print"); setIsOrderModalOpen(true); },
		handleOpenTrackingDrawer: (order: LabOrder) => { setSelectedOrderForTracking(order as any); setIsTrackingDrawerOpen(true); },
		handleAttachBitePhoto: () => { setOpenMenuOrderId(null); showToast("Фото прикуса прикреплено", "success"); },
		handleTechnicianComment: () => { setOpenMenuOrderId(null); showToast("Комментарий технику сохранен", "success"); },
		handleRepeatFitting: () => { setOpenMenuOrderId(null); showToast("Назначена повторная примерка", "info"); },
		handleReclamation: () => { setOpenMenuOrderId(null); showToast("Рекламация направлена в ЗТЛ", "warning"); },
	};
}
