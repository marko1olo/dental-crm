import React from "react";
import { CheckCheck, Paperclip } from "lucide-react";
import type { ChatMessage } from "./InboxTypes";
import { formatTime } from "./InboxUtils";

export function InboxChatArea({
	messagesWithDateSeparators,
	messagesEndRef,
}: {
	messagesWithDateSeparators: Array<
		| { type: "date"; label: string }
		| { type: "message"; msg: ChatMessage }
	>;
	messagesEndRef: React.RefObject<any>;
}) {
	return (
		<div
			style={{
				flex: 1,
				overflowY: "auto",
				padding: "20px 12% 16px",
				display: "flex",
				flexDirection: "column",
				gap: 8,
			}}
		>
			{messagesWithDateSeparators.map((item, i) => {
				if (item.type === "date") {
					return (
						<div
							key={`date-${i}`}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 12,
								margin: "8px 0",
							}}
						>
							<div style={{ flex: 1, height: 1, background: "var(--line)" }} />
							<span
								style={{
									fontSize: 11,
									color: "var(--muted)",
									fontWeight: 600,
									whiteSpace: "nowrap",
								}}
							>
								{item.label}
							</span>
							<div style={{ flex: 1, height: 1, background: "var(--line)" }} />
						</div>
					);
				}

				const msg = item.msg;
				const isOutbound = msg.direction === "outbound";
				return (
					<div
						key={msg.id}
						style={{
							alignSelf: isOutbound ? "flex-end" : "flex-start",
							maxWidth: "72%",
							background: isOutbound ? "var(--teal)" : "var(--paper)",
							color: isOutbound ? "#fff" : "var(--ink)",
							padding: "9px 13px",
							borderRadius: 16,
							borderTopRightRadius: isOutbound ? 4 : 16,
							borderTopLeftRadius: !isOutbound ? 4 : 16,
							boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
							border: isOutbound ? "none" : "1px solid var(--line)",
							display: "flex",
							flexDirection: "column",
						}}
					>
						<span
							style={{
								fontSize: 14,
								lineHeight: 1.5,
								wordBreak: "break-word",
							}}
						>
							{msg.message}
						</span>
						{msg.attachments && msg.attachments.length > 0 && (
							<div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
								{msg.attachments.map((att, idx) => (
									<div
										key={idx}
										style={{
											background: isOutbound ? "rgba(0,0,0,0.15)" : "var(--paper-soft)",
											padding: "4px 8px",
											borderRadius: 8,
											fontSize: 12,
											display: "flex",
											alignItems: "center",
											gap: 6,
										}}
									>
										<Paperclip size={12} />
										{att.name}
									</div>
								))}
							</div>
						)}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-end",
								gap: 4,
								marginTop: 4,
								alignSelf: "flex-end",
							}}
						>
							<span
								style={{
									fontSize: 10,
									color: isOutbound ? "rgba(255,255,255,0.7)" : "var(--muted)",
								}}
							>
								{formatTime(msg.createdAt)}
							</span>
							{isOutbound && (
								<CheckCheck
									size={13}
									color={
										msg.readAt ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)"
									}
								/>
							)}
						</div>
					</div>
				);
			})}
			<div ref={messagesEndRef} />
		</div>
	);
}
