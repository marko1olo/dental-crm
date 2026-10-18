import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Settings } from "lucide-react";
import { ToolbarParamsMenuItems } from "./ToolbarParamsMenuItems";

export interface ToolbarParamsDropdownProps {
	readonly showNdflBreakdown: boolean;
	readonly onToggleNdflBreakdown: () => void;
	readonly onOpenComparatorStudio?: (() => void) | undefined;
	readonly onOpenStagePaymentStudio?: (() => void) | undefined;
	readonly onOpenPriceValidatorStudio?: (() => void) | undefined;
	readonly initialParamsOpen?: boolean;
}

export const ToolbarParamsDropdown: React.FC<ToolbarParamsDropdownProps> = ({
	showNdflBreakdown,
	onToggleNdflBreakdown,
	onOpenComparatorStudio,
	onOpenStagePaymentStudio,
	onOpenPriceValidatorStudio,
	initialParamsOpen = false,
}) => {
	const [isParamsOpen, setIsParamsOpen] = useState(initialParamsOpen);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setIsParamsOpen(false);
			}
		};
		if (isParamsOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isParamsOpen]);

	return (
		<div className="relative inline-flex items-center" ref={dropdownRef}>
			<button
				type="button"
				onClick={() => setIsParamsOpen((prev) => !prev)}
				className="secondary-button h-9 px-4 rounded-lg text-[13px] font-medium border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs transition-colors touch-manipulation whitespace-nowrap"
				title="Параметры сметы: налоговый вычет 13%, студия сравнения, эскроу, валидация цен"
				aria-label="Параметры сметы"
				aria-expanded={isParamsOpen}
				data-testid="tp-3tier-params-btn"
			>
				<Settings size={14} className="text-[var(--teal,var(--brand-primary))]" />
				<span>Параметры сметы</span>
				<ChevronDown
					size={13}
					className={`text-[var(--muted,#64748b)] transition-transform duration-200 ${
						isParamsOpen ? "rotate-180" : ""
					}`}
				/>
			</button>

			<div
				className={`absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong,#ffffff)] border border-[var(--line,var(--border,#cbd5e1))] rounded-xl shadow-2xl min-w-[260px] text-xs ${
					isParamsOpen ? "animate-in fade-in zoom-in-95 duration-100" : "hidden"
				}`}
				role="menu"
				aria-hidden={!isParamsOpen}
			>
				<ToolbarParamsMenuItems
					showNdflBreakdown={showNdflBreakdown}
					onToggleNdflBreakdown={onToggleNdflBreakdown}
					onOpenComparatorStudio={onOpenComparatorStudio}
					onOpenStagePaymentStudio={onOpenStagePaymentStudio}
					onOpenPriceValidatorStudio={onOpenPriceValidatorStudio}
					onClose={() => setIsParamsOpen(false)}
				/>
			</div>
		</div>
	);
};
