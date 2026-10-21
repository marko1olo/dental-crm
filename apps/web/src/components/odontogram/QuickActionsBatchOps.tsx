import { ArrowLeftRight, ShieldCheck, X } from "lucide-react";
import type React from "react";

export interface QuickActionsBatchOpsProps {
	readonly pediatricMode?: boolean | undefined;
	readonly onSanitizeAll: () => void;
	readonly onWisdomMissing: () => void;
	readonly onInvert: () => void;
	readonly onClear: () => void;
}

export const QuickActionsBatchOps: React.FC<QuickActionsBatchOpsProps> = ({
	pediatricMode,
	onSanitizeAll,
	onWisdomMissing,
	onInvert,
	onClear,
}) => {
	const closeDetails = (e: React.MouseEvent) => {
		const details = e.currentTarget.closest("details");
		if (details) details.open = false;
	};

	return (
		<div>
			<div className="text-xs font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-1 mb-1 select-none">
				Пакетные операции
			</div>
			<div className="flex items-center gap-1.5 mb-1.5">
				<button
					type="button"
					onClick={(e) => {
						closeDetails(e);
						onSanitizeAll();
					}}
					className="flex-1 h-7 px-2 rounded-lg text-xs font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-98"
					title="Физиологическая норма: вся челюсть помечается здоровой"
					data-testid="mark-intact-dentition-dropdown-btn"
				>
					<ShieldCheck
						size={13}
						className="text-emerald-600 dark:text-emerald-400 shrink-0"
					/>
					<span>Санирован</span>
				</button>
				{!pediatricMode && (
					<button
						type="button"
						onClick={(e) => {
							closeDetails(e);
							onWisdomMissing();
						}}
						className="flex-1 h-7 px-2 rounded-lg text-xs font-black bg-zinc-500/15 hover:bg-zinc-500/25 text-zinc-800 dark:text-zinc-200 border border-zinc-500/30 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-98"
						title="Первичная адентия третьих моляров (18, 28, 38, 48)"
						data-testid="mark-wisdom-missing-btn"
					>
						<X size={13} className="text-zinc-500 shrink-0" />
						<span>Без 8-ок</span>
					</button>
				)}
			</div>
			<div className="flex items-center gap-1.5">
				<button
					type="button"
					onClick={(e) => {
						closeDetails(e);
						onInvert();
					}}
					className="flex-1 h-7 px-2 rounded-lg text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 border border-indigo-500/25 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-98"
					title="Инвертировать выделение зубов"
					data-testid="invert-selection-btn invert-selection-dropdown-btn"
				>
					<ArrowLeftRight
						size={12}
						className="text-indigo-600 dark:text-indigo-400 shrink-0"
					/>
					<span>Инвертировать</span>
				</button>
				<button
					type="button"
					onClick={(e) => {
						closeDetails(e);
						onClear();
					}}
					className="h-7 px-2.5 rounded-lg text-xs font-bold bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-98"
					title="Снять выделение со всех зубов"
					data-testid="clear-selection-btn"
				>
					<X size={12} className="text-zinc-500 shrink-0" />
					<span>Снять</span>
				</button>
			</div>
		</div>
	);
};
