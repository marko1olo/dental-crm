/**
 * OmnichannelMessageFeed.tsx — Лента сообщений диалога с автоскроллом.
 * Строго <= 120 строк по Мандату 8b.
 */

import React, { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { OmnichannelMessageBubble } from "./OmnichannelMessageBubble.js";
import type { InteractiveButtonPayload, OmnichannelMessage } from "../types.js";

export interface OmnichannelMessageFeedProps {
	readonly messages: readonly OmnichannelMessage[];
	readonly onInteractiveButtonClick: (btn: InteractiveButtonPayload, originalMsg: OmnichannelMessage) => void;
}

export const OmnichannelMessageFeed: React.FC<OmnichannelMessageFeedProps> = ({
	messages,
	onInteractiveButtonClick,
}) => {
	const messagesEndRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	return (
		<div className="hub-messages-feed">
			{messages.length === 0 ? (
				<div className="hub-empty-feed">
					<MessageSquare size={36} className="text-muted" />
					<p>Нет сообщений в выбранном канале.</p>
				</div>
			) : (
				messages.map((msg) => (
					<OmnichannelMessageBubble
						key={msg.id}
						msg={msg}
						onInteractiveButtonClick={onInteractiveButtonClick}
					/>
				))
			)}
			<div ref={messagesEndRef} />
		</div>
	);
};
