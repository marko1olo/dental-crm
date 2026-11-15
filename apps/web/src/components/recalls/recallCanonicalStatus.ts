export type RecallContactStatus =
	| "due_now"
	| "invited"
	| "scheduled"
	| "completed"
	| "declined"
	| "pending"
	| "contacted";

export type CanonicalRecallWorkflowStatus =
	| "not_called"
	| "reached"
	| "declined"
	| "scheduled";

export const CANONICAL_RECALL_STATUS_CONFIG: Readonly<
	Record<CanonicalRecallWorkflowStatus, { readonly id: CanonicalRecallWorkflowStatus; readonly label: string; readonly badgeColorToken: string }>
> = {
	not_called: { id: "not_called", label: "Пора приглашать", badgeColorToken: "warning" },
	reached: { id: "reached", label: "Приглашение отправлено (WhatsApp/СМС)", badgeColorToken: "info" },
	declined: { id: "declined", label: "Отказ / Перенос", badgeColorToken: "danger" },
	scheduled: { id: "scheduled", label: "Записан на приём", badgeColorToken: "success" },
};

export function toCanonicalRecallStatus(status: RecallContactStatus): CanonicalRecallWorkflowStatus {
	switch (status) {
		case "due_now":
		case "pending":
			return "not_called";
		case "invited":
		case "contacted":
			return "reached";
		case "declined":
			return "declined";
		case "scheduled":
		case "completed":
			return "scheduled";
		default:
			return "not_called";
	}
}

export function fromCanonicalRecallStatus(canonical: CanonicalRecallWorkflowStatus): RecallContactStatus {
	switch (canonical) {
		case "not_called":
			return "due_now";
		case "reached":
			return "contacted";
		case "declined":
			return "declined";
		case "scheduled":
			return "scheduled";
	}
}
