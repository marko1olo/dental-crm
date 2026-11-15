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

export interface LabOrderPromptState {
	title: string;
	description?: string;
	placeholder?: string;
	defaultValue?: string;
	confirmLabel?: string;
	onConfirm: (value: string) => void | Promise<void>;
	onCancel: () => void;
}

export function labOrderToDentalLabOrderData(order: LabOrder): DentalLabOrderData {
	return {
		id: order.id,
		patientId: order.patientId,
		patientName: order.patientName ?? undefined,
		doctorId: order.doctorId,
		doctorName: order.doctorName,
		orderNumber: order.orderNumber ?? order.gostOrderNumber ?? undefined,
		secureToken: order.secureToken,
		toothFdi: order.toothFdi,
		material: order.material,
		colorVita: order.colorVita,
		constructionType: order.constructionType ?? undefined,
		status: order.status,
		stage: order.stage ?? undefined,
		dueDate: order.dueDate,
		clinicalNotes: order.clinicalNotes,
		labComments: order.labComments,
		attachedImageUrl: order.attachedImageUrl,
	};
}

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
	const [promptState, setPromptState] = useState<LabOrderPromptState | null>(null);
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
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка загрузки заказов ЗТЛ";
			setError(msg);
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
		setSelectedOrderForEdit(labOrderToDentalLabOrderData(order));
		setModalInitialTab("main");
		setIsOrderModalOpen(true);
	};

	const handleOpenPrintOrder = (order: LabOrder) => {
		setSelectedOrderForEdit(labOrderToDentalLabOrderData(order));
		setModalInitialTab("print");
		setIsOrderModalOpen(true);
	};

	const handleOpenTrackingDrawer = (order: LabOrder) => {
		setSelectedOrderForTracking(labOrderToDentalLabOrderData(order));
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
		handleAttachBitePhoto: async (orderOrId?: DentalLabOrderData | LabOrder | string, photoUrl?: string) => {
			const targetId = typeof orderOrId === "string" ? orderOrId : (orderOrId as { id?: string })?.id ?? openMenuOrderId;
			setOpenMenuOrderId(null);
			if (!targetId) {
				showToast("Выберите наряд ЗТЛ для прикрепления фото", "warning");
				return;
			}
			if (photoUrl?.trim()) {
				try {
					const res = await fetch(`/api/clinical/lab-orders/${targetId}/status`, {
						method: "PATCH",
						headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
						body: JSON.stringify({ notes: `Фото прикуса: ${photoUrl.trim()}` }),
					});
					if (!res.ok) throw new Error("Ошибка сохранения фото");
					showToast("Фото прикуса сохранено в аудит-логе наряда", "success");
					void fetchOrders();
				} catch {
					showToast("Сбой сети при сохранении фото прикуса", "error");
				}
			} else {
				showToast("Фото прикуса зафиксировано", "info");
			}
		},
		handleTechnicianComment: async (orderOrId?: DentalLabOrderData | LabOrder | string, comment?: string) => {
			const targetId = typeof orderOrId === "string" ? orderOrId : (orderOrId as { id?: string })?.id ?? openMenuOrderId;
			setOpenMenuOrderId(null);
			if (!targetId) {
				showToast("Выберите наряд ЗТЛ для отправки комментария", "warning");
				return;
			}
			const noteText = comment?.trim() || "Комментарий клиники передан технику ЗТЛ";
			try {
				const res = await fetch(`/api/clinical/lab-orders/${targetId}/status`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
					body: JSON.stringify({ notes: noteText, labComments: noteText }),
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.message || "Ошибка отправки комментария технику");
				}
				showToast("Комментарий технику сохранен в наряде и журнале аудита", "success");
				void fetchOrders();
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Сбой сети при сохранении комментария";
				showToast(msg, "error");
			}
		},
		handleRepeatFitting: async (orderOrId?: DentalLabOrderData | LabOrder | string, reason?: string) => {
			const targetId = typeof orderOrId === "string" ? orderOrId : (orderOrId as { id?: string })?.id ?? openMenuOrderId;
			setOpenMenuOrderId(null);
			if (!targetId) {
				showToast("Выберите наряд ЗТЛ для повторной примерки", "warning");
				return;
			}
			try {
				const res = await fetch(`/api/clinical/lab-orders/${targetId}/status`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
					body: JSON.stringify({
						status: "fitting",
						stage: "correction_required",
						notes: reason?.trim() ? `Повторная примерка: ${reason.trim()}` : "Назначена повторная примерка (требуется коррекция конструкции)",
					}),
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.message || "Ошибка перевода статуса наряда");
				}
				showToast("Наряд переведен на повторную примерку (статус: fitting)", "info");
				void fetchOrders();
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Сбой сети при назначении повторной примерки";
				showToast(msg, "error");
			}
		},
		handleReclamation: async (orderOrId?: DentalLabOrderData | LabOrder | string, reason?: string) => {
			const targetId = typeof orderOrId === "string" ? orderOrId : (orderOrId as { id?: string })?.id ?? openMenuOrderId;
			setOpenMenuOrderId(null);
			if (!targetId) {
				showToast("Выберите наряд ЗТЛ для рекламации", "warning");
				return;
			}
			try {
				const res = await fetch(`/api/clinical/lab-orders/${targetId}/status`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
					body: JSON.stringify({
						status: "refitting",
						stage: "correction_remake",
						notes: reason?.trim() ? `Рекламация в ЗТЛ (0 ₽): ${reason.trim()}` : "Рекламация: гарантийная переделка конструкции в ЗТЛ (0 ₽)",
					}),
				});
				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.message || "Ошибка отправки рекламации в ЗТЛ");
				}
				showToast("Рекламация успешно направлена в ЗТЛ (статус: переделка / refitting)", "warning");
				void fetchOrders();
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Сбой сети при отправке рекламации";
				showToast(msg, "error");
			}
		},
	};
}
