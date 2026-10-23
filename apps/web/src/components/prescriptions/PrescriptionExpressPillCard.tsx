/**
 * PrescriptionExpressPillCard.tsx — Single Express Prescription Card
 * Decomposed from PrescriptionExpressPills.tsx per Mandate 8b (<= 120 lines).
 */

import { AlertTriangle, PenTool, Printer } from "lucide-react";
import type React from "react";
import { isDrugConflictingWithAllergies } from "./prescriptionAllergyChecker";
import type { DentalFastPrescriptionSet } from "./prescriptionDataSets";

export interface PrescriptionExpressPillCardProps {
	readonly preset: DentalFastPrescriptionSet;
	readonly isSelected: boolean;
	readonly onSelectPreset: (preset: DentalFastPrescriptionSet) => void;
	readonly onApplyAndPrint?: ((preset: DentalFastPrescriptionSet) => void) | undefined;
	readonly onApplyAndInsertToDiary?: ((preset: DentalFastPrescriptionSet) => void) | undefined;
	readonly patientAllergies?: string | readonly string[] | null | undefined;
	readonly catalogDrugs?: readonly {
		readonly id: string;
		readonly tradeNameRu: string;
		readonly latinRp: string;
		readonly category?: string | undefined;
	}[] | undefined;
}

export const PrescriptionExpressPillCard: React.FC<PrescriptionExpressPillCardProps> = ({
	preset, isSelected, onSelectPreset, onApplyAndPrint, onApplyAndInsertToDiary, patientAllergies, catalogDrugs = [],
}) => {
	const isConflict = Boolean(
		patientAllergies &&
			preset.drugIds?.some((drugId) => {
				const drug = catalogDrugs.find((d) => d.id === drugId);
				const item = drug ? { id: drug.id, tradeName: drug.tradeNameRu, latinName: drug.latinRp, category: drug.category } : { id: drugId, tradeName: drugId, latinName: drugId };
				return isDrugConflictingWithAllergies(item, patientAllergies);
			}),
	);

	return (
		<div
			key={preset.id}
			data-testid={`rx-express-pill-${preset.id}`}
			className={`p-3 min-h-[48px] rounded-xl border transition-all flex flex-col justify-between gap-1.5 select-none ${
				isConflict
					? "border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60"
					: isSelected
						? "border-[var(--teal)] bg-[var(--teal-surface)] shadow-xs"
						: "border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal)] hover:bg-[var(--paper)]"
			}`}
		>
			<button
				type="button"
				onClick={() => onSelectPreset(preset)}
				className="text-left w-full flex flex-col gap-1.5 cursor-pointer bg-transparent border-0 p-0 focus:outline-hidden"
			>
				<div className="flex items-start justify-between gap-1.5 w-full">
					<span className="text-xs font-bold text-[var(--ink)] leading-snug">{preset.label}</span>
					{isConflict && (
						<span
							data-testid={`preset-allergy-badge-${preset.id}`}
							className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1 shrink-0"
						>
							<AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
							Аллерген в пакете
						</span>
					)}
				</div>
				<p className="text-[11.5px] text-[var(--muted)] line-clamp-2 leading-tight">{preset.desc}</p>
			</button>
			{(onApplyAndPrint || onApplyAndInsertToDiary) && (
				<div role="toolbar" aria-label="Действия с набором" className="flex items-center gap-2 pt-1 border-t border-[var(--line-subtle,var(--line))] mt-0.5">
					{onApplyAndInsertToDiary && (
						<button
							type="button"
							onClick={() => onApplyAndInsertToDiary(preset)}
							className="secondary-button h-7 px-2 text-[11px] font-semibold rounded-lg flex items-center gap-1 text-[var(--ink)] hover:text-[var(--teal)] cursor-pointer"
							title="Вставить назначения пакета в дневник"
						>
							<PenTool className="w-3 h-3 text-[var(--teal)]" />В дневник
						</button>
					)}
					{onApplyAndPrint && (
						<button
							type="button"
							onClick={() => onApplyAndPrint(preset)}
							className="primary-button h-7 px-2 text-[11px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
							title="Печать пакета"
						>
							<Printer className="w-3 h-3" />
							Печать
						</button>
					)}
				</div>
			)}
		</div>
	);
};
