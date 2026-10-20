/**
 * apps/web/src/components/settings/doctor/DoctorPrescriptions107Section.tsx
 *
 * Шаблоны рецептов с латинскими сигнатурами и защитой от передозировки:
 * Амоксиклав, Цифран СТ, Найз, Дексалгин, Супрастин, Хлоргексидин 0.05%.
 *
 * Инварианты:
 * - Мандат 8b: строго <= 120 строк.
 * - Мандат 8d: ноль мультяшных эмодзи.
 * - Мандат 8e: врачебная автономия (1-клик выписка и печать рецептурного бланка).
 */

import { Pill } from "lucide-react";
import React, { useState } from "react";
import {
	FAVORITE_MEDICATION_OPTIONS,
	type FavoriteMedicationOption,
	useDoctorPreferencesStore,
} from "../../../store/doctorPreferencesStore";
import { showToast } from "../../GlobalToast";
import { DoctorPrescriptions107Card } from "./DoctorPrescriptions107Card";
import { DoctorPrescriptions107Grid } from "./DoctorPrescriptions107Grid";

const CATEGORIES = [
	{ id: "all", label: "Все" },
	{ id: "antibiotic", label: "Антибиотики" },
	{ id: "nsaid", label: "НПВП" },
	{ id: "antiseptic", label: "Антисептики" },
	{ id: "antihistamine", label: "Противоотечные" },
];

export function DoctorPrescriptions107Section() {
	const preferences = useDoctorPreferencesStore((s) => s.preferences);
	const updatePreferences = useDoctorPreferencesStore(
		(s) => s.updatePreferences,
	);

	const [activeCategoryFilter, setActiveCategoryFilter] =
		useState<string>("all");
	const [selectedMedId, setSelectedMedId] =
		useState<string>("amoxiclav_875_125");

	const favoriteIds = preferences.favoriteMedicationIds || [];

	const handleToggleFavorite = (id: string) => {
		const next = favoriteIds.includes(id)
			? favoriteIds.filter((item) => item !== id)
			: [...favoriteIds, id];
		updatePreferences({ favoriteMedicationIds: next });
		const med = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === id);
		showToast(
			favoriteIds.includes(id)
				? `${med?.tradeName || id} удален из избранного`
				: `${med?.tradeName || id} добавлен в избранные рецепты`,
			"info",
		);
	};

	const filteredMedications = FAVORITE_MEDICATION_OPTIONS.filter((m) => {
		if (activeCategoryFilter === "all") return true;
		return m.category === activeCategoryFilter;
	});

	const currentMed: FavoriteMedicationOption =
		FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === selectedMedId) ||
		FAVORITE_MEDICATION_OPTIONS[0]!;

	const handleCopyLatin = () => {
		navigator.clipboard.writeText(currentMed.rpLatin);
		showToast(
			`Рецепт на латыни для «${currentMed.tradeName}» скопирован`,
			"success",
		);
	};

	return (
		<div
			className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4"
			data-testid="doctor-prescriptions-107-section"
		>
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
						<Pill size={18} />
					</div>
					<div>
						<h4 className="font-extrabold text-sm sm:text-base text-[var(--ink)] m-0">
							Шаблоны рецептурных бланков и защита от передозировки
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Латинские прописи (Rp.), суточные лимиты, длительность курса и
							противопоказания
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 flex-wrap">
					{CATEGORIES.map((cat) => (
						<button
							key={cat.id}
							type="button"
							onClick={() => setActiveCategoryFilter(cat.id)}
							className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
								activeCategoryFilter === cat.id
									? "bg-teal-600 text-white border-teal-600 shadow-2xs font-bold"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
							}`}
						>
							{cat.label}
						</button>
					))}
				</div>
			</div>

			<DoctorPrescriptions107Grid
				medications={filteredMedications}
				selectedMedId={selectedMedId}
				onSelectMedId={setSelectedMedId}
				favoriteIds={favoriteIds}
				onToggleFavorite={handleToggleFavorite}
			/>

			<DoctorPrescriptions107Card
				currentMed={currentMed}
				onCopyLatin={handleCopyLatin}
			/>
		</div>
	);
}
