import { SlidersHorizontal } from "lucide-react";
import type React from "react";

export interface AutoclaveMobileActionTriggerProps {
	readonly deviceFilter: string;
	readonly setDeviceFilter: (f: string) => void;
	readonly onOpenMobileSheet: () => void;
}

export const AutoclaveMobileActionTrigger: React.FC<AutoclaveMobileActionTriggerProps> = ({
	deviceFilter,
	setDeviceFilter,
	onOpenMobileSheet,
}) => {
	return (
		<div className="flex md:hidden items-center gap-1.5 shrink-0">
			<select
				value={deviceFilter}
				onChange={(e) => setDeviceFilter(e.target.value)}
				className="sanpin-select shrink-0 text-xs rounded-xl px-2.5 bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] text-ink border border-[var(--line,#cbd5e1)] touch-manipulation"
				style={{ minHeight: "44px", height: "44px" }}
				aria-label="Фильтр статуса циклов"
			>
				<option value="all">Все циклы</option>
				<option value="passed">Стерильно</option>
			</select>

			<button
				type="button"
				onClick={onOpenMobileSheet}
				className="sanpin-touch-btn inline-flex items-center justify-center p-2 rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-ink border border-[var(--line,#cbd5e1)] dark:border-[#334155] shadow-sm touch-manipulation cursor-pointer"
				style={{ minHeight: "44px", minWidth: "44px", height: "44px", width: "44px" }}
				aria-label="Действия автоклава и журналы"
				data-testid="autoclave-mobile-actions-trigger"
			>
				<SlidersHorizontal size={18} className="text-[var(--brand-primary,#2563eb)]" />
			</button>
		</div>
	);
};
