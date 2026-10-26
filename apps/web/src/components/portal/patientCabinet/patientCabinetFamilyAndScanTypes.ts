/**
 * Patient Family, Prescription and Diagnostic Scan Types
 * (DOMAIN: PORTAL PATIENT CABINET - LAYER 0 TYPES)
 */

export interface PatientPrescriptionItem {
	readonly id: string;
	readonly medicationName: string;
	readonly dosageRu: string;
	readonly instructionRu: string;
	readonly durationRu: string;
	readonly dateIso: string;
	readonly doctorName: string;
	readonly validityDays?: number | undefined;
	readonly status?: "active" | "expired" | string | undefined;
	readonly orderNumber?: string | undefined;
}

export interface PatientCabinetFamilyMember {
	readonly id: string;
	readonly fullName: string;
	readonly relationshipRu: "Супруг(а)" | "Сын" | "Дочь" | "Родитель" | "Другой родственник" | string;
	readonly birthDate?: string | undefined;
	readonly phone?: string | undefined;
	readonly cardNumber?: string | undefined;
	readonly avatarInitials?: string | undefined;
	readonly allowSpendFamilyBalance: boolean;
	readonly allowBooking: boolean;
	readonly nextAppointmentDateIso?: string | undefined;
	readonly nextAppointmentTimeRu?: string | undefined;
	readonly nextAppointmentTitleRu?: string | undefined;
	readonly nextAppointmentDoctor?: string | undefined;
}

export interface PatientDiagnosticScan {
	readonly id: string;
	readonly titleRu: string;
	readonly modality: "rvg" | "optg" | "cbct" | "trg";
	readonly modalityRu: string;
	readonly dateRu: string;
	readonly toothFdi?: string | undefined;
	readonly doseMicroSv: number;
	readonly previewUrl: string;
	readonly conclusionRu: string;
}
