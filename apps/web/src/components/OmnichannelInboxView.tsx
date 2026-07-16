import {
	CheckCheck,
	Hash,
	Image as ImageIcon,
	MessageSquare,
	MoreVertical,
	Paperclip,
	Phone,
	Search,
	Send,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { useWebsocket } from "../hooks/useWebsocket";
import { showToast } from "./GlobalToast";

interface ChatMessage {
	id: string;
	patientId: string;
	message: string;
	channel: string;
	direction: "inbound" | "outbound";
	createdAt: string;
	patientName?: string;
}

export function OmnichannelInboxView() {
	const { auth } = useAppLogicContext();
	const [chats, setChats] = useState<ChatMessage[]>([]);
	const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
		null,
	);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputText, setInputText] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [activeChannelFilter, setActiveChannelFilter] = useState<string>("all");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const { lastMessage } = useWebsocket(
		import.meta.env.VITE_WS_URL ?? "ws://localhost:4100/api/ws/schedule",
	);

	useEffect(() => {
		if (lastMessage?.type === "INBOX_NEW_MESSAGE") {
			const msg = lastMessage.payload;
			// If the active chat is this patient, append message
			if (selectedPatientId === msg.patientId) {
				setMessages((prev) => {
					// Avoid duplicate if sent locally
					if (prev.some((m) => m.id === msg.id)) return prev;
					const updated = [...prev, {
						id: msg.id || Math.random().toString(),
						patientId: msg.patientId,
						message: msg.text,
						channel: msg.channel,
						direction: msg.direction || "inbound",
						createdAt: msg.createdAt || new Date().toISOString(),
					} as ChatMessage];
					scrollToBottom();
					return updated;
				});
			}

			// Update the chat list (latest message, move to top, update list)
			setChats((prev) => {
				const updated = [...prev];
				const idx = updated.findIndex((c) => c.patientId === msg.patientId);
				if (idx !== -1) {
					const oldChat = updated[idx];
					if (oldChat) {
						updated[idx] = {
							...oldChat,
							message: msg.text,
							createdAt: msg.createdAt || new Date().toISOString(),
							direction: msg.direction || "inbound",
						} as ChatMessage;
						// Move to top
						const [item] = updated.splice(idx, 1);
						if (item) updated.unshift(item);
					}
				} else {
					// Fetch chats to resolve new chat details/patient info dynamically
					fetchChats();
				}
				return updated;
			});
		}
	}, [lastMessage, selectedPatientId]);

	const fetchChats = async () => {
		try {
			const res = await fetch("/api/communications/inbox", {
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setChats(Array.isArray(data) ? data : []);
			}
		} catch (e) {
			console.error(e);
		}
	};

	useEffect(() => {
		fetchChats();
		// Setting up a polling mechanism for a real app, but for MVP fetching once + on send is okay
	}, []);

	useEffect(() => {
		if (!selectedPatientId) return;
		const fetchMessages = async () => {
			try {
				const res = await fetch(
					`/api/communications/inbox/${selectedPatientId}`,
					{
						headers: auth.denteClinicalReadHeaders(),
					},
				);
				if (res.ok) {
					const data = await res.json();
					setMessages(Array.isArray(data) ? data : []);
					scrollToBottom();
				}
			} catch (e) {
				console.error(e);
			}
		};
		fetchMessages();
	}, [selectedPatientId]);

	const scrollToBottom = () => {
		setTimeout(() => {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}, 100);
	};

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inputText.trim() || !selectedPatientId) return;

		// Use the channel of the active chat, default to whatsapp
		const activeChat = chats.find((c) => c.patientId === selectedPatientId);
		const channelToUse = activeChat?.channel || "whatsapp";

		try {
			const res = await fetch(
				`/api/communications/inbox/${selectedPatientId}/send`,
				{
					method: "POST",
					headers: auth.denteClinicalReadHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						message: inputText.trim(),
						channel: channelToUse,
					}),
				},
			);

			if (res.ok) {
				const newMessage = await res.json();
				setMessages([...messages, newMessage]);
				setInputText("");
				scrollToBottom();

				// Update the latest message in the chat list
				setChats((prev) => {
					const updated = [...prev];
					const idx = updated.findIndex(
						(c) => c.patientId === selectedPatientId,
					);
					if (idx !== -1) {
						const oldChat = updated[idx];
						if (oldChat) {
							updated[idx] = {
								...oldChat,
								message: newMessage.message,
								createdAt: newMessage.createdAt,
								direction: "outbound",
							} as ChatMessage;
							// Move to top
							const [item] = updated.splice(idx, 1);
							if (item) updated.unshift(item);
						}
					}
					return updated;
				});
			} else {
				showToast("Ошибка отправки сообщения", "error");
			}
		} catch (err) {
			console.error(err);
			showToast("Системная ошибка", "error");
		}
	};

	const insertTemplate = (text: string) => {
		setInputText((prev) => (prev ? `${prev} ${text}` : text));
	};

	const filteredChats = useMemo(() => {
		return chats.filter((c) => {
			const matchSearch = (c.patientName || "Неизвестный пациент")
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
			const matchChannel =
				activeChannelFilter === "all" || c.channel === activeChannelFilter;
			return matchSearch && matchChannel;
		});
	}, [chats, searchQuery, activeChannelFilter]);

	const selectedChatInfo = chats.find((c) => c.patientId === selectedPatientId);

	const formatTime = (isoString: string) => {
		return new Date(isoString).toLocaleTimeString("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<div
			style={{
				display: "flex",
				height: "calc(100vh - 80px)",
				background: "var(--paper-soft)",
				borderRadius: 16,
				overflow: "hidden",
				border: "1px solid var(--line)",
				margin: "0 auto",
				maxWidth: 1400,
			}}
		>
			{/* SIDEBAR */}
			<div
				style={{
					width: 360,
					background: "var(--paper)",
					display: "flex",
					flexDirection: "column",
					borderRight: "1px solid var(--line)",
					zIndex: 10,
				}}
			>
				<div style={{ padding: 20, borderBottom: "1px solid var(--line)" }}>
					<h2
						style={{
							margin: "0 0 16px 0",
							fontSize: 20,
							fontWeight: 700,
							color: "var(--ink)",
							display: "flex",
							alignItems: "center",
							gap: 10,
						}}
					>
						<MessageSquare size={24} color="var(--teal)" /> Мессенджеры
					</h2>
					<div style={{ position: "relative", marginBottom: 12 }}>
						<Search
							size={16}
							color="var(--muted)"
							style={{
								position: "absolute",
								left: 12,
								top: "50%",
								transform: "translateY(-50%)",
							}}
						/>
						<input
							type="text"
							placeholder="Поиск диалогов..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							style={{
								width: "100%",
								padding: "10px 12px 10px 36px",
								borderRadius: 8,
								border: "1px solid var(--line)",
								background: "var(--paper-soft)",
								color: "var(--ink)",
								outline: "none",
							}}
						/>
					</div>
					<div style={{ display: "flex", gap: 8 }}>
						<button
							onClick={() => setActiveChannelFilter("all")}
							style={{
								flex: 1,
								padding: "6px",
								fontSize: 13,
								borderRadius: 6,
								border: "1px solid var(--line)",
								background:
									activeChannelFilter === "all" ? "var(--teal)" : "transparent",
								color: activeChannelFilter === "all" ? "#fff" : "var(--muted)",
								cursor: "pointer",
								fontWeight: activeChannelFilter === "all" ? 600 : 400,
							}}
						>
							Все
						</button>
						<button
							onClick={() => setActiveChannelFilter("whatsapp")}
							style={{
								flex: 1,
								padding: "6px",
								fontSize: 13,
								borderRadius: 6,
								border: "1px solid var(--line)",
								background:
									activeChannelFilter === "whatsapp"
										? "#25D366"
										: "transparent",
								color:
									activeChannelFilter === "whatsapp" ? "#fff" : "var(--muted)",
								cursor: "pointer",
								fontWeight: activeChannelFilter === "whatsapp" ? 600 : 400,
							}}
						>
							WA
						</button>
						<button
							onClick={() => setActiveChannelFilter("telegram")}
							style={{
								flex: 1,
								padding: "6px",
								fontSize: 13,
								borderRadius: 6,
								border: "1px solid var(--line)",
								background:
									activeChannelFilter === "telegram"
										? "#0088cc"
										: "transparent",
								color:
									activeChannelFilter === "telegram" ? "#fff" : "var(--muted)",
								cursor: "pointer",
								fontWeight: activeChannelFilter === "telegram" ? 600 : 400,
							}}
						>
							TG
						</button>
					</div>
				</div>

				<div style={{ flex: 1, overflowY: "auto" }}>
					{filteredChats.length === 0 ? (
						<div
							style={{
								padding: 40,
								textAlign: "center",
								color: "var(--muted)",
							}}
						>
							Диалогов не найдено
						</div>
					) : (
						filteredChats.map((chat) => (
							<div
								key={chat.patientId}
								onClick={() => setSelectedPatientId(chat.patientId)}
								style={{
									padding: "16px 20px",
									cursor: "pointer",
									borderBottom: "1px solid var(--line)",
									background:
										selectedPatientId === chat.patientId
											? "rgba(14, 165, 233, 0.05)"
											: "transparent",
									display: "flex",
									gap: 12,
									transition: "background 0.2s",
								}}
							>
								<div
									style={{
										width: 44,
										height: 44,
										borderRadius: "50%",
										background: "var(--paper-soft)",
										border: "1px solid var(--line)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: "var(--muted)",
										flexShrink: 0,
										position: "relative",
									}}
								>
									<span style={{ fontWeight: 600, fontSize: 16 }}>
										{chat.patientName
											? chat.patientName.charAt(0).toUpperCase()
											: "?"}
									</span>
									<div
										style={{
											position: "absolute",
											bottom: -2,
											right: -2,
											width: 16,
											height: 16,
											borderRadius: "50%",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: 9,
											color: "#fff",
											fontWeight: "bold",
											background:
												chat.channel === "whatsapp"
													? "#25D366"
													: chat.channel === "telegram"
														? "#0088cc"
														: "var(--muted)",
										}}
									>
										{chat.channel === "whatsapp"
											? "W"
											: chat.channel === "telegram"
												? "T"
												: "S"}
									</div>
								</div>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											marginBottom: 4,
										}}
									>
										<div
											style={{
												fontWeight: 600,
												color: "var(--ink)",
												whiteSpace: "nowrap",
												overflow: "hidden",
												textOverflow: "ellipsis",
											}}
										>
											{chat.patientName || "Неизвестный пациент"}
										</div>
										<div
											style={{
												fontSize: 12,
												color: "var(--muted)",
												flexShrink: 0,
											}}
										>
											{formatTime(chat.createdAt)}
										</div>
									</div>
									<div
										style={{ display: "flex", alignItems: "center", gap: 4 }}
									>
										{chat.direction === "outbound" && (
											<CheckCheck size={14} color="var(--teal)" />
										)}
										<div
											style={{
												fontSize: 13,
												color: "var(--muted)",
												whiteSpace: "nowrap",
												overflow: "hidden",
												textOverflow: "ellipsis",
											}}
										>
											{chat.message}
										</div>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* MAIN CHAT AREA */}
			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					background:
						'url(\'data:image/svg+xml;utf8,<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><circle cx="2" cy="2" r="1" fill="rgba(0,0,0,0.03)"/></svg>\')',
					backgroundColor: "#f9fafb",
				}}
			>
				{selectedPatientId ? (
					<>
						{/* CHAT HEADER */}
						<div
							style={{
								height: 72,
								background: "rgba(255,255,255,0.8)",
								backdropFilter: "blur(12px)",
								borderBottom: "1px solid var(--line)",
								padding: "0 24px",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								zIndex: 10,
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
								<div
									style={{
										width: 40,
										height: 40,
										borderRadius: "50%",
										background: "var(--teal)",
										color: "#fff",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										fontWeight: "bold",
										fontSize: 16,
									}}
								>
									{selectedChatInfo?.patientName?.charAt(0).toUpperCase() ||
										"?"}
								</div>
								<div>
									<h3
										style={{
											margin: 0,
											fontSize: 16,
											fontWeight: 600,
											color: "var(--ink)",
										}}
									>
										{selectedChatInfo?.patientName || "Пациент"}
									</h3>
									<div
										style={{
											fontSize: 13,
											color: "var(--muted)",
											display: "flex",
											alignItems: "center",
											gap: 4,
										}}
									>
										<div
											style={{
												width: 6,
												height: 6,
												borderRadius: "50%",
												background: "var(--teal)",
											}}
										/>
										Активный диалог через{" "}
										{selectedChatInfo?.channel === "whatsapp"
											? "WhatsApp"
											: "Telegram"}
									</div>
								</div>
							</div>
							<div style={{ display: "flex", gap: 12 }}>
								<button
									style={{
										background: "var(--paper)",
										border: "1px solid var(--line)",
										width: 40,
										height: 40,
										borderRadius: "50%",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: "var(--muted)",
										cursor: "pointer",
									}}
								>
									<Phone size={18} />
								</button>
								<button
									style={{
										background: "var(--paper)",
										border: "1px solid var(--line)",
										width: 40,
										height: 40,
										borderRadius: "50%",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: "var(--muted)",
										cursor: "pointer",
									}}
								>
									<MoreVertical size={18} />
								</button>
							</div>
						</div>

						{/* MESSAGES */}
						<div
							style={{
								flex: 1,
								overflowY: "auto",
								padding: "24px 10%",
								display: "flex",
								flexDirection: "column",
								gap: 12,
							}}
						>
							{messages.map((msg) => {
								const isOutbound = msg.direction === "outbound";
								return (
									<div
										key={msg.id}
										style={{
											alignSelf: isOutbound ? "flex-end" : "flex-start",
											maxWidth: "75%",
											background: isOutbound ? "var(--teal)" : "var(--paper)",
											color: isOutbound ? "#fff" : "var(--ink)",
											padding: "10px 14px",
											borderRadius: 16,
											borderTopRightRadius: isOutbound ? 4 : 16,
											borderTopLeftRadius: !isOutbound ? 4 : 16,
											boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
											border: isOutbound ? "none" : "1px solid var(--line)",
											position: "relative",
											display: "flex",
											flexDirection: "column",
										}}
									>
										<span
											style={{
												fontSize: 15,
												lineHeight: 1.5,
												wordBreak: "break-word",
											}}
										>
											{msg.message}
										</span>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "flex-end",
												gap: 6,
												marginTop: 4,
												alignSelf: "flex-end",
											}}
										>
											<span
												style={{
													fontSize: 11,
													color: isOutbound
														? "rgba(255,255,255,0.7)"
														: "var(--muted)",
												}}
											>
												{formatTime(msg.createdAt)}
											</span>
											{isOutbound && (
												<CheckCheck size={14} color="rgba(255,255,255,0.9)" />
											)}
										</div>
									</div>
								);
							})}
							<div ref={messagesEndRef} />
						</div>

						{/* QUICK REPLIES */}
						<div
							style={{
								padding: "0 24px 12px",
								display: "flex",
								gap: 8,
								overflowX: "auto",
							}}
						>
							<button
								onClick={() =>
									insertTemplate(
										"Здравствуйте! Напоминаем о вашем визите завтра в",
									)
								}
								style={{
									whiteSpace: "nowrap",
									padding: "6px 12px",
									background: "var(--paper)",
									border: "1px solid var(--line)",
									borderRadius: 20,
									fontSize: 13,
									color: "var(--muted)",
									cursor: "pointer",
								}}
							>
								Напоминание о приеме
							</button>
							<button
								onClick={() =>
									insertTemplate("Отлично, записали вас! Ждём вас в клинике.")
								}
								style={{
									whiteSpace: "nowrap",
									padding: "6px 12px",
									background: "var(--paper)",
									border: "1px solid var(--line)",
									borderRadius: 20,
									fontSize: 13,
									color: "var(--muted)",
									cursor: "pointer",
								}}
							>
								Подтверждение записи
							</button>
							<button
								onClick={() =>
									insertTemplate("Как ваше самочувствие после лечения?")
								}
								style={{
									whiteSpace: "nowrap",
									padding: "6px 12px",
									background: "var(--paper)",
									border: "1px solid var(--line)",
									borderRadius: 20,
									fontSize: 13,
									color: "var(--muted)",
									cursor: "pointer",
								}}
							>
								Контроль после приема
							</button>
						</div>

						{/* INPUT AREA */}
						<div
							style={{
								background: "var(--paper)",
								padding: "16px 24px",
								borderTop: "1px solid var(--line)",
							}}
						>
							<form
								onSubmit={handleSend}
								style={{ display: "flex", alignItems: "flex-end", gap: 12 }}
							>
								<button
									type="button"
									style={{
										background: "none",
										border: "none",
										color: "var(--muted)",
										cursor: "pointer",
										padding: 8,
									}}
								>
									<Paperclip size={22} />
								</button>
								<button
									type="button"
									style={{
										background: "none",
										border: "none",
										color: "var(--muted)",
										cursor: "pointer",
										padding: 8,
									}}
								>
									<ImageIcon size={22} />
								</button>
								<textarea
									placeholder="Введите сообщение (Enter для отправки)..."
									value={inputText}
									onChange={(e) => setInputText(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											handleSend(e);
										}
									}}
									style={{
										flex: 1,
										padding: "12px 16px",
										borderRadius: 12,
										border: "1px solid var(--line)",
										background: "var(--paper-soft)",
										color: "var(--ink)",
										outline: "none",
										resize: "none",
										minHeight: 44,
										maxHeight: 120,
										fontSize: 15,
										fontFamily: "inherit",
									}}
									rows={1}
								/>
								<button
									type="submit"
									disabled={!inputText.trim()}
									style={{
										background: inputText.trim()
											? "var(--teal)"
											: "var(--slate-200)",
										color: "#fff",
										border: "none",
										width: 44,
										height: 44,
										borderRadius: "50%",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										cursor: inputText.trim() ? "pointer" : "default",
										transition: "background 0.2s",
									}}
								>
									<Send
										size={18}
										style={{ transform: "translateX(-1px) translateY(1px)" }}
									/>
								</button>
							</form>
						</div>
					</>
				) : (
					<div
						style={{
							flex: 1,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--muted)",
						}}
					>
						<div
							style={{
								width: 96,
								height: 96,
								borderRadius: "50%",
								background: "rgba(0,0,0,0.03)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								marginBottom: 24,
							}}
						>
							<MessageSquare size={40} color="var(--slate-300)" />
						</div>
						<h2
							style={{
								margin: "0 0 8px 0",
								color: "var(--ink)",
								fontWeight: 600,
								fontSize: 20,
							}}
						>
							Омниканальный Inbox
						</h2>
						<p
							style={{
								margin: 0,
								maxWidth: 300,
								textAlign: "center",
								lineHeight: 1.5,
							}}
						>
							Выберите диалог слева, чтобы отправить сообщение пациенту в
							WhatsApp или Telegram.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
