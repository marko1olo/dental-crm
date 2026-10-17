import type { PatientRecallRecord, RecallContactStatus } from "./recallCycleCatalog";
import { RECALL_CYCLE_CATALOG } from "./recallCycleCatalogData";
import { addCalendarMonthsSafe, addDaysSafe, addWeeksSafe, calculateDaysOverdue, formatIsoDateOnly, resolveUrgencyStatus } from "./recallDateMath";
import { evaluateMultiRecallChannels, shouldResetRecallTimer, type ClinicalProcedureIdentifier, type PatientClinicalStatusInput } from "./recallClinicalTriggers";
import { isPatientEligibleForRecall } from "./recallProfile";

export function postponeRecallRecord(
	record: PatientRecallRecord,
	duration: "2_weeks" | "1_month" | number,
	reason = "Пациент в отпуске / перенос визита",
	referenceDate?: Date | string,
): PatientRecallRecord {
	const ref = referenceDate ?? new Date();
	const parsedDue = new Date(record.dueDate);
	const parsedRef = typeof ref === "string" ? new Date(ref) : ref;
	const effectiveFrom = parsedDue.getTime() < parsedRef.getTime() ? parsedRef : parsedDue;

	let newDueDate: Date;
	let durationDesc: string;
	if (duration === "2_weeks") {
		newDueDate = addWeeksSafe(effectiveFrom, 2);
		durationDesc = "2 недели";
	} else if (duration === "1_month") {
		newDueDate = addCalendarMonthsSafe(effectiveFrom, 1);
		durationDesc = "1 месяц";
	} else {
		newDueDate = addDaysSafe(effectiveFrom, duration);
		durationDesc = `${duration} дн.`;
	}

	const formattedDueDate = formatIsoDateOnly(newDueDate);
	const daysOverdue = calculateDaysOverdue(newDueDate, ref);
	const urgencyStatus = resolveUrgencyStatus(newDueDate, ref, false);
	const note = `[Отложено на ${durationDesc} до ${formattedDueDate}: ${reason}]`;
	const updatedNotes = record.clinicalNotes ? `${record.clinicalNotes}\n${note}` : note;

	return {
		...record, dueDate: formattedDueDate, daysOverdue, urgencyStatus,
		status: "declined", clinicalNotes: updatedNotes, postponedUntil: formattedDueDate, postponeReason: reason,
	};
}

export function markRecallRecordScheduled(record: PatientRecallRecord, scheduledDate?: string, scheduledAppointmentId?: string): PatientRecallRecord {
	return {
		...record, status: "scheduled", urgencyStatus: "upcoming",
		scheduledDate: scheduledDate ?? record.dueDate,
		scheduledAppointmentId: scheduledAppointmentId ?? `appt-${record.id}-${Date.now()}`,
	};
}

export function createMultiRecallRecordsForPatient(
	patient: {
		readonly id: string; readonly fullName: string; readonly phone?: string | null | undefined;
		readonly email?: string | null | undefined; readonly birthDate?: string | null | undefined;
		readonly age?: number | undefined; readonly attendingDoctorId?: string | undefined;
		readonly attendingDoctorName?: string | undefined; readonly isArchived?: boolean | undefined;
		readonly isDeceased?: boolean | undefined;
	},
	clinicalData: PatientClinicalStatusInput,
): PatientRecallRecord[] {
	if (!isPatientEligibleForRecall(patient)) return [];
	const multiResult = evaluateMultiRecallChannels(clinicalData);
	const refDate = clinicalData.referenceDate ?? new Date();

	return multiResult.triggers.map((trigger) => {
		const daysOverdue = calculateDaysOverdue(trigger.nextDueDate, refDate);
		const urgencyStatus = resolveUrgencyStatus(trigger.nextDueDate, refDate, false);
		const cycleDef = RECALL_CYCLE_CATALOG[trigger.mappedCycleType];
		return {
			id: `${patient.id}_${trigger.channelId}`, patientId: patient.id, fullName: patient.fullName,
			phone: patient.phone ?? null, email: patient.email ?? null, birthDate: patient.birthDate,
			age: patient.age, cycleType: trigger.mappedCycleType, clinicalTriggerType: trigger.triggerType,
			channelId: trigger.channelId, lastVisitDate: formatIsoDateOnly(clinicalData.lastVisitDate ? new Date(clinicalData.lastVisitDate) : new Date()),
			dueDate: trigger.formattedDueDate, daysOverdue, urgencyStatus, status: "due_now",
			attendingDoctorId: patient.attendingDoctorId, attendingDoctorName: patient.attendingDoctorName,
			clinicalNotes: trigger.clinicalRationale, historicalRevenueRub: cycleDef?.estimatedAverageCheckRub ?? 6500,
			isArchived: patient.isArchived, isDeceased: patient.isDeceased,
		};
	});
}

export function processVisitForPatientRecalls(
	currentRecalls: readonly PatientRecallRecord[],
	visit: { readonly visitDate: string; readonly procedures: readonly ClinicalProcedureIdentifier[]; readonly isCompleted?: boolean | undefined },
	referenceDate?: Date | string,
): { readonly updatedRecalls: PatientRecallRecord[]; readonly resetCount: number; readonly unchangedCount: number } {
	const ref = referenceDate ?? new Date();
	let resetCount = 0;
	let unchangedCount = 0;

	const updatedRecalls = currentRecalls.map((recall) => {
		const shouldReset = shouldResetRecallTimer({ cycleType: recall.cycleType, clinicalTriggerType: recall.clinicalTriggerType }, visit.procedures);
		if (!shouldReset) {
			unchangedCount++;
			return recall;
		}
		resetCount++;
		const cycleDef = RECALL_CYCLE_CATALOG[recall.cycleType];
		const intervalMonths = recall.customIntervalValue && recall.customIntervalValue > 0 ? recall.customIntervalValue : (cycleDef?.defaultIntervalMonths ?? 6);
		const newDueDate = addCalendarMonthsSafe(visit.visitDate, intervalMonths);
		const formattedDueDate = formatIsoDateOnly(newDueDate);
		return {
			...recall, lastVisitDate: visit.visitDate, dueDate: formattedDueDate,
			daysOverdue: calculateDaysOverdue(newDueDate, ref), urgencyStatus: resolveUrgencyStatus(newDueDate, ref, false),
			status: "due_now" as RecallContactStatus,
		};
	});

	return { updatedRecalls, resetCount, unchangedCount };
}
