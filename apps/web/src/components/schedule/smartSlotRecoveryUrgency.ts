import type {
	TimeOfDay,
	WaitlistEntryLike,
	WaitlistUrgency,
} from "./smartSlotRecoveryTypes";

export function detectCandidateUrgency(
	item: WaitlistEntryLike | string | null | undefined,
): WaitlistUrgency {
	if (!item) return "routine";
	if (typeof item === "string") {
		const t = item.toLowerCase();
		if (t.includes("остр") || t.includes("бол") || t.includes("пульпит") || t.includes("pain") || t.includes("emergency") || t.includes("cito") || t.includes("удален")) {
			return "acute_pain";
		}
		if (t.includes("брекет") || t.includes("активац") || t.includes("ortho") || t.includes("endo") || t.includes("канал")) {
			return "ortho_endo";
		}
		if (t.includes("чистк") || t.includes("гигиен") || t.includes("airflow") || t.includes("hygiene") || t.includes("налет") || t.includes("камн")) {
			return "hygiene";
		}
		return "routine";
	}
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

		const notes = (item.notes || item.reason || "").toLowerCase();
		if (notes) {
			if (notes.includes("остр") || notes.includes("бол") || notes.includes("пульпит") || notes.includes("pain") || notes.includes("emergency") || notes.includes("cito") || notes.includes("удален")) {
				return "acute_pain";
			}
			if (notes.includes("брекет") || notes.includes("активац") || notes.includes("ortho") || notes.includes("endo") || notes.includes("канал")) {
				return "ortho_endo";
			}
			if (notes.includes("чистк") || notes.includes("гигиен") || notes.includes("airflow") || notes.includes("hygiene") || notes.includes("налет") || notes.includes("камн")) {
				return "hygiene";
			}
		}
	}
	return "routine";
}

export function checkCandidateTimeOfDayFit(
	slotTimeOfDay: TimeOfDay,
	preferredTimeRanges?: Array<{ day?: string; slot?: string }> | any,
): { fits: boolean; hasSpecificPreference: boolean } {
	if (!preferredTimeRanges || !Array.isArray(preferredTimeRanges) || preferredTimeRanges.length === 0) {
		return { fits: true, hasSpecificPreference: false };
	}
	let found = false;
	let hasRestr = false;
	for (let i = 0; i < preferredTimeRanges.length; i++) {
		const tr = preferredTimeRanges[i];
		if (!tr) continue;
		const day = tr.day || "";
		const slot = tr.slot || "";
		if (day.length > 0) {
			const d = day.toLowerCase();
			if (d.includes("люб") || d.includes("any") || d.includes("все") || d.includes("весь")) {
				return { fits: true, hasSpecificPreference: false };
			}
		}
		if (slot.length > 0) {
			const sl = slot.toLowerCase();
			if (sl.includes("люб") || sl.includes("any") || sl.includes("все") || sl.includes("весь")) {
				return { fits: true, hasSpecificPreference: false };
			}
			hasRestr = true;
			if (slotTimeOfDay === "morning") {
				if (sl.includes("утр") || sl.includes("morn") || sl.includes("09:") || sl.includes("10:") || sl.includes("11:")) {
					found = true;
					break;
				}
			} else if (slotTimeOfDay === "afternoon") {
				if (sl.includes("ден") || sl.includes("day") || sl.includes("12:") || sl.includes("13:") || sl.includes("14:") || sl.includes("15:") || sl.includes("16:")) {
					found = true;
					break;
				}
			} else if (slotTimeOfDay === "evening") {
				if (sl.includes("вечер") || sl.includes("even") || sl.includes("17:") || sl.includes("18:") || sl.includes("19:") || sl.includes("20:")) {
					found = true;
					break;
				}
			}
		}
	}
	return hasRestr ? { fits: found, hasSpecificPreference: true } : { fits: true, hasSpecificPreference: false };
}
