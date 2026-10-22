import React from "react";
import { MessageSquare, Search, X } from "lucide-react";
import { DialogItemRow } from "./DialogItemRow";
import type { ChannelFilter, MobilePatientDialogSummary } from "./types";

export interface DialogsFeedViewProps {
	isSearchOpen: boolean;
	searchQuery: string;
	setSearchQuery: (val: string) => void;
	channelFilter: ChannelFilter;
	setChannelFilter: (filter: ChannelFilter) => void;
	filteredDialogs: MobilePatientDialogSummary[];
	onSelectDialog: (dialog: MobilePatientDialogSummary) => void;
}

export const DialogsFeedView: React.FC<DialogsFeedViewProps> = ({
	isSearchOpen, searchQuery, setSearchQuery, channelFilter,
	setChannelFilter, filteredDialogs, onSelectDialog,
}) => {
	return (
		<>
			{isSearchOpen && (
				<div className="mobile-search-bar animate-in fade-in">
					<div className="mobile-search-input-wrap">
						<Search size={16} className="text-[var(--muted)]" />
						<input
							type="text" className="mobile-search-input"
							placeholder="Поиск по пациенту, телефону или тексту..."
							value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus
						/>
						{searchQuery && (
							<button type="button" onClick={() => setSearchQuery("")} className="p-1 text-[var(--muted)] hover:text-[var(--ink)]">
								<X size={14} />
							</button>
						)}
					</div>
				</div>
			)}

			<div className="mobile-channels-filter-strip" role="toolbar" aria-label="Фильтр каналов">
				<button type="button" className={`mobile-filter-chip ${channelFilter === "all" ? "active" : ""}`} onClick={() => setChannelFilter("all")}>
					Все каналы
				</button>
				{(["whatsapp", "telegram", "sms"] as const).map((ch) => (
					<button
						key={ch} type="button" className={`mobile-filter-chip ${channelFilter === ch ? "active" : ""}`}
						onClick={() => setChannelFilter(ch)}
					>
						<span>{ch === "whatsapp" ? "WhatsApp" : ch === "telegram" ? "Telegram" : "SMS"}</span>
					</button>
				))}
			</div>

			<main className="mobile-dialogs-container">
				{filteredDialogs.length > 0 ? (
					<div className="mobile-dialogs-card">
						{filteredDialogs.map((dialog) => (
							<DialogItemRow key={dialog.patientId} dialog={dialog} onSelectDialog={onSelectDialog} />
						))}
					</div>
				) : (
					<div className="p-8 text-center text-[var(--muted)] bg-[var(--paper)] rounded-2xl border border-[var(--line)] my-4">
						<MessageSquare size={36} className="mx-auto mb-2 text-teal-600/60" />
						<div className="font-semibold text-[var(--ink)]">Нет диалогов по фильтру</div>
						<div className="text-xs mt-1">
							{searchQuery ? "Попробуйте изменить поисковый запрос" : "Сообщения от пациентов в WhatsApp, Telegram и SMS появятся здесь автоматически"}
						</div>
					</div>
				)}
			</main>
		</>
	);
};
