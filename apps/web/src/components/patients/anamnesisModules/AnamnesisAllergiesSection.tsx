import React from "react";
import { Pill } from "lucide-react";
import type { PatientClinicalSafetyProfile } from "../safetyMath";

export interface AnamnesisAllergiesSectionProps {
	readonly profile: PatientClinicalSafetyProfile;
	readonly onUpdateField: <K extends keyof PatientClinicalSafetyProfile>(key: K, value: PatientClinicalSafetyProfile[K]) => void;
}

export const AnamnesisAllergiesSection: React.FC<AnamnesisAllergiesSectionProps> = React.memo(({ profile, onUpdateField }) => {
	return (
		<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
			<div className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
				<Pill size={16} className="text-teal-600 dark:text-teal-400" />
				<span>Лекарственная непереносимость и аллергоанамнез</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
				<label className="flex items-center gap-2 p-2 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={Boolean(profile.hasArticaineAllergy)}
						onChange={(e) => onUpdateField("hasArticaineAllergy", e.target.checked)}
						className="rounded text-[var(--teal)] focus:ring-[var(--teal)]"
					/>
					<span className={profile.hasArticaineAllergy ? "font-bold text-rose-600 dark:text-rose-400" : ""}>Артикаин (Ультракаин)</span>
				</label>
				<label className="flex items-center gap-2 p-2 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={Boolean(profile.hasLidocaineAllergy)}
						onChange={(e) => onUpdateField("hasLidocaineAllergy", e.target.checked)}
						className="rounded text-[var(--teal)] focus:ring-[var(--teal)]"
					/>
					<span className={profile.hasLidocaineAllergy ? "font-bold text-rose-600 dark:text-rose-400" : ""}>Лидокаин (вкл. спреи)</span>
				</label>
				<label className="flex items-center gap-2 p-2 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={Boolean(profile.hasMepivacaineAllergy)}
						onChange={(e) => onUpdateField("hasMepivacaineAllergy", e.target.checked)}
						className="rounded text-[var(--teal)] focus:ring-[var(--teal)]"
					/>
					<span className={profile.hasMepivacaineAllergy ? "font-bold text-rose-600 dark:text-rose-400" : ""}>Мепивакаин (Скандонест)</span>
				</label>
				<label className="flex items-center gap-2 p-2 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={Boolean(profile.hasSulfiteAllergy)}
						onChange={(e) => onUpdateField("hasSulfiteAllergy", e.target.checked)}
						className="rounded text-[var(--teal)] focus:ring-[var(--teal)]"
					/>
					<span className={profile.hasSulfiteAllergy ? "font-bold text-rose-600 dark:text-rose-400" : ""}>Сульфиты (консерванты)</span>
				</label>
				<label className="flex items-center gap-2 p-2 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={Boolean(profile.hasPenicillinAllergy)}
						onChange={(e) => onUpdateField("hasPenicillinAllergy", e.target.checked)}
						className="rounded text-[var(--teal)] focus:ring-[var(--teal)]"
					/>
					<span className={profile.hasPenicillinAllergy ? "font-bold text-rose-600 dark:text-rose-400" : ""}>Пенициллины (Амоксиклав)</span>
				</label>
				<label className="flex items-center gap-2 p-2 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={Boolean(profile.hasNsaidAllergy)}
						onChange={(e) => onUpdateField("hasNsaidAllergy", e.target.checked)}
						className="rounded text-[var(--teal)] focus:ring-[var(--teal)]"
					/>
					<span className={profile.hasNsaidAllergy ? "font-bold text-rose-600 dark:text-rose-400" : ""}>НПВП (Аспирин, Кеторол)</span>
				</label>
				<label className="flex items-center gap-2 p-2 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={Boolean(profile.hasLatexAllergy)}
						onChange={(e) => onUpdateField("hasLatexAllergy", e.target.checked)}
						className="rounded text-[var(--teal)] focus:ring-[var(--teal)]"
					/>
					<span className={profile.hasLatexAllergy ? "font-bold text-rose-600 dark:text-rose-400" : ""}>Латекс (коффердам)</span>
				</label>
				<label className="flex items-center gap-2 p-2 rounded-lg border border-[var(--line-subtle)] hover:bg-[var(--paper-soft)] cursor-pointer select-none">
					<input
						type="checkbox"
						checked={Boolean(profile.hasIodineAllergy)}
						onChange={(e) => onUpdateField("hasIodineAllergy", e.target.checked)}
						className="rounded text-[var(--teal)] focus:ring-[var(--teal)]"
					/>
					<span className={profile.hasIodineAllergy ? "font-bold text-rose-600 dark:text-rose-400" : ""}>Йод и антисептики</span>
				</label>
			</div>
		</div>
	);
});
