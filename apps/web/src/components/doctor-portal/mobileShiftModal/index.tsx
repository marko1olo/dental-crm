import React, { useState } from "react";
import { DoctorShiftCloseModal } from "../../shift/DoctorShiftCloseModal";
import { FastClinicalPrintEngine } from "../../documents/FastClinicalPrintEngine";
import type { DoctorShiftAppointment } from "@dental/shared";
import { useDoctorMobileShift } from "./useDoctorMobileShift";
import { DoctorShiftHeader } from "./DoctorShiftHeader";
import { DoctorShiftTimeline } from "./DoctorShiftTimeline";
import { DoctorShiftActions } from "./DoctorShiftActions";
import { DoctorPieceRateWalletView } from "../../doctor/DoctorPieceRateWalletView";
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
	const [printingAppointment, setPrintingAppointment] = useState<DoctorShiftAppointment | null>(null);

	if (!isOpen) return null;

	return (
		<div
			className="doctor-mobile-pwa-overlay"
			data-testid="doctor-mobile-shift-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Мобильная смена врача PWA"
		>
			<div className={`doctor-mobile-pwa-container ${shift.activeTab === "wallet" ? "wallet-expanded-mode" : ""}`}>
				{shift.activeTab === "wallet" ? (
					<div
						className="overflow-y-auto flex-1"
						data-testid="doctor-shift-wallet-tab-content"
						style={{ maxHeight: "94vh" }}
					>
						<DoctorPieceRateWalletView
							doctorId={props.initialDoctorId}
							doctorName={initialDoctorName}
							doctorSpecialty={initialDoctorSpecialty}
							shiftDateIso={props.initialShiftDateIso || shift.formattedShiftDate}
							onClose={() => shift.setActiveTab("all")}
						/>
					</div>
				) : (
					<>
						<DoctorShiftHeader
							doctorName={initialDoctorName}
							doctorSpecialty={initialDoctorSpecialty}
							formattedShiftDate={shift.formattedShiftDate}
							earnings={shift.earnings}
							unsignedAppointmentIds={shift.unsignedAppointmentIds}
							chairStatus={shift.chairStatus}
							onChangeChairStatus={shift.setChairStatus}
							onClose={onClose}
							onSessionPepSigning={shift.handleSessionPepSigning}
							onInitiateBatchSigning={shift.handleInitiateBatchSigning}
							onOpenWallet={() => shift.setActiveTab("wallet")}
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
							onPrintInsert={(apt) => setPrintingAppointment(apt)}
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
					</>
				)}
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

			{/* Вкладыш 043/у для амбулаторной карты (1 клик из смены врача) */}
			{printingAppointment && (
				<FastClinicalPrintEngine
					isOpen={Boolean(printingAppointment)}
					onClose={() => setPrintingAppointment(null)}
					initialDocType="partisan_insert_043u"
					patient={{
						fullName: printingAppointment.patientFullName,
						birthDate: printingAppointment.patientBirthDate,
						phone: printingAppointment.patientPhone,
						cardNumber: printingAppointment.cardNumber,
					}}
					doctor={{
						fullName: initialDoctorName,
						specialty: initialDoctorSpecialty,
					}}
					visitData={{
						date: printingAppointment.startsAtIso.split("T")[0],
						time: printingAppointment.startsAtIso.split("T")[1]?.slice(0, 5) || "14:30",
						toothNumber: printingAppointment.diagnosisTooth || "46",
						diagnosis: printingAppointment.diagnosisIcd10 || "K02.1 Кариес дентина (хронический глубокий кариес)",
						treatment: printingAppointment.treatmentDescription,
					}}
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
