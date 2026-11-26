import type {
	IntercomAck,
	IntercomPresetKey,
	PatientCardAttachment,
	StaffChatChannel,
	StaffChatMessage,
	StaffChatUrgency,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../rls.js";
import { staffChatChannels, type staffChatMessages } from "../schema.js";

export class StaffChatChannelNotFoundError extends Error {
	readonly statusCode = 404;
	readonly code = "ChannelNotFound";
	constructor(message = "Канал или личный диалог не найден.") {
		super(message);
		this.name = "StaffChatChannelNotFoundError";
	}
}

export class StaffChatAccessDeniedError extends Error {
	readonly statusCode = 403;
	readonly code = "Forbidden";
	constructor(message = "Доступ к личному диалогу других сотрудников запрещён.") {
		super(message);
		this.name = "StaffChatAccessDeniedError";
	}
}

export class StaffChatValidationError extends Error {
	readonly statusCode = 400;
	readonly code = "ValidationError";
	constructor(message: string) {
		super(message);
		this.name = "StaffChatValidationError";
	}
}

export class StaffChatEntityNotFoundError extends Error {
	readonly statusCode = 404;
	readonly code = "NotFound";
	constructor(message: string) {
		super(message);
		this.name = "StaffChatEntityNotFoundError";
	}
}

export async function assertChannelAccessInDb(
	executor: TenantDb,
	organizationId: string,
	channelId: string,
	currentUserId?: string | null,
): Promise<typeof staffChatChannels.$inferSelect> {
	const [channel] = await executor
		.select()
		.from(staffChatChannels)
		.where(
			and(
				eq(staffChatChannels.organizationId, organizationId),
				eq(staffChatChannels.id, channelId),
			),
		)
		.limit(1);

	if (!channel) {
		throw new StaffChatChannelNotFoundError();
	}

	if (channel.type === "direct") {
		if (
			!currentUserId ||
			(channel.directUser1Id !== currentUserId &&
				channel.directUser2Id !== currentUserId)
		) {
			throw new StaffChatAccessDeniedError();
		}
	}

	return channel;
}

export function mapStaffChatMessageRow(
	m: typeof staffChatMessages.$inferSelect,
): StaffChatMessage {
	return {
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
	};
}

export function mapStaffChatChannelRow(
	ch: typeof staffChatChannels.$inferSelect,
	overrides?: {
		name?: string;
		description?: string | null;
		unreadCount?: number;
		lastMessage?: StaffChatMessage | null;
	},
): StaffChatChannel {
	return {
		id: ch.id,
		organizationId: ch.organizationId,
		type: ch.type as "channel" | "direct",
		slug: ch.slug,
		name: overrides?.name ?? ch.name,
		description:
			overrides?.description !== undefined ? overrides.description : ch.description,
		icon: ch.icon,
		isDefault: ch.isDefault,
		directUser1Id: ch.directUser1Id,
		directUser2Id: ch.directUser2Id,
		unreadCount: overrides?.unreadCount ?? 0,
		lastMessage: overrides?.lastMessage ?? null,
		createdAt: ch.createdAt.toISOString(),
		updatedAt: ch.updatedAt ? ch.updatedAt.toISOString() : undefined,
	};
}
