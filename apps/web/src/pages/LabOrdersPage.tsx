import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	AlertCircle,
	AlertOctagon,
	Box,
	Calendar,
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
import { formatLabOrderTeethOrJaw, isJawWideConstruction } from "../components/lab/labMath";

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

export {
	LabActionPromptModal,
	type LabPromptDialogState,
	LabAttachScanModal,
	type LabAttachScanModalProps,
	is3DScanUrl,
	LabOrderCard,
};

export function LabOrdersPage() {
	const [orders, setOrders] = useState<DentalLabOrderData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filtering & Search
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [doctorFilter, setDoctorFilter] = useState<string>("all");
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
			setOrders(Array.isArray(data) ? data : []);
		} catch (err: any) {
			setError(err.message || "Не удалось загрузить наряды лаборатории");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchOrders();
	}, [fetchOrders, labOrderStatuses]);

	// Filtered Orders List
	const filteredOrders = useMemo(() => {
		return orders.filter((o) => {
			if (statusFilter !== "all" && o.status !== statusFilter) return false;
			if (doctorFilter !== "all" && o.doctorId !== doctorFilter && o.doctorName !== doctorFilter) return false;

			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const pName = (o.patientName || "").toLowerCase();
				const dName = (o.doctorName || "").toLowerCase();
				const tooth = (o.toothFdi || "").toLowerCase();
				const mat = (o.material || "").toLowerCase();
				const notes = (o.clinicalNotes || "").toLowerCase();
				return pName.includes(q) || dName.includes(q) || tooth.includes(q) || mat.includes(q) || notes.includes(q);
			}

			return true;
		});
	}, [orders, statusFilter, doctorFilter, searchQuery]);

	// KPI Metrics
	const metrics = useMemo(() => {
		const total = orders.length;
		const inProgress = orders.filter((o) => o.status === "in_progress" || o.status === "sent").length;
		const tryIn = orders.filter((o) => o.status === "fitting" || o.status === "refitting").length;
		const ready = orders.filter((o) => o.status === "shipped" || o.status === "delivered" || o.status === "received" || o.status === "completed").length;
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
		const defaultReason = "Несоответствие цвета VITA / переделка по гарантии (0 ₽)";
		setPromptState({
			title: "Оформление рекламации ЗТЛ",
			description: "Перевод наряда на гарантийную доработку (0 ₽). Выберите причину из списка или введите подробное описание дефекта:",
			icon: <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
			initialValue: defaultReason,
			placeholder: "Опишите дефект конструкции...",
			submitLabel: "Оформить рекламацию (0 ₽)",
			submitVariant: "danger",
			multiline: true,
			quickPresets: [
				"Несоответствие цвета VITA / переделка по гарантии (0 ₽)",
				"Скол облицовочной керамики",
				"Балансир каркаса / неплотное краевое прилегание",
				"Завышение по прикусу / окклюзионная интерференция",
				"Некорректная анатомическая форма / контактный пункт",
			],
			onSubmit: (reason: string) => {
				setPromptState(null);
				if (!reason.trim()) return;
				fetch(`/api/clinical/lab-orders/${order.id}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({
						status: "refitting",
						clinicalNotes: `${order.clinicalNotes || ""}\n[РЕКЛАМАЦИЯ ЗТЛ: ${reason.trim()}]`.trim(),
					}),
				})
					.then((res) => {
						if (!res.ok) throw new Error("Ошибка рекламации");
						showToast("Рекламация оформлена. Наряд отправлен на гарантийную доработку (0 ₽)", "warning");
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
		} catch (err: any) {
			showToast(err.message || "Ошибка смены этапа ЗТЛ", "error");
		}
	};

	const getStatusBadge = (status?: string) => {
		switch (status) {
			case "sent":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">Отправлен в ЗТЛ</span>;
			case "in_progress":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">В работе (CAD/CAM)</span>;
			case "fitting":
			case "refitting":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">На примерке / Доработке</span>;
			case "shipped":
			case "delivered":
			case "received":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">В клинике / Готов к сдаче</span>;
			case "completed":
				return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Сдан / Установлен</span>;
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
						<Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2 top-1/2 -translate-y-1/2" />
						<input
							type="text"
							placeholder="Поиск (пациент, врач, зуб, материал)..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full h-7.5 min-h-[30px] pl-7 pr-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-teal-500 focus:outline-none"
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
						<span>Оформить заказ-наряд в лабораторию</span>
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
		</div>
	);
}
