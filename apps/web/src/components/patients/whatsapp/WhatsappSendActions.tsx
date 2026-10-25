import { ExternalLink, MessageSquare, Phone, Send } from "lucide-react";
import React from "react";

interface WhatsappSendActionsProps {
	readonly busy: boolean;
	readonly cleanPhone: string;
	readonly phoneHint: string;
	readonly message: string;
	readonly onSend: () => void;
	readonly onOpenWebWhatsApp: () => void;
}

export function WhatsappSendActions({
	busy,
	cleanPhone,
	phoneHint,
	message,
	onSend,
	onOpenWebWhatsApp,
}: WhatsappSendActionsProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					data-testid="patient-whatsapp-send-submit"
					disabled={busy}
					onClick={onSend}
					className="min-h-[44px] sm:min-h-[32px] px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white border border-emerald-400/40 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
				>
					<Send size={14} />
					<span>{busy ? "Отправляю…" : "Отправить в WhatsApp"}</span>
				</button>

				{cleanPhone ? (
					<div className="flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							onClick={onOpenWebWhatsApp}
							className="min-h-[44px] sm:min-h-[32px] px-3 py-2 text-xs font-semibold rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] active:scale-95 text-emerald-600 dark:text-emerald-300 border border-[var(--glass-border)] hover:border-emerald-500/30 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
							title="Открыть в веб-версии WhatsApp"
						>
							<MessageSquare size={14} />
							<span>wa.me</span>
							<ExternalLink size={11} className="opacity-60" />
						</button>

						<a
							href={`https://t.me/+${cleanPhone}`}
							target="_blank"
							rel="noreferrer"
							className="min-h-[44px] sm:min-h-[32px] px-3 py-2 text-xs font-semibold rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] active:scale-95 text-sky-600 dark:text-sky-300 border border-[var(--glass-border)] hover:border-sky-500/30 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
							title="Написать пациенту в Telegram"
						>
							<span>Telegram</span>
							<ExternalLink size={11} className="opacity-60" />
						</a>

						<a
							href={`sms:+${cleanPhone}?body=${encodeURIComponent(message.trim() || "")}`}
							className="min-h-[44px] sm:min-h-[32px] px-3 py-2 text-xs font-semibold rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] active:scale-95 text-indigo-600 dark:text-indigo-300 border border-[var(--glass-border)] hover:border-indigo-500/30 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
							title="Отправить SMS"
						>
							<span>SMS</span>
						</a>

						<a
							href={`tel:+${cleanPhone}`}
							className="min-h-[44px] sm:min-h-[32px] px-3 py-2 text-xs font-semibold rounded-xl bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] active:scale-95 text-teal-600 dark:text-teal-300 border border-[var(--glass-border)] hover:border-teal-500/30 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
							title={`Позвонить на ${phoneHint}`}
						>
							<Phone size={14} />
							<span>Звонок</span>
						</a>
					</div>
				) : null}
			</div>

			<span
				className="text-xs text-[var(--muted)] font-medium"
				data-testid="patient-whatsapp-send-hint"
			>
				{message.trim().length > 0
					? `${message.trim().length} симв.`
					: "Выберите шаблон или введите текст"}
			</span>
		</div>
	);
}
