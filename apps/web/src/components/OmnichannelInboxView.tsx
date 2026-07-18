import {
	CheckCheck,
	Hash,
	MessageSquarePlus,
	MoreVertical,
	Paperclip,
	Phone,
	Search,
	Send,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { useWebsocket } from "../hooks/useWebsocket";
import { usePatientStore } from "../store/patientStore";
import { showToast } from "./GlobalToast";

interface ChatMessage {
	id: string;
	patientId: string;
	message: string;
	channel: string;
	direction: "inbound" | "outbound";
	createdAt: string;
	attachments?: { name: string; url: string; type: string }[];
	readAt?: string | null;
	patientName?: string;
}

interface ChatSummary extends ChatMessage {
	unreadCount: number;
	patientPhone?: string;
}

function getChannelLabel(channel: string) {
	if (channel === "whatsapp") return "WhatsApp";
	if (channel === "telegram") return "Telegram";
	if (channel === "sms") return "SMS";
	if (channel === "vk") return "VKontakte";
	return channel;
}

function getChannelColor(channel: string) {
	if (channel === "whatsapp") return "#25D366";
	if (channel === "telegram") return "#0088cc";
	if (channel === "vk") return "#0077FF";
	return "var(--muted)";
}

function getChannelLetter(channel: string) {
	if (channel === "whatsapp") return "W";
	if (channel === "telegram") return "T";
	if (channel === "sms") return "S";
	if (channel === "vk") return "V";
	return channel.charAt(0).toUpperCase();
}

function formatTime(isoString: string) {
	const d = new Date(isoString);
	return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(isoString: string) {
	const d = new Date(isoString);
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	if (d.toDateString() === today.toDateString()) return "Сегодня";
	if (d.toDateString() === yesterday.toDateString()) return "Вчера";
	return d.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
	});
}

function getDateKey(isoString: string) {
	return new Date(isoString).toDateString();
}

