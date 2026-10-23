import type React from "react";

export interface BookingContactsSectionProps {
	isTelegramContext: boolean;
	patientName: string;
	setPatientName: (name: string) => void;
	patientPhone: string;
	handlePhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	patientComment: string;
	setPatientComment: (comment: string) => void;
	hasAgreedToPrivacy: boolean;
	setHasAgreedToPrivacy: (agreed: boolean) => void;
	showSmsVerification: boolean;
	smsCodeSent: boolean;
	enteredSmsCode: string;
	setEnteredSmsCode: (code: string) => void;
	isSmsVerified: boolean;
	isSmsFallbackActive?: boolean | undefined;
	onEnableSmsFallback?: (() => void) | undefined;
	smsResendCountdown: number;
	smsError: string | null;
	handleSendSmsCode: () => void;
	handleVerifySmsCode: () => void;
	handleTelegramShareContact: () => void;
	submitError: string | null;
	setSubmitError: (error: string | null) => void;
	isSubmitting: boolean;
	onSubmit: (e?: React.FormEvent) => void;
}
