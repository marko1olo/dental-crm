import { Phone } from "lucide-react";
import type React from "react";

export interface BookingSmsFallbackNoticeProps {
	readonly patientPhone: string;
	readonly isSmsFallbackActive?: boolean | undefined;
	readonly isSmsVerified: boolean;
	readonly smsError: string | null;
	readonly onEnableSmsFallback?: (() => void) | undefined;
}

export const BookingSmsFallbackNotice: React.FC<BookingSmsFallbackNoticeProps> = ({
	patientPhone,
	isSmsFallbackActive = false,
	isSmsVerified,
	smsError,
	onEnableSmsFallback,
}) => {
	return (
		<>
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
		</>
	);
};
