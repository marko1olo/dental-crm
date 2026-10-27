/**
 * OmnichannelContactsSidebar.tsx — Боковая панель поиска и списка контактов пациентов.
 * Строго <= 120 строк по Мандату 8b.
 */

import React from "react";
import { Search, X } from "lucide-react";
import type { PatientOmnichannelContact } from "../types.js";

export interface OmnichannelContactsSidebarProps {
	readonly contacts: readonly PatientOmnichannelContact[];
	readonly selectedPatientId: string;
	readonly onSelectContact: (id: string) => void;
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly isVisibleMobile: boolean;
}

export const OmnichannelContactsSidebar: React.FC<OmnichannelContactsSidebarProps> = ({
	contacts,
	selectedPatientId,
	onSelectContact,
	searchQuery,
	onSearchChange,
	isVisibleMobile,
}) => {
	return (
		<aside className={`hub-contacts-sidebar ${isVisibleMobile ? "mobile-visible" : "mobile-hidden"}`}>
			<div className="hub-contacts-search">
				<div className="dente-search-wrap w-full">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						className="dente-search-input w-full"
						placeholder="Поиск пациента / телефона..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => onSearchChange("")}
							className="dente-search-clear cursor-pointer"
							aria-label="Очистить поиск"
						>
							<X size={13} />
						</button>
					)}
				</div>
			</div>

			<div className="hub-contacts-list" role="list">
				{contacts.length === 0 ? (
					<div className="p-4 text-center text-xs text-muted">Контакты не найдены</div>
				) : (
					contacts.map((contact) => {
						const isSelected = contact.id === selectedPatientId;
						return (
							<button
								key={contact.id}
								type="button"
								className={`hub-contact-card cursor-pointer ${isSelected ? "selected" : ""}`}
								onClick={() => onSelectContact(contact.id)}
							>
								<div
									className="hub-contact-avatar"
									style={{ backgroundColor: contact.avatarColor || "var(--teal, #0d9488)" }}
								>
									{contact.fullName.charAt(0)}
								</div>

								<div className="hub-contact-info">
									<div className="hub-contact-row-top">
										<span className="hub-contact-name">{contact.fullName}</span>
										<span className={`hub-channel-icon-pill ${contact.preferredChannel}`}>
											{contact.preferredChannel === "whatsapp" && "WA"}
											{contact.preferredChannel === "telegram" && "TG"}
											{contact.preferredChannel === "sms" && "SMS"}
										</span>
									</div>
									<p className="hub-contact-snippet">{contact.lastMessageSnippet || "Нет сообщений"}</p>
								</div>

								{contact.unreadCount > 0 && <span className="hub-unread-pill">{contact.unreadCount}</span>}
							</button>
						);
					})
				)}
			</div>
		</aside>
	);
};
