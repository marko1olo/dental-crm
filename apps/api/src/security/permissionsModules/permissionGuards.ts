/**
 * permissionGuards.ts — Fastify middleware и гарды контроля полномочий на маршрутах.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { getRequestIdentity } from "../identity.js";
import {
	permissionRefusalMessage,
	roleHasPermission,
} from "./permissionChecks.js";
import type { Permission } from "./permissionMatrix.js";

/**
 * Требует у запроса конкретное право. Возвращает организацию и сотрудника либо
 * null, отправив ответ клиенту.
 *
 * 401 — сотрудник не опознан (нет токена), 403 — опознан, но роль не даёт права.
 * Различать важно: интерфейс в первом случае предлагает войти, во втором —
 * объясняет, что действие не положено этой роли.
 */
export async function requirePermission(
	request: FastifyRequest,
	reply: FastifyReply,
	permission: Permission,
): Promise<{ organizationId: string; userId: string; role: string } | null> {
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
	if (!roleHasPermission(identity.role, permission)) {
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

	if (!roleHasPermission(identity.role, permission)) {
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
