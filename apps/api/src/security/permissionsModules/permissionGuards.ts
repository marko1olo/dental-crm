/**
 * permissionGuards.ts — Fastify middleware и гарды контроля полномочий на маршрутах.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { db, type TenantDb } from "../../db/client.js";
import { auditEvents } from "../../db/schema/system.js";
import { getRequestIdentity } from "../identity.js";
import {
	permissionRefusalMessage,
	roleHasPermission,
	roleHasPermissionWithOverrides,
} from "./permissionChecks.js";
import type { Permission } from "./permissionMatrix.js";

interface RoleMatrixCacheEntry {
	overrides: Record<string, Record<string, string | boolean>>;
	expiresAt: number;
}

const roleMatrixCache = new Map<string, RoleMatrixCacheEntry>();
const ROLE_MATRIX_CACHE_TTL_MS = 60_000; // 60 секунд in-memory кэш

/**
 * Сброс in-memory кэша матрицы прав (вызывается при PUT /api/settings/role-matrix).
 */
export function invalidateRoleMatrixCache(organizationId?: string): void {
	if (organizationId) {
		roleMatrixCache.delete(organizationId);
	} else {
		roleMatrixCache.clear();
	}
}

/**
 * Получение переопределений матрицы прав организации из БД с кэшированием на 60 сек.
 */
export async function fetchRoleMatrixOverrides(
	orgIdOrTx: string | TenantDb,
	maybeOrgIdOrTx?: string | TenantDb,
): Promise<Record<string, Record<string, string | boolean>> | null> {
	let organizationId: string;
	let tx: TenantDb | undefined;

	if (typeof orgIdOrTx === "string") {
		organizationId = orgIdOrTx;
		tx = typeof maybeOrgIdOrTx === "object" ? maybeOrgIdOrTx : undefined;
	} else {
		tx = orgIdOrTx;
		organizationId = typeof maybeOrgIdOrTx === "string" ? maybeOrgIdOrTx : "";
	}

	if (!organizationId) return null;

	const now = Date.now();
	const cached = roleMatrixCache.get(organizationId);
	if (cached && cached.expiresAt > now) {
		return cached.overrides;
	}

	try {
		const { organizations } = await import("../../db/schema.js");
		const { eq } = await import("drizzle-orm");

		const executor = tx ?? db;
		const [org] = await executor
			.select({ workspaceFeatureFlags: organizations.workspaceFeatureFlags })
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		const flags = (org?.workspaceFeatureFlags as Record<string, unknown> | null) ?? {};
		const overrides =
			(flags.roleMatrixOverrides as Record<string, Record<string, string | boolean>> | null) ?? {};

		roleMatrixCache.set(organizationId, {
			overrides,
			expiresAt: now + ROLE_MATRIX_CACHE_TTL_MS,
		});

		return overrides;
	} catch {
		return null;
	}
}

/**
 * Синхронное чтение переопределений из кэша (если уже загружены).
 */
export function getCachedRoleMatrixOverrides(
	organizationId: string,
): Record<string, Record<string, string | boolean>> | null {
	const now = Date.now();
	const cached = roleMatrixCache.get(organizationId);
	if (cached && cached.expiresAt > now) {
		return cached.overrides;
	}
	return null;
}

/**
 * Требует у запроса конкретное право. Возвращает организацию и сотрудника либо
 * null, отправив ответ клиенту.
 *
 * 401 — сотрудник не опознан (нет токена), 403 — опознан, но роль не даёт права.
 * Фиксирует аудит-событие попытки доступа (granted/denied) в audit_events.
 */
