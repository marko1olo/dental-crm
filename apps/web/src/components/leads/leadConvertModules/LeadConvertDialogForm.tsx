/**
 * DENTE Dental CRM — Lead Convert Dialog Form
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import { isLeadBookingDisabled } from "../LeadsKanbanView";
import { LeadConvertAppointmentFields } from "./LeadConvertAppointmentFields";
import { LeadConvertModalHeader } from "./LeadConvertModalHeader";
import { LeadConvertPatientFields } from "./LeadConvertPatientFields";
import type { LeadConvertModalProps } from "./leadConvertTypes";
import { useLeadConvertModalState } from "./useLeadConvertModalState";

export const LeadConvertDialogForm: React.FC<LeadConvertModalProps> = (props) => {
	const {
		onClose,
		staff,
		chairs,
		effectiveStaff,
		effectiveChairs,
		selectedDoctorId,
		setSelectedDoctorId,
		selectedChairId,
		setSelectedChairId,
		appointmentDate,
		setAppointmentDate,
		appointmentTime,
		setAppointmentTime,
		isBooking,
		lead = null,
		colBg = "var(--paper-soft)",
		borderColor = "var(--line)",
	} = props;

	const {
		mode,
		setMode,
		consentMedical,
		setConsentMedical,
		consentMarketing,
		setConsentMarketing,
		defaults,
		handleFormSubmit,
		submitTitle,
	} = useLeadConvertModalState(props);

	return (
		<>
			<LeadConvertModalHeader
				mode={mode}
				setMode={setMode}
				onClose={onClose}
				borderColor={borderColor}
			/>

			<form
				onSubmit={handleFormSubmit}
				style={{ display: "flex", flexDirection: "column", gap: 14 }}
			>
				<LeadConvertPatientFields
					lead={lead}
					borderColor={borderColor}
					consentMedical={consentMedical}
					setConsentMedical={setConsentMedical}
					consentMarketing={consentMarketing}
					setConsentMarketing={setConsentMarketing}
				/>

				{mode === "patient_and_appointment" && (
					<LeadConvertAppointmentFields
						staff={staff}
						chairs={chairs}
						effectiveStaff={effectiveStaff}
						effectiveChairs={effectiveChairs}
						selectedDoctorId={selectedDoctorId}
						setSelectedDoctorId={setSelectedDoctorId}
						selectedChairId={selectedChairId}
						setSelectedChairId={setSelectedChairId}
						reason={defaults.reason}
						setReason={defaults.setReason}
						comment={defaults.comment}
						setComment={defaults.setComment}
						appointmentDate={appointmentDate}
						setAppointmentDate={setAppointmentDate}
						appointmentTime={appointmentTime}
						setAppointmentTime={setAppointmentTime}
						colBg={colBg}
						borderColor={borderColor}
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
		</>
	);
};
