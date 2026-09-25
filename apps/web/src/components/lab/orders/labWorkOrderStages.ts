/**
 * Canonical 4-Status Clinical Workflow & 8 Technological Lab Stages
 * Russian Dental Laboratory Statutory Process Order & Manufacturing Tracking
 */

// ---------------------------------------------------------------------------
// 4. Canonical 4-Status Clinical Workflow
// ---------------------------------------------------------------------------

export type LabWorkflowStageId =
	| 'draft'                // 0. Черновик наряда
	| 'draft_order'          // Черновик (алиас)
	| 'in_progress'          // 1. В работе
	| 'sent_to_lab'          // Отправлен в лабораторию (алиас)
	| 'fitting_scheduled'    // 2. Примерка назначена
	| 'delivered_completed'  // 3. Сдано
	| 'installed_completed'  // Зафиксировано/сдано (алиас)
	| 'correction_remake'    // 4. Коррекция
	| 'warranty_rework'      // Гарантийная переделка (алиас)
	// Backward compatibility aliases
	| 'impression_sent'
	| 'cad_design'
	| 'milling_wax_up'
	| 'try_in_fitting'
	| 'delivered_to_clinic'
	| 'installed_in_mouth';

export interface LabStageDefinition {
	id: LabWorkflowStageId;
	orderIndex: number;
	nameRu: string;
	shortTitleRu: string;
	icon: string;
	descriptionRu: string;
	colorToken: string;
}

export const LAB_WORKFLOW_STAGES: Record<LabWorkflowStageId, LabStageDefinition> = {
	draft: {
		id: 'draft',
		orderIndex: 0,
		nameRu: '0. Черновик',
		shortTitleRu: 'Черновик',
		icon: 'file-text',
		descriptionRu: 'Черновик наряда формируется врачом в кабинете.',
		colorToken: 'var(--muted, #64748b)'
	},
	draft_order: {
		id: 'draft',
		orderIndex: 0,
		nameRu: '0. Черновик',
		shortTitleRu: 'Черновик',
		icon: 'file-text',
		descriptionRu: 'Черновик наряда формируется врачом в кабинете.',
		colorToken: 'var(--muted, #64748b)'
	},
	in_progress: {
		id: 'in_progress',
		orderIndex: 1,
		nameRu: '1. В работе',
		shortTitleRu: 'В работе',
		icon: 'settings',
		descriptionRu: 'Заказ передан в лабораторию и находится в процессе моделирования и фрезерования.',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	sent_to_lab: {
		id: 'in_progress',
		orderIndex: 1,
		nameRu: '1. В работе',
		shortTitleRu: 'В работе',
		icon: 'settings',
		descriptionRu: 'Заказ передан в лабораторию.',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	fitting_scheduled: {
		id: 'fitting_scheduled',
		orderIndex: 2,
		nameRu: '2. Примерка назначена',
		shortTitleRu: 'Примерка',
		icon: 'search',
		descriptionRu: 'Работа изготовлена ЗТЛ, назначена дата клинической примерки каркаса или реставрации в расписании.',
		colorToken: 'var(--warn, #f59e0b)'
	},
	delivered_completed: {
		id: 'delivered_completed',
		orderIndex: 3,
		nameRu: '3. Сдано',
		shortTitleRu: 'Сдано',
		icon: 'check',
		descriptionRu: 'Ортопедическая конструкция окончательно зафиксирована в полости рта у пациента. Заказ выполнен.',
		colorToken: 'var(--ok, #10b981)'
	},
	installed_completed: {
		id: 'delivered_completed',
		orderIndex: 3,
		nameRu: '3. Сдано',
		shortTitleRu: 'Сдано',
		icon: 'check',
		descriptionRu: 'Ортопедическая конструкция окончательно зафиксирована.',
		colorToken: 'var(--ok, #10b981)'
	},
	correction_remake: {
		id: 'correction_remake',
		orderIndex: 4,
		nameRu: '4. Коррекция',
		shortTitleRu: 'Коррекция',
		icon: 'rotate-ccw',
		descriptionRu: 'Возврат в ЗТЛ на коррекцию окклюзии, цвета, аппроксимальных контактов или переделку.',
		colorToken: 'var(--bad, #ef4444)'
	},
	warranty_rework: {
		id: 'correction_remake',
		orderIndex: 4,
		nameRu: '4. Коррекция',
		shortTitleRu: 'Коррекция',
		icon: 'rotate-ccw',
		descriptionRu: 'Гарантийный возврат на переделку/коррекцию.',
		colorToken: 'var(--bad, #ef4444)'
	},

	// Aliases for backward compatibility with existing saved records
	impression_sent: {
		id: 'in_progress',
		orderIndex: 1,
		nameRu: '1. В работе',
		shortTitleRu: 'В работе',
		icon: 'settings',
		descriptionRu: 'Заказ в лаборатории',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	cad_design: {
		id: 'in_progress',
		orderIndex: 1,
		nameRu: '1. В работе',
		shortTitleRu: 'В работе',
		icon: 'settings',
		descriptionRu: 'Заказ в лаборатории',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	milling_wax_up: {
		id: 'in_progress',
		orderIndex: 1,
		nameRu: '1. В работе',
		shortTitleRu: 'В работе',
		icon: 'settings',
		descriptionRu: 'Заказ в лаборатории',
		colorToken: 'var(--brand-500, #3b82f6)'
	},
	try_in_fitting: {
		id: 'fitting_scheduled',
		orderIndex: 2,
		nameRu: '2. Примерка назначена',
		shortTitleRu: 'Примерка',
		icon: 'search',
		descriptionRu: 'Примерка назначена',
		colorToken: 'var(--warn, #f59e0b)'
	},
	delivered_to_clinic: {
		id: 'fitting_scheduled',
		orderIndex: 2,
		nameRu: '2. Примерка назначена',
		shortTitleRu: 'Примерка',
		icon: 'search',
		descriptionRu: 'В клинике / на примерке',
		colorToken: 'var(--warn, #f59e0b)'
	},
	installed_in_mouth: {
		id: 'delivered_completed',
		orderIndex: 3,
		nameRu: '3. Сдано',
		shortTitleRu: 'Сдано',
		icon: 'check',
		descriptionRu: 'Зафиксировано',
		colorToken: 'var(--ok, #10b981)'
	}
};

export const LAB_STAGE_ORDER: LabWorkflowStageId[] = [
	'in_progress',
	'fitting_scheduled',
	'delivered_completed',
	'correction_remake'
];

// ---------------------------------------------------------------------------
// 4b. Real 8 Technological Production Stages of Dental Laboratory
// 1) Оттиски/3D-скан -> 2) Wax-Up / CAD -> 3) Фрезеровка / каркас ->
// 4) Примерка в клинике -> 5) Нанесение керамики / покраска ->
// 6) Финишная глазуровка -> 7) Готовая работа в клинике -> 8) Фиксация пациенту
// ---------------------------------------------------------------------------

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
