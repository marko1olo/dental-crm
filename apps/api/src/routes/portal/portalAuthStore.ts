import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { requireAuthTokenSecret } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withSuperuserBypass } from "../../db/rls.js";
import { patients, portalOtpCodes } from "../../db/schema.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import {
	type AuthenticatedPortalPatient,
	PORTAL_TOKEN_KIND,
	type PortalOtpPolicy,
} from "./types.js";

// In-memory revocation stores for active portal session invalidation
export const revokedPortalTokens = new Set<string>();
export const portalRevokedBeforeByPatient = new Map<string, number>();

export function resetPortalRevokedTokensForTesting(): void {
	revokedPortalTokens.clear();
	portalRevokedBeforeByPatient.clear();
}

// Rate limiting & flood protection stores for OTP requests (10-minute window)
export const otpIpRequestCounts = new Map<string, { count: number; resetAt: number }>();
export const otpPhoneRequestCounts = new Map<string, { count: number; resetAt: number }>();

export function resetPortalOtpRateLimitsForTesting(): void {
	otpIpRequestCounts.clear();
	otpPhoneRequestCounts.clear();
}

/**
 * Извлекает валидную сессию пациента личного кабинета из заголовка Authorization.
 */
export function extractPortalPatient(request: FastifyRequest): AuthenticatedPortalPatient | null {
	const authHeader = request.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) return null;
	const token = authHeader.slice("Bearer ".length).trim();
	if (!token) return null;
	if (revokedPortalTokens.has(token)) return null;
	const payload = verifyToken(token, requireAuthTokenSecret());
	if (
		!payload ||
		payload.kind !== PORTAL_TOKEN_KIND ||
		typeof payload.sub !== "string" ||
		typeof payload.organizationId !== "string"
	) {
		return null;
	}
	const revokedBefore = portalRevokedBeforeByPatient.get(payload.sub);
	if (revokedBefore && typeof payload.iat === "number" && payload.iat <= revokedBefore) {
		return null;
	}
	return { patientId: payload.sub, organizationId: payload.organizationId };
}

/**
 * Телефон -> ровно один пациент, иначе отказ.
 *
 * .limit(2) здесь не случайность: с частичным LIKE и .limit(1) сервер молча
 * выдавал первого попавшегося пациента, чей номер лишь СОДЕРЖИТ эти цифры, и
 * человек попадал в чужую медкарту. Неоднозначность — отказ, а не «первый».
 */
export async function findUniquePatientByPhone(
	rawPhone: string,
	targetOrgId?: string,
): Promise<{
	id: string;
	organizationId: string;
	phone: string | null;
} | null> {
	const digits = rawPhone.replace(/\D/g, "");
	if (digits.length < 10) return null;
	const suffix = digits.slice(-10);
	const found = await withSuperuserBypass(async (tx) => {
		const baseFilter = sql`regexp_replace(${patients.phone}, '\\D', '', 'g') LIKE ${`%${suffix}`}`;
		const filter =
			targetOrgId && targetOrgId !== "default"
				? and(eq(patients.organizationId, targetOrgId), baseFilter)
				: baseFilter;
		return tx
			.select({
				id: patients.id,
				organizationId: patients.organizationId,
				phone: patients.phone,
			})
			.from(patients)
			.where(filter)
			.limit(2);
	});
	return found.length === 1 ? (found[0] ?? null) : null;
}

/**
 * Можно ли выдать пациенту ещё один код.
 *
 * Пауза между отправками считается по ЛЮБОЙ последней строке, включая
 * неудачную. А часовой потолок — только по строкам со статусом sent/pending.
 */
export async function isIssuanceThrottled(
	organizationId: string,
	patientId: string,
	policy: PortalOtpPolicy,
	now: Date,
): Promise<boolean> {
	const windowStart = new Date(now.getTime() - policy.windowSeconds * 1000);
	const recent = await db
		.select({
			createdAt: portalOtpCodes.createdAt,
			deliveryStatus: portalOtpCodes.deliveryStatus,
		})
		.from(portalOtpCodes)
		.where(
			and(
				eq(portalOtpCodes.organizationId, organizationId),
				eq(portalOtpCodes.patientId, patientId),
				gte(portalOtpCodes.createdAt, windowStart),
			),
		)
		.orderBy(desc(portalOtpCodes.createdAt))
		.limit(50);

	const newest = recent[0];
	if (
		newest &&
		now.getTime() - newest.createdAt.getTime() <
			policy.resendCooldownSeconds * 1000
	) {
		return true;
	}
	const billable = recent.filter(
		(row) => row.deliveryStatus === "sent" || row.deliveryStatus === "pending",
	);
	return billable.length >= policy.maxPerWindow;
}
