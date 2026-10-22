import { SlidersHorizontal, Trash2 } from "lucide-react";
import React from "react";

export interface DisplayModesSelectionProps {
	readonly isFastExtractMode: boolean;
	readonly setIsFastExtractMode: React.Dispatch<React.SetStateAction<boolean>>;
	readonly isMultiSelectMode: boolean;
	readonly onToggleMultiSelect?: ((checked: boolean) => void) | undefined;
}

export const DisplayModesSelection: React.FC<DisplayModesSelectionProps> = ({
	isFastExtractMode,
	setIsFastExtractMode,
	isMultiSelectMode,
	onToggleMultiSelect,
}) => {
	return (
		<>
			<button
				type="button"
				onClick={() => setIsFastExtractMode((prev) => !prev)}
				className={`min-h-[44px] sm:min-h-[38px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none text-left ${
					isFastExtractMode
						? "bg-rose-600 border-rose-700 shadow-md animate-pulse"
						: "bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/20"
				}`}
				title="Режим быстрого удаления зубов (экспресс-экстракция)"
				data-testid="btn-odontogram-fast-extract"
			>
				<span className="flex items-center gap-2.5 min-w-0">
					<Trash2
						size={16}
						className={`shrink-0 ${isFastExtractMode ? "text-white" : "text-amber-600 dark:text-amber-400"}`}
					/>
					<div className="flex flex-col text-left min-w-0">
						<span
							className={`font-bold text-[12px] leading-tight ${isFastExtractMode ? "text-white" : "text-slate-900 dark:text-slate-100"}`}
						>
							Быстрое удаление зубов
						</span>
						<span
							className={`text-[10px] font-normal truncate ${isFastExtractMode ? "text-rose-100" : "text-slate-700 dark:text-slate-300"}`}
						>
							Экспресс-экстракция кликом по зубу
						</span>
					</div>
				</span>
				<span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 shrink-0 ml-2">
					{isFastExtractMode ? "ВКЛ" : "ВЫКЛ"}
				</span>
			</button>

			{onToggleMultiSelect && (
				<label
					className={`flex items-center justify-between min-h-[44px] sm:min-h-[38px] cursor-pointer select-none px-2.5 py-1.5 rounded-lg border transition-colors ${
						isMultiSelectMode
							? "bg-indigo-500/15 border-indigo-500/30"
							: "bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/20"
					}`}
					data-testid="label-odontogram-multiselect"
				>
					<span className="flex items-center gap-2.5 min-w-0">
						<SlidersHorizontal
							size={16}
							className="text-indigo-600 dark:text-indigo-400 shrink-0"
						/>
						<div className="flex flex-col text-left min-w-0">
							<span className="font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100">
								Групповое выделение (Shift)
							</span>
							<span className="text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate">
								Выбор нескольких зубов кликом
							</span>
						</div>
					</span>
					<input
						type="checkbox"
						checked={isMultiSelectMode ?? false}
						onChange={(e) => onToggleMultiSelect(e.target.checked)}
						className="accent-indigo-500 rounded cursor-pointer shrink-0 ml-2 w-4 h-4"
						data-testid="checkbox-odontogram-multiselect"
					/>
				</label>
			)}
		</>
	);
};
