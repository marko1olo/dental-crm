/**
 * apps/web/src/components/sanpin/SanPinJournalView.tsx
 *
 * Единый канонический экран журнала стерилизации и автоклавирования.
 * Интегрирует SterilizationJournalTable и SterilizationCycleDrawer.
 * Apple iOS HIG & Touch Ergonomics (сенсорный минимум >= 44x44px).
 * Мандат 8x: Чистый клинический язык без советского канцелярита и номеров приказов.
 * Мандат 8e: Автономия врача и медсестры, кнопка утверждения не блокируется.
 */

import React, { useState } from "react";
import { ShieldCheck, Sparkles, Plus, Printer, Download } from "lucide-react";
import { SterilizationCycleDrawer } from "../sterilization/SterilizationCycleDrawer";
import { SterilizationJournalTable } from "../sterilization/SterilizationJournalTable";
import { useSanPinJournalLogic } from "./journalModules/useSanPinJournalLogic";
import { showToast } from "../GlobalToast";

export interface SanPinJournalViewProps {
	readonly initialFilterAutoclave?: string;
	readonly onAttachPouchToVisit?: (pouchCode: string, snippet: string) => void;
	readonly className?: string;
}

export function SanPinJournalView({
	initialFilterAutoclave = "all",
	onAttachPouchToVisit,
	className = "",
}: SanPinJournalViewProps) {
	const [isCycleDrawerOpen, setIsCycleDrawerOpen] = useState(false);

	const {
		filteredCycles,
		isAutofilling,
		fetchCyclesFromDb,
		handleQuickBatchNorm,
		handlePrint257,
		handleExportCsv,
	} = useSanPinJournalLogic({
		onAttachPouchToVisit,
		initialFilterAutoclave,
	});

	const handleOpenDrawer = () => {
		setIsCycleDrawerOpen(true);
	};

	const handleCloseDrawer = () => {
		setIsCycleDrawerOpen(false);
	};

	const handleCycleApproved = () => {
		fetchCyclesFromDb();
		showToast("Цикл автоклава успешно добавлен в журнал", "success");
	};

	const handleQuickShift = () => {
		handleQuickBatchNorm(14, "134", "Смена ЦСО — стандарт 134°C");
	};

	return (
		<div className={`sanpin-journal-view flex flex-col gap-4 p-3 sm:p-5 max-w-7xl mx-auto w-full ${className}`}>
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[var(--line,#e2e8f0)] dark:border-[#334155]">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
						<ShieldCheck size={22} />
					</div>
					<div>
						<h1 className="text-lg sm:text-xl font-bold text-[var(--ink,#0f172a)] m-0 leading-tight">
							Журнал стерилизации и автоклава
						</h1>
						<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
							Контроль циклов автоклавирования, химических индикаторов 5 класса и качества очистки
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
					<button
						type="button"
						onClick={handleOpenDrawer}
						className="primary-button h-10 px-4 rounded-xl text-xs font-bold bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-xs inline-flex items-center gap-1.5 touch-manipulation cursor-pointer transition-all"
						data-testid="journal-view-new-cycle-cta"
					>
						<Plus size={16} />
						<span>+ Новый цикл</span>
					</button>
				</div>
			</div>

			{/* Main Journal Table */}
			<SterilizationJournalTable
				cycles={filteredCycles}
				onOpenNewCycle={handleOpenDrawer}
				onQuickBatchShift={handleQuickShift}
				onPrintJournal={handlePrint257}
				onExportCsv={handleExportCsv}
				isAutofilling={isAutofilling}
			/>

			{/* 1-Click Clinical Autoclave Drawer (Bottom Sheet) */}
			<SterilizationCycleDrawer
				isOpen={isCycleDrawerOpen}
				onClose={handleCloseDrawer}
				onCycleApproved={handleCycleApproved}
			/>
		</div>
	);
}

export default SanPinJournalView;
