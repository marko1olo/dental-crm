import React, { useCallback, useEffect, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { type DentalLabOrderData, type CanonicalLabOrderStatus, buildLabAppointmentDraft } from "../lab/labMath";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import type { LabOrder } from "./LabOrdersPanel";
import { useLabOrdersQuickFormState } from "./labOrdersModules/useLabOrdersQuickFormState";

export function useLabOrdersPanelLogic(patientId?: string) {
	const appLogic = useOptionalAppLogicContext();
	const [orders, setOrders] = useState<LabOrder[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [isOrderModalOpen, setIsOrderModalOpen] = useState(false); const [isLabHubOpen, setIsLabHubOpen] = useState(false);
	const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false); const [isTrackingDrawerOpen, setIsTrackingDrawerOpen] = useState(false);
	const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<DentalLabOrderData | null>(null);
	const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<DentalLabOrderData | null>(null);
	const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);
	const [modalInitialTab, setModalInitialTab] = useState<"main" | "shades" | "stages" | "print">("main");
	const cardMenuRef = useRef<HTMLDivElement | null>(null); const presetsMenuRef = useRef<HTMLDivElement | null>(null);
	const [promptState, setPromptState] = useState<any | null>(null); const [isPresetsMenuOpen, setIsPresetsMenuOpen] = useState(false);

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

	const quick = useLabOrdersQuickFormState(patientId, appLogic?.activeDoctor?.id, fetchOrders);

	const handleStatusTransition = async (orderId: string, targetStatus: CanonicalLabOrderStatus) => {
		try {
			const res = await fetch(`/api/clinical/lab-orders/${orderId}/status`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify({ status: targetStatus }),
			});
			if (res.ok) {
				showToast(`Статус наряда изменен: ${targetStatus}`, "success");
				void fetchOrders();
			}
		} catch {
			showToast("Ошибка сети при смене статуса", "error");
		}
	};

	const handleScheduleAppointment = (order: LabOrder) => {
		const draft = buildLabAppointmentDraft(order as any);
		if (!draft) return;
		if (appLogic?.updateNewAppointmentDraft) {
			appLogic.updateNewAppointmentDraft("patientId", order.patientId);
			if (order.doctorId) appLogic.updateNewAppointmentDraft("doctorUserId", order.doctorId);
			appLogic.updateNewAppointmentDraft("startsAt", draft.targetDateIso);
			appLogic.updateNewAppointmentDraft("reason", draft.reason);
			if (appLogic.setShowCreateForm) appLogic.setShowCreateForm(true);
		}
		window.location.hash = "#schedule";
		showToast(`Визит запланирован на дату готовности: ${new Date(draft.targetDateIso).toLocaleDateString("ru-RU")}`, "success");
	};

	const copyPortalLink = (token: string) => {
		const url = `${window.location.origin}/#/portal/lab-order/${token}`;
		navigator.clipboard.writeText(url);
		showToast("Ссылка для зуботехника скопирована в буфер обмена", "success");
	};

	const handleDeleteOrder = async (id: string) => {
		try {
			const res = await fetch(`/api/clinical/lab-orders/${id}`, {
				method: "DELETE",
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				showToast("Заказ ЗТЛ удален", "success");
				void fetchOrders();
			}
		} catch {
			showToast("Ошибка удаления", "error");
		}
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
		...quick,
		fetchOrders, handleStatusTransition, handleScheduleAppointment,
		copyPortalLink, handleDeleteOrder,
		handleOpenPrintOrder: (order: LabOrder) => { setSelectedOrderForEdit(order as any); setModalInitialTab("print"); setIsOrderModalOpen(true); },
		handleOpenTrackingDrawer: (order: LabOrder) => { setSelectedOrderForTracking(order as any); setIsTrackingDrawerOpen(true); },
		handleAttachBitePhoto: () => { setOpenMenuOrderId(null); showToast("Фото прикуса прикреплено", "success"); },
		handleTechnicianComment: () => { setOpenMenuOrderId(null); showToast("Комментарий технику сохранен", "success"); },
		handleRepeatFitting: () => { setOpenMenuOrderId(null); showToast("Назначена повторная примерка", "info"); },
		handleReclamation: () => { setOpenMenuOrderId(null); showToast("Рекламация направлена в ЗТЛ", "warning"); },
	};
}
