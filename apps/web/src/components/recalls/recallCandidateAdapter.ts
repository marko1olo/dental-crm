import type { RecallCandidate } from "@dental/shared";
import {
	addCalendarMonthsSafe,
	formatIsoDateOnly,
	type PatientRecallRecord,
	type RecallCycleType,
	type RecallUrgencyStatus,
} from "./patientRecallEngine";

export function mapRecallCandidateToRecord(candidate: {
	patientId?: string | null | undefined;
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	phone?: string | null | undefined;
	email?: string | null | undefined;
	lastCompletedAt?: string | Date | null | undefined;
	monthsSinceLastVisit?: number | null | undefined;
	band?: string | null | undefined;
	reason?: string | null | undefined;
	suggestedIntervalMonths?: number | null | undefined;
	cohortType?: string | null | undefined;
	cycleType?: string | null | undefined;
	status?: string | null | undefined;
	notes?: string | null | undefined;
	lastContactChannel?: string | null | undefined;
	attendingDoctorId?: string | null | undefined;
	attendingDoctorName?: string | null | undefined;
	lastProcedureCategory?: string | null | undefined;
	historicalRevenueRub?: number | null | undefined;
	dueDate?: string | null | undefined;
	daysOverdue?: number | null | undefined;
}): PatientRecallRecord {
	const patientId = candidate.patientId || candidate.id || "pat_unknown";
	const fullName = candidate.fullName || "Пациент";
	const months = candidate.monthsSinceLastVisit ?? 6;
	const interval = candidate.suggestedIntervalMonths ?? 6;
	const calculatedDaysOverdue = Math.max(0, (months - interval) * 30);
	const daysOverdue = candidate.daysOverdue ?? calculatedDaysOverdue;

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

	const dueDateTime = candidate.dueDate
		? new Date(candidate.dueDate)
		: (candidate.lastCompletedAt
			? addCalendarMonthsSafe(new Date(candidate.lastCompletedAt), interval)
			: new Date());
	const dueDate = candidate.dueDate ?? formatIsoDateOnly(dueDateTime);

	let cycleType: RecallCycleType = "standard_prophylaxis";
	const cohortOrCycle = candidate.cohortType || candidate.cycleType;
	if (cohortOrCycle === "implant" || cohortOrCycle === "implant_monitoring") {
		cycleType = "implant_monitoring";
	} else if (cohortOrCycle === "orthodontic_retention") {
		cycleType = "orthodontic_retention";
	} else if (cohortOrCycle === "periodontal" || cohortOrCycle === "periodontal_maintenance") {
		cycleType = "periodontal_maintenance";
	} else if (cohortOrCycle === "endodontic" || cohortOrCycle === "endodontic_check") {
		cycleType = "endodontic_check";
	} else if (cohortOrCycle === "pediatric_fluoridation" || cohortOrCycle === "pediatric") {
		cycleType = "pediatric_fluoridation";
	} else if (cohortOrCycle === "orthodontic_braces" || cohortOrCycle === "orthodontics") {
		cycleType = "orthodontic_braces";
	}

	const validChannel = candidate.lastContactChannel && ["whatsapp", "telegram", "sms", "phone"].includes(candidate.lastContactChannel)
		? (candidate.lastContactChannel as "whatsapp" | "telegram" | "sms" | "phone")
		: undefined;

	return {
		id: patientId,
		patientId,
		fullName,
		phone: candidate.phone ?? null,
		email: candidate.email ?? undefined,
		cycleType,
		attendingDoctorId: candidate.attendingDoctorId ?? undefined,
		attendingDoctorName: candidate.attendingDoctorName ?? undefined,
		lastVisitDate,
		dueDate,
		daysOverdue,
		urgencyStatus,
		status: (candidate.status as PatientRecallRecord["status"]) ?? "due_now",
		clinicalNotes: candidate.notes ?? candidate.reason ?? undefined,
		lastContactChannel: validChannel,
		historicalRevenueRub: candidate.historicalRevenueRub ?? 0,
		visitsCount: candidate.lastCompletedAt ? 1 : 0,
	};
}
