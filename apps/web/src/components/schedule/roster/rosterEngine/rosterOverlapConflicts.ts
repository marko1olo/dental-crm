import type { DoctorShift, RosterConflict } from "./rosterEngineTypes";
import { doIntervalsOverlap } from "./rosterTimeMath";

export function detectOverlapConflicts(
	shiftsByDate: Map<string, DoctorShift[]>,
	shouldCheckSurgeryAssistant: boolean,
): RosterConflict[] {
	const conflicts: RosterConflict[] = [];

	for (const [dateIso, dayShifts] of shiftsByDate.entries()) {
		const n = dayShifts.length;
		for (let i = 0; i < n; i++) {
			const s1 = dayShifts[i];
			if (!s1) continue;

			if (shouldCheckSurgeryAssistant && s1.doctorRole === "surgeon" && !s1.assistantId) {
				conflicts.push({
					id: `no-asst-${s1.id}`,
					type: "no_assistant_for_surgery",
					severity: "warning",
					message: `Хирургия без ассистента: ${s1.doctorName} (${s1.startTime}–${s1.endTime})`,
					dateIso,
					shiftIds: [s1.id],
					staffIds: [s1.doctorId],
				});
			}

			for (let j = i + 1; j < n; j++) {
				const s2 = dayShifts[j];
				if (!s2) continue;

				if (!doIntervalsOverlap(s1.startTime, s1.endTime, s2.startTime, s2.endTime)) {
					continue;
				}

				if (s1.doctorId === s2.doctorId) {
					conflicts.push({
						id: `doc-conflict-${s1.id}-${s2.id}`,
						type: "doctor_double_booking",
						severity: "error",
						message: `Наложение врача ${s1.doctorName}: смены ${s1.startTime}–${s1.endTime} (${s1.chairId} / ${s2.chairId})`,
						dateIso,
						shiftIds: [s1.id, s2.id],
						staffIds: [s1.doctorId],
					});
				}

				if (s1.assistantId && s2.assistantId && s1.assistantId === s2.assistantId) {
					const asstName = s1.assistantName || s2.assistantName || "Ассистент";
					conflicts.push({
						id: `asst-conflict-${s1.id}-${s2.id}`,
						type: "assistant_double_booking",
						severity: "error",
						message: `Наложение ассистента ${asstName}: ${s1.doctorName} и ${s2.doctorName} (${s1.startTime}–${s1.endTime})`,
						dateIso,
						shiftIds: [s1.id, s2.id],
						staffIds: [s1.assistantId],
					});
				}

				if (s1.chairId === s2.chairId) {
					conflicts.push({
						id: `chair-conflict-${s1.id}-${s2.id}`,
						type: "chair_double_booking",
						severity: "error",
						message: `Наложение в кресле ${s1.chairId}: ${s1.doctorName} / ${s2.doctorName} (${s1.startTime}–${s1.endTime})`,
						dateIso,
						shiftIds: [s1.id, s2.id],
						staffIds: [s1.doctorId, s2.doctorId],
					});
				}
			}
		}
	}

	return conflicts;
}
