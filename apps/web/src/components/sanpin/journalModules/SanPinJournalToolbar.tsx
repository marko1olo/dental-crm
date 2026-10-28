import React from "react";
import { Search, Plus, Settings, Download, Printer, Sparkles } from "lucide-react";
import type { SanPinJournalPeriod } from "./sanpinJournalTypes";

export interface SanPinJournalToolbarProps {
	readonly selectedAutoclave: string;
	readonly onSelectAutoclave: (val: string) => void;
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly isAutofilling?: boolean;
	readonly onAutofillNorms?: () => void;
	readonly onPrintSterilizationLog?: (() => void) | undefined;
	readonly onPrintForm257?: (() => void) | undefined;
	readonly onExportCsv: () => void;
	readonly onOpenEquipmentModal?: (() => void) | undefined;
	readonly onOpenNewCycleModal?: (() => void) | undefined;
	readonly period?: SanPinJournalPeriod | undefined;
	readonly onPeriodChange?: ((p: SanPinJournalPeriod) => void) | undefined;
	readonly onQuickBatchNorm?: ((batchSize: number, regime: "134" | "121", cycleName?: string) => void) | undefined;
	readonly onQuickPsoNorm?: (() => void) | undefined;
}

const BTN_SEC = "secondary-button sanpin-desktop-only-btn h-8 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] px-2.5 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all";

export const SanPinJournalToolbar: React.FC<SanPinJournalToolbarProps> = ({
	selectedAutoclave, onSelectAutoclave, searchQuery, onSearchChange, onExportCsv,
	onOpenEquipmentModal, onOpenNewCycleModal, period = "day", onPeriodChange,
	onPrintForm257, onPrintSterilizationLog, onQuickBatchNorm,
}) => (
	<div className="sanpin-journal-toolbar flex items-center justify-between gap-2.5 flex-wrap p-2 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] max-w-full overflow-x-clip">
		<div className="flex items-center gap-2 flex-wrap">
			{onPeriodChange && (
				<div className="inline-flex bg-[var(--paper,#fff)] border border-[var(--line,#cbd5e1)] rounded-lg p-0.5 gap-0.5">
					{(["day", "week", "month"] as const).map((p) => {
						const label = p === "day" ? "Сегодня" : p === "week" ? "Неделя" : "Месяц";
						const active = period === p;
						return (
							<button
								key={p} type="button" onClick={() => onPeriodChange(p)} className="secondary-button"
								style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "none", background: active ? "var(--teal, #0d9488)" : "transparent", color: active ? "#ffffff" : "var(--muted, #64748b)", fontSize: "0.75rem", fontWeight: active ? 600 : 500, cursor: "pointer" }}
							>
								{label}
							</button>
						);
					})}
				</div>
			)}
			<select
				value={selectedAutoclave} onChange={(e) => onSelectAutoclave(e.target.value)}
				className="secondary-button h-8 min-h-[32px] px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#fff)] text-xs text-[var(--ink,#1e293b)] cursor-pointer"
			>
				<option value="all">Все автоклавы</option>
				<option value="АК-01">АК-01 (Melag Vacuklav 23B+)</option>
				<option value="АК-02">АК-02 (W&H Lina 17)</option>
			</select>
		</div>

		<div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
			<div className="relative inline-flex items-center w-full sm:w-auto">
				<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)] pointer-events-none" />
				<input
					type="text"
					placeholder="Поиск по набору..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					className="h-9 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#fff)] text-xs text-[var(--ink,#1e293b)] w-full sm:w-60 focus:outline-none"
					style={{ paddingLeft: 36, paddingRight: 10 }}
				/>
			</div>
			{onQuickBatchNorm && (
				<button type="button" onClick={() => onQuickBatchNorm(27, "134")} className={BTN_SEC} data-testid="toolbar-batch-btn" title="Пакетная стерилизация смены">
					<Sparkles size={13} />
					<span>Пакетная стерилизация смены</span>
				</button>
			)}
			{onOpenNewCycleModal && (
				<button type="button" onClick={onOpenNewCycleModal} className={BTN_SEC} data-testid="start-cycle-btn" title="Зафиксировать цикл автоклава вручную">
					<Plus size={13} />
					<span>Новый цикл</span>
				</button>
			)}
			{onOpenEquipmentModal && (
				<button type="button" onClick={onOpenEquipmentModal} className={BTN_SEC} data-testid="equipment-modal-btn" title="Оборудование ЦСО">
					<Settings size={13} />
					<span>Оборудование</span>
				</button>
			)}
			<button type="button" onClick={onExportCsv} className={BTN_SEC} data-testid="export-csv-btn" title="Экспорт в CSV">
				<Download size={13} />
				<span>CSV</span>
			</button>
		</div>
	</div>
);

export default SanPinJournalToolbar;
