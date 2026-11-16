import { AlertCircle, Check, CheckCheck } from "lucide-react";
import type { ChatMessage } from "./WhatsAppChatPanel";

export interface WhatsAppMessageBubbleProps {
	msg: ChatMessage;
}

/**
 * Message bubble with upgraded typography, responsive layout for 390px mobile viewports (min-w-0 break-words),
 * and status indicators (sent, delivered, read, failed).
 */
export function WhatsAppMessageBubble({ msg }: WhatsAppMessageBubbleProps) {
	const isClinic = msg.sender === "clinic";
	const timeStr = new Date(msg.timestamp).toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<div
			key={msg.id}
			className={`flex flex-col ${isClinic ? "items-end" : "items-start"} max-w-full`}
		>
			{/* Bubble Container: min-w-0 break-words to protect 390px mobile viewports */}
			<div
				className={`min-w-0 break-words max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm text-xs sm:text-sm font-normal leading-relaxed ${
					isClinic
						? "bg-[var(--teal,#0d9488)] text-white rounded-tr-sm border border-[var(--teal-dark,#0f766e)]"
						: "bg-[var(--paper-soft)] text-[var(--ink)] rounded-tl-sm border border-[var(--line)]"
				}`}
			>
				{/* Sender name on incoming message */}
				{!isClinic && msg.senderName && (
					<div className="font-bold text-[10px] uppercase tracking-wider text-[var(--teal)] mb-1">
						{msg.senderName}
					</div>
				)}

				{/* Message Body Text */}
				<div className="whitespace-pre-wrap select-text">{msg.text}</div>

				{/* Timestamp & Status Icon */}
				<div
					className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-mono ${
						isClinic ? "text-teal-100" : "text-[var(--muted)]"
					}`}
				>
					<span>{timeStr}</span>
					{isClinic && (
						<span
							className="inline-flex items-center"
							title={
								msg.status === "read"
									? "Прочитано"
									: msg.status === "delivered"
										? "Доставлено"
										: msg.status === "failed"
											? "Ошибка доставки"
											: "Отправлено"
							}
						>
							{msg.status === "read" ? (
								<CheckCheck size={13} className="text-cyan-300" />
							) : msg.status === "delivered" ? (
								<CheckCheck size={13} className="opacity-70" />
							) : msg.status === "failed" ? (
								<AlertCircle size={13} className="text-[var(--danger,#ef4444)]" />
							) : (
								<Check size={13} className="opacity-70" />
							)}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
