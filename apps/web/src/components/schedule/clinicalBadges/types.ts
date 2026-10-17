import type {
	Appointment,
	AppointmentLabStatusInfo,
} from "@dental/shared";

export interface ClinicalBadgeItem {
	id:
		| "somatic_allergy"
		| "primary"
		| "contract"
		| "consent"
		| "deposit"
		| "debt"
		| "installment"
		| "lab_order"
		| "plan"
		| "radiology"
		| "chat_confirmed"
		| "dms_insurance"
		| "cito_emergency"
		| "pediatric"
		| "discount"
		| "arrived_waiting"
		| "in_chair";
	schiCode: string; // "schi-1" .. "schi-17"
	icon: string;
	title: string;
	labelRu: string;
	badgeClass: string;
}
