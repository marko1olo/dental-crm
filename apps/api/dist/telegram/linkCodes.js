import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { denteTelegramLinkCodes } from "../db/schema.js";
export async function listDenteTelegramLinkCodes(organizationId, limit = 50) {
    const codes = await db
        .select()
        .from(denteTelegramLinkCodes)
        .where(eq(denteTelegramLinkCodes.organizationId, organizationId))
        .orderBy(desc(denteTelegramLinkCodes.createdAt))
        .limit(limit);
    return codes.map(code => ({
        id: code.id,
        organizationId: code.organizationId,
        clinicId: code.clinicId,
        botConfigId: code.botConfigId,
        subjectType: code.subjectType,
        subjectId: code.subjectId,
        codeFingerprint: code.codeFingerprint,
        codeLast4: code.codeLast4,
        status: code.status,
        expiresAt: code.expiresAt.toISOString(),
        usedAt: code.usedAt?.toISOString() ?? null,
        createdAt: code.createdAt.toISOString(),
        createdByUserId: code.createdByUserId
    }));
}
export async function consumeDenteTelegramLinkCode(organizationId, codeFingerprint) {
    const [updated] = await db
        .update(denteTelegramLinkCodes)
        .set({
        status: "used",
        usedAt: sql `CURRENT_TIMESTAMP`
    })
        .where(and(eq(denteTelegramLinkCodes.organizationId, organizationId), eq(denteTelegramLinkCodes.codeFingerprint, codeFingerprint), eq(denteTelegramLinkCodes.status, "pending")))
        .returning();
    if (!updated)
        return null;
    return {
        id: updated.id,
        organizationId: updated.organizationId,
        clinicId: updated.clinicId,
        botConfigId: updated.botConfigId,
        subjectType: updated.subjectType,
        subjectId: updated.subjectId,
        codeFingerprint: updated.codeFingerprint,
        codeLast4: updated.codeLast4,
        status: updated.status,
        expiresAt: updated.expiresAt.toISOString(),
        usedAt: updated.usedAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        createdByUserId: updated.createdByUserId
    };
}
