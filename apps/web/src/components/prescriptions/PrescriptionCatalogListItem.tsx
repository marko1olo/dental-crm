/**
 * PrescriptionCatalogListItem.tsx — Single Drug Item Card in Catalog
 * Decomposed from PrescriptionCatalogList.tsx per Mandate 8b (<= 120 lines).
 */

import { CheckCircle2 } from "lucide-react";
import type React from "react";
import { getDrugAllergyConflictType } from "./prescriptionAllergyChecker";

export interface PrescriptionCatalogListItemProps {
	readonly drug: {
		readonly id: string;
		readonly tradeNameRu: string;
		readonly latinRp: string;
		readonly dosageRu: string;
		readonly category?: string;
	};
	readonly isSelected: boolean;
	readonly onToggle: (id: string) => void;
	readonly patientAllergies?: string | readonly string[] | null | undefined;
}

export const PrescriptionCatalogListItem: React.FC<
	PrescriptionCatalogListItemProps
> = ({ drug, isSelected, onToggle, patientAllergies }) => {
	const conflict = getDrugAllergyConflictType(
		{
			id: drug.id,
			tradeName: drug.tradeNameRu,
			latinName: drug.latinRp,
			category: drug.category,
		},
		patientAllergies,
	);

	return (
		<button
			type="button"
			onClick={() => onToggle(drug.id)}
			className={`w-full text-left p-2 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
				isSelected
					? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--ink)] font-semibold shadow-xs"
					: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--line-strong)]"
			}`}
		>
			<div className="min-w-0">
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="font-bold truncate">{drug.tradeNameRu}</span>
					{conflict && (
						<span
							data-testid={`drug-allergy-badge-${drug.id}`}
							className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30 flex items-center gap-0.5 shrink-0"
						>
							⚠️ АЛЛЕРГИЯ
						</span>
					)}
				</div>
				<div className="text-xs text-[var(--muted)] truncate italic">
					{drug.latinRp}
				</div>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				<span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)]">
					{drug.dosageRu}
				</span>
				<div
					className={`w-4 h-4 rounded-md border flex items-center justify-center ${
						isSelected
							? "bg-[var(--teal)] border-[var(--teal)] text-[var(--ink-inverse)]"
							: "border-[var(--line)]"
					}`}
				>
					{isSelected && <CheckCircle2 className="w-3 h-3" />}
				</div>
			</div>
		</button>
	);
};
