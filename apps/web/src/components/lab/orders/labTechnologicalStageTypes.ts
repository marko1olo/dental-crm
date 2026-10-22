export type LabTechnologicalStageId =
	| 'impression_scan'     // 1) Оттиски / 3D-скан
	| 'waxup_cad'           // 2) Wax-Up / CAD-моделирование
	| 'milling_framework'   // 3) Фрезеровка / каркас
	| 'clinical_fitting'    // 4) Примерка в клинике
	| 'ceramic_layering'    // 5) Нанесение керамики / покраска
	| 'glaze_finish'        // 6) Финишная глазуровка
	| 'ready_in_clinic'     // 7) Готовая работа в клинике
	| 'patient_fixation';   // 8) Фиксация пациенту

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
