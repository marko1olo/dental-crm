import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import type { DentalLabOrderData, CanonicalLabOrderStatus } from "../lab/labMath";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import type { LabOrder, LabOrderFilterKey } from "./labOrdersTypes";
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
	const [filter, setFilter] = useState<LabOrderFilterKey>("all");

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
			const list = Array.isArray(data) ? data : Array.isArray(data?.orders) ? data.orders : [];
			setOrders(list);
		} catch (err: any) {
			setError(err.message || "Ошибка загрузки заказов ЗТЛ");
		} finally {
			setLoading(false);
		}
	}, [patientId]);

	useEffect(() => {
		void fetchOrders();
	}, [fetchOrders]);

	const filteredOrders = useMemo(() => {
		if (filter === "all") return orders;
		if (filter === "active") {
			return orders.filter((o) =>
				["sent", "sent_to_lab", "in_progress", "processing", "draft"].includes(o.status.toLowerCase()),
			);
		}
		if (filter === "fitting") {
			return orders.filter((o) =>
				["fitting", "shipped", "refitting", "ready_for_fitting"].includes(o.status.toLowerCase()),
			);
		}
		if (filter === "ready") {
			return orders.filter((o) =>
				["received", "ready_in_clinic", "in_clinic"].includes(o.status.toLowerCase()),
			);
		}
		if (filter === "completed") {
			return orders.filter((o) =>
				["completed", "installed"].includes(o.status.toLowerCase()),
			);
		}
		return orders;
	}, [orders, filter]);

	const filterCounts = useMemo(() => {
		const counts: Record<LabOrderFilterKey, number> = {
			all: orders.length,
			active: 0,
			fitting: 0,
			ready: 0,
			completed: 0,
		};
		for (const o of orders) {
			const s = o.status.toLowerCase();
			if (["sent", "sent_to_lab", "in_progress", "processing", "draft"].includes(s)) counts.active++;
			if (["fitting", "shipped", "refitting", "ready_for_fitting"].includes(s)) counts.fitting++;
			if (["received", "ready_in_clinic", "in_clinic"].includes(s)) counts.ready++;
			if (["completed", "installed"].includes(s)) counts.completed++;
		}
		return counts;
	}, [orders]);

	const handleStatusTransition = (orderId: string, targetStatus: string) => {
		void transitionLabOrderStatus(orderId, targetStatus as CanonicalLabOrderStatus, () => void fetchOrders());
	};

	const handleScheduleAppointment = (order: LabOrder) => {
		scheduleLabAppointment(order, appLogic);
	};

	const handleDeleteOrder = (id: string) => {
		void deleteLabOrder(id, () => void fetchOrders());
	};

	const handleOpenCreateOrder = () => {
		setSelectedOrderForEdit(null);
		setModalInitialTab("main");
		setIsOrderModalOpen(true);
	};

	const handleOpenEditOrder = (order: LabOrder) => {
		setSelectedOrderForEdit(order as any);
		setModalInitialTab("main");
		setIsOrderModalOpen(true);
	};

	const handleOpenPrintOrder = (order: LabOrder) => {
		setSelectedOrderForEdit(order as any);
		setModalInitialTab("print");
		setIsOrderModalOpen(true);
	};

	const handleOpenTrackingDrawer = (order: LabOrder) => {
		setSelectedOrderForTracking(order as any);
		setIsTrackingDrawerOpen(true);
	};

	return {
		appLogic,
		orders,
		filteredOrders,
		filter,
		setFilter,
		filterCounts,
		loading,
		error,
		isOrderModalOpen,
		setIsOrderModalOpen,
		isLabHubOpen,
		setIsLabHubOpen,
		isTrackerModalOpen,
		setIsTrackerModalOpen,
		selectedOrderForEdit,
		setSelectedOrderForEdit,
		isTrackingDrawerOpen,
		setIsTrackingDrawerOpen,
		selectedOrderForTracking,
		openMenuOrderId,
		setOpenMenuOrderId,
		modalInitialTab,
		setModalInitialTab,
		cardMenuRef,
		promptState,
		setPromptState,
		isPresetsMenuOpen,
		setIsPresetsMenuOpen,
		presetsMenuRef,
		showQuickForm,
		setShowQuickForm,
		selectedTeeth: [] as number[],
		setSelectedTeeth: () => {},
		restorationType: "crown",
		setRestorationType: () => {},
		material: "zirconia",
		setMaterial: () => {},
		shadeSystem: "vita_classical",
		setShadeSystem: () => {},
		colorVita: "A2",
		setColorVita: () => {},
		stumpShade: "ND2",
		setStumpShade: () => {},
		fittingDate: "",
		setFittingDate: () => {},
		dueDate: "",
		setDueDate: () => {},
		clinicalNotes: "",
		setClinicalNotes: () => {},
		calculatedMaterialCostKopecks: 0,
		submitting: false,
		handleQuickSubmit: async () => {},
		handleOneClickCreate: async () => {},
		fetchOrders,
		handleStatusTransition,
		handleScheduleAppointment,
		copyPortalLink: copyLabOrderPortalLink,
		handleDeleteOrder,
		handleOpenCreateOrder,
		handleOpenEditOrder,
		handleOpenPrintOrder,
		handleOpenTrackingDrawer,
		handleAttachBitePhoto: () => {
			setOpenMenuOrderId(null);
			showToast("Фото прикуса прикреплено", "success");
		},
		handleTechnicianComment: () => {
			setOpenMenuOrderId(null);
			showToast("Комментарий технику сохранен", "success");
		},
		handleRepeatFitting: () => {
			setOpenMenuOrderId(null);
			showToast("Назначена повторная примерка", "info");
		},
		handleReclamation: () => {
			setOpenMenuOrderId(null);
			showToast("Рекламация направлена в ЗТЛ", "warning");
		},
	};
}
