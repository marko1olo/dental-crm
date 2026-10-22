import type { IntercomLocationItem, StaffChatChannel, StaffChatMessage } from "@dental/shared";

export function getDemoLocations(): IntercomLocationItem[] {
	return [
		{ id: "loc-1", name: "Каб. 1 (Терапия)", isChair: true },
		{ id: "loc-2", name: "Каб. 2 (Хирургия/Имплантация)", isChair: true },
		{ id: "loc-3", name: "Каб. 3 (Ортопедия)", isChair: true },
		{ id: "loc-4", name: "Рентген / КЛКТ", isChair: false },
	];
}

export function getDemoChannels(): StaffChatChannel[] {
	return [
		{
			id: "demo-ch-1", organizationId: "demo-org", type: "channel", slug: "general",
			name: "Общий чат", description: "Объявления, смены, оперативные вопросы клиники",
			icon: "hospital", isDefault: true, unreadCount: 0, createdAt: new Date().toISOString(),
		},
		{
			id: "demo-ch-2", organizationId: "demo-org", type: "channel", slug: "reception",
			name: "Ресепшен и визиты", description: "Приход пациентов, оформление, координация приёма",
			icon: "bell", isDefault: true, unreadCount: 1, createdAt: new Date().toISOString(),
		},
		{
			id: "demo-ch-3", organizationId: "demo-org", type: "channel", slug: "intercom_assistants",
			name: "Интерком и ассистенты", description: "Вызовы к установке, материалы, помощь врачам",
			icon: "chair", isDefault: true, unreadCount: 2, createdAt: new Date().toISOString(),
		},
		{
			id: "demo-ch-4", organizationId: "demo-org", type: "channel", slug: "lab_ztl",
			name: "Лаборатория ЗТЛ", description: "Наряды, примерки, цвет Vita, обсуждение коронок",
			icon: "tooth", isDefault: true, unreadCount: 0, createdAt: new Date().toISOString(),
		},
	];
}

export function getDemoMessages(channelId: string, slug?: string): StaffChatMessage[] {
	if (slug === "intercom_assistants") {
		return [
			{
				id: "demo-msg-1", organizationId: "demo-org", channelId, senderUserId: "user-doc",
				senderName: "Д-р Смирнов А.В.", senderRole: "Врач-ортопед", messageType: "intercom_ping",
				content: "Срочно требуется ассистент в Каб. 1 (Терапия)! Повод: Коффердам / изоляция. Нужен плотный синий платок и кламп 2A.",
				urgency: "urgent", pinned: false,
				patientAttachment: {
					patientId: "p-101", fullName: "Иванова Екатерина Сергеевна", cabinetNumber: "Каб. 1",
					doctorName: "Д-р Смирнов А.В.", hasAllergyAlert: true,
				},
				intercomPreset: "call_assistant",
				intercomAcks: [{
					staffId: "user-asst", staffName: "Ассистент Анна", staffRole: "Ассистент",
					ackType: "on_my_way", customComment: "Иду, уже несу", timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
				}],
				readByStaffIds: [], createdAt: new Date(Date.now() - 6 * 60000).toISOString(),
			},
			{
				id: "demo-msg-2", organizationId: "demo-org", channelId, senderUserId: "user-asst",
				senderName: "Ассистент Анна", senderRole: "Ассистент", messageType: "text",
				content: "Алексей Владимирович, платок и клампы на столике у установки.",
				urgency: "normal", pinned: false, intercomAcks: [], readByStaffIds: [],
				createdAt: new Date(Date.now() - 4 * 60000).toISOString(),
			},
		];
	}
	if (slug === "reception") {
		return [
			{
				id: "demo-msg-3", organizationId: "demo-org", channelId, senderUserId: "user-rec",
				senderName: "Ресепшен (Мария)", senderRole: "Администратор", messageType: "intercom_ping",
				content: "Пациент Кузнецов Михаил подошел в клинику и ожидает в холле. Готов к приёму.",
				urgency: "normal", pinned: false,
				patientAttachment: { patientId: "p-102", fullName: "Кузнецов Михаил Павлович", cabinetNumber: "Каб. 1", doctorName: "Д-р Смирнов А.В." },
				intercomPreset: "patient_arrived", intercomAcks: [], readByStaffIds: [],
				createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
			},
			{
				id: "demo-msg-4", organizationId: "demo-org", channelId, senderUserId: "user-doc",
				senderName: "Д-р Смирнов А.В.", senderRole: "Врач-ортопед", messageType: "text",
				content: "Принято, заканчиваем полировку композита, через 5 минут приглашайте.",
				urgency: "normal", pinned: false, intercomAcks: [], readByStaffIds: [],
				createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
			},
		];
	}
	return [
		{
			id: "demo-msg-5", organizationId: "demo-org", channelId, senderUserId: "user-admin",
			senderName: "Старший администратор", senderRole: "Руководитель", messageType: "text",
			content: "Коллеги, завтра в 08:30 пятиминутка по новым автоклавам. Просьба не опаздывать.",
			urgency: "normal", pinned: true, intercomAcks: [], readByStaffIds: [],
			createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
		},
	];
}
