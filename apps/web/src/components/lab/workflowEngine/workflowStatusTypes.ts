export type LabWorkflowStatus =
	| "draft" // 1. Черновик (оформление ортопедом)
	| "sent_to_lab" // 2. Отправлено в ЗТЛ (передано курьеру)
	| "fitting_scheduled" // 3. Примерка назначена [fittingDate / appointmentId]
	| "installed_completed" // 4. Сдано пациенту (окончательная фиксация)
	| "warranty_rework"; // 5. Гарантийная переделка / рекламация ЗТЛ

export type LabProductionStageId = LabWorkflowStatus;

export interface LabWorkflowStatusDefinition {
	readonly id: LabWorkflowStatus;
	readonly stepIndex: number;
	readonly nameRu: string;
	readonly shortTitleRu: string;
	readonly descriptionRu: string;
	readonly icon: string;
	readonly badgeClass: string;
	readonly colorHex: string;
}

export const LAB_WORKFLOW_STATUSES: Record<LabWorkflowStatus, LabWorkflowStatusDefinition> = {
	draft: {
		id: "draft",
		stepIndex: 1,
		nameRu: "Черновик",
		shortTitleRu: "Черновик",
		descriptionRu: "Наряд-заказ первично оформлен ортопедом, уточняются параметры слепка и оттенок.",
		icon: "FileText",
		badgeClass: "badge-slate",
		colorHex: "#64748b",
	},
	sent_to_lab: {
		id: "sent_to_lab",
		stepIndex: 2,
		nameRu: "Отправлено в ЗТЛ",
		shortTitleRu: "В лаборатории",
		descriptionRu: "Слепки / цифровые сканы переданы курьеру и поступили в зуботехническую лабораторию.",
		icon: "Truck",
		badgeClass: "badge-blue",
		colorHex: "#3b82f6",
	},
	fitting_scheduled: {
		id: "fitting_scheduled",
		stepIndex: 3,
		nameRu: "Примерка назначена",
		shortTitleRu: "Примерка",
		descriptionRu: "Работа изготовлена ЗТЛ, назначена дата клинической примерки или сдачи в расписании приема.",
		icon: "Calendar",
		badgeClass: "badge-amber",
		colorHex: "#f59e0b",
	},
	installed_completed: {
		id: "installed_completed",
		stepIndex: 4,
		nameRu: "Сдано пациенту",
		shortTitleRu: "Сдано",
		descriptionRu: "Ортопедическая конструкция окончательно зафиксирована в полости рта пациента, наряд закрыт.",
		icon: "CheckCircle2",
		badgeClass: "badge-emerald",
		colorHex: "#10b981",
	},
	warranty_rework: {
		id: "warranty_rework",
		stepIndex: 5,
		nameRu: "Гарантийная переделка / рекламация",
		shortTitleRu: "Переделка / Рекламация",
		descriptionRu: "Работа направлена в ЗТЛ на гарантийную переделку или доработку.",
		icon: "RotateCcw",
		badgeClass: "badge-rose",
		colorHex: "#f43f5e",
	},
};

export const LAB_WORKFLOW_STATUS_ORDER: readonly LabWorkflowStatus[] = [
	"draft",
	"sent_to_lab",
	"fitting_scheduled",
	"installed_completed",
];

export const ALL_LAB_WORKFLOW_STATUSES: readonly LabWorkflowStatus[] = [
	...LAB_WORKFLOW_STATUS_ORDER,
	"warranty_rework",
];

export const LAB_PRODUCTION_STAGES = LAB_WORKFLOW_STATUSES;
export const LAB_PRODUCTION_STAGE_ORDER = LAB_WORKFLOW_STATUS_ORDER;

export function canAdvanceLabStage(
	currentStage: LabWorkflowStatus,
	targetStage: LabWorkflowStatus,
): boolean {
	if (currentStage === targetStage) return true;
	if (targetStage === "warranty_rework") {
		return currentStage === "installed_completed" || currentStage === "fitting_scheduled";
	}
	if (currentStage === "warranty_rework") {
		return targetStage === "sent_to_lab" || targetStage === "fitting_scheduled" || targetStage === "installed_completed";
	}
	const currentIndex = LAB_WORKFLOW_STATUSES[currentStage]?.stepIndex ?? 1;
	const targetIndex = LAB_WORKFLOW_STATUSES[targetStage]?.stepIndex ?? 1;
	return targetIndex >= 1 && targetIndex <= 5 && currentIndex >= 1;
}

export function getNextLabProductionStage(
	currentStage: LabWorkflowStatus,
): LabWorkflowStatus | null {
	if (currentStage === "warranty_rework") {
		return "sent_to_lab";
	}
	const currentIndex = LAB_WORKFLOW_STATUS_ORDER.indexOf(currentStage);
	if (currentIndex === -1 || currentIndex >= LAB_WORKFLOW_STATUS_ORDER.length - 1) {
		return null;
	}
	return LAB_WORKFLOW_STATUS_ORDER[currentIndex + 1] ?? null;
}
