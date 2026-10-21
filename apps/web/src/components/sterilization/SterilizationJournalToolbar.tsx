/**
 * apps/web/src/components/sterilization/SterilizationJournalToolbar.tsx
 *
 * Верхний тулбар таблицы: поиск, селектор аппарата ЦСО, быстрые кнопки смены и печати.
 * Мандат 8b: строго <= 120 строк.
 */

import { Download, Plus, Printer, Search, Sparkles } from "lucide-react";

export interface SterilizationJournalToolbarProps {
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly selectedDevice: string;
	readonly onSelectedDeviceChange: (dev: string) => void;
	readonly onQuickBatchShift?: (() => void) | undefined;
	readonly onOpenNewCycle?: (() => void) | undefined;
	readonly onPrintJournal?: (() => void) | undefined;
	readonly onExportCsv?: (() => void) | undefined;
	readonly isAutofilling?: boolean | undefined;
}

export function SterilizationJournalToolbar({
	searchQuery,
	onSearchQueryChange,
	selectedDevice,
	onSelectedDeviceChange,
	onQuickBatchShift,
	onOpenNewCycle,
	onPrintJournal,
	onExportCsv,
	isAutofilling = false,
}: SterilizationJournalToolbarProps) {
	return (
		<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[#334155] shadow-xs">
			<div className="flex items-center gap-2.5 flex-1 min-w-0">
				<div className="relative flex-1 min-w-[180px] max-w-sm">
					<Search
						size={15}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)] pointer-events-none"
					/>
					<input
						type="text"
						placeholder="Поиск по циклу, аппарату, наборам..."
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
						className="w-full text-xs font-medium rounded-xl pl-8 pr-3 py-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[44px]"
						data-testid="sterilization-journal-search-input"
					/>
				</div>
				<select
					value={selectedDevice}
					onChange={(e) => onSelectedDeviceChange(e.target.value)}
					className="text-xs font-semibold rounded-xl px-3 py-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[44px]"
					data-testid="sterilization-journal-device-filter"
				>
					<option value="all">Все аппараты ЦСО</option>
					<option value="АК-01">АК-01 (Melag Vacuklav)</option>
					<option value="АК-02">АК-02 (W&H Lisa)</option>
				</select>
			</div>
			<div className="flex items-center gap-2 flex-wrap shrink-0">
				{onQuickBatchShift && (
					<button
						type="button"
						onClick={onQuickBatchShift}
						aria-busy={isAutofilling}
						className="h-10 px-3.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer touch-manipulation min-h-[44px]"
						data-testid="sterilization-journal-quick-shift-btn"
					>
						<Sparkles size={15} />
						<span>Сдать смену ЦСО</span>
					</button>
				)}
				{onOpenNewCycle && (
					<button
						type="button"
						onClick={onOpenNewCycle}
						className="h-10 px-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer touch-manipulation min-h-[44px]"
						data-testid="sterilization-journal-new-cycle-btn"
					>
						<Plus size={14} />
						<span>+ Новый цикл</span>
					</button>
				)}
				{onPrintJournal && (
					<button
						type="button"
						onClick={onPrintJournal}
						className="h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer touch-manipulation min-h-[44px]"
					>
						<Printer size={14} />
						<span>Печать</span>
					</button>
				)}
				{onExportCsv && (
					<button
						type="button"
						onClick={onExportCsv}
						className="h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer touch-manipulation min-h-[44px]"
					>
						<Download size={14} />
						<span>CSV</span>
					</button>
				)}
			</div>
		</div>
	);
}