// Modal for starting a new chat with a patient
function NewChatModal({
	onClose,
	onSelect,
	authHeaders,
}: {
	onClose: () => void;
	onSelect: (patientId: string, patientName: string, channel: string) => void;
	authHeaders: (extra?: Record<string, string>) => Record<string, string>;
}) {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<{ id: string; fullName: string; phone: string }[]>([]);
	const [selectedPatient, setSelectedPatient] = useState<{ id: string; fullName: string } | null>(null);
	const [channel, setChannel] = useState<string>("whatsapp");
	const [searching, setSearching] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		if (query.trim().length < 2) {
			setResults([]);
			return;
		}
		const t = setTimeout(async () => {
			setSearching(true);
			try {
				const res = await fetch(
					`/api/communications/patients/search?q=${encodeURIComponent(query.trim())}`,
					{ headers: authHeaders() },
				);
				if (res.ok) setResults(await res.json());
			} finally {
				setSearching(false);
			}
		}, 300);
		return () => clearTimeout(t);
	}, [query]);

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				background: "rgba(0,0,0,0.4)",
				zIndex: 1000,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div
				style={{
					width: 460,
					background: "var(--paper)",
					borderRadius: 16,
					boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						padding: "20px 24px 16px",
						borderBottom: "1px solid var(--line)",
					}}
				>
					<h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>
						Новый диалог
					</h3>
					<button
						type="button"
						onClick={onClose}
						style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
					>
						<X size={20} />
					</button>
				</div>

				<div style={{ padding: "16px 24px" }}>
					{!selectedPatient ? (
						<>
							<div style={{ position: "relative", marginBottom: 12 }}>
								<Search
									size={16}
									color="var(--muted)"
									style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
								/>
								<input
									ref={inputRef}
									type="text"
									placeholder="Найти пациента по имени или телефону..."
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									style={{
										width: "100%",
										padding: "10px 12px 10px 36px",
										borderRadius: 8,
										border: "1px solid var(--line)",
										background: "var(--paper-soft)",
										color: "var(--ink)",
										outline: "none",
										fontSize: 14,
										boxSizing: "border-box",
									}}
								/>
							</div>
							{searching && (
								<div style={{ textAlign: "center", padding: 12, color: "var(--muted)", fontSize: 13 }}>
									Поиск...
								</div>
							)}
							{results.map((p) => (
								<div
									key={p.id}
									onClick={() => setSelectedPatient({ id: p.id, fullName: p.fullName })}
									style={{
										padding: "10px 12px",
										borderRadius: 8,
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: 12,
										transition: "background 0.15s",
									}}
									onMouseEnter={(e) =>
										(e.currentTarget.style.background = "var(--paper-soft)")
									}
									onMouseLeave={(e) =>
										(e.currentTarget.style.background = "transparent")
									}
								>
									<div
										style={{
											width: 36,
											height: 36,
											borderRadius: "50%",
											background: "var(--teal)",
											color: "#fff",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontWeight: 700,
											fontSize: 15,
											flexShrink: 0,
										}}
									>
										{p.fullName.charAt(0).toUpperCase()}
									</div>
									<div>
										<div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
											{p.fullName}
										</div>
										<div style={{ fontSize: 12, color: "var(--muted)" }}>{p.phone}</div>
									</div>
								</div>
							))}
							{query.trim().length >= 2 && !searching && results.length === 0 && (
								<div style={{ textAlign: "center", padding: 16, color: "var(--muted)", fontSize: 13 }}>
									Пациенты не найдены
								</div>
							)}
						</>
					) : (
						<>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: 12,
									padding: "12px",
									background: "var(--paper-soft)",
									borderRadius: 8,
									marginBottom: 20,
								}}
							>
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
										fontWeight: 700,
										fontSize: 16,
									}}
								>
									{selectedPatient.fullName.charAt(0).toUpperCase()}
								</div>
								<div style={{ flex: 1 }}>
									<div style={{ fontWeight: 600, color: "var(--ink)" }}>
										{selectedPatient.fullName}
									</div>
								</div>
								<button
									type="button"
									onClick={() => setSelectedPatient(null)}
									style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
								>
									<X size={16} />
								</button>
							</div>

							<label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
								Канал связи
							</label>
							<div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
								{[
									{ value: "whatsapp", label: "WhatsApp", color: "#25D366" },
									{ value: "telegram", label: "Telegram", color: "#0088cc" },
									{ value: "vk", label: "VK", color: "#0077FF" },
									{ value: "sms", label: "SMS", color: "var(--muted)" },
								].map((c) => (
									<button
										key={c.value}
										type="button"
										onClick={() => setChannel(c.value)}
										style={{
											flex: 1,
											padding: "8px 12px",
											borderRadius: 8,
											border: `1px solid ${channel === c.value ? c.color : "var(--line)"}`,
											background: channel === c.value ? `${c.color}15` : "transparent",
											color: channel === c.value ? c.color : "var(--muted)",
											cursor: "pointer",
											fontWeight: channel === c.value ? 600 : 400,
											fontSize: 13,
											transition: "all 0.15s",
										}}
									>
										{c.label}
									</button>
								))}
							</div>

							<button
								type="button"
								onClick={() =>
									onSelect(selectedPatient.id, selectedPatient.fullName, channel)
								}
								style={{
									width: "100%",
									padding: "12px",
									borderRadius: 10,
									background: "var(--teal)",
									color: "#fff",
									border: "none",
									cursor: "pointer",
									fontWeight: 600,
									fontSize: 15,
								}}
							>
								Открыть диалог
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

