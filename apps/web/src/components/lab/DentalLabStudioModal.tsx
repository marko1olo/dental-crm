/**
 * apps/web/src/components/lab/DentalLabStudioModal.tsx
 *
 * DENTE Dental CRM — Каноническая студия зуботехнической лаборатории и заказ-нарядов (SSOT).
 * Единый Sweet Spot мастер-компонент: экспресс-наряд у кресла за 10 сек, зубы FDI 11-48, палитра VITA,
 * 5-этапный трекинг изготовления, себестоимость в копейках, быстрые действия ортопеда,
 * ровно 1 Primary CTA #0d9488 и нативный мобильный Apple HIG Bottom Sheet (Мандаты 8b: 400–480 строк, 8d, 8e, 8am, 8ze).
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import "./styles/dentalLabStudio.css";
import {
	CANONICAL_LAB_STAGES, CANONICAL_LAB_MATERIALS, VITA_SHADES_SSOT, CLINIC_LABORATORIES,
	UPPER_JAW_TEETH, LOWER_JAW_TEETH, SEED_LAB_ORDERS, type DentalLabOrderEntry, type DentalLabStage,
	addWorkingDaysRu, formatKopecksToRubles, calcNetRevenueKopecks, getStageMeta, getMaterialMeta, isOrderOverdue,
} from "./dentalLabCatalogData";

export type LabFilterTab = "all" | "in_work" | "in_clinic" | "overdue";

export interface DentalLabStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialToothFdi?: string | number | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly onOrderCreated?: ((order: DentalLabOrderEntry) => void) | undefined;
}

export type LabStudioModalProps = DentalLabStudioModalProps;

export const DentalLabStudioModal: React.FC<DentalLabStudioModalProps> = ({
	isOpen, onClose, initialToothFdi = "16",
	patientName = "Ковалев Дмитрий Сергеевич", doctorName = "Д-р Смирнова Е. В. (Ортопед)", onOrderCreated,
}) => {
	const [orders, setOrders] = useState<DentalLabOrderEntry[]>(() => [...SEED_LAB_ORDERS]);
	const [activeFilter, setActiveFilter] = useState<LabFilterTab>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [isMobileCreateOpen, setIsMobileCreateOpen] = useState(false);
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
		const savedShade = localStorage.getItem("dente_active_lab_shade_preset");
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
	const calculatedDueDate = useMemo(() => {
		const targetDate = addWorkingDaysRu(new Date(), selectedMaterial.defaultDurationDays);
		return targetDate.toISOString().split("T")[0] ?? "";
	}, [selectedMaterial]);

	const [customDueDate, setCustomDueDate] = useState<string>("");
	const effectiveDueDate = customDueDate || calculatedDueDate;

	const teethCount = selectedTeeth.length > 0 ? selectedTeeth.length : 1;
	const totalLabCostKopecks = selectedMaterial.baseLabCostKopecks * teethCount;
	const totalPatientPriceKopecks = selectedMaterial.defaultPatientPriceKopecks * teethCount;
	const netClinicRevenueKopecks = calcNetRevenueKopecks(totalPatientPriceKopecks, totalLabCostKopecks);

	const toggleTooth = useCallback((tooth: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b),
		);
	}, []);

	// Создание наряда — кнопка НИКОГДА не заблокирована (Мандат 8e: Автономия врача)
	const handleCreateOrder = useCallback(() => {
		const teethToSave = selectedTeeth.length > 0 ? selectedTeeth : [16];
		const nextOrderNumber = `ЗТЛ-${100 + orders.length + 1}`;
		const newEntry: DentalLabOrderEntry = {
			id: `lab-ord-${Date.now()}`, orderNumber: nextOrderNumber, patientName, doctorName,
			teeth: teethToSave, materialId: selectedMaterialId, shadeCode: selectedShade, stage: "scan_sent",
			labCostKopecks: totalLabCostKopecks, patientPriceKopecks: totalPatientPriceKopecks,
			laboratoryName: selectedLab, createdAt: new Date().toISOString(), dueDate: effectiveDueDate,
			notes: notes.trim() || undefined, isUrgent,
		};
		setOrders((prev) => [newEntry, ...prev]);
		onOrderCreated?.(newEntry);
		setIsMobileCreateOpen(false);
		setFeedbackToast(`Заказ-наряд ${newEntry.orderNumber} успешно создан и отправлен в лабораторию`);
		setTimeout(() => setFeedbackToast(null), 3500);
	}, [selectedTeeth, orders.length, patientName, doctorName, selectedMaterialId, selectedShade,
		totalLabCostKopecks, totalPatientPriceKopecks, selectedLab, effectiveDueDate, notes, isUrgent, onOrderCreated]);

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
		setFeedbackToast("Заказ отмечен: готов в клинике");
		setTimeout(() => setFeedbackToast(null), 2500);
	}, []);

	const handleCallPatient = useCallback((order: DentalLabOrderEntry) => {
		setFeedbackToast(`Вызов пациента на примерку: ${order.patientName}`);
		setTimeout(() => setFeedbackToast(null), 2500);
	}, []);

	const handlePrintOrder = useCallback((order: DentalLabOrderEntry) => {
		setFeedbackToast(`Печать заказ-наряда: ${order.orderNumber}`);
		if (typeof window !== "undefined") window.print?.();
		setTimeout(() => setFeedbackToast(null), 2500);
	}, []);

	const filteredOrders = useMemo(() => {
		return orders.filter((ord) => {
			const query = searchQuery.trim().toLowerCase();
			const matchesSearch = !query ||
				ord.patientName.toLowerCase().includes(query) ||
				ord.orderNumber.toLowerCase().includes(query) ||
				ord.laboratoryName.toLowerCase().includes(query);
			if (!matchesSearch) return false;
			if (activeFilter === "in_work") return ord.stage === "scan_sent" || ord.stage === "in_production" || ord.stage === "fitting_ready";
			if (activeFilter === "in_clinic") return ord.stage === "in_clinic";
			if (activeFilter === "overdue") return isOrderOverdue(ord);
			return true;
		});
	}, [orders, activeFilter, searchQuery]);

	if (!isOpen) return null;

	return (
		<div
			data-testid="dental-lab-studio-modal-root"
			className="dental-lab-modal-backdrop"
			onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div className="dental-lab-modal-container">
				{/* Apple HIG Drag Handle 36x5px для мобильных */}
				<div className="sm:hidden flex justify-center pt-2">
					<div className="w-9 h-1 rounded-full bg-[var(--line-strong,#94a3b8)]" />
				</div>

				<header className="dental-lab-header">
					<div className="min-w-0 flex-1">
						<h2 className="dental-lab-header-title">
							<span className="hidden sm:inline">Зуботехническая лаборатория и заказ-наряды</span>
							<span className="sm:hidden font-bold text-sm">ЗТЛ и заказ-наряды</span>
							<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal)]/30 shrink-0">
								SSOT Ортопедия
							</span>
						</h2>
						<div className="dental-lab-header-meta">
							<span className="truncate">Пациент: <strong className="text-[var(--ink)]">{patientName}</strong></span>
							<span className="truncate">Врач: <strong className="text-[var(--ink)]">{doctorName}</strong></span>
						</div>
					</div>
					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							className="sm:hidden px-3 py-1.5 rounded-xl bg-[var(--teal)] text-white text-xs font-bold cursor-pointer"
							onClick={() => setIsMobileCreateOpen(!isMobileCreateOpen)}
						>
							{isMobileCreateOpen ? "К заказам" : "+ Новый наряд"}
						</button>
						<button
							type="button" data-testid="lab-modal-close-button" onClick={onClose}
							className="w-8 h-8 rounded-full border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center font-bold text-sm cursor-pointer"
							title="Закрыть (Esc)"
						>&#215;</button>
					</div>
				</header>

				{feedbackToast && (
					<div className="bg-[var(--teal)] text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm">
						<span>✓ {feedbackToast}</span>
						<button type="button" onClick={() => setFeedbackToast(null)} className="text-white font-bold opacity-80 hover:opacity-100">&#215;</button>
					</div>
				)}

				<div className="dental-lab-body-grid">
					{/* ЛЕВАЯ КОЛОНКА: Экспресс-наряд за 10 секунд */}
					<aside className={`dental-lab-left-column ${isMobileCreateOpen ? "mobile-visible" : "mobile-hidden"}`} data-testid="lab-order-create-panel">
						<div className="flex items-center justify-between">
							<h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">Экспресс-наряд у кресла</h3>
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
									<button key={tooth} type="button" data-testid={`tooth-chip-${tooth}`} onClick={() => toggleTooth(tooth)}
										className={`dental-lab-tooth-chip ${selectedTeeth.includes(tooth) ? "selected" : ""}`}>{tooth}</button>
								))}
							</div>
							<div className="text-[10px] text-[var(--ink-muted)] pt-1">Нижняя челюсть</div>
							<div className="dental-lab-teeth-grid">
								{LOWER_JAW_TEETH.map((tooth) => (
									<button key={tooth} type="button" data-testid={`tooth-chip-${tooth}`} onClick={() => toggleTooth(tooth)}
										className={`dental-lab-tooth-chip ${selectedTeeth.includes(tooth) ? "selected" : ""}`}>{tooth}</button>
								))}
							</div>
						</div>

						{/* Конструкция, Оттенок VITA, Лаборатория */}
						<div className="space-y-1">
							<label htmlFor="lab-material-select" className="text-xs font-semibold text-[var(--ink)] block">Вид конструкции</label>
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

						<div className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl p-2.5 space-y-1 text-xs">
							<div className="flex justify-between text-[var(--ink-muted)]">
								<span>Себестоимость ЗТЛ ({teethCount} ед.):</span>
								<strong className="text-[var(--ink)]">{formatKopecksToRubles(totalLabCostKopecks)}</strong>
							</div>
							<div className="flex justify-between text-[var(--ink-muted)]">
								<span>Прайс для пациента:</span>
								<strong className="text-[var(--ink)]">{formatKopecksToRubles(totalPatientPriceKopecks)}</strong>
							</div>
							<div className="flex justify-between border-t border-[var(--line)] pt-1 text-[var(--teal)] font-bold">
								<span>Маржа клиники:</span>
								<span>+{formatKopecksToRubles(netClinicRevenueKopecks)}</span>
							</div>
						</div>

						{/* Ровно ОДНА Primary CTA кнопка #0d9488 (Мандат 8am & 8e: НИКОГДА НЕ DISABLED) */}
						<div className="pt-2">
							<button
								type="button"
								data-testid="submit-lab-order-button"
								onClick={handleCreateOrder}
								className="dental-lab-primary-cta"
								style={{ backgroundColor: "var(--teal, #0d9488)" }}
							>
								<span>✓ Создать заказ-наряд / ✓ Отправить заказ в лабораторию</span>
							</button>
						</div>
					</aside>

					{/* ПРАВАЯ КОЛОНКА: Канбан-реестр нарядов с фильтрами */}
					<section className={`dental-lab-right-column ${isMobileCreateOpen ? "mobile-hidden" : "mobile-visible"}`} data-testid="lab-orders-registry-panel">
						<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
							<div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
								{(["all", "in_work", "in_clinic", "overdue"] as const).map((tab) => {
									const labels: Record<LabFilterTab, string> = {
										all: "Все заказы", in_work: "В работе ЗТЛ", in_clinic: "Готово в клинике", overdue: "Просроченные",
									};
									return (
										<button
											key={tab} type="button" data-testid={`filter-tab-${tab}`} onClick={() => setActiveFilter(tab)}
											className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
												activeFilter === tab ? "bg-[var(--teal)] text-white shadow-xs"
													: "bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--line)]"
											}`}
										>
											{labels[tab]}
										</button>
									);
								})}
							</div>
							<div className="w-full sm:w-64 shrink-0">
								<input
									type="search" data-testid="lab-orders-search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Поиск по пациенту, номеру ЗТЛ..."
									className="w-full text-xs p-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
								/>
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
													<span className="text-xs font-bold font-mono px-2 py-0.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]">
														{ord.orderNumber}
													</span>
													{ord.isUrgent && (
														<span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--rose-surface,#fee2e2)] text-[var(--rose-ink,#991b1b)] border border-[var(--rose,#ef4444)]/40">
															СРОЧНО
														</span>
													)}
													<span className="text-[11px] text-[var(--ink-muted)] truncate max-w-[200px]">{ord.laboratoryName}</span>
												</div>
												<span
													data-testid={`order-stage-badge-${ord.id}`}
													className="text-[11px] font-bold px-2.5 py-0.5 rounded-xl border flex items-center gap-1.5 shrink-0"
													style={{ backgroundColor: stageMeta.bgToken, borderColor: stageMeta.borderToken, color: stageMeta.textToken }}
												>
													<span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stageMeta.borderToken }} />
													{stageMeta.labelRu}
												</span>
											</div>

											<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
												<div className="min-w-0">
													<strong className="text-[var(--ink)] text-xs sm:text-sm block truncate">{ord.patientName}</strong>
													<div className="text-[11px] text-[var(--ink-muted)] truncate">
														{matMeta.titleRu} • Оттенок Vita: <strong className="text-[var(--ink)]">{ord.shadeCode}</strong>
													</div>
												</div>
												<div className="text-left sm:text-right shrink-0">
													<span className="font-bold text-[11px] bg-[var(--teal-surface)] text-[var(--teal)] px-2 py-0.5 rounded-lg border border-[var(--teal)]/30">
														Зубы FDI: {ord.teeth.join(", ")}
													</span>
												</div>
											</div>

											{/* Прогресс-бар 5 этапов изготовления */}
											<div className="grid grid-cols-5 gap-1 pt-0.5">
												{CANONICAL_LAB_STAGES.map((st) => (
													<div
														key={st.id} title={st.labelRu}
														className={`h-1.5 rounded-full transition-all ${
															st.id === ord.stage ? "bg-[var(--teal)] ring-1 ring-[var(--teal)]"
																: st.stepNumber <= stageMeta.stepNumber ? "bg-[var(--teal)]/70" : "bg-[var(--line)]"
														}`}
													/>
												))}
											</div>

											{/* Сроки, себестоимость и быстрые действия */}
											<div className="flex items-center justify-between pt-1.5 border-t border-[var(--line)] flex-wrap gap-2 text-xs">
												<div className="flex items-center gap-2.5">
													<span className={overdue ? "font-bold text-[var(--rose-ink,#991b1b)]" : "text-[var(--ink-muted)]"}>
														Срок: {ord.dueDate} {overdue && "(Просрочен)"}
													</span>
													<span className="text-[var(--ink-muted)] hidden sm:inline text-[11px]">
														Себестоимость: <strong className="text-[var(--ink)]">{formatKopecksToRubles(ord.labCostKopecks)}</strong>
													</span>
												</div>

												{/* Быстрые действия ортопеда у кресла (без мультяшных эмодзи) */}
												<div className="dental-lab-quick-actions">
													{ord.stage !== "in_clinic" && ord.stage !== "seated" && (
														<button
															type="button" data-testid={`mark-ready-btn-${ord.id}`} onClick={() => handleMarkInClinic(ord.id)}
															className="dental-lab-action-btn" title="Отметить прибытие из лаборатории"
														>
															<span>В клинике</span>
														</button>
													)}
													<button
														type="button" data-testid={`call-patient-btn-${ord.id}`} onClick={() => handleCallPatient(ord)}
														className="dental-lab-action-btn" title="Позвонить пациенту на примерку"
													>
														<span>Примерка</span>
													</button>
													<button
														type="button" data-testid={`print-order-btn-${ord.id}`} onClick={() => handlePrintOrder(ord)}
														className="dental-lab-action-btn" title="Распечатать бланк заказ-наряда"
													>
														<span>Бланк</span>
													</button>
													{ord.stage !== "seated" && (
														<button
															type="button" data-testid={`advance-stage-btn-${ord.id}`} onClick={() => handleAdvanceStage(ord.id)}
															className="dental-lab-action-btn font-bold text-[var(--teal)] border-[var(--teal)]/40"
														>
															<span>Этап →</span>
														</button>
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
			</div>
		</div>
	);
};

export const LabStudioModal = DentalLabStudioModal;
export default DentalLabStudioModal;
