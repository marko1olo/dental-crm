import { isPatientEligibleForRecall, type PatientRecallRecord } from "./patientRecallEngine";

export interface RecallStatusCounts {
	all: number;
	due_now: number;
	invited: number;
	scheduled: number;
	completed: number;
}

export function calculateRecallStatusCounts(candidates: readonly PatientRecallRecord[]): RecallStatusCounts {
	const counts: RecallStatusCounts = {
		all: 0,
		due_now: 0,
		invited: 0,
		scheduled: 0,
		completed: 0,
	};
	for (const c of candidates) {
		if (!isPatientEligibleForRecall(c)) continue;
		counts.all++;
		if (
			(c.status === "pending" || c.status === "due_now") &&
			(c.urgencyStatus === "due_now" || c.urgencyStatus === "overdue_30" || c.urgencyStatus === "overdue_90")
		) {
			counts.due_now++;
		} else if (c.status === "invited" || c.status === "contacted") {
			counts.invited++;
		} else if (c.status === "scheduled") {
			counts.scheduled++;
		} else if (c.status === "completed") {
			counts.completed++;
		}
	}
	return counts;
}

export function extractUniqueDoctors(candidates: readonly PatientRecallRecord[]): Array<{ id: string; name: string }> {
	const docMap = new Map<string, string>();
	for (const c of candidates) {
		if (c.attendingDoctorId && c.attendingDoctorName) docMap.set(c.attendingDoctorId, c.attendingDoctorName);
	}
	return Array.from(docMap.entries()).map(([id, name]) => ({ id, name }));
}
