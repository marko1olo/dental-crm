/**
 * apps/web/src/components/settings/doctor/DoctorPrescriptions107Section.tsx
 *
 * Шаблоны рецептов Формы 107-1/у с латинскими сигнатурами и защитой от передозировки:
 * Амоксиклав, Цифран СТ, Найз, Дексалгин, Супрастин, Хлоргексидин 0.05%.
 *
 * Инварианты:
 * - Мандат 8b: строго <= 800 строк.
 * - Мандат 8d: ноль мультяшных эмодзи.
 * - Мандат 8e: врачебная автономия (1-клик выписка и печать рецептурного бланка).
 */

import React, { useState } from "react";
import {
	AlertTriangle,
	Check,
	Copy,
	FileText,
	Pill,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	FAVORITE_MEDICATION_OPTIONS,
	useDoctorPreferencesStore,
	type FavoriteMedicationOption,
} from "../../../store/doctorPreferencesStore";

export function DoctorPrescriptions107Section() {
	const preferences = useDoctorPreferencesStore((s) => s.preferences);
	const updatePreferences = useDoctorPreferencesStore((s) => s.updatePreferences);

	const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
	const [selectedMedId, setSelectedMedId] = useState<string>("amoxiclav_875_125");

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
		showToast(`Рецепт на латыни для «${currentMed.tradeName}» скопирован`, "success");
	};

	return (
		<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4" data-testid="doctor-prescriptions-107-section">
			{/* Header */}
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
							Латинские прописи (Rp.), суточные лимиты, длительность курса и противопоказания
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 flex-wrap">
					{["all", "antibiotic", "nsaid", "antiseptic", "antihistamine"].map((cat) => (
						<button
							key={cat}
							type="button"
							onClick={() => setActiveCategoryFilter(cat)}
							className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
								activeCategoryFilter === cat
									? "bg-teal-600 text-white border-teal-600 shadow-2xs font-bold"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
							}`}
						>
							{cat === "all" && "Все"}
							{cat === "antibiotic" && "Антибиотики"}
							{cat === "nsaid" && "НПВП"}
							{cat === "antiseptic" && "Антисептики"}
							{cat === "antihistamine" && "Противоотечные"}
						</button>
					))}
				</div>
			</div>

			{/* Medication Grid Selection */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
				{filteredMedications.map((med) => {
					const isSelected = selectedMedId === med.id;
					const isFav = favoriteIds.includes(med.id);
					return (
						<div
							key={med.id}
							onClick={() => setSelectedMedId(med.id)}
							className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
								isSelected
									? "bg-[var(--paper)] border-teal-600 shadow-xs ring-2 ring-teal-500/40"
									: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/60"
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
										handleToggleFavorite(med.id);
									}}
									className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
										isFav
											? "bg-teal-600 border-teal-600 text-white"
											: "border-[var(--line)] text-slate-300 hover:text-slate-500"
									}`}
									title={isFav ? "Удалить из избранных" : "Добавить в избранные"}
								>
									<Check size={12} className={isFav ? "stroke-[3]" : ""} />
								</button>
							</div>

							<div className="flex items-center justify-between text-[10px] text-[var(--muted)] border-t border-[var(--line)]/50 pt-1.5 mt-0.5">
								<span className="font-mono font-bold text-teal-700 dark:text-teal-300">
									{med.dosage}
								</span>
								<span className="font-semibold">{med.categoryLabel}</span>
							</div>
						</div>
					);
				})}
			</div>

			{/* Active Medication Card: Latin Signature & Overdose Protection */}
			<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-3">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
					<div className="flex items-center gap-2">
						<FileText size={16} className="text-teal-600" />
						<span className="text-xs font-bold text-[var(--ink)]">
							Рецептурный бланк: {currentMed.tradeName} ({currentMed.mnn})
						</span>
					</div>

					<button
						type="button"
						onClick={handleCopyLatin}
						className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
						title="Скопировать латинскую пропись"
					>
						<Copy size={12} className="text-teal-600" />
						<span>Копировать Rp.:</span>
					</button>
				</div>

				{/* Latin Signature Box */}
				<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] font-mono text-xs leading-relaxed text-[var(--ink)] select-all whitespace-pre-line">
					{currentMed.rpLatin}
				</div>

				{/* Overdose Protection & Safety Bounds */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
					<div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs space-y-1">
						<div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-300">
							<ShieldCheck size={14} />
							<span>Предельная суточная дозировка:</span>
						</div>
						<p className="m-0 text-[var(--ink)] font-semibold">
							{currentMed.maxDailyDose || "Согласно официальной инструкции"}
						</p>
						<span className="text-[11px] text-[var(--muted)] block">
							Максимальная длительность курса: <strong>{currentMed.maxDurationDays ? `${currentMed.maxDurationDays} дней` : "3–5 дней"}</strong>
						</span>
					</div>

					<div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
						<div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
							<AlertTriangle size={14} />
							<span>Защита от передозировки и риски:</span>
						</div>
						<p className="m-0 text-[var(--ink)] text-[11px] leading-relaxed">
							{currentMed.overdoseWarning || "Не превышать рекомендованную дозировку. Принимать после еды."}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
