import {
	MessageSquare,
	Phone,
	Send,
	Sparkles,
} from "lucide-react";
import type { QuickTemplateItem } from "./whatsAppChatTemplates";

export interface WhatsAppQuickBarProps {
	selectedChannel: "whatsapp" | "telegram" | "sms";
	onSelectChannel: (channel: "whatsapp" | "telegram" | "sms") => void;
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
		<div className="p-2.5 bg-[var(--paper,#0f172a)] border-b border-[var(--line,#334155)]">
			<div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
				<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#94a3b8)] px-1 flex items-center gap-1">
					<Sparkles size={11} className="text-teal-600 dark:text-teal-400" />
					<span>Быстрые шаблоны с клинической памяткой:</span>
				</div>

				{/* Omnichannel Channel Selector (Apple HIG Segmented Control) */}
				<div
					className="inline-flex items-center p-0.5 rounded-xl bg-[var(--paper-soft,rgba(30,41,59,0.7))] border border-[var(--line,#334155)] shadow-xs"
					role="radiogroup"
					aria-label="Канал связи"
				>
					<button
						type="button"
						onClick={() => onSelectChannel("whatsapp")}
						className={`min-h-[36px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
							selectedChannel === "whatsapp"
								? "bg-emerald-600 text-white shadow-xs"
								: "text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)]"
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
								? "bg-sky-600 text-white shadow-xs"
								: "text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)]"
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
						onClick={() => onSelectChannel("sms")}
						className={`min-h-[36px] sm:min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
							selectedChannel === "sms"
								? "bg-violet-600 text-white shadow-xs"
								: "text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)]"
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
								? "bg-teal-600 text-white border-teal-400 shadow-md ring-2 ring-teal-400/30"
								: "bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#f8fafc)] border-[var(--line,#334155)] hover:border-teal-500/50"
						}`}
					>
						<button
							type="button"
							onClick={() => onApplyTemplate(tmpl)}
							className="min-h-[44px] px-3 py-2 flex items-center gap-1.5 hover:opacity-90 active:scale-95 text-left focus:outline-none"
							title={`Вставить: ${tmpl.label}`}
						>
							<span>{tmpl.icon}</span>
							<span>{tmpl.label}</span>
						</button>
						<button
							type="button"
							onClick={() => onDirectSendTemplate(tmpl)}
							disabled={isSending}
							className="min-h-[44px] min-w-[36px] px-2 border-l border-[var(--line,#334155)] hover:bg-teal-700/60 dark:hover:bg-teal-500/30 text-teal-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-40"
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
