/**
 * OmnichannelMessageBubble.tsx — Компонент отдельного баббла сообщения.
 * Строго <= 120 строк по Мандату 8b.
 */

import React from "react";
import { Check, CheckCheck, Clock, FileText } from "lucide-react";
import type { InteractiveButtonPayload, OmnichannelMessage } from "../types.js";

export interface OmnichannelMessageBubbleProps {
	readonly msg: OmnichannelMessage;
	readonly onInteractiveButtonClick: (btn: InteractiveButtonPayload, originalMsg: OmnichannelMessage) => void;
}

export const OmnichannelMessageBubble: React.FC<OmnichannelMessageBubbleProps> = ({
	msg,
	onInteractiveButtonClick,
}) => {
	const isOutbound = msg.direction === "outbound";

	return (
		<div className={`hub-message-bubble-wrapper ${isOutbound ? "outbound" : "inbound"}`}>
			<div className={`hub-message-bubble ${msg.channel}`}>
				<div className="hub-msg-meta-row">
					<span className="hub-msg-sender">{msg.senderName}</span>
					<span className={`hub-msg-channel-tag ${msg.channel}`}>{msg.channel.toUpperCase()}</span>
				</div>

				<div className="hub-msg-body-text">
					{msg.body.split("\n").map((line, idx) => (
						<React.Fragment key={idx}>
							{line}
							{idx < msg.body.split("\n").length - 1 && <br />}
						</React.Fragment>
					))}
				</div>

				{msg.interactivePayload?.buttons && (
					<div className="hub-msg-interactive-buttons">
						{msg.interactivePayload.buttons.map((btn) => (
							<button
								key={btn.id}
								type="button"
								className={`hub-msg-interactive-btn cursor-pointer ${btn.variant || "secondary"}`}
								onClick={() => onInteractiveButtonClick(btn, msg)}
							>
								{btn.title}
							</button>
						))}
					</div>
				)}

				{msg.attachments && msg.attachments.length > 0 && (
					<div className="hub-msg-attachments">
						{msg.attachments.map((att) => (
							<div key={att.id} className="hub-msg-attachment-item">
								<FileText size={16} />
								<span className="att-name">{att.name}</span>
								{att.sizeFormatted && <span className="att-size">{att.sizeFormatted}</span>}
							</div>
						))}
					</div>
				)}

				<div className="hub-msg-footer">
					<span className="hub-msg-time">
						{new Date(msg.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
					</span>
					{isOutbound && (
						<span className="hub-msg-status" title={`Статус: ${msg.status}`}>
							{msg.status === "read" && <CheckCheck size={14} className="text-teal" />}
							{msg.status === "delivered" && <CheckCheck size={14} className="text-muted" />}
							{msg.status === "sent" && <Check size={14} className="text-muted" />}
							{msg.status === "sending" && <Clock size={14} className="text-muted" />}
						</span>
					)}
				</div>
			</div>
		</div>
	);
};