export async function requirePermission(
	tx: TenantDb,
	request: FastifyRequest,
	reply: FastifyReply,
	permission: Permission,
): Promise<{ organizationId: string; userId: string; role: string } | null>;
export async function requirePermission(
	request: FastifyRequest,
	reply: FastifyReply,
	permission: Permission,
	tx?: TenantDb,
): Promise<{ organizationId: string; userId: string; role: string } | null>;
export async function requirePermission(
	first: TenantDb | FastifyRequest,
	second: FastifyRequest | FastifyReply,
	third: FastifyReply | Permission,
	fourth?: Permission | TenantDb,
): Promise<{ organizationId: string; userId: string; role: string } | null> {
	let tx: TenantDb | undefined;
	let request: FastifyRequest;
	let reply: FastifyReply;
	let permission: Permission;

	if (typeof third === "string") {
		request = first as FastifyRequest;
		reply = second as FastifyReply;
		permission = third as Permission;
		tx = fourth as TenantDb | undefined;
	} else {
		tx = first as TenantDb;
		request = second as FastifyRequest;
		reply = third as FastifyReply;
		permission = fourth as Permission;
	}

	const identity = getRequestIdentity(request);

	if (!identity.organizationId) {
		reply.code(401).send({
			error: "AuthRequired",
			message: "Требуется авторизация рабочего кабинета клиники.",
		});
		return null;
	}
	if (!identity.userId || !identity.role) {
		reply.code(401).send({
			error: "StaffAuthRequired",
			message:
				"Требуется вход сотрудника: действие выполняется от конкретного лица.",
		});
		return null;
	}

	const overrides = await fetchRoleMatrixOverrides(identity.organizationId, tx);
	const hasAccess = roleHasPermissionWithOverrides(identity.role, permission, overrides);

	// ACID Transactional Audit Logging в единую таблицу audit_events
	const targetDb = tx ?? db;
	try {
		await targetDb.insert(auditEvents).values({
			organizationId: identity.organizationId,
			actorUserId: identity.userId,
			entityType: "rbac_permission",
			entityId: permission,
			action: hasAccess ? "permission_granted" : "permission_denied",
			reason: hasAccess ? null : permissionRefusalMessage(identity.role, permission),
		});
	} catch (auditErr) {
		request.log?.warn?.({ err: auditErr, permission }, "Failed to write rbac audit_event");
	}

	if (!hasAccess) {
		reply.code(403).send({
			error: "PermissionDenied",
			permission,
			role: identity.role,
			message: permissionRefusalMessage(identity.role, permission),
		});
		return null;
	}

	return {
		organizationId: identity.organizationId,
		userId: identity.userId,
		role: identity.role,
	};
}


/**
 * Строгий контроль полномочий (Fail-Closed Architecture).
 *
 * Защищает маршрут: если требуется право (permission), запрос ОБЯЗАН
 * содержать валидную организацию (401 AuthRequired) и опознанного сотрудника
 * с ролью (401 StaffAuthRequired). Если роль не даёт права — 403 PermissionDenied.
 *
 * Возвращает false, если ответ клиенту уже отправлен (доступ заблокирован).
 */
export function enforcePermissionWhenStaffKnown(
	request: FastifyRequest,
	reply: FastifyReply,
	permission: Permission,
): boolean {
	const identity = getRequestIdentity(request);

	if (!identity.organizationId) {
		reply.code(401).send({
			error: "AuthRequired",
			message: "Требуется авторизация рабочего кабинета клиники.",
		});
		return false;
	}

	if (!identity.userId || !identity.role) {
		reply.code(401).send({
			error: "StaffAuthRequired",
			message:
				"Требуется вход сотрудника: действие выполняется от конкретного лица.",
		});
		return false;
	}

	const cachedOverrides = getCachedRoleMatrixOverrides(identity.organizationId);
	const hasAccess = cachedOverrides
		? roleHasPermissionWithOverrides(identity.role, permission, cachedOverrides)
		: roleHasPermission(identity.role, permission);

	if (!hasAccess) {
		reply.code(403).send({
			error: "PermissionDenied",
			permission,
			role: identity.role,
			message: permissionRefusalMessage(identity.role, permission),
		});
		return false;
	}
	return true;
}
