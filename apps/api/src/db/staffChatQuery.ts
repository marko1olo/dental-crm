import {
	DEFAULT_CLINIC_CHANNELS,
	INTERCOM_PRESETS,
	type IntercomAck,
	type IntercomAckType,
	type IntercomLocationItem,
	type IntercomPresetKey,
	type PatientCardAttachment,
	type SendIntercomPingInput,
	type SendStaffChatMessageInput,
	type StaffChatChannel,
	type StaffChatMessage,
	type StaffChatUrgency,
} from "@dental/shared";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { db } from "./client.js";
import { chairs, staffChatChannels, staffChatMessages, users } from "./schema.js";

/**
 * Гарантирует наличие 4 стандартных климатических каналов клиники:
 * 1. #общий (general)
 * 2. #ресепшен (reception)
 * 3. #интерком-ассистенты (intercom_assistants)
 * 4. #лаборатория-зтл (lab_ztl)
 */
export async function ensureDefaultStaffChannels(
	organizationId: string,
): Promise<void> {
	const existing = await db
		.select({ slug: staffChatChannels.slug })
		.from(staffChatChannels)
		.where(
			and(
				eq(staffChatChannels.organizationId, organizationId),
				eq(staffChatChannels.type, "channel"),
			),
		);

	const existingSlugs = new Set(existing.map((e) => e.slug).filter(Boolean));

	for (const def of DEFAULT_CLINIC_CHANNELS) {
		if (!existingSlugs.has(def.slug)) {
			await db.insert(staffChatChannels).values({
				organizationId,
				type: "channel",
				slug: def.slug,
				name: def.name,
				description: def.description,
				icon: def.icon,
				isDefault: true,
			});
		}
	}
}

/**
 * Получить список всех каналов и личных диалогов сотрудника.
 */
