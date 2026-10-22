/**
 * Emergency Scenario Types (Layer 0)
 * Types for outpatient urgent dental conditions and resuscitation protocols.
 */

export type EmergencyScenarioId =
	| 'anaphylactic_shock'
	| 'local_anesthetic_toxicity'
	| 'syncope_collapse'
	| 'hypertensive_crisis'
	| 'angina_myocardial_infarction'
	| 'bronchospasm_asthma'
	| 'hypoglycemia_diabetic'
	| 'accidental_swallowing';

export type EmergencyUrgencyLevel =
	| 'critical_resuscitation'
	| 'urgent_intervention'
	| 'urgent_monitoring';

export interface EmergencyActionStep {
	id: string;
	order: number;
	titleRu: string;
	descriptionRu: string;
	isCritical: boolean;
	dosageHintRu?: string | undefined;
	contraindicationWarningRu?: string | undefined;
	timeframeMinutes?: number | undefined;
	requiresAdrenalineTimer?: boolean | undefined;
	drugId?: string | undefined;
}

export interface EmergencyScenario {
	id: EmergencyScenarioId;
	nameRu: string;
	subtitleRu: string;
	icd10Code: string;
	icd10NameRu: string;
	urgencyLevel: EmergencyUrgencyLevel;
	statutoryLegalBasisRu: string;
	clinicalManifestationsRu: string[];
	differentialDiagnosticsRu: string;
	actionSteps: EmergencyActionStep[];
	emergencyCallGuidanceRu: string;
	smpHandoverSummaryRu: string;
	postEmergencyForm043uTemplateRu: string;
}
