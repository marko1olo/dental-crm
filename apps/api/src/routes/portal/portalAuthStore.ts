import { createHash } from "node:crypto";
import { and, desc, eq, gt, gte, isNull, sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { requireAuthTokenSecret } from "../../accessGuard.js";
import { withSuperuserBypass, withTenantReadCtx, withTenantWriteCtx, type TenantDb } from "../../db/rls.js";
import { organizations, patients, portalOtpCodes, portalRevokedTokens } from "../../db/schema.js";
import { BoundedStringSet, BoundedTtlMap } from "../../lib/boundedTtlMap.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import {
	resolveChannelCredentials,
	sendThroughChannel,
} from "../../services/communications/channelRouter.js";
import { normalizeRussianMsisdn } from "../../smsTransport.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import {
	type AuthenticatedPortalPatient,
	PORTAL_TOKEN_KIND,
	type PortalOtpPolicy,
} from "./types.js";

const logger = createApiLogger("portalAuthStore");

const PORTAL_REVOCATION_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PORTAL_REVOCATION_MAX_ENTRIES = 10_000;

// Bounded in-memory revocation cache for synchronous token checks, backed by PostgreSQL portal_revoked_tokens
export const revokedPortalTokens = new BoundedStringSet(
	PORTAL_REVOCATION_MAX_ENTRIES,
	PORTAL_REVOCATION_CACHE_TTL_MS,
);
export const revokedPortalTokenHashes = new BoundedStringSet(
	PORTAL_REVOCATION_MAX_ENTRIES,
	PORTAL_REVOCATION_CACHE_TTL_MS,
);
export const portalRevokedBeforeByPatient = new BoundedTtlMap<string, number>({
	maxEntries: PORTAL_REVOCATION_MAX_ENTRIES,
	ttlMs: PORTAL_REVOCATION_CACHE_TTL_MS,
});

export function hashPortalToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

/**
 * Записывает отозванный токен (raw + SHA-256 hash) в PostgreSQL и локальный кэш
 */
export async function persistRevokedToken(
	token: string,
	patientId: string,
	organizationId: string,
	expiresAt: Date,
	executor?: TenantDb,
): Promise<void> {
	const tokenHash = hashPortalToken(token);
	revokedPortalTokens.add(token);
	revokedPortalTokenHashes.add(tokenHash);
	if (process.env.DENTAL_STATE_PERSISTENCE === "off") {
		return;
	}
	try {
		const runWrite = async (tx: TenantDb) => {
			await tx
				.insert(portalRevokedTokens)
				.values({
					tokenHash,
					patientId,
					organizationId,
					expiresAt,
				})
				.onConflictDoNothing();
		};
		if (executor) {
			await runWrite(executor);
		} else {
			await withTenantWriteCtx(organizationId, runWrite);
		}
	} catch (err) {
		logger.warn(
			{ err: safeLogError(err), patientId, organizationId },
			"Failed to persist revoked portal token to PostgreSQL",
		);
	}
}

/**
 * Проверяет в БД отзыв портального токена при cache miss (или после LRU-вытеснения).
 */
export async function isPortalTokenRevokedInDb(
	token: string,
	organizationId: string,
	executor?: TenantDb,
): Promise<boolean> {
	const tokenHash = hashPortalToken(token);
	if (revokedPortalTokens.has(token) || revokedPortalTokenHashes.has(tokenHash)) {
		return true;
	}
	if (process.env.DENTAL_STATE_PERSISTENCE === "off") {
		return false;
	}
	const now = new Date();
	const runCheck = async (tx: TenantDb) => {
		const [row] = await tx
			.select({ tokenHash: portalRevokedTokens.tokenHash })
			.from(portalRevokedTokens)
			.where(
				and(
					eq(portalRevokedTokens.tokenHash, tokenHash),
					eq(portalRevokedTokens.organizationId, organizationId),
					gt(portalRevokedTokens.expiresAt, now),
				),
			)
			.limit(1);
		return Boolean(row);
	};
	const found = executor ? await runCheck(executor) : await withTenantReadCtx(organizationId, runCheck);
	if (found) {
		revokedPortalTokenHashes.add(tokenHash);
	}
	return found;
}

