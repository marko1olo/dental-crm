import React from "react";
import { AlertCircle, Bot, Check, CheckCheck } from "lucide-react";
import type { MobileChatMessageItem } from "./types";

export interface MessageBubbleListProps {
	chatMessages: MobileChatMessageItem[];
	isCurrentMobileIntercepted: boolean;
	onTakeover: () => void;
	messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const MessageBubbleList: React.FC<MessageBubbleListProps> = ({
	chatMessages,
	isCurrentMobileIntercepted,
	onTakeover,
	messagesEndRef,
}) => {
	return (
		<div className="mobile-chat-messages-area" data-testid="mobile-chat-messages-area">
			{/* Баннер перехвата диалога, если диалог ещё у бота */}
			{!isCurrentMobileIntercepted && (
				<div
					className="mx-3 mt-2 mb-1 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-200"
					data-testid="mobile-chat-bot-banner"
				>
					<div className="flex items-center gap-1.5 min-w-0">
						<Bot size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
						<span className="truncate">Диалог ведёт Telegram / VK бот</span>
					</div>
					<button
						type="button"
						onClick={onTakeover}
						className="shrink-0 px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs cursor-pointer"
						data-testid="btn-mobile-banner-takeover"
					>
						Перехватить
					</button>
				</div>
			)}

			<div className="mobile-chat-date-separator">Сегодня</div>

			{chatMessages.map((msg) => {
				const isClinic = msg.direction === "outbound";
				const timeStr = new Date(msg.timestamp).toLocaleTimeString("ru-RU", {
					hour: "2-digit",
					minute: "2-digit",
				});

				return (
					<div
						key={msg.id}
						className={`flex flex-col ${isClinic ? "items-end" : "items-start"} max-w-full`}
					>
						<div
							className={`min-w-0 break-words max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
								isClinic
									? "bg-teal-700 text-white rounded-tr-xs border border-teal-600/30"
									: "bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] rounded-tl-xs border border-[var(--line,#e2e8f0)]"
							}`}
						>
							{/* Text */}
							<div className="whitespace-pre-wrap select-text">{msg.text}</div>

							{/* Time & Delivery Checkmarks */}
							<div
								className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-mono ${
									isClinic ? "text-teal-200/80" : "text-[var(--muted,#64748b)]"
								}`}
							>
								<span>{timeStr}</span>
								{isClinic && (
									<span className="inline-flex items-center">
										{msg.status === "read" ? (
											<CheckCheck size={13} className="text-cyan-300" />
										) : msg.status === "delivered" ? (
											<CheckCheck size={13} className="opacity-80" />
										) : msg.status === "failed" ? (
											<AlertCircle size={13} className="text-rose-300" />
										) : (
											<Check size={13} className="opacity-80" />
										)}
									</span>
								)}
							</div>
						</div>
					</div>
				);
			})}
			<div ref={messagesEndRef} />
		</div>
	);
};
