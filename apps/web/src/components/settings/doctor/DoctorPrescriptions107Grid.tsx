/**
 * apps/web/src/components/settings/doctor/DoctorPrescriptions107Grid.tsx
 * Medication Grid Selection for Doctor Prescriptions Settings
 * Conforms to Mandate 8b (<= 120 lines).
 */

import { Check } from "lucide-react";
import type React from "react";
import type { FavoriteMedicationOption } from "../../../store/doctorPreferencesStore";

export interface DoctorPrescriptions107GridProps {
	readonly medications: readonly FavoriteMedicationOption[];
	readonly selectedMedId: string;
	readonly onSelectMedId: (id: string) => void;
	readonly favoriteIds: readonly string[];
	readonly onToggleFavorite: (id: string) => void;
}

export const DoctorPrescriptions107Grid: React.FC<
	DoctorPrescriptions107GridProps
> = ({
	medications,
	selectedMedId,
	onSelectMedId,
	favoriteIds,
	onToggleFavorite,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
			{medications.map((med) => {
				const isSelected = selectedMedId === med.id;
				const isFav = favoriteIds.includes(med.id);
				return (
					<div
						key={med.id}
						onClick={() => onSelectMedId(med.id)}
						className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
							isSelected
								? "bg-[var(--paper-card)] border-[var(--teal)] shadow-xs"
								: "bg-[var(--paper-card)] border-[var(--line)] hover:border-[var(--line-strong)]"
						}`}
					>
						<div className="flex items-start justify-between gap-1 w-full">
							<div className="min-w-0">
								<strong className="text-xs text-[var(--ink)] block truncate">
									{med.tradeName}
								</strong>
								<span className="text-[11px] text-[var(--muted)] block truncate">
									{med.mnn}
								</span>
							</div>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onToggleFavorite(med.id);
								}}
								className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
									isFav
										? "bg-[var(--teal)] border-[var(--teal)] text-[var(--on-teal)]"
										: "border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								title={isFav ? "Удалить из избранных" : "Добавить в избранные"}
							>
								<Check size={12} className={isFav ? "stroke-[3]" : ""} />
							</button>
						</div>

						<div className="flex items-center justify-between text-[10px] text-[var(--muted)] border-t border-[var(--line-subtle)] pt-1.5 mt-0.5">
							<span className="font-mono font-bold text-[var(--teal)]">
								{med.dosage}
							</span>
							<span className="font-semibold">{med.categoryLabel}</span>
						</div>
					</div>
				);
			})}
		</div>
	);
};
