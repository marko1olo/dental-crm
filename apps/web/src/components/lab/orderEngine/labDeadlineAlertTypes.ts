import type { DentalLabOrderStatus } from "../dentalLabDefinitions";

export type LabDeadlineAlertSeverity =
	| "CRITICAL_TODAY"
	| "OVERDUE"
	| "URGENT_TODAY"
	| "INFO"
	| "OK"
	| "VISIT_CONFLICT";

export interface LabDeadlineAlertResult {
	readonly hasAlert: boolean;
	readonly isDelayedAlert: boolean;
	readonly severity: LabDeadlineAlertSeverity;
	readonly badgeTextRu: string;
	readonly messageRu: string;
	readonly actionRu: string;
	readonly daysUntilDeadline: number;
	readonly badgeLabelRu?: string;
	readonly actionPromptRu?: string;
	readonly warningRu?: string;
}

export interface CheckLabOrderAlertParams {
	readonly status: DentalLabOrderStatus;
	readonly deadlineDate?: string | Date | undefined;
	readonly dueDate?: string | Date | undefined;
	readonly scheduledVisitDate?: string | Date | null | undefined;
	readonly todayDate?: string | Date | undefined;
	readonly patientName?: string | undefined;
	readonly toothNotation?: string | undefined;
	readonly orderId?: string | undefined;
	readonly orderNumber?: string | undefined;
}
