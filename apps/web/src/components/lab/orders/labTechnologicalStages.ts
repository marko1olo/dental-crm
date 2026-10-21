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

export const LAB_TECHNOLOGICAL_STAGES: Record<LabTechnologicalStageId, LabTechnologicalStageDefinition> = {
	impression_scan: {
		id: 'impression_scan',
		stepIndex: 1,
		stepNumber: 1,
		nameRu: '1. Оттиски / 3D-скан',
		shortTitleRu: 'Слепки / Скан',
		departmentRu: 'Клинический кабинет / Терапия-Ортопедия',
		descriptionRu: 'Снятие прецизионных оттисков (А-силикон) или интраоральное 3D-сканирование зубных рядов (STL/PLY).',
		icon: 'scan',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	waxup_cad: {
		id: 'waxup_cad',
		stepIndex: 2,
		stepNumber: 2,
		nameRu: '2. Wax-Up / CAD-моделирование',
		shortTitleRu: 'Wax-Up / CAD',
		departmentRu: 'CAD/CAM лаборатория',
		descriptionRu: 'Цифровое 3D-моделирование анатомической формы реставрации в Exocad или восковой Wax-Up.',
		icon: 'layers',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	milling_framework: {
		id: 'milling_framework',
		stepIndex: 3,
		stepNumber: 3,
		nameRu: '3. Фрезеровка / каркас',
		shortTitleRu: 'Фрезеровка / Каркас',
		departmentRu: 'Фрезерный центр / Литейная',
		descriptionRu: 'CAM-фрезеровка диоксида циркония Prettau/Katana, PMMA или синтеризация Co-Cr каркаса.',
		icon: 'settings',
		colorToken: 'var(--teal, #0d9488)'
	},
	clinical_fitting: {
		id: 'clinical_fitting',
		stepIndex: 4,
		stepNumber: 4,
		nameRu: '4. Примерка в клинике',
		shortTitleRu: 'Примерка каркаса',
		departmentRu: 'Клинический кабинет ортопеда',
		descriptionRu: 'Клиническая примерка каркаса / конструкции в полости рта у пациента, проверка окклюзии и контактов.',
		icon: 'search',
		colorToken: 'var(--warn, #f59e0b)'
	},
	ceramic_layering: {
		id: 'ceramic_layering',
		stepIndex: 5,
		stepNumber: 5,
		nameRu: '5. Нанесение керамики / покраска',
		shortTitleRu: 'Керамика / Покраска',
		departmentRu: 'Керамический цех ЗТЛ',
		descriptionRu: 'Послойное нанесение керамических масс (Duceram, Noritake) или колоризация многослойного циркония.',
		icon: 'palette',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	glaze_finish: {
		id: 'glaze_finish',
		stepIndex: 6,
		stepNumber: 6,
		nameRu: '6. Финишная глазуровка',
		shortTitleRu: 'Глазуровка',
		departmentRu: 'Цех глазуровки и полировки',
		descriptionRu: 'Финальный глазуровочный обжиг в печи, механическая полировка уступа и подгонка аппроксимальных контактов.',
		icon: 'sparkles',
		colorToken: 'var(--teal, #0d9488)'
	},
	ready_in_clinic: {
		id: 'ready_in_clinic',
		stepIndex: 7,
		stepNumber: 7,
		nameRu: '7. Готовая работа в клинике',
		shortTitleRu: 'В клинике',
		departmentRu: 'Регистратура / Склад клиники',
		descriptionRu: 'Работа доставлена курьером в клинику, прошла входной контроль ортопеда и готова к фиксации.',
		icon: 'truck',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	patient_fixation: {
		id: 'patient_fixation',
		stepIndex: 8,
		stepNumber: 8,
		nameRu: '8. Фиксация пациенту',
		shortTitleRu: 'Сдано пациенту',
		departmentRu: 'Клинический кабинет ортопеда',
		descriptionRu: 'Окончательная адгезивная или винтовая фиксация конструкции в полости рта у пациента.',
		icon: 'check',
		colorToken: 'var(--ok, #10b981)'
	}
};

export const LAB_TECHNOLOGICAL_STAGE_ORDER: readonly LabTechnologicalStageId[] = [
	'impression_scan',
	'waxup_cad',
	'milling_framework',
	'clinical_fitting',
	'ceramic_layering',
	'glaze_finish',
	'ready_in_clinic',
	'patient_fixation'
];
