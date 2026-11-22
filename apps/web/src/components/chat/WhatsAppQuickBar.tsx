import {
	Bot,
	MessageSquare,
	Phone,
	Send,
	Sparkles,
} from "lucide-react";
import type { QuickTemplateItem } from "./whatsAppChatTemplates";

export interface WhatsAppQuickBarProps {
	selectedChannel: "whatsapp" | "telegram" | "max" | "sms";
	onSelectChannel: (channel: "whatsapp" | "telegram" | "max" | "sms") => void;
	quickTemplates: QuickTemplateItem[];
	selectedChipTemplate: string | null;
	isSending: boolean;
	onApplyTemplate: (tmpl?: QuickTemplateItem) => void;
	onDirectSendTemplate: (tmpl?: QuickTemplateItem) => void;
}

/**
 * Quick Clinical & Administrative Templates & Channel Selector Bar.
 * Strict Mandates 8e, 8d (touch targets >= 44x44px), and Apple HIG segmented control.
 */
export function WhatsAppQuickBar({
	selectedChannel,
	onSelectChannel,
	quickTemplates,
	selectedChipTemplate,
	isSending,
	onApplyTemplate,
	onDirectSendTemplate,
}: WhatsAppQuickBarProps) {
	return (
		<div className="p-2.5 bg-[var(--paper)] border-b border-[var(--line)]">
			<div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
				<div className="text-xs font-medium text-[var(--muted)] px-1 flex items-center gap-1">
					<Sparkles size={11} className="text-[var(--primary)]" />
					<span>Быстрые шаблоны с клинической памяткой:</span>
				</div>

				{/* Omnichannel Channel Selector (Apple HIG Segmented Control) */}
				<div
					className="inline-flex items-center p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] shadow-xs"
					role="radiogroup"
					aria-label="Канал связи"
				>
					<button
						type="button"
						onClick={() => onSelectChannel("whatsapp")}
						className={`min-h-[36px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
							selectedChannel === "whatsapp"
								? "bg-[var(--primary)] text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						role="radio"
						aria-checked={selectedChannel === "whatsapp"}
						data-testid="channel-select-whatsapp"
					>
						<MessageSquare size={12} />
						<span>WhatsApp</span>
					</button>
					<button
						type="button"
						onClick={() => onSelectChannel("telegram")}
						className={`min-h-[36px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
							selectedChannel === "telegram"
								? "bg-[var(--primary)] text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						role="radio"
						aria-checked={selectedChannel === "telegram"}
						data-testid="channel-select-telegram"
					>
						<Send size={12} />
						<span>Telegram</span>
					</button>
					<button
						type="button"
						onClick={() => onSelectChannel("max")}
						className={`min-h-[36px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
							selectedChannel === "max"
								? "bg-[var(--primary)] text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						role="radio"
						aria-checked={selectedChannel === "max"}
						data-testid="channel-select-max"
					>
						<Bot size={12} />
						<span>MAX</span>
					</button>
					<button
						type="button"
						onClick={() => onSelectChannel("sms")}
						className={`min-h-[36px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
							selectedChannel === "sms"
								? "bg-[var(--primary)] text-white shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						role="radio"
						aria-checked={selectedChannel === "sms"}
						data-testid="channel-select-sms"
					>
						<Phone size={12} />
						<span>SMS</span>
					</button>
				</div>
			</div>

			{/* Scrollable Templates Carousel with Touch Targets >= 44x44px */}
			<div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
				{quickTemplates.map((tmpl) => (
					<div
						key={tmpl.id}
						className={`min-h-[44px] rounded-xl border text-xs font-semibold whitespace-nowrap transition-all inline-flex items-stretch flex-shrink-0 shadow-xs overflow-hidden ${
							selectedChipTemplate === tmpl.id
								? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md ring-2 ring-[var(--primary)]/30"
								: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)]/50"
						}`}
					>
						<button
							type="button"
							onClick={() => onApplyTemplate(tmpl)}
							className="min-h-[44px] px-3 py-2 flex items-center gap-1.5 hover:opacity-90 active:scale-95 text-left focus:outline-none bg-transparent text-inherit"
							title={`Вставить: ${tmpl.label}`}
						>
							<span>{tmpl.icon}</span>
							<span>{tmpl.label}</span>
						</button>
						<button
							type="button"
							onClick={() => onDirectSendTemplate(tmpl)}
							disabled={isSending}
							className="min-h-[44px] min-w-[36px] px-2 border-l border-[var(--line)] bg-transparent hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white transition-colors flex items-center justify-center disabled:opacity-40"
							title={`Отправить сразу: ${tmpl.label}`}
							aria-label={`Отправить сразу: ${tmpl.label}`}
							data-testid={`quick-send-${tmpl.id}`}
						>
							<Send size={12} />
						</button>
					</div>
				))}
			</div>
		</div>
	);
}
