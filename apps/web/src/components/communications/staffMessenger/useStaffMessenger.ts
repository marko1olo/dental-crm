import {
	INTERCOM_PRESETS,
	type IntercomLocationItem,
	type IntercomPresetKey,
	type StaffChatChannel,
	type StaffChatMessage,
	type StaffMemberPresenceItem,
} from "@dental/shared";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { playIntercomChime } from "../../../lib/intercomSound";
import { showToast } from "../../GlobalToast";
import type { IntercomAckType, MobileViewMode } from "./types";

interface UseStaffMessengerOptions {
	cabinetNumber?: string;
}

export function useStaffMessenger({
	cabinetNumber = "Каб. 1",
}: UseStaffMessengerOptions = {}) {
	const [channels, setChannels] = useState<StaffChatChannel[]>([]);
	const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
	const [messages, setMessages] = useState<StaffChatMessage[]>([]);
	const [members, setMembers] = useState<StaffMemberPresenceItem[]>([]);
	const [locations, setLocations] = useState<IntercomLocationItem[]>([]);
	const [messageText, setMessageText] = useState("");
	const [selectedLocation, setSelectedLocation] = useState(cabinetNumber);
	const [isLoading, setIsLoading] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [mobileView, setMobileView] = useState<MobileViewMode>("channels");
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
								content:
									"Алексей Владимирович, платок и клампы на столике у установки.",
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
								content:
									"Маша, приглашай пациента в первый кабинет, всё готово.",
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
				playIntercomChime(
					presetKey === "urgent_doctor_call" ? "critical" : "urgent",
				);
				showToast(
					`Интерком: ${INTERCOM_PRESETS[presetKey].label} отправлен!`,
					"success",
				);

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
		ackType: IntercomAckType,
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

	return {
		channels,
		setChannels,
		activeChannelId,
		setActiveChannelId,
		activeChannel,
		messages,
		setMessages,
		members,
		locations,
		messageText,
		setMessageText,
		selectedLocation,
		setSelectedLocation,
		isLoading,
		isSending,
		mobileView,
		setMobileView,
		quickNotePrompt,
		setQuickNotePrompt,
		quickNoteText,
		setQuickNoteText,
		messagesEndRef,
		inputRef,
		loadLocations,
		loadChannels,
		loadMembers,
		loadMessages,
		markChannelAsRead,
		handleSendMessage,
		handleIntercomPing,
		handleIntercomAck,
		handleOpenDirectChat,
	};
}
