import React from "react";
import { ShieldCheck } from "lucide-react";
import {
	IntakeVitalSignsBar,
	createDefaultNormalVitalSigns,
} from "./IntakeVitalSignsBar";
import {
	IntakeSomaticCheckboxesGrid,
	createDefaultHealthyIntakeSomaticState,
	toggleIntakeAllergen,
	toggleIntakeSomaticChip,
	toggleIntakeStopFactor,
} from "./IntakeSomaticCheckboxesGrid";
import type {
	IntakeSomaticQuestionnaireState,
	IntakeVitalSignsState,
} from "./intakeCockpitTypes";

export interface IntakeCockpitTriageSectionProps {
	readonly vitals: IntakeVitalSignsState;
	readonly setVitals: React.Dispatch<React.SetStateAction<IntakeVitalSignsState>>;
	readonly somaticState: IntakeSomaticQuestionnaireState;
	readonly setSomaticState: React.Dispatch<React.SetStateAction<IntakeSomaticQuestionnaireState>>;
}

export function IntakeCockpitTriageSection({
	vitals,
	setVitals,
	somaticState,
	setSomaticState,
}: IntakeCockpitTriageSectionProps) {
	return (
		<section className="space-y-3 p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] animate-in fade-in duration-150">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<ShieldCheck size={16} className="text-teal-600 dark:text-teal-400" />
					<h3 className="m-0 text-xs font-bold text-[var(--ink)]">
						Первичный экспресс-скрининг безопасности перед анестезией
					</h3>
				</div>
				<span className="text-[11px] text-[var(--muted)]">
					Безопасность анестезии • Протокол допуска
				</span>
			</div>

			<IntakeVitalSignsBar
				vitals={vitals}
				hasCardiovascularStopFactor={somaticState.selectedStopFactorIds.includes("cvd_infarct_stroke")}
				onUpdateVitals={(patch) => setVitals((prev) => ({ ...prev, ...patch }))}
				onApplyNormalVitals={() => setVitals(createDefaultNormalVitalSigns())}
			/>

			<IntakeSomaticCheckboxesGrid
				state={somaticState}
				onToggleQuickChip={(id) => setSomaticState((prev) => toggleIntakeSomaticChip(prev, id))}
				onToggleAllergen={(id) => setSomaticState((prev) => toggleIntakeAllergen(prev, id))}
				onToggleStopFactor={(id) => setSomaticState((prev) => toggleIntakeStopFactor(prev, id))}
				onApplyHealthyNorm={() => setSomaticState(createDefaultHealthyIntakeSomaticState())}
			/>
		</section>
	);
}
