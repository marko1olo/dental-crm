import React, { useState, useMemo, useEffect, useRef } from "react";
import {
	FlaskConical,
	Search,
	Plus,
	X,
	Calendar,
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
	// Реестр нарядов ЗТЛ
	const [orders, setOrders] = useState<DentalLabOrderRecord[]>(() => [
		createDentalLabOrderRecord({
			id: "demo-ztl-1",
			orderNumber: "ЗТЛ-2026-104",
			patientName: "Барабаш С.В.",
			doctorName: "Д-р Орлов А.В. (Ортопед)",
			labName: "CAD/CAM Центр Дентал-Мастер",
			technicianName: "Техник Соколов М.",
			teethFdi: [16],
			constructionType: "crown_zirconia",
			materialRu: "Диоксид циркония Katana HTML",
			vitaShade: "A2",
			translucency: "MT",
			stumpShade: "ND2",
			sentDate: toIsoDate(new Date(Date.now() - 4 * 86400000)),
			deadlineDate: toIsoDate(new Date()),
			scheduledVisitDate: toIsoDate(new Date()), // Назначен прием на сегодня!
			status: "in_progress", // Работа еще в ЗТЛ -> Сработает АЛЕРТ!
			patientPriceKopecks: 2400000,
			ztlCostKopecks: 750000,
			doctorSharePercent: 20,
			clinicalNotes: "Поднутрение с дистальной стороны, уступ 0.8мм",
		}),
		createDentalLabOrderRecord({
			id: "demo-ztl-2",
			orderNumber: "ЗТЛ-2026-105",
			patientName: "Смирнова Е.А.",
			doctorName: "Д-р Мельников П.И.",
			labName: "ArtDent Премиум Лаб",
			teethFdi: [11, 21],
			constructionType: "crown_emax",
			materialRu: "IPS e.max Press",
			vitaShade: "A1",
			translucency: "HT",
			stumpShade: "ND1",
			sentDate: toIsoDate(new Date(Date.now() - 3 * 86400000)),
			deadlineDate: toIsoDate(new Date(Date.now() + 2 * 86400000)),
			scheduledVisitDate: toIsoDate(new Date(Date.now() + 3 * 86400000)),
			status: "sent_to_lab",
			patientPriceKopecks: 5200000,
			ztlCostKopecks: 1700000,
			doctorSharePercent: 25,
		}),
		createDentalLabOrderRecord({
			id: "demo-ztl-3",
			orderNumber: "ЗТЛ-2026-098",
			patientName: "Кузнецов И.П.",
			doctorName: "Д-р Орлов А.В. (Ортопед)",
			labName: "CAD/CAM Центр Дентал-Мастер",
			teethFdi: [46],
			constructionType: "metal_ceramic",
			materialRu: "Co-Cr Noritake EX-3",
			vitaShade: "A3",
			sentDate: toIsoDate(new Date(Date.now() - 7 * 86400000)),
			deadlineDate: toIsoDate(new Date(Date.now() - 1 * 86400000)),
			status: "ready_in_clinic", // Уже в клинике
			patientPriceKopecks: 1400000,
			ztlCostKopecks: 450000,
			doctorSharePercent: 20,
		}),
	]);

	// Поиск и фильтры
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [constructionFilter, setConstructionFilter] = useState<string>("all");
	const [onlyAlertsFilter, setOnlyAlertsFilter] = useState(false);
	const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

	// Drawer создания / редактирования наряда
	const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
	const [editingOrder, setEditingOrder] = useState<DentalLabOrderRecord | null>(null);

	// Поля формы создания
	const [formPatientName, setFormPatientName] = useState(currentPatientName || "");
	const [formDoctorName, setFormDoctorName] = useState(currentDoctorName || "Д-р Орлов А.В. (Ортопед)");
	const [formLabName, setFormLabName] = useState("CAD/CAM Центр Дентал-Мастер");
	const [formTechnicianName, setFormTechnicianName] = useState("");
	const [formTeethInput, setFormTeethInput] = useState(currentToothNumber ? String(currentToothNumber) : "16");
	const [formConstruction, setFormConstruction] = useState<DentalLabConstructionType>("crown_zirconia");
	const [formVitaShade, setFormVitaShade] = useState("A2");
	const [formTranslucency, setFormTranslucency] = useState("MT");
	const [formStumpShade, setFormStumpShade] = useState("ND2");
	const [formSentDate, setFormSentDate] = useState(() => toIsoDate(new Date()));
	const [formDeadlineDate, setFormDeadlineDate] = useState(() => {
		const d = new Date();
		d.setDate(d.getDate() + 5);
		return toIsoDate(d);
	});
	const [formScheduledVisit, setFormScheduledVisit] = useState("");
	const [formPatientPriceRub, setFormPatientPriceRub] = useState(24000);
	const [formZtlCostRub, setFormZtlCostRub] = useState(7500);
	const [formDoctorPercent, setFormDoctorPercent] = useState(20);
	const [formClinicalNotes, setFormClinicalNotes] = useState("");

	// Синхронизация с контекстными пропсами
	useEffect(() => {
		if (currentPatientName) setFormPatientName(currentPatientName);
		if (currentDoctorName) setFormDoctorName(currentDoctorName);
		if (currentToothNumber) setFormTeethInput(String(currentToothNumber));
	}, [currentPatientName, currentDoctorName, currentToothNumber]);

	// Загрузка живых нарядов с бэкенда при открытии
	useEffect(() => {
		if (!isOpen) return;
		let isCancelled = false;

		async function loadLiveOrders() {
			try {
				const query = currentPatientId ? `?patientId=${encodeURIComponent(currentPatientId)}` : "";
				const res = await fetch(`/api/clinical/lab-orders${query}`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (isCancelled || !Array.isArray(data) || data.length === 0) return;

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

				setOrders((prev) => {
					// Объединяем живые данные с локальными
					const ids = new Set(mapped.map((m) => m.id));
					const retained = prev.filter((p) => !ids.has(p.id));
					return [...mapped, ...retained];
				});
			} catch (_err) {
				// Офлайн фоллбэк: оставляем локальные наряды
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

	// Сохранение нового или отредактированного наряда
	const handleSaveOrderForm = (e: React.FormEvent) => {
		e.preventDefault();
		const teeth = parseFdiTeethString(formTeethInput);
		const teethFinal = teeth.length > 0 ? teeth : [16];
		const def = DENTAL_LAB_CONSTRUCTIONS[formConstruction];

		const fin = calculateZtlWageFinancials({
			unitsCount: teethFinal.length,
			patientPriceRub: formPatientPriceRub,
			ztlCostRub: formZtlCostRub,
			doctorSharePercent: formDoctorPercent,
		});

		if (editingOrder) {
			const updated: DentalLabOrderRecord = {
				...editingOrder,
				patientName: formPatientName || "Пациент",
				doctorName: formDoctorName || "Врач-ортопед",
				labName: formLabName,
				technicianName: formTechnicianName || undefined,
				teethFdi: teethFinal,
				constructionType: formConstruction,
				materialRu: def.defaultMaterialRu,
				vitaShade: formVitaShade,
				translucency: formTranslucency,
				stumpShade: formStumpShade,
				sentDate: formSentDate,
				deadlineDate: formDeadlineDate,
				scheduledVisitDate: formScheduledVisit || undefined,
				patientPriceKopecks: fin.patientPriceKopecks,
				ztlCostKopecks: fin.ztlCostKopecks,
				doctorSharePercent: fin.doctorSharePercent,
				clinicalNotes: formClinicalNotes || undefined,
				updatedAt: new Date().toISOString(),
			};

			setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
			onOrderSaved?.(updated);
			showToast(`Наряд ${updated.orderNumber} успешно обновлен`, "success");
		} else {
			const created = createDentalLabOrderRecord({
				patientName: formPatientName || "Пациент",
				doctorName: formDoctorName || "Врач-ортопед",
				labName: formLabName,
				technicianName: formTechnicianName || undefined,
				teethFdi: teethFinal,
				constructionType: formConstruction,
				materialRu: def.defaultMaterialRu,
				vitaShade: formVitaShade,
				translucency: formTranslucency,
				stumpShade: formStumpShade,
				sentDate: formSentDate,
				deadlineDate: formDeadlineDate,
				scheduledVisitDate: formScheduledVisit || undefined,
				patientPriceKopecks: fin.patientPriceKopecks,
				ztlCostKopecks: fin.ztlCostKopecks,
				doctorSharePercent: fin.doctorSharePercent,
				clinicalNotes: formClinicalNotes || undefined,
			});

			setOrders((prev) => [created, ...prev]);
			onOrderSaved?.(created);
			showToast(`Наряд ${created.orderNumber} оформлен в ЗТЛ`, "success");
		}

		setIsCreateDrawerOpen(false);
		setEditingOrder(null);
	};

	const handleOpenNewOrder = () => {
		setEditingOrder(null);
		setFormConstruction("crown_zirconia");
		setFormPatientPriceRub(24000);
		setFormZtlCostRub(7500);
		setFormDoctorPercent(20);
		setFormVitaShade("A2");
		setFormTranslucency("MT");
		setFormStumpShade("ND2");
		setFormSentDate(toIsoDate(new Date()));
		const d = new Date();
		d.setDate(d.getDate() + 5);
		setFormDeadlineDate(toIsoDate(d));
		setFormScheduledVisit("");
		setFormClinicalNotes("");
		setIsCreateDrawerOpen(true);
	};

	const handleOpenEditOrder = (o: DentalLabOrderRecord) => {
		setEditingOrder(o);
		setFormPatientName(o.patientName);
		setFormDoctorName(o.doctorName);
		setFormLabName(o.labName);
		setFormTechnicianName(o.technicianName || "");
		setFormTeethInput(o.teethFdi.join(", "));
		setFormConstruction(o.constructionType);
		setFormVitaShade(o.vitaShade);
		setFormTranslucency(o.translucency || "MT");
		setFormStumpShade(o.stumpShade || "ND2");
		setFormSentDate(o.sentDate);
		setFormDeadlineDate(o.deadlineDate);
		setFormScheduledVisit(o.scheduledVisitDate || "");
		setFormPatientPriceRub(o.patientPriceKopecks / 100);
		setFormZtlCostRub(o.ztlCostKopecks / 100);
		setFormDoctorPercent(o.doctorSharePercent);
		setFormClinicalNotes(o.clinicalNotes || "");
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
										⚠️ Алерты: {metrics.criticalAlertsCount}
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
								⚠️ Внимание: {metrics.criticalAlertsCount} наряд(а) еще не поступил(и) из ЗТЛ, хотя у пациентов назначен визит на сегодня!
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

				{/* ─── 3. ТУЛБАР ФИЛЬТРОВ (СТРОГО 1 СТРОКА 32-36PX, ЗАКОН ХИКА) ─────── */}
				<div className="h-9 min-h-[36px] flex items-center justify-between gap-2 px-3 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs shrink-0">
					{/* Поиск */}
					<div className="relative flex-1 max-w-xs">
						<Search className="w-3.5 h-3.5 text-[var(--muted,#64748b)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
						<input
							type="text"
							placeholder="Поиск по пациенту, врачу, зубу, номеру..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full h-7 pl-8 pr-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink,#0f172a)] focus:ring-1 focus:ring-teal-500 focus:outline-none"
							data-testid="lab-tracker-search-input"
						/>
					</div>

					{/* Селектор статуса */}
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="h-7 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[11px] text-[var(--ink,#0f172a)] focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
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
						className="hidden sm:block h-7 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[11px] text-[var(--ink,#0f172a)] focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
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
						className="h-7 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer shrink-0"
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
							<FlaskConical className="w-10 h-10 text-teal-600 dark:text-teal-400 mb-2" />
							<p className="font-bold text-sm text-[var(--ink,#0f172a)]">
								Нарядов в зуботехническую лабораторию не найдено
							</p>
							<p className="text-xs max-w-sm mb-4">
								Оформите заказ-наряд на коронку из циркония, E-max пресс, металлокерамику, бюгель или каппу.
							</p>
							<button
								type="button"
								onClick={handleOpenNewOrder}
								className="h-8 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
							>
								<Plus className="w-3.5 h-3.5" />
								<span>Оформить первый наряд ЗТЛ</span>
							</button>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
							{filteredOrders.map((order) => {
								const alert = detectLabDeadlineAlert({
									status: order.status,
									deadlineDate: order.deadlineDate,
									scheduledVisitDate: order.scheduledVisitDate,
									patientName: order.patientName,
									toothNotation: formatFdiTeethDisplay(order.teethFdi),
								});

								const construction = DENTAL_LAB_CONSTRUCTIONS[order.constructionType];
								const statusDef = DENTAL_LAB_STATUSES[order.status];
								const nextStatus = getNextLabStatus(order.status);

								return (
									<div
										key={order.id}
										className={`p-3 rounded-xl border transition-all flex flex-col justify-between bg-[var(--paper,#ffffff)] shadow-2xs ${
											alert.severity === "CRITICAL_TODAY"
												? "border-rose-500/80 ring-2 ring-rose-500/20"
												: alert.severity === "OVERDUE"
												? "border-amber-500/70"
												: "border-[var(--line,#cbd5e1)]"
										}`}
										data-testid={`lab-order-card-${order.id}`}
									>
										<div className="space-y-2.5">
											{/* Верхняя строка карточки: Номер, Зуб FDI, Статус */}
											<div className="flex items-center justify-between gap-1.5">
												<div className="flex items-center gap-1.5 min-w-0">
													<span className="font-mono text-xs font-bold text-[var(--ink,#0f172a)]">
														{order.orderNumber}
													</span>
													<span
														className="px-2 py-0.5 rounded-md font-mono text-xs font-black bg-teal-500/10 text-teal-800 dark:text-teal-200 border border-teal-500/30"
														title="Зубы по формуле FDI (11–48)"
													>
														Зуб: {formatFdiTeethDisplay(order.teethFdi)}
													</span>
												</div>
												<span
													className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusDef.badgeClass}`}
												>
													{statusDef.shortLabelRu}
												</span>
											</div>

											{/* Пациент и Врач */}
											<div>
												<h4 className="text-xs sm:text-sm font-bold text-[var(--ink,#0f172a)] m-0 truncate">
													{order.patientName}
												</h4>
												<p className="text-[11px] text-[var(--muted,#64748b)] m-0 truncate">
													Врач: {order.doctorName}
												</p>
											</div>

											{/* Конструкция, Материал, Цвет VITA */}
											<div className="p-2 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] text-[11px] space-y-1">
												<div className="flex items-center justify-between">
													<span className="text-[var(--muted,#64748b)]">Вид:</span>
													<span className="font-bold text-[var(--ink,#0f172a)] truncate">
														{construction?.shortNameRu || order.constructionType}
													</span>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-[var(--muted,#64748b)]">VITA:</span>
													<span className="font-bold font-mono text-teal-700 dark:text-teal-300">
														{order.vitaShade}
														{order.translucency ? ` (${order.translucency})` : ""}
														{order.stumpShade ? ` • Культя: ${order.stumpShade}` : ""}
													</span>
												</div>
												<div className="flex items-center justify-between">
													<span className="text-[var(--muted,#64748b)]">Лаб:</span>
													<span className="truncate text-[var(--ink,#0f172a)] font-medium">
														{order.labName}
													</span>
												</div>
											</div>

											{/* Даты: Отправка, Дедлайн, Дата визита */}
											<div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
												<span className="text-[var(--muted,#64748b)]">
													Дедлайн: <strong className="text-[var(--ink,#0f172a)]">{formatRuDate(order.deadlineDate)}</strong>
												</span>
												{order.scheduledVisitDate && (
													<span className="text-amber-700 dark:text-amber-300 font-bold">
														Визит: {formatRuDate(order.scheduledVisitDate)}
													</span>
												)}
											</div>

											{/* АЛЕРТ ДЕДЛАЙНА В КАРТОЧКЕ */}
											{alert.hasAlert && (
												<div
													className={`p-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 ${
														alert.severity === "CRITICAL_TODAY"
															? "bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-200"
															: "bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200"
													}`}
												>
													<AlertTriangle className="w-3.5 h-3.5 shrink-0" />
													<span className="truncate">{alert.badgeTextRu}</span>
												</div>
											)}
										</div>

										{/* ─── ПОДВАЛ КАРТОЧКИ: ФИНАНСЫ + СТРОГО <= 2 КНОПКИ ДЕЙСТВИЯ (ЗАКОН МИЛЛЕРА) ─── */}
										<div className="pt-2.5 mt-2 border-t border-[var(--line,#cbd5e1)] flex items-center justify-between gap-1.5">
											<div>
												<span className="text-[10px] text-[var(--muted,#64748b)] block">
													Себест. ЗТЛ:
												</span>
												<span className="text-xs font-black font-mono text-[var(--ink,#0f172a)]">
													{money(order.ztlCostKopecks / 100)}
												</span>
											</div>

											<div className="flex items-center gap-1">
												{/* ПРЯМОЕ ДЕЙСТВИЕ 1: Следующий статус */}
												{nextStatus && (
													<button
														type="button"
														onClick={() => handleAdvanceStatus(order.id)}
														className="h-7 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
														title={`Перевести наряд в статус: «${DENTAL_LAB_STATUSES[nextStatus].labelRu}»`}
														data-testid={`lab-order-advance-btn-${order.id}`}
													>
														<ChevronRight className="w-3 h-3" />
														<span>{DENTAL_LAB_STATUSES[nextStatus].shortLabelRu}</span>
													</button>
												)}

												{/* ПРЯМОЕ ДЕЙСТВИЕ 2: Редактировать / Детали */}
												<button
													type="button"
													onClick={() => handleOpenEditOrder(order)}
													className="h-7 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] font-medium text-[11px] transition-colors cursor-pointer"
													title="Изменить параметры наряда"
													data-testid={`lab-order-edit-btn-${order.id}`}
												>
													Детали
												</button>

												{/* МЕНЮ «...» ДЛЯ ВТОРИЧНЫХ ДЕЙСТВИЙ */}
												<div className="relative">
													<button
														type="button"
														onClick={() =>
															setOpenActionMenuId((prev) => (prev === order.id ? null : order.id))
														}
														className="w-7 h-7 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] flex items-center justify-center transition-colors cursor-pointer"
														aria-label="Дополнительные действия"
													>
														<MoreHorizontal className="w-3.5 h-3.5" />
													</button>

													{openActionMenuId === order.id && (
														<div className="absolute right-0 bottom-full mb-1 z-50 w-48 p-1 bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-xl shadow-xl flex flex-col gap-0.5 text-xs">
															<button
																type="button"
																onClick={() => {
																	setOpenActionMenuId(null);
																	handleWarrantyRework(order.id);
																}}
																className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-rose-500/10 font-bold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1.5 cursor-pointer"
															>
																<RotateCcw className="w-3.5 h-3.5" />
																<span>Рекламация (0 ₽)</span>
															</button>
															<button
																type="button"
																onClick={() => {
																	setOpenActionMenuId(null);
																	showToast(`Печать бланка наряда ${order.orderNumber} отправлена`, "success");
																}}
																className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] inline-flex items-center gap-1.5 cursor-pointer"
															>
																<Printer className="w-3.5 h-3.5 text-teal-600" />
																<span>Печать бланка ЗТЛ-1</span>
															</button>
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
				</div>

				{/* ─── 5. ДРАВЕР СОЗДАНИЯ / РЕДАКТИРОВАНИЯ НАРЯДА ЗТЛ ────────────────── */}
				{isCreateDrawerOpen && (
					<div
						className="absolute inset-0 z-50 bg-slate-950/40 backdrop-blur-2xs flex justify-end"
						onClick={(e) => {
							if (e.target === e.currentTarget) setIsCreateDrawerOpen(false);
						}}
					>
						<div
							className="w-full max-w-lg bg-[var(--paper,#ffffff)] border-l border-[var(--line,#cbd5e1)] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-150 overflow-hidden"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Шапка дравера */}
							<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
								<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] m-0">
									{editingOrder ? `Редактирование наряда ${editingOrder.orderNumber}` : "Новый наряд в ЗТЛ"}
								</h3>
								<button
									type="button"
									onClick={() => setIsCreateDrawerOpen(false)}
									className="w-7 h-7 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center cursor-pointer"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							{/* Форма наряда */}
							<form onSubmit={handleSaveOrderForm} className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
								{/* Пациент и Врач */}
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="font-semibold block mb-1">Пациент (ФИО):</label>
										<input
											type="text"
											required
											value={formPatientName}
											onChange={(e) => setFormPatientName(e.target.value)}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
											data-testid="form-patient-name-input"
										/>
									</div>
									<div>
										<label className="font-semibold block mb-1">Врач-ортопед:</label>
										<input
											type="text"
											required
											value={formDoctorName}
											onChange={(e) => setFormDoctorName(e.target.value)}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
										/>
									</div>
								</div>

								{/* Лаборатория и Зубной техник */}
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="font-semibold block mb-1">Зуботехническая лаб.:</label>
										<input
											type="text"
											required
											value={formLabName}
											onChange={(e) => setFormLabName(e.target.value)}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
										/>
									</div>
									<div>
										<label className="font-semibold block mb-1">Зубной техник (ФИО):</label>
										<input
											type="text"
											placeholder="Опционально"
											value={formTechnicianName}
											onChange={(e) => setFormTechnicianName(e.target.value)}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
										/>
									</div>
								</div>

								{/* Зубная формула FDI и Вид конструкции */}
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="font-semibold block mb-1">Зубы по формуле FDI (11–48):</label>
										<input
											type="text"
											required
											placeholder="16 или 11, 21"
											value={formTeethInput}
											onChange={(e) => setFormTeethInput(e.target.value)}
											className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold text-teal-700 dark:text-teal-300 focus:ring-1 focus:ring-teal-500 focus:outline-none"
											data-testid="form-teeth-fdi-input"
										/>
									</div>
									<div>
										<label className="font-semibold block mb-1">Вид конструкции (6 видов):</label>
										<select
											value={formConstruction}
											onChange={(e) => {
												const val = e.target.value as DentalLabConstructionType;
												setFormConstruction(val);
												const d = DENTAL_LAB_CONSTRUCTIONS[val];
												setFormPatientPriceRub(d.defaultPatientPriceKopecks / 100);
												setFormZtlCostRub(d.defaultZtlCostKopecks / 100);
											}}
											className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
											data-testid="form-construction-select"
										>
											{Object.values(DENTAL_LAB_CONSTRUCTIONS).map((c) => (
												<option key={c.id} value={c.id}>
													{c.nameRu}
												</option>
											))}
										</select>
									</div>
								</div>

								{/* Расцветка VITA, Прозрачность, Культя */}
								<div className="p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] space-y-2">
									<div className="font-bold text-xs text-[var(--ink,#0f172a)] flex items-center justify-between">
										<span>Расцветка VITA и оптические параметры</span>
										<span className="font-mono text-teal-700 dark:text-teal-300">{formVitaShade}</span>
									</div>
									<div className="grid grid-cols-3 gap-2">
										<div>
											<label className="text-[11px] block mb-0.5">Цвет VITA:</label>
											<select
												value={formVitaShade}
												onChange={(e) => setFormVitaShade(e.target.value)}
												className="w-full h-7 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
											>
												<optgroup label="VITA Classical (A1–D4)">
													{VITA_CLASSICAL_SHADES.map((s) => (
														<option key={s} value={s}>{s}</option>
													))}
												</optgroup>
												<optgroup label="Bleach">
													{VITA_BLEACH_SHADES.map((s) => (
														<option key={s} value={s}>{s}</option>
													))}
												</optgroup>
											</select>
										</div>
										<div>
											<label className="text-[11px] block mb-0.5">Прозрачность:</label>
											<select
												value={formTranslucency}
												onChange={(e) => setFormTranslucency(e.target.value)}
												className="w-full h-7 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
											>
												{ENAMEL_TRANSLUCENCY_OPTIONS.map((t) => (
													<option key={t.id} value={t.id}>{t.id}</option>
												))}
											</select>
										</div>
										<div>
											<label className="text-[11px] block mb-0.5">Культя (ND):</label>
											<select
												value={formStumpShade}
												onChange={(e) => setFormStumpShade(e.target.value)}
												className="w-full h-7 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
											>
												{STUMP_NATURAL_DIE_SHADES.map((nd) => (
													<option key={nd.id} value={nd.id}>{nd.id}</option>
												))}
											</select>
										</div>
									</div>
								</div>

								{/* Даты: Отправка, Дедлайн, Дата визита */}
								<div className="grid grid-cols-3 gap-2">
									<div>
										<label className="font-semibold block mb-1">Дата отправки:</label>
										<input
											type="date"
											required
											value={formSentDate}
											onChange={(e) => setFormSentDate(e.target.value)}
											className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
										/>
									</div>
									<div>
										<label className="font-semibold block mb-1">ДЕДЛАЙН сдачи:</label>
										<input
											type="date"
											required
											value={formDeadlineDate}
											onChange={(e) => setFormDeadlineDate(e.target.value)}
											className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-teal-700 dark:text-teal-300"
											data-testid="form-deadline-input"
										/>
									</div>
									<div>
										<label className="font-semibold block mb-1">Визит на примерку:</label>
										<input
											type="date"
											value={formScheduledVisit}
											onChange={(e) => setFormScheduledVisit(e.target.value)}
											className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-amber-700 dark:text-amber-300"
											data-testid="form-scheduled-visit-input"
										/>
									</div>
								</div>

								{/* ФИНАНСОВЫЙ БЛОК: СЕБЕСТОИМОСТЬ ЗТЛ И ВЫЧЕТ ИЗ ВАЛА ВРАЧА */}
								<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 space-y-2">
									<div className="font-bold text-xs text-[var(--ink,#0f172a)] flex items-center justify-between">
										<span>Финансовый расчет сдельной ЗП врача</span>
										<span className="text-[11px] text-[var(--muted,#64748b)]">Вычет ЗТЛ из вала</span>
									</div>
									<div className="grid grid-cols-3 gap-2">
										<div>
											<label className="text-[11px] block mb-0.5">Пациент (₽/ед):</label>
											<input
												type="number"
												min={0}
												step={100}
												value={formPatientPriceRub}
												onChange={(e) => setFormPatientPriceRub(Number(e.target.value))}
												className="w-full h-7 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
											/>
										</div>
										<div>
											<label className="text-[11px] block mb-0.5 text-rose-700 dark:text-rose-300 font-bold">
												Себест. ЗТЛ (₽/ед):
											</label>
											<input
												type="number"
												min={0}
												step={100}
												value={formZtlCostRub}
												onChange={(e) => setFormZtlCostRub(Number(e.target.value))}
												className="w-full h-7 px-2 rounded-lg border border-rose-300 bg-[var(--paper,#ffffff)] text-xs font-mono font-bold text-rose-700 dark:text-rose-300"
												data-testid="form-ztl-cost-input"
											/>
										</div>
										<div>
											<label className="text-[11px] block mb-0.5">Врач (%):</label>
											<input
												type="number"
												min={0}
												max={100}
												value={formDoctorPercent}
												onChange={(e) => setFormDoctorPercent(Number(e.target.value))}
												className="w-full h-7 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono"
											/>
										</div>
									</div>

									{/* Предпросмотр расчета ЗП */}
									{(() => {
										const count = Math.max(1, parseFdiTeethString(formTeethInput).length);
										const fin = calculateZtlWageFinancials({
											unitsCount: count,
											patientPriceRub: formPatientPriceRub,
											ztlCostRub: formZtlCostRub,
											doctorSharePercent: formDoctorPercent,
										});

										return (
											<div className="pt-1.5 border-t border-teal-500/20 flex items-center justify-between text-[11px] font-mono">
												<span>
													База врача: <strong>{money(fin.doctorWageBaseRub)}</strong>
												</span>
												<span className="text-emerald-700 dark:text-emerald-300 font-bold">
													ЗП врача: {money(fin.doctorWageRub)}
												</span>
												<span className="text-[var(--muted,#64748b)]">
													Клиника: {money(fin.clinicMarginRub)}
												</span>
											</div>
										);
									})()}
								</div>

								{/* Клинические примечания */}
								<div>
									<label className="font-semibold block mb-1">Клинические примечания технику:</label>
									<textarea
										rows={2}
										placeholder="Особенности препарирования, тип уступа, контакты..."
										value={formClinicalNotes}
										onChange={(e) => setFormClinicalNotes(e.target.value)}
										className="w-full p-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
									/>
								</div>

								{/* Кнопки дравера */}
								<div className="pt-2 flex items-center justify-end gap-2">
									<button
										type="button"
										onClick={() => setIsCreateDrawerOpen(false)}
										className="h-8 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#e2e8f0)] font-medium text-xs transition-colors cursor-pointer"
									>
										Отмена
									</button>
									<button
										type="submit"
										className="h-8 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
										data-testid="form-save-order-btn"
									>
										<Check className="w-3.5 h-3.5" />
										<span>{editingOrder ? "Сохранить изменения" : "Оформить наряд ЗТЛ"}</span>
									</button>
								</div>
							</form>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
