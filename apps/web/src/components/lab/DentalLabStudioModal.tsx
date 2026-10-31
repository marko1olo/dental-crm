/**
 * apps/web/src/components/lab/DentalLabStudioModal.tsx
 *
 * DENTE Dental CRM — Canonical Dental Laboratory Studio & Orthopedic Orders Modal.
 * SSOT for lab orders, Vita shade matching, FDI teeth tracking, 5-stage workflow,
 * doctor autonomy (Mandate 8e: 1-click chairside express order, button NEVER disabled),
 * Apple HIG mobile ergonomics (390x844 Bottom Sheet), and single Primary CTA (#0d9488, Mandate 8am).
 * Target size: 200-260 lines (Mandate 8b Sweet Spot).
 */

import React from "react";
import type { DentalLabOrderEntry } from "./dentalLabCatalogData";
import {
	LabFdiTeethSelector,
	LabWorkTypeSelector,
	LabShadeSelectionSection,
	LabOrderFinancialSummary,
	LabOrdersRegistryView,
	useDentalLabStudio,
} from "./studioModal";

export interface DentalLabStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialToothFdi?: string | number;
	readonly patientName?: string;
	readonly doctorName?: string;
	readonly onOrderCreated?: (order: DentalLabOrderEntry) => void;
}

export const DentalLabStudioModal: React.FC<DentalLabStudioModalProps> = ({
	isOpen,
	onClose,
	initialToothFdi = "16",
	patientName = "Ковалев Дмитрий Сергеевич",
	doctorName = "Д-р Смирнова Е. В. (Ортопед)",
	onOrderCreated,
}) => {
	const studio = useDentalLabStudio({
		initialToothFdi,
		patientName,
		doctorName,
		onOrderCreated,
	});

	if (!isOpen) return null;

	return (
		<div
			data-testid="dental-lab-studio-modal-root"
			className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto"
			role="dialog"
			aria-modal="true"
		>
			<div className="w-full max-w-5xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col h-[94vh] max-h-[860px] overflow-hidden max-w-[100vw]">
				{/* Apple HIG: Тактильный Drag Handle на смартфонах (36x5px по центру) */}
				<div className="sm:hidden flex justify-center pt-2 pb-1 bg-[var(--paper-strong)]">
					<div className="w-9 h-1 rounded-full bg-[var(--line-strong,#94a3b8)] opacity-60" />
				</div>

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
							onClick={() => studio.setIsCreateDrawerOpen(!studio.isCreateDrawerOpen)}
							className="sm:hidden px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] min-h-[36px] flex items-center gap-1 cursor-pointer"
						>
							{studio.isCreateDrawerOpen ? "К нарядам" : "+ Новый наряд"}
						</button>

						<button
							type="button"
							data-testid="close-lab-studio-button"
							onClick={onClose}
							className="p-1.5 rounded-xl border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
							aria-label="Закрыть окно лаборатории"
						>
							<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</div>
				</header>

				{/* Всплывающий тост обратной связи */}
				{studio.feedbackToast && (
					<div
						data-testid="lab-feedback-toast"
						className="px-4 py-2 bg-[var(--teal-surface)] border-b border-[var(--teal)]/40 text-[var(--teal)] text-xs font-semibold flex items-center justify-between shrink-0"
					>
						<span>✓ {studio.feedbackToast}</span>
						<button
							type="button"
							onClick={() => studio.setFeedbackToast(null)}
							className="text-[var(--teal)] hover:opacity-75 text-xs font-bold ml-2 cursor-pointer"
						>
							Скрыть
						</button>
					</div>
				)}

				{/* 2. Основное тело студии: 2 колонки на ПК */}
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
					{/* Левая панель: Экспресс-наряд у кресла (Мандат 8e) */}
					<section
						data-testid="lab-order-create-panel"
						className={`${
							studio.isCreateDrawerOpen ? "flex" : "hidden"
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

						{/* Модуль 1: Выбор зубов FDI */}
						<LabFdiTeethSelector
							selectedTeeth={studio.selectedTeeth}
							onToggleTooth={studio.toggleTooth}
						/>

						{/* Модуль 2: Материал, лаборатория, срок, срочность и примечание */}
						<LabWorkTypeSelector
							selectedMaterialId={studio.selectedMaterialId}
							onSelectMaterialId={studio.setSelectedMaterialId}
							selectedLab={studio.selectedLab}
							onSelectLab={studio.setSelectedLab}
							customDueDate={studio.customDueDate}
							onChangeDueDate={studio.setCustomDueDate}
							isUrgent={studio.isUrgent}
							onToggleUrgent={studio.setIsUrgent}
							notes={studio.notes}
							onChangeNotes={studio.setNotes}
						/>

						{/* Модуль 3: Палитра оттенков Vita */}
						<LabShadeSelectionSection
							selectedShade={studio.selectedShade}
							onSelectShade={studio.setSelectedShade}
						/>

						{/* Модуль 4: Финансовая сводка ортопедии */}
						<LabOrderFinancialSummary
							material={studio.selectedMaterial}
							teethCount={studio.selectedTeeth.length}
						/>

						{/* РОВНО ОДНА Primary CTA кнопка #0d9488 (Мандат 8am & 8e: НИКОГДА НЕ DISABLED!) */}
						<div className="pt-1 mt-auto shrink-0 sticky bottom-0 bg-[var(--paper-soft)]">
							<button
								type="button"
								data-testid="submit-lab-order-button"
								onClick={studio.handleCreateOrder}
								className="w-full h-11 rounded-xl bg-[var(--teal,#0d9488)] hover:brightness-110 active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-md shadow-[var(--teal)]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
							>
								<span>✓ Отправить заказ в лабораторию</span>
							</button>
						</div>
					</section>

					{/* Правая панель: Модуль 5 - Реестр нарядов, фильтры и прогресс */}
					<LabOrdersRegistryView
						orders={studio.filteredOrders}
						activeFilter={studio.activeFilter}
						onSelectFilter={studio.setActiveFilter}
						searchQuery={studio.searchQuery}
						onSearchChange={studio.setSearchQuery}
						counts={studio.counts}
						onAdvanceStage={studio.handleAdvanceStage}
					/>
				</div>
			</div>
		</div>
	);
};

export default DentalLabStudioModal;
