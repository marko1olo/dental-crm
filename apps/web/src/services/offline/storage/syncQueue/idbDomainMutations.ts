import { enqueueOfflineMutation } from "./idbBatchOperations";
import type {
	AppointmentMutationInput,
	Card043MutationInput,
	CashReceiptMutationInput,
	OdontogramStampMutationInput,
	OfflineMutation,
	PrescriptionMutationInput,
	ServiceAdditionMutationInput,
} from "./types";

export async function enqueueCard043Mutation(input: Card043MutationInput): Promise<OfflineMutation<Record<string, unknown>>> {
	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "DIARY_043_DRAFT", entityId: input.patientId, action: input.action || "update",
		payload: input.diaryData, organizationId: input.organizationId, authorUserId: input.authorUserId,
	});
}

export async function enqueueOdontogramMutation(input: OdontogramStampMutationInput): Promise<OfflineMutation<Record<string, unknown>>> {
	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "ODONTOGRAM_STATUS", entityId: input.patientId, action: input.action || "update",
		payload: { tooth: input.tooth, surface: input.surface, condition: input.condition, ...(input.state || {}) },
		organizationId: input.organizationId, authorUserId: input.authorUserId,
	});
}

export async function enqueueServiceAdditionMutation(input: ServiceAdditionMutationInput): Promise<OfflineMutation<Record<string, unknown>>> {
	const item = input.serviceItem;
	const priceKop = item.priceKopecks !== undefined ? item.priceKopecks : Math.round((item.priceRub || 0) * 100);
	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "TREATMENT_PLAN_DRAFT", entityId: input.visitId || input.patientId, action: input.action || "create",
		payload: {
			visitId: input.visitId, patientId: input.patientId, code804n: item.code804n, name: item.name,
			priceRub: item.priceRub, priceKopecks: priceKop, quantity: item.quantity || 1, toothNumber: item.toothNumber, discountRub: item.discountRub || 0,
		},
		organizationId: input.organizationId, authorUserId: input.authorUserId,
	});
}

export async function enqueuePrescriptionMutation(input: PrescriptionMutationInput): Promise<OfflineMutation<Record<string, unknown>>> {
	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "PRESCRIPTION_107_DRAFT", entityId: input.prescriptionNumber || input.visitId || input.patientId, action: input.action || "create",
		payload: {
			patientId: input.patientId, visitId: input.visitId, prescriptionNumber: input.prescriptionNumber,
			formType: input.formType || "107-1/у", medications: input.medications, diagnosisIcd10: input.diagnosisIcd10, notes: input.notes,
		},
		organizationId: input.organizationId, authorUserId: input.authorUserId,
	});
}

export async function enqueueCashReceiptMutation(input: CashReceiptMutationInput): Promise<OfflineMutation<Record<string, unknown>>> {
	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "CASH_RECEIPT_DRAFT", entityId: input.invoiceId || input.visitId || input.patientId, action: input.action || "create",
		payload: {
			patientId: input.patientId, visitId: input.visitId, invoiceId: input.invoiceId, cashierName: input.cashierName,
			totalRub: input.totalRub, totalKopecks: input.totalKopecks, paymentType: input.paymentType, items: input.items,
			patientPhoneOrEmail: input.patientPhoneOrEmail, isFiscalized: input.isFiscalized ?? false, fiscalSign: input.fiscalSign,
		},
		organizationId: input.organizationId, authorUserId: input.authorUserId,
	});
}

export async function enqueueAppointmentMutation(input: AppointmentMutationInput): Promise<OfflineMutation<Record<string, unknown>>> {
	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "APPOINTMENT_BOOKING_DRAFT", entityId: `${input.patientId}_${input.date}_${input.startTime}`, action: input.action || "create",
		payload: {
			patientId: input.patientId, doctorId: input.doctorId, chairId: input.chairId, date: input.date,
			startTime: input.startTime, endTime: input.endTime, durationMinutes: input.durationMinutes,
			serviceTitle: input.serviceTitle, status: input.status || "scheduled", notes: input.notes,
		},
		organizationId: input.organizationId, authorUserId: input.authorUserId,
	});
}
