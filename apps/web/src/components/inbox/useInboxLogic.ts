import { useEffect, useState, useRef, useMemo } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWebsocket } from "../../hooks/useWebsocket";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";
import type { ChatMessage, ChatSummary } from "./InboxTypes";
import { getDateKey, formatDate } from "./InboxUtils";

export function useInboxLogic() {
	const { auth, dashboard } = useAppLogicContext();
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

	const scrollToBottom = () => {
		setTimeout(() => {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}, 100);
	};

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
		const exists = chats.find((c) => c.patientId === patientId);
		if (!exists) {
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

	const selectedChatInfo = chats.find((c) => c.patientId === selectedPatientId);
	const totalUnread = chats.reduce((s, c) => s + (c.unreadCount ?? 0), 0);

	return {
		auth,
		dashboard,
		selectedPatientId,
		setSelectedPatientId,
		inputText,
		setInputText,
		searchQuery,
		setSearchQuery,
		activeChannelFilter,
		setActiveChannelFilter,
		showNewChat,
		setShowNewChat,
		messagesEndRef,
		fileInputRef,
		pendingAttachments,
		setPendingAttachments,
		handleSend,
		insertTemplate,
		handleNewChatSelect,
		filteredChats,
		messagesWithDateSeparators,
		selectedChatInfo,
		totalUnread,
	};
}
