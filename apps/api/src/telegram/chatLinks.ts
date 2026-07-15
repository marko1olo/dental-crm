import type { DenteTelegramChatLink } from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { denteTelegramChatLinks } from "../db/schema.js";

export async function listDenteTelegramChatLinks(
	organizationId: string,
	limit: number = 50,
): Promise<DenteTelegramChatLink[]> {
	const links = await db
		.select()
		.from(denteTelegramChatLinks)
		.where(eq(denteTelegramChatLinks.organizationId, organizationId))
		.orderBy(desc(denteTelegramChatLinks.lastUpdateAt))
		.limit(limit);

	return links.map((link) => ({
		id: link.id,
		organizationId: link.organizationId,
		clinicId: null,
		botConfigId: link.botConfigId,
		subjectType: link.subjectType,
		subjectId: link.subjectId,
		chatFingerprint: link.chatFingerprint,
		chatTransportRef: link.chatTransportRef,
		chatIdLast4: link.chatIdLast4,
		status: link.status,
		linkedAt: link.linkedAt.toISOString(),
		revokedAt: link.revokedAt?.toISOString() ?? null,
		lastUpdateAt: link.lastUpdateAt.toISOString(),
	}));
}

export async function revokeDenteTelegramChatLink(
	organizationId: string,
	linkId: string,
): Promise<DenteTelegramChatLink | null> {
	const [updated] = await db
		.update(denteTelegramChatLinks)
		.set({
			status: "revoked",
			revokedAt: sql`CURRENT_TIMESTAMP`,
			lastUpdateAt: sql`CURRENT_TIMESTAMP`,
		})
		.where(
			and(
				eq(denteTelegramChatLinks.organizationId, organizationId),
				eq(denteTelegramChatLinks.id, linkId),
				eq(denteTelegramChatLinks.status, "active"),
			),
		)
		.returning();

	if (!updated) return null;

	return {
		id: updated.id,
		organizationId: updated.organizationId,
		clinicId: null,
		botConfigId: updated.botConfigId,
		subjectType: updated.subjectType,
		subjectId: updated.subjectId,
		chatFingerprint: updated.chatFingerprint,
		chatTransportRef: updated.chatTransportRef,
		chatIdLast4: updated.chatIdLast4,
		status: updated.status,
		linkedAt: updated.linkedAt.toISOString(),
		revokedAt: updated.revokedAt?.toISOString() ?? null,
		lastUpdateAt: updated.lastUpdateAt.toISOString(),
	};
}
