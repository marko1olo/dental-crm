import React from "react";
import { ChevronDown } from "lucide-react";
import type { PatientClinicalSafetyProfile } from "../safetyMath";
import { AnamnesisAllergiesSection } from "./AnamnesisAllergiesSection";
import { AnamnesisCardioAndHemostasisSection } from "./AnamnesisCardioAndHemostasisSection";
import { AnamnesisChronicAndPregnancySection } from "./AnamnesisChronicAndPregnancySection";

export interface AnamnesisAccordionSectionsProps {
	profile: PatientClinicalSafetyProfile;
	onUpdateField: <K extends keyof PatientClinicalSafetyProfile>(key: K, value: PatientClinicalSafetyProfile[K]) => void;
}

export const AnamnesisAccordionSections: React.FC<AnamnesisAccordionSectionsProps> = ({ profile, onUpdateField }) => {
	return (
		<>
			<div className="p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20">
				<label className="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						checked={Boolean(profile.hasNsaidAllergy)}
						onChange={() => onUpdateField("hasNsaidAllergy", !profile.hasNsaidAllergy)}
						data-testid="toggle-nsaid-allergy"
						className="rounded text-[var(--teal)]"
					/>
					<span className="text-xs font-bold text-rose-700 dark:text-rose-300">
						Аллергия на НПВП (Аспирин, Кеторол, Ибупрофен)
					</span>
				</label>
			</div>

			<details open className="group rounded-xl border border-[var(--line-subtle)] bg-[var(--paper-soft)] p-1">
				<summary className="font-bold text-xs p-2 cursor-pointer select-none text-[var(--ink)] flex items-center justify-between">
					<span>Лекарственная непереносимость и аллергоанамнез</span>
					<ChevronDown size={14} className="text-[var(--muted)] group-open:rotate-180 transition-transform shrink-0" />
				</summary>
				<div className="pt-2">
					<AnamnesisAllergiesSection profile={profile} onUpdateField={onUpdateField} />
				</div>
			</details>

			<details open className="group rounded-xl border border-[var(--line-subtle)] bg-[var(--paper-soft)] p-1">
				<summary className="font-bold text-xs p-2 cursor-pointer select-none text-[var(--ink)] flex items-center justify-between">
					<span>Кардиология, гемостаз и стоп-факторы</span>
					<ChevronDown size={14} className="text-[var(--muted)] group-open:rotate-180 transition-transform shrink-0" />
				</summary>
				<div className="pt-2">
					<AnamnesisCardioAndHemostasisSection profile={profile} onUpdateField={onUpdateField} />
				</div>
			</details>

			<details open className="group rounded-xl border border-[var(--line-subtle)] bg-[var(--paper-soft)] p-1">
				<summary className="font-bold text-xs p-2 cursor-pointer select-none text-[var(--ink)] flex items-center justify-between">
					<span>Беременность, соматика и инфекционный статус</span>
					<ChevronDown size={14} className="text-[var(--muted)] group-open:rotate-180 transition-transform shrink-0" />
				</summary>
				<div className="pt-2">
					<AnamnesisChronicAndPregnancySection profile={profile} onUpdateField={onUpdateField} />
				</div>
			</details>
		</>
	);
};
