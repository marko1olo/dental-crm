import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	AlertCircle,
	AlertOctagon,
	Box,
	Calendar,
	CalendarCheck,
	Camera,
	CheckCircle2,
	Clock,
	DollarSign,
	Download,
	ExternalLink,
	FileText,
	Filter,
	FlaskConical,
	Layers,
	LayoutGrid,
	LayoutList,
	Link,
	Loader2,
	MessageSquare,
	MoreHorizontal,
	MoreVertical,
	Plus,
	Printer,
	QrCode,
	RefreshCw,
	RotateCcw,
	Search,
	Sparkles,
	Tag,
	Trash2,
	Upload,
	User,
	X,
} from "lucide-react";
import { denteAdminSecretRequestHeaders, money } from "../AppHelpers";
import { showToast } from "../components/GlobalToast";
import type { DentalLabOrderData } from "../components/lab/DentalLabOrderModal";
import { useAppStore } from "../store/appStore";
import { isDemoShowcaseMode } from "../lib/demoMode";
import { getDemoDentalLabOrderData } from "../components/lab/dentalLabOrderEngine";
import { formatLabOrderTeethOrJaw, isJawWideConstruction, SHADE_SWATCH_MAP } from "../components/lab/labMath";
import {
	DENTAL_LAB_CONSTRUCTIONS,
	CANONICAL_LAB_WORK_TYPES,
	type DentalLabConstructionType,
} from "../components/lab/dentalLabDefinitions";

export function formatLabConstructionTitle(type?: string | null, material?: string | null): string {
	const raw = (type || material || "").trim();
	if (!raw) return "Конструкция";
	if (raw in DENTAL_LAB_CONSTRUCTIONS) {
		return DENTAL_LAB_CONSTRUCTIONS[raw as DentalLabConstructionType].shortNameRu;
	}
	const fromCatalog = CANONICAL_LAB_WORK_TYPES.find(
		(w) => w.id === raw || w.titleRu.toLowerCase() === raw.toLowerCase(),
	);
	if (fromCatalog) return fromCatalog.titleRu;
	const map: Record<string, string> = {
		crown_zirconia: "Коронка ZrO2",
		crown_emax: "Коронка e.MAX",
		metal_ceramic: "Металлокерамика",
		clasp_denture: "Бюгельный протез",
		aligner_splint: "Каппа / элайнер",
		surgical_guide: "Хирургический шаблон",
	};
	return map[raw] || raw;
}

const DentalLabOrderModal = lazy(() =>
	import("../components/lab/DentalLabOrderModal").then((module) => ({
		default: module.DentalLabOrderModal,
	})),
);
const DentalLabOrdersTrackerModal = lazy(() =>
	import("../components/lab/DentalLabOrdersTrackerModal").then((module) => ({
		default: module.DentalLabOrdersTrackerModal,
	})),
);
const LabTrackingDrawer = lazy(() =>
	import("../components/lab/LabTrackingDrawer").then((module) => ({
		default: module.LabTrackingDrawer,
	})),
);

import {
	LabActionPromptModal,
	type LabPromptDialogState,
} from "../components/lab/LabActionPromptModal";
import {
	LabAttachScanModal,
	type LabAttachScanModalProps,
	is3DScanUrl,
} from "../components/lab/LabAttachScanModal";
import { LabOrderCard } from "../components/lab/LabOrderCard";
import {
	DentalLabReadyInClinicModal,
	type ReadyInClinicLabOrder,
} from "../components/lab/DentalLabReadyInClinicModal";

export {
	LabActionPromptModal,
	type LabPromptDialogState,
	LabAttachScanModal,
	type LabAttachScanModalProps,
	is3DScanUrl,
	LabOrderCard,
	DentalLabReadyInClinicModal,
	type ReadyInClinicLabOrder,
};

