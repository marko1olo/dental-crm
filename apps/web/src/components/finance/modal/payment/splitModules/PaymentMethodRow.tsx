/**
 * apps/web/src/components/finance/modal/payment/splitModules/PaymentMethodRow.tsx
 *
 * Dedicated ergonomic input component for individual multi-tender payment methods.
 * Complies with Apple HIG & Mandate 8e (dense clinical grid, 8px geometry, zero clipping).
 */

import React from "react";
import type { PaymentMethodRowProps } from "./paymentSplitTypes.js";

export const PaymentMethodRow: React.FC<PaymentMethodRowProps> = ({
	label,
	icon: Icon,
	valueRub,
	onChangeRub,
	placeholder = "0 ₽",
	testId,
	badgeText,
	maxRub,
	isAccent = false,
	subLabel,
	onFillRemainder,
}) => {
	const containerClasses = "space-y-0.5";

	const labelClasses = isAccent
		? "text-xs font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-1.5"
		: "text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1.5";

	const inputBorder = isAccent
		? "border-teal-300 dark:border-teal-700"
		: "border-[var(--line,#e2e8f0)]";

	return (
		<div className={containerClasses}>
			<div className="flex items-center justify-between flex-wrap gap-1">
				<label className={labelClasses}>
					<Icon size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>{label}</span>
				</label>
				{subLabel && (
					<span className="text-[11px] text-teal-700 dark:text-teal-300 font-medium break-words">
						{subLabel}
					</span>
				)}
				{badgeText && !subLabel && (
					<span className="text-[10px] font-mono text-teal-700 dark:text-teal-300 font-bold">
						{badgeText}
					</span>
				)}
			</div>

			<div className="flex items-center gap-1.5">
				<input
					type="number"
					min={0}
					max={maxRub || undefined}
					step="1"
					value={valueRub || ""}
					onChange={(e) => {
						const parsed = parseFloat(e.target.value) || 0;
						onChangeRub(Math.max(0, parsed));
					}}
					placeholder={placeholder}
					data-testid={testId}
					className={`h-8 w-full px-2.5 py-0.5 text-sm font-bold font-mono bg-[var(--paper,#ffffff)] border ${inputBorder} rounded-lg text-[var(--ink,#0f172a)] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors`}
				/>

				{onFillRemainder && (
					<button
						type="button"
						onClick={onFillRemainder}
						className="h-8 px-2 rounded-lg border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300 text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors active:scale-95 shrink-0"
						title="Заполнить оставшуюся сумму"
						data-testid={`${testId}-fill-remainder`}
					>
						+ остаток
					</button>
				)}

				{badgeText && isAccent && (
					<span className="text-[11px] font-mono text-[var(--muted,#64748b)] whitespace-nowrap shrink-0">
						{badgeText}
					</span>
				)}
			</div>
		</div>
	);
};
