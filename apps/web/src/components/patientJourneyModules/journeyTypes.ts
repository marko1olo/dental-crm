import type { Dashboard } from "@dental/shared";

export interface JourneyEvent {
	id: string;
	timestamp: string;
	type:
		| "appointment"
		| "medical_alert"
		| "lab_order"
		| "transaction"
		| "inventory_depletion";
	title: string;
	description: string;
	amount?: number;
	status?: string;
	actionUrl?: string;
}

export interface PatientJourneyTimelineProps {
	patientId: string;
	dashboard?: Dashboard | null | undefined;
}

export interface PatientTimelineCardProps {
	evt: JourneyEvent;
	isFirst: boolean;
	isLast: boolean;
	searchQuery: string;
}
