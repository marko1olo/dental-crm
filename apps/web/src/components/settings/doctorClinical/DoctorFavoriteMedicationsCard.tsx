import { Check, Pill } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast";
import {
	FAVORITE_MEDICATION_OPTIONS,
	useDoctorPreferencesStore,
} from "../../../store/doctorPreferencesStore";

export function DoctorFavoriteMedicationsCard() {
	const favoriteMedicationIds = useDoctorPreferencesStore(
		(s) => s.preferences.favoriteMedicationIds || [],
	);
	const updatePreferences = useDoctorPreferencesStore((s) => s.updatePreferences);

	const handleMedicationToggle = (medId: string) => {
		const next = favoriteMedicationIds.includes(medId)
			? favoriteMedicationIds.filter((id) => id !== medId)
			: [...favoriteMedicationIds, medId];
		updatePreferences({ favoriteMedicationIds: next });
		const found = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === medId);
		const action = favoriteMedicationIds.includes(medId) ? "удален из любимых" : "добавлен в любимые";
		showToast(`${found?.tradeName ?? medId} ${action}`, "info");
	};

	return (
		<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5">
			<div className="flex items-center justify-between">
				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Pill size={15} className="text-[var(--teal)]" />
					<span>Любимые медикаменты для рецептов</span>
				</label>
				<span className="text-[11px] font-medium text-[var(--muted)]">
					Быстрая выписка рецептов и назначений
				</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
				{FAVORITE_MEDICATION_OPTIONS.map((med) => {
					const isFavorite = favoriteMedicationIds.includes(med.id);
					return (
						<button
							key={med.id}
							type="button"
							onClick={() => handleMedicationToggle(med.id)}
							className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1 min-h-[44px] ${
								isFavorite
									? "bg-[var(--paper-card)] border-[var(--teal)] shadow-xs"
									: "bg-[var(--paper-card)] border-[var(--line)] hover:border-[var(--line-strong)]"
							}`}
						>
							<div className="flex items-start justify-between gap-1 w-full">
								<span className="text-xs font-bold text-[var(--ink)] leading-snug">
									{med.tradeName}
								</span>
								{isFavorite ? (
									<span className="w-4 h-4 rounded-full bg-[var(--teal)] text-[var(--on-teal)] flex items-center justify-center shrink-0">
										<Check size={10} className="stroke-[3]" />
									</span>
								) : (
									<span className="w-4 h-4 rounded-full border border-[var(--line)] shrink-0" />
								)}
							</div>
							<span className="text-[10px] text-[var(--muted)] line-clamp-1">{med.mnn}</span>
							<div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-[var(--line-subtle)]">
								<span className="text-[9px] font-mono font-bold text-[var(--teal)]">
									{med.dosage}
								</span>
								<span className="text-[9px] text-[var(--muted)] font-medium">
									{med.categoryLabel}
								</span>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
