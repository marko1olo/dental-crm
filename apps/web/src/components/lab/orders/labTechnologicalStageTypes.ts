/**
 * 4 прозрачных клинических этапа ортопедического наряда:
 * 1. «Скан/Слепок снят» (impression_scan)
 * 2. «В лаборатории» (in_lab)
 * 3. «Готово в клинике» (ready_in_clinic)
 * 4. «Примерка / Фиксация» (fitting_fixation)
 */
export type CanonicalLabTechnologicalStageId =
	| 'impression_scan'
	| 'in_lab'
	| 'ready_in_clinic'
	| 'fitting_fixation';

/**
 * Обратная совместимость с устаревшими детальными этапами
 */
export type LegacyLabTechnologicalStageId =
	| 'waxup_cad'
	| 'milling_framework'
	| 'clinical_fitting'
	| 'ceramic_layering'
	| 'glaze_finish'
	| 'patient_fixation';

export type LabTechnologicalStageId = CanonicalLabTechnologicalStageId | LegacyLabTechnologicalStageId;

export interface LabTechnologicalStageDefinition {
	id: LabTechnologicalStageId;
	stepIndex: number;
	stepNumber: number;
	nameRu: string;
	shortTitleRu: string;
	departmentRu: string;
	descriptionRu: string;
	icon: string;
	colorToken: string;
}
