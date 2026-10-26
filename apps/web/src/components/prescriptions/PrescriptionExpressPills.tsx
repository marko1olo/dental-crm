/**
 * PrescriptionExpressPills.tsx — 1-Click Clinical Rx Express Sets & Quick Drug Pills Bar
 * Mandates: 8e (Doctor Autonomy), 8k (Friction-Killer), Apple HIG touch targets >= 44px
 * Architecture: Decomposed module <= 120 lines (Mandate 8b)
 */

import { Check, Pill, Plus, Sparkles } from "lucide-react";
import type React from "react";
import { PrescriptionExpressPillCard } from "./PrescriptionExpressPillCard";
import type { DentalFastPrescriptionSet } from "./prescriptionDataSets";

export interface PrescriptionExpressPillsProps {
	readonly presets: readonly DentalFastPrescriptionSet[];
	readonly activePresetId?: string | undefined;
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
	readonly selectedDrugIds?: readonly string[] | undefined;
	readonly onToggleDrug?: ((drugId: string) => void) | undefined;
}

const QUICK_SOLO_DRUGS = [
	{ id: "amoxicillin_500", label: "Амоксициллин 500 мг" },
	{ id: "amoxiclav_625", label: "Амоксиклав 625 мг" },
	{ id: "amoxiclav_875_125", label: "Амоксиклав 1000 мг" },
	{ id: "nimesulide_100", label: "Найз 100 мг" },
	{ id: "ibuprofen_400", label: "Ибупрофен 400 мг" },
	{ id: "ketorolac_10", label: "Кеторол 10 мг" },
	{ id: "chlorhexidine_005", label: "Хлоргексидин 0.05%" },
	{ id: "miramistin_001", label: "Мирамистин 0.01%" },
	{ id: "linex_forte", label: "Линекс (Пробиотик)" },
] as const;

export const PrescriptionExpressPills: React.FC<PrescriptionExpressPillsProps> = ({
	presets,
	activePresetId,
	onSelectPreset,
	onApplyAndPrint,
	onApplyAndInsertToDiary,
	patientAllergies,
	catalogDrugs = [],
	selectedDrugIds = [],
	onToggleDrug,
}) => {
	return (
		<div className="flex flex-col gap-3">
			{/* Quick 1-Tap Solo Medications (Horizontal scroller on mobile) */}
			{onToggleDrug && (
				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
						<Pill className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						Быстрый выбор препарата (1 тап):
					</span>
					<div className="flex overflow-x-auto sm:flex-wrap pb-1.5 pt-0.5 gap-1.5 overscroll-x-contain touch-pan-x [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
						{QUICK_SOLO_DRUGS.map((drug) => {
							const isSelected = selectedDrugIds.includes(drug.id);
							return (
								<button
									key={drug.id}
									type="button"
									onClick={() => onToggleDrug(drug.id)}
									data-testid={`quick-drug-pill-${drug.id}`}
									className={`px-3 py-1.5 min-h-[36px] sm:min-h-[32px] rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
										isSelected
											? "bg-[var(--teal)] text-white shadow-xs border border-[var(--teal)]"
											: "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]"
									}`}
								>
									{isSelected ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Plus className="w-3.5 h-3.5 shrink-0" />}
									<span>{drug.label}</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Clinical 1-Click Multi-Drug Course Presets */}
			<div className="flex flex-col gap-1.5">
				<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					Клинические курсы в 1 клик:
				</span>
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
		</div>
	);
};
