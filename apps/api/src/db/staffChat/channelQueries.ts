import { DEFAULT_CLINIC_CHANNELS, type StaffChatChannel } from "@dental/shared";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { type TenantDb, withTenantCtx } from "../rls.js";
import { staffChatChannels, staffChatMessages, users } from "../schema.js";
import {
	mapStaffChatChannelRow,
	mapStaffChatMessageRow,
	StaffChatChannelNotFoundError,
	StaffChatEntityNotFoundError,
	StaffChatValidationError,
} from "./types.js";

/**
 * Гарантирует наличие 4 стандартных каналов клиники без гонок вставки.
 */
export async function ensureDefaultStaffChannels(
	organizationId: string,
	externalTx?: TenantDb | undefined,
): Promise<void> {
	const ensureInTx = async (tx: TenantDb): Promise<void> => {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${`staff_chat_defaults:${organizationId}`}))`,
		);

		const existing = await tx
			.select({ slug: staffChatChannels.slug })
			.from(staffChatChannels)
			.where(
				and(
					eq(staffChatChannels.organizationId, organizationId),
					eq(staffChatChannels.type, "channel"),
				),
			);

		const existingSlugs = new Set(existing.map((e) => e.slug).filter(Boolean));
		const missingChannels = DEFAULT_CLINIC_CHANNELS.filter(
			(def) => !existingSlugs.has(def.slug),
		).map((def) => ({
			organizationId,
			type: "channel" as const,
			slug: def.slug,
			name: def.name,
			description: def.description,
			icon: def.icon,
			isDefault: true,
		}));

		if (missingChannels.length > 0) {
			await tx.insert(staffChatChannels).values(missingChannels);
		}
	};

	if (externalTx) {
		await ensureInTx(externalTx);
		return;
	}
	await withTenantCtx(organizationId, ensureInTx);
}

/**
 * Получить список всех каналов и личных диалогов сотрудника.
 */
export async function listStaffChannels(
	organizationId: string,
	currentUserId?: string | undefined,
	externalTx?: TenantDb | undefined,
): Promise<StaffChatChannel[]> {
	const run = async (tx: TenantDb): Promise<StaffChatChannel[]> => {
		await ensureDefaultStaffChannels(organizationId, tx);

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

		const rawChannels = await tx
			.select()
			.from(staffChatChannels)
			.where(channelFilter)
			.orderBy(asc(staffChatChannels.isDefault), asc(staffChatChannels.name));

		const directUserIds = new Set<string>();
		for (const ch of rawChannels) {
			if (ch.type === "direct") {
				if (ch.directUser1Id) directUserIds.add(ch.directUser1Id);
				if (ch.directUser2Id) directUserIds.add(ch.directUser2Id);
			}
		}

		const userMap = new Map<string, { fullName: string; role: string }>();
		if (directUserIds.size > 0) {
			const userRows = await tx
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

		const channelIds = rawChannels.map((c) => c.id);
		const lastMessageByChannel = new Map<
			string,
			typeof staffChatMessages.$inferSelect
		>();
		const unreadCountByChannel = new Map<string, number>();

		if (channelIds.length > 0) {
			const latestMsgs = await tx
				.select()
				.from(staffChatMessages)
				.where(
					and(
						eq(staffChatMessages.organizationId, organizationId),
						inArray(staffChatMessages.channelId, channelIds),
						inArray(
							staffChatMessages.id,
							sql`(SELECT DISTINCT ON (channel_id) id FROM staff_chat_messages WHERE organization_id = ${organizationId}::uuid ORDER BY channel_id, created_at DESC)`,
						),
					),
				);

			for (const msg of latestMsgs) {
				lastMessageByChannel.set(msg.channelId, msg);
			}

			if (currentUserId) {
				const unreadRows = await tx
					.select({
						channelId: staffChatMessages.channelId,
						count: sql<number>`count(*)::int`,
					})
					.from(staffChatMessages)
					.where(
						and(
							eq(staffChatMessages.organizationId, organizationId),
							inArray(staffChatMessages.channelId, channelIds),
							sql`NOT (${staffChatMessages.readByStaffIds} @> ${JSON.stringify([currentUserId])}::jsonb)`,
						),
					)
					.groupBy(staffChatMessages.channelId);

				for (const r of unreadRows) {
					unreadCountByChannel.set(r.channelId, r.count ?? 0);
				}
			}
		}

		return rawChannels.map((ch) => {
			const lastMsg = lastMessageByChannel.get(ch.id) ?? null;
			const unreadCount = unreadCountByChannel.get(ch.id) ?? 0;

			let name = ch.name;
			let description = ch.description;

			if (ch.type === "direct" && currentUserId) {
				const peerId =
					ch.directUser1Id === currentUserId ? ch.directUser2Id : ch.directUser1Id;
				const peer = peerId ? userMap.get(peerId) : undefined;
				if (peer) {
					name = peer.fullName;
					description = `Личные сообщения (${peer.role})`;
				}
			}

			return mapStaffChatChannelRow(ch, {
				name,
				description,
				unreadCount,
				lastMessage: lastMsg ? mapStaffChatMessageRow(lastMsg) : null,
			});
		});
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}

/**
 * Найти или создать личный диалог (Direct Chat) между двумя сотрудниками.
 */
export async function getOrCreateDirectStaffChannel(
	organizationId: string,
	currentUserId: string,
	targetUserId: string,
	externalTx?: TenantDb | undefined,
): Promise<StaffChatChannel> {
	if (currentUserId === targetUserId) {
		throw new StaffChatValidationError("Нельзя создать личный диалог с самим собой.");
	}

	const run = async (tx: TenantDb): Promise<StaffChatChannel> => {
		const participantRows = await tx
			.select({ id: users.id, fullName: users.fullName, role: users.role })
			.from(users)
			.where(
				and(
					eq(users.organizationId, organizationId),
					inArray(users.id, [currentUserId, targetUserId]),
				),
			);

		const currentUser = participantRows.find((u) => u.id === currentUserId);
		const targetUser = participantRows.find((u) => u.id === targetUserId);

		if (!currentUser) {
			throw new StaffChatEntityNotFoundError(
				"Текущий пользователь не найден в данной организации.",
			);
		}
		if (!targetUser) {
			throw new StaffChatEntityNotFoundError("Собеседник не найден в данной клинике.");
		}

		const [u1, u2] =
			currentUserId < targetUserId
				? [currentUserId, targetUserId]
				: [targetUserId, currentUserId];

		let [channel] = await tx
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
			const defaultName = targetUser.fullName || "Личный диалог";
			const defaultDesc = `Роль: ${targetUser.role}`;

			const [created] = await tx
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
				.onConflictDoNothing({
					target: [
						staffChatChannels.organizationId,
						staffChatChannels.directUser1Id,
						staffChatChannels.directUser2Id,
					],
				})
				.returning();

			if (created) {
				channel = created;
			} else {
				[channel] = await tx
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
			}
		}

		if (!channel) {
			throw new StaffChatChannelNotFoundError("Не удалось открыть личный диалог.");
		}

		return mapStaffChatChannelRow(channel);
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}

/**
 * Найти канал по ID.
 */
export async function getStaffChannelById(
	organizationId: string,
	channelId: string,
	externalTx?: TenantDb | undefined,
): Promise<StaffChatChannel | null> {
	const run = async (tx: TenantDb): Promise<StaffChatChannel | null> => {
		const [ch] = await tx
			.select()
			.from(staffChatChannels)
			.where(
				and(
					eq(staffChatChannels.organizationId, organizationId),
					eq(staffChatChannels.id, channelId),
				),
			)
			.limit(1);
		return ch ? mapStaffChatChannelRow(ch) : null;
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}

/**
 * Найти канал по слагу (например "intercom_assistants", "reception", "lab_ztl").
 */
export async function getStaffChannelBySlug(
	organizationId: string,
	slug: string,
	externalTx?: TenantDb | undefined,
): Promise<StaffChatChannel | null> {
	const run = async (tx: TenantDb): Promise<StaffChatChannel | null> => {
		await ensureDefaultStaffChannels(organizationId, tx);

		const [ch] = await tx
			.select()
			.from(staffChatChannels)
			.where(
				and(
					eq(staffChatChannels.organizationId, organizationId),
					eq(staffChatChannels.slug, slug),
				),
			)
			.limit(1);

		return ch ? mapStaffChatChannelRow(ch) : null;
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}
