export type ClinicalTaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type CustomTaskType = {
	id: string;
	organizationId: string;
	typeCode: string;
	typeLabel: string;
	colorHex: string;
	requiresPatientBinding: boolean;
	defaultSlaHours: number;
	createdAt: string;
};

export type ClinicalTask = {
	id: string;
	organizationId: string;
	patientId: string;
	treatmentPlanId: string | null;
	assignedDoctorId: string | null;
	taskType: string;
	status: ClinicalTaskStatus;
	title: string;
	description: string | null;
	dueAt: string | null;
	createdAt: string;
};

export type ClinicalPhaseCode = "PHASE_1_THERAPY" | "PHASE_2_SURGERY";

export type ClinicalTaskPreset = {
	readonly id: string;
	readonly testId: string;
	readonly label: string;
	readonly title: string;
	readonly defaultDescription: string;
	readonly taskType: string;
	readonly computeDueAt: () => string;
	readonly hint: string;
};

export type PhaseOption = {
	code: ClinicalPhaseCode;
	/** Текст на кнопке — как произносят вслух. */
	buttonLabel: string;
	/** Короткая подпись, что именно фиксируем. */
	hint: string;
};

export const OPEN_STATUSES = new Set<ClinicalTaskStatus>(["pending", "in_progress"]);

export const STATUS_LABELS: Record<ClinicalTaskStatus, string> = {
	pending: "ожидает",
	in_progress: "в работе",
	completed: "выполнена",
	cancelled: "отменена",
};

export type ClinicalTasksPanelProps = {
	patientId: string | null | undefined;
	/** Врач, которому адресуем задачу передачи (если известен). */
	assignedDoctorId?: string | null;
	treatmentPlanId?: string | null;
};
