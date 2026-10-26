export interface PatientAppointmentItem {
	readonly id: string;
	readonly dateIso: string;
	readonly timeRu: string;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly doctorSpecialtyRu: string;
	readonly doctorAvatarUrl?: string | undefined;
	readonly roomNumber: string;
	readonly clinicName: string;
	readonly clinicAddressRu: string;
	readonly clinicPhone: string;
	readonly titleRu: string;
	readonly status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "reschedule_requested";
	readonly priceKopecks: number;
	readonly priceRub: number;
	readonly reminderSent: boolean;
	readonly preparationInstructionsRu?: readonly string[] | undefined;
	readonly cancellationReason?: string | undefined;
}

export interface TreatmentStageProcedureItem {
	readonly id: string;
	readonly code804n: string;
	readonly nameRu: string;
	readonly toothFdi?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly unitPriceRub: number;
	readonly totalKopecks: number;
	readonly totalRub: number;
}

export interface PatientTreatmentPlanStage {
	readonly id: string;
	readonly orderIndex: number;
	readonly titleRu: string;
	readonly categoryRu: "Диагностика" | "Терапия" | "Хирургия" | "Ортопедия" | "Ортодонтия" | "Гигиена";
	readonly teethFdi: readonly string[];
	readonly costKopecks: number;
	readonly costRub: number;
	readonly status: "completed" | "in_progress" | "planned";
	readonly procedures: readonly TreatmentStageProcedureItem[];
	readonly targetDateRu?: string | undefined;
}

export interface PatientTreatmentPlanProfile {
	readonly id: string;
	readonly planNumber: string;
	readonly titleRu: string;
	readonly curatingDoctor: string;
	readonly createdAtIso: string;
	readonly totalCostKopecks: number;
	readonly totalCostRub: number;
	readonly paidCostKopecks: number;
	readonly paidCostRub: number;
	readonly remainingDueKopecks: number;
	readonly remainingDueRub: number;
	readonly progressPercent: number;
	readonly status: "in_progress" | "completed" | "on_hold";
	readonly stages: readonly PatientTreatmentPlanStage[];
}

export interface PatientInvoiceBillItem {
	readonly id: string;
	readonly invoiceNumber: string;
	readonly issueDateIso: string;
	readonly dueDateIso: string;
	readonly titleRu: string;
	readonly totalAmountKopecks: number;
	readonly totalAmountRub: number;
	readonly paidAmountKopecks: number;
	readonly paidAmountRub: number;
	readonly remainingAmountKopecks: number;
	readonly remainingAmountRub: number;
	readonly status: "paid" | "unpaid" | "partially_paid" | "cancelled";
	readonly paymentMethod?: "sbp" | "card_online" | "pos_terminal" | "cash" | undefined;
	readonly paidAtIso?: string | undefined;
	readonly fiscalReceiptNumber?: string | undefined;
	readonly fiscalReceiptUrl?: string | undefined;
}

export interface PhotoProtocolSlotItem {
	readonly slotId: string;
	readonly labelRu: string;
	readonly angle: "frontal_smile" | "retractor_12oclock" | "profile_right" | "profile_left" | "upper_occlusal" | "lower_occlusal" | "macro_anterior";
	readonly imageUrl: string;
	readonly timestampIso: string;
	readonly vitaShade?: string | undefined;
}

export interface BeforeAfterComparisonPair {
	readonly id: string;
	readonly titleRu: string;
	readonly clinicalIndicationRu: string;
	readonly procedureNameRu: string;
	readonly toothFdi?: string | undefined;
	readonly beforeSlot: PhotoProtocolSlotItem;
	readonly afterSlot: PhotoProtocolSlotItem;
	readonly defaultSplitPercent: number;
	readonly doctorNotesRu?: string | undefined;
}
