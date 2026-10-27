import { Check } from "lucide-react";
import React from "react";

export interface AllergyChipButtonProps {
	readonly testId: string;
	readonly isActive: boolean;
	readonly onClick: () => void;
	readonly label: string;
	readonly title: string;
}

export const AllergyChipButton: React.FC<AllergyChipButtonProps> = ({
	testId,
	isActive,
	onClick,
	label,
	title,
}) => {
	return (
		<button
			type="button"
			data-testid={testId}
			onClick={onClick}
			className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-bold text-left transition-all cursor-pointer select-none ${
				isActive
					? "bg-rose-50 dark:bg-rose-950/60 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
					: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:border-rose-300"
			}`}
			title={title}
		>
			<div
				className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
					isActive ? "bg-[#ef4444] border-[#ef4444] text-white" : "border-slate-300 dark:border-slate-600"
				}`}
			>
				{isActive ? <Check className="w-3 h-3" /> : null}
			</div>
			<span className="truncate min-w-0">{label}</span>
		</button>
	);
};
