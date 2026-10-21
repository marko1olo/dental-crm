/**
 * DENTE Dental CRM — Lead Convert Modal State Hook
 * Mandate 8b (<= 120 lines)
 */

import React, { useState } from "react";
import type { Lead } from "../../../store/leadsStore";
import type { LeadConvertModalProps, LeadConvertMode } from "./leadConvertTypes";
import { useLeadConvertDefaults } from "./useLeadConvertDefaults";

export function useLeadConvertModalState(props: LeadConvertModalProps) {
	const [mode, setMode] = useState<LeadConvertMode>("patient_and_appointment");
	const [localConsentMedical, setLocalConsentMedical] = useState(true);
	const [localConsentMarketing, setLocalConsentMarketing] = useState(false);

	const defaults = useLeadConvertDefaults({
		isOpen: props.isOpen,
		lead: props.lead ?? null,
		appointmentDate: props.appointmentDate,
		setAppointmentDate: props.setAppointmentDate,
		appointmentTime: props.appointmentTime,
		setAppointmentTime: props.setAppointmentTime,
		selectedDoctorId: props.selectedDoctorId,
		setSelectedDoctorId: props.setSelectedDoctorId,
		selectedChairId: props.selectedChairId,
		setSelectedChairId: props.setSelectedChairId,
		effectiveStaff: props.effectiveStaff,
		effectiveChairs: props.effectiveChairs,
	});

	const consentMedical =
		props.consentMedical !== undefined ? props.consentMedical : localConsentMedical;
	const setConsentMedical = props.setConsentMedical || setLocalConsentMedical;

	const consentMarketing =
		props.consentMarketing !== undefined ? props.consentMarketing : localConsentMarketing;
	const setConsentMarketing = props.setConsentMarketing || setLocalConsentMarketing;

	const handleFormSubmit = (e: React.FormEvent) => {
		props.onSubmit(e, {
			mode,
			consentMedical,
			consentMarketing,
			reason: mode === "patient_and_appointment" ? defaults.reason.trim() || undefined : undefined,
			comment: defaults.comment.trim() || undefined,
		});
	};

	const submitTitle = props.isBooking
		? "Сохраняем..."
		: mode === "patient_only"
			? "Создать карту пациента"
			: props.lead?.existingPatient
				? "Подтвердить запись на приём"
				: "Подтвердить запись и создать карту";

	return {
		mode,
		setMode,
		consentMedical,
		setConsentMedical,
		consentMarketing,
		setConsentMarketing,
		defaults,
		handleFormSubmit,
		submitTitle,
	};
}
