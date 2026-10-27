/**
 * AnamnesisAllergyChips.tsx — 1-кликовые чипы аллергий (Пенициллин, Лидокаин, Артикаин, Латекс, Йод).
 * data-testid="toggle-allergy-penicillin" data-testid="toggle-allergy-lidocaine"
 * data-testid="toggle-allergy-articaine" data-testid="toggle-allergy-latex" data-testid="toggle-allergy-iodine"
 * Декомпозирован по Мандату 8b (лимит <= 120 строк).
 */

import React from "react";
import { Pill } from "lucide-react";
import type { PatientClinicalSafetyProfile } from "../safetyMath";
import { AllergyChipButton } from "./AllergyChipButton";

export interface AnamnesisAllergyChipsProps {
	readonly profile: PatientClinicalSafetyProfile;
	readonly onToggleField: (key: keyof PatientClinicalSafetyProfile) => void;
}

const ALLERGY_CHIP_DEFINITIONS = [
	{
		key: "hasPenicillinAllergy" as const,
		testId: "toggle-allergy-penicillin",
		label: "Пенициллин",
		title: "Пенициллиновый ряд (Амоксиклав, Аугментин)",
	},
	{
		key: "hasLidocaineAllergy" as const,
		testId: "toggle-allergy-lidocaine",
		label: "Лидокаин",
		title: "Лидокаин (спреи, инфильтрационная анестезия)",
	},
	{
		key: "hasArticaineAllergy" as const,
		testId: "toggle-allergy-articaine",
		label: "Артикаин",
		title: "Артикаин (Ультракаин, Септанест, Убистезин)",
	},
	{
		key: "hasLatexAllergy" as const,
		testId: "toggle-allergy-latex",
		label: "Латекс",
		title: "Латекс (коффердам, перчатки) — нитриловый протокол",
	},
	{
		key: "hasIodineAllergy" as const,
		testId: "toggle-allergy-iodine",
		label: "Йод (Альвожил)",
		title: "Йод и йодоформсодержащие препараты (Бетадин, Метапекс, Альвожил)",
	},
];

export const AnamnesisAllergyChips: React.FC<AnamnesisAllergyChipsProps> = ({
	profile,
	onToggleField,
}) => {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
					<Pill className="w-3.5 h-3.5 text-rose-500" />
					1. Аллергологический статус (1-кликовые чипы)
				</span>
				<span className="text-[11px] text-[var(--muted,#64748b)]">
					Красный — аллергия / Серый — норма
				</span>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
				{ALLERGY_CHIP_DEFINITIONS.map((chip) => (
					<AllergyChipButton
						key={chip.key}
						testId={chip.testId}
						isActive={Boolean(profile[chip.key])}
						onClick={() => onToggleField(chip.key)}
						label={chip.label}
						title={chip.title}
					/>
				))}
			</div>
		</div>
	);
};
