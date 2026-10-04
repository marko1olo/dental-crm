import {
	DEFAULT_CLINIC_CHANNELS,
	INTERCOM_PRESETS,
	type IntercomAck,
	type IntercomLocationItem,
	type IntercomPresetKey,
	type PatientCardAttachment,
	type StaffChatChannel,
	type StaffChatMessage,
	type StaffMemberPresenceItem,
} from "@dental/shared";
import {
	AlertTriangle,
	ArrowLeft,
	Bell,
	Camera,
	CheckCheck,
	Clock,
	Headphones,
	Hospital,
	MessageSquare,
	Paperclip,
	Radio,
	Send,
	ShieldAlert,
	Smile,
	User,
	Users,
	Volume2,
	Wifi,
	X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { playIntercomChime } from "../../lib/intercomSound";
import { showToast } from "../GlobalToast";
import "./staffMessenger.css";

interface StaffMessengerPanelProps {
	onOpenPatientCard?: (patientId: string) => void;
	cabinetNumber?: string;
}

export const StaffMessengerPanel: React.FC<StaffMessengerPanelProps> = ({
	onOpenPatientCard,
	cabinetNumber = "Каб. 1",
}) => {
	const [channels, setChannels] = useState<StaffChatChannel[]>([]);
	const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
	const [messages, setMessages] = useState<StaffChatMessage[]>([]);
	const [members, setMembers] = useState<StaffMemberPresenceItem[]>([]);
	const [locations, setLocations] = useState<IntercomLocationItem[]>([]);
	const [messageText, setMessageText] = useState("");
	const [selectedLocation, setSelectedLocation] = useState(cabinetNumber);
	const [isLoading, setIsLoading] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [mobileView, setMobileView] = useState<"channels" | "chat">("channels");
	const [quickNotePrompt, setQuickNotePrompt] = useState<string | null>(null);
	const [quickNoteText, setQuickNoteText] = useState("");

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Загрузка реальных кресел и кабинетов клиники
	const loadLocations = async () => {
		try {
			const headers = getDenteAuthHeaders();
			const res = await fetch("/api/staff-chat/locations", { headers });
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.locations) && data.locations.length > 0) {
					setLocations(data.locations);
					const first = data.locations[0];
					if (first && (!selectedLocation || selectedLocation === "Каб. 1")) {
						setSelectedLocation(first.name);
					}
					return;
				}
			}
		} catch (e) {
			console.error("Ошибка загрузки локаций:", e);
		}

		// Fallback при отсутствии записей в БД
		const fallback: IntercomLocationItem[] = [
			{ id: "loc-1", name: "Каб. 1 (Терапия)", isChair: true },
			{ id: "loc-2", name: "Каб. 2 (Хирургия/Имплантация)", isChair: true },
			{ id: "loc-3", name: "Каб. 3 (Ортопедия)", isChair: true },
			{ id: "loc-4", name: "Рентген / КЛКТ", isChair: false },
		];
		setLocations(fallback);
		if (!selectedLocation && fallback[0]) {
			setSelectedLocation(fallback[0].name);
		}
	};

	// Загрузка списка каналов клиники
	const loadChannels = async () => {
		try {
			setIsLoading(true);
			const headers = getDenteAuthHeaders();
			const res = await fetch("/api/staff-chat/channels", { headers });
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.channels) && data.channels.length > 0) {
					setChannels(data.channels);
					if (!activeChannelId && data.channels[0]) {
						setActiveChannelId(data.channels[0].id);
					}
				} else if (isDemoShowcaseMode()) {
					// Стартовые каналы для демо-режима
					const fallbackChannels: StaffChatChannel[] = [
						{
							id: "demo-ch-1",
							organizationId: "demo-org",
							type: "channel",
							slug: "general",
							name: "Общий чат",
							description: "Объявления, смены, оперативные вопросы клиники",
							icon: "hospital",
							isDefault: true,
							unreadCount: 0,
							createdAt: new Date().toISOString(),
						},
						{
							id: "demo-ch-2",
							organizationId: "demo-org",
							type: "channel",
							slug: "reception",
							name: "Ресепшен и визиты",
							description: "Приход пациентов, оформление, координация приёма",
							icon: "bell",
							isDefault: true,
							unreadCount: 1,
							createdAt: new Date().toISOString(),
						},
						{
							id: "demo-ch-3",
							organizationId: "demo-org",
							type: "channel",
							slug: "intercom_assistants",
							name: "Интерком и ассистенты",
							description: "Вызовы к установке, материалы, помощь врачам",
							icon: "chair",
							isDefault: true,
							unreadCount: 2,
							createdAt: new Date().toISOString(),
						},
						{
							id: "demo-ch-4",
							organizationId: "demo-org",
							type: "channel",
							slug: "lab_ztl",
							name: "Лаборатория ЗТЛ",
							description: "Наряды, примерки, цвет Vita, обсуждение коронок",
							icon: "tooth",
							isDefault: true,
							unreadCount: 0,
							createdAt: new Date().toISOString(),
						},
					];
					setChannels(fallbackChannels);
					if (!activeChannelId && fallbackChannels[0]) {
						setActiveChannelId(fallbackChannels[0].id);
					}
				}
			}
		} catch (e) {
			console.error("Ошибка загрузки каналов:", e);
		} finally {
			setIsLoading(false);
		}
	};

	// Загрузка сотрудников
	const loadMembers = async () => {
		try {
			const headers = getDenteAuthHeaders();
			const res = await fetch("/api/staff-chat/members", { headers });
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.members)) {
					setMembers(data.members);
				}
			}
		} catch (e) {
			console.error("Ошибка загрузки сотрудников:", e);
		}
	};

	// Загрузка сообщений выбранного канала
	const loadMessages = async (channelId: string) => {
		try {
			const headers = getDenteAuthHeaders();
			const res = await fetch(`/api/staff-chat/messages?channelId=${channelId}`, {
				headers,
			});
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data.messages) && data.messages.length > 0) {
					setMessages(data.messages);
				} else if (isDemoShowcaseMode()) {
					// Живой реалистичный диалог без неестественных скриптов
					const activeCh = channels.find((c) => c.id === channelId);
					if (activeCh?.slug === "intercom_assistants") {
						setMessages([
							{
								id: "demo-msg-1",
								organizationId: "demo-org",
								channelId,
								senderUserId: "user-doc",
								senderName: "Д-р Смирнов А.В.",
								senderRole: "Врач-ортопед",
								messageType: "intercom_ping",
								content:
									"Срочно требуется ассистент в Каб. 1 (Терапия)! Повод: Коффердам / изоляция. Нужен плотный синий платок и кламп 2A.",
								urgency: "urgent",
								pinned: false,
								patientAttachment: {
									patientId: "p-101",
									fullName: "Иванова Екатерина Сергеевна",
									cabinetNumber: "Каб. 1",
									doctorName: "Д-р Смирнов А.В.",
									hasAllergyAlert: true,
								},
								intercomPreset: "call_assistant",
								intercomAcks: [
									{
										staffId: "user-asst",
										staffName: "Ассистент Анна",
										staffRole: "Ассистент",
										ackType: "on_my_way",
										customComment: "Иду, уже несу",
										timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
									},
								],
								readByStaffIds: [],
								createdAt: new Date(Date.now() - 6 * 60000).toISOString(),
							},
							{
								id: "demo-msg-2",
								organizationId: "demo-org",
								channelId,
								senderUserId: "user-asst",
								senderName: "Ассистент Анна",
								senderRole: "Ассистент",
								messageType: "text",
								content: "Алексей Владимирович, платок и клампы на столике у установки.",
								urgency: "normal",
								pinned: false,
								intercomAcks: [],
								readByStaffIds: [],
								createdAt: new Date(Date.now() - 4 * 60000).toISOString(),
							},
						]);
					} else if (activeCh?.slug === "reception") {
						setMessages([
							{
								id: "demo-msg-3",
								organizationId: "demo-org",
								channelId,
								senderUserId: "user-rec",
								senderName: "Ресепшен (Мария)",
								senderRole: "Администратор",
								messageType: "intercom_ping",
								content:
									"Пациент Кузнецов Михаил подошел в клинику и ожидает в холле. Готов к приёму.",
								urgency: "normal",
								pinned: false,
								patientAttachment: {
									patientId: "p-102",
									fullName: "Кузнецов Михаил Павлович",
									cabinetNumber: "Каб. 1",
									doctorName: "Д-р Смирнов А.В.",
								},
								intercomPreset: "patient_arrived",
								intercomAcks: [],
								readByStaffIds: [],
								createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
							},
							{
								id: "demo-msg-4",
								organizationId: "demo-org",
								channelId,
								senderUserId: "user-doc",
								senderName: "Д-р Смирнов А.В.",
								senderRole: "Врач-ортопед",
								messageType: "text",
								content: "Маша, приглашай пациента в первый кабинет, всё готово.",
								urgency: "normal",
								pinned: false,
								intercomAcks: [],
								readByStaffIds: [],
								createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
							},
						]);
					} else {
						setMessages([
							{
								id: "demo-msg-5",
								organizationId: "demo-org",
								channelId,
								senderUserId: "user-head",
								senderName: "Главный врач (Марков И.В.)",
								senderRole: "Главный врач",
								messageType: "text",
								content:
									"Коллеги, сегодня в 15:00 короткая пятиминутка по новым протоколам санации.",
								urgency: "normal",
								pinned: true,
								intercomAcks: [],
								readByStaffIds: [],
								createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
							},
						]);
					}
				} else {
					setMessages([]);
				}

				markChannelAsRead(channelId);
			}
		} catch (e) {
			console.error("Ошибка загрузки сообщений:", e);
		}
	};

	const markChannelAsRead = async (channelId: string) => {
		try {
			const headers = getDenteAuthHeaders({
				"Content-Type": "application/json",
			});
			await fetch("/api/staff-chat/read", {
				method: "POST",
				headers,
				body: JSON.stringify({ channelId }),
			});
			setChannels((prev) =>
				prev.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c)),
			);
		} catch (e) {
			// Игнорируем
		}
	};

	useEffect(() => {
		loadChannels();
		loadMembers();
		loadLocations();
	}, []);

	useEffect(() => {
		if (activeChannelId) {
			loadMessages(activeChannelId);
		}
	}, [activeChannelId]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const activeChannel = useMemo(
		() => channels.find((c) => c.id === activeChannelId),
		[channels, activeChannelId],
	);

	// Отправка обычного живого текстового сообщения
	const handleSendMessage = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		const text = messageText.trim();
		if (!text || !activeChannelId || isSending) return;

		try {
			setIsSending(true);
			const headers = getDenteAuthHeaders({
				"Content-Type": "application/json",
			});
			const res = await fetch("/api/staff-chat/messages", {
				method: "POST",
				headers,
				body: JSON.stringify({
					channelId: activeChannelId,
					content: text,
					messageType: "text",
					urgency: "normal",
				}),
			});

			if (res.ok) {
				const data = await res.json();
				setMessages((prev) => [...prev, data.message]);
				setMessageText("");
				inputRef.current?.focus();
			} else {
				showToast("Не удалось отправить сообщение", "warning");
			}
		} catch (e) {
			console.error("Ошибка отправки сообщения:", e);
			showToast("Сетевая ошибка при отправке", "error");
		} finally {
			setIsSending(false);
		}
	};

	// Мгновенный 1-клик вызов интеркома
	const handleIntercomPing = async (
		presetKey: IntercomPresetKey,
		customNote?: string,
	) => {
		try {
			const headers = getDenteAuthHeaders({
				"Content-Type": "application/json",
			});
			const res = await fetch("/api/staff-chat/intercom-ping", {
				method: "POST",
				headers,
				body: JSON.stringify({
					presetKey,
					cabinetNumber: selectedLocation,
					customNote,
				}),
			});

			if (res.ok) {
				const data = await res.json();
				playIntercomChime(presetKey === "urgent_doctor_call" ? "critical" : "urgent");
				showToast(`Интерком: ${INTERCOM_PRESETS[presetKey].label} отправлен!`, "success");

				// Переключаемся на целевой канал
				const targetCh = channels.find((c) => c.slug === data.channelSlug);
				if (targetCh) {
					setActiveChannelId(targetCh.id);
					setMobileView("chat");
				}
				if (activeChannel?.slug === data.channelSlug) {
					setMessages((prev) => [...prev, data.message]);
				}
			} else {
				showToast("Ошибка интеркома", "warning");
			}
		} catch (e) {
			console.error("Ошибка интеркома:", e);
			showToast("Сетевая ошибка интеркома", "error");
		} finally {
			setQuickNotePrompt(null);
			setQuickNoteText("");
		}
	};

	// 1-клик подтверждение вызова (Ack)
	const handleIntercomAck = async (
		messageId: string,
		ackType: "on_my_way" | "coming_soon" | "busy_reassigned",
	) => {
		try {
			const headers = getDenteAuthHeaders({
				"Content-Type": "application/json",
			});
			const res = await fetch("/api/staff-chat/intercom-ack", {
				method: "POST",
				headers,
				body: JSON.stringify({ messageId, ackType }),
			});

			if (res.ok) {
				const data = await res.json();
				playIntercomChime("normal");
				showToast(
					ackType === "on_my_way"
						? "Статус: Иду! (1 мин) передан врачу"
						: ackType === "coming_soon"
							? "Статус: Через 3-5 мин передан"
							: "Статус: Занят передан",
					"success",
				);
				setMessages((prev) =>
					prev.map((m) => (m.id === messageId ? data.message : m)),
				);
			}
		} catch (e) {
			console.error("Ошибка подтверждения:", e);
		}
	};

	// Открыть личный диалог
	const handleOpenDirectChat = async (targetUserId: string) => {
		try {
			const headers = getDenteAuthHeaders({
				"Content-Type": "application/json",
			});
			const res = await fetch("/api/staff-chat/channels/direct", {
				method: "POST",
				headers,
				body: JSON.stringify({ targetUserId }),
			});

			if (res.ok) {
				const data = await res.json();
				setChannels((prev) => {
					if (prev.some((c) => c.id === data.channel.id)) return prev;
					return [...prev, data.channel];
				});
				setActiveChannelId(data.channel.id);
				setMobileView("chat");
			}
		} catch (e) {
			console.error("Ошибка открытия чата:", e);
		}
	};

	return (
		<div
			className="staff-messenger-container flex flex-col md:flex-row h-[780px] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] rounded-2xl overflow-hidden shadow-xl"
			data-testid="staff-messenger-panel"
		>
			{/* Левая боковая панель: Каналы и коллеги */}
			<div
				className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] bg-slate-50 dark:bg-[var(--paper-soft,#0f172a)] flex flex-col ${
					mobileView === "chat" ? "hidden md:flex" : "flex"
				}`}
			>
				{/* Шапка списка каналов */}
				<div className="p-4 border-b border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
							<Radio size={16} />
						</div>
						<div>
							<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
								Персонал & Интерком
							</h3>
							<div className="flex items-center gap-1.5 text-[11px] text-teal-600 dark:text-teal-400 font-medium">
								<Wifi size={10} className="animate-pulse" />
								<span>LAN брокер онлайн</span>
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={() => playIntercomChime("normal")}
						className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
						title="Тест звукового оповещения интеркома"
					>
						<Volume2 size={15} />
					</button>
				</div>

				{/* Список каналов клиники */}
				<div className="flex-1 overflow-y-auto p-3 space-y-4">
					<div>
						<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
							<span>Каналы клиники</span>
							<span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-bold">
								{channels.filter((c) => c.type === "channel").length}
							</span>
						</div>
						<div className="space-y-1">
							{channels
								.filter((c) => c.type === "channel")
								.map((ch) => {
									const isActive = ch.id === activeChannelId;
									return (
										<button
											key={ch.id}
											type="button"
											onClick={() => {
												setActiveChannelId(ch.id);
												setMobileView("chat");
											}}
											className={`staff-chat-channel-btn ${isActive ? "active" : ""}`}
											data-testid={`staff-chat-channel-${ch.slug || ch.id}`}
										>
											<div className="flex items-center gap-2.5 truncate">
												<span className={isActive ? "text-white" : "text-teal-600 dark:text-teal-400"}>
													{ch.slug === "general" ? (
														<Hospital size={15} />
													) : ch.slug === "reception" ? (
														<Bell size={15} />
													) : ch.slug === "intercom_assistants" ? (
														<Headphones size={15} />
													) : (
														<MessageSquare size={15} />
													)}
												</span>
												<span className="truncate">#{ch.name}</span>
											</div>
											{ch.unreadCount > 0 && (
												<span className="staff-chat-badge">
													{ch.unreadCount}
												</span>
											)}
										</button>
									);
								})}
						</div>
					</div>

					{/* Личные сообщения */}
					<div>
						<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
							<span>Личные диалоги</span>
							<Users size={12} className="text-slate-400" />
						</div>
						<div className="space-y-1">
							{channels
								.filter((c) => c.type === "direct")
								.map((ch) => {
									const isActive = ch.id === activeChannelId;
									return (
										<button
											key={ch.id}
											type="button"
											onClick={() => {
												setActiveChannelId(ch.id);
												setMobileView("chat");
											}}
											className={`staff-chat-channel-btn ${isActive ? "active" : ""}`}
										>
											<div className="flex items-center gap-2 truncate">
												<User size={14} className={isActive ? "text-white" : "text-slate-400"} />
												<span className="truncate">{ch.name}</span>
											</div>
											{ch.unreadCount > 0 && (
												<span className="staff-chat-badge">
													{ch.unreadCount}
												</span>
											)}
										</button>
									);
								})}
						</div>
					</div>

					{/* Список сотрудников и онлайн-статус */}
					<div>
						<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-1.5">
							<span>Сотрудники ({members.length})</span>
						</div>
						<div className="space-y-1 max-h-48 overflow-y-auto">
							{members.map((m) => (
								<div
									key={m.staffId}
									className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-200/40 dark:hover:bg-slate-800/40 transition-all"
								>
									<div className="flex items-center gap-2 truncate">
										<span
											className={`w-2 h-2 rounded-full flex-shrink-0 ${
												m.status === "online"
													? "bg-emerald-500 shadow-xs"
													: m.status === "in_visit"
														? "bg-amber-500 animate-pulse"
														: "bg-slate-400 opacity-50"
											}`}
											title={
												m.status === "online"
													? "В сети"
													: m.status === "in_visit"
														? "На приёме"
														: "Офлайн"
											}
										/>
										<div className="truncate">
											<div className="truncate font-medium text-slate-800 dark:text-slate-200">
												{m.fullName}
											</div>
											<div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
												{m.role} {m.cabinetNumber ? `• Каб. ${m.cabinetNumber}` : ""}
											</div>
										</div>
									</div>
									<button
										type="button"
										onClick={() => handleOpenDirectChat(m.staffId)}
										className="p-1 rounded text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 text-[11px] font-semibold cursor-pointer"
										title="Написать личное сообщение"
									>
										Чат
									</button>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Правая панель: Чат живого общения и интерком */}
			<div
				className={`flex-1 flex flex-col bg-[var(--paper,#ffffff)] dark:bg-[var(--paper,#0f172a)] ${
					mobileView === "channels" ? "hidden md:flex" : "flex"
				}`}
			>
				{/* Шапка чата */}
				<div className="p-3 sm:p-4 border-b border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/40">
					<div className="flex items-center gap-2 min-w-0 flex-1">
						{/* Кнопка «Назад к каналам» для смартфонов */}
						<button
							type="button"
							onClick={() => setMobileView("channels")}
							className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
							title="Назад к каналам"
						>
							<ArrowLeft size={18} />
						</button>

						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 truncate">
									{activeChannel?.type === "channel" ? "#" : "@"}
									{activeChannel?.name || "Выберите канал"}
								</h3>
								{activeChannel?.isDefault && (
									<span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 font-semibold shrink-0">
										Клинический канал
									</span>
								)}
							</div>
							{activeChannel?.description && (
								<p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
									{activeChannel.description}
								</p>
							)}
						</div>
					</div>

					{/* Селектор рабочего места врача */}
					<div className="flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-slate-800 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] shadow-2xs shrink-0">
						<span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline shrink-0">
							Мой кабинет:
						</span>
						<select
							value={selectedLocation}
							onChange={(e) => setSelectedLocation(e.target.value)}
							className="text-[11px] sm:text-xs font-bold rounded bg-slate-100 dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] text-slate-900 dark:text-slate-100 px-1.5 sm:px-2 py-1 cursor-pointer focus:outline-teal-500 max-w-[125px] sm:max-w-none truncate"
							title="Выберите рабочее место для подстановки в вызов интеркома"
							data-testid="chairside-location-selector"
						>
							{locations.map((loc) => (
								<option key={loc.id} value={loc.name}>
									{loc.name}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* 1-Click Chairside Intercom Presets (Быстрые сигналы у кресла) */}
				<div
					className="px-2 sm:px-4 py-2 bg-slate-100/70 dark:bg-slate-900/60 border-b border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] flex items-center gap-1.5 sm:gap-2 overflow-x-auto whitespace-nowrap scrollbar-none"
					data-testid="chairside-intercom-pings-bar"
				>
					<span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1 shrink-0 hidden sm:inline">
						Интерком 1-клик:
					</span>

					{/* 1. Вызов ассистента */}
					<button
						type="button"
						onClick={() => handleIntercomPing("call_assistant")}
						className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
						data-testid="intercom-btn-call-assistant"
						title="Срочно вызвать ассистента в кабинет"
					>
						<span>🪑</span>
						<span>Вызов ассистента в каб.</span>
					</button>

					{/* 2. Пациент в холле */}
					<button
						type="button"
						onClick={() => handleIntercomPing("patient_arrived")}
						className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-300 hover:bg-teal-500/25 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
						data-testid="intercom-btn-patient-arrived"
						title="Пациент подошел и ожидает"
					>
						<span>🛎️</span>
						<span>Пациент в холле</span>
					</button>

					{/* 3. Готов снимок КТ */}
					<button
						type="button"
						onClick={() => handleIntercomPing("xray_ready")}
						className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-300 hover:bg-blue-500/25 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
						data-testid="intercom-btn-xray-ready"
						title="Снимок КТ загружен"
					>
						<span>📷</span>
						<span>Готов снимок КТ</span>
					</button>

					{/* 4. Работа из ЗТЛ */}
					<button
						type="button"
						onClick={() => handleIntercomPing("lab_work_ready")}
						className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-500/25 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
						data-testid="intercom-btn-lab-ready"
						title="Ортопедическая работа поступила"
					>
						<span>🦷</span>
						<span>Работа из ЗТЛ</span>
					</button>

					{/* 5. Экстренный вызов SOS */}
					<button
						type="button"
						onClick={() => handleIntercomPing("urgent_doctor_call")}
						className="shrink-0 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 border border-rose-500/40 text-rose-800 dark:text-rose-300 hover:bg-rose-500/30 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
						data-testid="intercom-btn-urgent-doctor"
						title="Срочный вызов дежурного врача"
					>
						<span>🚨</span>
						<span>Срочно врача!</span>
					</button>
				</div>

				{/* Лента живых сообщений */}
				<div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
					{messages.length === 0 ? (
						<div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
							<MessageSquare size={40} className="opacity-30 mb-2" />
							<p className="text-sm font-semibold">Сообщений пока нет</p>
							<p className="text-xs max-w-xs mt-1">
								Напишите коллеге или отправьте быстрый вызов через кнопки интеркома выше.
							</p>
						</div>
					) : (
						messages.map((m) => {
							const isPing = m.messageType === "intercom_ping";
							const isUrgent = m.urgency === "urgent";
							const isCritical = m.urgency === "critical";

							return (
								<div
									key={m.id}
									className={`staff-message-bubble ${
										isCritical
											? "bubble-critical"
											: isUrgent
												? "bubble-urgent"
												: isPing
													? "bubble-ping"
													: ""
									}`}
									data-testid={`staff-message-${m.id}`}
								>
									{/* Шапка сообщения */}
									<div className="flex items-center justify-between mb-1.5">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-xs font-bold text-slate-900 dark:text-slate-100">
												{m.senderName}
											</span>
											<span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium">
												{m.senderRole}
											</span>
											{isPing && (
												<span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-teal-500/20 text-teal-800 dark:text-teal-300">
													ИНТЕРКОМ
												</span>
											)}
											{isUrgent && (
												<span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center gap-1">
													<AlertTriangle size={10} /> СРОЧНО
												</span>
											)}
											{isCritical && (
												<span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-500/30 text-rose-800 dark:text-rose-200 flex items-center gap-1">
													<ShieldAlert size={10} /> ЭКСТРЕННО
												</span>
											)}
										</div>
										<span className="text-[11px] text-slate-400">
											{new Date(m.createdAt).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</span>
									</div>

									{/* Текст сообщения */}
									<div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
										{m.content}
									</div>

									{/* Прикрепление карточки пациента (если есть) */}
									{m.patientAttachment && (
										<div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] flex items-center justify-between shadow-2xs">
											<div className="flex items-center gap-2.5">
												<div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
													<User size={16} />
												</div>
												<div>
													<div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
														<span>{m.patientAttachment.fullName}</span>
														{m.patientAttachment.hasAllergyAlert && (
															<span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-800 dark:text-rose-300 font-bold">
																АЛЛЕРГИЯ
															</span>
														)}
													</div>
													<div className="text-[10px] text-slate-500 dark:text-slate-400">
														{m.patientAttachment.cabinetNumber && (
															<span>{m.patientAttachment.cabinetNumber} • </span>
														)}
														Врач: {m.patientAttachment.doctorName || "Не указан"}
													</div>
												</div>
											</div>

											{onOpenPatientCard && (
												<button
													type="button"
													onClick={() =>
														onOpenPatientCard(m.patientAttachment!.patientId)
													}
													className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 text-white hover:bg-teal-500 transition-all cursor-pointer min-h-[34px]"
												>
													Открыть ЭМК
												</button>
											)}
										</div>
									)}

									{/* Подтверждения от коллег (Ack-Loop) */}
									{isPing && (
										<div className="mt-2.5 pt-2 border-t border-[var(--line,#e2e8f0)]/60 dark:border-[var(--line,#334155)]/60 flex items-center justify-between flex-wrap gap-2">
											{Array.isArray(m.intercomAcks) && m.intercomAcks.length > 0 ? (
												<div className="flex items-center gap-1.5 flex-wrap">
													{m.intercomAcks.map((ack, idx) => (
														<span
															key={idx}
															className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold"
														>
															<CheckCheck size={12} />
															<span>{ack.staffName}: {ack.ackType === "on_my_way" ? "Иду! (1 мин)" : "Буду через 3-5 мин"}</span>
														</span>
													))}
												</div>
											) : (
												<div className="flex items-center gap-1.5">
													<button
														type="button"
														onClick={() => handleIntercomAck(m.id, "on_my_way")}
														className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-all cursor-pointer shadow-2xs"
													>
														🏃 Иду! (1 мин)
													</button>
													<button
														type="button"
														onClick={() => handleIntercomAck(m.id, "coming_soon")}
														className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all cursor-pointer"
													>
														⏱ 3-5 мин
													</button>
												</div>
											)}
										</div>
									)}
								</div>
							);
						})
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Панель живого ввода сообщения */}
				<form
					onSubmit={handleSendMessage}
					className="p-3 border-t border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] bg-slate-50/60 dark:bg-slate-900/60 flex items-center gap-2"
				>
					<input
						ref={inputRef}
						type="text"
						value={messageText}
						onChange={(e) => setMessageText(e.target.value)}
						placeholder={`Сообщение в #${activeChannel?.name || "чат"}... (Enter для отправки)`}
						className="flex-1 bg-white dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500 min-h-[44px]"
						data-testid="staff-chat-input"
					/>
					<button
						type="submit"
						disabled={!messageText.trim() || isSending}
						className="min-h-[44px] px-4 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-500 disabled:opacity-40 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
						data-testid="staff-chat-send-btn"
					>
						<Send size={15} />
						<span className="hidden sm:inline">Отправить</span>
					</button>
				</form>
			</div>
		</div>
	);
};
