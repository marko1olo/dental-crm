import { useCallback } from "react";
import type { Dashboard } from "@dental/shared";
import { type ChairDoctorShiftAssignment, DEFAULT_SOLO_CHAIR, formatDoctorShortName } from "../ScheduleGrid";
import type { ScheduleChair } from "../ScheduleFilterStrip";
import { syncShiftsWithServer } from "../chairRosterMath";
import { applyDoctorChairDateRange, type DateRangeShiftPreset } from "../roster/DoctorShiftRosterModal";
import { showToast } from "../../GlobalToast";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "../../../lib/safeLocalStorage";

interface Params {
	dateKey: string;
	doctors: any[];
	chairs: ScheduleChair[];
	dashboard?: Dashboard | undefined;
	setLocalAssignments: React.Dispatch<React.SetStateAction<Record<string, ChairDoctorShiftAssignment>>>;
	onAssignChairDoctor?: ((chairId: string, assignment: ChairDoctorShiftAssignment | null) => void) | undefined;
}

export function useDateRangeShiftAssigner({
	dateKey, doctors, chairs, dashboard, setLocalAssignments, onAssignChairDoctor,
}: Params) {
	const assignDateRange = useCallback(
		(params: { startDateIso: string; endDateIso: string; doctorId: string; chairId: string; shiftPreset: DateRangeShiftPreset }) => {
			const { startDateIso, endDateIso, doctorId, chairId, shiftPreset } = params;
			const targetDoc = doctors.find((d) => d.id === doctorId) || (dashboard?.clinicSettings?.staff ?? []).find((s) => s.id === doctorId);
			const chairObj = chairs.find((c) => c.id === chairId) || DEFAULT_SOLO_CHAIR;

			if (typeof window !== "undefined") {
				const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
				const updatedShifts = applyDoctorChairDateRange(currentShifts, {
					startDateIso, endDateIso, doctorId, chairId, shiftPreset,
					staffList: (dashboard?.clinicSettings?.staff as any) || (doctors as any),
				});
				safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);

				if (dateKey && dateKey >= startDateIso && dateKey <= endDateIso) {
					const isMorn = shiftPreset === "morning" || shiftPreset === "morning_9";
					const isEve = shiftPreset === "evening" || shiftPreset === "evening_15";
					const startH = shiftPreset === "morning_9" ? 9 : shiftPreset === "evening_15" ? 15 : isEve ? 14 : 8;
					const endH = shiftPreset === "morning_9" ? 15 : shiftPreset === "evening_15" ? 21 : isEve ? 20 : 14;
					const sHours = `${String(startH).padStart(2, "0")}:00–${String(endH).padStart(2, "0")}:00`;
					const sLabel = shiftPreset === "morning_9" ? "1 см. 09-15" : shiftPreset === "evening_15" ? "2 см. 15-21" : isEve ? "Вечер 14-20" : isMorn ? "Утро 08-14" : "Весь день";

					const assignment: ChairDoctorShiftAssignment = {
						chairId, chairName: chairObj.name, doctorId, doctorName: targetDoc?.fullName || "Врач",
						doctorSpecialty: targetDoc && (targetDoc as any).specialty ? String((targetDoc as any).specialty) : undefined,
						shiftPreset: isMorn ? "morning" : isEve ? "evening" : "full", shiftLabel: sLabel, shiftHours: sHours,
						startHour: startH, endHour: endH,
					};

					const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
					const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
					existing[chairId] = assignment;
					safeLocalStorageSetJson(storageKey, existing);
					setLocalAssignments(existing);
					syncShiftsWithServer(dateKey, existing, chairs).catch(() => {});
					if (onAssignChairDoctor) onAssignChairDoctor(chairId, assignment);
				}
			}

			showToast(
				`График врача ${targetDoc?.fullName ? formatDoctorShortName(targetDoc.fullName) : ""} применен на кресло «${chairObj.name}» (${startDateIso} — ${endDateIso})`,
				"success", 3500,
			);
		},
		[doctors, dashboard?.clinicSettings?.staff, chairs, dateKey, onAssignChairDoctor, setLocalAssignments],
	);

	return { assignDateRange };
}
