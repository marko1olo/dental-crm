/**
 * MarketingCampaignMessageCard.tsx — Message Content & Delivery Channel Parameters.
 * Clean, honest clinical card without fake chat simulation (Mandate 8ap, THE HAMMER).
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e & 8am (Consistent Design System).
 */

import React, { useState } from "react";
import { MessageSquare, Copy, Check, Info } from "lucide-react";
import type { MessageChannel } from "./marketingTypes";
import { showToast } from "../GlobalToast";

export interface MarketingCampaignMessageCardProps {
	readonly selectedChannel: MessageChannel;
	readonly onSelectChannel: (channel: MessageChannel) => void;
	readonly compiledText: string;
	readonly channelRateLabel: string;
}

export const MarketingCampaignMessageCard: React.FC<MarketingCampaignMessageCardProps> = ({
	selectedChannel,
	onSelectChannel,
	compiledText,
	channelRateLabel,
}) => {
	const [isCopied, setIsCopied] = useState(false);

	const handleCopyText = () => {
		navigator.clipboard?.writeText(compiledText);
		setIsCopied(true);
		showToast("Текст сообщения скопирован в буфер", "info");
		setTimeout(() => setIsCopied(false), 2000);
	};

	return (
		<div className="marketing-section" data-testid="marketing-preview-section">
			<div className="marketing-section-header">
				<div className="flex items-center gap-1.5">
					<MessageSquare size={16} className="text-[var(--primary)]" aria-hidden="true" />
					<h4 className="marketing-section-title">Текст и параметры сообщения</h4>
				</div>

				<div className="marketing-channel-tabs dente-segmented-bar h-8 rounded-lg" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={selectedChannel === "sms"}
						className={`marketing-channel-btn dente-segmented-item ${selectedChannel === "sms" ? "marketing-channel-btn--active active" : ""}`}
						onClick={() => onSelectChannel("sms")}
						data-testid="channel-sms-btn"
					>
						SMS
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={selectedChannel === "whatsapp"}
						className={`marketing-channel-btn dente-segmented-item ${selectedChannel === "whatsapp" ? "marketing-channel-btn--active active" : ""}`}
						onClick={() => onSelectChannel("whatsapp")}
						data-testid="channel-whatsapp-btn"
					>
						WhatsApp
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={selectedChannel === "telegram"}
						className={`marketing-channel-btn dente-segmented-item ${selectedChannel === "telegram" ? "marketing-channel-btn--active active" : ""}`}
						onClick={() => onSelectChannel("telegram")}
						data-testid="channel-telegram-btn"
					>
						Telegram
					</button>
				</div>
			</div>

			<div className="marketing-message-box p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
				<div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[var(--line-subtle)] text-xs text-[var(--muted)]">
					<div className="flex items-center gap-1.5 font-medium text-[var(--ink)]">
						<Info size={13} className="text-[var(--primary)]" aria-hidden="true" />
						<span>{channelRateLabel}</span>
					</div>
					<button
						type="button"
						onClick={handleCopyText}
						className="secondary-button text-xs py-1 px-2.5 min-h-[30px] rounded-lg"
						title="Скопировать текст сообщения"
						aria-label="Скопировать текст сообщения"
					>
						{isCopied ? <Check size={12} className="text-[var(--primary)]" /> : <Copy size={12} />}
						<span>{isCopied ? "Скопировано" : "Копировать"}</span>
					</button>
				</div>

				<p className="marketing-message-body m-0 text-sm leading-relaxed text-[var(--ink)] font-normal whitespace-pre-wrap select-text">
					{compiledText}
				</p>
			</div>

			<div className="marketing-vars-strip mt-3 flex items-center gap-2 flex-wrap text-xs">
				<span className="marketing-vars-label text-[var(--muted)] font-medium">Переменные:</span>
				<div className="marketing-vars-chips flex items-center gap-1.5 flex-wrap">
					{["{Имя}", "{Клиника}", "{Скидка}", "{Промокод}", "{Срок}", "{Ссылка}"].map((v) => (
						<span key={v} className="marketing-var-chip px-2 py-0.5 rounded-md bg-[var(--paper-strong)] border border-[var(--line)] font-mono text-[11px] text-[var(--muted)]">
							{v}
						</span>
					))}
				</div>
			</div>
		</div>
	);
};
