/**
 * DENTE Dental CRM — Leads Kanban Convert Modal
 * Mandate 8s (SSOT Componentization), Mandate 8e & 8n (Solo Doctor Autonomy & Zero Dead-Ends), Mandate 8b (<= 120 lines)
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { isLeadBookingDisabled } from "./LeadsKanbanView";
import {
	type LeadConvertModalProps, type LeadConvertSubmitOptions, type LeadConvertMode,
	LeadConvertPatientFields, LeadConvertAppointmentFields,
} from "./leadConvertModules";
import { useLeadConvertDefaults } from "./leadConvertModules/useLeadConvertDefaults";
import { LeadConvertModalHeader } from "./leadConvertModules/LeadConvertModalHeader";

export type { LeadConvertModalProps, LeadConvertSubmitOptions, LeadConvertMode };

export const LeadConvertModal: React.FC<LeadConvertModalProps> = ({
	isOpen, onClose, onSubmit, staff, chairs, effectiveStaff, effectiveChairs,
	selectedDoctorId, setSelectedDoctorId, selectedChairId, setSelectedChairId,
	appointmentDate, setAppointmentDate, appointmentTime, setAppointmentTime,
	isBooking, lead = null, consentMedical: controlledConsentMedical,
	setConsentMedical: controlledSetConsentMedical, consentMarketing: controlledConsentMarketing,
	setConsentMarketing: controlledSetConsentMarketing, cardBg = "var(--paper)",
	colBg = "var(--paper-soft)", borderColor = "var(--line)",
}) => {
	const [mode, setMode] = useState<LeadConvertMode>("patient_and_appointment");
	const [localConsentMedical, setLocalConsentMedical] = useState(true);
	const [localConsentMarketing, setLocalConsentMarketing] = useState(false);

	const { reason, setReason, comment, setComment } = useLeadConvertDefaults({
		isOpen, lead, appointmentDate, setAppointmentDate, appointmentTime, setAppointmentTime,
		selectedDoctorId, setSelectedDoctorId, selectedChairId, setSelectedChairId,
		effectiveStaff, effectiveChairs,
	});

	const consentMedical = controlledConsentMedical !== undefined ? controlledConsentMedical : localConsentMedical;
	const setConsentMedical = controlledSetConsentMedical || setLocalConsentMedical;
	const consentMarketing = controlledConsentMarketing !== undefined ? controlledConsentMarketing : localConsentMarketing;
	const setConsentMarketing = controlledSetConsentMarketing || setLocalConsentMarketing;

	if (!isOpen) return null;

	const handleFormSubmit = (e: React.FormEvent) => {
		onSubmit(e, {
			mode, consentMedical, consentMarketing,
			reason: mode === "patient_and_appointment" ? reason.trim() || undefined : undefined,
			comment: comment.trim() || undefined,
		});
	};

	const submitTitle = isBooking ? "Сохраняем..." : mode === "patient_only" ? "Создать карту пациента" : lead?.existingPatient ? "Подтвердить запись на приём" : "Подтвердить запись и создать карту";

	return (
		<div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
			<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ background: cardBg, borderRadius: 16, padding: 24, width: 440, maxWidth: "95%", maxHeight: "90vh", overflowY: "auto", border: `1px solid ${borderColor}`, boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
				<LeadConvertModalHeader mode={mode} setMode={setMode} onClose={onClose} borderColor={borderColor} />

				<form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
					<LeadConvertPatientFields
						lead={lead} borderColor={borderColor} consentMedical={consentMedical}
						setConsentMedical={setConsentMedical} consentMarketing={consentMarketing}
						setConsentMarketing={setConsentMarketing}
					/>

					{mode === "patient_and_appointment" && (
						<LeadConvertAppointmentFields
							staff={staff} chairs={chairs} effectiveStaff={effectiveStaff}
							effectiveChairs={effectiveChairs} selectedDoctorId={selectedDoctorId}
							setSelectedDoctorId={setSelectedDoctorId} selectedChairId={selectedChairId}
							setSelectedChairId={setSelectedChairId} reason={reason} setReason={setReason}
							comment={comment} setComment={setComment} appointmentDate={appointmentDate}
							setAppointmentDate={setAppointmentDate} appointmentTime={appointmentTime}
							setAppointmentTime={setAppointmentTime} colBg={colBg} borderColor={borderColor}
						/>
					)}

					<button
						type="submit"
						className="primary-button"
						data-testid="lead-convert-submit-btn"
						disabled={isLeadBookingDisabled(isBooking)}
						title={submitTitle}
						style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
					>
						{submitTitle}
					</button>
				</form>
			</motion.div>
		</div>
	);
};
