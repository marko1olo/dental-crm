import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertOctagon, MessageSquare } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { showToast } from "../../GlobalToast";
import type { DentalLabOrderData } from "../../lab/DentalLabOrderModal";
import { useAppStore } from "../../../store/appStore";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { is3DScanUrl } from "../../lab/LabAttachScanModal";
import type { LabPromptDialogState } from "../../lab/LabActionPromptModal";
import type { ReadyInClinicLabOrder } from "../../lab/DentalLabReadyInClinicModal";
import type { LabPriceMatrixItem } from "../DentalLabPriceMatrixModal";
import { mapRawApiOrderToWorkflowOrder } from "../../lab/dentalLabApiMapper";
import type { DentalLabWorkflowOrder, LabWorkflowStatus } from "../../lab/dentalLabWorkflowEngine";
import { CANONICAL_DEMO_LAB_ORDERS, CANONICAL_STAGE_FILTERS } from "./constants";
import type { DentalLabMetrics, LabOrdersViewMode } from "./types";

export interface UseDentalLabOrdersOptions {
	readonly initialOrders?: readonly DentalLabOrderData[];
	readonly onOrdersChanged?: (orders: readonly DentalLabOrderData[]) => void;
}

export function useDentalLabOrders({
	initialOrders,
	onOrdersChanged,
}: UseDentalLabOrdersOptions = {}) {
	const [orders, setOrders] = useState<DentalLabOrderData[]>(
		initialOrders ? [...initialOrders] : [],
	);
	const [isLoading, setIsLoading] = useState(!initialOrders);
	const [error, setError] = useState<string | null>(null);

	// Фильтры и поиск
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [doctorFilter, setDoctorFilter] = useState<string>("all");
	const [viewMode, setViewMode] = useState<LabOrdersViewMode>("table");
	const [isHubModalOpen, setIsHubModalOpen] = useState(false);
	const [kanbanStageLimits, setKanbanStageLimits] = useState<Record<string, number>>({});
	const [kanbanActiveMenuId, setKanbanActiveMenuId] = useState<string | null>(null);
	const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);

	// Отображение курьерской панели
	const [isCourierBarOpen, setIsCourierBarOpen] = useState(true);

	// Выбранный наряд для инспекции таймлайна
	const [selectedTimelineOrderId, setSelectedTimelineOrderId] = useState<string | null>(null);

	// Диалоги и модалки
	const [promptState, setPromptState] = useState<LabPromptDialogState | null>(null);
	const [isScanModalOpen, setIsScanModalOpen] = useState(false);
	const [scanAttachOrder, setScanAttachOrder] = useState<DentalLabOrderData | null>(null);
	const [scanAttachType, setScanAttachType] = useState<"stl" | "ply" | "photo">("stl");

	// Модалка наряда
	const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
	const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<DentalLabOrderData | null>(null);
	const [modalInitialTab, setModalInitialTab] = useState<"main" | "shades" | "stages" | "print">("main");

	// Модалка прайс-матрицы
	const [isPriceMatrixModalOpen, setIsPriceMatrixModalOpen] = useState(false);

	// Трекер модалка и шторка
	const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
	const [isTrackingDrawerOpen, setIsTrackingDrawerOpen] = useState(false);
	const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<DentalLabOrderData | null>(null);

	// Модалка "Готово в клинике"
	const [isReadyInClinicModalOpen, setIsReadyInClinicModalOpen] = useState(false);
	const [readyInClinicOrder, setReadyInClinicOrder] = useState<ReadyInClinicLabOrder | null>(null);

	// Модалка 3D-просмотрщика интраорального скана
	const [view3DScanOrder, setView3DScanOrder] = useState<DentalLabOrderData | null>(null);

	const handleView3DScan = useCallback((order: DentalLabOrderData) => {
		setView3DScanOrder(order);
	}, []);

	// Live status updates from store
	const labOrderStatuses = useAppStore((state: any) => state.labOrderStatuses);

	const fetchOrders = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			if (isDemoShowcaseMode()) {
				setOrders([...CANONICAL_DEMO_LAB_ORDERS]);
				onOrdersChanged?.(CANONICAL_DEMO_LAB_ORDERS);
				return;
			}

			const res = await fetch("/api/dental-lab/orders", {
				headers: denteAdminSecretRequestHeaders(),
			});

			if (!res.ok) {
				if (
					isDemoShowcaseMode() ||
					(typeof window !== "undefined" && window.location.search.includes("demo=true"))
				) {
					setOrders([...CANONICAL_DEMO_LAB_ORDERS]);
					onOrdersChanged?.(CANONICAL_DEMO_LAB_ORDERS);
					return;
				}
				throw new Error(`Ошибка загрузки нарядов ЗТЛ: ${res.status}`);
			}

			const data = await res.json();
			const list = Array.isArray(data) ? data : [];
			if (
				list.length === 0 &&
				(isDemoShowcaseMode() ||
					(typeof window !== "undefined" && window.location.search.includes("demo=true")))
			) {
				setOrders([...CANONICAL_DEMO_LAB_ORDERS]);
				onOrdersChanged?.(CANONICAL_DEMO_LAB_ORDERS);
				return;
			}
			setOrders(list);
			onOrdersChanged?.(list);
		} catch (err: unknown) {
			if (
				isDemoShowcaseMode() ||
				(typeof window !== "undefined" && window.location.search.includes("demo=true"))
			) {
				setOrders([...CANONICAL_DEMO_LAB_ORDERS]);
				onOrdersChanged?.(CANONICAL_DEMO_LAB_ORDERS);
				return;
			}
			const msg = err instanceof Error ? err.message : "Не удалось загрузить наряды лаборатории";
			setError(msg);
		} finally {
			setIsLoading(false);
		}
	}, [onOrdersChanged]);

	useEffect(() => {
		if (!initialOrders) {
			void fetchOrders();
		}
	}, [fetchOrders, initialOrders, labOrderStatuses]);

	// Слушатель кастомного события на открытие наряда
	useEffect(() => {
		const handleOpenFromEvent = (e: Event) => {
			const detail = (e as CustomEvent<DentalLabOrderData>).detail;
			let draft = detail;
			if (!draft && typeof window !== "undefined") {
				try {
					const raw = window.localStorage.getItem("dente_pending_lab_order_draft");
					if (raw) draft = JSON.parse(raw);
				} catch {
					// ignore
				}
			}
			if (draft) {
				setSelectedOrderForEdit(draft);
				setModalInitialTab("main");
				setIsWorkOrderModalOpen(true);
			}
		};
		window.addEventListener("dente-open-lab-order", handleOpenFromEvent);
		return () => window.removeEventListener("dente-open-lab-order", handleOpenFromEvent);
	}, []);

	// Слушатель кастомного события создания/сохранения наряда ЗТЛ
	useEffect(() => {
		const handleOrderCreated = (e: Event) => {
			const detail = (e as CustomEvent<DentalLabOrderData>).detail;
			if (detail) {
				setOrders((prev) => {
					const existingIndex = prev.findIndex(
						(o) =>
							o.id === detail.id ||
							(detail.secureToken && o.secureToken === detail.secureToken),
					);
					if (existingIndex >= 0) {
						const next = [...prev];
						next[existingIndex] = { ...next[existingIndex], ...detail };
						return next;
					}
					return [detail, ...prev];
				});
			}
			void fetchOrders();
		};
		window.addEventListener("dente-lab-order-created", handleOrderCreated);
		return () => window.removeEventListener("dente-lab-order-created", handleOrderCreated);
	}, [fetchOrders]);

	const stageCounts = useMemo(() => {
		const counts: Record<string, number> = {
			all: orders.length,
		};
		for (const f of CANONICAL_STAGE_FILTERS) {
			if (f.id === "all") continue;
			counts[f.id] = orders.filter((o) => {
				const status = o.status || "";
				const stage =
					(o as unknown as { stage?: string; currentStage?: string }).stage ||
					(o as unknown as { currentStage?: string }).currentStage ||
					"";
				const hasStatus = f.statuses.includes(status);
				const hasStage = f.id === stage || f.statuses.includes(stage);
				return hasStatus || hasStage;
			}).length;
		}
		return counts;
	}, [orders]);

	const filteredOrders = useMemo(() => {
		const matchedFilter = CANONICAL_STAGE_FILTERS.find((f) => f.id === statusFilter);

		return orders.filter((o) => {
			if (statusFilter !== "all" && matchedFilter) {
				const status = o.status || "";
				const stage =
					(o as unknown as { stage?: string; currentStage?: string }).stage ||
					(o as unknown as { currentStage?: string }).currentStage ||
					"";
				const hasStatus = matchedFilter.statuses.includes(status);
				const hasStage = matchedFilter.id === stage || matchedFilter.statuses.includes(stage);
				if (!hasStatus && !hasStage) return false;
			}
			if (doctorFilter !== "all" && o.doctorId !== doctorFilter && o.doctorName !== doctorFilter) {
				return false;
			}

			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const pName = (o.patientName || "").toLowerCase();
				const dName = (o.doctorName || "").toLowerCase();
				const tooth = (o.toothFdi || "").toLowerCase();
				const mat = (o.material || "").toLowerCase();
				const notes = (o.clinicalNotes || "").toLowerCase();
				const num = (
					(o as unknown as { orderNumber?: string }).orderNumber ||
					o.id ||
					""
				).toLowerCase();
				return (
					pName.includes(q) ||
					dName.includes(q) ||
					tooth.includes(q) ||
					mat.includes(q) ||
					notes.includes(q) ||
					num.includes(q)
				);
			}

			return true;
		});
	}, [orders, statusFilter, doctorFilter, searchQuery]);

	const metrics: DentalLabMetrics = useMemo(() => {
		const total = orders.length;
		const inProgress = orders.filter(
			(o) => o.status === "in_progress" || o.status === "sent",
		).length;
		const tryIn = orders.filter(
			(o) => o.status === "fitting" || o.status === "refitting",
		).length;
		const ready = orders.filter(
			(o) =>
				o.status === "ready" ||
				o.status === "ready_in_clinic" ||
				o.status === "shipped" ||
				o.status === "delivered" ||
				o.status === "received" ||
				o.status === "completed",
		).length;
		const completed = orders.filter((o) => o.status === "completed").length;
		const overdue = orders.filter((o) => {
			if (!o.dueDate || o.status === "completed" || o.status === "cancelled") return false;
			const due = new Date(o.dueDate).getTime();
			return !Number.isNaN(due) && due < Date.now();
		}).length;

		return { total, inProgress, tryIn, ready, completed, overdue };
	}, [orders]);

	const doctorsList = useMemo(() => {
		const set = new Set<string>();
		for (const o of orders) {
			if (o.doctorName) set.add(o.doctorName);
		}
		return Array.from(set).sort();
	}, [orders]);

	const kanbanOrdersByStage = useMemo(() => {
		const map: Record<LabWorkflowStatus, DentalLabWorkflowOrder[]> = {
			draft: [],
			sent_to_lab: [],
			fitting_scheduled: [],
			installed_completed: [],
			warranty_rework: [],
		};
		filteredOrders.forEach((raw, idx) => {
			const wf = mapRawApiOrderToWorkflowOrder(
				raw,
				idx,
				raw.patientId,
				raw.patientName,
				raw.doctorName,
			);
			if (map[wf.currentStage]) {
				map[wf.currentStage].push(wf);
			} else {
				map.draft.push(wf);
			}
		});
		return map;
	}, [filteredOrders]);

	const handleOpenReadyInClinicPrompt = useCallback((order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		const target: ReadyInClinicLabOrder = {
			id: order.id || "ztl-order",
			orderNumber:
				(order as unknown as { orderNumber?: string }).orderNumber ||
				(order.id ? order.id.slice(0, 8) : "ЗТЛ-1"),
			patientId: order.patientId ?? undefined,
			patientName: order.patientName || "Пациент",
			patientPhone: (order as unknown as { patientPhone?: string }).patientPhone ?? undefined,
			doctorName: order.doctorName ?? undefined,
			doctorId: order.doctorId ?? undefined,
			toothFdi: order.toothFdi ?? undefined,
			material: order.material ?? undefined,
			colorVita: order.colorVita ?? undefined,
			constructionType: order.constructionType ?? undefined,
			clinicName: "DENTE",
		};
		setReadyInClinicOrder(target);
		setIsReadyInClinicModalOpen(true);
	}, []);

	const handleStatusChange = async (orderId: string, newStatus: string) => {
		try {
			const res = await fetch(`/api/clinical/lab-orders/${orderId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({ status: newStatus }),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка обновления статуса");
			}

			showToast("Статус наряда ЗТЛ успешно обновлен", "success");
			void fetchOrders();

			if (
				newStatus === "ready" ||
				newStatus === "ready_in_clinic" ||
				newStatus === "shipped" ||
				newStatus === "delivered" ||
				newStatus === "received"
			) {
				const matched = orders.find((o) => o.id === orderId);
				if (matched) {
					handleOpenReadyInClinicPrompt({ ...matched, status: newStatus });
				}
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка смены статуса";
			showToast(msg, "error");
		}
	};

	const copyPortalLink = (token?: string) => {
		if (!token) return;
		const url = `${window.location.origin}/#/portal/lab-order/${token}`;
		void navigator.clipboard.writeText(url);
		showToast("Ссылка для зуботехника скопирована в буфер обмена", "success");
	};

	const handleOpenNewOrder = () => {
		setSelectedOrderForEdit(null);
		setModalInitialTab("main");
		setIsWorkOrderModalOpen(true);
	};

	const handleOpenEditOrder = (order: DentalLabOrderData) => {
		setSelectedOrderForEdit(order);
		setModalInitialTab("main");
		setIsWorkOrderModalOpen(true);
	};

	const handleOpenPrintOrder = (order: DentalLabOrderData) => {
		setSelectedOrderForEdit(order);
		setModalInitialTab("print");
		setIsWorkOrderModalOpen(true);
	};

	const handleOpenTracking = (order: DentalLabOrderData) => {
		setSelectedOrderForTracking(order);
		setIsTrackingDrawerOpen(true);
	};

	const handlePayFromCashbox = useCallback(
		async (order: DentalLabOrderData) => {
			setOpenMenuOrderId(null);
			if (!order.id) return;
			try {
				if (isDemoShowcaseMode()) {
					setOrders((prev) =>
						prev.map((o) =>
							o.id === order.id
								? { ...o, paidFromCashOperationId: `demo-cash-op-${Date.now()}` }
								: o,
						),
					);
					showToast(
						`Наряд ЗТЛ оплачен из кассы (${
							order.priceRub?.toLocaleString("ru-RU") || 0
						} ₽, статья 11: Оплата услуг лаборатории)`,
						"success",
						4000,
					);
					return;
				}

				const res = await fetch(`/api/lab-orders/${order.id}/pay`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({
						amountRub: order.priceRub,
						notes: `Оплата наряда ЗТЛ по заказу (зуб ${order.toothFdi || "—"})`,
					}),
				});

				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.message || "Ошибка оплаты наряда из кассы");
				}

				const result = await res.json();
				showToast(
					result.message ||
						`Наряд ЗТЛ успешно оплачен из кассы (${order.priceRub} ₽, статья 11)`,
					"success",
					4000,
				);
				void fetchOrders();
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Не удалось оплатить наряд из кассы";
				showToast(msg, "error");
			}
		},
		[fetchOrders],
	);

	const handleMarkInstalled = useCallback(
		async (order: DentalLabOrderData) => {
			setOpenMenuOrderId(null);
			if (!order.id) return;
			try {
				if (isDemoShowcaseMode()) {
					setOrders((prev) =>
						prev.map((o) =>
							o.id === order.id ? { ...o, status: "completed" as any } : o,
						),
					);
					showToast(
						"Конструкция сдана и зафиксирована во рту пациента (наряд заблокирован)",
						"success",
						4000,
					);
					return;
				}

				const res = await fetch(`/api/lab-orders/${order.id}/mark-installed`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({}),
				});

				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(err.message || "Ошибка фиксации установки конструкции");
				}

				showToast(
					"Конструкция успешно сдана и зафиксирована во рту пациента",
					"success",
					4000,
				);
				void fetchOrders();
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Не удалось зафиксировать установку";
				showToast(msg, "error");
			}
		},
		[fetchOrders],
	);

	const handleAttach3DScan = (order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		setScanAttachOrder(order);
		setScanAttachType(
			order.attachedImageUrl?.toLowerCase().includes(".ply") ? "ply" : "stl",
		);
		setIsScanModalOpen(true);
	};

	const handleAttachBitePhoto = (order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		setScanAttachOrder(order);
		setScanAttachType("photo");
		setIsScanModalOpen(true);
	};

	const handleSaveAttachedFile = async (url: string) => {
		if (!scanAttachOrder?.id) return;
		try {
			const res = await fetch(`/api/clinical/lab-orders/${scanAttachOrder.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({ attachedImageUrl: url.trim() }),
			});

			if (!res.ok) throw new Error("Ошибка прикрепления файла");
			showToast(
				is3DScanUrl(url)
					? "3D-скан (STL/PLY) успешно прикреплен к наряду ЗТЛ"
					: "Клиническое фото прикуса успешно прикреплено к наряду ЗТЛ",
				"success",
			);
			setIsScanModalOpen(false);
			void fetchOrders();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка прикрепления файла";
			showToast(msg, "error");
		}
	};

	const handleTechnicianComment = (order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		setPromptState({
			title: "Клинический комментарий технику",
			description: `Уточнение границ уступа, цвета по VITA или особенностей моделировки для наряда #${
				order.id ? order.id.slice(0, 8) : ""
			}.`,
			icon: React.createElement(MessageSquare, { className: "w-4 h-4 text-teal-600 dark:text-teal-400" }),
			initialValue: order.labComments || "",
			placeholder:
				"Например: поднутрения с дистальной стороны не заливать, уступ плечевой 0.8мм...",
			submitLabel: "Сохранить комментарий",
			submitVariant: "teal",
			multiline: true,
			onSubmit: (comment: string) => {
				setPromptState(null);
				fetch(`/api/clinical/lab-orders/${order.id}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({ labComments: comment.trim() }),
				})
					.then((res) => {
						if (!res.ok) throw new Error("Ошибка сохранения");
						showToast("Комментарий технику сохранен", "success");
						void fetchOrders();
					})
					.catch((err: unknown) => {
						const msg =
							err instanceof Error ? err.message : "Ошибка сохранения комментария";
						showToast(msg, "error");
					});
			},
		});
	};

	const handleRepeatFitting = (order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		void handleStatusChange(order.id!, "refitting");
		showToast("Наряд переведен в статус: «Повторная примерка / доработка»", "success");
	};

	const handleReclamation = (order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		const defaultReason =
			"Брак ЗТЛ: несоответствие цвета VITA / переделка за счет лаборатории (0 ₽)";
		setPromptState({
			title: "Оформление рекламации ЗТЛ",
			description:
				"Перевод наряда на гарантийную доработку (пациент 0 ₽). Выберите причину из списка или введите описание:",
			icon: React.createElement(AlertOctagon, { className: "w-4 h-4 text-rose-600 dark:text-rose-400" }),
			initialValue: defaultReason,
			placeholder: "Опишите дефект конструкции...",
			submitLabel: "Оформить рекламацию (0 ₽)",
			submitVariant: "danger",
			multiline: true,
			quickPresets: [
				"Брак ЗТЛ: несоответствие цвета VITA / переделка за счет лаборатории (0 ₽)",
				"Брак ЗТЛ: балансир каркаса / неплотное краевое прилегание (0 ₽)",
				"Брак ЗТЛ: скол керамики при обжиге в лаборатории (0 ₽)",
				"Гарантия клиники: скол керамики при эксплуатации (пациент 0 ₽)",
				"Гарантия клиники: завышение по прикусу / окклюзионная интерференция (пациент 0 ₽)",
			],
			onSubmit: (reason: string) => {
				setPromptState(null);
				if (!reason.trim()) return;
				const isLabDefect =
					reason.toLowerCase().includes("брак зтл") ||
					reason.toLowerCase().includes("лаборатории");
				const liabilityLabelRu = isLabDefect ? "Брак ЗТЛ" : "Гарантия клиники";

				fetch(`/api/clinical/lab-orders/${order.id}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({
						status: "refitting",
						stage: "warranty_rework",
						isWarrantyRework: true,
						warrantyLiabilityType: isLabDefect ? "lab_defect" : "clinic_warranty",
						priceRub: 0,
						clinicalNotes: `${order.clinicalNotes || ""}\n[РЕКЛАМАЦИЯ ЗТЛ (${liabilityLabelRu}): ${reason.trim()}]`.trim(),
					}),
				})
					.then((res) => {
						if (!res.ok) throw new Error("Ошибка рекламации");
						showToast(
							`Рекламация оформлена [${liabilityLabelRu}]. Для пациента: 0 ₽.`,
							"warning",
							4000,
						);
						void fetchOrders();
					})
					.catch((err: unknown) => {
						const msg = err instanceof Error ? err.message : "Ошибка рекламации";
						showToast(msg, "error");
					});
			},
		});
	};

	const handleCreateOrderFromPriceMatrix = (item: LabPriceMatrixItem) => {
		setSelectedOrderForEdit({
			patientId: "",
			patientName: "Пациент",
			material: item.material,
			constructionType: item.id,
			priceRub: item.suggestedCostRub,
			clinicalNotes: item.specialInstructions || "",
		});
		setModalInitialTab("main");
		setIsWorkOrderModalOpen(true);
	};

	const selectedTimelineOrder = useMemo(() => {
		if (!selectedTimelineOrderId) return null;
		return orders.find((o) => o.id === selectedTimelineOrderId) || null;
	}, [orders, selectedTimelineOrderId]);

	return {
		orders,
		isLoading,
		error,
		fetchOrders,
		searchQuery,
		setSearchQuery,
		statusFilter,
		setStatusFilter,
		doctorFilter,
		setDoctorFilter,
		viewMode,
		setViewMode,
		isCourierBarOpen,
		setIsCourierBarOpen,
		selectedTimelineOrderId,
		setSelectedTimelineOrderId,
		selectedTimelineOrder,
		stageCounts,
		filteredOrders,
		metrics,
		doctorsList,
		kanbanOrdersByStage,
		kanbanStageLimits,
		setKanbanStageLimits,
		kanbanActiveMenuId,
		setKanbanActiveMenuId,
		openMenuOrderId,
		setOpenMenuOrderId,
		promptState,
		setPromptState,
		isScanModalOpen,
		setIsScanModalOpen,
		scanAttachOrder,
		scanAttachType,
		isWorkOrderModalOpen,
		setIsWorkOrderModalOpen,
		selectedOrderForEdit,
		setSelectedOrderForEdit,
		modalInitialTab,
		setModalInitialTab,
		isPriceMatrixModalOpen,
		setIsPriceMatrixModalOpen,
		isTrackerModalOpen,
		setIsTrackerModalOpen,
		isTrackingDrawerOpen,
		setIsTrackingDrawerOpen,
		selectedOrderForTracking,
		isReadyInClinicModalOpen,
		setIsReadyInClinicModalOpen,
		readyInClinicOrder,
		view3DScanOrder,
		setView3DScanOrder,
		isHubModalOpen,
		setIsHubModalOpen,
		handleView3DScan,
		handleStatusChange,
		handleOpenReadyInClinicPrompt,
		copyPortalLink,
		handleOpenNewOrder,
		handleOpenEditOrder,
		handleOpenPrintOrder,
		handleOpenTracking,
		handlePayFromCashbox,
		handleMarkInstalled,
		handleAttach3DScan,
		handleAttachBitePhoto,
		handleSaveAttachedFile,
		handleTechnicianComment,
		handleRepeatFitting,
		handleReclamation,
		handleCreateOrderFromPriceMatrix,
	};
}
