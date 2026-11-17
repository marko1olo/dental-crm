import type {
	Appointment,
	AppointmentLabStatusInfo,
} from "@dental/shared";

export type ExtendedAppointmentBadgeData = Omit<Partial<Appointment>, "toothNumber" | "labOrder"> & {
	isPrimary?: boolean | undefined;
	isFirstVisit?: boolean | undefined;
	contractSigned?: boolean | undefined;
	hasConsent?: boolean | undefined;
	hasInstallment?: boolean | undefined;
	isSplitPayment?: boolean | undefined;
	treatmentPlanId?: string | null | undefined;
	planNumber?: string | null | undefined;
	hasXray?: boolean | undefined;
	confirmedViaMessenger?: boolean | undefined;
	whatsappConfirmed?: boolean | undefined;
	isDms?: boolean | undefined;
	discountPercent?: number | string | null | undefined;
	labOrder?: unknown;
	labOrderId?: string | undefined;
	labOrderNumber?: string | undefined;
	labWorkTitle?: string | undefined;
	labWorkType?: string | undefined;
	labMaterial?: string | undefined;
	toothNumber?: string | number | undefined;
	tooth?: string | number | undefined;
	colorVita?: string | undefined;
	vitaShade?: string | undefined;
	labDueDate?: string | undefined;
	expectedLabDeliveryDate?: string | undefined;
	labStatus?: string | undefined;
	labStage?: string | undefined;
	labReceivedDate?: string | undefined;
	[key: string]: unknown;
};

export interface PatientBadgeData {
	allergies?: unknown;
	anamnesis?: { allergies?: unknown };
	contractSigned?: boolean;
	hasInformedConsent?: boolean;
	consents?: unknown[];
	hasInstallment?: boolean;
	hasXrays?: boolean;
	radiologyStudiesCount?: number;
	insurancePolicy?: unknown;
	birthDate?: string | null;
	discountPercent?: number | string | null;
	[key: string]: unknown;
}

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
