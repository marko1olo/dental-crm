import type { RecallCandidate } from "@dental/shared";
import {
	addCalendarMonthsSafe,
	formatIsoDateOnly,
	type PatientRecallRecord,
	type RecallCycleType,
	type RecallUrgencyStatus,
} from "./patientRecallEngine";

export function mapRecallCandidateToRecord(candidate: RecallCandidate): PatientRecallRecord {
	const months = candidate.monthsSinceLastVisit ?? 6;
	const interval = candidate.suggestedIntervalMonths ?? 6;
	const daysOverdue = Math.max(0, (months - interval) * 30);

	let urgencyStatus: RecallUrgencyStatus = "due_now";
	if (candidate.band === "probably_lost") {
		urgencyStatus = "overdue_90";
	} else if (candidate.band === "overdue") {
		urgencyStatus = "overdue_30";
	} else if (candidate.band === "due") {
		urgencyStatus = "due_now";
	}

	const lastVisitDate = candidate.lastCompletedAt
		? formatIsoDateOnly(new Date(candidate.lastCompletedAt))
		: formatIsoDateOnly(addCalendarMonthsSafe(new Date(), -months));

	const dueDateTime = candidate.lastCompletedAt
		? addCalendarMonthsSafe(new Date(candidate.lastCompletedAt), interval)
		: new Date();
	const dueDate = formatIsoDateOnly(dueDateTime);

	let cycleType: RecallCycleType = "standard_prophylaxis";
	if (candidate.cohortType === "implant") {
		cycleType = "implant_monitoring";
	} else if (candidate.cohortType === "orthodontic_retention") {
		cycleType = "orthodontic_retention";
	} else if (candidate.cohortType === "periodontal") {
		cycleType = "periodontal_maintenance";
	} else if (candidate.cohortType === "endodontic") {
		cycleType = "endodontic_check";
	} else if (candidate.cohortType === "hygiene_therapy") {
		cycleType = "standard_prophylaxis";
	}

	return {
		id: candidate.patientId,
		patientId: candidate.patientId,
		fullName: candidate.fullName,
		phone: candidate.phone ?? null,
		email: candidate.email ?? null,
		cycleType,
		attendingDoctorId: candidate.attendingDoctorId ?? undefined,
		attendingDoctorName: candidate.attendingDoctorName ?? undefined,
		lastVisitDate,
		dueDate,
		daysOverdue,
		urgencyStatus,
		status: "due_now",
		clinicalNotes: candidate.reason,
		historicalRevenueRub: 6500,
		visitsCount: candidate.lastCompletedAt ? 1 : 0,
	};
}
