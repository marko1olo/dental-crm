/**
 * apps/web/src/components/visit/anamnesisTab/SomaticRiskClarifyInputs.tsx
 *
 * Уточняющие поля ввода для антикоагулянтов, бисфосфонатов и триместра беременности (Мандат 8e).
 */

import React, { useId } from "react";
import type { PregnancyTrimester } from "./types";

export interface SomaticRiskClarifyInputsProps {
	readonly selectedRisks: readonly string[];
	readonly anticoagulantName: string;
	readonly setAnticoagulantName: (value: string) => void;
	readonly bisphosphonateName: string;
	readonly setBisphosphonateName: (value: string) => void;
	readonly pregnancyTrimester: PregnancyTrimester;
	readonly setPregnancyTrimester: (value: PregnancyTrimester) => void;
}

export const SomaticRiskClarifyInputs: React.FC<SomaticRiskClarifyInputsProps> = ({
	selectedRisks,
	anticoagulantName,
	setAnticoagulantName,
	bisphosphonateName,
	setBisphosphonateName,
	pregnancyTrimester,
	setPregnancyTrimester,
}) => {
	const anticoagulantInputId = useId();
	const bisphosphonateInputId = useId();

	const hasAnti = selectedRisks.some((r) => r.includes("антикоагулянт"));
	const hasBis = selectedRisks.some((r) => r.includes("бисфосфонат"));
	const hasPreg = selectedRisks.some((r) => r.includes("Беременность") || r.includes("лактац"));

	if (!hasAnti && !hasBis && !hasPreg) return null;

	return (
		<div className="anamnesis-clarify-card">
			{hasAnti && (
				<div className="flex flex-col gap-1">
					<label htmlFor={anticoagulantInputId} className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
						Препарат антикоагулянта и МНО:
					</label>
					<input
						id={anticoagulantInputId}
						type="text"
						value={anticoagulantName}
						onChange={(e) => setAnticoagulantName(e.target.value)}
						placeholder="Варфарин (МНО 2.1), Ксарелто 20 мг..."
						className="anamnesis-input"
					/>
				</div>
			)}

			{hasBis && (
				<div className="flex flex-col gap-1">
					<label htmlFor={bisphosphonateInputId} className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
						Препарат бисфосфонатов (риск БОНЧ):
					</label>
					<input
						id={bisphosphonateInputId}
						type="text"
						value={bisphosphonateName}
						onChange={(e) => setBisphosphonateName(e.target.value)}
						placeholder="Акласта 5 мг/год, Пролиа, Зомета..."
						className="anamnesis-input"
					/>
				</div>
			)}

			{hasPreg && (
				<div className="flex flex-col gap-1">
					<span className="text-[11px] font-bold text-pink-800 dark:text-pink-300">
						Срок / Период лактации:
					</span>
					<select
						value={pregnancyTrimester}
						onChange={(e) => setPregnancyTrimester(e.target.value as PregnancyTrimester)}
						className="anamnesis-input"
						aria-label="Срок беременности или период лактации"
					>
						<option value="trimester_1">1-й триместр (неотложка, без адреналина)</option>
						<option value="trimester_2">2-й триместр (безопасное окно)</option>
						<option value="trimester_3">3-й триместр</option>
						<option value="lactation">Период лактации / ГВ</option>
					</select>
				</div>
			)}
		</div>
	);
};
