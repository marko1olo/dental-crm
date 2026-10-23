import React from "react";
import { Search } from "lucide-react";
import type { OmnichannelConversation } from "../types";
import { OmnichannelConversationItem } from "./OmnichannelConversationItem";

export interface OmnichannelConversationListProps {
	conversations: OmnichannelConversation[];
	activeConversationId: string | null;
	searchQuery: string;
	onSearchChange: (q: string) => void;
	onSelectConversation: (conv: OmnichannelConversation) => void;
	mobileViewMode: "list" | "chat";
	isLoading?: boolean | undefined;
}

export function OmnichannelConversationList({
	conversations,
	activeConversationId,
	searchQuery,
	onSearchChange,
	onSelectConversation,
	mobileViewMode,
	isLoading = false,
}: OmnichannelConversationListProps): React.JSX.Element {
	return (
		<section
			aria-label="Список диалогов с пациентами"
			className={`w-full sm:w-[320px] md:w-[360px] shrink-0 border-r border-[var(--line)] bg-[var(--paper)] flex flex-col ${
				mobileViewMode === "chat" ? "hidden sm:flex" : "flex"
			}`}
			data-testid="omnichannel-conversations-list"
		>
			<div className="p-2.5 border-b border-[var(--line)]">
				<div className="relative flex items-center">
					<Search size={14} className="absolute left-3 text-[var(--muted)] pointer-events-none" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Поиск по имени или телефону..."
						// Канонический класс системы поиска: padding-left 38px !important
						// (железный инвариант «лупа никогда не наезжает на текст»).
						className="dente-search-input w-full h-9 rounded-xl text-xs focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
						data-testid="conversations-search-input"
					/>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto divide-y divide-[var(--line-subtle,#e2e8f0)]">
				{isLoading ? (
					<div className="p-6 text-center text-xs text-[var(--muted)]">
						Загрузка диалогов из базы данных...
					</div>
				) : conversations.length === 0 ? (
					<div className="p-6 text-center text-xs text-[var(--muted)]">
						Диалогов пока нет — новые обращения появятся здесь автоматически
					</div>
				) : (
					conversations.map((c) => (
						<OmnichannelConversationItem
							key={c.id}
							conversation={c}
							isSelected={activeConversationId === c.id}
							onSelect={onSelectConversation}
						/>
					))
				)}
			</div>
		</section>
	);
}
