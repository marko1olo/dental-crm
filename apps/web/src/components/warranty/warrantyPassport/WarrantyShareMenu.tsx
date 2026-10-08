/**
 * ============================================================================
 * WARRANTY PASSPORT STUDIO — LAYER 2: SHARE & MESSENGER POPOVER
 * Кнопка и поповер отправки гарантийной памятки в WhatsApp / Telegram
 * ============================================================================
 */

import { Check, Copy, MessageSquare, Send, Share2 } from "lucide-react";
import type React from "react";

export interface WarrantyShareMenuProps {
	isOpen: boolean;
	phone?: string | null | undefined;
	copiedMemo: boolean;
	copiedLink: boolean;
	onToggle: () => void;
	onShareWhatsApp: () => void;
	onShareTelegram: () => void;
	onCopyMemo: () => void;
	onCopyLink: () => void;
}

export const WarrantyShareMenu: React.FC<WarrantyShareMenuProps> = ({
	isOpen,
	phone,
	copiedMemo,
	copiedLink,
	onToggle,
	onShareWhatsApp,
	onShareTelegram,
	onCopyMemo,
	onCopyLink,
}) => {
	return (
		<div className="warranty-share-dropdown-wrap">
			<button
				type="button"
				className="warranty-btn-secondary"
				onClick={onToggle}
				title="Отправить памятку пациенту в WhatsApp или Telegram"
			>
				<MessageSquare size={16} /> <span>Памятка в WhatsApp / TG</span>
			</button>
			{isOpen && (
				<div className="warranty-share-popover">
					<button
						type="button"
						className="warranty-share-close-btn"
						onClick={onToggle}
						aria-label="Закрыть"
						style={{ display: "none" }}
					/>
					<button type="button" className="warranty-share-menu-item" onClick={onShareWhatsApp}>
						<Send size={14} style={{ color: "var(--teal)" }} />
						<div className="min-w-0">
							<strong>Отправить в WhatsApp</strong>
							<span className="sub truncate">{phone || "Без номера (выбор чата)"}</span>
						</div>
					</button>
					<button type="button" className="warranty-share-menu-item" onClick={onShareTelegram}>
						<Share2 size={14} style={{ color: "var(--teal)" }} />
						<div className="min-w-0">
							<strong>Поделиться в Telegram</strong>
							<span className="sub truncate">В личный чат пациента</span>
						</div>
					</button>
					<button type="button" className="warranty-share-menu-item" onClick={onCopyMemo}>
						{copiedMemo ? <Check size={14} style={{ color: "var(--ok-fg)" }} /> : <Copy size={14} />}
						<div className="min-w-0">
							<strong>{copiedMemo ? "Текст скопирован!" : "Скопировать памятку"}</strong>
							<span className="sub truncate">Для любого мессенджера</span>
						</div>
					</button>
					<button type="button" className="warranty-share-menu-item" onClick={onCopyLink}>
						{copiedLink ? <Check size={14} style={{ color: "var(--ok-fg)" }} /> : <Copy size={14} />}
						<div className="min-w-0">
							<strong>{copiedLink ? "Ссылка скопирована!" : "Скопировать онлайн-ссылку"}</strong>
							<span className="sub truncate">Портал проверки гарантии</span>
						</div>
					</button>
				</div>
			)}
		</div>
	);
};
