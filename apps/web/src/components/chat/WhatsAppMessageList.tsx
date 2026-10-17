import type React from "react";
import { RefreshCw, Search } from "lucide-react";
import type { ChatMessage } from "./WhatsAppChatPanel";
import type { QuickTemplateItem } from "./whatsAppChatTemplates";
import { WhatsAppEmptyStatePresets } from "./WhatsAppEmptyStatePresets";
import { WhatsAppMessageBubble } from "./WhatsAppMessageBubble";

export interface WhatsAppMessageListProps {
	messages: ChatMessage[];
	isLoading: boolean;
	searchQuery: string;
	effectiveName: string;
	quickTemplates: QuickTemplateItem[];
	onApplyTemplate: (tmpl?: QuickTemplateItem) => void;
	onClearSearch: () => void;
	messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * WhatsApp Message Stream and Scroll Container.
 * Supports loading spinner, search query filtering empty states, and empty state presets.
 */
export function WhatsAppMessageList({
	messages,
	isLoading,
	searchQuery,
	effectiveName,
	quickTemplates,
	onApplyTemplate,
	onClearSearch,
	messagesEndRef,
}: WhatsAppMessageListProps) {
	return (
		<div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[var(--paper-soft,rgba(15,23,42,0.4))] flex flex-col">
			{messages.length === 0 ? (
				isLoading ? (
					<div className="my-auto py-16 text-center text-xs text-[var(--muted,#94a3b8)] flex flex-col items-center justify-center gap-2">
						<RefreshCw size={22} className="animate-spin text-teal-600 dark:text-teal-400" />
						<span>Загрузка переписки...</span>
					</div>
				) : searchQuery ? (
					<div className="my-auto py-16 text-center text-xs text-[var(--muted,#94a3b8)] flex flex-col items-center justify-center gap-2">
						<Search size={22} className="opacity-40" />
						<span>По запросу «{searchQuery}» сообщений не найдено</span>
						<button
							type="button"
							onClick={onClearSearch}
							className="min-h-[44px] px-3 py-1.5 text-xs text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center justify-center"
						>
							Сбросить поиск
						</button>
					</div>
				) : (
					<WhatsAppEmptyStatePresets
						effectiveName={effectiveName}
						quickTemplates={quickTemplates}
						onApplyTemplate={onApplyTemplate}
					/>
				)
			) : (
				messages.map((msg) => (
					<WhatsAppMessageBubble key={msg.id} msg={msg} />
				))
			)}
			<div ref={messagesEndRef} />
		</div>
	);
}