export function OmnichannelInboxView() {
	const { auth } = useAppLogicContext();
	const [chats, setChats] = useState<ChatSummary[]>([]);
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputText, setInputText] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [activeChannelFilter, setActiveChannelFilter] = useState<string>("all");
	const [showNewChat, setShowNewChat] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);

	const { lastMessage } = useWebsocket(
		import.meta.env.VITE_WS_URL ?? "ws://localhost:4100/api/ws/schedule",
	);

	useEffect(() => {
		if (lastMessage?.type === "INBOX_NEW_MESSAGE") {
			const msg = lastMessage.payload;
			if (selectedPatientId === msg.patientId) {
				setMessages((prev) => {
					if (prev.some((m) => m.id === msg.id)) return prev;
					const updated = [
						...prev,
						{
							id: msg.id || Math.random().toString(),
							patientId: msg.patientId,
							message: msg.text,
							channel: msg.channel,
							direction: msg.direction || "inbound",
							createdAt: msg.createdAt || new Date().toISOString(),
						} as ChatMessage,
					];
					scrollToBottom();
					return updated;
				});
			}

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
							unreadCount:
								msg.direction === "inbound" && selectedPatientId !== msg.patientId
									? (oldChat.unreadCount ?? 0) + 1
									: oldChat.unreadCount,
						};
						const [item] = updated.splice(idx, 1);
						if (item) updated.unshift(item);
					}
				} else {
					fetchChats();
				}
				return updated;
			});
		}

		if (lastMessage?.type === "INBOX_MESSAGES_READ") {
			const { patientId } = lastMessage.payload;
			setChats((prev) =>
				prev.map((c) =>
					c.patientId === patientId ? { ...c, unreadCount: 0 } : c,
				),
			);
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
	}, []);

	useEffect(() => {
		if (!selectedPatientId) return;
		const fetchMessages = async () => {
			try {
				const res = await fetch(
					`/api/communications/inbox/${selectedPatientId}`,
					{ headers: auth.denteClinicalReadHeaders() },
				);
				if (res.ok) {
					const data = await res.json();
					setMessages(Array.isArray(data) ? data : []);
					scrollToBottom();
					// Clear unread count locally
					setChats((prev) =>
						prev.map((c) =>
							c.patientId === selectedPatientId ? { ...c, unreadCount: 0 } : c,
						),
					);
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
		if ((!inputText.trim() && pendingAttachments.length === 0) || !selectedPatientId) return;

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
						attachments: pendingAttachments.map(f => ({
							name: f.name,
							url: URL.createObjectURL(f),
							type: f.type
						}))
					}),
				},
			);

			if (res.ok) {
				const newMessage = await res.json();
				setMessages([...messages, newMessage]);
				setInputText("");
				setPendingAttachments([]);
				scrollToBottom();

				setChats((prev) => {
					const updated = [...prev];
					const idx = updated.findIndex((c) => c.patientId === selectedPatientId);
					if (idx !== -1) {
						const oldChat = updated[idx];
						if (oldChat) {
							updated[idx] = {
								...oldChat,
								message: newMessage.message,
								createdAt: newMessage.createdAt,
								direction: "outbound",
							};
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

	const handleNewChatSelect = (patientId: string, patientName: string, channel: string) => {
		setShowNewChat(false);
		// Check if chat already exists
		const exists = chats.find((c) => c.patientId === patientId);
		if (!exists) {
			// Add a virtual chat entry
			setChats((prev) => [
				{
					id: `virtual-${patientId}`,
					patientId,
					patientName,
					message: "",
					channel,
					direction: "outbound",
					createdAt: new Date().toISOString(),
					unreadCount: 0,
				},
				...prev,
			]);
		}
		setSelectedPatientId(patientId);
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

	// Group messages by date for date separators
	const messagesWithDateSeparators = useMemo(() => {
		const result: Array<{ type: "date"; label: string } | { type: "message"; msg: ChatMessage }> = [];
		let lastDateKey = "";
		for (const msg of messages) {
			const dk = getDateKey(msg.createdAt);
			if (dk !== lastDateKey) {
				result.push({ type: "date", label: formatDate(msg.createdAt) });
				lastDateKey = dk;
			}
			result.push({ type: "message", msg });
		}
		return result;
	}, [messages]);

	const totalUnread = chats.reduce((s, c) => s + (c.unreadCount ?? 0), 0);

	return (
		<>
			{showNewChat && (
				<NewChatModal
					onClose={() => setShowNewChat(false)}
					onSelect={handleNewChatSelect}
					authHeaders={auth.denteClinicalReadHeaders}
				/>
			)}
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
						width: 340,
						background: "var(--paper)",
						display: "flex",
						flexDirection: "column",
						borderRight: "1px solid var(--line)",
						zIndex: 10,
					}}
				>
					<div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--line)" }}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginBottom: 12,
							}}
						>
							<h2
								style={{
									margin: 0,
									fontSize: 17,
									fontWeight: 700,
									color: "var(--ink)",
									display: "flex",
									alignItems: "center",
									gap: 8,
								}}
							>
								Мессенджеры
								{totalUnread > 0 && (
									<span
										style={{
											background: "var(--teal)",
											color: "#fff",
											borderRadius: 10,
											fontSize: 11,
											fontWeight: 700,
											padding: "1px 7px",
											minWidth: 18,
											textAlign: "center",
										}}
									>
										{totalUnread > 99 ? "99+" : totalUnread}
									</span>
								)}
							</h2>
							<button
								type="button"
								title="Новый диалог"
								onClick={() => setShowNewChat(true)}
								style={{
									background: "var(--teal)",
									border: "none",
									color: "#fff",
									width: 34,
									height: 34,
									borderRadius: 8,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									cursor: "pointer",
									flexShrink: 0,
								}}
							>
								<MessageSquarePlus size={18} />
							</button>
						</div>

						<div style={{ position: "relative", marginBottom: 10 }}>
							<Search
								size={15}
								color="var(--muted)"
								style={{
									position: "absolute",
									left: 10,
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
									padding: "9px 10px 9px 32px",
									borderRadius: 8,
									border: "1px solid var(--line)",
									background: "var(--paper-soft)",
									color: "var(--ink)",
									outline: "none",
									fontSize: 13,
									boxSizing: "border-box",
								}}
							/>
						</div>

						<div style={{ display: "flex", gap: 6 }}>
							{[
								{ value: "all", label: "Все" },
								{ value: "whatsapp", label: "WA", color: "#25D366" },
								{ value: "telegram", label: "TG", color: "#0088cc" },
								{ value: "vk", label: "VK", color: "#0077FF" },
								{ value: "sms", label: "SMS", color: "var(--muted)" },
							].map((f) => (
								<button
									key={f.value}
									type="button"
									onClick={() => setActiveChannelFilter(f.value)}
									style={{
										flex: 1,
										padding: "5px 4px",
										fontSize: 12,
										borderRadius: 6,
										border: "1px solid var(--line)",
										background:
											activeChannelFilter === f.value
												? (f.color ?? "var(--teal)")
												: "transparent",
										color:
											activeChannelFilter === f.value ? "#fff" : "var(--muted)",
										cursor: "pointer",
										fontWeight: activeChannelFilter === f.value ? 600 : 400,
										transition: "all 0.15s",
									}}
								>
									{f.label}
								</button>
							))}
						</div>
					</div>

					<div style={{ flex: 1, overflowY: "auto" }}>
						{filteredChats.length === 0 ? (
							<div
								style={{
									padding: 32,
									textAlign: "center",
									color: "var(--muted)",
									fontSize: 13,
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
										padding: "12px 16px",
										cursor: "pointer",
										borderBottom: "1px solid var(--line)",
										background:
											selectedPatientId === chat.patientId
												? "rgba(14, 165, 233, 0.06)"
												: "transparent",
										display: "flex",
										gap: 10,
										transition: "background 0.15s",
									}}
								>
									{/* Avatar */}
									<div
										style={{
											width: 42,
											height: 42,
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
										<span style={{ fontWeight: 600, fontSize: 15 }}>
											{chat.patientName ? chat.patientName.charAt(0).toUpperCase() : "?"}
										</span>
										<div
											style={{
												position: "absolute",
												bottom: -2,
												right: -2,
												width: 15,
												height: 15,
												borderRadius: "50%",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: 8,
												color: "#fff",
												fontWeight: "bold",
												background: getChannelColor(chat.channel),
											}}
										>
											{getChannelLetter(chat.channel)}
										</div>
									</div>

									{/* Content */}
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												marginBottom: 3,
											}}
										>
											<div
												style={{
													fontWeight: chat.unreadCount > 0 ? 700 : 600,
													color: "var(--ink)",
													fontSize: 13,
													whiteSpace: "nowrap",
													overflow: "hidden",
													textOverflow: "ellipsis",
												}}
											>
												{chat.patientName || "Неизвестный пациент"}
											</div>
											<div
												style={{
													fontSize: 11,
													color: "var(--muted)",
													flexShrink: 0,
													marginLeft: 6,
												}}
											>
												{formatTime(chat.createdAt)}
											</div>
										</div>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: 4,
												justifyContent: "space-between",
											}}
										>
											<div
												style={{
													fontSize: 12,
													color: chat.unreadCount > 0 ? "var(--ink)" : "var(--muted)",
													whiteSpace: "nowrap",
													overflow: "hidden",
													textOverflow: "ellipsis",
													fontWeight: chat.unreadCount > 0 ? 500 : 400,
													display: "flex",
													alignItems: "center",
													gap: 4,
												}}
											>
												{chat.direction === "outbound" && (
													<CheckCheck
														size={13}
														color="var(--teal)"
														style={{ flexShrink: 0 }}
													/>
												)}
												{chat.message || "Диалог открыт"}
											</div>
											{chat.unreadCount > 0 && (
												<span
													style={{
														background: "var(--teal)",
														color: "#fff",
														borderRadius: 10,
														fontSize: 10,
														fontWeight: 700,
														padding: "1px 6px",
														flexShrink: 0,
														minWidth: 16,
														textAlign: "center",
													}}
												>
													{chat.unreadCount > 99 ? "99+" : chat.unreadCount}
												</span>
											)}
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
						backgroundColor: "var(--paper-soft)",
					}}
				>
					{selectedPatientId ? (
						<>
							{/* CHAT HEADER */}
							<div
								style={{
									height: 64,
									background: "rgba(255,255,255,0.85)",
									backdropFilter: "blur(12px)",
									borderBottom: "1px solid var(--line)",
									padding: "0 20px",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									zIndex: 10,
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
									<div
										style={{
											width: 38,
											height: 38,
											borderRadius: "50%",
											background: "var(--teal)",
											color: "#fff",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontWeight: "bold",
											fontSize: 15,
										}}
									>
										{selectedChatInfo?.patientName?.charAt(0).toUpperCase() ?? "?"}
									</div>
									<div>
										<h3
											style={{
												margin: 0,
												fontSize: 15,
												fontWeight: 600,
												color: "var(--ink)",
											}}
										>
											{selectedChatInfo?.patientName || "Пациент"}
										</h3>
										<div
											style={{
												fontSize: 12,
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
											{selectedChatInfo
												? `Диалог через ${getChannelLabel(selectedChatInfo.channel)}`
												: ""}
										</div>
									</div>
								</div>
								<div style={{ display: "flex", gap: 8 }}>
									<button
										type="button"
										title="Позвонить"
										style={{
											background: "var(--paper)",
											border: "1px solid var(--line)",
											width: 36,
											height: 36,
											borderRadius: "50%",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											color: "var(--muted)",
											cursor: "pointer",
										}}
									>
										<Phone size={16} />
									</button>
									<button
										type="button"
										title="Дополнительно"
										style={{
											background: "var(--paper)",
											border: "1px solid var(--line)",
											width: 36,
											height: 36,
											borderRadius: "50%",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											color: "var(--muted)",
											cursor: "pointer",
										}}
									>
										<MoreVertical size={16} />
									</button>
								</div>
							</div>

							{/* MESSAGES */}
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
												<div
													style={{ flex: 1, height: 1, background: "var(--line)" }}
												/>
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
												<div
													style={{ flex: 1, height: 1, background: "var(--line)" }}
												/>
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
													{msg.attachments.map((att, i) => (
														<div key={i} style={{ background: isOutbound ? "rgba(0,0,0,0.15)" : "var(--paper-soft)", padding: "4px 8px", borderRadius: 8, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
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
														color: isOutbound
															? "rgba(255,255,255,0.7)"
															: "var(--muted)",
													}}
												>
													{formatTime(msg.createdAt)}
												</span>
												{isOutbound && (
													<CheckCheck
														size={13}
														color={
															msg.readAt
																? "rgba(255,255,255,0.95)"
																: "rgba(255,255,255,0.6)"
														}
													/>
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
									padding: "0 20px 10px",
									display: "flex",
									gap: 6,
									overflowX: "auto",
								}}
							>
								{[
									{
										label: "Напоминание о приёме",
										text: "Здравствуйте! Напоминаем о вашем визите завтра в",
									},
									{
										label: "Подтверждение записи",
										text: "Отлично, записали вас! Ждём вас в клинике.",
									},
									{
										label: "Контроль после приёма",
										text: "Как ваше самочувствие после лечения?",
									},
									{
										label: "Рекомендации",
										text: "Не забудьте выполнять рекомендации врача:",
									},
								].map((tpl) => (
									<button
										key={tpl.label}
										type="button"
										onClick={() => insertTemplate(tpl.text)}
										style={{
											whiteSpace: "nowrap",
											padding: "5px 11px",
											background: "var(--paper)",
											border: "1px solid var(--line)",
											borderRadius: 20,
											fontSize: 12,
											color: "var(--muted)",
											cursor: "pointer",
											transition: "all 0.15s",
										}}
									>
										{tpl.label}
									</button>
								))}
							</div>

							{/* INPUT AREA */}
							<div
								style={{
									background: "var(--paper)",
									padding: "12px 20px",
									borderTop: "1px solid var(--line)",
								}}
							>
								<form
									onSubmit={handleSend}
									style={{ display: "flex", alignItems: "flex-end", gap: 10 }}
								>
									<button
										type="button"
										title="Прикрепить файл"
										style={{
											background: "none",
											border: "none",
											color: "var(--muted)",
											cursor: "pointer",
											padding: 6,
										}}
										onClick={() => fileInputRef.current?.click()}
									>
										<Paperclip size={20} />
									</button>
									<input type="file" ref={fileInputRef} style={{ display: "none" }} multiple onChange={(e) => { if (e.target.files) { setPendingAttachments([...pendingAttachments, ...Array.from(e.target.files)]); e.target.value = ""; } }} />
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
											padding: "10px 14px",
											borderRadius: 10,
											border: "1px solid var(--line)",
											background: "var(--paper-soft)",
											color: "var(--ink)",
											outline: "none",
											resize: "none",
											minHeight: 42,
											maxHeight: 120,
											fontSize: 14,
											fontFamily: "inherit",
										}}
										rows={1}
									/>
									<button
										type="submit"
										disabled={!inputText.trim() && pendingAttachments.length === 0}
										title="Отправить"
										style={{
											background: (inputText.trim() || pendingAttachments.length > 0) ? "var(--teal)" : "var(--line)",
											color: "#fff",
											border: "none",
											width: 42,
											height: 42,
											borderRadius: "50%",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											cursor: (inputText.trim() || pendingAttachments.length > 0) ? "pointer" : "default",
											transition: "background 0.2s",
											flexShrink: 0,
										}}
									>
										<Send
											size={17}
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
								gap: 16,
							}}
						>
							<div
								style={{
									width: 80,
									height: 80,
									borderRadius: "50%",
									background: "rgba(0,0,0,0.04)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<Hash size={36} color="var(--line)" />
							</div>
							<h2
								style={{
									margin: 0,
									color: "var(--ink)",
									fontWeight: 600,
									fontSize: 18,
								}}
							>
								Омниканальный Inbox
							</h2>
							<p
								style={{
									margin: 0,
									maxWidth: 280,
									textAlign: "center",
									lineHeight: 1.5,
									fontSize: 14,
								}}
							>
								Выберите диалог слева или нажмите{" "}
								<strong style={{ color: "var(--teal)" }}>+</strong> чтобы начать
								новый.
							</p>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
