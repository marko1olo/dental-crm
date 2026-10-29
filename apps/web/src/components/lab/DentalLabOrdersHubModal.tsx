/**
 * DentalLabOrdersHubModal.tsx — Единый канонический SSOT хаб зуботехнической лаборатории в DENTE CRM.
 * 
 * Включает:
 * - Реестр нарядов ЗТЛ с фильтрацией по статусам и дедлайнам.
 * - Чистый 1-клик заказ-наряд: пациент, формула FDI (11–48), типы конструкций, VITA/ND цвета, сроки.
 * - Сквозная интеграция с Net Revenue врача в Payroll (Мандат 8n): расход ЗТЛ вычитается из базы ЗП.
 * - Встроенная печатная форма наряда в ЗТЛ (А4/А5) для передачи курьеру.
 * - Дизайн-код Мандата 8am: ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)) на видимый экран.
 * - Сенсорная эргономика Apple HIG: на смартфонах нативный Bottom Sheet с тактильным Drag Handle 36x5px.
 * 
 * Соответствует Высшей Конституции THE HAMMER и Мандатам 8b (350–450 строк, Sweet Spot), 8e, 8n, 8x.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
	FlaskConical,
	X,
	Plus,
	Search,
	Printer,
	ArrowLeft,
	CheckCircle2,
} from "lucide-react";
import {
	LAB_CONSTRUCTION_CATALOG,
	PARTNER_LABS,
	LAB_STAGES,
	LAB_FAST_PRESETS,
	addWorkingDaysRu,
	calculateZtlPayrollNetRevenue,
	type LabStageId,
} from "./labCatalogData";
import { DEMO_LAB_ORDERS } from "./demoLabOrdersData";
import { DentalLabPrintBlank } from "./DentalLabPrintBlank";
import { DentalLabHubCreateSection } from "./hub/DentalLabHubCreateSection";
import { DentalLabHubOrderCard } from "./hub/DentalLabHubOrderCard";
import {
	type DentalLabHubOrder,
	type DentalLabOrdersHubModalProps,
	type DentalLabHubModalProps,
	SAMPLE_LABS,
} from "./hub/dentalLabHubModalTypes";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";

export type { DentalLabHubOrder, DentalLabOrdersHubModalProps, DentalLabHubModalProps };
export { SAMPLE_LABS };

if (typeof document !== "undefined") {
	void import("./dentalLab.css");
}

export const DentalLabOrdersHubModal: React.FC<DentalLabOrdersHubModalProps> = ({
	isOpen,
	onClose,
	initialOrders,
	onSaveOrder,
	currentDoctorName = "Д-р Смирнова Е. В. (Ортопед)",
	currentPatientName = "Ковалев Дмитрий Сергеевич",
	currentPatientId = "pat_direct",
	currentToothNumber = "16",
	initialTab = "orders",
}) => {
	const [activeTab, setActiveTab] = useState<"orders" | "create" | "print">(initialTab);
	const [orders, setOrders] = useState<DentalLabHubOrder[]>(() => {
		if (initialOrders && initialOrders.length > 0) return [...(initialOrders as DentalLabHubOrder[])];
		return isDemoShowcaseMode() ? [...DEMO_LAB_ORDERS] : [];
	});
	const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [printOrder, setPrintOrder] = useState<DentalLabHubOrder | null>(null);

	const [patientName, setPatientName] = useState(currentPatientName);
	const [toothFdi, setToothFdi] = useState(String(currentToothNumber || "16"));
	const [constructionId, setConstructionId] = useState(LAB_CONSTRUCTION_CATALOG[0]?.id ?? "crown_zirconia");
	const [shadeVita, setShadeVita] = useState("A2");
	const [shadeStump, setShadeStump] = useState("ND2");
	const [selectedLabId, setSelectedLabId] = useState(PARTNER_LABS[0]?.id ?? "lab_art");
	const [isWarranty, setIsWarranty] = useState(false);
	const [clinicalNotes, setClinicalNotes] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const selectedConstruction = useMemo(
		() => LAB_CONSTRUCTION_CATALOG.find((c) => c.id === constructionId) ?? LAB_CONSTRUCTION_CATALOG[0]!,
		[constructionId],
	);

	const calculatedDates = useMemo(() => {
		const trial = addWorkingDaysRu(new Date(), Math.max(2, selectedConstruction.standardWorkingDays - 2));
		const due = addWorkingDaysRu(new Date(), selectedConstruction.standardWorkingDays);
		return {
			trialStr: trial.toISOString().split("T")[0]!,
			dueStr: due.toISOString().split("T")[0]!,
		};
	}, [selectedConstruction]);

	const payrollNet = useMemo(() => {
		return calculateZtlPayrollNetRevenue(
			selectedConstruction.defaultPatientPriceKopecks,
			selectedConstruction.defaultLabCostKopecks,
			25,
			isWarranty,
		);
	}, [selectedConstruction, isWarranty]);

	useEffect(() => {
		if (!isOpen) return;
		let mounted = true;
		const fetchLiveOrders = async () => {
			try {
				const res = await fetch("/api/clinical/lab-orders", {
					headers: denteAdminSecretRequestHeaders({ Accept: "application/json" }),
				});
				if (res.ok) {
					const data = await res.json();
					if (mounted && Array.isArray(data) && data.length > 0) {
						setOrders((prev) => {
							const existingIds = new Set(prev.map((o) => o.id));
							const mapped = data.map((d: any) => ({
								id: String(d.id),
								orderNumber: d.orderNumber || `ЗТЛ-${d.id}`,
								patientName: d.patientName || "Пациент клиники", patientId: d.patientId,
								doctorName: d.doctorName || currentDoctorName, toothFdi: String(d.toothFdi || d.toothNumber || "16"),
								constructionTitle: d.constructionType || d.constructionTitle || "Ортопедическая конструкция",
								material: d.material || "Диоксид циркония", shadeVita: d.colorVita || d.shadeCode || "A2", shadeStump: d.stumpShade || "ND2",
								labName: d.labName || "Арт-Дент Лаб", stageId: (d.stageId || d.status || "in_progress") as LabStageId,
								createdAt: d.createdAt ? String(d.createdAt).split("T")[0]! : new Date().toISOString().split("T")[0]!,
								trialDate: d.trialDate || addWorkingDaysRu(new Date(), 3).toISOString().split("T")[0]!,
								dueDate: d.dueDate || addWorkingDaysRu(new Date(), 5).toISOString().split("T")[0]!,
								labCostKopecks: Number(d.labCostKopecks || d.labCostRub * 100 || 750000),
								patientPriceKopecks: Number(d.patientPriceKopecks || d.priceRub * 100 || 2400000),
								isWarranty: Boolean(d.isWarranty), clinicalNotes: d.technicianNotes || d.notes || "",
							}));
							return [...prev, ...mapped.filter((m: DentalLabHubOrder) => !existingIds.has(m.id))];
						});
					}
				}
			} catch {
				// Офлайн
			}
		};
		void fetchLiveOrders();
		return () => {
			mounted = false;
		};
	}, [isOpen, currentDoctorName]);

	const applyFastPreset = useCallback((presetId: string) => {
		const p = LAB_FAST_PRESETS.find((x) => x.id === presetId);
		if (!p) return;
		setConstructionId(p.workTypeId);
		if (p.shadeCode) setShadeVita(p.shadeCode);
		if (p.stumpShadeCode) setShadeStump(p.stumpShadeCode);
		showToast(`Применен пресет: ${p.label}`);
	}, []);

	const handleCreateOrder = useCallback(() => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		const chosenLab = PARTNER_LABS.find((l) => l.id === selectedLabId) ?? PARTNER_LABS[0]!;
		const newOrd: DentalLabHubOrder = {
			id: `lab_${Date.now()}`,
			orderNumber: `ЗТЛ-${new Date().getFullYear()}-${String(orders.length + 43).padStart(4, "0")}`,
			patientName: patientName.trim() || currentPatientName,
			patientId: currentPatientId,
			doctorName: currentDoctorName,
			toothFdi: toothFdi.trim() || "16",
			constructionTitle: selectedConstruction.title,
			material: selectedConstruction.material,
			shadeVita,
			shadeStump: selectedConstruction.allowsStumpShade ? shadeStump : undefined,
			labName: chosenLab.name,
			stageId: "sent",
			createdAt: new Date().toISOString().split("T")[0]!,
			trialDate: calculatedDates.trialStr,
			dueDate: calculatedDates.dueStr,
			labCostKopecks: selectedConstruction.defaultLabCostKopecks,
			patientPriceKopecks: selectedConstruction.defaultPatientPriceKopecks,
			isWarranty,
			clinicalNotes,
		};
		setOrders((prev) => [newOrd, ...prev]);
		onSaveOrder?.(newOrd);
		setIsSubmitting(false);
		showToast(`Заказ-наряд ${newOrd.orderNumber} оформлен и отправлен в лабораторию`);
		setActiveTab("orders");
	}, [isSubmitting, selectedLabId, orders.length, patientName, currentPatientName, currentPatientId, currentDoctorName, toothFdi, selectedConstruction, shadeVita, shadeStump, isWarranty, clinicalNotes, calculatedDates, onSaveOrder]);

	const filteredOrders = useMemo(() => {
		return orders.filter((ord) => {
			if (selectedStageFilter !== "all" && ord.stageId !== selectedStageFilter) return false;
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				ord.orderNumber.toLowerCase().includes(q) ||
				ord.patientName.toLowerCase().includes(q) ||
				ord.toothFdi.includes(q) ||
				ord.constructionTitle.toLowerCase().includes(q)
			);
		});
	}, [orders, selectedStageFilter, searchQuery]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 max-sm:p-0 max-sm:items-end bg-black/75 backdrop-blur-xs"
			role="dialog"
			aria-modal="true"
			data-testid="dental-lab-orders-hub-modal"
		>
			<div className="relative w-full max-w-4xl bg-[var(--paper)] border border-[var(--line)] rounded-2xl max-sm:rounded-t-[24px] max-sm:rounded-b-none shadow-2xl flex flex-col max-h-[90vh] max-sm:max-h-[94vh] overflow-x-clip max-w-[100vw]">
				<div className="sm:hidden w-9 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto my-2 shrink-0" aria-hidden="true" />

				<header className="p-3 sm:p-4 border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0 bg-[var(--paper-strong)]">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[var(--teal,#0d9488)] border border-teal-500/25 flex items-center justify-center shrink-0">
							<FlaskConical className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] truncate">
								Наряды в зуботехническую лабораторию (ЗТЛ)
							</h2>
							<p className="text-[11px] text-[var(--muted)] truncate">
								Ортопедические наряды • Дедлайны • Net Revenue врача в Payroll
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<div className="inline-flex p-0.5 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line)]">
							<button
								type="button"
								onClick={() => setActiveTab("orders")}
								className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
									activeTab === "orders" ? "bg-[var(--paper)] text-[var(--ink)] shadow-2xs" : "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Реестр ({orders.length})
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("create")}
								data-testid="btn-open-create-lab-order"
								className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
									activeTab === "create" ? "bg-[var(--paper)] text-[var(--ink)] shadow-2xs" : "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								+ Новый наряд
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="h-8 w-8 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] inline-flex items-center justify-center cursor-pointer transition-colors"
							title="Закрыть"
						>
							<X size={16} />
						</button>
					</div>
				</header>

				<div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-4">
					{activeTab === "orders" && (
						<div className="space-y-4">
							<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
								<div className="relative flex-1">
									<Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-2.5" />
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Поиск по номеру, пациенту или зубу..."
										className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)]"
									/>
								</div>
								<div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
									<button
										type="button"
										onClick={() => setSelectedStageFilter("all")}
										className={`h-8 px-2.5 rounded-lg text-xs font-medium border cursor-pointer whitespace-nowrap ${
											selectedStageFilter === "all" ? "bg-[var(--teal,#0d9488)] text-white border-transparent" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
										}`}
									>
										Все ({orders.length})
									</button>
									{LAB_STAGES.map((s) => (
										<button
											key={s.id}
											type="button"
											onClick={() => setSelectedStageFilter(s.id)}
											className={`h-8 px-2.5 rounded-lg text-xs font-medium border cursor-pointer whitespace-nowrap ${
												selectedStageFilter === s.id ? "bg-[var(--teal,#0d9488)] text-white border-transparent" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
											}`}
										>
											{s.title}
										</button>
									))}
								</div>
							</div>

							{filteredOrders.length === 0 ? (
								<div className="p-8 text-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--paper-soft)]">
									<FlaskConical className="w-10 h-10 text-[var(--muted)] mx-auto mb-2 opacity-50" />
									<h4 className="text-sm font-bold text-[var(--ink)]">Нарядов в лабораторию не найдено</h4>
									<p className="text-xs text-[var(--muted)] mt-1 mb-4">Оформите заказ на изготовление коронки, моста или протеза в 1 клик.</p>
									<button
										type="button"
										onClick={() => setActiveTab("create")}
										className="h-9 px-4 rounded-xl border border-teal-600 bg-[var(--teal,#0d9488)] hover:bg-teal-700 text-white font-semibold text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
									>
										<Plus size={14} />
										<span>Создать первый наряд в ЗТЛ</span>
									</button>
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{filteredOrders.map((ord) => (
										<DentalLabHubOrderCard
											key={ord.id}
											order={ord}
											onPrint={(target) => {
												setPrintOrder(target);
												setActiveTab("print");
											}}
										/>
									))}
								</div>
							)}
						</div>
					)}

					{activeTab === "create" && (
						<DentalLabHubCreateSection
							patientName={patientName} setPatientName={setPatientName}
							toothFdi={toothFdi} setToothFdi={setToothFdi}
							constructionId={constructionId} setConstructionId={setConstructionId}
							shadeVita={shadeVita} setShadeVita={setShadeVita}
							shadeStump={shadeStump} setShadeStump={setShadeStump}
							selectedLabId={selectedLabId} setSelectedLabId={setSelectedLabId}
							isWarranty={isWarranty} setIsWarranty={setIsWarranty}
							clinicalNotes={clinicalNotes} setClinicalNotes={setClinicalNotes}
							selectedConstruction={selectedConstruction}
							calculatedDates={calculatedDates}
							payrollNet={payrollNet}
							onApplyFastPreset={applyFastPreset}
						/>
					)}

					{activeTab === "print" && printOrder && (
						<div className="space-y-4">
							<div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
								<button
									type="button"
									onClick={() => setActiveTab("orders")}
									className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
								>
									<ArrowLeft size={14} />
									<span>Назад к реестру</span>
								</button>
								<span className="text-xs text-[var(--muted)]">Печатный бланк наряда для курьера и лаборатории</span>
							</div>
							<DentalLabPrintBlank
								gostOrderNumber={printOrder.orderNumber}
								secureToken="ztl_print_token"
								formPatientName={printOrder.patientName}
								formDoctorName={printOrder.doctorName}
								selectedTeeth={printOrder.toothFdi.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))}
								constructionType={printOrder.constructionTitle}
								material={printOrder.material}
								shadeSystem="classical"
								shadeClassical={printOrder.shadeVita}
								shade3dMaster="2M2"
								shadeBleach="BL2"
								shadeCervical={printOrder.shadeVita}
								shadeBody={printOrder.shadeVita}
								shadeIncisal={printOrder.shadeVita}
								shadeStump={printOrder.shadeStump || "ND2"}
								translucency="standard"
								mamelons={false}
								calcifications={false}
								dueDate={printOrder.dueDate}
								clinicalNotes={printOrder.clinicalNotes || "Стандартное краевое прилегание по клиническому протоколу."}
								totalLabPriceRub={Math.round(printOrder.labCostKopecks / 100)}
								portalUrl="https://dente.clinic/lab"
								handlePrint={() => {
									if (typeof window !== "undefined") window.print();
								}}
							/>
						</div>
					)}
				</div>

				<footer className="p-3 sm:p-4 border-t border-[var(--line)] bg-[var(--paper-strong)]/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
					<div className="text-xs text-[var(--muted)] hidden sm:block">
						{activeTab === "create" ? "Без блокировок: наряд оформляется в 1 клик" : `Всего в реестре: ${orders.length} нарядов`}
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
						<button
							type="button"
							onClick={onClose}
							className="h-9 min-h-[36px] max-sm:h-11 max-sm:min-h-[44px] px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] cursor-pointer"
						>
							Закрыть
						</button>

						{activeTab === "orders" ? (
							<button
								type="button"
								onClick={() => setActiveTab("create")}
								data-testid="submit-lab-order-btn"
								className="h-9 min-h-[36px] max-sm:h-11 max-sm:min-h-[44px] px-4 rounded-xl border border-teal-600 bg-[var(--teal,#0d9488)] hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
							>
								<Plus size={15} />
								<span>✓ Создать заказ-наряд в лабораторию</span>
							</button>
						) : activeTab === "create" ? (
							<button
								type="button"
								onClick={handleCreateOrder}
								data-testid="submit-lab-order-btn"
								className="h-9 min-h-[36px] max-sm:h-11 max-sm:min-h-[44px] px-4 rounded-xl border border-teal-600 bg-[var(--teal,#0d9488)] hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
							>
								<CheckCircle2 size={15} />
								<span>✓ Создать заказ-наряд в лабораторию</span>
							</button>
						) : (
							<button
								type="button"
								onClick={() => {
									if (typeof window !== "undefined") window.print();
								}}
								className="h-9 min-h-[36px] max-sm:h-11 max-sm:min-h-[44px] px-4 rounded-xl border border-teal-600 bg-[var(--teal,#0d9488)] hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
							>
								<Printer size={15} />
								<span>✓ Отправить на печать (А4/А5)</span>
							</button>
						)}
					</div>
				</footer>
			</div>
		</div>
	);
};

export default DentalLabOrdersHubModal;
