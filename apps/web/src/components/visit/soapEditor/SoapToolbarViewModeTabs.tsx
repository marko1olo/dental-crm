import { Edit3, Eye } from "lucide-react";
import type React from "react";

export interface SoapToolbarViewModeTabsProps {
	readonly activeViewMode: "fields" | "full_text";
	readonly onChangeViewMode: (mode: "fields" | "full_text") => void;
}

export const SoapToolbarViewModeTabs: React.FC<
	SoapToolbarViewModeTabsProps
> = ({ activeViewMode, onChangeViewMode }) => {
	return (
		<div
			className="inline-flex items-center p-[2px] rounded-[9px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] gap-[2px] shadow-2xs"
			role="tablist"
			aria-label="Режим отображения дневника"
		>
			<button
				type="button"
				role="tab"
				aria-selected={activeViewMode === "fields"}
				onClick={() => onChangeViewMode("fields")}
				className={`min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 text-[12.5px] rounded-[7px] flex items-center gap-1 cursor-pointer transition-all select-none ${
					activeViewMode === "fields"
						? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line-subtle)] shadow-xs font-semibold"
						: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-medium"
				}`}
			>
				<Edit3 className="w-3 h-3" />
				<span>Поля</span>
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={activeViewMode === "full_text"}
				onClick={() => onChangeViewMode("full_text")}
				className={`min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 text-[12.5px] rounded-[7px] flex items-center gap-1 cursor-pointer transition-all select-none ${
					activeViewMode === "full_text"
						? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line-subtle)] shadow-xs font-semibold"
						: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-medium"
				}`}
			>
				<Eye className="w-3 h-3" />
				<span>Печать</span>
			</button>
		</div>
	);
};
