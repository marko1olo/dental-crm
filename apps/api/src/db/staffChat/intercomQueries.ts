import type {
	IntercomAck,
	IntercomAckType,
	IntercomLocationItem,
	StaffChatMessage,
} from "@dental/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import { type TenantDb, withTenantCtx } from "../rls.js";
import { chairs, staffChatMessages, users } from "../schema.js";
import { assertChannelAccessInDb, mapStaffChatMessageRow } from "./types.js";

/**
 * Записать подтверждение (Ack) интерком-вызова сотрудником с проверкой прав на канал.
 */
export async function recordIntercomAck(params: {
	organizationId: string;
	messageId: string;
	staffId: string;
	staffName: string;
	staffRole: string;
	ackType: IntercomAckType;
	customComment?: string | undefined;
	tx?: TenantDb | undefined;
}): Promise<StaffChatMessage | null> {
	const ackItem: IntercomAck = {
		staffId: params.staffId,
		staffName: params.staffName,
		staffRole: params.staffRole,
		ackType: params.ackType,
		customComment: params.customComment,
		timestamp: new Date().toISOString(),
	};

	const run = async (tx: TenantDb) => {
		const [targetMsg] = await tx
			.select({
				id: staffChatMessages.id,
				channelId: staffChatMessages.channelId,
			})
			.from(staffChatMessages)
			.where(
				and(
					eq(staffChatMessages.organizationId, params.organizationId),
					eq(staffChatMessages.id, params.messageId),
				),
			)
			.limit(1);

		if (!targetMsg) return null;

		await assertChannelAccessInDb(
			tx,
			params.organizationId,
			targetMsg.channelId,
			params.staffId,
		);

		const [row] = await tx
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

		return row ?? null;
	};

	const updated = params.tx
		? await run(params.tx)
		: await withTenantCtx(params.organizationId, run);

	return updated ? mapStaffChatMessageRow(updated) : null;
}

/**
 * Получить список реальных кресел и кабинетов клиники для интеркома.
 */
export async function listClinicIntercomLocations(
	organizationId: string,
	externalTx?: TenantDb | undefined,
): Promise<IntercomLocationItem[]> {
	const run = async (tx: TenantDb): Promise<IntercomLocationItem[]> => {
		const dbChairs = await tx
			.select({
				id: chairs.id,
				name: chairs.name,
				room: chairs.room,
			})
			.from(chairs)
			.where(
				and(eq(chairs.organizationId, organizationId), eq(chairs.isActive, true)),
			)
			.orderBy(asc(chairs.name));

		return dbChairs.map((c) => ({
			id: c.id,
			name: c.room ? `${c.name} (${c.room})` : c.name,
			isChair: true,
		}));
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}

/**
 * Получить список всех активных сотрудников клиники для мессенджера/интеркома.
 */
export async function listStaffMembersForChat(
	organizationId: string,
	externalTx?: TenantDb | undefined,
): Promise<
	Array<{
		id: string;
		fullName: string;
		role: string;
		phone: string | null;
		email: string | null;
	}>
> {
	const run = (tx: TenantDb) =>
		tx
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

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}
