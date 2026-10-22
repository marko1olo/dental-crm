/**
 * Emergency Scenarios Strip (Layer 4)
 * Horizontal tab strip for immediate scenario selection with ICD-10 codes.
 */

import React from 'react';
import { EMERGENCY_SCENARIOS, type EmergencyScenarioId } from '../emergencyRescuePresets';

const SCENARIO_SHORT_NAMES: Record<EmergencyScenarioId, string> = {
	anaphylactic_shock: 'Анафилаксия',
	local_anesthetic_toxicity: 'Токсичность анестетиков',
	syncope_collapse: 'Обморок / Коллапс',
	hypertensive_crisis: 'Гипертонический криз',
	angina_myocardial_infarction: 'Стенокардия',
	bronchospasm_asthma: 'Бронхоспазм',
	hypoglycemia_diabetic: 'Гипогликемия',
	accidental_swallowing: 'Аспирация',
};

interface EmergencyScenariosStripProps {
	activeScenarioId: EmergencyScenarioId;
	setActiveScenarioId: (id: EmergencyScenarioId) => void;
}

export function EmergencyScenariosStrip({
	activeScenarioId,
	setActiveScenarioId,
}: EmergencyScenariosStripProps) {
	return (
		<div className="emergency-scenarios-strip" role="tablist" aria-label="Повод к вызову и клинический сценарий">
			{(Object.keys(EMERGENCY_SCENARIOS) as EmergencyScenarioId[]).map((scId) => {
				const scenario = EMERGENCY_SCENARIOS[scId];
				const isActive = scenario.id === activeScenarioId;
				const shortName = SCENARIO_SHORT_NAMES[scenario.id] || scenario.nameRu;
				return (
					<button
						key={scenario.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						className={`emergency-scenario-card ${isActive ? 'active' : ''}`}
						onClick={() => setActiveScenarioId(scenario.id)}
						title={`${scenario.nameRu} (${scenario.icd10Code}) — ${scenario.subtitleRu}`}
					>
						<div className="emergency-scenario-name min-w-0">
							<span className="min-w-0">{shortName}</span>
							<span className="emergency-scenario-icd">{scenario.icd10Code}</span>
						</div>
					</button>
				);
			})}
		</div>
	);
}
