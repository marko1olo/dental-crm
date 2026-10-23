import type React from "react";

export interface BookingSmsCodeInputProps {
	readonly patientPhone: string;
	readonly enteredSmsCode: string;
	readonly onCodeChange: (val: string) => void;
	readonly onVerifySmsCode: () => void;
	readonly smsResendCountdown: number;
	readonly onSendSmsCode: () => void;
}

export const BookingSmsCodeInput: React.FC<BookingSmsCodeInputProps> = ({
	patientPhone,
	enteredSmsCode,
	onCodeChange,
	onVerifySmsCode,
	smsResendCountdown,
	onSendSmsCode,
}) => {
	return (
		<div className="flex flex-col gap-3">
			<div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300">
				Код подтверждения отправлен в СМС на {patientPhone || "указанный номер"}
			</div>

			<div className="dbw-sms-code-input-row">
				<input
					type="text"
					maxLength={6}
					placeholder="••••"
					value={enteredSmsCode}
					onChange={(e) => onCodeChange(e.target.value)}
					className="dbw-sms-code-input min-h-[44px]"
					aria-label="Код из СМС"
				/>

				<button
					type="button"
					className="dbw-sms-verify-btn min-h-[44px]"
					onClick={onVerifySmsCode}
				>
					Проверить
				</button>
			</div>

			{smsResendCountdown > 0 ? (
				<div className="text-xs text-slate-400 font-medium">
					Повторный код можно запросить через {smsResendCountdown} сек.
				</div>
			) : (
				<button
					type="button"
					className="text-xs text-slate-500 dark:text-slate-400 underline text-left font-medium"
					onClick={onSendSmsCode}
				>
					Отправить код ещё раз
				</button>
			)}
		</div>
	);
};
