import { AlertCircle, CheckCircle2, Phone, ShieldCheck } from "lucide-react";
import type React from "react";

export interface BookingSmsBlockProps {
	readonly patientPhone: string;
	readonly smsCodeSent: boolean;
	readonly enteredSmsCode: string;
	readonly isSmsVerified: boolean;
	readonly smsResendCountdown: number;
	readonly smsError: string | null;
	readonly onSendSmsCode: () => void;
	readonly onVerifySmsCode: () => void;
	readonly onCodeChange: (val: string) => void;
}

export const BookingSmsBlock: React.FC<BookingSmsBlockProps> = ({
	patientPhone,
	smsCodeSent,
	enteredSmsCode,
	isSmsVerified,
	smsResendCountdown,
	smsError,
	onSendSmsCode,
	onVerifySmsCode,
	onCodeChange,
}) => {
	return (
		<div className="dbw-sms-block">
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
			</div>

			<div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300 mb-2 flex items-center gap-2">
				<Phone size={16} className="shrink-0 text-teal-600 dark:text-teal-400" />
				<span>
					Администратор клиники перезвонит вам по номеру <strong>{patientPhone || "телефона"}</strong> для согласования деталей визита.
				</span>
			</div>

			{!smsCodeSent && !isSmsVerified ? (
				<div className="flex items-center justify-between gap-4 flex-wrap">
					<span className="text-xs font-medium text-slate-700 dark:text-slate-300">
						Отправим бесплатное СМС с проверочным кодом
					</span>
					<button
						type="button"
						className="dbw-sms-verify-btn min-h-[44px]"
						onClick={onSendSmsCode}
					>
						Получить СМС-код
					</button>
				</div>
			) : !isSmsVerified ? (
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
			) : null}

			{smsError && (
				<div className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
					<AlertCircle size={16} /> {smsError}
				</div>
			)}
		</div>
	);
};
