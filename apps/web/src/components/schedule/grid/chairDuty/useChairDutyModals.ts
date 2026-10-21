import { useCallback, useState } from "react";
import type { StaffMember } from "@dental/shared";
import type { ChairDoctorShiftAssignment } from "../gridTypes";

export function useChairDutyModals(
	doctors: StaffMember[],
	effectiveChairAssignments: Record<string, ChairDoctorShiftAssignment>,
	getSuggestedDoctorForChair: (chairId: string) => StaffMember | null,
	onOpenAddChair?: (() => void) | undefined,
) {
	const [assigningChairId, setAssigningChairId] = useState<string | null>(null);
	const [modalDoctorId, setModalDoctorId] = useState<string>("");
	const [modalEveningDoctorId, setModalEveningDoctorId] = useState<string>("");
	const [modalShiftPreset, setModalShiftPreset] = useState<
		"morning" | "evening" | "full" | "two_shifts"
	>("full");
	const [isInternalAddChairModalOpen, setIsInternalAddChairModalOpen] = useState(false);
	const [isQuickAddDoctorOpen, setIsQuickAddDoctorOpen] = useState(false);
	const [activeHeaderDoctorPopoverChairId, setActiveHeaderDoctorPopoverChairId] = useState<string | null>(null);
	const [activeHeaderMaintenanceChairId, setActiveHeaderMaintenanceChairId] = useState<string | null>(null);

	const handleOpenAddChair = useCallback(() => {
		if (typeof onOpenAddChair === "function") {
			onOpenAddChair();
		} else {
			setIsInternalAddChairModalOpen(true);
		}
	}, [onOpenAddChair]);

	const openAssignModal = useCallback(
		(chairId: string) => {
			const existing = effectiveChairAssignments[chairId];
			const suggested = getSuggestedDoctorForChair(chairId);
			setAssigningChairId(chairId);

			if (existing?.subShifts && existing.subShifts.length > 1) {
				setModalShiftPreset("two_shifts");
				setModalDoctorId(existing.subShifts[0]?.doctorId || "");
				setModalEveningDoctorId(existing.subShifts[1]?.doctorId || "");
			} else {
				setModalDoctorId(existing?.doctorId || (suggested ? suggested.id : doctors[0]?.id || ""));
				const otherDoc = doctors.find((d) => d.id !== (existing?.doctorId || suggested?.id)) || doctors[1] || doctors[0];
				setModalEveningDoctorId(otherDoc?.id || "");
				setModalShiftPreset(
					existing?.shiftPreset === "morning" || existing?.shiftPreset === "evening"
						? existing.shiftPreset
						: "full",
				);
			}
		},
		[effectiveChairAssignments, doctors, getSuggestedDoctorForChair],
	);

	return {
		assigningChairId,
		setAssigningChairId,
		modalDoctorId,
		setModalDoctorId,
		modalEveningDoctorId,
		setModalEveningDoctorId,
		modalShiftPreset,
		setModalShiftPreset,
		isInternalAddChairModalOpen,
		setIsInternalAddChairModalOpen,
		handleOpenAddChair,
		isQuickAddDoctorOpen,
		setIsQuickAddDoctorOpen,
		activeHeaderDoctorPopoverChairId,
		setActiveHeaderDoctorPopoverChairId,
		activeHeaderMaintenanceChairId,
		setActiveHeaderMaintenanceChairId,
		openAssignModal,
	};
}
