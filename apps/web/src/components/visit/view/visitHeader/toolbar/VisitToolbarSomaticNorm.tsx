import React from "react";
import { Check } from "lucide-react";

interface VisitToolbarSomaticNormProps {
	readonly handleApplySomaticNormQuick?: (() => void) | undefined;
}

export function VisitToolbarSomaticNorm({ handleApplySomaticNormQuick }: VisitToolbarSomaticNormProps) {
	return (
		<button
			type="button"
			onClick={handleApplySomaticNormQuick}
			data-testid="btn-somatic-norm-one-click"
			data-tour="autonorm-btn"
			className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-9 h-11 px-2.5 py-0 text-xs font-semibold text-[var(--ink)] border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 rounded-xl shadow-xs"
			title="Заполнить нормой"
			aria-label="Заполнить нормой"
		>
			<Check className="w-4 h-4 text-[var(--ink-muted)] shrink-0" aria-hidden="true" />
			<span className="hidden sm:inline">Заполнить нормой</span>
			<span className="sm:hidden">Норма</span>
		</button>
	);
}
