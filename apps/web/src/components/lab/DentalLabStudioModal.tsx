/**
 * apps/web/src/components/lab/DentalLabStudioModal.tsx
 *
 * DENTE Dental CRM — Каноническая студия зуботехнической лаборатории и заказ-нарядов (SSOT).
 * Единый Sweet Spot мастер-компонент: 3 сквозные вкладки (1. Новый заказ-наряд, 2. Реестр нарядов, 3. Печатный бланк),
 * экспресс-наряд за 10 сек, зубы FDI 11-48, палитра VITA A1-D4 + Bleach BL1-BL4, 5 этапов изготовления,
 * себестоимость в копейках, быстрые действия ортопеда, ровно 1 Primary CTA #0d9488 и Apple HIG (Мандаты 8b: 400–480 строк, 8e, 8am, 8ze).
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import "./styles/dentalLabStudio.css";
import {
	CANONICAL_LAB_STAGES, CANONICAL_LAB_MATERIALS, VITA_SHADES_SSOT, CLINIC_LABORATORIES,
	UPPER_JAW_TEETH, LOWER_JAW_TEETH, SEED_LAB_ORDERS, type DentalLabOrderEntry, type DentalLabStage,
	addWorkingDaysRu, formatKopecksToRubles, calcNetRevenueKopecks, getStageMeta, getMaterialMeta, isOrderOverdue,
} from "./dentalLabCatalogData";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export type LabFilterTab = "all" | "in_work" | "in_clinic" | "overdue";
export type LabStudioMainTab = "new_order" | "registry" | "print_blank";

export interface DentalLabStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialToothFdi?: string | number | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly initialTab?: LabStudioMainTab | undefined;
	readonly onOrderCreated?: ((order: DentalLabOrderEntry) => void) | undefined;
}

export type LabStudioModalProps = DentalLabStudioModalProps;

export const DentalLabStudioModal: React.FC<DentalLabStudioModalProps> = ({
	isOpen, onClose, initialToothFdi = "16", patientName, doctorName, patientId, initialTab = "new_order", onOrderCreated,
}) => {
	const storeActivePatientId = useAppStore((s) => s.activePatientId);
	const storeSelectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const dashboard = useAppStore((s) => s.dashboard);
	const effectivePatientId = patientId || storeActivePatientId || storeSelectedPatientId || undefined;
	const activePatient = useMemo(() => {
		if (!effectivePatientId || !dashboard?.patients) return null;
		return dashboard.patients.find((p: any) => p.id === effectivePatientId) || null;
	}, [effectivePatientId, dashboard]);
	const effectivePatientName = patientName || activePatient?.fullName || (activePatient as any)?.name || "Ковалев Дмитрий Сергеевич";
	const effectiveDoctorName = doctorName || "Д-р Смирнова Е. В. (Ортопед)";

	const [orders, setOrders] = useState<DentalLabOrderEntry[]>(() => [...SEED_LAB_ORDERS]);
	const [activeMainTab, setActiveMainTab] = useState<LabStudioMainTab>(initialTab);
	const [activeFilter, setActiveFilter] = useState<LabFilterTab>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<DentalLabOrderEntry | null>(null);
	const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

	const initialToothNum = Number(initialToothFdi) || 16;
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([initialToothNum]);
	const [selectedMaterialId, setSelectedMaterialId] = useState<string>("zirconia_multilayer");
	const [selectedShade, setSelectedShade] = useState<string>("A2");
	const [selectedLab, setSelectedLab] = useState<string>(CLINIC_LABORATORIES[0] ?? "Арт-Дент Лаб");
	const [isUrgent, setIsUrgent] = useState(false);
	const [notes, setNotes] = useState("");

	useEffect(() => {
		if (typeof window === "undefined") return;
		const savedShade = typeof localStorage !== "undefined" ? localStorage.getItem("dente_active_lab_shade_preset") : null;
		if (savedShade) setSelectedShade(savedShade);
		const handleShadeEvent = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			const shade = detail?.shade || detail?.shadeCode || detail?.color;
			if (shade) setSelectedShade(String(shade));
		};
		window.addEventListener("dente-apply-lab-shade", handleShadeEvent);
		return () => window.removeEventListener("dente-apply-lab-shade", handleShadeEvent);
	}, []);

	const selectedMaterial = useMemo(() => getMaterialMeta(selectedMaterialId), [selectedMaterialId]);
	const calculatedDueDate = useMemo(() => addWorkingDaysRu(new Date(), selectedMaterial.defaultDurationDays).toISOString().split("T")[0] ?? "", [selectedMaterial]);

	const [customDueDate, setCustomDueDate] = useState<string>("");
	const effectiveDueDate = customDueDate || calculatedDueDate;
	const teethCount = selectedTeeth.length > 0 ? selectedTeeth.length : 1;
	const totalLabCostKopecks = selectedMaterial.baseLabCostKopecks * teethCount;
	const totalPatientPriceKopecks = selectedMaterial.defaultPatientPriceKopecks * teethCount;
	const netClinicRevenueKopecks = calcNetRevenueKopecks(totalPatientPriceKopecks, totalLabCostKopecks);

	useEffect(() => {
		if (!isOpen) return;
		let isCancelled = false;
		async function loadLiveOrders() {
			try {
				const res = await fetch("/api/clinical/lab-orders", { headers: denteAdminSecretRequestHeaders() });
				if (!res.ok) return;
				const data = await res.json();
				const list = Array.isArray(data) ? data : data?.orders;
				if (Array.isArray(list) && list.length > 0 && !isCancelled) {
					setOrders(list.map((item: any, idx: number) => ({
						id: String(item.id || `live-ord-${idx}`), orderNumber: String(item.orderNumber || item.gostOrderNumber || `ЗТЛ-${100 + idx}`),
						patientName: String(item.patientName || effectivePatientName), doctorName: String(item.doctorName || effectiveDoctorName),
						teeth: Array.isArray(item.teethFdi) ? item.teethFdi : [Number(item.toothFdi) || 16], materialId: String(item.materialId || item.workTypeId || "zirconia_multilayer"),
						shadeCode: String(item.shadeVita || item.shadeCode || item.colorVita || "A2"), stage: (item.stage || item.status || "scan_sent") as DentalLabStage,
						labCostKopecks: Number(item.labCostKopecks || 750000), patientPriceKopecks: Number(item.patientPriceKopecks || 2400000),
						laboratoryName: String(item.laboratoryName || item.labName || "Арт-Дент Лаб"), createdAt: String(item.createdAt || new Date().toISOString()),
						dueDate: String(item.dueDate || calculatedDueDate), notes: item.notes || item.comment || undefined, isUrgent: Boolean(item.isUrgent || item.urgent),
					})));
				}
			} catch {}
		}
		void loadLiveOrders();
		return () => { isCancelled = true; };
	}, [isOpen, effectivePatientName, effectiveDoctorName, calculatedDueDate]);

	const toggleTooth = useCallback((tooth: number) => {
		setSelectedTeeth((prev) => prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b));
	}, []);

	const handleCloseModal = useCallback(() => {
		onClose();
		useUiSurfaceStore.getState().closePrimaryModal("lab_order");
		useUiSurfaceStore.getState().closePrimaryModal("dental_lab");
		useUiSurfaceStore.getState().closePrimaryModal("lab");
	}, [onClose]);

	// Создание наряда — кнопка НИКОГДА не заблокирована (Мандат 8e: Автономия врача)
	const handleCreateOrder = useCallback(async () => {
		const teethToSave = selectedTeeth.length > 0 ? selectedTeeth : [16];
		const nextOrderNumber = `ЗТЛ-${100 + orders.length + 1}`;
		const newEntry: DentalLabOrderEntry = {
			id: `lab-ord-${Date.now()}`, orderNumber: nextOrderNumber, patientName: effectivePatientName, doctorName: effectiveDoctorName,
			teeth: teethToSave, materialId: selectedMaterialId, shadeCode: selectedShade, stage: "scan_sent",
			labCostKopecks: totalLabCostKopecks, patientPriceKopecks: totalPatientPriceKopecks,
			laboratoryName: selectedLab, createdAt: new Date().toISOString(), dueDate: effectiveDueDate,
			notes: notes.trim() || undefined, isUrgent,
		};
		setOrders((prev) => [newEntry, ...prev]);
		setSelectedOrderForPrint(newEntry);
		onOrderCreated?.(newEntry);
		setFeedbackToast(`Заказ-наряд ${newEntry.orderNumber} успешно создан и отправлен в лабораторию`);
		setTimeout(() => setFeedbackToast(null), 3500);

		try {
			const payload = {
				orderNumber: newEntry.orderNumber, patientId: effectivePatientId || "pat_direct", patientName: effectivePatientName,
				doctorId: "doc_current", doctorName: effectiveDoctorName, teethFdi: teethToSave, selectedTeeth: teethToSave, toothFdi: teethToSave[0] ?? 16,
				materialId: selectedMaterialId, material: selectedMaterial.titleRu, workTypeId: selectedMaterialId, shadeVita: selectedShade, shadeCode: selectedShade,
				colorVita: selectedShade, laboratoryName: selectedLab, labName: selectedLab, dueDate: effectiveDueDate, labCostKopecks: totalLabCostKopecks,
				patientPriceKopecks: totalPatientPriceKopecks, isUrgent, notes: notes.trim() || undefined, status: "sent",
			};
			const res = await fetch("/api/clinical/lab-orders", {
				method: "POST", headers: { ...denteAdminSecretRequestHeaders(), "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (res.ok && typeof window !== "undefined") window.dispatchEvent(new CustomEvent("dente-lab-order-created", { detail: payload }));
		} catch {}
	}, [selectedTeeth, orders.length, effectivePatientName, effectiveDoctorName, effectivePatientId, selectedMaterialId, selectedMaterial,
		selectedShade, totalLabCostKopecks, totalPatientPriceKopecks, selectedLab, effectiveDueDate, notes, isUrgent, onOrderCreated]);

	const handleAdvanceStage = useCallback((orderId: string) => {
		setOrders((prev) => prev.map((ord) => {
			if (ord.id !== orderId) return ord;
			const curIdx = CANONICAL_LAB_STAGES.findIndex((s) => s.id === ord.stage);
			const nextIdx = Math.min(CANONICAL_LAB_STAGES.length - 1, (curIdx >= 0 ? curIdx : 0) + 1);
			return { ...ord, stage: CANONICAL_LAB_STAGES[nextIdx]?.id ?? "seated" };
		}));
	}, []);

	const handleMarkInClinic = useCallback((orderId: string) => {
		setOrders((prev) => prev.map((ord) => (ord.id === orderId ? { ...ord, stage: "in_clinic" } : ord)));
		setFeedbackToast("Заказ отмечен: готов в клинике"); setTimeout(() => setFeedbackToast(null), 2500);
	}, []);

	const handleCallPatient = useCallback((order: DentalLabOrderEntry) => {
		setFeedbackToast(`Вызов пациента на примерку: ${order.patientName}`); setTimeout(() => setFeedbackToast(null), 2500);
	}, []);

	const handlePrintOrder = useCallback((order: DentalLabOrderEntry) => {
		setSelectedOrderForPrint(order); setActiveMainTab("print_blank");
		setFeedbackToast(`Печать заказ-наряда: ${order.orderNumber}`); setTimeout(() => setFeedbackToast(null), 2500);
	}, []);

	const handlePrintA5Blank = useCallback(() => {
		setActiveMainTab("print_blank"); setFeedbackToast("Формирование бланка наряда А5 для лаборатории");
		if (typeof window !== "undefined") window.print?.(); setTimeout(() => setFeedbackToast(null), 2500);
	}, []);

	const handleCourierBlank = useCallback(() => {
		setActiveMainTab("print_blank"); setFeedbackToast("Накладная курьеру для передачи в лабораторию");
		if (typeof window !== "undefined") window.print?.(); setTimeout(() => setFeedbackToast(null), 2500);
	}, []);

	const filteredOrders = useMemo(() => {
		return orders.filter((ord) => {
			const query = searchQuery.trim().toLowerCase();
			const matchesSearch = !query || ord.patientName.toLowerCase().includes(query) ||
				ord.orderNumber.toLowerCase().includes(query) || ord.laboratoryName.toLowerCase().includes(query);
			if (!matchesSearch) return false;
			if (activeFilter === "in_work") return ord.stage === "scan_sent" || ord.stage === "in_production" || ord.stage === "fitting_ready";
			if (activeFilter === "in_clinic") return ord.stage === "in_clinic";
			if (activeFilter === "overdue") return isOrderOverdue(ord);
			return true;
		});
	}, [orders, activeFilter, searchQuery]);

	const currentPrintOrder = selectedOrderForPrint || orders[0] || SEED_LAB_ORDERS[0];
	const printMaterial = getMaterialMeta(currentPrintOrder.materialId);

	if (!isOpen) return null;

	return (
		<div data-testid="dental-lab-studio-modal-root" className="dental-lab-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
			<div className="dental-lab-modal-container">
				{/* Apple HIG Drag Handle 36x5px для мобильных */}
				<div className="sm:hidden flex justify-center pt-2">
					<div className="w-9 h-1 rounded-full bg-[var(--line-strong,#94a3b8)]" />
				</div>
				<header className="dental-lab-header">
					<div className="flex items-center justify-between w-full">
						<div className="min-w-0 flex-1">
							<h2 className="dental-lab-header-title">
								<span className="hidden sm:inline">Зуботехническая лаборатория и заказ-наряды</span>
								<span className="sm:hidden font-bold text-sm">ЗТЛ и заказ-наряды</span>
								<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal)]/30 shrink-0">SSOT Ортопедия</span>
							</h2>
							<div className="dental-lab-header-meta">
								<span className="break-words">Пациент: <strong className="text-[var(--ink)]">{effectivePatientName}</strong></span>
								<span className="break-words hidden sm:inline">Врач: <strong className="text-[var(--ink)]">{effectiveDoctorName}</strong></span>
							</div>
						</div>
						<button type="button" data-testid="lab-modal-close-button" onClick={handleCloseModal}
							className="w-8 h-8 rounded-full border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center font-bold text-sm cursor-pointer shrink-0 ml-2" title="Закрыть (Esc)">&#215;</button>
					</div>
					<nav className="w-full sm:w-auto flex items-center gap-1 bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)] shrink-0" aria-label="Вкладки студии">
						<button type="button" data-testid="tab-new-order" onClick={() => setActiveMainTab("new_order")}
							className={`flex-1 sm:flex-initial px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all text-center ${activeMainTab === "new_order" ? "bg-[var(--teal)] text-white shadow-xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}><span className="hidden sm:inline">1. Новый заказ-наряд</span><span className="sm:hidden">1. Наряд</span></button>
						<button type="button" data-testid="tab-registry" onClick={() => setActiveMainTab("registry")}
							className={`flex-1 sm:flex-initial px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all text-center ${activeMainTab === "registry" ? "bg-[var(--teal)] text-white shadow-xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}><span className="hidden sm:inline">2. Реестр нарядов</span><span className="sm:hidden">2. Реестр</span></button>
						<button type="button" data-testid="tab-print-blank" onClick={() => setActiveMainTab("print_blank")}
							className={`flex-1 sm:flex-initial px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all text-center ${activeMainTab === "print_blank" ? "bg-[var(--teal)] text-white shadow-xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}><span className="hidden sm:inline">3. Печатный бланк</span><span className="sm:hidden">3. Бланк</span></button>
					</nav>
				</header>
				{feedbackToast && (
					<div className="bg-[var(--teal)] text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm">
						<span>✓ {feedbackToast}</span>
						<button type="button" onClick={() => setFeedbackToast(null)} className="text-white font-bold opacity-80 hover:opacity-100">&#215;</button>
					</div>
				)}
				{activeMainTab === "print_blank" ? (
					/* ВКЛАДКА 3: Печатный клинический бланк заказ-наряда в 1 клик */
					<div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] space-y-4" data-testid="lab-order-printable-blank">
						<div className="flex items-center justify-between border-b border-[var(--line)] pb-3 flex-wrap gap-2">
							<div>
								<h3 className="text-base font-bold text-[var(--ink)]">Клинический заказ-наряд в лабораторию {currentPrintOrder.orderNumber}</h3>
								<p className="text-xs text-[var(--ink-muted)]">Бланк наряда А4/А5 для передачи в зуботехническую лабораторию и курьеру</p>
							</div>
							<div className="flex items-center gap-2">
								<button type="button" onClick={() => setActiveMainTab("registry")} className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer">К реестру нарядов</button>
								<button type="button" data-testid="print-blank-submit-btn" onClick={() => window.print?.()} className="px-4 py-1.5 rounded-xl bg-[var(--teal,#0d9488)] text-white text-xs font-bold shadow-xs cursor-pointer">Печать бланка</button>
							</div>
						</div>
						<div className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl p-4 sm:p-6 space-y-4 text-xs">
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-[var(--line)] pb-3">
								<div><span className="text-[var(--ink-muted)] block text-[11px]">Пациент:</span><strong className="text-[var(--ink)] text-sm">{currentPrintOrder.patientName}</strong></div>
								<div><span className="text-[var(--ink-muted)] block text-[11px]">Врач-ортопед:</span><strong className="text-[var(--ink)] text-sm">{currentPrintOrder.doctorName}</strong></div>
								<div><span className="text-[var(--ink-muted)] block text-[11px]">Лаборатория:</span><strong className="text-[var(--teal)] text-sm">{currentPrintOrder.laboratoryName}</strong></div>
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-[var(--line)] pb-3">
								<div><span className="text-[var(--ink-muted)] block text-[11px]">Зубы (FDI):</span><strong className="text-[var(--ink)]">{currentPrintOrder.teeth.join(", ")}</strong></div>
								<div><span className="text-[var(--ink-muted)] block text-[11px]">Конструкция:</span><strong className="text-[var(--ink)]">{printMaterial.titleRu}</strong></div>
								<div><span className="text-[var(--ink-muted)] block text-[11px]">Цвет VITA:</span><strong className="text-[var(--ink)]">{currentPrintOrder.shadeCode}</strong></div>
								<div><span className="text-[var(--ink-muted)] block text-[11px]">Срок сдачи:</span><strong className="text-[var(--ink)]">{currentPrintOrder.dueDate.split("T")[0]}</strong></div>
							</div>
							<div className="space-y-1">
								<span className="text-[var(--ink-muted)] block text-[11px]">Клинические указания технику:</span>
								<div className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--line)] text-[var(--ink)] font-mono text-xs">{currentPrintOrder.notes || "Анатомическая окклюзия, плотный апроксимальный контакт, уступ поддесневой 0.3 мм."}</div>
							</div>
							<div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--line)] text-xs text-[var(--ink-muted)]">
								<div>Подпись врача-ортопеда: ___________________</div><div>Подпись зубного техника: ___________________</div>
							</div>
						</div>
					</div>
				) : (
					<div className="dental-lab-body-grid">
						{/* ЛЕВАЯ КОЛОНКА: Экспресс-наряд за 10 секунд (Вкладка 1) */}
						<aside className={`dental-lab-left-column ${activeMainTab === "new_order" ? "mobile-visible" : "mobile-hidden"}`} data-testid="lab-order-create-panel">
							<div className="flex items-center justify-between">
								<h3 className="text-xs font-bold tracking-tight text-[var(--ink-muted)]">Экспресс-наряд у кресла</h3>
								<span className="text-[11px] text-[var(--teal)] font-semibold">10 секунд</span>
							</div>
							{/* Зубы по FDI 11-48 */}
							<div className="space-y-1">
								<div className="flex items-center justify-between text-xs font-semibold">
									<span className="text-[var(--ink)]">Зубы FDI: {selectedTeeth.join(", ")}</span>
									<button type="button" onClick={() => setSelectedTeeth([16])} className="text-[11px] text-[var(--teal)] hover:underline cursor-pointer">Сбросить</button>
								</div>
								<div className="text-[10px] text-[var(--ink-muted)]">Верхняя челюсть</div>
								<div className="dental-lab-teeth-grid">
									{UPPER_JAW_TEETH.map((tooth) => (
										<button key={tooth} type="button" data-testid={`tooth-chip-${tooth}`} onClick={() => toggleTooth(tooth)} className={`dental-lab-tooth-chip ${selectedTeeth.includes(tooth) ? "selected" : ""}`}>{tooth}</button>
									))}
								</div>
								<div className="text-[10px] text-[var(--ink-muted)] pt-1">Нижняя челюсть</div>
								<div className="dental-lab-teeth-grid">
									{LOWER_JAW_TEETH.map((tooth) => (
										<button key={tooth} type="button" data-testid={`tooth-chip-${tooth}`} onClick={() => toggleTooth(tooth)} className={`dental-lab-tooth-chip ${selectedTeeth.includes(tooth) ? "selected" : ""}`}>{tooth}</button>
									))}
								</div>
							</div>
							{/* Конструкция, Оттенок VITA, Лаборатория */}
							<div className="space-y-1">
								<label htmlFor="lab-material-select" className="text-xs font-semibold text-[var(--ink)] block">Вид конструкции</label>
								<div className="flex flex-wrap gap-1 pb-1">
									{[
										{ id: "zirconia_multilayer", label: "Цирконий e.max" }, { id: "clasp_prosthesis", label: "Бюгельный протез" },
										{ id: "pmma_temp", label: "Временная фрезерованная" }, { id: "metal_ceramic_cocr", label: "Металлокерамика" },
									].map((matBtn) => (
										<button key={matBtn.id} type="button" data-testid={`quick-construction-${matBtn.id}`} onClick={() => setSelectedMaterialId(matBtn.id)}
											className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${selectedMaterialId === matBtn.id ? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs" : "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"}`}>{matBtn.label}</button>
									))}
								</div>
								<select id="lab-material-select" data-testid="lab-material-select" value={selectedMaterialId} onChange={(e) => setSelectedMaterialId(e.target.value)}
									className="w-full text-xs font-semibold p-2 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]">
									{CANONICAL_LAB_MATERIALS.map((mat) => (
										<option key={mat.id} value={mat.id}>{mat.titleRu} ({mat.defaultDurationDays} раб. дн.)</option>
									))}
								</select>
							</div>
							<div className="space-y-1">
								<div className="flex items-center justify-between text-xs font-semibold">
									<span className="text-[var(--ink)]">Оттенок VITA: <strong className="text-[var(--teal)]">{selectedShade}</strong></span>
									<span className="text-[10px] text-[var(--ink-muted)]">Classic + Bleach</span>
								</div>
								<div className="dental-lab-shades-scroll">
									{VITA_SHADES_SSOT.map((v) => (
										<button key={v.code} type="button" data-testid={`shade-chip-${v.code}`} onClick={() => setSelectedShade(v.code)}
											className={`dental-lab-shade-chip ${selectedShade === v.code ? "selected" : ""}`} title={v.label}>
											<span className="dental-lab-shade-color-dot" style={{ backgroundColor: v.approxHex }} />
											<span>{v.code}</span>
										</button>
									))}
								</div>
							</div>
							<div className="space-y-1">
								<label htmlFor="lab-partner-select" className="text-xs font-semibold text-[var(--ink)] block">Лаборатория</label>
								<select id="lab-partner-select" data-testid="lab-partner-select" value={selectedLab} onChange={(e) => setSelectedLab(e.target.value)}
									className="w-full text-xs font-semibold p-2 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]">
									{CLINIC_LABORATORIES.map((lab) => (<option key={lab} value={lab}>{lab}</option>))}
								</select>
							</div>
							<div className="grid grid-cols-2 gap-2">
								<div>
									<label htmlFor="lab-due-date-input" className="text-[11px] font-semibold text-[var(--ink-muted)] block">Срок сдачи</label>
									<input id="lab-due-date-input" type="date" value={effectiveDueDate} onChange={(e) => setCustomDueDate(e.target.value)}
										className="w-full text-xs p-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]" />
								</div>
								<div className="flex items-center pt-4">
									<label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer">
										<input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="rounded text-[var(--teal)]" />
										<span>Срочный наряд</span>
									</label>
								</div>
							</div>
							<div className="space-y-1">
								<label htmlFor="lab-notes-input" className="text-[11px] font-semibold text-[var(--ink-muted)] block">Указания технику</label>
								<textarea id="lab-notes-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
									placeholder="Уступ круговой 0.8мм, под десну 0.3мм, плотные контакты..."
									className="w-full text-xs p-2 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] resize-none" />
							</div>
							<div className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl p-2 space-y-0.5 text-xs">
								<div className="flex justify-between text-[var(--ink-muted)]"><span>Себестоимость ЗТЛ ({teethCount} ед.):</span><strong className="text-[var(--ink)]">{formatKopecksToRubles(totalLabCostKopecks)}</strong></div>
								<div className="flex justify-between text-[var(--ink-muted)]"><span>Прайс для пациента:</span><strong className="text-[var(--ink)]">{formatKopecksToRubles(totalPatientPriceKopecks)}</strong></div>
								<div className="flex justify-between border-t border-[var(--line)] pt-0.5 text-[var(--teal)] font-bold"><span>Маржа клиники:</span><span>+{formatKopecksToRubles(netClinicRevenueKopecks)}</span></div>
							</div>
							{/* Ровно ОДНА Primary CTA кнопка #0d9488 (Мандат 8am & 8e: НИКОГДА НЕ DISABLED) */}
							<div className="pt-1 space-y-1.5">
								<button type="button" data-testid="submit-lab-order-button" onClick={handleCreateOrder}
									className="dental-lab-primary-cta" style={{ backgroundColor: "var(--teal, #0d9488)" }}>
									<span>✓ Создать заказ-наряд / ✓ Отправить заказ в лабораторию</span>
								</button>
								<div className="grid grid-cols-2 gap-2">
									<button type="button" data-testid="print-lab-order-a5-btn" onClick={handlePrintA5Blank} className="py-1 px-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer text-center">Печать наряда А5</button>
									<button type="button" data-testid="courier-blank-btn" onClick={handleCourierBlank} className="py-1 px-2 rounded-xl text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer text-center">Бланк курьеру</button>
								</div>
							</div>
						</aside>
						{/* ПРАВАЯ КОЛОНКА: Реестр нарядов с фильтрами (Вкладка 2) */}
						<section className={`dental-lab-right-column ${activeMainTab === "registry" ? "mobile-visible" : "mobile-hidden"}`} data-testid="lab-orders-registry-panel">
							<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
								<div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
									{(["all", "in_work", "in_clinic", "overdue"] as const).map((tab) => {
										const labels: Record<LabFilterTab, string> = { all: "Все заказы", in_work: "В работе ЗТЛ", in_clinic: "Готово в клинике", overdue: "Просроченные" };
										return (
											<button key={tab} type="button" data-testid={`filter-tab-${tab}`} onClick={() => setActiveFilter(tab)}
												className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${activeFilter === tab ? "bg-[var(--teal)] text-white shadow-xs" : "bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--line)]"}`}>{labels[tab]}</button>
										);
									})}
								</div>
								<div className="w-full sm:w-64 shrink-0">
									<input type="search" data-testid="lab-orders-search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск по пациенту, номеру ЗТЛ..." className="w-full text-xs p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]" />
								</div>
							</div>
							<div className="space-y-3 overflow-y-auto max-h-[64vh] pr-1">
								{filteredOrders.length === 0 ? (
									<div className="text-center py-12 text-[var(--ink-muted)] border border-dashed border-[var(--line)] rounded-2xl">
										<p className="text-sm font-semibold">Нарядов в выбранной категории не найдено</p>
										<p className="text-xs pt-1">Оформите новый заказ-наряд у кресла за 10 секунд</p>
									</div>
								) : (
									filteredOrders.map((ord) => {
										const stageMeta = getStageMeta(ord.stage);
										const matMeta = getMaterialMeta(ord.materialId);
										const overdue = isOrderOverdue(ord);
										return (
											<article key={ord.id} data-testid={`lab-order-card-${ord.id}`} className="dental-lab-order-card">
												<div className="flex items-center justify-between gap-1.5 flex-wrap">
													<div className="flex items-center gap-1.5">
														<span className="text-xs font-bold font-mono px-2 py-0.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]">{ord.orderNumber}</span>
														{ord.isUrgent && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--rose-surface,#fee2e2)] text-[var(--rose-ink,#991b1b)] border border-[var(--rose,#ef4444)]/40">СРОЧНО</span>}
														<span className="text-[11px] text-[var(--ink-muted)] break-words">{ord.laboratoryName}</span>
													</div>
													<span data-testid={`order-stage-badge-${ord.id}`} className="text-[11px] font-bold px-2.5 py-0.5 rounded-xl border flex items-center gap-1.5 shrink-0"
														style={{ backgroundColor: stageMeta.bgToken, borderColor: stageMeta.borderToken, color: stageMeta.textToken }}>
														<span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stageMeta.borderToken }} />
														{stageMeta.labelRu}
													</span>
												</div>
												<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
													<div className="min-w-0">
														<strong className="text-[var(--ink)] text-xs sm:text-sm block break-words">{ord.patientName}</strong>
														<div className="text-[11px] text-[var(--ink-muted)] break-words">{matMeta.titleRu} • Оттенок Vita: <strong className="text-[var(--ink)]">{ord.shadeCode}</strong></div>
													</div>
													<div className="text-left sm:text-right shrink-0">
														<span className="font-bold text-[11px] bg-[var(--teal-surface)] text-[var(--teal)] px-2 py-0.5 rounded-lg border border-[var(--teal)]/30">Зубы FDI: {ord.teeth.join(", ")}</span>
													</div>
												</div>
												<div className="grid grid-cols-5 gap-1 pt-0.5">
													{CANONICAL_LAB_STAGES.map((st) => (
														<div key={st.id} title={st.labelRu} className={`h-1.5 rounded-full transition-all ${st.id === ord.stage ? "bg-[var(--teal)] ring-1 ring-[var(--teal)]" : st.stepNumber <= stageMeta.stepNumber ? "bg-[var(--teal)]/70" : "bg-[var(--line)]"}`} />
													))}
												</div>
												<div className="flex items-center justify-between pt-1.5 border-t border-[var(--line)] flex-wrap gap-2 text-xs">
													<div className="flex items-center gap-2.5">
														<span className={overdue ? "font-bold text-[var(--rose-ink,#991b1b)]" : "text-[var(--ink-muted)]"}>Срок: {ord.dueDate ? ord.dueDate.split("T")[0] : ""} {overdue && "(Просрочен)"}</span>
														<span className="text-[var(--ink-muted)] hidden sm:inline text-[11px]">Себестоимость: <strong className="text-[var(--ink)]">{formatKopecksToRubles(ord.labCostKopecks)}</strong></span>
													</div>
													<div className="dental-lab-quick-actions">
														{ord.stage !== "in_clinic" && ord.stage !== "seated" && (
															<button type="button" data-testid={`mark-ready-btn-${ord.id}`} onClick={() => handleMarkInClinic(ord.id)} className="dental-lab-action-btn" title="Отметить прибытие из лаборатории"><span>В клинике</span></button>
														)}
														<button type="button" data-testid={`call-patient-btn-${ord.id}`} onClick={() => handleCallPatient(ord)} className="dental-lab-action-btn" title="Позвонить пациенту на примерку"><span>Примерка</span></button>
														<button type="button" data-testid={`print-order-btn-${ord.id}`} onClick={() => handlePrintOrder(ord)} className="dental-lab-action-btn" title="Распечатать бланк заказ-наряда"><span>Бланк</span></button>
														{ord.stage !== "seated" && (
															<button type="button" data-testid={`advance-stage-btn-${ord.id}`} onClick={() => handleAdvanceStage(ord.id)} className="dental-lab-action-btn font-bold text-[var(--teal)] border-[var(--teal)]/40"><span>Этап →</span></button>
														)}
													</div>
												</div>
											</article>
										);
									})
								)}
							</div>
						</section>
					</div>
				)}
			</div>
		</div>
	);
};

export const LabStudioModal = DentalLabStudioModal;
export default DentalLabStudioModal;
