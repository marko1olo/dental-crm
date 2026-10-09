import React from "react";
import { MessageSquare, Search, X } from "lucide-react";
import { formatPatientInitials, getAvatarColor } from "../../../store/telephonyStore";
import { formatLastMessageTime, renderChannelIcon } from "./utils";
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
	isSearchOpen,
	searchQuery,
	setSearchQuery,
	channelFilter,
	setChannelFilter,
	filteredDialogs,
	onSelectDialog,
}) => {
	return (
		<>
			{/* Search Bar when toggled */}
			{isSearchOpen && (
				<div className="mobile-search-bar animate-in fade-in">
					<div className="mobile-search-input-wrap">
						<Search size={16} className="text-[var(--muted)]" />
						<input
							type="text"
							className="mobile-search-input"
							placeholder="Поиск по пациенту, телефону или тексту..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							autoFocus
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="p-1 text-[var(--muted)] hover:text-[var(--ink)]"
							>
								<X size={14} />
							</button>
						)}
					</div>
				</div>
			)}

			{/* Channels Filter Strip (WhatsApp / Telegram / SMS) */}
			<div className="mobile-channels-filter-strip" role="toolbar" aria-label="Фильтр каналов">
				<button
					type="button"
					className={`mobile-filter-chip ${channelFilter === "all" ? "active" : ""}`}
					onClick={() => setChannelFilter("all")}
				>
					Все каналы
				</button>
				<button
					type="button"
					className={`mobile-filter-chip ${channelFilter === "whatsapp" ? "active" : ""}`}
					onClick={() => setChannelFilter("whatsapp")}
				>
					<span>WhatsApp</span>
				</button>
				<button
					type="button"
					className={`mobile-filter-chip ${channelFilter === "telegram" ? "active" : ""}`}
					onClick={() => setChannelFilter("telegram")}
				>
					<span>Telegram</span>
				</button>
				<button
					type="button"
					className={`mobile-filter-chip ${channelFilter === "sms" ? "active" : ""}`}
					onClick={() => setChannelFilter("sms")}
				>
					<span>SMS</span>
				</button>
			</div>

			{/* Dialogs Grouped Inset List */}
			<main className="mobile-dialogs-container">
				{filteredDialogs.length > 0 ? (
					<div className="mobile-dialogs-card">
						{filteredDialogs.map((dialog) => {
							const initials = formatPatientInitials(dialog.patientName);
							const avatarColor = getAvatarColor(dialog.patientName);

							return (
								<div
									key={dialog.patientId}
									className="mobile-dialog-row"
									onClick={() => onSelectDialog(dialog)}
									role="button"
									tabIndex={0}
									data-testid={`dialog-row-${dialog.patientId}`}
								>
									{/* Avatar with Channel Badge */}
									<div
										className="mobile-avatar-wrap"
										style={{ background: avatarColor.bg }}
									>
										<span>{initials}</span>
										{renderChannelIcon(dialog.channel)}
									</div>

									{/* Message & Patient Details */}
									<div className="mobile-dialog-content">
										<div className="mobile-dialog-top-line">
											<span className="mobile-dialog-patient-name">
												{dialog.patientName}
											</span>
											<span className="mobile-dialog-time">
												{formatLastMessageTime(dialog.lastMessageAt)}
											</span>
										</div>

										<div className="mobile-dialog-bottom-line">
											<span className="mobile-dialog-preview">
												{dialog.direction === "outbound" && (
													<span className="text-teal-600 font-semibold mr-1">
														Вы:
													</span>
												)}
												{dialog.lastMessage}
											</span>

											{dialog.unreadCount > 0 && (
												<span className="mobile-dialog-unread-badge">
													{dialog.unreadCount}
												</span>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="p-8 text-center text-[var(--muted)] bg-[var(--paper)] rounded-2xl border border-[var(--line)] my-4">
						<MessageSquare size={36} className="mx-auto mb-2 text-teal-600/60" />
						<div className="font-semibold text-[var(--ink)]">Нет диалогов по фильтру</div>
						<div className="text-xs mt-1">
							{searchQuery
								? "Попробуйте изменить поисковый запрос"
								: "Сообщения от пациентов в WhatsApp, Telegram и SMS появятся здесь автоматически"}
						</div>
					</div>
				)}
			</main>
		</>
	);
};
