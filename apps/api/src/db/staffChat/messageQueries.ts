import type {
	IntercomPresetKey,
	PatientCardAttachment,
	StaffChatMessage,
	StaffChatUrgency,
} from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { type TenantDb, withTenantCtx } from "../rls.js";
import { staffChatChannels, staffChatMessages } from "../schema.js";
import { assertChannelAccessInDb, mapStaffChatMessageRow } from "./types.js";

/**
 * Получить сообщения канала (с проверкой участия для DM и пагинацией).
 */
export async function listStaffMessages(
	organizationId: string,
	channelId: string,
	limit = 50,
	beforeTimestamp?: Date | undefined,
	currentUserId?: string | null | undefined,
	externalTx?: TenantDb | undefined,
): Promise<StaffChatMessage[]> {
	const run = async (tx: TenantDb): Promise<StaffChatMessage[]> => {
		await assertChannelAccessInDb(tx, organizationId, channelId, currentUserId);

		const conditions = [
			eq(staffChatMessages.organizationId, organizationId),
			eq(staffChatMessages.channelId, channelId),
		];

		if (beforeTimestamp) {
			conditions.push(sql`${staffChatMessages.createdAt} < ${beforeTimestamp}`);
		}

		const rows = await tx
			.select()
			.from(staffChatMessages)
			.where(and(...conditions))
			.orderBy(desc(staffChatMessages.createdAt))
			.limit(limit);

		return rows.reverse().map(mapStaffChatMessageRow);
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}

/**
 * Отправить сообщение в канал или личный диалог в неделимой ACID-транзакции.
 */
export async function insertStaffMessage(params: {
	organizationId: string;
	channelId: string;
	senderUserId?: string | null | undefined;
	senderName: string;
	senderRole: string;
	messageType?: "text" | "intercom_ping" | "patient_card" | undefined;
	content: string;
	urgency?: StaffChatUrgency | undefined;
	pinned?: boolean | undefined;
	patientAttachment?: PatientCardAttachment | null | undefined;
	intercomPreset?: IntercomPresetKey | null | undefined;
	targetAudience?: string | null | undefined;
	metadata?: Record<string, unknown> | null | undefined;
	tx?: TenantDb | undefined;
}): Promise<StaffChatMessage> {
	const readBy = params.senderUserId ? [params.senderUserId] : [];

	const runInsert = async (tx: TenantDb) => {
		await assertChannelAccessInDb(
			tx,
			params.organizationId,
			params.channelId,
			params.senderUserId ?? null,
		);

		const [row] = await tx
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

		if (!row) {
			throw new Error("Не удалось сохранить сообщение чата");
		}

		await tx
			.update(staffChatChannels)
			.set({ updatedAt: new Date() })
			.where(
				and(
					eq(staffChatChannels.organizationId, params.organizationId),
					eq(staffChatChannels.id, params.channelId),
				),
			);

		return row;
	};

	const inserted = params.tx
		? await runInsert(params.tx)
		: await withTenantCtx(params.organizationId, runInsert);

	return mapStaffChatMessageRow(inserted);
}

/**
 * Пометить все сообщения канала как прочитанные для сотрудника (с проверкой участия в DM).
 */
export async function markStaffChannelAsRead(
	organizationId: string,
	channelId: string,
	userId: string,
	externalTx?: TenantDb | undefined,
): Promise<number> {
	const run = async (tx: TenantDb): Promise<number> => {
		await assertChannelAccessInDb(tx, organizationId, channelId, userId);

		const result = await tx.execute(sql`
			UPDATE staff_chat_messages
			SET read_by_staff_ids = read_by_staff_ids || ${JSON.stringify([userId])}::jsonb
			WHERE organization_id = ${organizationId}::uuid
			  AND channel_id = ${channelId}::uuid
			  AND NOT (read_by_staff_ids @> ${JSON.stringify([userId])}::jsonb)
		`);

		return result.rowCount ?? 0;
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}
