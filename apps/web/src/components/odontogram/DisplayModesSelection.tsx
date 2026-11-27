import { SlidersHorizontal, Trash2 } from "lucide-react";
import React from "react";

export interface DisplayModesSelectionProps {
	readonly isFastExtractMode: boolean;
	readonly setIsFastExtractMode: React.Dispatch<React.SetStateAction<boolean>>;
	readonly isMultiSelectMode: boolean | undefined;
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
				className={`min-h-[36px] max-md:min-h-[44px] flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer select-none text-left ${
					isFastExtractMode
						? "bg-[var(--teal-soft,rgba(13,148,136,0.12))] border-[var(--teal,#0d9488)] shadow-2xs"
						: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
				}`}
				title="Режим быстрого удаления зубов (экспресс-экстракция)"
				data-testid="btn-odontogram-fast-extract"
			>
				<span className="flex items-center gap-2.5 min-w-0">
					<Trash2
						size={16}
						className={`shrink-0 ${isFastExtractMode ? "text-[var(--teal,#0d9488)]" : "text-[var(--ink-muted,#64748b)]"}`}
					/>
					<div className="flex flex-col text-left min-w-0">
						<span
							className={`font-bold text-[12px] leading-tight ${isFastExtractMode ? "text-[var(--teal-dark,#0f766e)]" : "text-[var(--ink,#0f172a)]"}`}
						>
							Быстрое удаление зубов
						</span>
						<span
							className={`text-[10px] font-normal truncate ${isFastExtractMode ? "text-[var(--teal,#0d9488)]" : "text-[var(--ink-muted,#64748b)]"}`}
						>
							Экспресс-экстракция кликом по зубу
						</span>
					</div>
				</span>
				<span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] shrink-0 ml-2 border border-[var(--line,#e2e8f0)]">
					{isFastExtractMode ? "ВКЛ" : "ВЫКЛ"}
				</span>
			</button>

			{onToggleMultiSelect && (
				<label
					className={`flex items-center justify-between min-h-[36px] max-md:min-h-[44px] cursor-pointer select-none px-2.5 py-1.5 rounded-lg border transition-colors ${
						isMultiSelectMode
							? "bg-[var(--teal-soft,rgba(13,148,136,0.12))] border-[var(--teal,#0d9488)]"
							: "bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
					}`}
					data-testid="label-odontogram-multiselect"
				>
					<span className="flex items-center gap-2.5 min-w-0">
						<SlidersHorizontal
							size={16}
							className="text-[var(--teal,#0d9488)] shrink-0"
						/>
						<div className="flex flex-col text-left min-w-0">
							<span className="font-bold text-[12px] leading-tight text-[var(--ink,#0f172a)]">
								Групповое выделение (Shift)
							</span>
							<span className="text-[10px] font-normal text-[var(--ink-muted,#64748b)] truncate">
								Выбор нескольких зубов кликом
							</span>
						</div>
					</span>
					<input
						type="checkbox"
						checked={isMultiSelectMode ?? false}
						onChange={(e) => onToggleMultiSelect(e.target.checked)}
						className="accent-[var(--teal,#0d9488)] rounded cursor-pointer shrink-0 ml-2 w-4 h-4"
						data-testid="checkbox-odontogram-multiselect"
					/>
				</label>
			)}
		</>
	);
};
