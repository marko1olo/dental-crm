import { Phone, Send } from "lucide-react";
import type React from "react";

export interface BookingTelegram1TapProps {
	readonly patientName: string;
	readonly onShareContact: () => void;
}

export const BookingTelegram1Tap: React.FC<BookingTelegram1TapProps> = ({
	patientName,
	onShareContact,
}) => {
	return (
		<div className="dbw-tg-1tap-card mb-4" data-testid="telegram-1tap-card">
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-full bg-[#229ED9]/15 text-[#229ED9] flex items-center justify-center shrink-0">
						<Send size={15} />
					</div>
					<div className="min-w-0">
						<div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
							<span>Telegram 1-тап запись</span>
							<span className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded font-semibold">
								Без ввода
							</span>
						</div>
						<div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
							{patientName ? `Профиль: ${patientName}` : "Автозаполнение данных профиля"}
						</div>
					</div>
				</div>

				<button
					type="button"
					onClick={onShareContact}
					className="dbw-tg-share-btn secondary-button text-xs font-bold px-3 py-2 rounded-lg bg-[#229ED9] hover:bg-[#1c8ec4] text-white flex items-center gap-1.5 transition-all active:scale-[0.98] min-h-[44px] shadow-sm"
					aria-label="Поделиться номером в Telegram"
				>
					<Phone size={13} />
					<span>Поделиться номером в Telegram</span>
				</button>
			</div>
		</div>
	);
};
