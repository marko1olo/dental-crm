import React from "react";
import { Copy, MessageCircle, Send, Printer } from "lucide-react";

interface PediatricParentMemoFooterProps {
	readonly onCopy: () => void;
	readonly onWhatsApp: () => void;
	readonly onTelegram: () => void;
	readonly onPrint: () => void;
}

export const PediatricParentMemoFooter: React.FC<PediatricParentMemoFooterProps> = ({
	onCopy,
	onWhatsApp,
	onTelegram,
	onPrint,
}) => {
	return (
		<div className="mt-4 pt-3 border-t border-[var(--line,#e2e8f0)] flex flex-wrap items-center justify-between gap-2">
			<button
				type="button"
				onClick={onCopy}
				className="min-h-[44px] sm:min-h-[36px] px-3.5 py-2 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
				data-testid="pediatric-memo-copy-btn"
			>
				<Copy className="h-4 w-4 shrink-0" />
				<span>Скопировать текст</span>
			</button>

			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={onWhatsApp}
					className="min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
					data-testid="pediatric-memo-whatsapp-btn"
				>
					<MessageCircle className="h-4 w-4 shrink-0" />
					<span>WhatsApp</span>
				</button>
				<button
					type="button"
					onClick={onTelegram}
					className="min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
					data-testid="pediatric-memo-telegram-btn"
				>
					<Send className="h-4 w-4 shrink-0" />
					<span>Telegram</span>
				</button>
				<button
					type="button"
					onClick={onPrint}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs active:scale-95"
					data-testid="pediatric-memo-print-btn"
				>
					<Printer className="h-4 w-4 shrink-0" />
					<span>Печать памятки</span>
				</button>
			</div>
		</div>
	);
};
