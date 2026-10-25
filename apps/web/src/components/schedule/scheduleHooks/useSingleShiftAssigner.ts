import { useCallback } from "react";
import type { Dashboard } from "@dental/shared";
import { type ChairDoctorShiftAssignment, formatDoctorShortName } from "../ScheduleGrid";
import type { ScheduleChair } from "../ScheduleFilterStrip";
import { syncShiftsWithServer } from "../chairRosterMath";
import { computeShiftAssignment, type ShiftPresetType } from "../scheduleShiftHelpers";
import { getMondayOfWeekIso, applyDoctorChairWeeklyTemplate } from "../roster/DoctorShiftRosterModal";
import { showToast } from "../../GlobalToast";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "../../../lib/safeLocalStorage";

interface Params {
	dateKey: string;
	doctors: any[];
	chairs: ScheduleChair[];
	dashboard?: Dashboard | undefined;
	effectiveChairDoctorAssignments: Record<string, ChairDoctorShiftAssignment>;
	setLocalAssignments: React.Dispatch<React.SetStateAction<Record<string, ChairDoctorShiftAssignment>>>;
	onAssignChairDoctor?: ((chairId: string, assignment: ChairDoctorShiftAssignment | null) => void) | undefined;
}

export function useSingleShiftAssigner({
	dateKey, doctors, chairs, dashboard, effectiveChairDoctorAssignments, setLocalAssignments, onAssignChairDoctor,
}: Params) {
	const assignShift = useCallback(
		(chair: ScheduleChair, preset: ShiftPresetType, targetDocId?: string): ChairDoctorShiftAssignment | null => {
			const resolvedDocId = targetDocId || effectiveChairDoctorAssignments[chair.id]?.doctorId || (chair as any).defaultDoctorId || doctors[0]?.id;
			const targetDoc = doctors.find((d) => d.id === resolvedDocId) || doctors[0];
			if (!targetDoc) {
				showToast("Нет доступных врачей: добавьте врача в настройках клиники", "warning");
				return null;
			}
			let existingAssignment: ChairDoctorShiftAssignment | null = effectiveChairDoctorAssignments[chair.id] || null;
			if (!existingAssignment && typeof window !== "undefined" && dateKey) {
				const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
				const parsed = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment> | null>(storageKey, null);
				if (parsed?.[chair.id]) existingAssignment = parsed[chair.id] ?? null;
			}
			const assignment = computeShiftAssignment({
				chair, preset,
				targetDoc: { id: targetDoc.id, fullName: targetDoc.fullName, specialty: (targetDoc as any).specialty ? String((targetDoc as any).specialty) : null },
				existingAssignment, dateKey,
			});
			let updatedTodayAssignments: Record<string, ChairDoctorShiftAssignment> = {};
			if (typeof window !== "undefined" && dateKey) {
				const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
				const existing = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
				existing[chair.id] = assignment;
				updatedTodayAssignments = existing;
				safeLocalStorageSetJson(storageKey, existing);
				setLocalAssignments(existing);
				if (preset === "even_odd" || preset === "2x2") {
					const currentShifts = safeLocalStorageGetJson<any[]>("dente_doctor_shifts", []);
					const mondayIso = getMondayOfWeekIso(dateKey);
					const templateId = preset === "even_odd" ? "even_odd_month" : "two_two_full";
					const updatedShifts = applyDoctorChairWeeklyTemplate(currentShifts, {
						weekStartDateIso: mondayIso, templateId, doctorId: targetDoc.id, chairId: chair.id,
						staffList: (dashboard?.clinicSettings?.staff as any) || (doctors as any),
					});
					safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
				}
			}
			if (onAssignChairDoctor) onAssignChairDoctor(chair.id, assignment);
			syncShiftsWithServer(dateKey, updatedTodayAssignments, chairs).catch(() => {});
			showToast(`Врач назначен на смену: ${formatDoctorShortName(targetDoc.fullName)} • ${assignment.shiftLabel} • ${chair.name}`, "success");
			return assignment;
		},
		[effectiveChairDoctorAssignments, doctors, dateKey, dashboard?.clinicSettings?.staff, onAssignChairDoctor, chairs, setLocalAssignments],
	);

	const quickSubstituteDoctor = useCallback(
		(chair: ScheduleChair, newDoctorId: string) => {
			const targetDoc = doctors.find((d) => d.id === newDoctorId) || dashboard?.clinicSettings?.staff?.find((s) => s.id === newDoctorId) || doctors[0];
			const newDoctorName = targetDoc ? targetDoc.fullName : newDoctorId;
			const existing = effectiveChairDoctorAssignments[chair.id] || null;
			const updated: ChairDoctorShiftAssignment = {
				chairId: chair.id, chairName: chair.name, doctorId: newDoctorId, doctorName: newDoctorName,
				doctorSpecialty: targetDoc && (targetDoc as any).specialty ? String((targetDoc as any).specialty) : existing?.doctorSpecialty,
				shiftPreset: existing?.shiftPreset || "full", shiftLabel: existing?.shiftLabel || "Весь день",
				shiftHours: existing?.shiftHours || "08:00–20:00", startHour: existing?.startHour ?? 8, endHour: existing?.endHour ?? 20,
			};
			if (typeof window !== "undefined" && dateKey) {
				const storageKey = `dente_chair_doctor_assignments_${dateKey}`;
				const ex = safeLocalStorageGetJson<Record<string, ChairDoctorShiftAssignment>>(storageKey, {});
				ex[chair.id] = updated;
				safeLocalStorageSetJson(storageKey, ex);
				setLocalAssignments(ex);
				syncShiftsWithServer(dateKey, ex, chairs).catch(() => {});
			}
			if (onAssignChairDoctor) onAssignChairDoctor(chair.id, updated);
			showToast(`Врач ${newDoctorName} подменяет врача на кресле «${chair.name}»`, "success");
			return updated;
		},
		[doctors, dashboard?.clinicSettings?.staff, effectiveChairDoctorAssignments, dateKey, chairs, onAssignChairDoctor, setLocalAssignments],
	);

	return { assignShift, quickSubstituteDoctor };
}
