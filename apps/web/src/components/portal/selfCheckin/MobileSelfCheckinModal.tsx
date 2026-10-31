/**
 * MobileSelfCheckinModal.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Express Mobile Self-Checkin & Kiosk Modal:
 * - 1-Touch Check-in with Physiological Norm (Mandate 8e)
 * - Decomposed Sweet Spot architecture (160-200 lines) matching Mandate 8b
 * - Apple HIG bottom sheet ergonomics & touch targets >= 44x44px
 * - Reusable MobileCheckinHeader and dedicated state machine
 */

import React from "react";
import "./selfCheckin.css";
import { AuthArtBackground } from "../../auth/AuthArtBackground";
import { MobileCheckinHeader } from "./MobileCheckinHeader";
import {
	type StatutoryConsentItem,
	DEFAULT_CONSENTS,
	SelfCheckinConsentsSection,
} from "./SelfCheckinConsentsSection";
import { SelfCheckinPhoneAuthSection } from "./SelfCheckinPhoneAuthSection";
import { SelfCheckinSomaticSection } from "./SelfCheckinSomaticSection";
import { SelfCheckinTicketSection } from "./SelfCheckinTicketSection";
import {
	type CheckinStep,
	useMobileSelfCheckinState,
} from "./useMobileSelfCheckinState";
import type { evaluateSomaticRisks } from "./SomaticQuestionnaireEngine";

export * from "./SelfCheckinConsentsSection";
export * from "./SelfCheckinPhoneAuthSection";
export * from "./SelfCheckinSomaticSection";
export * from "./SelfCheckinTicketSection";
export * from "./MobileCheckinHeader";
export * from "./MobileCheckinAppointmentCard";
export * from "./useMobileSelfCheckinState";

export type { CheckinStep };

export interface MobileSelfCheckinModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly initialPhone?: string | undefined;
	readonly patientName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly appointmentTime?: string | undefined;
	readonly cabinetName?: string | undefined;
	readonly queueTicket?: string | undefined;
	readonly initialStep?: CheckinStep | undefined;
	readonly onCheckinSuccess?: ((result: {
		patientId: string;
		signedConsents: string[];
		somaticProfile: ReturnType<typeof evaluateSomaticRisks>;
		queueTicket?: string | undefined;
		visitStatus?: string | undefined;
	}) => void) | undefined;
}

export const MobileSelfCheckinModal: React.FC<MobileSelfCheckinModalProps> = ({
	isOpen,
	onClose,
	patientId = "",
	initialPhone,
	patientName,
	clinicName = "Стоматологическая клиника ДЕНТЕ",
	doctorName,
	appointmentTime,
	cabinetName,
	queueTicket,
	initialStep = "phone_auth",
	onCheckinSuccess,
}) => {
	const state = useMobileSelfCheckinState({
		patientId,
		initialPhone,
		patientName,
		doctorName,
		appointmentTime,
		cabinetName,
		queueTicket,
		initialStep,
		onCheckinSuccess,
	});

	if (!isOpen) return null;

	return (
		<div className="selfcheckin-modal-backdrop" onClick={onClose}>
			<AuthArtBackground overlayAlpha={0.35} />
			<div
				className="selfcheckin-modal-window"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Dedicated Reusable Header with Steps Bar */}
				<MobileCheckinHeader
					clinicName={clinicName}
					step={state.step}
					onClose={onClose}
				/>

				{/* Body Content by Current Step */}
				<div className="selfcheckin-content">
					{/* STEP 1: Phone 1-Touch Auth & Instant Checkin */}
					{state.step === "phone_auth" && (
						<SelfCheckinPhoneAuthSection
							patientName={state.effectivePatientName}
							appointmentTime={state.effectiveAppointmentTime}
							doctorName={state.effectiveDoctorName}
							phoneDigits={state.phoneDigits}
							setPhoneDigits={state.setPhoneDigits}
							showOptionalDocs={state.showOptionalDocs}
							setShowOptionalDocs={state.setShowOptionalDocs}
							authError={state.authError}
							setAuthError={state.setAuthError}
							isSubmitting={state.isSubmitting}
							onApplyPhysiologicalNorm={state.handleApplyPhysiologicalNorm}
							onOneTouchCheckin={state.handleOneTouchCheckin}
							onEmergencyCheckin={state.handleEmergencyCheckin}
							onGoToConsents={() => state.setStep("consents")}
							onGoToSomatic={() => state.setStep("somatic")}
						/>
					)}

					{/* STEP 2: Statutory Consents with Vector Touch Signature */}
					{state.step === "consents" && (
						<SelfCheckinConsentsSection
							consents={state.consents}
							activeConsentIndex={state.activeConsentIndex}
							signerPhone={state.effectivePhone}
							onSelectConsentIndex={(idx) => {
								state.setActiveConsentIndex(idx);
								state.setConsentNotice(null);
							}}
							onSignAllConsentsWithPep={state.handleSignAllConsentsWithPep}
							onSignCurrentConsent={state.handleSignCurrentConsent}
							onSignCurrentConsentWithPaper={state.handleSignCurrentConsentWithPaper}
							consentNotice={state.consentNotice}
							allConsentsSigned={state.allConsentsSigned}
							onProceedToSomatic={() => state.setStep("somatic")}
						/>
					)}

					{/* STEP 3: Somatic Health Questionnaire */}
					{state.step === "somatic" && (
						<SelfCheckinSomaticSection
							somaticData={state.somaticData}
							setSomaticData={state.setSomaticData}
							isNormApplied={state.isNormApplied}
							quickAllergies={state.quickAllergies}
							onToggleQuickAllergy={state.handleToggleQuickAllergy}
							onApplyPhysiologicalNorm={state.handleApplyPhysiologicalNorm}
							onApplyPhysiologicalNormAndFinish={state.handleApplyPhysiologicalNormAndFinish}
							onCompleteCheckin={state.handleCompleteCheckin}
							allergyDetails={state.allergyDetails}
							setAllergyDetails={state.setAllergyDetails}
							cardioDetails={state.cardioDetails}
							setCardioDetails={state.setCardioDetails}
							coagulationDetails={state.coagulationDetails}
							setCoagulationDetails={state.setCoagulationDetails}
							riskEvaluation={state.riskEvaluation}
							isSubmitting={state.isSubmitting}
						/>
					)}

					{/* STEP 4: Completed Pass & Queue Ticket */}
					{state.step === "completed" && (
						<SelfCheckinTicketSection
							displayQueueTicket={state.displayQueueTicket}
							patientName={state.effectivePatientName}
							appointmentTime={state.effectiveAppointmentTime}
							doctorWaitMessage={state.doctorWaitMessage}
							checkinQrSvg={state.checkinQrSvg}
							checkinCode={state.checkinCode}
							onClose={onClose}
						/>
					)}
				</div>
			</div>
		</div>
	);
};

MobileSelfCheckinModal.displayName = "MobileSelfCheckinModal";
