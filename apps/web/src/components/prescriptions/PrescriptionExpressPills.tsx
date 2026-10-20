/**
 * PrescriptionExpressPills.tsx — 1-Click Clinical Rx Express Sets Bar
 * Mandates: 8e (Doctor Autonomy), 8k (Friction-Killer), Apple HIG touch targets >= 48px
 * Architecture: Decomposed module <= 120 lines (Mandate 8b)
 */

import { Sparkles } from "lucide-react";
import type React from "react";
import { PrescriptionExpressPillCard } from "./PrescriptionExpressPillCard";
import type { DentalFastPrescriptionSet } from "./prescriptionDataSets";

export interface PrescriptionExpressPillsProps {
	readonly presets: readonly DentalFastPrescriptionSet[];
	readonly activePresetId?: string | undefined;
	readonly onSelectPreset: (preset: DentalFastPrescriptionSet) => void;
	readonly onApplyAndPrint?:
		| ((preset: DentalFastPrescriptionSet) => void)
		| undefined;
	readonly onApplyAndInsertToDiary?:
		| ((preset: DentalFastPrescriptionSet) => void)
		| undefined;
	readonly patientAllergies?: string | readonly string[] | null | undefined;
	readonly catalogDrugs?:
		| readonly {
				readonly id: string;
				readonly tradeNameRu: string;
				readonly latinRp: string;
				readonly category?: string;
		  }[]
		| undefined;
}

export const PrescriptionExpressPills: React.FC<
	PrescriptionExpressPillsProps
> = ({
	presets,
	activePresetId,
	onSelectPreset,
	onApplyAndPrint,
	onApplyAndInsertToDiary,
	patientAllergies,
	catalogDrugs = [],
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					Клинические экспресс-наборы (1 клик):
				</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				{presets.map((preset) => (
					<PrescriptionExpressPillCard
						key={preset.id}
						preset={preset}
						isSelected={activePresetId === preset.id}
						onSelectPreset={onSelectPreset}
						onApplyAndPrint={onApplyAndPrint}
						onApplyAndInsertToDiary={onApplyAndInsertToDiary}
						patientAllergies={patientAllergies}
						catalogDrugs={catalogDrugs}
					/>
				))}
			</div>
		</div>
	);
};
