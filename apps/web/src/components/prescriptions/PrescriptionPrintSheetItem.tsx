/**
 * PrescriptionPrintSheetItem.tsx — Printable Medication Row Item
 * Mandate 8b: <= 120 lines.
 */

import type React from "react";
import type { PrescriptionDrugItem } from "./PrescriptionPrintModal";

export interface PrescriptionPrintSheetItemProps {
	readonly item: PrescriptionDrugItem;
	readonly index: number;
	readonly isMemoMode?: boolean;
}

export const PrescriptionPrintSheetItem: React.FC<
	PrescriptionPrintSheetItemProps
> = ({ item, index, isMemoMode }) => {
	return (
		<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-xs flex flex-col gap-1">
			<div className="flex items-center justify-between gap-2">
				<span className="font-bold text-[var(--ink)]">
					{index + 1}. {item.tradeName}
				</span>
				<span className="text-[11px] font-mono text-[var(--muted)]">
					{item.dispenseLatin}
				</span>
			</div>
			{!isMemoMode && (
				<div className="font-mono text-[11px] text-[var(--teal)] italic">
					{item.latinName}
				</div>
			)}
			<div className="text-[11.5px] text-[var(--ink-secondary)] bg-[var(--paper-soft)] p-1.5 rounded-lg border border-[var(--line-subtle,var(--line))]">
				<strong>Назначение:</strong> {item.signaRussian}
			</div>
		</div>
	);
};
