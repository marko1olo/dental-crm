import type { SyncMutationAction, SyncMutationEntityKind } from "@dental/shared";
import type { MutationAction, MutationEntityType } from "../types";

export function mapToSyncEntityKind(entityType: MutationEntityType): SyncMutationEntityKind {
	switch (entityType) {
		case "DIARY_043_DRAFT": return "visit_diary";
		case "ODONTOGRAM_STATUS": return "odontogram_state";
		case "PRESCRIPTION_107_DRAFT": return "clinical_task";
		case "DOCUMENT_DRAFT": return "visit";
		case "CASH_RECEIPT_DRAFT": return "payment";
		case "APPOINTMENT_BOOKING_DRAFT": return "appointment";
		case "TREATMENT_PLAN_DRAFT": return "treatment_item";
		case "PATIENT_DRAFT":
		case "GENERIC": return "patient";
		case "IMAGING_STUDY_DRAFT": return "visit";
		case "patient":
		case "visit":
		case "visit_diary":
		case "payment":
		case "patient_invoice":
		case "appointment":
		case "treatment_item":
		case "clinical_task":
		case "odontogram_state":
		case "patient_administrative_profile": return entityType;
		default: return "patient";
	}
}

export function mapToSyncAction(action: MutationAction): SyncMutationAction {
	if (action === "sync") return "update";
	return action;
}