export function LabOrdersPage() {
	const [orders, setOrders] = useState<DentalLabOrderData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filtering & Search
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [doctorFilter, setDoctorFilter] = useState<string>("all");
	const [viewMode, setViewMode] = useState<"table" | "cards">("table");
	const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);

	// Action Prompt Modal State (Mandates 8e, 8n)
	const [promptState, setPromptState] = useState<LabPromptDialogState | null>(null);

	// 3D Scan & Photo Attachment Modal State (Mandates 8e, 8n)
	const [isScanModalOpen, setIsScanModalOpen] = useState(false);
	const [scanAttachOrder, setScanAttachOrder] = useState<DentalLabOrderData | null>(null);
	const [scanAttachType, setScanAttachType] = useState<"stl" | "ply" | "photo">("stl");

	// Modal State
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
	const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<DentalLabOrderData | null>(null);
	const [modalInitialTab, setModalInitialTab] = useState<"main" | "shades" | "stages" | "print">("main");

	// Tracking Drawer State
	const [isTrackingDrawerOpen, setIsTrackingDrawerOpen] = useState(false);
	const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<DentalLabOrderData | null>(null);

	// Ready in clinic prompt modal state (Mandates 8b, 8e, 8n)
	const [isReadyInClinicModalOpen, setIsReadyInClinicModalOpen] = useState(false);
	const [readyInClinicOrder, setReadyInClinicOrder] = useState<ReadyInClinicLabOrder | null>(null);

	const handleOpenReadyInClinicPrompt = useCallback((order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		const target: ReadyInClinicLabOrder = {
			id: order.id || "ztl-order",
			orderNumber: (order as any).orderNumber || (order.id ? order.id.slice(0, 8) : "ЗТЛ-1"),
			patientId: order.patientId ?? undefined,
			patientName: order.patientName || "Пациент",
			patientPhone: (order as any).patientPhone ?? undefined,
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

	// Live status updates from store
	const labOrderStatuses = useAppStore((state: any) => state.labOrderStatuses);

	const fetchOrders = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			const res = await fetch("/api/clinical/lab-orders", {
				headers: denteAdminSecretRequestHeaders(),
			});

			if (!res.ok) {
				throw new Error(`Ошибка загрузки нарядов ЗТЛ: ${res.status}`);
			}

			const data = await res.json();
			const list = Array.isArray(data) ? data : [];
			if (list.length === 0 && isDemoShowcaseMode()) {
				setOrders(getDemoDentalLabOrderData());
			} else {
				setOrders(list);
			}
		} catch (err: any) {
			if (isDemoShowcaseMode()) {
				setOrders(getDemoDentalLabOrderData());
				setError(null);
			} else {
				setError(err.message || "Не удалось загрузить наряды лаборатории");
			}
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchOrders();
	}, [fetchOrders, labOrderStatuses]);

	// Канонические 5 клинических этапов для фильтрации реестра ЗТЛ
	const CANONICAL_STAGE_FILTERS = useMemo(() => [
		{ id: "all", label: "Все", statuses: [] as string[] },
		{ id: "impression_scan", label: "Слепок", statuses: ["sent", "impression_scan", "draft"] },
		{ id: "framework_fitting", label: "Каркас", statuses: ["in_progress", "framework_fitting"] },
		{ id: "ceramic_layering", label: "Керамика", statuses: ["fitting", "refitting", "ceramic_layering"] },
		{ id: "ready_in_clinic", label: "Готовая в клинике", statuses: ["ready", "ready_in_clinic", "shipped", "delivered", "received"] },
		{ id: "patient_fixation", label: "Зафиксировано", statuses: ["completed", "patient_fixation", "delivered_completed"] },
	], []);

	// Filtered Orders List
	const filteredOrders = useMemo(() => {
		const matchedFilter = CANONICAL_STAGE_FILTERS.find((f) => f.id === statusFilter);

		return orders.filter((o) => {
			if (statusFilter !== "all") {
				if (matchedFilter && matchedFilter.statuses.length > 0) {
					const hasStatus = matchedFilter.statuses.includes(o.status || "");
					const hasStage = (o as any).stage === statusFilter || (o as any).currentStage === statusFilter;
					if (!hasStatus && !hasStage) return false;
				} else if (o.status !== statusFilter) {
					return false;
				}
			}
			if (doctorFilter !== "all" && o.doctorId !== doctorFilter && o.doctorName !== doctorFilter) return false;

			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const pName = (o.patientName || "").toLowerCase();
				const dName = (o.doctorName || "").toLowerCase();
				const tooth = (o.toothFdi || "").toLowerCase();
				const mat = (o.material || "").toLowerCase();
				const notes = (o.clinicalNotes || "").toLowerCase();
				const num = ((o as any).orderNumber || o.id || "").toLowerCase();
				return pName.includes(q) || dName.includes(q) || tooth.includes(q) || mat.includes(q) || notes.includes(q) || num.includes(q);
			}

			return true;
		});
	}, [orders, statusFilter, doctorFilter, searchQuery, CANONICAL_STAGE_FILTERS]);

	// KPI Metrics
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

		const totalCost = orders.reduce((sum, o) => sum + (o.priceRub || 0), 0);
		const doctorDeductions = orders.reduce((sum, o) => sum + (o.doctorDeductionRub || ((o.priceRub || 0) * (o.doctorSharePct ?? 50)) / 100), 0);

		return {
			total,
			inProgress,
			tryIn,
			ready,
			completed,
			overdue,
			totalCost,
			doctorDeductions,
		};
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
			fetchOrders();

			if (newStatus === "ready" || newStatus === "ready_in_clinic" || newStatus === "shipped" || newStatus === "delivered" || newStatus === "received") {
				const matched = orders.find((o) => o.id === orderId);
				if (matched) {
					handleOpenReadyInClinicPrompt({ ...matched, status: newStatus });
				}
			}
		} catch (err: any) {
			showToast(err.message || "Ошибка смены статуса", "error");
		}
	};

	const copyPortalLink = (token?: string) => {
		if (!token) return;
		const url = `${window.location.origin}/#/portal/lab-order/${token}`;
		navigator.clipboard.writeText(url);
		showToast("Ссылка для зуботехника скопирована в буфер обмена", "success");
	};

	const handleOpenNewOrder = () => {
		setSelectedOrderForEdit(null);
		setModalInitialTab("main");
		setIsModalOpen(true);
	};

	const handleOpenEditOrder = (order: DentalLabOrderData) => {
		setSelectedOrderForEdit(order);
		setModalInitialTab("main");
		setIsModalOpen(true);
	};

	const handleOpenPrintOrder = (order: DentalLabOrderData) => {
		setSelectedOrderForEdit(order);
		setModalInitialTab("print");
		setIsModalOpen(true);
	};

	const handleAttach3DScan = (order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		setScanAttachOrder(order);
		setScanAttachType(
			order.attachedImageUrl?.toLowerCase().includes(".ply")
				? "ply"
				: "stl",
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
			fetchOrders();
		} catch (err: any) {
			showToast(err.message || "Ошибка прикрепления файла", "error");
		}
	};

	const handleTechnicianComment = (order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		setPromptState({
			title: "Клинический комментарий технику",
			description: `Уточнение границ уступа, цвета по VITA, рельефа фиссур или особенностей моделировки для наряда #${order.id ? order.id.slice(0, 8) : ""}.`,
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
						fetchOrders();
					})
					.catch((err) => showToast(err.message || "Ошибка сохранения комментария", "error"));
			},
		});
	};

	const handleRepeatFitting = (order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		handleStatusChange(order.id!, "refitting");
		showToast("Наряд переведен в статус: «Повторная примерка / доработка»", "success");
	};

	const handleReclamation = (order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		const defaultReason = "Брак ЗТЛ: несоответствие цвета VITA / переделка за счет лаборатории (0 ₽)";
		setPromptState({
			title: "Оформление рекламации ЗТЛ",
			description: "Перевод наряда на гарантийную доработку (пациент 0 ₽). Выберите причину из списка или введите подробное описание дефекта:",
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
				"Гарантия клиники: коррекция анатомической формы / контактного пункта (пациент 0 ₽)",
			],
			onSubmit: (reason: string) => {
				setPromptState(null);
				if (!reason.trim()) return;
				const isLabDefect =
					reason.toLowerCase().includes("брак зтл") ||
					reason.toLowerCase().includes("вина лаборатории") ||
					reason.toLowerCase().includes("брак лаборатории") ||
					reason.toLowerCase().includes("за счет лаборатории");
				const liabilityType = isLabDefect ? "lab_defect" : "clinic_warranty";
				const liabilityLabelRu = isLabDefect ? "Брак ЗТЛ" : "Гарантийные обязательства клиники";

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
						warrantyLiabilityType: liabilityType,
						priceRub: 0,
						clinicalNotes: `${order.clinicalNotes || ""}\n[РЕКЛАМАЦИЯ ЗТЛ (${liabilityLabelRu}): ${reason.trim()}]`.trim(),
					}),
				})
					.then((res) => {
						if (!res.ok) throw new Error("Ошибка рекламации");
						showToast(
							`Рекламация оформлена [${liabilityLabelRu}]. Для пациента: 0 ₽. Наряд отправлен на доработку`,
							"warning",
							4000,
						);
						fetchOrders();
					})
					.catch((err) => showToast(err.message || "Ошибка рекламации", "error"));
			},
		});
	};

	const handleOpenTracking = (order: DentalLabOrderData) => {
		setSelectedOrderForTracking(order);
		setIsTrackingDrawerOpen(true);
	};

	const handleDrawerStageUpdate = async (orderId: string, newStage: string, note?: string) => {
		try {
			const res = await fetch(`/api/lab/orders/${orderId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({ stage: newStage, notes: note }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка обновления этапа ЗТЛ");
			}
			showToast("Этап наряда ЗТЛ успешно обновлен", "success");
			fetchOrders();

			if (newStage === "ready" || newStage === "ready_in_clinic" || newStage === "received" || newStage === "delivered" || newStage === "completed") {
				const matched = orders.find((o) => o.id === orderId);
				if (matched) {
					handleOpenReadyInClinicPrompt({ ...matched, status: "ready" });
				}
			}
		} catch (err: any) {
			showToast(err.message || "Ошибка смены этапа ЗТЛ", "error");
		}
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
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">В клинике / Готов к сдаче</span>;
			case "completed":
			case "delivered_to_patient":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Сдан / Установлен</span>;
			case "warranty_rework":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">Гарантия / Переделка</span>;
			case "cancelled":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">Аннулирован</span>;
			default:
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{status || "Черновик"}</span>;
		}
	};

	return (
		<div className="p-4 space-y-3 max-w-7xl mx-auto">
			{/* ─── ТУЛБАР ЗТЛ: СТРОГО 1 СТРОКА 32-36PX (МАНДАТЫ 8d п. 2, 8p, ЗАКОН ХИКА) ─── */}
			<div className="h-9 min-h-[36px] flex items-center justify-between gap-2 px-2.5 bg-[var(--paper)] rounded-xl border border-[var(--line)] shadow-2xs text-xs">
				{/* Left: Brand Icon + Title + Inline Metrics */}
				<div className="flex items-center gap-2 shrink-0">
					<FlaskConical className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="font-bold text-xs sm:text-sm text-[var(--ink)] whitespace-nowrap">
						ЗТЛ (CAD/CAM)
					</span>
					<div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--paper-soft)] text-[11px] text-[var(--muted)] border border-[var(--line)] font-mono">
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

				{/* Center: Search & Filters */}
				<div className="flex items-center gap-1.5 flex-1 max-w-xl">
					<div className="relative flex-1">
						<Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
						<input
							type="text"
							placeholder="Поиск (пациент, врач, зуб)..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							style={{ paddingLeft: "32px" }}
							className="w-full h-7.5 min-h-[30px] pr-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-teal-500 focus:outline-none"
						/>
					</div>
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="h-7.5 min-h-[30px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[11px] text-[var(--ink)] focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer shrink-0"
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
						className="hidden lg:block h-7.5 min-h-[30px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[11px] text-[var(--ink)] focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer shrink-0"
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
						onClick={fetchOrders}
						className="h-7.5 w-7.5 min-h-[30px] rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] transition-colors shadow-2xs flex items-center justify-center cursor-pointer"
						title="Обновить список"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-teal-600" : ""}`} />
					</button>

					<button
						type="button"
						onClick={() => setIsTrackerModalOpen(true)}
						className="h-7.5 min-h-[30px] px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] text-xs font-bold shadow-2xs inline-flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
						title="Десктопный трекер нарядов ЗТЛ (дедлайны, VITA, себестоимость)"
						data-testid="lab-orders-open-tracker-btn"
					>
						<Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
						<span>Трекер ЗТЛ</span>
					</button>

					<button
						type="button"
						onClick={handleOpenNewOrder}
						className="h-7.5 min-h-[30px] px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold shadow-2xs inline-flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
						data-testid="lab-orders-new-order-btn"
					>
						<Plus className="w-3.5 h-3.5" />
						<span>Наряд ЗТЛ</span>
					</button>
				</div>
			</div>

			{/* ─── ПАНЕЛЬ ФИЛЬТРАЦИИ 5 ЭТАПОВ И ПЕРЕКЛЮЧАТЕЛЬ СЕТКИ 32PX (МАНДАТЫ 8d, 8p) ─── */}
			<div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5">
				<div className="flex items-center gap-1 bg-[var(--paper-soft)] p-0.5 rounded-lg border border-[var(--line)] text-xs shrink-0">
					{CANONICAL_STAGE_FILTERS.map((f) => {
						const isActive = statusFilter === f.id;
						return (
							<button
								key={f.id}
								type="button"
								onClick={() => setStatusFilter(f.id)}
								className={`h-7 px-2.5 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
									isActive
										? "bg-teal-600 text-white shadow-2xs"
										: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
								}`}
								data-testid={`lab-status-filter-${f.id}`}
							>
								<span>{f.label}</span>
							</button>
						);
					})}
				</div>

				{/* Переключатель вида: Плотная таблица 32px / Карточки */}
				<div className="hidden sm:flex items-center gap-1 bg-[var(--paper-soft)] p-0.5 rounded-lg border border-[var(--line)] text-xs shrink-0">
					<button
						type="button"
						onClick={() => setViewMode("table")}
						className={`h-7 px-2.5 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
							viewMode === "table"
								? "bg-teal-600 text-white shadow-2xs"
								: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
						}`}
						title="Плотный десктопный реестр (32px)"
						data-testid="lab-orders-view-table-btn"
					>
						<LayoutList className="w-3.5 h-3.5" />
						<span>Таблица 32px</span>
					</button>
					<button
						type="button"
						onClick={() => setViewMode("cards")}
						className={`h-7 px-2.5 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
							viewMode === "cards"
								? "bg-teal-600 text-white shadow-2xs"
								: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
						}`}
						title="Вид карточками"
						data-testid="lab-orders-view-cards-btn"
					>
						<LayoutGrid className="w-3.5 h-3.5" />
						<span>Карточки</span>
					</button>
				</div>
			</div>

			{/* Main Orders Table / Cards */}
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
					<p className="font-bold text-sm text-[var(--ink)]">Нарядов в зуботехническую лабораторию пока нет</p>
					<p className="max-w-md mx-auto text-[var(--muted)]">
						Оформите новый заказ-наряд в лабораторию с выбором зубов по FDI, расцветки VITA и автоматическим расчетом удержания себестоимости с врача.
					</p>
					<button
						type="button"
						onClick={handleOpenNewOrder}
						className="min-h-[44px] h-11 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold inline-flex items-center gap-2 shadow-2xs cursor-pointer transition-all active:scale-95 text-xs"
						data-testid="empty-state-add-first-lab-order-btn"
						style={{ minHeight: "44px" }}
					>
						<Plus className="w-4 h-4" />
						<span>+ Создать наряд-заказ в лабораторию</span>
					</button>
				</div>
			) : viewMode === "table" ? (
				/* ─── ПЛОТНЫЙ ДЕСКТОПНЫЙ РЕЕСТР: СТРОГО СЕТКА 32PX (МАНДАТЫ 8d п. 2, 8p) ─── */
				<div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xs" data-testid="lab-orders-table-container">
					<table className="w-full text-left border-collapse" data-testid="lab-orders-dense-table">
						<thead>
							<tr className="h-8 min-h-[32px] max-h-[32px] bg-[var(--paper-soft)] border-b border-[var(--line)] text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] select-none">
								<th className="px-3 py-0 whitespace-nowrap">№ Наряда</th>
								<th className="px-3 py-0 whitespace-nowrap">Пациент</th>
								<th className="px-2 py-0 whitespace-nowrap text-center">Зуб (FDI)</th>
								<th className="px-3 py-0 whitespace-nowrap">Конструкция / Материал</th>
								<th className="px-2 py-0 whitespace-nowrap">Цвет VITA</th>
								<th className="px-3 py-0 whitespace-nowrap">Статус ЗТЛ</th>
								<th className="px-3 py-0 whitespace-nowrap">Срок (Дедлайн)</th>
								<th className="px-3 py-0 whitespace-nowrap font-mono text-right">Себестоимость</th>
								<th className="px-3 py-0 whitespace-nowrap text-right">Действия</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line)]">
							{filteredOrders.map((order) => {
								const isReady = order.status === "ready" || order.status === "ready_in_clinic" || order.status === "shipped" || order.status === "delivered" || order.status === "received";
								const isOverdue = order.dueDate && order.status !== "completed" && order.status !== "cancelled" && new Date(order.dueDate).getTime() < Date.now();
								const orderNumDisplay = (order as any).orderNumber || (order.id ? `#${order.id.slice(0, 8)}` : "ЗТЛ");
								const swatchBg = SHADE_SWATCH_MAP[order.colorVita?.toUpperCase() ?? ""]?.bg || "#f4eedb";

								return (
									<tr
										key={order.id}
										className="h-8 min-h-[32px] max-h-[32px] hover:bg-[var(--paper-soft)] transition-colors text-xs text-[var(--ink)]"
										data-testid={`lab-order-table-row-${order.id}`}
									>
										{/* 1. Номер наряда */}
										<td className="px-3 py-0 whitespace-nowrap align-middle">
											<span className="font-mono font-bold text-[11px] text-teal-600 dark:text-teal-400">
												{orderNumDisplay}
											</span>
										</td>

										{/* 2. Пациент */}
										<td className="px-3 py-0 whitespace-nowrap align-middle">
											<span className="font-bold truncate max-w-[170px] inline-block align-middle" title={order.patientName}>
												{order.patientName || "Пациент"}
											</span>
										</td>

										{/* 3. Зуб FDI */}
										<td className="px-2 py-0 whitespace-nowrap align-middle text-center">
											<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-[var(--line)] font-mono">
												{order.toothFdi ? `№ ${order.toothFdi}` : "Челюсть"}
											</span>
										</td>

										{/* 4. Конструкция & Материал */}
										<td className="px-3 py-0 whitespace-nowrap align-middle">
											<span className="truncate max-w-[190px] inline-block align-middle text-[11px] text-[var(--ink)]" title={`${order.constructionType || ""} ${order.material || ""}`}>
												{formatLabConstructionTitle(order.constructionType, order.material ?? undefined)}
											</span>
										</td>

										{/* 5. VITA */}
										<td className="px-2 py-0 whitespace-nowrap align-middle">
											<span className="inline-flex items-center gap-1.5 font-bold text-[11px]">
												<span
													className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
													style={{ backgroundColor: swatchBg }}
												/>
												<span>{order.colorVita || "A2"}</span>
											</span>
										</td>

										{/* 6. Статус */}
										<td className="px-3 py-0 whitespace-nowrap align-middle">
											{getStatusBadge(order.status)}
										</td>

										{/* 7. Дедлайн */}
										<td className="px-3 py-0 whitespace-nowrap align-middle">
											<span className={`text-[11px] font-mono ${isOverdue ? "text-rose-600 font-bold" : "text-[var(--muted)]"}`}>
												{order.dueDate ? new Date(order.dueDate).toLocaleDateString("ru-RU") : "—"}
											</span>
										</td>

										{/* 8. Себестоимость / Пациент */}
										<td className="px-3 py-0 whitespace-nowrap align-middle font-mono font-bold text-xs text-right">
											{(order as any).isWarrantyRework || order.status === "refitting" || order.priceRub === 0 ? (
												<span className="text-emerald-600 dark:text-emerald-400 font-bold" title="Гарантийная рекламация: 0 ₽ для пациента">
													0 ₽ (Гарантия)
												</span>
											) : order.priceRub != null ? (
												money(order.priceRub)
											) : (
												"—"
											)}
										</td>

										{/* 9. Действия (строго 28-32px) */}
										<td className="px-3 py-0 whitespace-nowrap align-middle text-right">
											<div className="inline-flex items-center gap-1">
												{isReady ? (
													<button
														type="button"
														onClick={() => handleOpenReadyInClinicPrompt(order)}
														className="h-7 min-h-[28px] px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
														title="Работа готова в клинике! Записать пациента на примерку / фиксацию и отправить SMS / WhatsApp"
														data-testid={`lab-order-table-schedule-btn-${order.id}`}
													>
														<CalendarCheck className="w-3 h-3" />
														<span>Запись/SMS</span>
													</button>
												) : (
													<button
														type="button"
														onClick={() => handleOpenPrintOrder(order)}
														className="h-7 min-h-[28px] px-2 rounded-lg bg-[var(--teal)] text-white hover:opacity-90 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
														title="Распечатать наряд в зуботехническую лабораторию"
														data-testid={`lab-order-table-print-btn-${order.id}`}
													>
														<Printer className="w-3 h-3" />
														<span>Печать наряда</span>
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
																<span>Печать наряда в лабораторию</span>
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
																onClick={() => copyPortalLink((order as any).portalToken || order.id)}
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
						/>
					))}
				</div>
			)}

			{/* Modal Instance */}
			{isModalOpen && (
				<Suspense fallback={null}>
					<DentalLabOrderModal
						isOpen={isModalOpen}
						onClose={() => setIsModalOpen(false)}
						initialOrder={selectedOrderForEdit}
						initialTab={modalInitialTab}
						onOrderSaved={() => fetchOrders()}
					/>
				</Suspense>
			)}

			{/* Tracking Drawer Instance */}
			{isTrackingDrawerOpen && (
				<Suspense fallback={null}>
					<LabTrackingDrawer
						isOpen={isTrackingDrawerOpen}
						onClose={() => setIsTrackingDrawerOpen(false)}
						order={selectedOrderForTracking}
						onStageUpdate={handleDrawerStageUpdate}
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
						onOrderSaved={() => fetchOrders()}
					/>
				</Suspense>
			)}

			{/* Ready in clinic 1-click booking and SMS / WhatsApp modal (Mandates 8b, 8e, 8n) */}
			<DentalLabReadyInClinicModal
				isOpen={isReadyInClinicModalOpen}
				onClose={() => setIsReadyInClinicModalOpen(false)}
				order={readyInClinicOrder}
			/>
		</div>
	);
}
