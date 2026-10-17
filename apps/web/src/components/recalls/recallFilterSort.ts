import type { PatientRecallRecord, RecallFilterOptions } from "./recallCycleCatalog";
import { toCanonicalRecallStatus } from "./recallCycleTypes";
import { resolveCandidateTriggerType } from "./recallClinicalTriggers";
import { isDateInPeriod, isPatientEligibleForRecall } from "./recallProfile";

export function filterAndSortRecallCandidates(
	candidates: readonly PatientRecallRecord[],
	options: RecallFilterOptions,
): PatientRecallRecord[] {
	const rawQuery = (options.searchQuery ?? "").trim();
	const queryLower = rawQuery.toLowerCase();
	const queryDigits = rawQuery.replace(/\D/g, "");

	const filtered = candidates.filter((c) => {
		if (!options.includeArchived && !isPatientEligibleForRecall(c)) return false;

		if (options.status && options.status !== "all") {
			if (options.status === "due_now") {
				const isPending = c.status === "pending" || c.status === "due_now";
				const isDue = c.urgencyStatus === "due_now" || c.urgencyStatus === "overdue_30" || c.urgencyStatus === "overdue_90";
				if (!isPending || !isDue) return false;
			} else if (options.status === "invited") {
				if (c.status !== "invited" && c.status !== "contacted") return false;
			} else if (c.status !== options.status) {
				return false;
			}
		}

		if (options.urgencyStatus && options.urgencyStatus !== "all" && c.urgencyStatus !== options.urgencyStatus) {
			return false;
		}

		if (options.canonicalStatus && options.canonicalStatus !== "all") {
			if (toCanonicalRecallStatus(c.status) !== options.canonicalStatus) return false;
		}

		if (options.triggerType && options.triggerType !== "all") {
			if (resolveCandidateTriggerType(c) !== options.triggerType) return false;
		}

		if (options.cycleType && options.cycleType !== "all" && c.cycleType !== options.cycleType) {
			return false;
		}

		if (options.doctorId && options.doctorId !== "all" && c.attendingDoctorId !== options.doctorId) {
			return false;
		}

		if (options.period && options.period !== "all") {
			if (!isDateInPeriod(c.dueDate, options.period, options.referenceDate)) return false;
		}

		if (rawQuery) {
			const nameMatch = c.fullName.toLowerCase().includes(queryLower);
			const phoneDigits = c.phone ? c.phone.replace(/\D/g, "") : "";
			const phoneMatch = queryDigits.length > 0 && phoneDigits.length > 0 ? phoneDigits.includes(queryDigits) : false;
			const doctorMatch = c.attendingDoctorName ? c.attendingDoctorName.toLowerCase().includes(queryLower) : false;
			if (!nameMatch && !phoneMatch && !doctorMatch) return false;
		}

		return true;
	});

	const sortBy = options.sortBy ?? "daysOverdue";
	const sortDirection = options.sortDirection ?? "desc";
	const dirMultiplier = sortDirection === "asc" ? 1 : -1;

	return filtered.slice().sort((a, b) => {
		if (sortBy === "daysOverdue") return (a.daysOverdue - b.daysOverdue) * dirMultiplier;
		if (sortBy === "dueDate") return a.dueDate.localeCompare(b.dueDate) * dirMultiplier;
		if (sortBy === "lastVisitDate") return a.lastVisitDate.localeCompare(b.lastVisitDate) * dirMultiplier;
		if (sortBy === "fullName") return a.fullName.localeCompare(b.fullName, "ru") * dirMultiplier;
		if (sortBy === "ltv") return ((a.historicalRevenueRub || 0) - (b.historicalRevenueRub || 0)) * dirMultiplier;
		return 0;
	});
}
