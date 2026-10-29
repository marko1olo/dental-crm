/**
 * PrescriptionExpressPills.tsx — 1-Click Clinical Rx Express Sets & Quick Drug Pills Bar
 * Mandates: 8e (Doctor Autonomy), 8k (Friction-Killer), 8am (Strictly 1 Primary CTA), Apple HIG touch targets >= 44px
 * Architecture: Sweet Spot 200–350 lines (Mandate 8b).
 */

import { AlertTriangle, Check, PenTool, Pill, Plus, Printer, Sparkles } from "lucide-react";
import React from "react";
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
	preset,
	isSelected,
	onSelectPreset,
	onApplyAndPrint,
	onApplyAndInsertToDiary,
	patientAllergies,
	catalogDrugs = [],
}) => {
	const isConflict = Boolean(
		patientAllergies &&
			preset.drugIds?.some((drugId) => {
				const drug = catalogDrugs.find((d) => d.id === drugId);
				const item = drug
					? { id: drug.id, tradeName: drug.tradeNameRu, latinName: drug.latinRp, category: drug.category }
					: { id: drugId, tradeName: drugId, latinName: drugId };
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
				<div className="flex items-start justify-between gap-1.5 w-full flex-wrap sm:flex-nowrap">
					<span className="text-xs font-bold text-[var(--ink)] leading-snug">{preset.label}</span>
					{isConflict && (
						<span
							data-testid={`preset-allergy-badge-${preset.id}`}
							className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1 shrink-0 ml-auto"
						>
							<AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
							Аллерген
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
							className="secondary-button btn btn--secondary h-7 px-2 text-[11px] font-semibold rounded-lg flex items-center gap-1 text-[var(--ink)] hover:text-[var(--teal)] cursor-pointer"
							title="Вставить назначения пакета в дневник"
						>
							<PenTool className="w-3 h-3 text-[var(--teal)]" />В дневник
						</button>
					)}
					{onApplyAndPrint && (
						<button
							type="button"
							onClick={() => onApplyAndPrint(preset)}
							className="secondary-button btn btn--secondary h-7 px-2 text-[11px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
							title="Печать пакета"
						>
							<Printer className="w-3 h-3 text-[var(--teal,#0d9488)]" />
							Печать
						</button>
					)}
				</div>
			)}
		</div>
	);
};

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
	{ id: "nimesulide_100", label: "Нимесил 100 мг (Найз)" },
	{ id: "ibuprofen_400", label: "Ибупрофен 400 мг" },
	{ id: "ketorolac_10", label: "Кеторол Экспресс 10 мг" },
	{ id: "chlorhexidine_005", label: "Хлоргексидин 0.05%" },
	{ id: "miramistin_001", label: "Мирамистин 0.01%" },
	{ id: "linex_forte", label: "Линекс (Пробиотик)" },
	{ id: "clarithromycin_500", label: "Кларитромицин 500 мг" },
	{ id: "clindamycin_300", label: "Клиндамицин 300 мг" },
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
									className={`px-3 py-1.5 min-h-[44px] sm:min-h-[36px] rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
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
