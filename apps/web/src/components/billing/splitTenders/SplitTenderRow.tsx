/**
 * apps/web/src/components/billing/splitTenders/SplitTenderRow.tsx
 *
 * Generic input row for multi-tender split payment modal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";

export interface SplitTenderRowProps {
	readonly icon: React.ReactNode;
	readonly title: string;
	readonly subtitle: string;
	readonly value: number;
	readonly onChange: (val: number) => void;
	readonly testId: string;
	readonly actionLabel?: string | undefined;
	readonly onAction?: (() => void) | undefined;
	readonly actionTestId?: string | undefined;
	readonly actionColorClass?: string | undefined;
}

export const SplitTenderRow: React.FC<SplitTenderRowProps> = ({
	icon,
	title,
	subtitle,
	value,
	onChange,
	testId,
	actionLabel,
	onAction,
	actionTestId,
	actionColorClass = "text-teal-600 dark:text-teal-400",
}) => {
	return (
		<div className="p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3">
			<div className="flex items-center gap-2.5 min-w-[140px]">
				<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 flex items-center justify-center shrink-0">
					{icon}
				</div>
				<div>
					<div className="text-xs font-bold text-[var(--ink,#0f172a)] leading-tight">
						{title}
					</div>
					<div className="text-[10px] text-[var(--muted,#64748b)]">{subtitle}</div>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-1 justify-end">
				{actionLabel && onAction && (
					<button
						type="button"
						onClick={onAction}
						className={`text-[11px] font-semibold hover:underline shrink-0 ${actionColorClass}`}
						data-testid={actionTestId}
					>
						{actionLabel}
					</button>
				)}
				<input
					type="number"
					value={value || ""}
					onChange={(e) => onChange(Number(e.target.value) || 0)}
					className="w-28 sm:w-36 h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-sm text-right text-[var(--ink,#0f172a)] focus:outline-none focus:border-teal-500"
					placeholder="0"
					data-testid={testId}
				/>
				<span className="font-bold text-xs text-[var(--ink,#0f172a)]">₽</span>
			</div>
		</div>
	);
};
