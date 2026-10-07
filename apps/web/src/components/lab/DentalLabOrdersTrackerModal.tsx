import React, { useState, useMemo, useEffect } from "react";
import "../../styles/components.css";
import {
	FlaskConical,
	Search,
	Plus,
	X,
	Calendar,
	CalendarCheck,
	CheckCircle2,
	Clock,
	AlertTriangle,
	AlertOctagon,
	RotateCcw,
	Filter,
	Layers,
	Printer,
	ChevronRight,
	ExternalLink,
	User,
	Sparkles,
	MoreHorizontal,
	FileText,
	Box,
	Truck,
	Check,
} from "lucide-react";
import {
	DentalLabReadyInClinicModal,
	type ReadyInClinicLabOrder,
} from "./DentalLabReadyInClinicModal";
import {
	type DentalLabConstructionType,
	type DentalLabOrderStatus,
	type DentalLabOrderRecord,
	DENTAL_LAB_CONSTRUCTIONS,
	DENTAL_LAB_STATUSES,
	DENTAL_LAB_STATUS_ORDER,
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	ENAMEL_TRANSLUCENCY_OPTIONS,
	STUMP_NATURAL_DIE_SHADES,
	formatFdiTeethDisplay,
	parseFdiTeethString,
	calculateZtlWageFinancials,
	detectLabDeadlineAlert,
	getNextLabStatus,
	canTransitionLabStatus,
	createDentalLabOrderRecord,
	toIsoDate,
	formatRuDate,
} from "./dentalLabOrderEngine";
import { DentalLabOrderDrawer } from "./DentalLabOrderDrawer";
import { DentalLabTrackerCard } from "./DentalLabTrackerCard";
import { denteAdminSecretRequestHeaders, money } from "../../AppHelpers";
import { showToast } from "../GlobalToast";

export interface DentalLabOrdersTrackerModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly currentPatientId?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly currentDoctorName?: string | undefined;
	readonly currentToothNumber?: number | string | undefined;
	readonly onOrderSaved?: ((order: DentalLabOrderRecord) => void) | undefined;
}

