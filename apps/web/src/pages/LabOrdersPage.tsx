import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	AlertCircle,
	AlertOctagon,
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
const LabTrackingDrawer = lazy(() =>
	import("../components/lab/LabTrackingDrawer").then((module) => ({
		default: module.LabTrackingDrawer,
	})),
);

export interface LabPromptDialogState {
	title: string;
	description?: string;
	icon?: React.ReactNode;
	initialValue?: string;
	placeholder?: string;
	submitLabel?: string;
	submitVariant?: "teal" | "danger" | "primary";
	multiline?: boolean;
	quickPresets?: string[];
	onSubmit: (value: string) => void;
}

export function LabActionPromptModal({
	state,
	onClose,
}: {
	state: LabPromptDialogState | null;
	onClose: () => void;
}) {
	const [value, setValue] = useState("");
	const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

	useEffect(() => {
		if (state) {
			setValue(state.initialValue || "");
			const timer = setTimeout(() => {
				if (inputRef.current) {
					inputRef.current.focus();
					inputRef.current.select?.();
				}
			}, 30);
			return () => clearTimeout(timer);
		}
	}, [state]);

	if (!state) return null;

	const handleFormSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		state.onSubmit(value);
	};

	const isDanger = state.submitVariant === "danger";

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="lab-prompt-modal-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				className="w-full max-w-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#cbd5e1)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div
					className={`flex items-center justify-between px-4 py-3 border-b border-[var(--line,#cbd5e1)] ${
						isDanger ? "bg-rose-500/10" : "bg-[var(--paper-soft,#f8fafc)]"
					}`}
				>
					<div className="flex items-center gap-2.5 min-w-0">
						{state.icon && (
							<div
								className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
									isDanger
										? "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400"
										: "bg-teal-500/10 border-teal-500/25 text-teal-600 dark:text-teal-400"
								}`}
							>
								{state.icon}
							</div>
						)}
						<h3
							id="lab-prompt-modal-title"
							className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0 truncate"
						>
							{state.title}
						</h3>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[32px] min-w-[32px] rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] flex items-center justify-center transition-colors cursor-pointer"
						aria-label="Закрыть"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleFormSubmit} className="flex flex-col m-0">
					<div className="p-4 space-y-3">
						{state.description && (
							<p className="text-xs text-[var(--muted,#64748b)] m-0 leading-relaxed">
								{state.description}
							</p>
						)}

						{/* Quick Presets if available */}
						{state.quickPresets && state.quickPresets.length > 0 && (
							<div className="space-y-1.5 pt-0.5">
								<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block">
									Быстрый выбор причины:
								</span>
								<div className="flex flex-wrap gap-1.5">
									{state.quickPresets.map((preset) => (
										<button
											key={preset}
											type="button"
											onClick={() => {
												setValue(preset);
												inputRef.current?.focus();
											}}
											className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer text-left ${
												value === preset
													? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold"
													: "bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] border-[var(--line,#cbd5e1)]"
											}`}
										>
											{preset}
										</button>
									))}
								</div>
							</div>
						)}

						{/* Input / Textarea */}
						<div className="space-y-1">
							{state.multiline ? (
								<textarea
									ref={inputRef as React.RefObject<HTMLTextAreaElement>}
									value={value}
									onChange={(e) => setValue(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
											e.preventDefault();
											handleFormSubmit();
										} else if (e.key === "Escape") {
											e.preventDefault();
											onClose();
										}
									}}
									rows={4}
									placeholder={state.placeholder}
									className="w-full p-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:ring-2 focus:ring-teal-500 focus:outline-none resize-y leading-relaxed"
								/>
							) : (
								<input
									ref={inputRef as React.RefObject<HTMLInputElement>}
									type="text"
									value={value}
									onChange={(e) => setValue(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											handleFormSubmit();
										} else if (e.key === "Escape") {
											e.preventDefault();
											onClose();
										}
									}}
									placeholder={state.placeholder}
									className="w-full h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:ring-2 focus:ring-teal-500 focus:outline-none"
								/>
							)}

							<div className="flex items-center justify-between text-[10px] text-[var(--muted,#64748b)] px-0.5">
								<span>
									{state.multiline
										? "Нажмите Ctrl+Enter для отправки, Esc для отмены"
										: "Нажмите Enter для отправки, Esc для отмены"}
								</span>
								{value && (
									<button
										type="button"
										onClick={() => {
											setValue("");
											inputRef.current?.focus();
										}}
										className="text-teal-600 hover:text-teal-700 dark:text-teal-400 cursor-pointer font-medium"
									>
										Очистить
									</button>
								)}
							</div>
						</div>
					</div>

					{/* Footer */}
					<div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
						<button
							type="button"
							onClick={onClose}
							className="h-8 min-h-[32px] px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] font-medium text-xs transition-colors cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="submit"
							className={`h-8 min-h-[32px] px-3.5 rounded-lg font-bold text-xs text-white shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
								isDanger
									? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800"
									: "bg-teal-600 hover:bg-teal-700 active:bg-teal-800"
							}`}
						>
							{state.submitLabel || "Сохранить"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

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

	// Modal State
	const [isModalOpen, setIsModalOpen] = useState(false);
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

	const handleAttachBitePhoto = (order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		setPromptState({
			title: "Фото прикуса / 3D-скан (ЗТЛ)",
			description: `Укажите URL или ссылку на фото прикуса, окклюдограмму или STL-скан для заказа #${order.orderNumber || order.id?.slice(0, 8)}.`,
			icon: <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
			initialValue: order.attachedImageUrl || "",
			placeholder: "https://... или storage/scans/bite_photo.jpg",
			submitLabel: "Прикрепить фото",
			submitVariant: "teal",
			onSubmit: (url: string) => {
				setPromptState(null);
				if (!url.trim()) return;
				fetch(`/api/clinical/lab-orders/${order.id}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({ attachedImageUrl: url.trim() }),
				})
					.then((res) => {
						if (!res.ok) throw new Error("Ошибка прикрепления фото");
						showToast("Фото прикуса успешно прикреплено к наряду ЗТЛ", "success");
						fetchOrders();
					})
					.catch((err) => showToast(err.message || "Ошибка прикрепления фото", "error"));
			},
		});
	};

	const handleTechnicianComment = (order: DentalLabOrderData) => {
		setOpenMenuOrderId(null);
		setPromptState({
			title: "Клинический комментарий технику",
			description: `Уточнение границ уступа, цвета по VITA, рельефа фиссур или особенностей моделировки для наряда #${order.orderNumber || order.id?.slice(0, 8)}.`,
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
					{filteredOrders.map((order) => {
						return (
							<div
								key={order.id}
								className="lab-order-card bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
								style={{
									contentVisibility: "auto",
									containIntrinsicSize: "1px 220px",
									contain: "content",
								}}
							>
								<div className="space-y-3">
									{/* Card Top */}
									<div className="flex items-start justify-between gap-2 min-w-0">
										<div className="flex items-center gap-2 min-w-0 flex-1">
											<span
												className={`min-h-[36px] px-2.5 py-1 rounded-xl font-extrabold text-xs flex items-center justify-center text-center shrink-0 ${
													order.jawScope ||
													isJawWideConstruction(order.constructionType) ||
													Boolean(
														order.toothFdi &&
															(order.toothFdi.includes("челюст") ||
																order.toothFdi.includes("В/Ч") ||
																order.toothFdi.includes("Н/Ч")),
													)
														? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
														: "bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-400 font-mono"
												}`}
												title={order.toothFdi || "Челюсть / Зубы"}
											>
												{formatLabOrderTeethOrJaw(order)}
											</span>
											<div className="min-w-0 flex-1">
												<h3 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0 truncate">
													{order.patientName || "Пациент"}
												</h3>
												<span className="text-xs text-[var(--muted)] block truncate">
													Врач: {order.doctorName || "Не указан"}
												</span>
											</div>
										</div>

										<div className="shrink-0">{getStatusBadge(order.status)}</div>
									</div>

									{/* Tech Details */}
									<div className="p-2.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] text-xs space-y-1 text-[var(--ink)]">
										<div className="flex justify-between">
											<span className="text-[var(--muted)]">Материал:</span>
											<span className="font-semibold">{order.material || "Цирконий"}</span>
										</div>
										<div className="flex justify-between">
											<span className="text-[var(--muted)]">Цвет VITA:</span>
											<span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
												{order.colorVita || "A2"}
											</span>
										</div>
										{order.dueDate && (
											<div className="flex justify-between text-[var(--muted)]">
												<span>Срок сдачи:</span>
												<span>{new Date(order.dueDate).toLocaleDateString("ru-RU")}</span>
											</div>
										)}
									</div>

									{/* Notes preview */}
									{order.clinicalNotes && (
										<p className="text-xs text-[var(--muted)] italic line-clamp-2 m-0">
											{order.clinicalNotes}
										</p>
									)}
								</div>

								{/* Card Bottom: Financials & Strictly <= 2 Direct Action Buttons + "..." (Miller's Law / Mandates 8d item 3, 8p) */}
								<div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2">
									<div>
										<span className="text-[11px] text-[var(--muted)] block">Себестоимость:</span>
										<span className="text-sm font-black text-[var(--ink)] font-mono">
											{order.priceRub != null ? money(order.priceRub) : "—"}
										</span>
									</div>

									<div className="flex items-center gap-1.5">
										{/* ПРЯМОЕ ДЕЙСТВИЕ 1: Печать наряда ЗТЛ-1 (ГОСТ) */}
										<button
											type="button"
											onClick={() => handleOpenPrintOrder(order)}
											className="h-9 min-h-[36px] px-3 rounded-xl bg-[var(--teal)] text-[var(--on-teal,#ffffff)] hover:opacity-90 font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
											title="Распечатать официальный наряд ЗТЛ-1 (ГОСТ / СтАР)"
											data-testid={`lab-order-print-ztl1-btn-${order.id}`}
										>
											<Printer className="w-3.5 h-3.5" />
											<span>Печать ЗТЛ-1</span>
										</button>

										{/* ПРЯМОЕ ДЕЙСТВИЕ 2: Сменить этап/статус */}
										<button
											type="button"
											onClick={() => handleOpenTracking(order)}
											className="h-9 min-h-[36px] px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 font-bold text-xs border border-teal-200 dark:border-teal-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
											title="Сменить этап или статус изготовления работы в ЗТЛ"
											data-testid={`lab-order-stage-status-btn-${order.id}`}
										>
											<Layers className="w-3.5 h-3.5 text-indigo-500" />
											<span>Этап/статус</span>
										</button>

										{/* ВТОРИЧНЫЕ ДЕЙСТВИЯ: Меню "..." (MoreHorizontal) */}
										<div className="relative">
											<button
												type="button"
												onClick={() => setOpenMenuOrderId((prev) => prev === order.id ? null : (order.id || null))}
												className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
												aria-label="Вторичные действия с нарядом ЗТЛ"
												aria-expanded={openMenuOrderId === order.id}
												title="Вторичные действия: фото прикуса, комментарий технику, повторная примерка, рекламация"
											>
												<MoreHorizontal className="w-4 h-4" />
											</button>

											{openMenuOrderId === order.id && (
												<div className="absolute right-0 bottom-full mb-1 z-50 w-56 p-1.5 bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl shadow-lg flex flex-col gap-1 text-xs">
													<button
														type="button"
														onClick={() => handleAttachBitePhoto(order)}
														className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer"
													>
														<Camera className="w-3.5 h-3.5 text-sky-500" />
														<span>Прикрепить фото прикуса</span>
													</button>
													<button
														type="button"
														onClick={() => handleTechnicianComment(order)}
														className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer"
													>
														<MessageSquare className="w-3.5 h-3.5 text-amber-500" />
														<span>Комментарий технику</span>
													</button>
													<button
														type="button"
														onClick={() => handleRepeatFitting(order)}
														className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-purple-700 dark:text-purple-300 inline-flex items-center gap-2 cursor-pointer"
													>
														<RotateCcw className="w-3.5 h-3.5 text-purple-500" />
														<span>Повторная примерка</span>
													</button>
													<button
														type="button"
														onClick={() => handleReclamation(order)}
														className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-semibold text-rose-600 dark:text-rose-400 inline-flex items-center gap-2 cursor-pointer"
													>
														<AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
														<span>Рекламация (0 ₽)</span>
													</button>
													{order.dueDate && (
														<button
															type="button"
															onClick={() => {
																setOpenMenuOrderId(null);
																window.location.hash = "#schedule";
																const d = new Date(order.dueDate!).toLocaleDateString("ru-RU");
																showToast(`Переход в расписание на дату готовности: ${d} (зуб ${order.toothFdi || ""})`, "success");
															}}
															className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer"
														>
															<Calendar className="w-3.5 h-3.5 text-teal-500" />
															<span>Запланировать прием</span>
														</button>
													)}
													<button
														type="button"
														onClick={() => {
															setOpenMenuOrderId(null);
															handleOpenEditOrder(order);
														}}
														className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer"
													>
														<FileText className="w-3.5 h-3.5 text-indigo-500" />
														<span>Подробные параметры</span>
													</button>
													{order.secureToken && (
														<button
															type="button"
															onClick={() => {
																setOpenMenuOrderId(null);
																copyPortalLink(order.secureToken!);
															}}
															className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer"
														>
															<Link className="w-3.5 h-3.5 text-emerald-500" />
															<span>Копировать ссылку ЗТЛ</span>
														</button>
													)}
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})}
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
		</div>
	);
}
