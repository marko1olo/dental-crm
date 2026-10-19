import { AlertCircle, CheckCircle2, Phone, ShieldCheck } from "lucide-react";
import type React from "react";

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

			{isSmsFallbackActive ? (
				<div
					className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300 my-2 flex items-center gap-2.5"
					data-testid="sms-fallback-notice"
				>
					<Phone size={18} className="shrink-0 text-teal-600 dark:text-teal-400" />
					<div className="min-w-0 flex-1">
						<div className="font-bold">Предварительная бронь без СМС активна</div>
						<div className="text-[11px] text-teal-700 dark:text-teal-300 mt-0.5">
							Администратор клиники перезвонит вам по номеру <strong>{patientPhone || "телефона"}</strong> для согласования времени визита.
						</div>
					</div>
				</div>
			) : (
				<div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300 mb-2 flex items-center gap-2">
					<Phone size={16} className="shrink-0 text-teal-600 dark:text-teal-400" />
					<span>
						Администратор клиники перезвонит вам по номеру <strong>{patientPhone || "телефона"}</strong> для согласования деталей визита.
					</span>
				</div>
			)}

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
				<div
					className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 my-1"
					data-testid="sms-error-alert"
				>
					<AlertCircle size={16} /> {smsError}
				</div>
			)}

			{!isSmsVerified && onEnableSmsFallback && (
				<div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 flex-wrap">
					<span className="text-[11px] text-slate-500 dark:text-slate-400">
						{smsError ? "Шлюз недоступен или не приходит код?" : "Нет доступа к СМС?"}
					</span>
					<button
						type="button"
						onClick={onEnableSmsFallback}
						className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer min-h-[44px] flex items-center px-1"
						data-testid="bypass-sms-btn"
					>
						Записаться без СМС (звонок администратора)
					</button>
				</div>
			)}
		</div>
	);
};
