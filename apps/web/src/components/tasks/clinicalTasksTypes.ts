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

export type TaskDeadlineCategory = "today" | "tomorrow" | "overdue" | "upcoming" | "no_due";

export type TaskDeadlineFilter = "all" | "today" | "tomorrow" | "overdue";

export const DEADLINE_FILTER_LABELS: Record<TaskDeadlineFilter, string> = {
	all: "Все",
	today: "Сегодня",
	tomorrow: "Завтра",
	overdue: "Просрочено",
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
	patientName?: string | null;
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
	patientName?: string | null;
};

export interface ClinicalTasksTableProps {
	readonly visibleTasks: readonly ClinicalTask[];
	readonly completingTaskId: string | null;
	readonly onCompleteTask: (taskId: string) => void;
	readonly onAddTask?:
		| ((task: {
				title: string;
				description?: string | undefined;
				dueAt?: string | undefined;
				taskType?: string | undefined;
		  }) => void | Promise<void>)
		| undefined;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly assignedDoctorId?: string | null | undefined;
}
