import React from "react";
import { Check, CheckCheck } from "lucide-react";
import type { OmnichannelMessage } from "../types";

export interface OmnichannelMessageBubbleProps {
	message: OmnichannelMessage;
}

export function OmnichannelMessageBubble({ message: msg }: OmnichannelMessageBubbleProps): React.JSX.Element {
	// Ассистент клиники (bot) говорит на стороне клиники: его ответы — исходящие.
	const isOutbound = msg.senderRole === "operator" || msg.senderRole === "doctor" || msg.senderRole === "bot";

	const formattedTime = React.useMemo(() => {
		try {
			return new Date(msg.timestamp).toLocaleTimeString("ru-RU", {
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return "";
		}
	}, [msg.timestamp]);

	return (
		<div
			className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
			data-testid={`chat-bubble-${msg.id}`}
		>
			<div
				className={`max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl text-xs box-border ${
					isOutbound
						? "bg-[var(--teal,#0d9488)] text-white rounded-tr-xs shadow-xs"
						: "bg-[var(--paper-card)] text-[var(--ink)] rounded-tl-xs border border-[var(--line)] shadow-xs"
				}`}
			>
				<div className="flex items-center justify-between gap-3 text-[10px] mb-1 opacity-80">
					<span className="font-bold">{msg.senderName}</span>
					<span className="font-mono">{formattedTime}</span>
				</div>

				<p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

				{isOutbound && (
					<div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75">
						{msg.status === "read" ? (
							<CheckCheck size={12} className="text-white" />
						) : (
							<Check size={12} className="text-white" />
						)}
					</div>
				)}
			</div>
		</div>
	);
}
