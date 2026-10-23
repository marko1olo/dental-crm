import { AlertCircle, Phone, User } from "lucide-react";
import type React from "react";
import { BookingContactsFormFields } from "./BookingContactsFormFields";
import { BookingPrivacyRow } from "./BookingPrivacyRow";
import { BookingSmsBlock } from "./BookingSmsBlock";
import { BookingSubmitButton } from "./BookingSubmitButton";
import { BookingTelegram1Tap } from "./BookingTelegram1Tap";
import type { BookingContactsSectionProps } from "./contracts/bookingContactsContracts";

export type { BookingContactsSectionProps };

export const BookingContactsSection: React.FC<BookingContactsSectionProps> = ({
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
	isSmsFallbackActive,
	onEnableSmsFallback,
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
		<section aria-labelledby="booking-contacts-heading" className="dbw-contacts-section">
			<h3 id="booking-contacts-heading" className="dbw-section-heading">
				<User size={18} /> Ваши контактные данные
			</h3>

			{isTelegramContext && (
				<BookingTelegram1Tap
					patientName={patientName}
					onShareContact={handleTelegramShareContact}
				/>
			)}

			<form onSubmit={onSubmit} noValidate>
				<BookingContactsFormFields
					patientName={patientName}
					onNameChange={setPatientName}
					patientPhone={patientPhone}
					onPhoneChange={handlePhoneChange}
					patientComment={patientComment}
					onCommentChange={setPatientComment}
					clearSubmitError={() => submitError && setSubmitError(null)}
				/>

				{!showSmsVerification && (
					<div
						className="dbw-callback-notice"
						data-testid="patient-callback-notice"
					>
						<Phone size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>
							Администратор клиники перезвонит вам по номеру <strong>{patientPhone || "телефона"}</strong> для согласования деталей визита.
						</span>
					</div>
				)}

				{showSmsVerification && (
					<BookingSmsBlock
						patientPhone={patientPhone}
						smsCodeSent={smsCodeSent}
						enteredSmsCode={enteredSmsCode}
						isSmsVerified={isSmsVerified}
						isSmsFallbackActive={isSmsFallbackActive}
						smsResendCountdown={smsResendCountdown}
						smsError={smsError}
						onSendSmsCode={handleSendSmsCode}
						onVerifySmsCode={handleVerifySmsCode}
						onCodeChange={setEnteredSmsCode}
						onEnableSmsFallback={onEnableSmsFallback}
					/>
				)}

				<BookingPrivacyRow
					hasAgreedToPrivacy={hasAgreedToPrivacy}
					onAgreedChange={setHasAgreedToPrivacy}
				/>

				{submitError && (
					<div
						role="alert"
						className="dbw-alert-error"
						data-testid="step4-submit-error"
					>
						<AlertCircle size={18} /> {submitError}
					</div>
				)}

				<BookingSubmitButton isSubmitting={isSubmitting} />
			</form>
		</section>
	);
};