/**
 * Загружает активные (неистёкшие) SHA-256 хэши отозванных токенов портала из PostgreSQL при старте сервера
 */
export async function hydrateRevokedPortalTokensFromDb(): Promise<number> {
	if (process.env.DENTAL_STATE_PERSISTENCE === "off") {
		return 0;
	}
	const now = new Date();
	const rows = await withSuperuserBypass(async (tx) =>
		tx
			.select({ tokenHash: portalRevokedTokens.tokenHash })
			.from(portalRevokedTokens)
			.where(gt(portalRevokedTokens.expiresAt, now))
			.limit(PORTAL_REVOCATION_MAX_ENTRIES),
	);
	for (const row of rows) {
		revokedPortalTokenHashes.add(row.tokenHash);
	}
	return rows.length;
}

// In-memory store for pending registration OTP codes (kept for backwards-compatibility in tests)
export interface PendingRegistrationOtpEntry {
	phoneSuffix: string;
	rawPhone: string;
	codeHash: string;
	organizationId: string;
	expiresAt: Date;
	attemptCount: number;
}

export const pendingRegistrationOtpStore = new BoundedTtlMap<string, PendingRegistrationOtpEntry>({
	maxEntries: 10_000,
	ttlMs: 30 * 60 * 1000,
});

export function getPendingRegistrationOtpKey(
	phoneSuffix: string,
	organizationId?: string | undefined,
): string {
	return `${organizationId && organizationId.trim() ? organizationId.trim() : "default"}:${phoneSuffix}`;
}

export function resetPortalRevokedTokensForTesting(): void {
	revokedPortalTokens.clear();
	revokedPortalTokenHashes.clear();
	portalRevokedBeforeByPatient.clear();
	pendingRegistrationOtpStore.clear();
}

interface PortalRateLimitWindow {
	count: number;
	resetAt: number;
}

const PORTAL_RATE_LIMIT_PRUNE_THRESHOLD = 128;
const MAX_PORTAL_RATE_LIMIT_ENTRIES = 10_000;

function pruneExpiredMapEntries(map: Map<string, PortalRateLimitWindow>, now: number): void {
	for (const [key, entry] of map.entries()) {
		if (entry.resetAt <= now) {
			map.delete(key);
		}
	}
}

class BoundedPortalRateLimitMap extends Map<string, PortalRateLimitWindow> {
	private isPruning = false;

	override get(key: string): PortalRateLimitWindow | undefined {
		if (!this.isPruning && this.size >= PORTAL_RATE_LIMIT_PRUNE_THRESHOLD) {
			this.isPruning = true;
			try {
				pruneExpiredPortalRateLimits();
			} finally {
				this.isPruning = false;
			}
		}
		return super.get(key);
	}

	override set(key: string, value: PortalRateLimitWindow): this {
		if (!this.isPruning) {
			this.isPruning = true;
			try {
				if (this.size >= PORTAL_RATE_LIMIT_PRUNE_THRESHOLD) {
					pruneExpiredPortalRateLimits();
				}
				while (this.size >= MAX_PORTAL_RATE_LIMIT_ENTRIES && !this.has(key)) {
					const oldestKey = this.keys().next().value;
					if (oldestKey === undefined) break;
					this.delete(oldestKey);
				}
			} finally {
				this.isPruning = false;
			}
		}
		return super.set(key, value);
	}
}

// Rate limiting & flood protection stores for OTP requests (10-minute window)
export const otpIpRequestCounts: Map<string, { count: number; resetAt: number }> =
	new BoundedPortalRateLimitMap();
export const otpPhoneRequestCounts: Map<string, { count: number; resetAt: number }> =
	new BoundedPortalRateLimitMap();

/**
 * Удаляет просроченные записи счётчиков OTP rate-limit для защиты памяти от утечки.
 */
