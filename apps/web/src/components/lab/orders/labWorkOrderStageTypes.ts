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
