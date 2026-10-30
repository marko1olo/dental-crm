/**
 * DentalLabOrdersHubModal.tsx — Единый канонический SSOT хаб зуботехнической лаборатории в DENTE CRM.
 * 
 * Включает:
 * - Шапку с индикаторами KPI, затратами ЗТЛ, выручкой клиники и контролем дедлайнов.
 * - Фильтр-бар с поиском, селекторами этапов/сроков и сегментированными чипами.
 * - Каноническую 4-этапную канбан-доску нарядов ЗТЛ с модальными карточками.
 * - Чистый 1-клик заказ-наряд: пациент, формула FDI (11–48), типы конструкций, VITA/ND цвета, сроки.
 * - Сквозная интеграция с Net Revenue врача в Payroll (Мандат 8n): расход ЗТЛ вычитается из базы ЗП.
 * - Печатная форма наряда в ЗТЛ (А4/А5) для передачи курьеру/лаборатории.
 * - Дизайн-код Мандата 8am: ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)) на видимый экран.
 * - Сенсорная эргономика Apple HIG: на смартфонах нативный Bottom Sheet с тактильным Drag Handle 36x5px.
 * 
 * Соответствует Высшей Конституции THE HAMMER и Мандатам 8b (350–450 строк, Sweet Spot), 8e, 8n, 8x.
 */

import React, { useState, useMemo, useCallback } from "react";
import { FlaskConical, Plus, CheckCircle2, ChevronDown, ChevronUp, Clock, Calendar } from "lucide-react";
import type { DentalLabWorkflowOrder } from "./dentalLabWorkflowEngine";
import { DentalLabOrdersKanbanBoard } from "./DentalLabOrdersKanbanBoard";
import { DentalLabOrdersFilterBar } from "./DentalLabOrdersFilterBar";
import { DentalLabCreateOrderModal } from "./DentalLabCreateOrderModal";
import { DentalLabOrderDetailsModal, type ActionPromptState } from "./DentalLabOrderDetailsModal";
import { DentalLabReadyInClinicModal, type ReadyInClinicLabOrder } from "./DentalLabReadyInClinicModal";
import { IntraoralScan3DViewerModal } from "../radiology/IntraoralScan3DViewerModal";
import { DentalLabHubHeader } from "./hub/DentalLabHubHeader";
import { DentalLabHubAlerts } from "./hub/DentalLabHubAlerts";
import { useDentalLabHubData } from "./hub/useDentalLabHubData";
import { useDentalLabHubActions } from "./hub/useDentalLabHubActions";
import {
	LAB_CONSTRUCTION_CATALOG,
	VITA_SHADES,
	STUMP_SHADES,
	PARTNER_LABS,
	LAB_FAST_PRESETS,
	addWorkingDaysRu,
	formatKopecks,
	calculateZtlPayrollNetRevenue,
} from "./labCatalogData";
import {
	type DentalLabOrdersHubModalProps,
	type DentalLabHubModalProps,
	SAMPLE_LABS,
} from "./hub/dentalLabHubModalTypes";

