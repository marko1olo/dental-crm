import type {
	LabTechnologicalStageId,
	LabTechnologicalStageDefinition,
} from "./labTechnologicalStageTypes";

export type { LabTechnologicalStageId, LabTechnologicalStageDefinition };

const IMPRESSION: LabTechnologicalStageDefinition = {
	id: 'impression_scan',
	stepIndex: 1,
	stepNumber: 1,
	nameRu: '1. Скан/Слепок снят',
	shortTitleRu: 'Скан/Слепок снят',
	departmentRu: 'Клинический кабинет',
	descriptionRu: 'Снятие оттисков или интраоральное цифровое 3D-сканирование.',
	icon: 'scan',
	colorToken: 'var(--brand-500, #3b82f6)'
};

const IN_LAB: LabTechnologicalStageDefinition = {
	id: 'in_lab',
	stepIndex: 2,
	stepNumber: 2,
	nameRu: '2. В лаборатории',
	shortTitleRu: 'В лаборатории',
	departmentRu: 'Зуботехническая лаборатория',
	descriptionRu: 'Изготовление ортопедической конструкции в лаборатории.',
	icon: 'settings',
	colorToken: 'var(--teal, #0d9488)'
};

const READY_CLINIC: LabTechnologicalStageDefinition = {
	id: 'ready_in_clinic',
	stepIndex: 3,
	stepNumber: 3,
	nameRu: '3. Готово в клинике',
	shortTitleRu: 'Готово в клинике',
	departmentRu: 'Регистратура / Склад клиники',
	descriptionRu: 'Работа доставлена в клинику, готова к примерке или фиксации.',
	icon: 'truck',
	colorToken: 'var(--warn, #f59e0b)'
};

const FITTING: LabTechnologicalStageDefinition = {
	id: 'fitting_fixation',
	stepIndex: 4,
	stepNumber: 4,
	nameRu: '4. Примерка / Фиксация',
	shortTitleRu: 'Примерка / Фиксация',
	departmentRu: 'Клинический кабинет ортопеда',
	descriptionRu: 'Клиническая примерка и окончательная фиксация конструкции.',
	icon: 'check',
	colorToken: 'var(--ok, #10b981)'
};

export const LAB_TECHNOLOGICAL_STAGES: Record<LabTechnologicalStageId, LabTechnologicalStageDefinition> = {
	impression_scan: IMPRESSION,
	in_lab: IN_LAB,
	ready_in_clinic: READY_CLINIC,
	fitting_fixation: FITTING,
	// Совместимость с историческими записями:
	waxup_cad: IN_LAB,
	milling_framework: IN_LAB,
	ceramic_layering: IN_LAB,
	glaze_finish: IN_LAB,
	clinical_fitting: FITTING,
	patient_fixation: FITTING
};

export const LAB_TECHNOLOGICAL_STAGE_ORDER: readonly LabTechnologicalStageId[] = [
	'impression_scan',
	'in_lab',
	'ready_in_clinic',
	'fitting_fixation'
];
