import React from "react";
import { AlertTriangle, X, Zap } from "lucide-react";

export interface SlotConflictInlineViewProps {
	readonly isDoctorConflict: boolean;
	readonly isChairConflict: boolean;
	readonly onClose: () => void;
	readonly onOverbook?: (() => void) | undefined;
	readonly children: React.ReactNode;
}

export const SlotConflictInlineView: React.FC<SlotConflictInlineViewProps> = ({
	isDoctorConflict,
	isChairConflict,
	onClose,
	onOverbook,
	children,
}) => (
	<div
		className="w-full bg-[var(--paper,#ffffff)] border-2 border-amber-500/50 rounded-2xl shadow-md text-[var(--ink,#0f172a)] flex flex-col overflow-hidden animate-fade-in"
		data-testid="slot-conflict-modal"
		role="region"
		aria-label="Конфликт времени записи"
	>
		<div className="p-3 sm:p-4 border-b border-[var(--line,#e2e8f0)] bg-amber-500/15 flex items-center justify-between">
			<div className="flex items-center gap-2.5">
				<div className="w-8 h-8 rounded-lg bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0">
					<AlertTriangle className="w-4 h-4" />
				</div>
				<div>
					<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] m-0 leading-tight">
						{isDoctorConflict
							? "Врач занят в это время"
							: isChairConflict
								? "Кресло занято в это время"
								: "Выбранное время уже занято"}
					</h4>
					<p className="text-[11px] text-[var(--muted,#64748b)] m-0">
						Сдвиньте время, перенесите на свободное кресло или запишите внахлёст (острая боль)
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="secondary-button min-h-[36px] min-w-[36px] rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-colors cursor-pointer"
				aria-label="Закрыть предупреждение"
			>
				<X className="w-4 h-4" />
			</button>
		</div>

		<div className="p-3 sm:p-4">{children}</div>

		<div className="p-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-wrap items-center justify-between gap-2">
			<button
				type="button"
				onClick={onClose}
				className="secondary-button min-h-[40px] px-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold transition-colors cursor-pointer"
			>
				Закрыть
			</button>

			{onOverbook && (
				<button
					type="button"
					data-testid="slot-conflict-overbook-btn"
					onClick={() => { onOverbook(); onClose(); }}
					className="primary-button min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
					title="Записать в это же время (совмещение слотов для острой боли)"
				>
					<Zap className="w-4 h-4" />
					<span>Записать всё равно (острая боль)</span>
				</button>
			)}
		</div>
	</div>
);
