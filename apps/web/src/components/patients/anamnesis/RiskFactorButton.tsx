import { Check } from "lucide-react";
import React from "react";

export interface RiskFactorButtonProps {
	readonly testId: string;
	readonly isActive: boolean;
	readonly onClick: () => void;
	readonly label: string;
	readonly title: string;
	readonly isCritical?: boolean | undefined;
	readonly colorVariant?: "amber" | "rose" | "pink" | undefined;
}

export const RiskFactorButton: React.FC<RiskFactorButtonProps> = ({
	testId,
	isActive,
	onClick,
	label,
	title,
	isCritical = false,
	colorVariant = "amber",
}) => {
	const activeColorClasses = isCritical
		? "bg-rose-50 dark:bg-rose-950/50 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
		: colorVariant === "pink"
			? "bg-pink-50 dark:bg-pink-950/50 border-pink-400 text-pink-900 dark:text-pink-200 shadow-xs"
			: "bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200 shadow-xs";

	const checkColorClasses = isCritical
		? "bg-[#ef4444] border-[#ef4444] text-white"
		: colorVariant === "pink"
			? "bg-pink-600 border-pink-600 text-white"
			: "bg-amber-600 border-amber-600 text-white";

	return (
		<button
			type="button"
			data-testid={testId}
			onClick={onClick}
			className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer select-none ${
				isActive
					? activeColorClasses
					: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
			}`}
			title={title}
		>
			<div
				className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
					isActive ? checkColorClasses : "border-slate-300 dark:border-slate-600"
				}`}
			>
				{isActive ? <Check className="w-3 h-3" /> : null}
			</div>
			<span className="truncate min-w-0">{label}</span>
		</button>
	);
};
