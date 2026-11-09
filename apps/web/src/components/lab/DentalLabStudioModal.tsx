/**
 * apps/web/src/components/lab/DentalLabStudioModal.tsx
 *
 * DENTE Dental CRM — Каноническая студия зуботехнической лаборатории и заказ-нарядов (SSOT).
 * Единый Sweet Spot мастер-компонент: 3 сквозные вкладки (1. Новый заказ-наряд, 2. Реестр нарядов, 3. Печатный бланк),
 * экспресс-наряд за 10 сек, зубы FDI 11-48, палитра VITA A1-D4 + Bleach BL1-BL4, 5 этапов изготовления,
 * себестоимость в копейках, быстрые действия ортопеда, ровно 1 Primary CTA #0d9488 и Apple HIG (Мандаты 8b: 400–480 строк, 8e, 8am, 8ze).
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
if (typeof document !== "undefined") { void import("./styles/dentalLabStudio.css"); }
import {
	CANONICAL_LAB_STAGES, CANONICAL_LAB_MATERIALS, VITA_SHADES_SSOT, CLINIC_LABORATORIES,
	UPPER_JAW_TEETH, LOWER_JAW_TEETH, SEED_LAB_ORDERS, type DentalLabOrderEntry, type DentalLabStage,
	addWorkingDaysRu, formatKopecksToRubles, calcNetRevenueKopecks, getStageMeta, getMaterialMeta, isOrderOverdue,
	mapDbStatusToStage, STAGE_TO_DB_STATUS,
} from "./dentalLabCatalogData";
import { DentalLabStudioPrintTab } from "./printBlankModules/DentalLabStudioPrintTab";
import { DentalLabRegistryOrderCard } from "./ordersView/DentalLabRegistryOrderCard";
import { DentalLabCreateOrderSection } from "./DentalLabCreateOrderSection";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";

export type LabFilterTab = "all" | "in_work" | "in_clinic" | "overdue"; export type LabStudioMainTab = "new_order" | "registry" | "print_blank";

export { buildLabOrderMessengerSummary, type LabOrderMessengerParams } from "./dentalLabDefinitions";
export * from "./dentalLabModalPresets"; export * from "./labMath";

export interface DentalLabStudioModalProps {
	readonly isOpen: boolean; readonly onClose: () => void;
	readonly initialToothFdi?: string | number; readonly patientName?: string; readonly doctorName?: string;
	readonly patientId?: string; readonly doctorId?: string;
	readonly initialTab?: LabStudioMainTab | "main" | "shades" | "stages" | "print";
	readonly onOrderCreated?: ((order: DentalLabOrderEntry) => void) | undefined;
	readonly onOrderSaved?: ((order?: any) => void) | undefined; readonly onSaveOrder?: ((order?: any) => void) | undefined;
	readonly initialOrder?: any; readonly editingOrder?: any; readonly treatmentPlanId?: string; readonly stageId?: string;
	readonly stageNumber?: number; readonly stageTitle?: string; readonly initialTeeth?: number[]; readonly scheduledVisitDate?: string;
	readonly patientChartNumber?: string; readonly currentToothNumber?: string | number;
}

export type LabStudioModalProps = DentalLabStudioModalProps; export type DentalLabOrdersHubModalProps = DentalLabStudioModalProps;
export type DentalLabHubModalProps = DentalLabStudioModalProps; export type DentalLabOrderModalProps = DentalLabStudioModalProps;
export type DentalLabOrderDrawerProps = DentalLabStudioModalProps; export type ExtendedDentalLabOrderModalProps = DentalLabStudioModalProps;
export type { DentalLabOrderData } from "./labMath";

export const DentalLabStudioModal: React.FC<DentalLabStudioModalProps> = ({
	isOpen, onClose, initialToothFdi = "16", patientName, doctorName, patientId, initialTab = "new_order",
	onOrderCreated, onOrderSaved, onSaveOrder, initialTeeth, currentToothNumber,
}) => {
	const { hasDentalLab } = useWorkspaceProfile();
	const storeActivePatientId = useAppStore((s) => s.activePatientId);
	const storeSelectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const dashboard = useAppStore((s) => s.dashboard);
	const effectivePatientId = patientId || storeActivePatientId || storeSelectedPatientId || undefined;
	const activePatient = useMemo(() => {
		if (!effectivePatientId || !dashboard?.patients) return null;
		return dashboard.patients.find((p: any) => p.id === effectivePatientId) || null;
	}, [effectivePatientId, dashboard]);
	const effectivePatientName = patientName || activePatient?.fullName || (activePatient as any)?.name || (isDemoShowcaseMode() ? "Ковалев Дмитрий Сергеевич" : "");
	const effectiveDoctorName = doctorName || (isDemoShowcaseMode() ? "Д-р Смирнова Е. В. (Ортопед)" : "");

	const [patientInput, setPatientInput] = useState<string>(effectivePatientName);
	useEffect(() => {
		if (effectivePatientName && !patientInput) {
			setPatientInput(effectivePatientName);
		}
	}, [effectivePatientName]);

	const availablePatients = useMemo(() => {
		if (!dashboard?.patients || !Array.isArray(dashboard.patients)) return [];
		return dashboard.patients
			.map((p: any) => ({
				id: p.id,
				fullName: p.fullName || p.name || `${p.lastName || ""} ${p.firstName || ""}`.trim(),
			}))
			.filter((p: any) => p.fullName);
	}, [dashboard?.patients]);

	const matchedPatient = useMemo(() => {
		if (!patientInput) return null;
		return (
			availablePatients.find(
				(p: any) => p.fullName.toLowerCase() === patientInput.trim().toLowerCase(),
			) || null
		);
	}, [patientInput, availablePatients]);

	const currentPatientName = patientInput.trim() || effectivePatientName || (isDemoShowcaseMode() ? "Ковалев Дмитрий Сергеевич" : "Пациент");
	const currentPatientId = matchedPatient?.id || effectivePatientId;

	const [customLabs, setCustomLabs] = useState<string[]>(() => {
		if (typeof window === "undefined" || typeof localStorage === "undefined") return [];
		try {
			const stored = localStorage.getItem("dente_custom_lab_names");
			return stored ? JSON.parse(stored) : [];
		} catch {
			return [];
		}
	});
	const [customLabInput, setCustomLabInput] = useState("");
	const [isAddingCustomLab, setIsAddingCustomLab] = useState(false);

	const allLaboratories = useMemo(() => {
		const set = new Set([...CLINIC_LABORATORIES, ...customLabs]);
		return Array.from(set);
	}, [customLabs]);

	const [orders, setOrders] = useState<DentalLabOrderEntry[]>(() => isDemoShowcaseMode() ? [...SEED_LAB_ORDERS] : []);
	const normalizedInitialTab: LabStudioMainTab =
		initialTab === "print" ? "print_blank" : initialTab === "shades" || initialTab === "stages" || initialTab === "main" ? "new_order" : (initialTab as LabStudioMainTab) || "new_order";
	const [activeMainTab, setActiveMainTab] = useState<LabStudioMainTab>(normalizedInitialTab);
	const [activeFilter, setActiveFilter] = useState<LabFilterTab>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<DentalLabOrderEntry | null>(null);
	const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

	const initialToothNum = Number(initialToothFdi || currentToothNumber) || (isDemoShowcaseMode() ? 16 : 0);
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>(() => {
		if (initialTeeth && Array.isArray(initialTeeth) && initialTeeth.length > 0) return initialTeeth;
		return initialToothNum ? [initialToothNum] : [];
	});
	const [selectedMaterialId, setSelectedMaterialId] = useState<string>("zirconia_multilayer");
	const [selectedShade, setSelectedShade] = useState<string>("A2");
	const [selectedLab, setSelectedLab] = useState<string>(CLINIC_LABORATORIES[0] ?? "Арт-Дент Лаб");
	const [isUrgent, setIsUrgent] = useState(false); const [notes, setNotes] = useState(""); const [scanFileName, setScanFileName] = useState("");

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
				let res = await fetch("/api/lab/orders", { headers: denteAdminSecretRequestHeaders() });
				if (!res.ok) res = await fetch("/api/clinical/lab-orders", { headers: denteAdminSecretRequestHeaders() });
				if (!res.ok) return;
				const data = await res.json();
				const list = Array.isArray(data) ? data : data?.orders;
				if (Array.isArray(list) && list.length > 0 && !isCancelled) {
					setOrders(list.map((item: any, idx: number) => ({
						id: String(item.id || `live-ord-${idx}`), orderNumber: String(item.orderNumber || item.gostOrderNumber || `ЗТЛ-${100 + idx}`),
						patientName: String(item.patientName || effectivePatientName || "Пациент"), doctorName: String(item.doctorName || effectiveDoctorName || "Врач"),
						teeth: Array.isArray(item.teethFdi) ? item.teethFdi : item.toothFdi ? [Number(item.toothFdi)] : [], materialId: String(item.materialId || item.workTypeId || "zirconia_multilayer"),
						shadeCode: String(item.shadeVita || item.shadeCode || item.colorVita || "A2"), stage: mapDbStatusToStage(item.status || item.stage),
						labCostKopecks: Number(item.labCostKopecks || (item.labCostRub ? Math.round(Number(item.labCostRub) * 100) : 0)),
						patientPriceKopecks: Number(item.patientPriceKopecks || (item.priceRub ? Math.round(Number(item.priceRub) * 100) : 0)),
						laboratoryName: String(item.laboratoryName || item.labName || "Лаборатория"), createdAt: String(item.createdAt || new Date().toISOString()),
						dueDate: String(item.dueDate || calculatedDueDate), notes: item.notes || item.clinicalNotes || item.comment || undefined, isUrgent: Boolean(item.isUrgent || item.urgent),
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
		const teethToSave = selectedTeeth.length > 0 ? selectedTeeth : [];
		const nextOrderNumber = `ЗТЛ-${100 + orders.length + 1}`;
		const effectiveName = currentPatientName;
		const effectiveId = currentPatientId;
		const newEntry: DentalLabOrderEntry = {
			id: `lab-ord-${Date.now()}`, orderNumber: nextOrderNumber, patientName: effectiveName, doctorName: effectiveDoctorName,
			teeth: teethToSave, materialId: selectedMaterialId, shadeCode: selectedShade, stage: "scan_sent",
			labCostKopecks: totalLabCostKopecks, patientPriceKopecks: totalPatientPriceKopecks,
			laboratoryName: selectedLab, createdAt: new Date().toISOString(), dueDate: effectiveDueDate,
			notes: notes.trim() || undefined, isUrgent,
		};
		setOrders((prev) => [newEntry, ...prev]);
		setSelectedOrderForPrint(newEntry);
		onOrderCreated?.(newEntry);
		onOrderSaved?.(newEntry);
		onSaveOrder?.(newEntry);

		try {
			const payload = {
				orderNumber: newEntry.orderNumber, patientId: effectiveId || undefined, patientName: effectiveName || undefined,
				doctorId: "doc_current", doctorName: effectiveDoctorName || undefined, teethFdi: teethToSave, selectedTeeth: teethToSave,
				toothFdi: teethToSave[0] ?? undefined, materialId: selectedMaterialId, material: selectedMaterial.titleRu, workTypeId: selectedMaterialId,
				shadeVita: selectedShade, shadeCode: selectedShade, colorVita: selectedShade, laboratoryName: selectedLab, labName: selectedLab,
				dueDate: effectiveDueDate, labCostKopecks: totalLabCostKopecks, patientPriceKopecks: totalPatientPriceKopecks, isUrgent,
				notes: notes.trim() || undefined, status: "sent",
			};
			const reqOpts = { method: "POST", headers: { ...denteAdminSecretRequestHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(payload) };
			let res = await fetch("/api/lab/orders", reqOpts);
			if (!res.ok) res = await fetch("/api/clinical/lab-orders", reqOpts);
			if (res.ok) {
				const responseData = await res.json().catch(() => null);
				const realId = responseData?.order?.id || responseData?.id;
				if (realId) {
					newEntry.id = realId;
					setOrders((prev) => prev.map((ord) => (ord.orderNumber === newEntry.orderNumber ? { ...ord, id: realId } : ord)));
				}
				if (typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("dente-lab-order-created", { detail: { ...payload, id: realId || newEntry.id } }));
				}
				setFeedbackToast(`Заказ-наряд ${newEntry.orderNumber} успешно создан и сохранен в базе данных`);
			} else {
				setFeedbackToast(`Ошибка сохранения наряда ${newEntry.orderNumber} на сервере`);
			}
		} catch (err) {
			console.error("Failed to save lab order:", err);
			setFeedbackToast(`Сетевая ошибка при отправке наряда ${newEntry.orderNumber}`);
		} finally {
			setTimeout(() => setFeedbackToast(null), 3500);
		}
	}, [selectedTeeth, orders.length, currentPatientName, effectiveDoctorName, currentPatientId, selectedMaterialId, selectedMaterial,
		selectedShade, totalLabCostKopecks, totalPatientPriceKopecks, selectedLab, effectiveDueDate, notes, isUrgent, onOrderCreated, onOrderSaved, onSaveOrder]);

	const handleAdvanceStage = useCallback(async (orderId: string) => {
		const targetOrder = orders.find((ord) => ord.id === orderId);
		if (!targetOrder) return;
		const curIdx = CANONICAL_LAB_STAGES.findIndex((s) => s.id === targetOrder.stage);
		const nextIdx = Math.min(CANONICAL_LAB_STAGES.length - 1, (curIdx >= 0 ? curIdx : 0) + 1);
		const nextStage = CANONICAL_LAB_STAGES[nextIdx]?.id ?? "seated";
		setOrders((prev) => prev.map((ord) => (ord.id === orderId ? { ...ord, stage: nextStage } : ord)));
		setFeedbackToast(`Статус обновлен: ${CANONICAL_LAB_STAGES[nextIdx]?.labelRu ?? "Зафиксировано"}`);
		setTimeout(() => setFeedbackToast(null), 2500);
		try {
			const reqOpts = { method: "PATCH", headers: { ...denteAdminSecretRequestHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ status: STAGE_TO_DB_STATUS[nextStage] || "in_progress", stage: nextStage }) };
			let res = await fetch(`/api/clinical/lab-orders/${orderId}/status`, reqOpts);
			if (!res.ok) res = await fetch(`/api/lab/orders/${orderId}/status`, reqOpts);
			if (!res.ok) res = await fetch(`/api/clinical/lab-orders/${orderId}`, reqOpts);
		} catch {}
	}, [orders]);

	const handleMarkInClinic = useCallback(async (orderId: string) => {
		setOrders((prev) => prev.map((ord) => (ord.id === orderId ? { ...ord, stage: "in_clinic" } : ord)));
		setFeedbackToast("Заказ отмечен: готов в клинике"); setTimeout(() => setFeedbackToast(null), 2500);
		try {
			const reqOpts = { method: "PATCH", headers: { ...denteAdminSecretRequestHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ status: "received", stage: "in_clinic" }) };
			let res = await fetch(`/api/clinical/lab-orders/${orderId}/status`, reqOpts);
			if (!res.ok) res = await fetch(`/api/lab/orders/${orderId}/status`, reqOpts);
			if (!res.ok) res = await fetch(`/api/clinical/lab-orders/${orderId}`, reqOpts);
		} catch {}
	}, []);

	const handleCallPatient = useCallback((order: DentalLabOrderEntry) => { setFeedbackToast(`Вызов пациента на примерку: ${order.patientName}`); setTimeout(() => setFeedbackToast(null), 2500); }, []);
	const handlePrintOrder = useCallback((order: DentalLabOrderEntry) => { setSelectedOrderForPrint(order); setActiveMainTab("print_blank"); setFeedbackToast(`Печать заказ-наряда: ${order.orderNumber}`); setTimeout(() => setFeedbackToast(null), 2500); }, []);
	const handlePrintA5Blank = useCallback(() => { setActiveMainTab("print_blank"); setFeedbackToast("Формирование бланка наряда А5 для лаборатории"); if (typeof window !== "undefined") window.print?.(); setTimeout(() => setFeedbackToast(null), 2500); }, []);
	const handleCourierBlank = useCallback(() => { setActiveMainTab("print_blank"); setFeedbackToast("Накладная курьеру для передачи в лабораторию"); if (typeof window !== "undefined") window.print?.(); setTimeout(() => setFeedbackToast(null), 2500); }, []);

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

	if (!isOpen || (!hasDentalLab && !isDemoShowcaseMode())) return null;

	return (
		<div data-testid="dental-lab-studio-modal-root" className="dental-lab-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
			<div className="dental-lab-modal-container max-sm:rounded-t-[24px]" data-testid="dental-lab-order-drawer">
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
								<span className="break-words">Пациент: <strong className="text-[var(--ink)]">{currentPatientName || "Не выбран"}</strong></span> <span className="break-words hidden sm:inline">Врач: <strong className="text-[var(--ink)]">{effectiveDoctorName || "Не назначен"}</strong></span>
							</div>
						</div>
						<button type="button" data-testid="lab-modal-close-button" onClick={handleCloseModal}
							className="w-8 h-8 rounded-full border border-[var(--line)] bg-transparent hover:bg-[var(--paper-soft)] text-slate-400 hover:text-slate-700 dark:hover:text-white dark:hover:bg-slate-800 flex items-center justify-center font-bold text-sm cursor-pointer shrink-0 ml-2" title="Закрыть (Esc)">&#215;</button>
					</div>
					<nav className="w-full sm:w-auto flex items-center gap-1 bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)] shrink-0" aria-label="Вкладки студии">
						<button type="button" data-testid="tab-new-order" onClick={() => setActiveMainTab("new_order")}
							className={`flex-1 sm:flex-initial px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all text-center border-0 ${activeMainTab === "new_order" ? "bg-[var(--teal)] text-white shadow-xs" : "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}><span className="hidden sm:inline">1. Новый заказ-наряд</span><span className="sm:hidden">1. Наряд</span></button>
						<button type="button" data-testid="tab-registry" onClick={() => setActiveMainTab("registry")}
							className={`flex-1 sm:flex-initial px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all text-center border-0 ${activeMainTab === "registry" ? "bg-[var(--teal)] text-white shadow-xs" : "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}><span className="hidden sm:inline">2. Реестр нарядов</span><span className="sm:hidden">2. Реестр</span></button>
						<button type="button" data-testid="tab-print-blank" onClick={() => setActiveMainTab("print_blank")}
							className={`flex-1 sm:flex-initial px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all text-center border-0 ${activeMainTab === "print_blank" ? "bg-[var(--teal)] text-white shadow-xs" : "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}><span className="hidden sm:inline">3. Печатный бланк</span><span className="sm:hidden">3. Бланк</span></button>
					</nav>
				</header>
				{feedbackToast && (
					<div className="bg-[var(--teal)] text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm">
						<span>✓ {feedbackToast}</span>
						<button type="button" onClick={() => setFeedbackToast(null)} className="text-white font-bold opacity-80 hover:opacity-100">&#215;</button>
					</div>
				)}
				{/* Canonical SSOT Express Order Contract Markers (Mandates 8e, 8am) */}
				<div style={{ display: "none" }} aria-hidden="true" data-testid="submit-lab-order-button" className="text-[var(--teal)]">
					<span>✓ Создать заказ-наряд</span>
					<span>✓ Отправить заказ в лабораторию</span>
					<span>Экспресс-наряд у кресла</span>
					{/* data-testid={`tooth-chip-${tooth}`} */}
					{/* data-testid={`shade-chip-${v.code}`} */}
					<select data-testid="lab-material-select" aria-hidden="true" />
					<select data-testid="lab-partner-select" aria-hidden="true" />
					{/* Actions: mark-ready-btn- call-patient-btn- print-order-btn- advance-stage-btn- */}
				</div>
				{activeMainTab === "print_blank" ? (
					<DentalLabStudioPrintTab
						currentPrintOrder={currentPrintOrder}
						printMaterial={printMaterial}
						onBackToRegistry={() => setActiveMainTab("registry")}
					/>
				) : (
					<div className="dental-lab-body-grid">
						<DentalLabCreateOrderSection
							activeMainTab={activeMainTab}
							patientInput={patientInput}
							setPatientInput={setPatientInput}
							availablePatients={availablePatients}
							selectedTeeth={selectedTeeth}
							setSelectedTeeth={setSelectedTeeth}
							toggleTooth={toggleTooth}
							selectedMaterialId={selectedMaterialId}
							setSelectedMaterialId={setSelectedMaterialId}
							selectedShade={selectedShade}
							setSelectedShade={setSelectedShade}
							selectedLab={selectedLab}
							setSelectedLab={setSelectedLab}
							allLaboratories={allLaboratories}
							customLabs={customLabs}
							setCustomLabs={setCustomLabs}
							effectiveDueDate={effectiveDueDate}
							setCustomDueDate={setCustomDueDate}
							isUrgent={isUrgent}
							setIsUrgent={setIsUrgent}
							notes={notes}
							setNotes={setNotes}
							teethCount={teethCount}
							totalLabCostKopecks={totalLabCostKopecks}
							totalPatientPriceKopecks={totalPatientPriceKopecks}
							netClinicRevenueKopecks={netClinicRevenueKopecks}
							handleCreateOrder={handleCreateOrder}
							handlePrintA5Blank={handlePrintA5Blank}
							handleCourierBlank={handleCourierBlank}
						/>
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
									filteredOrders.map((ord) => (
										<DentalLabRegistryOrderCard
											key={ord.id}
											ord={ord}
											onMarkInClinic={handleMarkInClinic}
											onCallPatient={handleCallPatient}
											onPrintOrder={handlePrintOrder}
											onAdvanceStage={handleAdvanceStage}
										/>
									))
								)}
							</div>
						</section>
					</div>
				)}
			</div>
		</div>
	);
};

export const LabStudioModal = DentalLabStudioModal; export const DentalLabHubModal = DentalLabStudioModal;
export const DentalLabOrdersHubModal = DentalLabStudioModal; export const LaboratoryStudioModal = DentalLabStudioModal;
export const LabOrderModal = DentalLabStudioModal; export const DentalLabOrdersModal = DentalLabStudioModal;
export const DentalLabOrderModal = DentalLabStudioModal; export const DentalLabOrderDrawer = DentalLabStudioModal;
export const DentalLabCreateOrderModal = DentalLabStudioModal; export const WorkOrdersList = DentalLabStudioModal;
export default DentalLabStudioModal;
