import React, { useState } from "react";
import { showToast } from "../../GlobalToast";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { calculateProportionalCardHeight } from "../appointmentCardHelpers";
import type { AppointmentCardProps } from "../AppointmentCardTypes";

export function useAppointmentCardContainerInteractions(
	props: AppointmentCardProps,
	state: any,
) {
	const {
		appointment,
		visibleScheduleSuggestions,
		appointmentReadinessById,
		openAppointmentEditor,
		onOpenVisit,
		densityMode,
	} = props;

	const {
		appointmentDoctor,
		appointmentChair,
		appointmentPatient,
		appointmentPatientName,
		durationMinutes,
		setIsHoverPreviewOpen,
		hoverTimeoutRef,
	} = state;

	const [isSmartRecoveryOpen, setIsSmartRecoveryOpen] = useState(false);

	const handleCardMouseEnter = () => {
		if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
		hoverTimeoutRef.current = setTimeout(() => setIsHoverPreviewOpen(true), 80);
	};

	const handleCardMouseLeave = () => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = null;
		}
		setIsHoverPreviewOpen(false);
	};

	const handleCardDoubleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		const pid = appointmentPatient?.id || appointment.patientId;
		if (pid) {
			usePatientStore.getState().setSelectedPatientId(pid);
			if (typeof window !== "undefined") window.location.hash = "#visit";
			if (onOpenVisit) onOpenVisit();
			else useAppStore.getState().setCurrentView("visit");
			showToast(`Открыта карта приёма: ${appointmentPatientName}`, "info");
		} else {
			openAppointmentEditor(appointment);
		}
	};

	const handleFreeSlotToWaitlist = (appt: any) => {
		if (props.onFreeSlotToWaitlist) props.onFreeSlotToWaitlist(appt);
		if (props.onOpenWaitlistForSlot) {
			props.onOpenWaitlistForSlot({
				appointmentId: appt.id,
				startsAt: appt.startsAt,
				endsAt: appt.endsAt,
				doctorUserId: appt.doctorUserId,
				doctorName: appointmentDoctor?.fullName || null,
				chairId: appt.chairId,
				chairName: appointmentChair?.name || null,
				patientId: appt.patientId,
				patientName: appointmentPatientName,
				freedBecause: "Освобождено под лист ожидания",
				reason: appt.reason,
			});
		}
		setIsSmartRecoveryOpen(true);
	};

	const isMicroDensity =
		densityMode === "compact" ||
		(!densityMode && durationMinutes <= 20) ||
		(densityMode === "informative" && durationMinutes <= 20);
	const isTwoLineMode =
		(!densityMode && durationMinutes > 20 && durationMinutes < 60) ||
		(densityMode === "informative" && durationMinutes > 20 && durationMinutes < 60);

	const proportionalHeight = calculateProportionalCardHeight(durationMinutes);

	const appointmentSuggestions = (visibleScheduleSuggestions ?? []).filter(
		(s) => s?.appointmentId === appointment?.id,
	);
	const readiness =
		(appointmentReadinessById instanceof Map
			? appointmentReadinessById.get(appointment?.id ?? "")
			: undefined) ?? null;

	return {
		isSmartRecoveryOpen,
		setIsSmartRecoveryOpen,
		handleCardMouseEnter,
		handleCardMouseLeave,
		handleCardDoubleClick,
		handleFreeSlotToWaitlist,
		isMicroDensity,
		isTwoLineMode,
		proportionalHeight,
		appointmentSuggestions,
		readiness,
	};
}
