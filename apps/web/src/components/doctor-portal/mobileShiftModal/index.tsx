import type React from "react";
import { DoctorShiftCloseModal } from "../../shift/DoctorShiftCloseModal";
import { useDoctorMobileShift } from "./useDoctorMobileShift";
import { DoctorShiftHeader } from "./DoctorShiftHeader";
import { DoctorShiftTimeline } from "./DoctorShiftTimeline";
import { DoctorShiftActions } from "./DoctorShiftActions";
import type { DoctorMobileShiftModalProps } from "./types";
import "../doctorMobileShift.css";

export const DoctorMobileShiftModal: React.FC<DoctorMobileShiftModalProps> = (props) => {
	const {
		isOpen,
		onClose,
		initialDoctorName = "Врач не выбран",
		initialDoctorSpecialty = "Врач-стоматолог терапевт-ортопед",
	} = props;

	const shift = useDoctorMobileShift(props);

	if (!isOpen) return null;

	return (
		<div
			className="doctor-mobile-pwa-overlay"
			data-testid="doctor-mobile-shift-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Мобильная смена врача PWA"
		>
			<div className="doctor-mobile-pwa-container">
				<DoctorShiftHeader
					doctorName={initialDoctorName}
					doctorSpecialty={initialDoctorSpecialty}
					formattedShiftDate={shift.formattedShiftDate}
					earnings={shift.earnings}
					unsignedAppointmentIds={shift.unsignedAppointmentIds}
					onClose={onClose}
					onSessionPepSigning={shift.handleSessionPepSigning}
					onInitiateBatchSigning={shift.handleInitiateBatchSigning}
				/>

				<DoctorShiftTimeline
					doctorAppointments={shift.doctorAppointments}
					filteredAppointments={shift.filteredAppointments}
					activeTab={shift.activeTab}
					setActiveTab={shift.setActiveTab}
					expandedAptId={shift.expandedAptId}
					setExpandedAptId={shift.setExpandedAptId}
					earnings={shift.earnings}
					unsignedAppointmentIds={shift.unsignedAppointmentIds}
					onStatusChange={shift.handleStatusChange}
					onSessionPepSigning={shift.handleSessionPepSigning}
					onInitiateSingleSmsSigning={shift.handleInitiateSingleSmsSigning}
					onEmergencyVisit={shift.handleEmergencyVisit}
				/>

				<DoctorShiftActions
					signedEmrCount={shift.earnings.signedEmr043Count}
					onOpenCloseModal={() => shift.setIsCloseModalOpen(true)}
					signingSession={shift.signingSession}
					onCloseSmsDrawer={() => shift.setSigningSession(null)}
					enteredSmsCode={shift.enteredSmsCode}
					onChangeSmsCode={shift.setEnteredSmsCode}
					smsCountdown={shift.smsCountdown}
					isSubmittingCode={shift.isSubmittingCode}
					onConfirmSmsSigning={shift.handleConfirmSmsSigning}
					onSessionPepSigning={shift.handleSessionPepSigning}
				/>
			</div>

			{/* Doctor Shift Close Reconciliation & Handover Screen */}
			{shift.isCloseModalOpen && (
				<DoctorShiftCloseModal
					isOpen={shift.isCloseModalOpen}
					onClose={() => shift.setIsCloseModalOpen(false)}
					onConfirmClose={shift.handleConfirmCloseShift}
					doctorFullName={initialDoctorName}
					doctorSpecialtyRu={initialDoctorSpecialty}
					shiftDateLabel={shift.formattedShiftDate}
					shiftStats={shift.shiftStats}
					emrSummary={shift.emrSummary}
				/>
			)}
		</div>
	);
};

export * from "./types";
export { useDoctorMobileShift } from "./useDoctorMobileShift";
export { DoctorShiftHeader } from "./DoctorShiftHeader";
export { DoctorShiftTimeline } from "./DoctorShiftTimeline";
export { DoctorShiftActions } from "./DoctorShiftActions";
