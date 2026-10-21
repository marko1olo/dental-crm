import { Copy, MessageSquare, Phone, Send } from "lucide-react";
import React, { useCallback } from "react";
import { openWhatsAppChat } from "../../../store/telephonyStore";
import { showToast } from "../../GlobalToast";

export interface MobilePatientCommGridProps {
	readonly phone: string;
	readonly cleanPhone: string;
	readonly fullName: string;
}

export function MobilePatientCommGrid({ phone, cleanPhone, fullName }: MobilePatientCommGridProps) {
	const handleCopyPhone = useCallback(() => {
		if (!phone) {
			showToast("Телефон не указан", "info");
			return;
		}
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(phone);
			showToast(`Телефон скопирован: ${phone}`, "success");
		}
	}, [phone]);

	const handleOpenWhatsapp = useCallback(() => {
		if (!phone) {
			showToast("Телефон не указан для WhatsApp", "error");
			return;
		}
		openWhatsAppChat(phone, `Здравствуйте, ${fullName}! Стоматологическая клиника DENTE приветствует вас.`);
	}, [phone, fullName]);

	const handleOpenTelegram = useCallback(() => {
		if (!cleanPhone) {
			showToast("Телефон не указан для Telegram", "error");
			return;
		}
		window.open(`https://t.me/+${cleanPhone}`, "_blank", "noopener,noreferrer");
	}, [cleanPhone]);

	return (
		<div className="mobile-comm-grid pt-1" data-testid="mobile-comm-grid">
			{phone ? (
				<a
					href={`tel:${phone}`}
					className="mobile-comm-btn bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)]"
					title={`Позвонить: ${phone}`}
					data-testid="mobile-btn-call"
				>
					<Phone size={17} className="text-teal-600 dark:text-teal-400" />
					<span>Звонок</span>
				</a>
			) : (
				<div
					className="mobile-comm-btn bg-[var(--paper-soft)] opacity-50 text-[var(--muted)] cursor-not-allowed"
					title="Телефон не указан"
				>
					<Phone size={17} />
					<span>Звонок</span>
				</div>
			)}

			<button
				type="button"
				onClick={handleOpenWhatsapp}
				className="mobile-comm-btn bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/20"
				title="Написать в WhatsApp"
				data-testid="mobile-btn-whatsapp"
			>
				<MessageSquare size={17} className="text-emerald-600 dark:text-emerald-400" />
				<span>WhatsApp</span>
			</button>

			<button
				type="button"
				onClick={handleOpenTelegram}
				className="mobile-comm-btn bg-sky-500/10 hover:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/20"
				title="Написать в Telegram"
				data-testid="mobile-btn-telegram"
			>
				<Send size={17} className="text-sky-600 dark:text-sky-400" />
				<span>Telegram</span>
			</button>

			<button
				type="button"
				onClick={handleCopyPhone}
				className="mobile-comm-btn bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)]"
				title="Скопировать номер телефона"
				data-testid="mobile-btn-copy-phone"
			>
				<Copy size={17} className="text-[var(--muted)]" />
				<span>Копия</span>
			</button>
		</div>
	);
}
