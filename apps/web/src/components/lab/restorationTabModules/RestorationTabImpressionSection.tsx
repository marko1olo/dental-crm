import React from "react";
import { IMPRESSION_TYPES } from "../labMath";

export interface RestorationTabImpressionSectionProps {
	impressionType?: string;
	setImpressionType?: (type: string) => void;
	includeImpressionBilling?: boolean;
	setIncludeImpressionBilling?: (val: boolean) => void;
}

export function RestorationTabImpressionSection({
	impressionType = "a_silicone",
	setImpressionType,
	includeImpressionBilling = true,
	setIncludeImpressionBilling,
}: RestorationTabImpressionSectionProps) {
	return (
		<div className="space-y-2 p-3 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">
			<label className="block text-xs font-bold text-[var(--ink)]">Слепок (оттиск) челюсти:</label>
			<div className="flex flex-wrap gap-2">
				{IMPRESSION_TYPES.map((imp) => (
					<button
						key={imp.id}
						type="button"
						onClick={() => setImpressionType?.(imp.id)}
						className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
							impressionType === imp.id
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						{imp.name}
					</button>
				))}
			</div>
			<div className="pt-2 border-t border-[var(--line)] flex items-center justify-between">
				<label className="flex items-center gap-2 cursor-pointer text-xs select-none">
					<input
						type="checkbox"
						checked={includeImpressionBilling}
						onChange={(e) => setIncludeImpressionBilling?.(e.target.checked)}
						className="w-4 h-4 rounded text-[var(--primary)]"
						data-testid="lab-order-include-impression-billing-checkbox"
					/>
					<span className="font-medium text-[var(--ink)]">Включить снятие слепка в счёт (2 500 ₽)</span>
				</label>
			</div>
		</div>
	);
}