export function DentalLabOrdersTrackerModal({
	isOpen,
	onClose,
	currentPatientId,
	currentPatientName,
	currentDoctorName,
	currentToothNumber,
	onOrderSaved,
}: DentalLabOrdersTrackerModalProps) {
	// Реестр нарядов ЗТЛ (загружается с бэкенда при открытии)
	const [orders, setOrders] = useState<DentalLabOrderRecord[]>([]);

	// Поиск и фильтры
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [constructionFilter, setConstructionFilter] = useState<string>("all");
	const [onlyAlertsFilter, setOnlyAlertsFilter] = useState(false);
	const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

	// Drawer создания / редактирования наряда
	const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
	const [editingOrder, setEditingOrder] = useState<DentalLabOrderRecord | null>(null);

	// Ready in clinic prompt modal state (Mandates 8b, 8e, 8n)
	const [isReadyInClinicModalOpen, setIsReadyInClinicModalOpen] = useState(false);
	const [readyInClinicOrder, setReadyInClinicOrder] = useState<ReadyInClinicLabOrder | null>(null);

	const handleOpenReadyInClinicPrompt = (order: DentalLabOrderRecord) => {
		setOpenActionMenuId(null);
		const target: ReadyInClinicLabOrder = {
			id: order.id,
			orderNumber: order.orderNumber,
			patientName: order.patientName,
			doctorName: order.doctorName,
			toothFdi: order.teethFdi,
			material: order.materialRu,
			colorVita: order.vitaShade,
			constructionType: order.constructionType,
			clinicName: "DENTE",
		};
		setReadyInClinicOrder(target);
		setIsReadyInClinicModalOpen(true);
	};

	// Загрузка живых нарядов с бэкенда при открытии
	useEffect(() => {
		if (!isOpen) return;
		let isCancelled = false;

		async function loadLiveOrders() {
			try {
				const query = currentPatientId ? `?patientId=${encodeURIComponent(currentPatientId)}` : "";
				const res = await fetch(`/api/dental-lab/orders${query}`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) {
					setOrders([]);
					return;
				}
				const data = await res.json();
				if (isCancelled) return;
				if (!Array.isArray(data) || data.length === 0) {
					setOrders([]);
					return;
				}

				const mapped: DentalLabOrderRecord[] = data.map((raw: any, idx: number) => {
					const teeth = parseFdiTeethString(raw.toothFdi || "16");
					const cType: DentalLabConstructionType =
						raw.material?.toLowerCase().includes("emax") || raw.material?.toLowerCase().includes("e-max")
							? "crown_emax"
							: raw.material?.toLowerCase().includes("металл")
							? "metal_ceramic"
							: raw.material?.toLowerCase().includes("бюгел")
							? "clasp_denture"
							: raw.material?.toLowerCase().includes("элайн") || raw.material?.toLowerCase().includes("капп")
							? "aligner_splint"
							: raw.material?.toLowerCase().includes("шаблон")
							? "surgical_guide"
							: "crown_zirconia";

					const rawStatus = raw.status || "sent";
					const status: DentalLabOrderStatus =
						rawStatus === "in_progress" ? "in_progress" :
						rawStatus === "shipped" || rawStatus === "received" ? "ready_in_clinic" :
						rawStatus === "fitting" || rawStatus === "refitting" ? "try_in" :
						rawStatus === "completed" ? "delivered_to_patient" :
						rawStatus === "cancelled" ? "warranty_rework" : "sent_to_lab";

					return createDentalLabOrderRecord({
						id: raw.id || `live-ord-${idx}`,
						orderNumber: raw.orderNumber || `ЗТЛ-2026-${String(idx + 1).padStart(3, "0")}`,
						patientId: raw.patientId || currentPatientId || "pat-1",
						patientName: raw.patientName || "Пациент",
						doctorId: raw.doctorId || "doc-ortho",
						doctorName: raw.doctorName || "Врач-ортопед",
						labName: raw.labName || "CAD/CAM Центр Дентал-Мастер",
						teethFdi: teeth.length > 0 ? teeth : [16],
						constructionType: cType,
						materialRu: raw.material || DENTAL_LAB_CONSTRUCTIONS[cType].defaultMaterialRu,
						vitaShade: raw.colorVita || "A2",
						sentDate: raw.sentDate ? raw.sentDate.slice(0, 10) : toIsoDate(new Date()),
						deadlineDate: raw.dueDate ? raw.dueDate.slice(0, 10) : toIsoDate(new Date()),
						status,
						patientPriceKopecks: Number(raw.priceRub) ? Number(raw.priceRub) * 100 : 2400000,
						ztlCostKopecks: Math.round((Number(raw.priceRub) || 24000) * 35),
						doctorSharePercent: 20,
						clinicalNotes: raw.clinicalNotes || undefined,
					});
				});

				setOrders(mapped);
			} catch (_err) {
				setOrders([]);
			}
		}

		void loadLiveOrders();
		return () => {
			isCancelled = true;
		};
	}, [isOpen, currentPatientId]);

	// Закрытие выпадающих меню при клике снаружи
	useEffect(() => {
		if (!openActionMenuId) return;
		const handleDocClick = () => setOpenActionMenuId(null);
		document.addEventListener("click", handleDocClick);
		return () => document.removeEventListener("click", handleDocClick);
	}, [openActionMenuId]);

	// Фильтрация нарядов
	const filteredOrders = useMemo(() => {
		return orders.filter((o) => {
			if (statusFilter !== "all" && o.status !== statusFilter) return false;
			if (constructionFilter !== "all" && o.constructionType !== constructionFilter) return false;

			const alert = detectLabDeadlineAlert({
				status: o.status,
				deadlineDate: o.deadlineDate,
				scheduledVisitDate: o.scheduledVisitDate,
				patientName: o.patientName,
				toothNotation: formatFdiTeethDisplay(o.teethFdi),
			});

			if (onlyAlertsFilter && !alert.isDelayedAlert) return false;

			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const pName = o.patientName.toLowerCase();
				const dName = o.doctorName.toLowerCase();
				const lName = o.labName.toLowerCase();
				const teeth = o.teethFdi.join(", ");
				const num = o.orderNumber.toLowerCase();
				return pName.includes(q) || dName.includes(q) || lName.includes(q) || teeth.includes(q) || num.includes(q);
			}

			return true;
		});
	}, [orders, statusFilter, constructionFilter, onlyAlertsFilter, searchQuery]);

	// Метрики для KPI
	const metrics = useMemo(() => {
		const total = orders.length;
		const inProgress = orders.filter((o) => o.status === "in_progress" || o.status === "sent_to_lab").length;
		const inClinic = orders.filter((o) => o.status === "ready_in_clinic").length;
		const tryIn = orders.filter((o) => o.status === "try_in").length;
		const delivered = orders.filter((o) => o.status === "delivered_to_patient").length;

		// Считаем алерты
		const criticalAlerts = orders.filter((o) => {
			const a = detectLabDeadlineAlert({
				status: o.status,
				deadlineDate: o.deadlineDate,
				scheduledVisitDate: o.scheduledVisitDate,
			});
			return a.severity === "CRITICAL_TODAY";
		});

		const overdueAlerts = orders.filter((o) => {
			const a = detectLabDeadlineAlert({
				status: o.status,
				deadlineDate: o.deadlineDate,
				scheduledVisitDate: o.scheduledVisitDate,
			});
			return a.severity === "OVERDUE";
		});

		const totalZtlCostKop = orders.reduce((sum, o) => sum + o.ztlCostKopecks, 0);

		return {
			total,
			inProgress,
			inClinic,
			tryIn,
			delivered,
			criticalAlertsCount: criticalAlerts.length,
			criticalAlerts,
			overdueCount: overdueAlerts.length,
			totalZtlCostRub: totalZtlCostKop / 100,
		};
	}, [orders]);

	// Быстрый переход на следующий статус
	const handleAdvanceStatus = (orderId: string) => {
		setOrders((prev) =>
			prev.map((o) => {
				if (o.id !== orderId) return o;
				const next = getNextLabStatus(o.status);
				if (!next) return o;
				showToast(`Наряд ${o.orderNumber}: статус изменен на «${DENTAL_LAB_STATUSES[next].labelRu}»`, "success");

				// Real PATCH /api/lab/orders/:id (Mandate 8b, 8e, 8n)
				if (!o.id.startsWith("demo-")) {
					const mappedStatus =
						next === "delivered_to_patient" ? "completed" :
						next === "ready_in_clinic" ? "ready" :
						next === "try_in" ? "fitting" :
						next === "in_progress" ? "in_progress" : "sent";

					fetch(`/api/lab/orders/${o.id}`, {
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({
							status: mappedStatus,
							stage: next,
						}),
					}).catch((err) => {
						console.warn("[DentalLabOrdersTrackerModal] Failed to advance status on backend:", err);
					});
				}

				if (next === "ready_in_clinic") {
					handleOpenReadyInClinicPrompt({ ...o, status: next });
				}

				return { ...o, status: next, updatedAt: new Date().toISOString() };
			}),
		);
	};

	// Оформление гарантийной рекламации (0 ₽)
	const handleWarrantyRework = (orderId: string) => {
		setOrders((prev) =>
			prev.map((o) => {
				if (o.id !== orderId) return o;
				showToast(`Наряд ${o.orderNumber} направлен на гарантийную переделку (0 ₽)`, "warning");

				if (!o.id.startsWith("demo-")) {
					fetch(`/api/lab/orders/${o.id}`, {
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({
							status: "refitting",
							stage: "warranty_rework",
							notes: "Коррекция окклюзии / соответствие цвета VITA",
						}),
					}).catch((err) => {
						console.warn("[DentalLabOrdersTrackerModal] Failed to set warranty rework on backend:", err);
					});
				}

				return {
					...o,
					status: "warranty_rework",
					isWarrantyRemake: true,
					warrantyReason: "Коррекция окклюзии / соответствие цвета VITA",
					updatedAt: new Date().toISOString(),
				};
			}),
		);
	};

	// Сохранение наряда из дровера
	const handleSaveDrawerOrder = (saved: DentalLabOrderRecord, isEdit: boolean) => {
		if (isEdit) {
			setOrders((prev) => prev.map((o) => (o.id === saved.id ? saved : o)));
			onOrderSaved?.(saved);
			showToast(`Наряд ${saved.orderNumber} успешно обновлен`, "success");

			// Real PUT /api/lab/orders/:id persistence
			if (!saved.id.startsWith("demo-")) {
				fetch(`/api/lab/orders/${saved.id}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({
						toothFdi: saved.teethFdi.join(", "),
						material: saved.materialRu,
						colorVita: saved.vitaShade,
						dueDate: saved.deadlineDate,
						clinicalNotes: saved.clinicalNotes,
						priceRub: Math.round(saved.patientPriceKopecks / 100),
						status:
							saved.status === "delivered_to_patient" ? "completed" :
							saved.status === "ready_in_clinic" ? "ready" :
							saved.status === "try_in" ? "fitting" :
							saved.status === "in_progress" ? "in_progress" : "sent",
					}),
				}).catch((err) => {
					console.warn("[DentalLabOrdersTrackerModal] Failed to update order on backend:", err);
				});
			}
		} else {
			setOrders((prev) => [saved, ...prev]);
			onOrderSaved?.(saved);
			showToast(`Наряд ${saved.orderNumber} оформлен в ЗТЛ`, "success");

			// Real POST /api/lab/orders persistence
			fetch("/api/lab/orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					orderNumber: saved.orderNumber,
					patientId: saved.patientId || currentPatientId,
					patientName: saved.patientName,
					doctorId: saved.doctorId,
					doctorName: saved.doctorName,
					toothFdi: saved.teethFdi.join(", "),
					material: saved.materialRu,
					colorVita: saved.vitaShade,
					dueDate: saved.deadlineDate,
					clinicalNotes: saved.clinicalNotes,
					priceRub: Math.round(saved.patientPriceKopecks / 100),
					status:
						saved.status === "delivered_to_patient" ? "completed" :
						saved.status === "ready_in_clinic" ? "ready" :
						saved.status === "try_in" ? "fitting" :
						saved.status === "in_progress" ? "in_progress" : "sent",
				}),
			}).catch((err) => {
				console.warn("[DentalLabOrdersTrackerModal] Failed to persist new order on backend:", err);
			});
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", { detail: saved }),
			);
		}

		setIsCreateDrawerOpen(false);
		setEditingOrder(null);
	};

	const handleOpenNewOrder = () => {
		setEditingOrder(null);
		setIsCreateDrawerOpen(true);
	};

	const handleOpenEditOrder = (o: DentalLabOrderRecord) => {
		setEditingOrder(o);
		setIsCreateDrawerOpen(true);
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dental-lab-tracker-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="w-full max-w-6xl h-[92vh] max-h-[900px] bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 text-[var(--ink,#0f172a)]"
				onClick={(e) => e.stopPropagation()}
			>
				{/* ─── 1. ШАПКА ТРЕКЕРА (macOS HIG + ПЛОТНОСТЬ 32-36PX) ──────────────── */}
				<div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
							<FlaskConical className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						</div>
						<div className="min-w-0">
							<h2
								id="dental-lab-tracker-title"
								className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0 truncate"
							>
								Трекер нарядов в зуботехническую лабораторию (ЗТЛ)
							</h2>
							<p className="text-[11px] text-[var(--muted,#64748b)] m-0 truncate">
								Ортопедия · Дедлайны примерки/сдачи · Расцветка VITA · Вычет себестоимости ЗТЛ
							</p>
						</div>
					</div>

					{/* Правая часть: KPI-пилюли и крестик */}
					<div className="flex items-center gap-2 shrink-0">
						<div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] text-[11px] font-mono shadow-2xs">
							<span>Всего: <strong>{metrics.total}</strong></span>
							<span className="text-[var(--muted)]">•</span>
							<span>В работе: <strong className="text-amber-600">{metrics.inProgress}</strong></span>
							<span className="text-[var(--muted)]">•</span>
							<span>В клинике: <strong className="text-teal-600">{metrics.inClinic}</strong></span>
							{metrics.criticalAlertsCount > 0 && (
								<>
									<span className="text-[var(--muted)]">•</span>
									<span className="text-rose-600 font-bold animate-pulse">
										Алерты: {metrics.criticalAlertsCount}
									</span>
								</>
							)}
						</div>

						<button
							type="button"
							onClick={onClose}
							className="w-8 h-8 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] flex items-center justify-center transition-colors cursor-pointer"
							aria-label="Закрыть трекер ЗТЛ"
							data-testid="lab-tracker-close-btn"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* ─── 2. АЛЕРТ-БАННЕР ДЕДЛАЙНА (ЕСЛИ НА СЕГОДНЯ НАЗНАЧЕН ВИЗИТ, А РАБОТА ЕЩЕ В ЗТЛ) ─── */}
				{metrics.criticalAlertsCount > 0 && (
					<div
						className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-900 dark:text-rose-200 shrink-0"
						data-testid="lab-deadline-critical-banner"
					>
						<div className="flex items-center gap-2 min-w-0">
							<AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
							<span className="font-bold truncate">
								Внимание: {metrics.criticalAlertsCount} наряд(а) еще не поступил(и) из ЗТЛ, хотя у пациентов назначен визит на сегодня!
							</span>
						</div>
						<button
							type="button"
							onClick={() => setOnlyAlertsFilter(true)}
							className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition-colors cursor-pointer shrink-0"
						>
							Показать только горящие
						</button>
					</div>
				)}

				{/* ─── 3. ПАНЕЛЬ ФИЛЬТРОВ И ПОИСКА (БЕЗ СВАЛКИ, 1 СТРОКА 32-36PX) ──────── */}
				<div className="p-3 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] flex flex-wrap items-center justify-between gap-2 shrink-0">
					{/* Поле поиска */}
					<div className="relative flex-1 min-w-[180px] max-w-xs">
						<Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)] pointer-events-none" />
						<input
							type="text"
							placeholder="Поиск по пациенту, врачу, зубу, номеру..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							style={{ paddingLeft: "38px" }}
							className="w-full h-8 min-h-[32px] pr-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[13px] text-[var(--ink,#0f172a)] focus:ring-1 focus:ring-teal-500 focus:outline-none"
							data-testid="lab-tracker-search-input"
						/>
					</div>

					{/* Селектор статуса */}
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="h-8 min-h-[32px] px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[12.5px] text-[var(--ink,#0f172a)] focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
						aria-label="Фильтр по статусу"
					>
						<option value="all">Все статусы (6)</option>
						{DENTAL_LAB_STATUS_ORDER.map((st) => (
							<option key={st} value={st}>
								{DENTAL_LAB_STATUSES[st].labelRu}
							</option>
						))}
					</select>

					{/* Селектор конструкции */}
					<select
						value={constructionFilter}
						onChange={(e) => setConstructionFilter(e.target.value)}
						className="hidden sm:block h-8 min-h-[32px] px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[12.5px] text-[var(--ink,#0f172a)] focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
						aria-label="Фильтр по виду конструкции"
					>
						<option value="all">Все конструкции (6)</option>
						{Object.values(DENTAL_LAB_CONSTRUCTIONS).map((c) => (
							<option key={c.id} value={c.id}>
								{c.shortNameRu}
							</option>
						))}
					</select>

					{/* Чекбокс «Только алерты» */}
					<label className="flex items-center gap-1.5 text-[11px] text-[var(--ink,#0f172a)] font-medium cursor-pointer shrink-0">
						<input
							type="checkbox"
							checked={onlyAlertsFilter}
							onChange={(e) => setOnlyAlertsFilter(e.target.checked)}
							className="rounded border-[var(--line,#cbd5e1)] text-teal-600 focus:ring-teal-500"
						/>
						<span>Только алерты дедлайнов</span>
					</label>

					{/* Кнопка создания наряда */}
					<button
						type="button"
						onClick={handleOpenNewOrder}
						className="primary-button h-8 min-h-[32px] px-3 text-[13px] font-semibold"
						data-testid="lab-tracker-new-order-btn"
					>
						<Plus className="w-3.5 h-3.5" />
						<span>+ Наряд ЗТЛ</span>
					</button>
				</div>

				{/* ─── 4. РАБОЧАЯ ОБЛАСТЬ (КАРТОЧКИ НАРЯДОВ С ПЛОТНОСТЬЮ) ─────────────── */}
				<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--paper-soft,#f8fafc)]">
					{filteredOrders.length === 0 ? (
						<div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-[var(--paper,#ffffff)] rounded-xl border border-dashed border-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)]">
							<FlaskConical className="w-8 h-8 mb-2 opacity-40 text-teal-600" />
							<p className="text-sm font-semibold m-0 text-[var(--ink,#0f172a)]">
								Нарядов в зуботехническую лабораторию не найдено
							</p>
							<p className="text-xs m-0 mt-1 max-w-sm">
								{searchQuery || statusFilter !== "all" || onlyAlertsFilter
									? "Попробуйте сбросить установленные фильтры поиска"
									: "Оформите первый наряд на коронку, винир или шаблон по кнопке ниже"}
							</p>
							<button
								type="button"
								onClick={handleOpenNewOrder}
								className="mt-3 primary-button h-8 min-h-[32px] px-3.5 text-[13px] font-semibold"
								data-testid="tracker-empty-create-lab-order-btn"
							>
								<Plus className="w-3.5 h-3.5" />
								<span>+ Создать наряд-заказ в лабораторию</span>
							</button>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
							{filteredOrders.map((order) => (
								<DentalLabTrackerCard
									key={order.id}
									order={order}
									openActionMenuId={openActionMenuId}
									setOpenActionMenuId={setOpenActionMenuId}
									handleOpenReadyInClinicPrompt={handleOpenReadyInClinicPrompt}
									handleAdvanceStatus={handleAdvanceStatus}
									handleOpenEditOrder={handleOpenEditOrder}
									handleWarrantyRework={handleWarrantyRework}
								/>
							))}
						</div>
					)}
				</div>

				{/* ─── 5. ДРАВЕР СОЗДАНИЯ / РЕДАКТИРОВАНИЯ НАРЯДА ЗТЛ (ВЫНЕСЕН В DentalLabOrderDrawer) ─── */}
				<DentalLabOrderDrawer
					isOpen={isCreateDrawerOpen}
					onClose={() => {
						setIsCreateDrawerOpen(false);
						setEditingOrder(null);
					}}
					editingOrder={editingOrder}
					currentPatientName={currentPatientName}
					currentDoctorName={currentDoctorName}
					currentToothNumber={currentToothNumber}
					onSaveOrder={handleSaveDrawerOrder}
				/>

				{/* Модалка быстрой записи и шаблонов SMS / WhatsApp при поступлении работы в клинику */}
				<DentalLabReadyInClinicModal
					isOpen={isReadyInClinicModalOpen}
					onClose={() => setIsReadyInClinicModalOpen(false)}
					order={readyInClinicOrder}
				/>
			</div>
		</div>
	);
}
