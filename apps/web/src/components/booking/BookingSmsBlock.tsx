import { AlertCircle, CheckCircle2, Phone, ShieldCheck } from "lucide-react";
import type React from "react";
import { BookingSmsCodeInput } from "./BookingSmsCodeInput";
import { BookingSmsFallbackNotice } from "./BookingSmsFallbackNotice";

export interface BookingSmsBlockProps {
	readonly patientPhone: string;
	readonly smsCodeSent: boolean;
	readonly enteredSmsCode: string;
	readonly isSmsVerified: boolean;
	readonly isSmsFallbackActive?: boolean | undefined;
	readonly smsResendCountdown: number;
	readonly smsError: string | null;
	readonly onSendSmsCode: () => void;
	readonly onVerifySmsCode: () => void;
	readonly onCodeChange: (val: string) => void;
	readonly onEnableSmsFallback?: (() => void) | undefined;
}

export const BookingSmsBlock: React.FC<BookingSmsBlockProps> = ({
	patientPhone,
	smsCodeSent,
	enteredSmsCode,
	isSmsVerified,
	isSmsFallbackActive = false,
	smsResendCountdown,
	smsError,
	onSendSmsCode,
	onVerifySmsCode,
	onCodeChange,
	onEnableSmsFallback,
}) => {
	return (
		<div className="dbw-sms-block" data-testid="booking-sms-block">
			<div className="dbw-sms-header">
				<div className="dbw-sms-title">
					<ShieldCheck size={20} />
					<span>Подтверждение номера телефона</span>
				</div>
				{isSmsVerified && (
					<span className="text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
						<CheckCircle2 size={16} /> Подтвержден
					</span>
				)}
				{isSmsFallbackActive && !isSmsVerified && (
					<span className="text-xs text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
						<Phone size={14} /> Звонок администратора
					</span>
				)}
			</div>

			<BookingSmsFallbackNotice
				patientPhone={patientPhone}
				isSmsFallbackActive={isSmsFallbackActive}
				isSmsVerified={isSmsVerified}
				smsError={smsError}
				onEnableSmsFallback={onEnableSmsFallback}
			/>

			{!isSmsFallbackActive && !smsCodeSent && !isSmsVerified ? (
				<div className="flex items-center justify-between gap-4 flex-wrap">
					<span className="text-xs font-medium text-slate-700 dark:text-slate-300">
						Отправим бесплатное СМС с проверочным кодом
					</span>
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							className="dbw-sms-verify-btn min-h-[44px]"
							onClick={onSendSmsCode}
						>
							Получить СМС-код
						</button>
					</div>
				</div>
			) : !isSmsFallbackActive && !isSmsVerified ? (
				<BookingSmsCodeInput
					patientPhone={patientPhone}
					enteredSmsCode={enteredSmsCode}
					onCodeChange={onCodeChange}
					onVerifySmsCode={onVerifySmsCode}
					smsResendCountdown={smsResendCountdown}
					onSendSmsCode={onSendSmsCode}
				/>
			) : null}

			{smsError && (
				<div
					className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 my-1"
					data-testid="sms-error-alert"
				>
					<AlertCircle size={16} /> {smsError}
				</div>
			)}
		</div>
	);
};
