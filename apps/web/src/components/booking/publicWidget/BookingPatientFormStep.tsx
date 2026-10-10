import type React from "react";
import { BookingContactsSection } from "../BookingContactsSection";
import type { BookingPatientFormStepProps } from "./types";

export const BookingPatientFormStep: React.FC<BookingPatientFormStepProps> = ({
	isTelegramContext,
	patientName,
	setPatientName,
	patientPhone,
	handlePhoneChange,
	patientComment,
	setPatientComment,
	hasAgreedToPrivacy,
	setHasAgreedToPrivacy,
	showSmsVerification,
	smsCodeSent,
	enteredSmsCode,
	setEnteredSmsCode,
	isSmsVerified,
	smsResendCountdown,
	smsError,
	handleSendSmsCode,
	handleVerifySmsCode,
	handleTelegramShareContact,
	submitError,
	setSubmitError,
	isSubmitting,
	onSubmit,
}) => {
	return (
		<div id="dbw-step-contacts" className="dbw-step-card">
			<BookingContactsSection
				isTelegramContext={isTelegramContext}
				patientName={patientName}
				setPatientName={setPatientName}
				patientPhone={patientPhone}
				handlePhoneChange={handlePhoneChange}
				patientComment={patientComment}
				setPatientComment={setPatientComment}
				hasAgreedToPrivacy={hasAgreedToPrivacy}
				setHasAgreedToPrivacy={setHasAgreedToPrivacy}
				showSmsVerification={showSmsVerification}
				smsCodeSent={smsCodeSent}
				enteredSmsCode={enteredSmsCode}
				setEnteredSmsCode={setEnteredSmsCode}
				isSmsVerified={isSmsVerified}
				smsResendCountdown={smsResendCountdown}
				smsError={smsError}
				handleSendSmsCode={handleSendSmsCode}
				handleVerifySmsCode={handleVerifySmsCode}
				handleTelegramShareContact={handleTelegramShareContact}
				submitError={submitError}
				setSubmitError={setSubmitError}
				isSubmitting={isSubmitting}
				onSubmit={onSubmit}
			/>
		</div>
	);
};