export async function listStaffChannels(
	organizationId: string,
	currentUserId?: string,
): Promise<StaffChatChannel[]> {
	// Гарантируем дефолтные каналы
	await ensureDefaultStaffChannels(organizationId);

	// Условие выборки каналов: общие каналы + личные чаты текущего пользователя
	const channelFilter = currentUserId
		? and(
				eq(staffChatChannels.organizationId, organizationId),
				or(
					eq(staffChatChannels.type, "channel"),
					and(
						eq(staffChatChannels.type, "direct"),
						or(
							eq(staffChatChannels.directUser1Id, currentUserId),
							eq(staffChatChannels.directUser2Id, currentUserId),
						),
					),
				),
			)
		: and(
				eq(staffChatChannels.organizationId, organizationId),
				eq(staffChatChannels.type, "channel"),
			);

	const rawChannels = await db
		.select()
		.from(staffChatChannels)
		.where(channelFilter)
		.orderBy(asc(staffChatChannels.isDefault), asc(staffChatChannels.name));

	// Собираем всех пользователей для подстановки имен в Direct чатах
	const directUserIds = new Set<string>();
	for (const ch of rawChannels) {
		if (ch.type === "direct") {
			if (ch.directUser1Id) directUserIds.add(ch.directUser1Id);
			if (ch.directUser2Id) directUserIds.add(ch.directUser2Id);
		}
	}

	const userMap = new Map<string, { fullName: string; role: string }>();
	if (directUserIds.size > 0) {
		const userRows = await db
			.select({
				id: users.id,
				fullName: users.fullName,
				role: users.role,
			})
			.from(users)
			.where(
				and(
					eq(users.organizationId, organizationId),
					sql`${users.id} = ANY(${Array.from(directUserIds)})`,
				),
			);
		for (const u of userRows) {
			userMap.set(u.id, { fullName: u.fullName, role: u.role });
		}
	}

	// Получаем последнее сообщение и счётчик непрочитанных для каждого канала
	const result: StaffChatChannel[] = [];

	for (const ch of rawChannels) {
		// Последнее сообщение
		const [lastMsg] = await db
			.select()
			.from(staffChatMessages)
			.where(
				and(
					eq(staffChatMessages.organizationId, organizationId),
					eq(staffChatMessages.channelId, ch.id),
				),
			)
			.orderBy(desc(staffChatMessages.createdAt))
			.limit(1);

		// Счётчик непрочитанных для currentUserId
		let unreadCount = 0;
		if (currentUserId) {
			const countRes = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(staffChatMessages)
				.where(
					and(
						eq(staffChatMessages.organizationId, organizationId),
						eq(staffChatMessages.channelId, ch.id),
						sql`NOT (${staffChatMessages.readByStaffIds} @> ${JSON.stringify([currentUserId])}::jsonb)`,
					),
				);
			unreadCount = countRes[0]?.count ?? 0;
		}

		let name = ch.name;
		let description = ch.description;

		// Если это direct-чат, подставляем имя и роль собеседника
		if (ch.type === "direct" && currentUserId) {
			const peerId =
				ch.directUser1Id === currentUserId ? ch.directUser2Id : ch.directUser1Id;
			if (peerId && userMap.has(peerId)) {
				const peer = userMap.get(peerId)!;
				name = peer.fullName;
				description = `Личные сообщения (${peer.role})`;
			}
		}

		result.push({
			id: ch.id,
			organizationId: ch.organizationId,
			type: ch.type as "channel" | "direct",
			slug: ch.slug,
			name,
			description,
			icon: ch.icon,
			isDefault: ch.isDefault,
			directUser1Id: ch.directUser1Id,
			directUser2Id: ch.directUser2Id,
			unreadCount,
			lastMessage: lastMsg
				? {
						id: lastMsg.id,
						organizationId: lastMsg.organizationId,
						channelId: lastMsg.channelId,
						senderUserId: lastMsg.senderUserId,
						senderName: lastMsg.senderName,
						senderRole: lastMsg.senderRole,
						messageType: lastMsg.messageType as
							| "text"
							| "intercom_ping"
							| "patient_card",
						content: lastMsg.content,
						urgency: lastMsg.urgency as StaffChatUrgency,
						pinned: lastMsg.pinned,
						patientAttachment:
							lastMsg.patientAttachment as PatientCardAttachment | null,
						intercomPreset: lastMsg.intercomPreset as IntercomPresetKey | null,
						targetAudience: lastMsg.targetAudience ?? null,
						intercomAcks: (lastMsg.intercomAcks as IntercomAck[]) || [],
						metadata: lastMsg.metadata as Record<string, unknown> | null,
						readByStaffIds: (lastMsg.readByStaffIds as string[]) || [],
						createdAt: lastMsg.createdAt.toISOString(),
					}
				: null,
			createdAt: ch.createdAt.toISOString(),
			updatedAt: ch.updatedAt ? ch.updatedAt.toISOString() : undefined,
		});
	}

	return result;
}

/**
 * Найти или создать личный диалог (Direct Chat) между двумя сотрудниками.
 */
export async function getOrCreateDirectStaffChannel(
	organizationId: string,
	currentUserId: string,
	targetUserId: string,
): Promise<StaffChatChannel> {
	if (currentUserId === targetUserId) {
		throw new Error("Нельзя создать личный диалог с самим собой");
	}

	// Детерминированный порядок пользователей
	const [u1, u2] =
		currentUserId < targetUserId
			? [currentUserId, targetUserId]
			: [targetUserId, currentUserId];

	// Ищем существующий канал
	let [channel] = await db
		.select()
		.from(staffChatChannels)
		.where(
			and(
				eq(staffChatChannels.organizationId, organizationId),
				eq(staffChatChannels.type, "direct"),
				eq(staffChatChannels.directUser1Id, u1),
				eq(staffChatChannels.directUser2Id, u2),
			),
		)
		.limit(1);

	if (!channel) {
		// Получаем данные собеседника
		const [targetUser] = await db
			.select({ fullName: users.fullName, role: users.role })
			.from(users)
			.where(
				and(eq(users.organizationId, organizationId), eq(users.id, targetUserId)),
			)
			.limit(1);

		const defaultName = targetUser?.fullName || "Личный диалог";
		const defaultDesc = targetUser ? `Роль: ${targetUser.role}` : null;

		const [created] = await db
			.insert(staffChatChannels)
			.values({
				organizationId,
				type: "direct",
				slug: null,
				name: defaultName,
				description: defaultDesc,
				icon: "user",
				isDefault: false,
				directUser1Id: u1,
				directUser2Id: u2,
			})
			.returning();

		if (!created) {
			throw new Error("Не удалось создать личный диалог");
		}
		channel = created;
	}

	if (!channel) {
		throw new Error("Канал не найден");
	}

	return {
		id: channel.id,
		organizationId: channel.organizationId,
		type: "direct",
		slug: channel.slug,
		name: channel.name,
		description: channel.description,
		icon: channel.icon,
		isDefault: channel.isDefault,
		directUser1Id: channel.directUser1Id,
		directUser2Id: channel.directUser2Id,
		unreadCount: 0,
		lastMessage: null,
		createdAt: channel.createdAt.toISOString(),
		updatedAt: channel.updatedAt ? channel.updatedAt.toISOString() : undefined,
	};
}

