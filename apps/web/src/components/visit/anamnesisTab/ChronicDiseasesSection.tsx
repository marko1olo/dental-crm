/**
 * apps/web/src/components/visit/anamnesisTab/ChronicDiseasesSection.tsx
 *
 * Layer 2: Клинические соматические стоп-факторы и стоматологический анамнез (Мандат 8e).
 */

import React from "react";
import { Check, HeartPulse, Plus } from "lucide-react";
import { type PregnancyTrimester, SOMATIC_STOP_FACTORS } from "./types";
import { SomaticRiskClarifyInputs } from "./SomaticRiskClarifyInputs";
import { DentalHistorySection } from "./DentalHistorySection";

export interface ChronicDiseasesSectionProps {
	readonly selectedRisks: readonly string[];
	readonly toggleRisk: (label: string) => void;
	readonly anticoagulantName: string;
	readonly setAnticoagulantName: (value: string) => void;
	readonly bisphosphonateName: string;
	readonly setBisphosphonateName: (value: string) => void;
	readonly pregnancyTrimester: PregnancyTrimester;
	readonly setPregnancyTrimester: (value: PregnancyTrimester) => void;
	readonly selectedHistory: readonly string[];
	readonly toggleHistory: (label: string) => void;
}

export const ChronicDiseasesSection: React.FC<ChronicDiseasesSectionProps> = ({
	selectedRisks,
	toggleRisk,
	anticoagulantName,
	setAnticoagulantName,
	bisphosphonateName,
	setBisphosphonateName,
	pregnancyTrimester,
	setPregnancyTrimester,
	selectedHistory,
	toggleHistory,
}) => {
	return (
		<>
			<div className="space-y-3 p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/50 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
				<div className="flex items-center justify-between">
					<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
						<HeartPulse className="w-4 h-4 text-amber-500" />
						<span>2. Клинические стоп-факторы и соматический статус</span>
					</label>
					<span className="text-[11px] text-[var(--muted,#64748b)]">
						Инфаркт, ЭКС, антикоагулянты, бисфосфонаты, диабет
					</span>
				</div>

				<div className="flex flex-wrap gap-2">
					{SOMATIC_STOP_FACTORS.map((item) => {
						const isSelected = selectedRisks.includes(item.label);
						const activeClass = item.isCritical
							? "anamnesis-chip--active-danger"
							: "anamnesis-chip--active-warning";
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => toggleRisk(item.label)}
								data-testid={`toggle-stop-${item.id}`}
								title={item.hint}
								className={`anamnesis-chip ${isSelected ? activeClass : ""}`}
							>
								{isSelected ? (
									<Check
										className={`w-3.5 h-3.5 ${
											item.isCritical ? "text-[#ef4444]" : "text-amber-600 dark:text-amber-400"
										}`}
									/>
								) : (
									<Plus className="w-3.5 h-3.5 text-[var(--muted,#64748b)]" />
								)}
								<span>{item.label}</span>
							</button>
						);
					})}
				</div>

				<SomaticRiskClarifyInputs
					selectedRisks={selectedRisks}
					anticoagulantName={anticoagulantName}
					setAnticoagulantName={setAnticoagulantName}
					bisphosphonateName={bisphosphonateName}
					setBisphosphonateName={setBisphosphonateName}
					pregnancyTrimester={pregnancyTrimester}
					setPregnancyTrimester={setPregnancyTrimester}
				/>
			</div>

			<DentalHistorySection
				selectedHistory={selectedHistory}
				toggleHistory={toggleHistory}
			/>
		</>
	);
};
