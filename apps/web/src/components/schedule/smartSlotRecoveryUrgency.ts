import type {
	TimeOfDay,
	WaitlistEntryLike,
	WaitlistUrgency,
} from "./smartSlotRecoveryTypes";

export function detectCandidateUrgency(
	item: WaitlistEntryLike | string | null | undefined,
): WaitlistUrgency {
	if (!item) return "routine";
	if (typeof item === "object") {
		const explicit = item.urgency;
		if (explicit) {
			const e = explicit.toLowerCase();
			if (e === "acute_pain" || e === "ortho_endo" || e === "hygiene" || e === "routine") {
				return e as WaitlistUrgency;
			}
		}
		const prio = item.priorityLevel ? item.priorityLevel.toLowerCase() : "";
		if (prio === "urgent" || prio === "acute_pain" || prio === "high") return "acute_pain";
		if (prio === "treatment_plan") return "ortho_endo";

		const cat = (item.treatmentCategory || "").toLowerCase();
		if (cat === "surgery" || cat === "acute" || cat === "emergency") return "acute_pain";
		if (cat === "ortho" || cat === "endo") return "ortho_endo";
		if (cat === "hygiene") return "hygiene";
	}
	return "routine";
}

export function checkCandidateTimeOfDayFit(
	slotTimeOfDay: TimeOfDay,
	preferredTimeRanges?: Array<{ day?: string; slot?: string }> | any,
): { fits: boolean; hasSpecificPreference: boolean } {
	if (!Array.isArray(preferredTimeRanges) || preferredTimeRanges.length === 0) {
		return { fits: true, hasSpecificPreference: false };
	}
	let found = false;
	let hasRestr = false;
	for (const tr of preferredTimeRanges) {
		const s = `${tr?.slot || ""} ${tr?.day || ""}`.toLowerCase();
		if (!s.trim()) continue;
		if (s.includes("any") || s.includes("любое") || s.includes("весь")) {
			return { fits: true, hasSpecificPreference: false };
		}
		hasRestr = true;
		if (
			slotTimeOfDay === "morning" &&
			(s.includes("утр") || s.includes("morning") || s.includes("09:") || s.includes("10:") || s.includes("11:"))
		) {
			found = true;
			break;
		}
		if (
			slotTimeOfDay === "afternoon" &&
			(s.includes("день") || s.includes("day") || s.includes("12:") || s.includes("13:") || s.includes("14:") || s.includes("15:") || s.includes("16:"))
		) {
			found = true;
			break;
		}
		if (
			slotTimeOfDay === "evening" &&
			(s.includes("вечер") || s.includes("evening") || s.includes("17:") || s.includes("18:") || s.includes("19:") || s.includes("20:"))
		) {
			found = true;
			break;
		}
	}
	return hasRestr ? { fits: found, hasSpecificPreference: true } : { fits: true, hasSpecificPreference: false };
}
