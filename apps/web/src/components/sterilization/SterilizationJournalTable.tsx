/**
 * apps/web/src/components/sterilization/SterilizationJournalTable.tsx
 *
 * Журнал работы стерилизаторов (DENTE Apple HIG).
 * Мандат 8x: Человеческий язык без советского канцелярита и номеров приказов.
 * Мандат 8e: Автономия врача и медсестры ЦСО, быстрые действия в 1 клик.
 * Мандат 8b: строго <= 120 строк.
 */

import { Download, Plus, Printer, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { SanPinCyclesTable } from "../sanpin/journalModules/SanPinCyclesTable";
import { DEFAULT_CYCLES } from "../sanpin/journalModules/sanpinDefaultCycles";
import type { SanPinCycleEntry } from "../sanpin/journalModules/sanpinJournalTypes";

export interface SterilizationJournalTableProps {
	readonly cycles?: readonly SanPinCycleEntry[];
	readonly onOpenNewCycle?: () => void;
	readonly onQuickBatchShift?: () => void;
	readonly onPrintJournal?: () => void;
	readonly onExportCsv?: () => void;
	readonly isAutofilling?: boolean;
	readonly className?: string;
}

export function SterilizationJournalTable({
	cycles = DEFAULT_CYCLES,
	onOpenNewCycle,
	onQuickBatchShift,
	onPrintJournal,
	onExportCsv,
	isAutofilling = false,
	className = "",
}: SterilizationJournalTableProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedDevice, setSelectedDevice] = useState("all");

	const filteredCycles = useMemo(() => {
		return cycles.filter((cyc) => {
			if (selectedDevice !== "all" && cyc.autoclaveCode !== selectedDevice)
				return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const text =
					`${cyc.date} ${cyc.autoclaveCode} ${cyc.autoclaveModel} ${cyc.itemsSummary} ${cyc.operatorName} ${cyc.regimeName}`.toLowerCase();
				if (!text.includes(q)) return false;
			}
			return true;
		});
	}, [cycles, selectedDevice, searchQuery]);

	return (
		<div
			className={`sterilization-journal-table-root flex flex-col gap-3.5 ${className}`}
			style={{ maxWidth: "100%", overflowX: "clip" }}
		>
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
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full text-xs font-medium rounded-xl pl-8 pr-3 py-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[44px]"
							data-testid="sterilization-journal-search-input"
						/>
					</div>
					<select
						value={selectedDevice}
						onChange={(e) => setSelectedDevice(e.target.value)}
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
			<SanPinCyclesTable
				cycles={filteredCycles}
				isAutofilling={isAutofilling}
				{...(onQuickBatchShift ? { onAutofillShift: onQuickBatchShift } : {})}
			/>
		</div>
	);
}

export default SterilizationJournalTable;
