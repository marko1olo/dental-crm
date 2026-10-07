import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
	AlertCircle,
	AlertOctagon,
	Bike,
	Box,
	Calendar,
	CalendarCheck,
	Camera,
	CheckCircle2,
	Clock,
	DollarSign,
	ExternalLink,
	FlaskConical,
	Layers,
	LayoutGrid,
	LayoutList,
	Link,
	Loader2,
	MessageSquare,
	MoreVertical,
	Plus,
	Printer,
	RefreshCw,
	RotateCcw,
	Search,
	Sparkles,
	Truck,
	User,
	X,
} from "lucide-react";
import { denteAdminSecretRequestHeaders, money } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import type { DentalLabOrderData } from "../lab/DentalLabOrderModal";
import { useAppStore } from "../../store/appStore";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { useIsMobile } from "../../hooks/useIsMobile";
import { MobileLabOrdersTimeline } from "../lab/mobile/MobileLabOrdersTimeline";
import { formatLabOrderTeethOrJaw, SHADE_SWATCH_MAP } from "../lab/labMath";
import { formatLabConstructionTitle } from "../../pages/LabOrdersPage";
import { LabOrderCard } from "../lab/LabOrderCard";
import {
	LabActionPromptModal,
	type LabPromptDialogState,
} from "../lab/LabActionPromptModal";
import {
	LabAttachScanModal,
	is3DScanUrl,
} from "../lab/LabAttachScanModal";
import {
	DentalLabReadyInClinicModal,
	type ReadyInClinicLabOrder,
} from "../lab/DentalLabReadyInClinicModal";

// Импорт сателлитных компонентов ЗТЛ из текущего пакета dental-lab
import { DentalLabCourierDispatchBar } from "./DentalLabCourierDispatchBar";
import { DentalLabStageTrackingTimeline } from "./DentalLabStageTrackingTimeline";
import {
	DentalLabPriceMatrixModal,
	type LabPriceMatrixItem,
} from "./DentalLabPriceMatrixModal";
import { DentalLabWorkOrderModal } from "./DentalLabWorkOrderModal";

const DentalLabOrdersTrackerModal = lazy(() =>
	import("../lab/DentalLabOrdersTrackerModal").then((module) => ({
		default: module.DentalLabOrdersTrackerModal,
	})),
);
const LabTrackingDrawer = lazy(() =>
	import("../lab/LabTrackingDrawer").then((module) => ({
		default: module.LabTrackingDrawer,
	})),
);

export interface DentalLabOrdersViewProps {
	readonly initialOrders?: readonly DentalLabOrderData[];
	readonly onOrdersChanged?: (orders: readonly DentalLabOrderData[]) => void;
}