/**
 * Получить сообщения канала (с пагинацией).
 */
export async function listStaffMessages(
	organizationId: string,
	channelId: string,
	limit = 50,
	beforeTimestamp?: Date,
): Promise<StaffChatMessage[]> {
	const conditions = [
		eq(staffChatMessages.organizationId, organizationId),
		eq(staffChatMessages.channelId, channelId),
	];

	if (beforeTimestamp) {
		conditions.push(sql`${staffChatMessages.createdAt} < ${beforeTimestamp}`);
	}

	const rows = await db
		.select()
		.from(staffChatMessages)
		.where(and(...conditions))
		.orderBy(desc(staffChatMessages.createdAt))
		.limit(limit);

	// Возвращаем в хронологическом порядке (старые вверху, новые внизу)
	return rows.reverse().map((m) => ({
		id: m.id,
		organizationId: m.organizationId,
		channelId: m.channelId,
		senderUserId: m.senderUserId,
		senderName: m.senderName,
		senderRole: m.senderRole,
		messageType: m.messageType as "text" | "intercom_ping" | "patient_card",
		content: m.content,
		urgency: m.urgency as StaffChatUrgency,
		pinned: m.pinned,
		patientAttachment: m.patientAttachment as PatientCardAttachment | null,
		intercomPreset: m.intercomPreset as IntercomPresetKey | null,
		targetAudience: m.targetAudience ?? null,
		intercomAcks: (m.intercomAcks as IntercomAck[]) || [],
		metadata: m.metadata as Record<string, unknown> | null,
		readByStaffIds: (m.readByStaffIds as string[]) || [],
		createdAt: m.createdAt.toISOString(),
	}));
}

/**
 * Отправить сообщение в канал или личный диалог.
 */
