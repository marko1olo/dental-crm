/**
 * Russian Dental Emergency Clinical Protocols & Statutory Presets (Layer 1 Facade)
 * Conforms to Order 786n / 1079n / 1144n / 138н / FAR / StAR
 */

import type { EmergencyScenarioId, EmergencyScenario, EmergencyUrgencyLevel, EmergencyActionStep } from './emergencyModules/emergencyScenarioTypes';
import { scenarioAnaphylaxis } from './presets/scenarioAnaphylaxis';
import { scenarioLastToxicity } from './presets/scenarioLastToxicity';
import { scenarioSyncopeCollapse } from './presets/scenarioSyncopeCollapse';
import { scenarioHypertensiveCrisis } from './presets/scenarioHypertensiveCrisis';
import { scenarioAnginaInfarction } from './presets/scenarioAnginaInfarction';
import { scenarioAsthmaBronchospasm } from './presets/scenarioAsthmaBronchospasm';
import { scenarioHypoglycemia } from './presets/scenarioHypoglycemia';
import { scenarioAspirationSwallowing } from './presets/scenarioAspirationSwallowing';

export type {
	EmergencyScenarioId,
	EmergencyScenario,
	EmergencyUrgencyLevel,
	EmergencyActionStep,
};

export const EMERGENCY_SCENARIOS: Record<EmergencyScenarioId, EmergencyScenario> = {
	anaphylactic_shock: scenarioAnaphylaxis,
	local_anesthetic_toxicity: scenarioLastToxicity,
	syncope_collapse: scenarioSyncopeCollapse,
	hypertensive_crisis: scenarioHypertensiveCrisis,
	angina_myocardial_infarction: scenarioAnginaInfarction,
	bronchospasm_asthma: scenarioAsthmaBronchospasm,
	hypoglycemia_diabetic: scenarioHypoglycemia,
	accidental_swallowing: scenarioAspirationSwallowing,
};
