import { Copy, MessageSquare, Phone } from "lucide-react";
import React from "react";
import { openWhatsAppChat } from "../../../../store/telephonyStore";
import { showToast } from "../../../GlobalToast";

export interface ScheduleMobileSheetPatientContactProps {
	phone?: string | null | undefined;
	balance: number | null;
	getReminderText: () => string;
}

export const ScheduleMobileSheetPatientContact: React.FC<
	ScheduleMobileSheetPatientContactProps
> = ({ phone, balance, getReminderText }) => {
	const handleWhatsApp = () => {
		if (phone) openWhatsAppChat(phone, getReminderText());
	};

	const handleCopySms = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(getReminderText());
			showToast("Текст напоминания скопирован", "success");
		}
	};

	return (
		<>
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-2">
				<span className="font-bold text-[var(--muted)]">
					Статус оплаты / Баланс:
				</span>
				{balance !== null ? (
					<span
						className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono whitespace-nowrap shrink-0 ${
							balance > 0
								? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
								: balance < 0
									? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
									: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
						}`}
					>
						{balance > 0
							? `Депозит: +${balance.toLocaleString("ru-RU")} ₽`
							: balance < 0
								? `Долг: ${Math.abs(balance).toLocaleString("ru-RU")} ₽`
								: "0 ₽ (Оплачено)"}
					</span>
				) : (
					<span className="text-xs text-[var(--muted)] whitespace-nowrap shrink-0">
						0 ₽ (Оплачено)
					</span>
				)}
			</div>

			{phone && (
				<div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<a
						href={`tel:${phone.replace(/[^\d+]/g, "")}`}
						className="flex items-center gap-2 font-mono text-sm font-semibold text-[var(--ink)] hover:text-[var(--primary)] min-h-[44px] transition-colors"
						data-testid="mobile-sheet-phone-link"
						title={`Позвонить ${phone}`}
					>
						<Phone className="w-4 h-4 text-[var(--primary)] shrink-0" />
						<span>{phone}</span>
					</a>
					<div className="flex items-center gap-1.5 shrink-0">
						<a
							href={`tel:${phone.replace(/[^\d+]/g, "")}`}
							className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
							title={`Позвонить ${phone}`}
							aria-label="Позвонить пациенту"
							data-testid="mobile-sheet-direct-call-btn"
						>
							<Phone size={16} className="text-[var(--primary)]" />
						</a>
						<button
							type="button"
							onClick={handleWhatsApp}
							data-testid="mobile-sheet-whatsapp-btn"
							className="secondary-button min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
						>
							<MessageSquare
								size={15}
								className="text-emerald-600 dark:text-emerald-400"
							/>
							<span>WhatsApp</span>
						</button>
						<button
							type="button"
							onClick={handleCopySms}
							data-testid="mobile-sheet-copy-sms-btn"
							className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
							title="Скопировать SMS"
							aria-label="Скопировать текст напоминания"
						>
							<Copy size={16} />
						</button>
					</div>
				</div>
			)}
		</>
	);
};
