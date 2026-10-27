/**
 * OmnichannelChatHeader.tsx — Шапка активного диалога со сквозными клиническими переходами.
 * Строго <= 120 строк по Мандату 8b.
 */

import React from "react";
import { Calendar, ChevronLeft, FileText, QrCode, ShieldCheck, UserCheck } from "lucide-react";
import { formatRussianPhone } from "../../omnichannelEngine.js";
import type { OmnichannelChannelFilter, PatientOmnichannelContact } from "../types.js";

export interface OmnichannelChatHeaderProps {
	readonly selectedContact: PatientOmnichannelContact;
	readonly channelFilter: OmnichannelChannelFilter;
	readonly setChannelFilter: (c: OmnichannelChannelFilter) => void;
	readonly isIntercepted: boolean;
	readonly onTakeoverChat: () => void;
	readonly onOpenSbpModal: () => void;
	readonly onOpenBooking: () => void;
	readonly onBackToContacts: () => void;
}

export const OmnichannelChatHeader: React.FC<OmnichannelChatHeaderProps> = ({
	selectedContact,
	channelFilter,
	setChannelFilter,
	isIntercepted,
	onTakeoverChat,
	onOpenSbpModal,
	onOpenBooking,
	onBackToContacts,
}) => {
	const handleOpenPatientCard = () => {
		if (typeof window !== "undefined" && selectedContact.id) {
			window.dispatchEvent(
				new CustomEvent("dente-open-patient-card-modal", { detail: { patientId: selectedContact.id } }),
			);
		}
	};

	return (
		<div className="hub-chat-header">
			<div className="hub-chat-patient-meta">
				<button
					type="button"
					className="hub-btn-back-contacts cursor-pointer"
					onClick={onBackToContacts}
					aria-label="Назад к списку диалогов"
				>
					<ChevronLeft size={16} /> <span>Диалоги</span>
				</button>
				<div
					className="hub-chat-avatar-large"
					style={{ backgroundColor: selectedContact.avatarColor || "var(--teal, #0d9488)" }}
				>
					{selectedContact.fullName.charAt(0)}
				</div>
				<div>
					<div className="hub-chat-patient-title-row">
						<h3 className="hub-chat-patient-name">{selectedContact.fullName}</h3>
						<span className="hub-phone-chip">{formatRussianPhone(selectedContact.phone)}</span>
					</div>
				</div>
			</div>

			<div className="hub-chat-header-actions">
				<div className="dente-segmented-bar">
					{(["all", "whatsapp", "telegram", "sms"] as const).map((ch) => (
						<button
							key={ch}
							type="button"
							className={`dente-segmented-item cursor-pointer ${channelFilter === ch ? "active" : ""}`}
							onClick={() => setChannelFilter(ch)}
						>
							{ch === "all" ? "Все" : ch === "whatsapp" ? "WA" : ch === "telegram" ? "TG" : "SMS"}
						</button>
					))}
				</div>

				{!isIntercepted ? (
					<button
						type="button"
						className="hub-btn-takeover min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
						onClick={onTakeoverChat}
						data-testid="btn-takeover-chat"
					>
						<UserCheck size={15} /> <span>Перехватить</span>
					</button>
				) : (
					<span className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 inline-flex items-center gap-1.5">
						<ShieldCheck size={15} /> <span>Оператор</span>
					</span>
				)}

				<button
					type="button"
					className="hub-btn-sbp-invoice min-h-[44px] cursor-pointer"
					onClick={handleOpenPatientCard}
					title="Открыть медицинскую карту пациента"
				>
					<FileText size={15} /> Карта
				</button>

				<button
					type="button"
					className="hub-btn-sbp-invoice min-h-[44px] cursor-pointer"
					onClick={onOpenSbpModal}
					title="Сформировать динамический QR-код СБП"
				>
					<QrCode size={15} /> Выставить счет СБП
				</button>

				<button
					type="button"
					className="hub-btn-quick-booking min-h-[44px] cursor-pointer"
					onClick={onOpenBooking}
					data-testid="btn-quick-booking"
				>
					<Calendar size={15} /> Записать на приём
				</button>
			</div>
		</div>
	);
};