export function pruneExpiredPortalRateLimits(now = Date.now()): void {
	pruneExpiredMapEntries(otpIpRequestCounts, now);
	pruneExpiredMapEntries(otpPhoneRequestCounts, now);
}

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
	if (revokedPortalTokens.has(token) || revokedPortalTokenHashes.has(hashPortalToken(token))) {
		return null;
	}
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

export interface FoundPatientByPhone {
	id: string;
	organizationId: string;
	fullName: string;
	phone: string | null;
	birthDate?: string | null | undefined;
	isFamilyHead: boolean;
}

const PORTAL_ORG_UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Разрешает целевую организацию строго в рамках тенанта:
 * - валидный UUID клиники возвращается без ослабления изоляции;
 * - "default", не-UUID или пустое значение разрешается ТОЛЬКО если в БД ровно 1 организация.
 */
export async function resolveStrictPortalOrganizationId(
	targetOrgId?: string | undefined,
): Promise<string | null> {
	const trimmed = targetOrgId?.trim();
	if (trimmed && trimmed !== "default") {
		return PORTAL_ORG_UUID_REGEX.test(trimmed) ? trimmed : null;
	}

	return withSuperuserBypass(async (tx) => {
		const orgRows = await tx
			.select({ id: organizations.id })
			.from(organizations)
			.limit(2);
		if (orgRows.length === 1 && orgRows[0]) {
			return orgRows[0].id;
		}
		return null;
	});
}

/**
 * Находит всех пациентов, привязанных к номеру телефона (включая семейные группы).
 */
export async function findPatientsByPhone(
	rawPhone: string,
	targetOrgId?: string | undefined,
	executor?: TenantDb,
): Promise<FoundPatientByPhone[]> {
	const digits = rawPhone.replace(/\D/g, "");
	if (digits.length < 10) return [];
	const strictOrgId = await resolveStrictPortalOrganizationId(targetOrgId);
	if (!strictOrgId) return [];
	const suffix = digits.slice(-10);
	const runLookup = async (tx: TenantDb) => {
		const baseFilter = sql`regexp_replace(${patients.phone}, '\\D', '', 'g') LIKE ${`%${suffix}`}`;
		const filter = and(eq(patients.organizationId, strictOrgId), baseFilter);
		const rows = await tx
			.select({
				id: patients.id,
				organizationId: patients.organizationId,
				fullName: patients.fullName,
				phone: patients.phone,
				birthDate: patients.birthDate,
				administrativeProfile: patients.administrativeProfile,
			})
			.from(patients)
			.where(filter)
			.limit(10);

		return rows.map((r) => {
			const adminProfile = (r.administrativeProfile as Record<string, unknown> | null) || {};
			return {
				id: r.id,
				organizationId: r.organizationId,
				fullName: r.fullName,
				phone: r.phone,
				birthDate: r.birthDate ?? undefined,
				isFamilyHead: Boolean(adminProfile.isFamilyHead),
			};
		});
	};
	return executor ? runLookup(executor) : withTenantReadCtx(strictOrgId, runLookup);
}

/**
 * Телефон -> основной пациент с корректной поддержкой семейных номеров.
 * При наличии нескольких профилей на один номер отдаёт основной профиль (главу семьи),
 * предотвращая ложные регистрации дубликатов-пустышек.
 */