export async function insertStaffMessage(params: {
	organizationId: string;
	channelId: string;
	senderUserId?: string | null;
	senderName: string;
	senderRole: string;
	messageType?: "text" | "intercom_ping" | "patient_card";
	content: string;
	urgency?: StaffChatUrgency;
	pinned?: boolean;
	patientAttachment?: PatientCardAttachment | null;
	intercomPreset?: IntercomPresetKey | null;
	targetAudience?: string | null;
	metadata?: Record<string, unknown> | null;
}): Promise<StaffChatMessage> {
	const readBy = params.senderUserId ? [params.senderUserId] : [];

	const [inserted] = await db
		.insert(staffChatMessages)
		.values({
			organizationId: params.organizationId,
			channelId: params.channelId,
			senderUserId: params.senderUserId || null,
			senderName: params.senderName,
			senderRole: params.senderRole,
			messageType: params.messageType || "text",
			content: params.content,
			urgency: params.urgency || "normal",
			pinned: params.pinned || false,
			patientAttachment: params.patientAttachment || null,
			intercomPreset: params.intercomPreset || null,
			targetAudience: params.targetAudience || null,
			intercomAcks: [],
			metadata: params.metadata || null,
			readByStaffIds: readBy,
		})
		.returning();

	if (!inserted) {
		throw new Error("Не удалось сохранить сообщение чата");
	}

	// Обновляем время активности канала
	await db
		.update(staffChatChannels)
		.set({ updatedAt: new Date() })
		.where(
			and(
				eq(staffChatChannels.organizationId, params.organizationId),
				eq(staffChatChannels.id, params.channelId),
			),
		);

	return {
		id: inserted.id,
		organizationId: inserted.organizationId,
		channelId: inserted.channelId,
		senderUserId: inserted.senderUserId,
		senderName: inserted.senderName,
		senderRole: inserted.senderRole,
		messageType: inserted.messageType as "text" | "intercom_ping" | "patient_card",
		content: inserted.content,
		urgency: inserted.urgency as StaffChatUrgency,
		pinned: inserted.pinned,
		patientAttachment: inserted.patientAttachment as PatientCardAttachment | null,
		intercomPreset: inserted.intercomPreset as IntercomPresetKey | null,
		targetAudience: inserted.targetAudience ?? null,
		intercomAcks: (inserted.intercomAcks as IntercomAck[]) || [],
		metadata: inserted.metadata as Record<string, unknown> | null,
		readByStaffIds: (inserted.readByStaffIds as string[]) || [],
		createdAt: inserted.createdAt.toISOString(),
	};
}

/**
 * Записать подтверждение (Ack) интерком-вызова сотрудником.
 * Двусторонний Ack-loop: [🏃 Иду! (1 мин)], [⏱ Через 3-5 мин], [❌ Занят].
 */
export async function recordIntercomAck(params: {
	organizationId: string;
	messageId: string;
	staffId: string;
	staffName: string;
	staffRole: string;
	ackType: IntercomAckType;
	customComment?: string;
}): Promise<StaffChatMessage | null> {
	const ackItem: IntercomAck = {
		staffId: params.staffId,
		staffName: params.staffName,
		staffRole: params.staffRole,
		ackType: params.ackType,
		customComment: params.customComment,
		timestamp: new Date().toISOString(),
	};

	const [updated] = await db
		.update(staffChatMessages)
		.set({
			intercomAcks: sql`COALESCE(${staffChatMessages.intercomAcks}, '[]'::jsonb) || ${JSON.stringify([ackItem])}::jsonb`,
		})
		.where(
			and(
				eq(staffChatMessages.organizationId, params.organizationId),
				eq(staffChatMessages.id, params.messageId),
			),
		)
		.returning();

	if (!updated) return null;

	return {
		id: updated.id,
		organizationId: updated.organizationId,
		channelId: updated.channelId,
		senderUserId: updated.senderUserId,
		senderName: updated.senderName,
		senderRole: updated.senderRole,
		messageType: updated.messageType as "text" | "intercom_ping" | "patient_card",
		content: updated.content,
		urgency: updated.urgency as StaffChatUrgency,
		pinned: updated.pinned,
		patientAttachment: updated.patientAttachment as PatientCardAttachment | null,
		intercomPreset: updated.intercomPreset as IntercomPresetKey | null,
		targetAudience: updated.targetAudience ?? null,
		intercomAcks: (updated.intercomAcks as IntercomAck[]) || [],
		metadata: updated.metadata as Record<string, unknown> | null,
		readByStaffIds: (updated.readByStaffIds as string[]) || [],
		createdAt: updated.createdAt.toISOString(),
	};
}

/**
 * Получить список реальных кресел и кабинетов клиники для интеркома.
 */
