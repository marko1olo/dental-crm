/**
 * AnamnesisRiskFactorsGrid.tsx — Сетка соматических факторов риска и сопутствующих препаратов.
 * Декомпозирован по Мандату 8b (лимит <= 120 строк).
 */

import React from "react";
import { HeartPulse } from "lucide-react";
import type { PatientClinicalSafetyProfile } from "../safetyMath";
import { RiskFactorButton } from "./RiskFactorButton";
import { RiskFactorMedicationsInput } from "./RiskFactorMedicationsInput";

export interface AnamnesisRiskFactorsGridProps {
	readonly profile: PatientClinicalSafetyProfile;
	readonly anticoagulantInputId: string;
	readonly bisphosphonateInputId: string;
	readonly onToggleField: (key: keyof PatientClinicalSafetyProfile) => void;
	readonly onUpdateField: <K extends keyof PatientClinicalSafetyProfile>(
		key: K,
		value: PatientClinicalSafetyProfile[K],
	) => void;
}

export const AnamnesisRiskFactorsGrid: React.FC<AnamnesisRiskFactorsGridProps> = ({
	profile,
	anticoagulantInputId,
	bisphosphonateInputId,
	onToggleField,
	onUpdateField,
}) => {
	const isPregnant = profile.pregnancyTrimester !== "none";

	return (
		<div className="space-y-2">
			<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
				<HeartPulse className="w-3.5 h-3.5 text-blue-500" />
				2. Соматические факторы риска и препараты
			</span>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
				<RiskFactorButton
					testId="toggle-hypertension"
					isActive={Boolean(profile.hasHypertension)}
					onClick={() => onToggleField("hasHypertension")}
					label="Гипертония (АД)"
					title="Гипертоническая болезнь / ИБС (лимит адреналина 0.04 мг)"
				/>

				<RiskFactorButton
					testId="toggle-pacemaker"
					isActive={Boolean(profile.hasPacemakerExs)}
					onClick={() => onToggleField("hasPacemakerExs")}
					label="ЭКС (Запрет УЗ)"
					title="Имплантированный кардиостимулятор — абсолютный запрет УЗ-скейлеров"
					isCritical={true}
				/>

				<RiskFactorButton
					testId="toggle-anticoagulants"
					isActive={Boolean(profile.takesAnticoagulants)}
					onClick={() => onToggleField("takesAnticoagulants")}
					label="Антикоагулянты"
					title="Антикоагулянты (Ксарелто, Варфарин, Эликвис) — контроль гемостаза"
					isCritical={true}
				/>

				<RiskFactorButton
					testId="toggle-bisphosphonates"
					isActive={Boolean(profile.takesBisphosphonates)}
					onClick={() => onToggleField("takesBisphosphonates")}
					label="Бисфосфонаты (MRONJ)"
					title="Бисфосфонатная терапия — риск медикаментозного остеонекроза челюсти (MRONJ)"
					isCritical={true}
				/>

				<RiskFactorButton
					testId="toggle-diabetes"
					isActive={Boolean(profile.hasDiabetesMellitus)}
					onClick={() => onToggleField("hasDiabetesMellitus")}
					label="Сахарный диабет"
					title="Сахарный диабет (риск гипогликемии и замедленной регенерации)"
				/>

				<RiskFactorButton
					testId="toggle-asthma"
					isActive={Boolean(profile.hasBronchialAsthma)}
					onClick={() => onToggleField("hasBronchialAsthma")}
					label="Бронхиальная астма"
					title="Бронхиальная астма (ингалятор пациента должен быть на манипуляционном столике)"
				/>

				<RiskFactorButton
					testId="toggle-pregnancy"
					isActive={isPregnant}
					onClick={() => onUpdateField("pregnancyTrimester", isPregnant ? "none" : "trimester_2")}
					label="Беременность (2 трим)"
					title="Беременность (2-й триместр — безопасное окно, анестетики без адреналина)"
					colorVariant="pink"
				/>

				<RiskFactorButton
					testId="toggle-nsaid"
					isActive={Boolean(profile.hasNsaidAllergy)}
					onClick={() => onToggleField("hasNsaidAllergy")}
					label="НПВП / Аспирин"
					title="Непереносимость НПВП (Аспирин, Кеторол, Ибупрофен)"
					isCritical={true}
				/>
			</div>

			<RiskFactorMedicationsInput
				profile={profile}
				anticoagulantInputId={anticoagulantInputId}
				bisphosphonateInputId={bisphosphonateInputId}
				onUpdateField={onUpdateField}
			/>
		</div>
	);
};