export async function findUniquePatientByPhone(
	rawPhone: string,
	targetOrgId?: string | undefined,
	executor?: TenantDb,
): Promise<{
	id: string;
	organizationId: string;
	phone: string | null;
} | null> {
	const found = await findPatientsByPhone(rawPhone, targetOrgId, executor);
	if (found.length === 0) return null;
	if (found.length === 1) {
		const single = found[0];
		return single ? { id: single.id, organizationId: single.organizationId, phone: single.phone } : null;
	}
	// Семейный номер: отдаем основной профиль (глава семьи или первый реальный пациент с непустым именем)
	const primary =
		found.find((p) => p.isFamilyHead) ||
		found.find((p) => p.fullName.trim() !== "Пациент" && p.fullName.trim().length > 0) ||
		found[0];
	return primary ? { id: primary.id, organizationId: primary.organizationId, phone: primary.phone } : null;
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
	tx?: TenantDb,
): Promise<boolean> {
	const windowStart = new Date(now.getTime() - policy.windowSeconds * 1000);
	const queryRecent = (client: TenantDb) =>
		client
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

	const recent = tx
		? await queryRecent(tx)
		: await withTenantReadCtx(organizationId, async (tenantTx) => queryRecent(tenantTx));

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

export async function findPendingRegistrationOtp(
	phoneSuffix: string,
	targetOrgId: string | undefined,
	now: Date,
) {
	const strictOrgId = await resolveStrictPortalOrganizationId(targetOrgId);
	if (!strictOrgId) {
		return undefined;
	}

	const [dbPendingReg] = await withTenantReadCtx(strictOrgId, async (tx) =>
		tx
			.select()
			.from(portalOtpCodes)
			.where(
				and(
					eq(portalOtpCodes.organizationId, strictOrgId),
					isNull(portalOtpCodes.patientId),
					eq(portalOtpCodes.phone, phoneSuffix),
					isNull(portalOtpCodes.consumedAt),
					gt(portalOtpCodes.expiresAt, now),
				),
			)
			.orderBy(desc(portalOtpCodes.createdAt))
			.limit(1),
	);

	if (dbPendingReg) {
		return {
			organizationId: dbPendingReg.organizationId,
			codeHash: dbPendingReg.codeHash,
			attemptCount: dbPendingReg.attemptCount,
			expiresAt: dbPendingReg.expiresAt,
			id: dbPendingReg.id,
		};
	}
	return pendingRegistrationOtpStore.get(
		getPendingRegistrationOtpKey(phoneSuffix, strictOrgId),
	);
}

export async function setPendingRegistrationOtpAttemptOrConsumed(
	organizationId: string,
	regId: string,
	values: { attemptCount?: number; consumedAt?: Date },
): Promise<void> {
	await withTenantWriteCtx(organizationId, async (tx) => {
		await tx
			.update(portalOtpCodes)
			.set(values)
			.where(eq(portalOtpCodes.id, regId));
	});
}

export async function markPortalOtpDeliveryStatus(
	organizationId: string,
	otpId: string | null | undefined,
	deliveryStatus: "sent" | "failed",
	deliveryErrorClass?: string | undefined,
): Promise<void> {
	if (!otpId) return;
	await withTenantWriteCtx(organizationId, async (tx) => {
		await tx
			.update(portalOtpCodes)
			.set({
				deliveryStatus,
				...(deliveryErrorClass !== undefined ? { deliveryErrorClass } : {}),
			})
			.where(
				and(
					eq(portalOtpCodes.id, otpId),
					eq(portalOtpCodes.organizationId, organizationId),
				),
			);
	});
}

export async function dispatchPortalOtpSms(params: {
	organizationId: string;
	otpId: string | null | undefined;
	rawPhone: string | null | undefined;
	invalidPhoneMessage: string;
	messageBody: string;
	idempotencyKey: string;
}) {
	const msisdn = normalizeRussianMsisdn(params.rawPhone);
	const credentials = await resolveChannelCredentials(params.organizationId);
	const delivery =
		msisdn === null
			? {
					ok: false as const,
					errorClass: "recipient_unavailable" as const,
					errorMessage: params.invalidPhoneMessage,
				}
			: await sendThroughChannel(
					{
						channel: "sms",
						recipientAddress: msisdn,
						subject: null,
						body: params.messageBody,
						idempotencyKey: params.idempotencyKey,
					},
					credentials,
				);

	await markPortalOtpDeliveryStatus(
		params.organizationId,
		params.otpId,
		delivery.ok ? "sent" : "failed",
		delivery.ok ? undefined : delivery.errorClass,
	);
	return delivery;
}