export type { DentalLabOrdersHubModalProps, DentalLabHubModalProps };
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
	treatmentPlanAgeDays,
	isPlanExpired,
	initialTab,
}) => {
	const data = useDentalLabHubData({
		isOpen,
		initialOrders: initialOrders as any,
		currentPatientId,
		currentPatientName,
		currentDoctorName,
	});

	const [toast, setToast] = useState<string | null>(null);
	const showToast = useCallback((msg: string) => {
		setToast(msg);
		setTimeout(() => setToast(null), 3500);
	}, []);

	const [isCreateOpen, setIsCreateOpen] = useState(initialTab === "create");
	const [showExpressPanel, setShowExpressPanel] = useState(false);
	const [inspecting, setInspecting] = useState<DentalLabWorkflowOrder | null>(null);
	const [warrantyOrder, setWarrantyOrder] = useState<DentalLabWorkflowOrder | null>(null);
	const [actionPrompt, setActionPrompt] = useState<ActionPromptState | null>(null);
	const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
	const [stageLimits, setStageLimits] = useState<Record<string, number>>({});
	const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
	const [readyOrder, setReadyOrder] = useState<ReadyInClinicLabOrder | null>(null);
	const [view3DOrder, setView3DOrder] = useState<DentalLabWorkflowOrder | null>(null);

	// Express-форма 1-клик наряда
	const [expressToothFdi, setExpressToothFdi] = useState(String(currentToothNumber || "16"));
	const [expressConstructionId, setExpressConstructionId] = useState(LAB_CONSTRUCTION_CATALOG[0]?.id ?? "crown_zirconia");
	const [expressShadeVita, setExpressShadeVita] = useState("A2");
	const [expressShadeStump, setExpressShadeStump] = useState("ND2");
	const [expressLabId, setExpressLabId] = useState(PARTNER_LABS[0]?.id ?? "lab_art");
	const [expressIsWarranty, setExpressIsWarranty] = useState(false);

	const selectedConstruction = useMemo(
		() => LAB_CONSTRUCTION_CATALOG.find((c) => c.id === expressConstructionId) ?? LAB_CONSTRUCTION_CATALOG[0]!,
		[expressConstructionId],
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
			expressIsWarranty,
		);
	}, [selectedConstruction, expressIsWarranty]);

	const handleOpenReady = useCallback((ord: DentalLabWorkflowOrder) => {
		setReadyOrder({
			id: ord.id,
			orderNumber: ord.orderNumber,
			patientId: ord.patientId,
			patientName: ord.patientName,
			doctorName: ord.doctorName,
			toothFdi: Array.isArray(ord.selectedTeeth) ? ord.selectedTeeth.join(", ") : undefined,
			material: ord.materialName,
			colorVita: ord.shadeCode,
			constructionType: ord.workTypeId,
		});
		setIsReadyModalOpen(true);
	}, []);

	const actions = useDentalLabHubActions(
		data.setOrders,
		onSaveOrder as any,
		showToast,
		handleOpenReady,
	);

	const handleCreateExpressOrder = useCallback(() => {
		const chosenLab = PARTNER_LABS.find((l) => l.id === expressLabId) ?? PARTNER_LABS[0]!;
		const createdOrder: DentalLabWorkflowOrder = {
			id: `lab_${Date.now()}`,
			orderNumber: `ЗТЛ-${new Date().getFullYear()}-${String(data.orders.length + 43).padStart(4, "0")}`,
			patientId: currentPatientId || "pat_direct",
			patientName: currentPatientName,
			doctorId: "doc_current",
			doctorName: currentDoctorName,
			workTypeId: selectedConstruction.id,
			materialName: selectedConstruction.material,
			selectedTeeth: expressToothFdi.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)),
			shadeCode: expressShadeVita,
			labName: chosenLab.name,
			currentStage: "sent_to_lab",
			createdAt: new Date().toISOString(),
			dueDate: calculatedDates.dueStr,
			expectedLabDate: calculatedDates.dueStr,
			trialDate: calculatedDates.trialStr,
			pricePerUnitRub: Math.round(selectedConstruction.defaultPatientPriceKopecks / 100),
			costPerUnitRub: Math.round(selectedConstruction.defaultLabCostKopecks / 100),
			totalPriceRub: Math.round(selectedConstruction.defaultPatientPriceKopecks / 100),
			totalLabCostRub: Math.round(selectedConstruction.defaultLabCostKopecks / 100),
			doctorPercent: 25,
			isWarranty: expressIsWarranty,
			technologicalStages: [],
		};

		actions.handleCreateOrder(createdOrder);
		setShowExpressPanel(false);
		showToast(`Заказ-наряд ${createdOrder.orderNumber} оформлен и отправлен в ЗТЛ`);
	}, [
		actions, expressLabId, data.orders.length, currentPatientId, currentPatientName,
		currentDoctorName, selectedConstruction, expressToothFdi, expressShadeVita,
		calculatedDates, expressIsWarranty, showToast,
	]);

	const applyFastPreset = useCallback((presetId: string) => {
		const p = LAB_FAST_PRESETS.find((x) => x.id === presetId);
		if (!p) return;
		setExpressConstructionId(p.workTypeId);
		if (p.shadeCode) setExpressShadeVita(p.shadeCode);
		if (p.stumpShadeCode) setExpressShadeStump(p.stumpShadeCode);
		showToast(`Применен пресет: ${p.label}`);
	}, [showToast]);

	if (!isOpen) return null;

	return (
		<div
			className="ztl-modal-overlay max-sm:items-end max-sm:p-0"
			role="dialog"
			aria-modal="true"
			data-testid="dental-lab-orders-hub-modal"
		>
			<div className="ztl-modal-container max-sm:rounded-t-[24px] max-sm:rounded-b-none overflow-x-clip max-w-[100vw]">
				<div className="sm:hidden w-9 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto my-2 shrink-0" aria-hidden="true" />

				{toast && (
					<div className="ztl-toast" role="status">
						<CheckCircle2 size={16} />
						<span>{toast}</span>
					</div>
				)}

				<DentalLabHubHeader
					totalOrdersCount={data.orders.length}
					delayedCount={data.delayedOrders.length}
					totalLabCostRub={data.totalLabCostRub}
					totalPatientPriceRub={data.totalPatientPriceRub}
					onExportCsv={() => actions.handleExportCsv(data.filteredOrders)}
					onOpenCreateModal={() => setIsCreateOpen(true)}
					onClose={onClose}
				/>

				<DentalLabHubAlerts
					delayedCount={data.delayedOrders.length}
					onlyDelayedFilter={data.onlyDelayedFilter}
					onToggleDelayedFilter={() => data.setOnlyDelayedFilter((p) => !p)}
					treatmentPlanAgeDays={treatmentPlanAgeDays}
					isPlanExpired={isPlanExpired}
				/>

				{/* 1-клик экспресс-панель оформления наряда ЗТЛ прямо в хабе */}
				<section className="px-3 sm:px-4 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center justify-between gap-2">
						<button
							type="button"
							onClick={() => setShowExpressPanel((p) => !p)}
							className="text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer hover:text-[var(--teal,#0d9488)] transition-colors"
						>
							<FlaskConical size={14} className="text-[var(--teal,#0d9488)]" />
							<span>Быстрый наряд у кресла (1 клик)</span>
							{showExpressPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
						</button>
						<span className="text-[11px] text-[var(--muted)] hidden sm:inline">
							Зубы FDI • VITA оттенок • Расчет Net Revenue врача в Payroll
						</span>
					</div>

					{showExpressPanel && (
						<div className="mt-3 pt-3 border-t border-[var(--line)] space-y-3">
							<div className="flex flex-wrap items-center gap-1.5">
								<span className="text-xs font-semibold text-[var(--ink)]">Пресеты:</span>
								{LAB_FAST_PRESETS.map((p) => (
									<button
										key={p.id}
										type="button"
										onClick={() => applyFastPreset(p.id)}
										data-testid={`lab-fast-preset-btn-${p.id}`}
										className="h-7 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-teal-50 hover:border-teal-500 text-[var(--ink)] text-xs font-semibold transition-colors cursor-pointer"
									>
										{p.label}
									</button>
								))}
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
								<div>
									<label className="block text-[11px] font-semibold text-[var(--muted)] mb-0.5">Зубы FDI</label>
									<input
										type="text"
										value={expressToothFdi}
										onChange={(e) => setExpressToothFdi(e.target.value)}
										className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
										placeholder="16, 21"
									/>
								</div>
								<div>
									<label className="block text-[11px] font-semibold text-[var(--muted)] mb-0.5">Конструкция</label>
									<select
										value={expressConstructionId}
										onChange={(e) => setExpressConstructionId(e.target.value)}
										className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
									>
										{LAB_CONSTRUCTION_CATALOG.map((c) => (
											<option key={c.id} value={c.id}>
												{c.shortTitle}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-[11px] font-semibold text-[var(--muted)] mb-0.5">Цвет VITA</label>
									<select
										value={expressShadeVita}
										onChange={(e) => setExpressShadeVita(e.target.value)}
										className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
									>
										{VITA_SHADES.slice(0, 10).map((v) => (
											<option key={v.code} value={v.code}>
												{v.code} — {v.label.split("(")[1]?.replace(")", "") || v.group}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-[11px] font-semibold text-[var(--muted)] mb-0.5">Лаборатория</label>
									<select
										value={expressLabId}
										onChange={(e) => setExpressLabId(e.target.value)}
										className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
									>
										{PARTNER_LABS.map((l) => (
											<option key={l.id} value={l.id}>
												{l.name.split("(")[0]}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs">
								<div className="flex items-center gap-3 text-[11px]">
									<span>Примерка: <strong className="text-[var(--ink)]">{calculatedDates.trialStr}</strong></span>
									<span>Сдача: <strong className="text-[var(--teal,#0d9488)]">{calculatedDates.dueStr}</strong></span>
									<span>ЗТЛ (расход): <strong className="text-rose-600">-{formatKopecks(payrollNet.labCostKopecks)}</strong></span>
									<span>Net Revenue: <strong className="text-[var(--ink)]">{formatKopecks(payrollNet.netRevenueKopecks)}</strong></span>
								</div>
								<button
									type="button"
									onClick={handleCreateExpressOrder}
									className="h-7 px-3 rounded-lg border border-teal-600 bg-[var(--teal,#0d9488)] hover:bg-teal-700 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1 cursor-pointer"
								>
									<span>Отправить наряд в ЗТЛ</span>
								</button>
							</div>
						</div>
					)}
				</section>

				{data.orders.length > 0 && (
					<DentalLabOrdersFilterBar
						searchQuery={data.searchQuery}
						setSearchQuery={data.setSearchQuery}
						selectedLab={data.selectedLab}
						setSelectedLab={data.setSelectedLab}
						selectedWorkType={data.selectedWorkType}
						setSelectedWorkType={data.setSelectedWorkType}
						selectedStage={data.selectedStage}
						setSelectedStage={data.setSelectedStage}
						selectedDateRange={data.selectedDateRange}
						setSelectedDateRange={data.setSelectedDateRange}
						onlyDelayedFilter={data.onlyDelayedFilter}
						setOnlyDelayedFilter={data.setOnlyDelayedFilter}
						delayedCount={data.delayedOrders.length}
						sampleLabs={SAMPLE_LABS}
					/>
				)}

				{data.orders.length === 0 ? (
					<main className="ztl-empty-state" role="status">
						<div className="ztl-empty-icon-wrap">
							<FlaskConical size={36} />
						</div>
						<h3 className="ztl-empty-title">Нет нарядов в зуботехническую лабораторию</h3>
						<p className="ztl-empty-desc">Оформите первый заказ на изготовление коронок или протезов в 1 клик.</p>
						<button
							type="button"
							className="h-9 min-h-[36px] max-sm:h-11 max-sm:min-h-[44px] px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] active:scale-95 text-[var(--ink)] font-semibold text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
							onClick={() => setIsCreateOpen(true)}
							data-testid="hub-empty-create-lab-order-btn"
						>
							<Plus size={15} />
							<span>Создать заказ-наряд в лабораторию</span>
						</button>
					</main>
				) : (
					<DentalLabOrdersKanbanBoard
						ordersByStage={data.ordersByStage}
						stageLimits={stageLimits}
						setStageLimits={setStageLimits}
						activeCardMenuOrderId={activeMenuId}
						setActiveCardMenuOrderId={setActiveMenuId}
						onInspectOrder={setInspecting}
						onAdvanceStage={actions.handleAdvanceStage}
						onPrintBlank={actions.handlePrintBlank}
						onAttachBitePhoto={(o) => setActionPrompt({ order: o, type: "bite_photo", title: "Фото прикуса", label: "URL снимка:", placeholder: "https://..." })}
						onTechnicianComment={(o) => setActionPrompt({ order: o, type: "technician_comment", title: "Комментарий технику", label: "Указания:", placeholder: "Особенности..." })}
						onRepeatFitting={(o) => actions.handleAdvanceStage({ ...o, currentStage: "fitting_scheduled" })}
						onRequestWarrantyRework={setWarrantyOrder}
					/>
				)}

				{/* Floating Bottom Bar: ровно ОДНА Primary CTA кнопка (Мандат 8am) */}
				<footer className="p-3 sm:p-4 border-t border-[var(--line)] bg-[var(--paper-strong)]/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
					<div className="text-xs text-[var(--muted)] hidden sm:block">
						Всего в реестре: {data.orders.length} нарядов • Расходы ЗТЛ вычитаются из Payroll
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
						<button
							type="button"
							onClick={onClose}
							className="h-9 min-h-[36px] max-sm:h-11 max-sm:min-h-[44px] px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] cursor-pointer"
						>
							Закрыть
						</button>

						<button
							type="button"
							onClick={() => setIsCreateOpen(true)}
							data-testid="submit-lab-order-btn"
							className="h-9 min-h-[36px] max-sm:h-11 max-sm:min-h-[44px] px-4 rounded-xl border border-teal-600 bg-[var(--teal,#0d9488)] hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
						>
							<Plus size={15} className="shrink-0" />
							<span className="hidden sm:inline">Создать заказ-наряд в лабораторию</span>
							<span className="sm:hidden">Новый наряд ЗТЛ</span>
						</button>
					</div>
				</footer>

				{/* Модальные окна управления нарядами */}
				<DentalLabCreateOrderModal
					isOpen={isCreateOpen}
					onClose={() => setIsCreateOpen(false)}
					onCreateOrder={actions.handleCreateOrder}
					sampleLabs={SAMPLE_LABS}
					currentDoctorName={currentDoctorName}
					currentPatientName={currentPatientName}
					currentPatientId={currentPatientId}
					currentToothNumber={currentToothNumber}
				/>

				<DentalLabOrderDetailsModal
					inspectingOrder={inspecting}
					onCloseInspect={() => setInspecting(null)}
					onPrintBlank={actions.handlePrintBlank}
					onAdvanceTechStage={actions.handleAdvanceTechStage}
					onOpenWarrantyRework={(o) => { setInspecting(null); setWarrantyOrder(o); }}
					onView3DScan={setView3DOrder}
					warrantyReworkOrder={warrantyOrder}
					onCloseWarrantyRework={() => setWarrantyOrder(null)}
					onWarrantyReworkSubmit={actions.handleWarrantyReworkSubmit}
					actionPrompt={actionPrompt}
					onCloseActionPrompt={() => setActionPrompt(null)}
					onActionPromptSubmit={() => setActionPrompt(null)}
				/>

				<DentalLabReadyInClinicModal isOpen={isReadyModalOpen} onClose={() => setIsReadyModalOpen(false)} order={readyOrder} />
				<IntraoralScan3DViewerModal isOpen={Boolean(view3DOrder)} onClose={() => setView3DOrder(null)} modelUrl="/models/mandible_scan_16.stl" title="3D-скан ЗТЛ" patientName={view3DOrder?.patientName} modelFormat="stl" />
			</div>
		</div>
	);
};

export default DentalLabOrdersHubModal;
