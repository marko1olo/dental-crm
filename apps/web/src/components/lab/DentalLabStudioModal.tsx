/**
 * apps/web/src/components/lab/DentalLabStudioModal.tsx
 *
 * DENTE Dental CRM — Canonical Dental Laboratory Studio & Orthopedic Orders Modal.
 * SSOT for lab orders, Vita shade matching, FDI teeth tracking, 5-stage workflow,
 * doctor autonomy (Mandate 8e: 1-click chairside express order, button NEVER disabled),
 * Apple HIG mobile ergonomics (390x844), and single Primary CTA (#0d9488, Mandate 8am).
 * Target size: 380-480 lines (Mandate 8b Sweet Spot).
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	CANONICAL_LAB_STAGES,
	CANONICAL_LAB_MATERIALS,
	VITA_SHADES_SSOT,
	FDI_QUICK_TEETH,
	CLINIC_LABORATORIES,
	SEED_LAB_ORDERS,
	type DentalLabOrderEntry,
	formatKopecksToRubles,
	getStageMeta,
	getMaterialMeta,
	isOrderOverdue,
	calcNetRevenueKopecks,
} from "./dentalLabCatalogData";

export interface DentalLabStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialToothFdi?: string | number;
	readonly patientName?: string;
	readonly doctorName?: string;
	readonly onOrderCreated?: (order: DentalLabOrderEntry) => void;
}

type LabFilterTab = "all" | "in_work" | "in_clinic" | "overdue";

// Зубы FDI, разбитые по челюстям для отображения в 2 строки без скролла
const UPPER_JAW_TEETH = [17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27];
const LOWER_JAW_TEETH = [47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37];

export const DentalLabStudioModal: React.FC<DentalLabStudioModalProps> = ({
	isOpen,
	onClose,
	initialToothFdi = "16",
	patientName = "Ковалев Дмитрий Сергеевич",
	doctorName = "Д-р Смирнова Е. В. (Ортопед)",
	onOrderCreated,
}) => {
	// Список активных заказов
	const [orders, setOrders] = useState<DentalLabOrderEntry[]>(() => [...SEED_LAB_ORDERS]);
	const [activeFilter, setActiveFilter] = useState<LabFilterTab>("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

	// Форма экспресс-создания наряда
	const initialToothNum = Number(initialToothFdi) || 16;
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([initialToothNum]);
	const [selectedMaterialId, setSelectedMaterialId] = useState<string>("zirconia_multilayer");
	const [selectedShade, setSelectedShade] = useState<string>("A2");
	const [selectedLab, setSelectedLab] = useState<string>(CLINIC_LABORATORIES[0]);
	const [notes, setNotes] = useState("");
	const [isUrgent, setIsUrgent] = useState(false);
	const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

	// Автоматический расчет срока сдачи наряда
	const selectedMaterial = useMemo(
		() => getMaterialMeta(selectedMaterialId),
		[selectedMaterialId],
	);

	const defaultDueDate = useMemo(() => {
		const target = new Date();
		target.setDate(target.getDate() + (selectedMaterial?.defaultDurationDays || 5));
		return target.toISOString().split("T")[0];
	}, [selectedMaterial]);

	const [customDueDate, setCustomDueDate] = useState<string>(defaultDueDate);

	// Переключение зуба
	const toggleTooth = useCallback((tooth: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b),
		);
	}, []);

	// Создание наряда (Мандат 8e: Кнопка НИКОГДА не disabled!)
	const handleCreateOrder = useCallback(() => {
		const teethToSave = selectedTeeth.length > 0 ? selectedTeeth : [16];
		const materialToSave = selectedMaterialId || "zirconia_multilayer";
		const shadeToSave = selectedShade || "A2";
		const labToSave = selectedLab || CLINIC_LABORATORIES[0];
		const matMeta = getMaterialMeta(materialToSave);

		const count = teethToSave.length;
		const totalLabCost = matMeta.baseLabCostKopecks * count;
		const totalPatientPrice = matMeta.defaultPatientPriceKopecks * count;

		const nextOrderNumber = `ЗТЛ-${100 + orders.length + 1}`;
		const newEntry: DentalLabOrderEntry = {
			id: `lab-ord-${Date.now()}`,
			orderNumber: nextOrderNumber,
			patientName,
			doctorName,
			teeth: teethToSave,
			materialId: materialToSave,
			shadeCode: shadeToSave,
			stage: "scan_sent",
			labCostKopecks: totalLabCost,
			patientPriceKopecks: totalPatientPrice,
			laboratoryName: labToSave,
			createdAt: new Date().toISOString(),
			dueDate: customDueDate || defaultDueDate,
			notes: notes.trim() || undefined,
			isUrgent,
		};

		setOrders((prev) => [newEntry, ...prev]);
		onOrderCreated?.(newEntry);
		setIsCreateDrawerOpen(false);
		setFeedbackToast(`Заказ-наряд ${newEntry.orderNumber} успешно отправлен в лабораторию`);
		setTimeout(() => setFeedbackToast(null), 3500);
	}, [
		selectedTeeth,
		selectedMaterialId,
		selectedShade,
		selectedLab,
		patientName,
		doctorName,
		customDueDate,
		defaultDueDate,
		notes,
		isUrgent,
		orders.length,
		onOrderCreated,
	]);

	// Перевод этапа заказа
	const handleAdvanceStage = useCallback((orderId: string) => {
		setOrders((prev) =>
			prev.map((ord) => {
				if (ord.id !== orderId) return ord;
				const currentIdx = CANONICAL_LAB_STAGES.findIndex((s) => s.id === ord.stage);
				const nextStage =
					currentIdx < CANONICAL_LAB_STAGES.length - 1
						? CANONICAL_LAB_STAGES[currentIdx + 1].id
						: ord.stage;
				return { ...ord, stage: nextStage };
			}),
		);
	}, []);

	// Фильтрация заказов
	const filteredOrders = useMemo(() => {
		return orders.filter((ord) => {
			if (activeFilter === "in_work") {
				if (ord.stage === "in_clinic" || ord.stage === "seated") return false;
			} else if (activeFilter === "in_clinic") {
				if (ord.stage !== "in_clinic") return false;
			} else if (activeFilter === "overdue") {
				if (!isOrderOverdue(ord)) return false;
			}

			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				ord.patientName.toLowerCase().includes(q) ||
				ord.orderNumber.toLowerCase().includes(q) ||
				ord.laboratoryName.toLowerCase().includes(q) ||
				ord.teeth.some((t) => String(t).includes(q))
			);
		});
	}, [orders, activeFilter, searchQuery]);

	// Счетчики фильтров
	const counts = useMemo(() => {
		return {
			all: orders.length,
			in_work: orders.filter((o) => o.stage !== "in_clinic" && o.stage !== "seated").length,
			in_clinic: orders.filter((o) => o.stage === "in_clinic").length,
			overdue: orders.filter((o) => isOrderOverdue(o)).length,
		};
	}, [orders]);

	if (!isOpen) return null;

	return (
		<div
			data-testid="dental-lab-studio-modal-root"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
			role="dialog"
			aria-modal="true"
		>
			<div className="w-full max-w-5xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col h-[94vh] max-h-[860px] overflow-hidden">
				{/* 1. Компактная шапка в 1 строку (Apple HIG & Мандат 8am: высота 52px, 0 обрезаний) */}
				<header className="px-4 py-2.5 sm:px-6 sm:py-3 border-b border-[var(--line)] bg-[var(--paper-strong)] flex items-center justify-between gap-2 shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal)]/30 flex items-center justify-center shrink-0 text-[var(--teal)] font-bold text-xs">
							ЗТЛ
						</div>
						<div className="min-w-0">
							<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] truncate">
								<span className="hidden sm:inline">Зуботехническая лаборатория и заказ-наряды</span>
								<span className="sm:hidden">Лаборатория</span>
							</h2>
							<p className="text-[11px] text-[var(--ink-muted)] truncate hidden sm:block">
								Ортопедические конструкции, трекинг 5 этапов изготовления и расчет себестоимости
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						{/* Переключатель формы создания на мобильном */}
						<button
							type="button"
							onClick={() => setIsCreateDrawerOpen(!isCreateDrawerOpen)}
							className="sm:hidden px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] min-h-[36px] flex items-center gap-1"
						>
							{isCreateDrawerOpen ? "К нарядам" : "+ Новый наряд"}
						</button>

						<button
							type="button"
							data-testid="close-lab-studio-button"
							onClick={onClose}
							className="p-1.5 rounded-xl border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
							aria-label="Закрыть окно лаборатории"
						>
							<span className="text-base leading-none">✕</span>
						</button>
					</div>
				</header>

				{/* Всплывающий тост обратной связи */}
				{feedbackToast && (
					<div
						data-testid="lab-feedback-toast"
						className="px-4 py-2 bg-[var(--teal-surface)] border-b border-[var(--teal)]/40 text-[var(--teal)] text-xs font-semibold flex items-center justify-between shrink-0"
					>
						<span>✓ {feedbackToast}</span>
						<button
							type="button"
							onClick={() => setFeedbackToast(null)}
							className="text-[var(--teal)] hover:opacity-75 text-xs font-bold ml-2 cursor-pointer"
						>
							Скрыть
						</button>
					</div>
				)}

				{/* 2. Основное тело студии: 2 колонки на ПК */}
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
					{/* Левая панель: Экспресс-создание наряда у кресла (Мандат 8e) */}
					<section
						data-testid="lab-order-create-panel"
						className={`${
							isCreateDrawerOpen ? "flex" : "hidden"
						} lg:flex lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[var(--line)] bg-[var(--paper-soft)] p-3.5 sm:p-4 flex-col gap-3 overflow-y-auto`}
					>
						<div className="flex items-center justify-between shrink-0">
							<h3 className="text-xs font-bold uppercase tracking-wide text-[var(--ink-muted)]">
								Экспресс-наряд у кресла
							</h3>
							<span className="text-[10px] font-semibold text-[var(--teal)] bg-[var(--teal-surface)] px-2 py-0.5 rounded-md border border-[var(--teal)]/30">
								1 клик
							</span>
						</div>

						{/* Пациент и врач */}
						<div className="bg-[var(--paper)] border border-[var(--line)] p-2 rounded-xl text-xs space-y-0.5 shrink-0">
							<div className="text-[var(--ink-muted)] truncate">
								Пациент: <strong className="text-[var(--ink)]">{patientName}</strong>
							</div>
							<div className="text-[var(--ink-muted)] truncate">
								Врач: <strong className="text-[var(--ink)]">{doctorName}</strong>
							</div>
						</div>

						{/* Зубы FDI: 2 аккуратные строки по челюстям без скролла */}
						<div className="shrink-0 space-y-1">
							<div className="flex items-center justify-between text-[11px] font-semibold text-[var(--ink)]">
								<span>Зубы FDI:</span>
								<span className="text-[var(--teal)] font-bold">
									{selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "16 (дефолт)"}
								</span>
							</div>

							<div className="p-1 bg-[var(--paper)] rounded-xl border border-[var(--line)] space-y-1">
								{/* Верхняя челюсть */}
								<div className="grid grid-cols-14 gap-0.5">
									{UPPER_JAW_TEETH.map((tooth) => {
										const isSel = selectedTeeth.includes(tooth);
										return (
											<button
												key={tooth}
												type="button"
												data-testid={`tooth-chip-${tooth}`}
												onClick={() => toggleTooth(tooth)}
												className={`h-6 rounded text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
													isSel
														? "bg-[var(--teal)] text-white"
														: "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)]"
												}`}
											>
												{tooth}
											</button>
										);
									})}
								</div>
								{/* Нижняя челюсть */}
								<div className="grid grid-cols-14 gap-0.5">
									{LOWER_JAW_TEETH.map((tooth) => {
										const isSel = selectedTeeth.includes(tooth);
										return (
											<button
												key={tooth}
												type="button"
												data-testid={`tooth-chip-${tooth}`}
												onClick={() => toggleTooth(tooth)}
												className={`h-6 rounded text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
													isSel
														? "bg-[var(--teal)] text-white"
														: "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)]"
												}`}
											>
												{tooth}
											</button>
										);
									})}
								</div>
							</div>
						</div>

						{/* Выбор материала */}
						<div className="shrink-0">
							<label className="block text-[11px] font-semibold text-[var(--ink)] mb-1">
								Материал и конструкция:
							</label>
							<select
								data-testid="lab-material-select"
								value={selectedMaterialId}
								onChange={(e) => setSelectedMaterialId(e.target.value)}
								className="w-full text-xs font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl px-2.5 py-1.5 outline-none focus:border-[var(--teal)]"
							>
								{CANONICAL_LAB_MATERIALS.map((mat) => (
									<option key={mat.id} value={mat.id}>
										{mat.titleRu} ({mat.defaultDurationDays} дн. / {formatKopecksToRubles(mat.baseLabCostKopecks)})
									</option>
								))}
							</select>
						</div>

						{/* Выбор цвета по шкале Vita: компактная сетка */}
						<div className="shrink-0">
							<div className="flex items-center justify-between text-[11px] font-semibold text-[var(--ink)] mb-1">
								<span>Цвет Vita:</span>
								<strong className="text-[var(--teal)]">{selectedShade}</strong>
							</div>
							<div className="flex flex-wrap gap-1 p-1 bg-[var(--paper)] rounded-xl border border-[var(--line)] max-h-20 overflow-y-auto">
								{VITA_SHADES_SSOT.map((v) => {
									const isSel = selectedShade === v.code;
									return (
										<button
											key={v.code}
											type="button"
											data-testid={`shade-chip-${v.code}`}
											onClick={() => setSelectedShade(v.code)}
											className={`px-1.5 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 transition-all cursor-pointer ${
												isSel
													? "border-[var(--teal)] bg-[var(--teal-surface)] text-[var(--teal)] ring-1 ring-[var(--teal)]"
													: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--line-strong)]"
											}`}
										>
											<span
												className="w-2 h-2 rounded-full border border-black/20 shrink-0"
												style={{ backgroundColor: v.approxHex }}
											/>
											{v.code}
										</button>
									);
								})}
							</div>
						</div>

						{/* Лаборатория и дата готовности */}
						<div className="grid grid-cols-2 gap-2 shrink-0">
							<div>
								<label className="block text-[11px] font-semibold text-[var(--ink)] mb-1">
									Лаборатория:
								</label>
								<select
									data-testid="lab-partner-select"
									value={selectedLab}
									onChange={(e) => setSelectedLab(e.target.value)}
									className="w-full text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl px-2 py-1.5"
								>
									{CLINIC_LABORATORIES.map((lab) => (
										<option key={lab} value={lab}>
											{lab}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-[11px] font-semibold text-[var(--ink)] mb-1">
									Срок готовности:
								</label>
								<input
									type="date"
									data-testid="lab-due-date-input"
									value={customDueDate}
									onChange={(e) => setCustomDueDate(e.target.value)}
									className="w-full text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl px-2 py-1.5"
								/>
							</div>
						</div>

						{/* Срочность и примечание */}
						<div className="space-y-1.5 shrink-0">
							<label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--ink)]">
								<input
									type="checkbox"
									data-testid="lab-urgent-checkbox"
									checked={isUrgent}
									onChange={(e) => setIsUrgent(e.target.checked)}
									className="rounded border-[var(--line)] text-[var(--teal)] focus:ring-[var(--teal)]"
								/>
								<span className="text-[var(--rose-ink,#e11d48)] font-semibold text-xs">
									Срочный наряд (экспресс)
								</span>
							</label>

							<input
								type="text"
								data-testid="lab-notes-input"
								placeholder="Примечание технику (уступ, прикус...)"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								className="w-full text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl px-2.5 py-1.5 placeholder:text-[var(--ink-muted)]"
							/>
						</div>

						{/* Финансовая сводка */}
						<div className="p-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl text-xs space-y-0.5 shrink-0">
							<div className="flex justify-between text-[var(--ink-muted)]">
								<span>Себестоимость ЗТЛ:</span>
								<strong className="text-[var(--ink)]">
									{formatKopecksToRubles(selectedMaterial.baseLabCostKopecks * (selectedTeeth.length || 1))}
								</strong>
							</div>
							<div className="flex justify-between text-[var(--ink-muted)]">
								<span>Прайс пациенту:</span>
								<strong className="text-[var(--ink)]">
									{formatKopecksToRubles(selectedMaterial.defaultPatientPriceKopecks * (selectedTeeth.length || 1))}
								</strong>
							</div>
							<div className="flex justify-between pt-1 border-t border-[var(--line)] font-bold">
								<span className="text-[var(--teal)]">Доход клиники:</span>
								<span className="text-[var(--teal)]">
									{formatKopecksToRubles(
										calcNetRevenueKopecks(
											selectedMaterial.defaultPatientPriceKopecks * (selectedTeeth.length || 1),
											selectedMaterial.baseLabCostKopecks * (selectedTeeth.length || 1),
										),
									)}
								</span>
							</div>
						</div>

						{/* РОВНО ОДНА Primary CTA кнопка #0d9488 (Мандат 8am & 8e: НИКОГДА НЕ DISABLED!) */}
						<div className="pt-1 mt-auto shrink-0 sticky bottom-0 bg-[var(--paper-soft)]">
							<button
								type="button"
								data-testid="submit-lab-order-button"
								onClick={handleCreateOrder}
								className="w-full h-11 rounded-xl bg-[var(--teal,#0d9488)] hover:brightness-110 active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-md shadow-[var(--teal)]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
							>
								<span>✓ Отправить заказ в лабораторию</span>
							</button>
						</div>
					</section>

					{/* Правая панель: Реестр текущих нарядов и фильтры */}
					<section
						data-testid="lab-orders-registry-panel"
						className="col-span-1 lg:col-span-7 p-3.5 sm:p-4 flex flex-col gap-2.5 min-h-0 overflow-y-auto"
					>
						{/* Фильтры и поиск */}
						<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2 border-b border-[var(--line)] shrink-0">
							{/* Чипы фильтрации в стиле iOS Settings (Без слепящих белых пятен в Dark Mode!) */}
							<div className="flex items-center gap-2 overflow-x-auto pb-1">
								<button
									type="button"
									data-testid="filter-tab-all"
									onClick={() => setActiveFilter("all")}
									className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
										activeFilter === "all"
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
											: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
									}`}
								>
									Все ({counts.all})
								</button>
								<button
									type="button"
									data-testid="filter-tab-in_work"
									onClick={() => setActiveFilter("in_work")}
									className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
										activeFilter === "in_work"
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
											: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
									}`}
								>
									В работе ({counts.in_work})
								</button>
								<button
									type="button"
									data-testid="filter-tab-in_clinic"
									onClick={() => setActiveFilter("in_clinic")}
									className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
										activeFilter === "in_clinic"
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
											: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
									}`}
								>
									В клинике ({counts.in_clinic})
								</button>
								<button
									type="button"
									data-testid="filter-tab-overdue"
									onClick={() => setActiveFilter("overdue")}
									className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
										activeFilter === "overdue"
											? "bg-[var(--rose-surface,#fee2e2)] text-[var(--rose-ink,#991b1b)] border-[var(--rose,#ef4444)] font-bold"
											: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
									}`}
								>
									Просрочены ({counts.overdue})
								</button>
							</div>

							{/* Поле поиска */}
							<div className="relative min-w-[160px] sm:w-48 shrink-0">
								<input
									type="text"
									data-testid="lab-orders-search-input"
									placeholder="Поиск по пациенту, зубу..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full text-xs bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] rounded-xl pl-3 pr-7 py-1.5 outline-none focus:border-[var(--teal)] placeholder:text-[var(--ink-muted)]"
								/>
								{searchQuery && (
									<button
										type="button"
										onClick={() => setSearchQuery("")}
										className="absolute right-2 top-1.5 text-xs text-[var(--ink-muted)] cursor-pointer"
									>
										✕
									</button>
								)}
							</div>
						</div>

						{/* Список нарядов: Группированные карточки (Apple HIG & 44px touch targets) */}
						<div className="space-y-2.5 overflow-y-auto pr-0.5 flex-1 min-h-0">
							{filteredOrders.length === 0 ? (
								<div
									data-testid="empty-lab-orders-state"
									className="text-center py-12 border border-dashed border-[var(--line)] rounded-2xl bg-[var(--paper-soft)] text-[var(--ink-muted)] text-xs"
								>
									Нарядов в выбранной категории не обнаружено
								</div>
							) : (
								filteredOrders.map((ord) => {
									const stageMeta = getStageMeta(ord.stage);
									const matMeta = getMaterialMeta(ord.materialId);
									const overdue = isOrderOverdue(ord);

									return (
										<article
											key={ord.id}
											data-testid={`lab-order-card-${ord.id}`}
											className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl p-3 sm:p-3.5 hover:border-[var(--line-strong)] transition-all space-y-2"
										>
											{/* Верхняя строка карточки: Номер, Срочность и Статус */}
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
													<span className="text-[11px] text-[var(--ink-muted)] truncate max-w-[180px]">
														{ord.laboratoryName}
													</span>
												</div>

												{/* Бейдж этапа */}
												<span
													data-testid={`order-stage-badge-${ord.id}`}
													className="text-[11px] font-bold px-2.5 py-0.5 rounded-xl border flex items-center gap-1.5 shrink-0"
													style={{
														backgroundColor: stageMeta.bgToken,
														borderColor: stageMeta.borderToken,
														color: stageMeta.textToken,
													}}
												>
													<span
														className="w-1.5 h-1.5 rounded-full"
														style={{ backgroundColor: stageMeta.borderToken }}
													/>
													{stageMeta.labelRu}
												</span>
											</div>

											{/* Данные пациента и зубов */}
											<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
												<div className="min-w-0">
													<strong className="text-[var(--ink)] text-xs sm:text-sm block truncate">
														{ord.patientName}
													</strong>
													<div className="text-[11px] text-[var(--ink-muted)] truncate">
														{matMeta.titleRu} • Оттенок Vita:{" "}
														<strong className="text-[var(--ink)]">{ord.shadeCode}</strong>
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
												{CANONICAL_LAB_STAGES.map((st) => {
													const isDone = st.stepNumber <= stageMeta.stepNumber;
													const isCurrent = st.id === ord.stage;
													return (
														<div
															key={st.id}
															title={st.labelRu}
															className={`h-1.5 rounded-full transition-all ${
																isCurrent
																	? "bg-[var(--teal)] ring-1 ring-[var(--teal)]"
																	: isDone
																		? "bg-[var(--teal)]/70"
																		: "bg-[var(--line)]"
															}`}
														/>
													);
												})}
											</div>

											{/* Нижняя информационная строка и действие */}
											<div className="flex items-center justify-between pt-1.5 border-t border-[var(--line)] flex-wrap gap-2 text-xs">
												<div className="flex items-center gap-2.5">
													<span
														className={
															overdue
																? "font-bold text-[var(--rose-ink,#991b1b)]"
																: "text-[var(--ink-muted)]"
														}
													>
														Срок: {ord.dueDate} {overdue && "⚠️ (Просрочен)"}
													</span>
													<span className="text-[var(--ink-muted)] hidden sm:inline text-[11px]">
														Себестоимость:{" "}
														<strong className="text-[var(--ink)]">
															{formatKopecksToRubles(ord.labCostKopecks)}
														</strong>
													</span>
												</div>

												{/* Кнопка смены этапа (Вторичная нейтральная кнопка без #0d9488 — Мандат 8am) */}
												{ord.stage !== "seated" && (
													<button
														type="button"
														data-testid={`advance-stage-btn-${ord.id}`}
														onClick={() => handleAdvanceStage(ord.id)}
														className="px-2.5 py-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-xs transition-colors flex items-center gap-1 min-h-[32px] cursor-pointer"
													>
														<span>Перевести этап →</span>
													</button>
												)}
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

export default DentalLabStudioModal;