export async function listClinicIntercomLocations(
	organizationId: string,
): Promise<IntercomLocationItem[]> {
	const dbChairs = await db
		.select({
			id: chairs.id,
			name: chairs.name,
		})
		.from(chairs)
		.where(
			and(eq(chairs.organizationId, organizationId), eq(chairs.isActive, true)),
		)
		.orderBy(asc(chairs.name));

	if (dbChairs.length > 0) {
		return dbChairs.map((c) => ({
			id: c.id,
			name: c.name,
			isChair: true,
		}));
	}

	// Fallback дефолтных клинических кабинетов клиники
	return [
		{ id: "cab-1", name: "Кабинет 1 (Терапия)", isChair: false },
		{ id: "cab-2", name: "Кабинет 2 (Хирургия/Имплантация)", isChair: false },
		{ id: "cab-3", name: "Кабинет 3 (Ортопедия)", isChair: false },
		{ id: "cab-4", name: "Кабинет 4 (Детство/Ортодонтия)", isChair: false },
		{ id: "cab-xray", name: "Рентген / КЛКТ", isChair: false },
	];
}

/**
 * Пометить все сообщения канала как прочитанные для сотрудника.
 */
export async function markStaffChannelAsRead(
	organizationId: string,
	channelId: string,
	userId: string,
): Promise<number> {
	// Добавляем userId в jsonb массив read_by_staff_ids, если его там ещё нет
	const result = await db.execute(sql`
		UPDATE staff_chat_messages
		SET read_by_staff_ids = read_by_staff_ids || ${JSON.stringify([userId])}::jsonb
		WHERE organization_id = ${organizationId}::uuid
		  AND channel_id = ${channelId}::uuid
		  AND NOT (read_by_staff_ids @> ${JSON.stringify([userId])}::jsonb)
	`);

	return result.rowCount ?? 0;
}

/**
 * Найти канал по ID.
 */
export async function getStaffChannelById(
	organizationId: string,
	channelId: string,
): Promise<StaffChatChannel | null> {
	const [ch] = await db
		.select()
		.from(staffChatChannels)
		.where(
			and(
				eq(staffChatChannels.organizationId, organizationId),
				eq(staffChatChannels.id, channelId),
			),
		)
		.limit(1);

	if (!ch) return null;

	return {
		id: ch.id,
		organizationId: ch.organizationId,
		type: ch.type as "channel" | "direct",
		slug: ch.slug,
		name: ch.name,
		description: ch.description,
		icon: ch.icon,
		isDefault: ch.isDefault,
		directUser1Id: ch.directUser1Id,
		directUser2Id: ch.directUser2Id,
		unreadCount: 0,
		lastMessage: null,
		createdAt: ch.createdAt.toISOString(),
		updatedAt: ch.updatedAt ? ch.updatedAt.toISOString() : undefined,
	};
}

/**
 * Найти канал по слагу (например "intercom_assistants", "reception", "lab_ztl").
 */
export async function getStaffChannelBySlug(
	organizationId: string,
	slug: string,
): Promise<StaffChatChannel | null> {
	await ensureDefaultStaffChannels(organizationId);

	const [ch] = await db
		.select()
		.from(staffChatChannels)
		.where(
			and(
				eq(staffChatChannels.organizationId, organizationId),
				eq(staffChatChannels.slug, slug),
			),
		)
		.limit(1);

	if (!ch) return null;

	return {
		id: ch.id,
		organizationId: ch.organizationId,
		type: ch.type as "channel" | "direct",
		slug: ch.slug,
		name: ch.name,
		description: ch.description,
		icon: ch.icon,
		isDefault: ch.isDefault,
		directUser1Id: ch.directUser1Id,
		directUser2Id: ch.directUser2Id,
		unreadCount: 0,
		lastMessage: null,
		createdAt: ch.createdAt.toISOString(),
		updatedAt: ch.updatedAt ? ch.updatedAt.toISOString() : undefined,
	};
}

/**
 * Получить список всех активных сотрудников клиники для мессенджера/интеркома.
 */
export async function listStaffMembersForChat(
	organizationId: string,
): Promise<
	Array<{
		id: string;
		fullName: string;
		role: string;
		phone: string | null;
		email: string | null;
	}>
> {
	return db
		.select({
			id: users.id,
			fullName: users.fullName,
			role: users.role,
			phone: users.phone,
			email: users.email,
		})
		.from(users)
		.where(
			and(eq(users.organizationId, organizationId), eq(users.isActive, true)),
		)
		.orderBy(asc(users.fullName));
}
