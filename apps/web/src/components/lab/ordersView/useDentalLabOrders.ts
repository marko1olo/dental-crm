import React, { useMemo } from "react";
import type { DentalLabOrderData } from "../DentalLabOrderModal";
import type { LabPriceMatrixItem } from "../DentalLabPriceMatrixModal";
import { useLabOrdersData } from "./hooks/useLabOrdersData";
import { useLabOrdersFiltering } from "./hooks/useLabOrdersFiltering";
import { useLabOrdersModals } from "./hooks/useLabOrdersModals";
import { useLabOrderActions } from "./hooks/useLabOrderActions";

export interface UseDentalLabOrdersOptions {
	readonly initialOrders?: readonly DentalLabOrderData[];
	readonly onOrdersChanged?: (orders: readonly DentalLabOrderData[]) => void;
}

export function useDentalLabOrders({ initialOrders, onOrdersChanged }: UseDentalLabOrdersOptions = {}) {
	const modals = useLabOrdersModals();
	const data = useLabOrdersData({
		initialOrders,
		onOrdersChanged,
		onOpenOrderFromEvent: (draft) => {
			modals.setSelectedOrderForEdit(draft);
			modals.setModalInitialTab("main");
			modals.setIsOrderDrawerOpen(true);
		},
	});
	const filtering = useLabOrdersFiltering(data.orders);
	const actions = useLabOrderActions(data.fetchOrders, modals.handleOpenReadyInClinicPrompt);

	const selectedTimelineOrder = useMemo(() => {
		if (!modals.selectedTimelineOrderId) return null;
		return data.orders.find((o) => o.id === modals.selectedTimelineOrderId) || null;
	}, [data.orders, modals.selectedTimelineOrderId]);

	return {
		orders: data.orders, isLoading: data.isLoading, error: data.error, fetchOrders: data.fetchOrders,
		searchQuery: filtering.searchQuery, setSearchQuery: filtering.setSearchQuery,
		statusFilter: filtering.statusFilter, setStatusFilter: filtering.setStatusFilter,
		doctorFilter: filtering.doctorFilter, setDoctorFilter: filtering.setDoctorFilter,
		viewMode: filtering.viewMode, setViewMode: filtering.setViewMode,
		stageCounts: filtering.stageCounts, filteredOrders: filtering.filteredOrders,
		metrics: filtering.metrics, doctorsList: filtering.doctorsList, kanbanOrdersByStage: filtering.kanbanOrdersByStage,
		isCourierBarOpen: modals.isCourierBarOpen, setIsCourierBarOpen: modals.setIsCourierBarOpen,
		selectedTimelineOrderId: modals.selectedTimelineOrderId, setSelectedTimelineOrderId: modals.setSelectedTimelineOrderId,
		selectedTimelineOrder, kanbanStageLimits: modals.kanbanStageLimits, setKanbanStageLimits: modals.setKanbanStageLimits,
		kanbanActiveMenuId: modals.kanbanActiveMenuId, setKanbanActiveMenuId: modals.setKanbanActiveMenuId,
		openMenuOrderId: modals.openMenuOrderId, setOpenMenuOrderId: modals.setOpenMenuOrderId,
		promptState: modals.promptState, setPromptState: modals.setPromptState,
		isScanModalOpen: modals.isScanModalOpen, setIsScanModalOpen: modals.setIsScanModalOpen,
		scanAttachOrder: modals.scanAttachOrder, scanAttachType: modals.scanAttachType,
		isWorkOrderModalOpen: modals.isWorkOrderModalOpen, setIsWorkOrderModalOpen: modals.setIsWorkOrderModalOpen,
		isOrderDrawerOpen: modals.isOrderDrawerOpen, setIsOrderDrawerOpen: modals.setIsOrderDrawerOpen,
		selectedOrderForEdit: modals.selectedOrderForEdit, setSelectedOrderForEdit: modals.setSelectedOrderForEdit,
		modalInitialTab: modals.modalInitialTab, setModalInitialTab: modals.setModalInitialTab,
		isPriceMatrixModalOpen: modals.isPriceMatrixModalOpen, setIsPriceMatrixModalOpen: modals.setIsPriceMatrixModalOpen,
		isTrackerModalOpen: modals.isTrackerModalOpen, setIsTrackerModalOpen: modals.setIsTrackerModalOpen,
		isTrackingDrawerOpen: modals.isTrackingDrawerOpen, setIsTrackingDrawerOpen: modals.setIsTrackingDrawerOpen,
		selectedOrderForTracking: modals.selectedOrderForTracking,
		isReadyInClinicModalOpen: modals.isReadyInClinicModalOpen, setIsReadyInClinicModalOpen: modals.setIsReadyInClinicModalOpen,
		readyInClinicOrder: modals.readyInClinicOrder, view3DScanOrder: modals.view3DScanOrder, setView3DScanOrder: modals.setView3DScanOrder,
		isHubModalOpen: modals.isHubModalOpen, setIsHubModalOpen: modals.setIsHubModalOpen,
		handleView3DScan: (order: DentalLabOrderData) => modals.setView3DScanOrder(order),
		handleStatusChange: actions.handleStatusChange,
		handleOpenReadyInClinicPrompt: modals.handleOpenReadyInClinicPrompt,
		copyPortalLink: actions.copyPortalLink,
		handleOpenNewOrder: () => { modals.setSelectedOrderForEdit(null); modals.setModalInitialTab("main"); modals.setIsOrderDrawerOpen(true); },
		handleOpenOrderDrawer: () => { modals.setSelectedOrderForEdit(null); modals.setIsOrderDrawerOpen(true); },
		handleOpenEditOrder: (o: DentalLabOrderData) => { modals.setSelectedOrderForEdit(o); modals.setModalInitialTab("main"); modals.setIsOrderDrawerOpen(true); },
		handleOpenPrintOrder: (o: DentalLabOrderData) => { modals.setSelectedOrderForEdit(o); modals.setModalInitialTab("print"); modals.setIsWorkOrderModalOpen(true); },
		handleOpenTracking: (o: DentalLabOrderData) => { modals.setSelectedOrderForTracking(o); modals.setIsTrackingDrawerOpen(true); },
		handlePayFromCashbox: actions.handlePayFromCashbox,
		handleMarkInstalled: actions.handleMarkInstalled,
		handleAttach3DScan: (o: DentalLabOrderData) => { modals.setOpenMenuOrderId(null); modals.setScanAttachOrder(o); modals.setScanAttachType(o.attachedImageUrl?.toLowerCase().includes(".ply") ? "ply" : "stl"); modals.setIsScanModalOpen(true); },
		handleAttachBitePhoto: (o: DentalLabOrderData) => { modals.setOpenMenuOrderId(null); modals.setScanAttachOrder(o); modals.setScanAttachType("photo"); modals.setIsScanModalOpen(true); },
		handleSaveAttachedFile: async (url: string) => {
			if (modals.scanAttachOrder?.id) {
				await actions.handleSaveAttachedFile(modals.scanAttachOrder.id, url, () => modals.setIsScanModalOpen(false));
			}
		},
		handleTechnicianComment: (o: DentalLabOrderData) => {
			modals.setOpenMenuOrderId(null);
			if (!o.id) return;
			modals.setPromptState({
				title: `Комментарий зубному технику · ${(o as any).orderNumber || (o.id ? `#${o.id.slice(0, 8)}` : "ЗТЛ")}`,
				description: `Сообщение для техника ЗТЛ по наряду пациента ${o.patientName || "Пациент"}:`,
				submitLabel: "Отправить технику",
				submitVariant: "teal",
				multiline: true,
				placeholder: "Уточнение параметров препарирования, анатомии, прикуса...",
				quickPresets: [
					"Уточнить цвет по фото в приложении",
					"Обратить внимание на выраженный экватор",
					"Минимальное занижение под прикус",
					"Срочный заказ, пациент уезжает",
				],
				onSubmit: async (comment) => {
					if (!comment.trim()) {
						modals.setPromptState(null);
						return;
					}
					await actions.handleStatusChange(o.id!, o.status || "in_progress", comment.trim());
					modals.setPromptState(null);
				},
			});
		},
		handleRepeatFitting: (o: DentalLabOrderData) => {
			modals.setOpenMenuOrderId(null);
			if (!o.id) return;
			modals.setPromptState({
				title: `Повторная примерка · ${(o as any).orderNumber || (o.id ? `#${o.id.slice(0, 8)}` : "ЗТЛ")}`,
				description: `Укажите клинические замечания для повторной примерки конструкции:`,
				submitLabel: "Назначить примерку",
				submitVariant: "teal",
				multiline: true,
				placeholder: "Замечания по окклюзии, контактным пунктам, прилеганию...",
				quickPresets: [
					"Коррекция по прикусу (окклюзия)",
					"Припасовка апроксимальных контактов",
					"Индивидуализация мамелонов и микрорельефа",
					"Повторная примерка после коррекции уступа",
				],
				onSubmit: async (reason) => {
					await actions.handleStatusChange(o.id!, "refitting", reason.trim() || "Повторная примерка конструкции");
					modals.setPromptState(null);
				},
			});
		},
		handleReclamation: (o: DentalLabOrderData) => {
			modals.setOpenMenuOrderId(null);
			if (!o.id) return;
			modals.setPromptState({
				title: `Рекламация / Гарантийная переделка (0 ₽) · ${(o as any).orderNumber || (o.id ? `#${o.id.slice(0, 8)}` : "ЗТЛ")}`,
				description: `Укажите причину рекламации. Для пациента переделка бесплатна (0 ₽). Наряд передается технику без создания дубликата пациента.`,
				submitLabel: "Оформить рекламацию (0 ₽)",
				submitVariant: "danger",
				multiline: true,
				placeholder: "Причина брака или рекламации...",
				quickPresets: [
					"Несоответствие оттенка / цвета VITA",
					"Завышение по прикусу / окклюзии",
					"Неплотное краевое прилегание / балансировка",
					"Скол керамической массы",
					"Недосадка каркаса на уступ",
					"Коррекция контактного пункта",
				],
				onSubmit: async (reason) => {
					await actions.handleStatusChange(o.id!, "refitting", `Рекламация (0 ₽): ${reason.trim() || "Гарантийная переделка"}`);
					modals.setPromptState(null);
				},
			});
		},
		handleCreateOrderFromPriceMatrix: (item: LabPriceMatrixItem) => {
			modals.setSelectedOrderForEdit({ patientId: "", patientName: "Пациент", material: item.material, constructionType: item.id, priceRub: item.suggestedCostRub, clinicalNotes: item.specialInstructions || "" });
			modals.setModalInitialTab("main");
			modals.setIsOrderDrawerOpen(true);
		},
	};
}
