import React from "react";
import type { CanonicalKanbanColumnDef } from "../DentalLabOrdersKanbanBoard";
import type { CanonicalKanbanStageId } from "../DentalLabKanbanCard";

export interface KanbanMobileStageSelectorProps {
	readonly columns: readonly CanonicalKanbanColumnDef[];
	readonly activeStageId: CanonicalKanbanStageId;
	readonly onSelectStage: (stageId: CanonicalKanbanStageId) => void;
	readonly counts: Record<CanonicalKanbanStageId, number>;
}

/**
 * Мобильный селектор статусов канбан-доски (Apple HIG Segmented Bar, Mandate 8b: <= 120 строк).
 * Сенсорный минимум >= 44x44px, Natural Thumb Zone, 0px паразитного горизонтального скролла.
 */
export function KanbanMobileStageSelector({
	columns,
	activeStageId,
	onSelectStage,
	counts,
}: KanbanMobileStageSelectorProps) {
	return (
		<nav
			className="flex items-center gap-1.5 p-1 bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-soft,#1e293b)] border border-[var(--line)] rounded-2xl shadow-2xs overflow-x-auto no-scrollbar shrink-0"
			aria-label="Выбор статуса нарядов ЗТЛ"
			data-testid="kanban-mobile-stage-selector"
		>
			{columns.map((col) => {
				const isActive = activeStageId === col.id;
				const count = counts[col.id] ?? 0;
				return (
					<button
						key={col.id}
						type="button"
						onClick={() => onSelectStage(col.id)}
						className={`flex-1 min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none whitespace-nowrap active:scale-[0.98] ${
							isActive
								? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
								: "bg-transparent text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
						}`}
						data-testid={`mobile-stage-chip-${col.id}`}
						aria-pressed={isActive}
					>
						<span className="shrink-0">{col.icon}</span>
						<span>{col.shortTitle}</span>
						<span
							className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
								isActive
									? "bg-white/25 text-white"
									: "bg-[var(--paper)] dark:bg-[var(--paper)] text-[var(--muted)]"
							}`}
						>
							{count}
						</span>
					</button>
				);
			})}
		</nav>
	);
}
