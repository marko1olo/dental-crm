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
	isSmsFallbackActive,
	handleEnableSmsFallback,
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
	const isPreBookingMode = Boolean(!isTelegramContext && (!showSmsVerification || !isSmsVerified || isSmsFallbackActive));

	return (
		<div id="dbw-step-contacts" className="dbw-step-card">
			{/* Индикатор статуса и доверия онлайн-записи (Мандат 8e, 8n) */}
			<div
				className="mb-4 p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex items-center justify-between gap-3 text-[var(--ink)]"
				data-testid="booking-trust-status-badge"
			>
				<span className="font-medium text-[var(--ink-muted)]">Формат бронирования:</span>
				<span
					className={`font-semibold px-2.5 py-0.5 rounded-full text-xs flex items-center gap-1.5 ${
						!isPreBookingMode
							? "bg-teal-500/15 text-teal-800 dark:text-teal-200 border border-teal-500/30"
							: "bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)]"
					}`}
				>
					<span
						className={`w-1.5 h-1.5 rounded-full ${
							!isPreBookingMode ? "bg-teal-500" : "bg-amber-500"
						}`}
					/>
					{!isPreBookingMode
						? "Подтверждённая запись"
						: "Предварительная (требует звонка)"}
				</span>
			</div>

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
				isSmsFallbackActive={isSmsFallbackActive}
				onEnableSmsFallback={handleEnableSmsFallback}
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
