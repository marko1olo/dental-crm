/**
 * useRosterDrawerOperations.ts — Quick shift editor drawer handlers for Doctor Shift Roster.
 */

import { useState } from "react";
import type { StaffMember } from "../doctorShiftRosterPresets";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import { DEFAULT_CLINIC_STAFF } from "../doctorShiftRosterPresets";
import type { DoctorShift } from "../doctorShiftRosterEngine";

interface UseRosterDrawerOperationsParams {
	staffList: StaffMember[];
	initialEditingShift?: Partial<DoctorShift> | null | undefined;
	setShifts: React.Dispatch<React.SetStateAction<DoctorShift[]>>;
	setNotification: (notif: { type: "success" | "info" | "error"; message: string } | null) => void;
}

export function useRosterDrawerOperations({
	staffList, initialEditingShift, setShifts, setNotification,
}: UseRosterDrawerOperationsParams) {
	const [editingShift, setEditingShift] = useState<Partial<DoctorShift> | null>(
		initialEditingShift ?? null,
	);
	const [isNewShift, setIsNewShift] = useState(false);

	const handleOpenEdit = (shift: DoctorShift) => {
		setEditingShift({ ...shift });
		setIsNewShift(false);
	};

	const handleOpenCreateInCell = (dateIso: string, cabinetId: string, chairId: string) => {
		const defaultDoc = staffList.find((s) => s.isDoctor) || staffList[0] ||
			(isDemoShowcaseMode() ? DEFAULT_CLINIC_STAFF[0]! : undefined);

		if (!defaultDoc) {
			setNotification({
				type: "error",
				message: "В клинике нет добавленных сотрудников. Добавьте врача в штат для создания смен.",
			});
			return;
		}
		const defaultAsst = defaultDoc.defaultAssistantId
			? staffList.find((s) => s.id === defaultDoc.defaultAssistantId) || null : null;

		setEditingShift({
			id: `shift-${Date.now()}`,
			doctorId: defaultDoc.id,
			doctorName: defaultDoc.shortName,
			doctorRole: defaultDoc.role,
			assistantId: defaultAsst ? defaultAsst.id : null,
			assistantName: defaultAsst ? defaultAsst.shortName : null,
			cabinetId, chairId, dateIso,
			archetypeId: "morning_shift",
			startTime: "08:30", endTime: "14:30",
			durationHours: 6.0, breakMinutes: 0,
			isNight: false, nightHours: 0,
			status: "scheduled",
		});
		setIsNewShift(true);
	};

	const handleSaveDrawerShift = (finalizedShift: DoctorShift, isNew: boolean) => {
		if (isNew) {
			setShifts((prev) => [...prev, finalizedShift]);
		} else {
			setShifts((prev) => prev.map((s) => (s.id === finalizedShift.id ? finalizedShift : s)));
		}
		setEditingShift(null);
		setNotification({ type: "success", message: "Смена успешно сохранена в графике" });
		setTimeout(() => setNotification(null), 3000);
	};

	const handleDeleteShift = (shiftId: string) => {
		setShifts((prev) => prev.filter((s) => s.id !== shiftId));
		setEditingShift(null);
		setNotification({ type: "info", message: "Смена удалена из графика" });
		setTimeout(() => setNotification(null), 3000);
	};

	return {
		editingShift, setEditingShift, isNewShift, setIsNewShift,
		handleOpenEdit, handleOpenCreateInCell, handleSaveDrawerShift, handleDeleteShift,
	};
}
