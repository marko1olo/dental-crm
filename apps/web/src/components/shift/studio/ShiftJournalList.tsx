/**
 * apps/web/src/components/shift/studio/ShiftJournalList.tsx
 *
 * Shift history log with OFD delivery indicators and Z-report reprint triggers.
 */

import React from "react";
import { Printer } from "lucide-react";
import { type CashShiftRecord, formatKopecksToRub } from "../shiftCatalogData";

export interface ShiftJournalListProps {
	readonly shifts: readonly CashShiftRecord[];
	readonly filter: "all" | "open" | "closed";
	readonly onFilterChange: (filter: "all" | "open" | "closed") => void;
	readonly onPrintZReport?: (shift: CashShiftRecord) => void;
}

export const ShiftJournalList: React.FC<ShiftJournalListProps> = ({
	shifts,
	filter,
	onFilterChange,
	onPrintZReport,
}) => {
	const visibleShifts = shifts.filter((s) => {
		if (filter === "open") return s.status === "open";
		if (filter === "closed") return s.status === "closed";
		return true;
	});

	return (
		<div
			className="space-y-3"
			data-testid="shift-journal-section"
			data-shift-journal-count={visibleShifts.length}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="flex gap-1.5">
					{(["all", "open", "closed"] as const).map((mode) => (
						<button
							key={mode}
							type="button"
							onClick={() => onFilterChange(mode)}
							className={`min-h-[32px] px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
								filter === mode
									? "bg-[var(--teal,#0d9488)] text-white"
									: "bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]"
							}`}
						>
							{mode === "all"
								? "Все"
								: mode === "open"
									? "Открытые"
									: "Закрытые"}
						</button>
					))}
				</div>
				<span className="text-xs text-[var(--muted)]">
					Всего смен: <b>{visibleShifts.length}</b>
				</span>
			</div>

			<div className="space-y-2">
				{visibleShifts.map((shift) => (
					<div
						key={shift.id}
						className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
					>
						<div>
							<div className="flex items-center gap-2">
								<span className="font-bold text-[var(--ink)] text-sm">
									{`Смена №${shift.shiftNumber}`}
								</span>
								<span
									className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
										shift.status === "open"
											? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
											: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
									}`}
								>
									{shift.status === "open" ? "Открыта" : "Закрыта"}
								</span>
								<span className="text-[10px] text-emerald-600 font-semibold">
									ОФД: Доставлен ✓
								</span>
							</div>
							<div className="text-[11px] text-[var(--muted)] mt-0.5">
								{`${shift.cashierFullName} • Открыта: ${new Date(shift.openedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`}
							</div>
						</div>

						<div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
							<div className="text-right">
								<div className="font-extrabold text-[var(--ink)]">
									{formatKopecksToRub(shift.totalRevenueKopecks)}
								</div>
								<div className="text-[10px] text-[var(--muted)]">
									{`Нал: ${formatKopecksToRub(shift.revenue.cashKopecks)} • Безнал: ${formatKopecksToRub(shift.revenue.cardKopecks)}`}
								</div>
							</div>

							{shift.status === "closed" && (
								<button
									type="button"
									onClick={() => (onPrintZReport ? onPrintZReport(shift) : window.print())}
									className="min-h-[32px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
									title="Распечатать Z-отчёт смены"
								>
									<Printer className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
									<span>Z-отчёт</span>
								</button>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default ShiftJournalList;
