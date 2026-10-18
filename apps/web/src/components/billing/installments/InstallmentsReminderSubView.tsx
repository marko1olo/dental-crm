/**
 * apps/web/src/components/billing/installments/InstallmentsReminderSubView.tsx
 *
 * Reminder preview and WhatsApp sender for PatientInstallmentsModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { MessageSquare, Copy, Send } from "lucide-react";
import { showToast } from "../../GlobalToast.js";

interface InstallmentsReminderSubViewProps {
	readonly reminderData: {
		readonly messageText: string;
		readonly dueDateRu: string;
		readonly amountFormatted: string;
		readonly whatsappUrl: string;
	};
	readonly onCancel: () => void;
}

export const InstallmentsReminderSubView: React.FC<InstallmentsReminderSubViewProps> = ({
	reminderData,
	onCancel,
}) => {
	const handleCopy = () => {
		navigator.clipboard.writeText(reminderData.messageText);
		showToast("Текст напоминания скопирован в буфер обмена", "success");
	};

	return (
		<div className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)]" data-testid="section-reminder-preview">
			<div className="flex items-center justify-between mb-2">
				<span className="font-bold text-xs uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
					<MessageSquare className="w-3.5 h-3.5 text-teal-600" />
					<span>Автоматическое напоминание пациенту</span>
				</span>
				<button type="button" onClick={onCancel} className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">
					Скрыть
				</button>
			</div>

			<div className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--line)] font-mono text-xs text-[var(--ink)] whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto mb-3">
				{reminderData.messageText}
			</div>

			<div className="flex items-center justify-between flex-wrap gap-2">
				<span className="text-[11px] text-[var(--muted)]">
					Срок платежа: <strong>{reminderData.dueDateRu}</strong> • К оплате: <strong>{reminderData.amountFormatted}</strong>
				</span>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleCopy}
						className="h-7 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
						data-testid="btn-copy-reminder"
					>
						<Copy className="w-3.5 h-3.5" />
						<span>Скопировать</span>
					</button>
					<a
						href={reminderData.whatsappUrl}
						target="_blank"
						rel="noreferrer"
						className="h-7 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer no-underline"
						data-testid="btn-open-whatsapp"
					>
						<Send className="w-3.5 h-3.5" />
						<span>Отправить в WhatsApp</span>
					</a>
				</div>
			</div>
		</div>
	);
};
