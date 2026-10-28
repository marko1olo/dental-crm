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
 * Мобильный селектор статусов канбан-доски ЗТЛ (Apple HIG Segmented Bar, Mandate 8b: <= 120 строк).
 * Сенсорный минимум >= 44x44px, Natural Thumb Zone, 0px паразитного горизонтального скролла,
 * flex-nowrap с плавной прокруткой и чипами без наездов иконок на русский текст.
 */
export function KanbanMobileStageSelector({
	columns,
	activeStageId,
	onSelectStage,
	counts,
}: KanbanMobileStageSelectorProps) {
	return (
		<nav
			className="flex items-center gap-2 p-1.5 bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-soft,#1e293b)] border border-[var(--line)] rounded-2xl shadow-2xs overflow-x-auto flex-nowrap shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
						className={`shrink-0 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer select-none whitespace-nowrap active:scale-[0.98] ${
							isActive
								? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)]"
						}`}
						data-testid={`mobile-stage-chip-${col.id}`}
						aria-pressed={isActive}
					>
						<span className="shrink-0 flex items-center text-current">{col.icon}</span>
						<span className="font-medium text-[12px]">{col.shortTitle}</span>
						<span
							className={`min-w-[20px] h-5 px-1.5 rounded-full inline-flex items-center justify-center text-[11px] font-bold ${
								isActive
									? "bg-white/25 text-white"
									: "bg-[var(--paper-soft)] text-[var(--muted)]"
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