export function DentalLabOrdersView({
	initialOrders,
	onOrdersChanged,
}: DentalLabOrdersViewProps = {}) {
	const isMobile = useIsMobile(768);
	const [orders, setOrders] = useState<DentalLabOrderData[]>(
		initialOrders ? [...initialOrders] : []
	);
	const [isLoading, setIsLoading] = useState(!initialOrders);
	const [error, setError] = useState<string | null>(null);

	// Фильтры и поиск
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [doctorFilter, setDoctorFilter] = useState<string>("all");
	const [viewMode, setViewMode] = useState<"table" | "cards">("table");
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

	// Live status updates from store
	const labOrderStatuses = useAppStore((state: any) => state.labOrderStatuses);

const CANONICAL_DEMO_LAB_ORDERS: DentalLabOrderData[] = [
	{
		id: "lab-demo-001",
		patientId: "pat-1",
		patientName: "Барабаш Сергей Владимирович",
		doctorId: "doc-1",
		doctorName: "Д-р Воронов А. В.",
		secureToken: "SEC-101",
		toothFdi: "16",
		selectedTeeth: [16],
		constructionType: "crown_zirconia",
		material: "Диоксид циркония Katana HTML",
		colorVita: "A2",
		status: "in_progress",
		currentStage: "framework_wax_milling",
		dueDate: new Date(Date.now() + 5 * 86400000).toISOString(),
		priceRub: 24000,
		clinicalNotes: "Коронка 16 под цвет соседних зубов. Умеренная прозрачность HT.",
	},
	{
		id: "lab-demo-002",
		patientId: "pat-2",
		patientName: "Смирнова Екатерина Васильевна",
		doctorId: "doc-1",
		doctorName: "Д-р Воронов А. В.",
		secureToken: "SEC-102",
		toothFdi: "21, 22",
		selectedTeeth: [21, 22],
		constructionType: "crown_emax",
		material: "Керамика IPS e.max Press",
		colorVita: "A1",
		status: "ready_in_clinic",
		currentStage: "completed",
		dueDate: new Date(Date.now() - 86400000).toISOString(),
		priceRub: 36000,
		paidFromCashOperationId: "cash-op-demo-102",
		clinicalNotes: "Коронки 21, 22. Работа готова в клинике, ожидает фиксации.",
	},
	{
		id: "lab-demo-003",
		patientId: "pat-3",
		patientName: "Ковалёв Роман Станиславович",
		doctorId: "doc-1",
		doctorName: "Д-р Воронов А. В.",
		secureToken: "SEC-103",
		toothFdi: "46",
		selectedTeeth: [46],
		constructionType: "metal_ceramic",
		material: "Металлокерамика Ivoclar",
		colorVita: "A3",
		status: "delivered_to_patient",
		currentStage: "completed",
		dueDate: new Date(Date.now() - 3 * 86400000).toISOString(),
		priceRub: 18000,
		isLockedInstalled: true,
		clinicalNotes: "Коронка 46 сдана и зафиксирована во рту пациента.",
	},
	{
		id: "lab-demo-004",
		patientId: "pat-4",
		patientName: "Алексеева Виктория Игоревна",
		doctorId: "doc-1",
		doctorName: "Д-р Воронов А. В.",
		secureToken: "SEC-104",
		toothFdi: "36",
		selectedTeeth: [36],
		constructionType: "crown_zirconia",
		material: "Диоксид циркония Prettau",
		colorVita: "A2",
		status: "refitting",
		currentStage: "framework_fitting",
		dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
		priceRub: 0,
		isWarrantyRework: true,
		clinicalNotes: "Рекламация ЗТЛ: доработка по гарантии клиники (0 ₽ для пациента).",
	},
];

	const fetchOrders = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			if (isDemoShowcaseMode()) {
				setOrders(CANONICAL_DEMO_LAB_ORDERS);
				onOrdersChanged?.(CANONICAL_DEMO_LAB_ORDERS);
				return;
			}

			const res = await fetch("/api/dental-lab/orders", {
				headers: denteAdminSecretRequestHeaders(),
			});

			if (!res.ok) {
				if (isDemoShowcaseMode() || (typeof window !== "undefined" && window.location.search.includes("demo=true"))) {
					setOrders(CANONICAL_DEMO_LAB_ORDERS);
					onOrdersChanged?.(CANONICAL_DEMO_LAB_ORDERS);
					return;
				}
				throw new Error(`Ошибка загрузки нарядов ЗТЛ: ${res.status}`);
			}

			const data = await res.json();
			const list = Array.isArray(data) ? data : [];
			if (list.length === 0 && (isDemoShowcaseMode() || (typeof window !== "undefined" && window.location.search.includes("demo=true")))) {
				setOrders(CANONICAL_DEMO_LAB_ORDERS);
				onOrdersChanged?.(CANONICAL_DEMO_LAB_ORDERS);
				return;
			}
			setOrders(list);
			onOrdersChanged?.(list);
		} catch (err: unknown) {
			if (isDemoShowcaseMode() || (typeof window !== "undefined" && window.location.search.includes("demo=true"))) {
				setOrders(CANONICAL_DEMO_LAB_ORDERS);
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

	// Канонические 5 этапов фильтрации
	const CANONICAL_STAGE_FILTERS = useMemo(() => [
		{ id: "all", label: "Все", statuses: [] as string[] },
		{ id: "impression_scan", label: "Слепок", statuses: ["sent", "sent_to_lab", "impression_scan", "draft"] },
		{ id: "framework_fitting", label: "Каркас", statuses: ["in_progress", "framework_fitting", "cad_modeling", "milling_casting", "milling_framework"] },
		{ id: "ceramic_layering", label: "Керамика", statuses: ["fitting", "refitting", "ceramic_layering", "try_in"] },
		{ id: "ready_in_clinic", label: "Готовая в клинике", statuses: ["ready", "ready_in_clinic", "shipped", "delivered", "received"] },
		{ id: "patient_fixation", label: "Зафиксировано", statuses: ["completed", "patient_fixation", "delivered_completed", "delivered_to_patient", "installed_completed", "fitted"] },
	], []);

	const stageCounts = useMemo(() => {
		const counts: Record<string, number> = {
			all: orders.length,
		};
		for (const f of CANONICAL_STAGE_FILTERS) {
			if (f.id === "all") continue;
			counts[f.id] = orders.filter((o) => {
				const status = o.status || "";
				const stage = (o as unknown as { stage?: string; currentStage?: string }).stage || (o as unknown as { currentStage?: string }).currentStage || "";
				const hasStatus = f.statuses.includes(status);
				const hasStage = f.id === stage || f.statuses.includes(stage);
				return hasStatus || hasStage;
			}).length;
		}
		return counts;
	}, [orders, CANONICAL_STAGE_FILTERS]);

	const filteredOrders = useMemo(() => {
		const matchedFilter = CANONICAL_STAGE_FILTERS.find((f) => f.id === statusFilter);

		return orders.filter((o) => {
			if (statusFilter !== "all" && matchedFilter) {
				const status = o.status || "";
				const stage = (o as unknown as { stage?: string; currentStage?: string }).stage || (o as unknown as { currentStage?: string }).currentStage || "";
				const hasStatus = matchedFilter.statuses.includes(status);
				const hasStage = matchedFilter.id === stage || matchedFilter.statuses.includes(stage);
				if (!hasStatus && !hasStage) return false;
			}
			if (doctorFilter !== "all" && o.doctorId !== doctorFilter && o.doctorName !== doctorFilter) return false;

			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const pName = (o.patientName || "").toLowerCase();
				const dName = (o.doctorName || "").toLowerCase();
				const tooth = (o.toothFdi || "").toLowerCase();
				const mat = (o.material || "").toLowerCase();
				const notes = (o.clinicalNotes || "").toLowerCase();
				const num = ((o as unknown as { orderNumber?: string }).orderNumber || o.id || "").toLowerCase();
				return pName.includes(q) || dName.includes(q) || tooth.includes(q) || mat.includes(q) || notes.includes(q) || num.includes(q);
			}

			return true;
		});
	}, [orders, statusFilter, doctorFilter, searchQuery, CANONICAL_STAGE_FILTERS]);

	const metrics = useMemo(() => {
		const total = orders.length;
		const inProgress = orders.filter((o) => o.status === "in_progress" || o.status === "sent").length;
		const tryIn = orders.filter((o) => o.status === "fitting" || o.status === "refitting").length;
		const ready = orders.filter((o) => o.status === "ready" || o.status === "ready_in_clinic" || o.status === "shipped" || o.status === "delivered" || o.status === "received" || o.status === "completed").length;
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

			if (newStatus === "ready" || newStatus === "ready_in_clinic" || newStatus === "shipped" || newStatus === "delivered" || newStatus === "received") {
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

	const handleOpenReadyInClinicPrompt = useCallback((order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		const target: ReadyInClinicLabOrder = {
			id: order.id || "ztl-order",
			orderNumber: (order as unknown as { orderNumber?: string }).orderNumber || (order.id ? order.id.slice(0, 8) : "ЗТЛ-1"),
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

	const handlePayFromCashbox = useCallback(async (order: DentalLabOrderData) => {
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
					`Наряд ЗТЛ оплачен из кассы (${order.priceRub?.toLocaleString("ru-RU") || 0} ₽, статья 11: Оплата услуг лаборатории)`,
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
	}, [fetchOrders]);

	const handleMarkInstalled = useCallback(async (order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		if (!order.id) return;
		try {
			if (isDemoShowcaseMode()) {
				setOrders((prev) =>
					prev.map((o) => (o.id === order.id ? { ...o, status: "completed" as any } : o)),
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
	}, [fetchOrders]);

	const handleAttach3DScan = (order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		setScanAttachOrder(order);
		setScanAttachType(order.attachedImageUrl?.toLowerCase().includes(".ply") ? "ply" : "stl");
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
			description: `Уточнение границ уступа, цвета по VITA или особенностей моделировки для наряда #${order.id ? order.id.slice(0, 8) : ""}.`,
			icon: <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
			initialValue: order.labComments || "",
			placeholder: "Например: поднутрения с дистальной стороны не заливать, уступ плечевой 0.8мм...",
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
						const msg = err instanceof Error ? err.message : "Ошибка сохранения комментария";
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
		const defaultReason = "Брак ЗТЛ: несоответствие цвета VITA / переделка за счет лаборатории (0 ₽)";
		setPromptState({
			title: "Оформление рекламации ЗТЛ",
			description: "Перевод наряда на гарантийную доработку (пациент 0 ₽). Выберите причину из списка или введите описание:",
			icon: <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
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
				const isLabDefect = reason.toLowerCase().includes("брак зтл") || reason.toLowerCase().includes("лаборатории");
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
						showToast(`Рекламация оформлена [${liabilityLabelRu}]. Для пациента: 0 ₽.`, "warning", 4000);
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

	const getStatusBadge = (status?: string) => {
		switch (status) {
			case "sent":
			case "sent_to_lab":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">Отправлен в ЗТЛ</span>;
			case "in_progress":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">В работе (CAD/CAM)</span>;
			case "fitting":
			case "refitting":
			case "try_in":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">На примерке / Доработке</span>;
			case "ready":
			case "ready_in_clinic":
			case "shipped":
			case "delivered":
			case "received":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">В клинике / Готов</span>;
			case "completed":
			case "delivered_to_patient":
			case "fitted":
			case "patient_fixation":
			case "installed_completed":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Зафиксировано</span>;
			case "warranty_rework":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">Гарантия / Переделка</span>;
			case "cancelled":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">Аннулирован</span>;
			default:
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{status || "Черновик"}</span>;
		}
	};

	const selectedTimelineOrder = useMemo(() => {
		if (!selectedTimelineOrderId) return null;
		return orders.find((o) => o.id === selectedTimelineOrderId) || null;
	}, [orders, selectedTimelineOrderId]);

	return (
		<>
			{isMobile ? (
				<MobileLabOrdersTimeline
					orders={orders}
					isLoading={isLoading}
					error={error}
					onRefresh={fetchOrders}
					onOpenNewOrder={handleOpenNewOrder}
					onOpenTrackerModal={() => setIsTrackerModalOpen(true)}
					onStatusChange={handleStatusChange}
					onPrintOrder={handleOpenPrintOrder}
					onTechnicianComment={handleTechnicianComment}
					onAttachScan={handleAttach3DScan}
					onReclamation={handleReclamation}
					copyPortalLink={copyPortalLink}
				/>
			) : (
				<main className="w-full max-w-full space-y-2.5 overflow-hidden" data-testid="dental-lab-orders-view">
					{/* ─── ТУЛБАР ЗТЛ: СТРОГО 1 СТРОКА 32-36PX (МАНДАТЫ 8d п. 2, 8p) ─── */}
					<header className="h-9 min-h-[36px] flex items-center justify-between gap-2 px-2.5 bg-[var(--paper)] rounded-xl border border-[var(--line)] shadow-2xs text-xs w-full max-w-full overflow-hidden">
						{/* Left: Brand + Inline Counters */}
						<div className="flex items-center gap-2 shrink-0">
							<FlaskConical className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
							<span className="font-bold text-xs sm:text-sm text-[var(--ink)] whitespace-nowrap">
								ЗТЛ
							</span>
							<div className="hidden 2xl:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--paper-soft)] text-[11px] text-[var(--muted)] border border-[var(--line)] font-mono">
								<span>Всего: <strong className="text-[var(--ink)]">{metrics.total}</strong></span>
								<span>•</span>
								<span>В работе: <strong className="text-blue-600 dark:text-blue-400">{metrics.inProgress}</strong></span>
								<span>•</span>
								<span>Готовы: <strong className="text-teal-600 dark:text-teal-400">{metrics.ready}</strong></span>
								{metrics.overdue > 0 && (
									<>
										<span>•</span>
										<span className="text-rose-600 dark:text-rose-400 font-bold">Просрочено: {metrics.overdue}</span>
									</>
								)}
							</div>
						</div>

						{/* Center: Search & Filter */}
						<div className="flex items-center gap-1.5 flex-1 min-w-0 max-w-md">
							<div className="relative w-44 sm:w-56 shrink-0">
								<Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
								<input
									type="text"
									placeholder="Поиск..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									style={{ paddingLeft: "38px" }}
									className="w-full h-8 min-h-[32px] pr-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[13px] text-[var(--ink)] focus:ring-1 focus:ring-teal-500 focus:outline-none"
								/>
							</div>
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="h-8 min-h-[32px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[12.5px] text-[var(--ink)] focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer shrink-0 max-w-[130px]"
								aria-label="Фильтр по статусу"
							>
								<option value="all">Все статусы</option>
								<option value="sent">Отправлен в ЗТЛ</option>
								<option value="in_progress">В производстве</option>
								<option value="fitting">На примерке</option>
								<option value="refitting">На доработке</option>
								<option value="shipped">В клинике</option>
								<option value="completed">Сдан / Установлен</option>
							</select>
							<select
								value={doctorFilter}
								onChange={(e) => setDoctorFilter(e.target.value)}
								className="hidden 2xl:block h-8 min-h-[32px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[12.5px] text-[var(--ink)] focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer shrink-0 max-w-[130px]"
								aria-label="Фильтр по врачу"
							>
								<option value="all">Все врачи</option>
								{doctorsList.map((doc: string) => (
									<option key={doc} value={doc}>{doc}</option>
								))}
							</select>
						</div>

						{/* Right: Actions */}
						<div className="flex items-center gap-1.5 shrink-0">
							<button
								type="button"
								onClick={() => setIsCourierBarOpen((prev) => !prev)}
								className={`h-8 min-h-[32px] px-2.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
									isCourierBarOpen
										? "border-teal-500/40 bg-teal-500/15 text-teal-800 dark:text-teal-200"
										: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)]"
								}`}
								data-testid="btn-toggle-courier-bar"
								title="Панель курьерской логистики ЗТЛ"
							>
								<Truck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
								<span>Курьер</span>
							</button>

							<button
								type="button"
								onClick={() => setIsPriceMatrixModalOpen(true)}
								className="secondary-button h-8 min-h-[32px] px-2.5 text-xs font-semibold inline-flex items-center gap-1.5"
								data-testid="btn-open-price-matrix"
								title="Прейскурант и себестоимость ЗТЛ"
							>
								<DollarSign className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
								<span>Прейскурант</span>
							</button>

							<button
								type="button"
								onClick={() => setIsTrackerModalOpen(true)}
								className="secondary-button h-8 min-h-[32px] px-2.5 text-xs font-semibold inline-flex items-center gap-1.5"
								title="Десктопный трекер нарядов ЗТЛ"
								data-testid="lab-orders-open-tracker-btn"
							>
								<Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
								<span>Трекер</span>
							</button>

							<button
								type="button"
								onClick={() => void fetchOrders()}
								className="icon-button h-8 w-8 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] transition-colors shadow-2xs flex items-center justify-center cursor-pointer shrink-0"
								title="Обновить список"
							>
								<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-teal-600" : ""}`} />
							</button>

							<button
								type="button"
								onClick={handleOpenNewOrder}
								className="primary-button h-8 min-h-[32px] px-3 text-xs font-semibold inline-flex items-center gap-1.5"
								data-testid="lab-orders-new-order-btn"
							>
								<Plus className="w-3.5 h-3.5" />
								<span>+ Наряд</span>
							</button>
						</div>
					</header>

					{/* ─── КУРЬЕРСКАЯ ПАНЕЛЬ ЛОГИСТИКИ ЗТЛ ─── */}
					{isCourierBarOpen && (
						<DentalLabCourierDispatchBar
							orders={orders}
							onDispatchUpdated={() => void fetchOrders()}
							onSelectOrderForPrint={handleOpenPrintOrder}
						/>
					)}

					{/* ─── ТАЙМЛАЙН ВЫБРАННОГО НАРЯДА (ЕСЛИ ВЫБРАН) ─── */}
					{selectedTimelineOrder && (
						<div className="relative">
							<DentalLabStageTrackingTimeline
								order={selectedTimelineOrder}
								onAdvanceStage={async (id, nextStage) => {
									await handleStatusChange(id, nextStage);
								}}
							/>
							<button
								type="button"
								onClick={() => setSelectedTimelineOrderId(null)}
								className="absolute top-2 right-2 p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded-md hover:bg-[var(--line)]"
								title="Закрыть таймлайн"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					)}

					{/* ─── APPLE HIG SEGMENTED BAR: 5 ЭТАПОВ И ВИД (ТАБЛИЦА/КАРТОЧКИ) ─── */}
					<div className="flex items-center justify-between gap-2 overflow-x-auto py-0.5 w-full max-w-full">
						<nav className="dente-segmented-bar shrink-0 select-none" aria-label="Фильтры этапов нарядов ЗТЛ">
							{CANONICAL_STAGE_FILTERS.map((f) => {
								const isActive = statusFilter === f.id;
								const count = stageCounts[f.id] ?? 0;
								return (
									<button
										key={f.id}
										type="button"
										onClick={() => setStatusFilter(f.id)}
										data-active={isActive ? "true" : "false"}
										className={`dente-segmented-item ${isActive ? "active" : ""}`}
										data-testid={`lab-status-filter-${f.id}`}
									>
										<span>{f.label}</span>
										<span
											className={`inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full transition-colors ${
												isActive
													? "bg-[var(--teal-soft)] text-[var(--teal)] dark:bg-[var(--line)] dark:text-[var(--ink)]"
													: "bg-[var(--line)] text-[var(--muted)]"
											}`}
										>
											{count}
										</span>
									</button>
								);
							})}
						</nav>

						<div className="dente-segmented-bar shrink-0 select-none">
							<button
								type="button"
								onClick={() => setViewMode("table")}
								data-active={viewMode === "table" ? "true" : "false"}
								className={`dente-segmented-item ${viewMode === "table" ? "active" : ""}`}
								data-testid="lab-orders-view-table-btn"
							>
								<LayoutList className="w-3.5 h-3.5" />
								<span>Таблица</span>
							</button>
							<button
								type="button"
								onClick={() => setViewMode("cards")}
								data-active={viewMode === "cards" ? "true" : "false"}
								className={`dente-segmented-item ${viewMode === "cards" ? "active" : ""}`}
								data-testid="lab-orders-view-cards-btn"
							>
								<LayoutGrid className="w-3.5 h-3.5" />
								<span>Карточки</span>
							</button>
						</div>
					</div>

					{/* ─── ОСНОВНОЙ РЕЕСТР: ТАБЛИЦА / КАРТОЧКИ ─── */}
					{isLoading ? (
						<div className="p-12 text-center text-[var(--muted)] flex items-center justify-center gap-2">
							<Loader2 className="w-5 h-5 animate-spin text-teal-600" />
							<span>Загрузка нарядов лаборатории...</span>
						</div>
					) : error ? (
						<div className="p-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl text-rose-700 dark:text-rose-300 flex items-center gap-3">
							<AlertCircle className="w-5 h-5 shrink-0" />
							<div>
								<div className="font-bold">Не удалось загрузить наряды ЗТЛ</div>
								<div className="text-xs">{error}</div>
							</div>
						</div>
					) : filteredOrders.length === 0 ? (
						<div className="p-12 text-center bg-[var(--paper)] rounded-2xl border border-dashed border-[var(--line)] text-[var(--muted)] text-xs space-y-3">
							<FlaskConical className="w-10 h-10 mx-auto text-teal-600 dark:text-teal-400" />
							<p className="font-bold text-sm text-[var(--ink)]" data-testid="lab-orders-empty-state-title">
								Нет нарядов в зуботехническую лабораторию
							</p>
							<p className="max-w-md mx-auto text-[var(--muted)]">
								Оформите новый заказ-наряд на коронки, элайнеры, бюгели или виниры с расцветкой VITA и расчетом удержания с врача.
							</p>
							<button
								type="button"
								onClick={handleOpenNewOrder}
								className="min-h-[44px] h-11 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold inline-flex items-center gap-2 shadow-2xs cursor-pointer transition-all active:scale-95 text-xs"
								data-testid="empty-state-add-first-lab-order-btn"
							>
								<Plus className="w-4 h-4" />
								<span>+ Создать наряд-заказ в лабораторию</span>
							</button>
						</div>
					) : viewMode === "table" ? (
						<div className="w-full max-w-full overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs" data-testid="lab-orders-table-container">
							<table className="w-full min-w-[900px] text-left border-collapse" data-testid="lab-orders-dense-table">
								<thead>
									<tr className="h-8 min-h-[32px] max-h-[32px] bg-[var(--paper-soft)] border-b border-[var(--line)] text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] select-none">
										<th className="px-2.5 py-0 whitespace-nowrap">№ Наряда</th>
										<th className="px-2.5 py-0 whitespace-nowrap">Пациент</th>
										<th className="px-2 py-0 whitespace-nowrap text-center">Зуб</th>
										<th className="px-2.5 py-0 whitespace-nowrap">Конструкция / Материал</th>
										<th className="px-2 py-0 whitespace-nowrap">VITA</th>
										<th className="px-2.5 py-0 whitespace-nowrap">Статус ЗТЛ</th>
										<th className="px-2.5 py-0 whitespace-nowrap">Срок</th>
										<th className="px-2.5 py-0 whitespace-nowrap font-mono text-right">Стоимость</th>
										<th className="px-2.5 py-0 whitespace-nowrap text-right">Действия</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line)]">
									{filteredOrders.map((order) => {
										const isReady = order.status === "ready" || order.status === "ready_in_clinic" || order.status === "shipped" || order.status === "delivered" || order.status === "received";
										const isOverdue = order.dueDate && order.status !== "completed" && order.status !== "cancelled" && new Date(order.dueDate).getTime() < Date.now();
										const orderNumDisplay = (order as unknown as { orderNumber?: string }).orderNumber || (order.id ? `#${order.id.slice(0, 8)}` : "ЗТЛ");
										const swatchBg = SHADE_SWATCH_MAP[order.colorVita?.toUpperCase() ?? ""]?.bg || "#f4eedb";

										return (
											<tr
												key={order.id}
												className="h-8 min-h-[32px] max-h-[32px] hover:bg-[var(--paper-soft)] transition-colors text-xs text-[var(--ink)] cursor-pointer"
												data-testid={`lab-order-table-row-${order.id}`}
												onClick={() => setSelectedTimelineOrderId((prev) => prev === order.id ? null : (order.id || null))}
											>
												<td className="px-2.5 py-0 whitespace-nowrap align-middle">
													<span className="font-mono font-bold text-[11px] text-teal-600 dark:text-teal-400">
														{orderNumDisplay}
													</span>
												</td>

												<td className="px-2.5 py-0 whitespace-nowrap align-middle">
													<div className="flex items-center gap-1.5">
														<span className="font-bold truncate max-w-[140px] inline-block align-middle" title={order.patientName}>
															{order.patientName || "Пациент"}
														</span>
														{order.stageNumber ? (
															<span
																className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0 inline-block align-middle"
																title={`План лечения: Этап ${order.stageNumber}${order.stageTitle ? ` · ${order.stageTitle}` : ""}`}
															>
																Этап {order.stageNumber}
															</span>
														) : null}
													</div>
												</td>

												<td className="px-2 py-0 whitespace-nowrap align-middle text-center">
													<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-[var(--line)] font-mono">
														{order.toothFdi ? `№ ${order.toothFdi}` : "Челюсть"}
													</span>
												</td>

												<td className="px-2.5 py-0 whitespace-nowrap align-middle">
													<span className="truncate max-w-[160px] inline-block align-middle text-[11px] text-[var(--ink)]" title={`${order.constructionType || ""} ${order.material || ""}`}>
														{formatLabConstructionTitle(order.constructionType, order.material ?? undefined)}
													</span>
												</td>

												<td className="px-2.5 py-0 whitespace-nowrap align-middle">
													{order.colorVita ? (
														<span className="inline-flex items-center gap-1 font-bold text-[11px]">
															<span
																className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
																style={{ backgroundColor: swatchBg }}
															/>
															<span>{order.colorVita}</span>
														</span>
													) : (
														<span className="text-[var(--muted)] text-[11px]">—</span>
													)}
												</td>

												<td className="px-2.5 py-0 whitespace-nowrap align-middle">
													{getStatusBadge(order.status)}
												</td>

												<td className="px-2.5 py-0 whitespace-nowrap align-middle">
													<span className={`text-[11px] font-mono ${isOverdue ? "text-rose-600 font-bold" : "text-[var(--muted)]"}`}>
														{order.dueDate ? new Date(order.dueDate).toLocaleDateString("ru-RU") : "—"}
													</span>
												</td>

												<td className="px-2.5 py-0 whitespace-nowrap align-middle font-mono font-bold text-xs text-right">
													{(order as unknown as { isWarrantyRework?: boolean }).isWarrantyRework || order.status === "refitting" || order.priceRub === 0 ? (
														<span className="text-emerald-600 dark:text-emerald-400 font-bold" title="Гарантийная рекламация: 0 ₽ для пациента">
															0 ₽ (Гарантия)
														</span>
													) : order.priceRub != null ? (
														<div className="inline-flex items-center gap-1.5 justify-end">
															<span>{money(order.priceRub)}</span>
															{Boolean((order as unknown as { paidFromCashOperationId?: string }).paidFromCashOperationId) && (
																<span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
																	<CheckCircle2 className="w-2.5 h-2.5" />
																	Оплачен
																</span>
															)}
														</div>
													) : (
														"—"
													)}
												</td>

												<td className="px-2.5 py-0 whitespace-nowrap align-middle text-right" onClick={(e) => e.stopPropagation()}>
													<div className="inline-flex items-center gap-1">
														{isReady ? (
															<button
																type="button"
																onClick={() => handleOpenReadyInClinicPrompt(order)}
																className="h-7 min-h-[28px] px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
																title="Работа готова в клинике! Записать пациента на прием"
																data-testid={`lab-order-table-schedule-btn-${order.id}`}
															>
																<CalendarCheck className="w-3 h-3" />
																<span>Запись</span>
															</button>
														) : (
															<button
																type="button"
																onClick={() => handleOpenPrintOrder(order)}
																className="h-7 min-h-[28px] px-2 rounded-lg border border-teal-600/30 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
																title="Распечатать наряд в зуботехническую лабораторию"
																data-testid={`lab-order-table-print-btn-${order.id}`}
															>
																<Printer className="w-3 h-3 text-teal-600 dark:text-teal-400" />
																<span>Печать</span>
															</button>
														)}

														<button
															type="button"
															onClick={() => handleOpenTracking(order)}
															className="h-7 min-h-[28px] w-7 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
															title="Этапы изготовления в лаборатории"
															data-testid={`lab-order-table-track-btn-${order.id}`}
														>
															<Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
														</button>

														<div className="relative">
															<button
																type="button"
																onClick={() => setOpenMenuOrderId((prev) => prev === order.id ? null : (order.id || null))}
																className="h-7 min-h-[28px] w-7 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
																aria-label="Вторичные действия"
																data-testid={`lab-order-table-menu-btn-${order.id}`}
															>
																<MoreVertical className="w-3.5 h-3.5" />
															</button>

															{openMenuOrderId === order.id && (
																<div
																	className="absolute right-0 top-full mt-1 w-52 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl z-30 py-1 text-xs text-[var(--ink)] animate-in fade-in-50 duration-100 text-left"
																	onClick={(e) => e.stopPropagation()}
																>
																	{!(order as unknown as { paidFromCashOperationId?: string }).paidFromCashOperationId && (
																		<button
																			type="button"
																			onClick={() => handlePayFromCashbox(order)}
																			className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold"
																		>
																			<DollarSign className="w-3.5 h-3.5" />
																			<span>Оплатить из кассы (Ст. 11)</span>
																		</button>
																	)}
																	{order.status !== "installed" && order.status !== "completed" && (
																		<button
																			type="button"
																			onClick={() => handleMarkInstalled(order)}
																			className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px] text-teal-700 dark:text-teal-400 font-semibold"
																		>
																			<CheckCircle2 className="w-3.5 h-3.5" />
																			<span>Сдать пациенту (Замок)</span>
																		</button>
																	)}
																	<button
																		type="button"
																		onClick={() => handleAttach3DScan(order)}
																		className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]"
																	>
																		<Box className="w-3.5 h-3.5 text-teal-500" />
																		<span>Прикрепить 3D-скан (STL/PLY)</span>
																	</button>
																	<button
																		type="button"
																		onClick={() => handleAttachBitePhoto(order)}
																		className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]"
																	>
																		<Camera className="w-3.5 h-3.5 text-sky-500" />
																		<span>Прикрепить фото прикуса</span>
																	</button>
																	<button
																		type="button"
																		onClick={() => handleTechnicianComment(order)}
																		className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]"
																	>
																		<MessageSquare className="w-3.5 h-3.5 text-amber-500" />
																		<span>Комментарий технику</span>
																	</button>
																	<button
																		type="button"
																		onClick={() => handleOpenPrintOrder(order)}
																		className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]"
																	>
																		<Printer className="w-3.5 h-3.5 text-teal-600" />
																		<span>Печать наряда в ЗТЛ</span>
																	</button>
																	<button
																		type="button"
																		onClick={() => handleRepeatFitting(order)}
																		className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px] text-purple-600 dark:text-purple-400"
																	>
																		<RotateCcw className="w-3.5 h-3.5" />
																		<span>Повторная примерка</span>
																	</button>
																	<button
																		type="button"
																		onClick={() => handleReclamation(order)}
																		className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px] text-rose-600 dark:text-rose-400"
																	>
																		<AlertOctagon className="w-3.5 h-3.5" />
																		<span>Рекламация (доработка 0 ₽)</span>
																	</button>
																	<button
																		type="button"
																		onClick={() => handleOpenEditOrder(order)}
																		className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]"
																	>
																		<ExternalLink className="w-3.5 h-3.5" />
																		<span>Редактировать параметры</span>
																	</button>
																	<button
																		type="button"
																		onClick={() => copyPortalLink((order as unknown as { portalToken?: string }).portalToken || order.id)}
																		className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]"
																	>
																		<Link className="w-3.5 h-3.5" />
																		<span>Ссылка для техника</span>
																	</button>
																</div>
															)}
														</div>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="lab-orders-cards-grid">
							{filteredOrders.map((order) => (
								<LabOrderCard
									key={order.id}
									order={order}
									openMenuOrderId={openMenuOrderId}
									setOpenMenuOrderId={setOpenMenuOrderId}
									handleOpenPrintOrder={handleOpenPrintOrder}
									handleOpenTracking={handleOpenTracking}
									handleAttach3DScan={handleAttach3DScan}
									handleAttachBitePhoto={handleAttachBitePhoto}
									handleTechnicianComment={handleTechnicianComment}
									handleRepeatFitting={handleRepeatFitting}
									handleReclamation={handleReclamation}
									handleOpenEditOrder={handleOpenEditOrder}
									copyPortalLink={copyPortalLink}
									getStatusBadge={getStatusBadge}
									handleOpenReadyInClinicPrompt={handleOpenReadyInClinicPrompt}
									handlePayFromCashbox={handlePayFromCashbox}
									handleMarkInstalled={handleMarkInstalled}
								/>
							))}
						</div>
					)}
				</main>
			)}

			{/* Модалка наряд-заказа DentalLabWorkOrderModal */}
			{isWorkOrderModalOpen && (
				<DentalLabWorkOrderModal
					isOpen={isWorkOrderModalOpen}
					onClose={() => setIsWorkOrderModalOpen(false)}
					initialOrder={selectedOrderForEdit}
					initialTab={modalInitialTab}
					treatmentPlanId={selectedOrderForEdit?.treatmentPlanId ?? undefined}
					stageNumber={selectedOrderForEdit?.stageNumber ?? undefined}
					stageTitle={selectedOrderForEdit?.stageTitle ?? undefined}
					stageId={selectedOrderForEdit?.stageId ?? undefined}
					onOrderSaved={() => void fetchOrders()}
				/>
			)}

			{/* Модалка прайс-матрицы DentalLabPriceMatrixModal */}
			<DentalLabPriceMatrixModal
				isOpen={isPriceMatrixModalOpen}
				onClose={() => setIsPriceMatrixModalOpen(false)}
				onSelectWorkType={handleCreateOrderFromPriceMatrix}
			/>

			{/* Tracking Drawer Instance */}
			{isTrackingDrawerOpen && (
				<Suspense fallback={null}>
					<LabTrackingDrawer
						isOpen={isTrackingDrawerOpen}
						onClose={() => setIsTrackingDrawerOpen(false)}
						order={selectedOrderForTracking}
						onStageUpdate={async (orderId, newStage) => {
							await handleStatusChange(orderId, newStage);
						}}
					/>
				</Suspense>
			)}

			{/* Non-blocking Action Prompt Modal (Mandates 8e, 8n) */}
			<LabActionPromptModal
				state={promptState}
				onClose={() => setPromptState(null)}
			/>

			{/* Dedicated 3D Scan & Photo Attachment Modal (Mandates 8e, 8n) */}
			<LabAttachScanModal
				isOpen={isScanModalOpen}
				onClose={() => setIsScanModalOpen(false)}
				order={scanAttachOrder}
				initialType={scanAttachType}
				onSave={handleSaveAttachedFile}
			/>

			{/* Dedicated Desktop ZTL Orders Tracker Modal */}
			{isTrackerModalOpen && (
				<Suspense fallback={null}>
					<DentalLabOrdersTrackerModal
						isOpen={isTrackerModalOpen}
						onClose={() => setIsTrackerModalOpen(false)}
						onOrderSaved={() => void fetchOrders()}
					/>
				</Suspense>
			)}

			{/* Ready in clinic 1-click booking modal */}
			<DentalLabReadyInClinicModal
				isOpen={isReadyInClinicModalOpen}
				onClose={() => setIsReadyInClinicModalOpen(false)}
				order={readyInClinicOrder}
			/>
		</>
	);
}
