/**
 * SurgeryPostOpMemoSection.tsx — Секция памятки пациенту после хирургического вмешательства (DENTE CRM).
 * WhatsApp, Telegram и копирование рекомендаций врача (Мандаты 8e, 8x).
 */

import React from "react";
import { Copy, MessageSquare, Printer, Send, Share2 } from "lucide-react";

export interface SurgeryPostOpMemoSectionProps {
	readonly memoText: string;
	readonly toothFdi: number;
	readonly scenarioTitle: string;
	readonly onShareWhatsApp: () => void;
	readonly onShareTelegram: () => void;
	readonly onCopy: () => void;
	readonly onPrint?: () => void;
}

export const SurgeryPostOpMemoSection: React.FC<SurgeryPostOpMemoSectionProps> = ({
	memoText,
	toothFdi,
	scenarioTitle,
	onShareWhatsApp,
	onShareTelegram,
	onCopy,
	onPrint,
}) => {
	return (
		<div className="surgery-postop-memo-container min-h-0" data-testid="surgery-memo-content">
			<div className="surgery-postop-memo-header">
				<div className="flex items-center gap-2 min-w-0">
					<MessageSquare size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)] truncate">
						Памятка пациенту (#{toothFdi} · {scenarioTitle}):
					</span>
				</div>
				<div className="surgery-postop-memo-actions">
					{onPrint && (
						<button
							type="button"
							onClick={onPrint}
							className="surgery-memo-action-btn"
							data-testid="btn-print-memo"
							title="Распечатать памятку пациенту"
						>
							<Printer size={14} className="text-[var(--teal,#0d9488)]" /><span>Печать памятки</span>
						</button>
					)}
					<button
						type="button"
						onClick={onShareWhatsApp}
						className="surgery-memo-action-btn whatsapp"
						data-testid="btn-share-whatsapp-memo"
						title="Отправить памятку в WhatsApp"
					>
						<Share2 size={14} /><span>WhatsApp</span>
					</button>
					<button
						type="button"
						onClick={onShareTelegram}
						className="surgery-memo-action-btn telegram"
						data-testid="btn-share-telegram-memo"
						title="Отправить памятку в Telegram"
					>
						<Send size={14} /><span>Telegram</span>
					</button>
					<button
						type="button"
						onClick={onCopy}
						className="surgery-memo-action-btn"
						data-testid="btn-copy-memo"
						title="Скопировать текст памятки"
					>
						<Copy size={14} /><span>Скопировать</span>
					</button>
				</div>
			</div>
			<textarea
				readOnly
				value={memoText}
				className="surgery-postop-memo-text w-full h-72 sm:h-80 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-mono leading-relaxed resize-none focus:outline-none"
				data-testid="surgery-memo-textarea"
			/>
		</div>
	);
};
