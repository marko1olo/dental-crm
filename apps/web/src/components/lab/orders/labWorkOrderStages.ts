/**
 * Canonical 4-Status Clinical Workflow & 8 Technological Lab Stages
 * Russian Dental Laboratory Statutory Process Order & Manufacturing Tracking
 */

export {
	type LabTechnologicalStageId,
	type LabTechnologicalStageDefinition,
	LAB_TECHNOLOGICAL_STAGES,
	LAB_TECHNOLOGICAL_STAGE_ORDER,
} from './labTechnologicalStages';

export {
	type LabWorkflowStageId,
	type LabStageDefinition,
} from './labWorkOrderStageTypes';

import type { LabWorkflowStageId, LabStageDefinition } from './labWorkOrderStageTypes';
import { LAB_STAGE_ALIASES } from './labWorkOrderStageAliases';

export const LAB_WORKFLOW_STAGES: Record<LabWorkflowStageId, LabStageDefinition> = Object.assign(
	{
		draft: {
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
		correction_remake: {
			id: 'correction_remake',
			orderIndex: 4,
			nameRu: '4. Коррекция',
			shortTitleRu: 'Коррекция',
			icon: 'rotate-ccw',
			descriptionRu: 'Возврат в ЗТЛ на коррекцию окклюзии, цвета, аппроксимальных контактов или переделку.',
			colorToken: 'var(--bad, #ef4444)'
		},
	},
	LAB_STAGE_ALIASES as Record<LabWorkflowStageId, LabStageDefinition>,
);

export const LAB_STAGE_ORDER: LabWorkflowStageId[] = [
	'in_progress',
	'fitting_scheduled',
	'delivered_completed',
	'correction_remake'
];
