import type { LabWorkflowStageId, LabStageDefinition } from "./labWorkOrderStageTypes";

export const LAB_STAGE_ALIASES: Partial<Record<LabWorkflowStageId, LabStageDefinition>> = {
	draft_order: {
		id: 'draft',
		orderIndex: 0,
		nameRu: '0. Черновик',
		shortTitleRu: 'Черновик',
		icon: 'file-text',
		descriptionRu: 'Черновик наряда формируется врачом в кабинете.',
		colorToken: 'var(--muted, #64748b)'
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
	installed_completed: {
		id: 'delivered_completed',
		orderIndex: 3,
		nameRu: '3. Сдано',
		shortTitleRu: 'Сдано',
		icon: 'check',
		descriptionRu: 'Ортопедическая конструкция окончательно зафиксирована.',
		colorToken: 'var(--ok, #10b981)'
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
