/**
 * apps/api/src/routes/auth/loginModules/pin/staffPinSessionTokens.ts
 *
 * DENTE Dental CRM — Staff Session Tokens & Audit Logging.
 * Mandates: 8e (Doctor Autonomy, Chairside Fast Switch), 8wy (100% Real DB / Isolated Demo).
 */

import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { withTenantCtx } from "../../../../db/rls.js";
import { auditEvents, users } from "../../../../db/schema.js";
import {
	DEMO_ADMIN_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_OWNER_ID,
	DEMO_SHOWCASE_ORG_ID,
} from "../../../../services/demo/deepDemoSeeder.js";
import { signToken } from "../../../../utils/cryptoHelper.js";
import { demoLoginAllowed, TOKEN_SECRET } from "../../tokenHelpers.js";

export interface StaffAuthResponseUser {
	id: string;
	fullName: string;
	role: string;
	phone?: string | null;
	email?: string | null;
}

export interface StaffAuthSuccessResult {
	ok: true;
	staffToken: string;
	user: StaffAuthResponseUser;
}

/**
 * Выпуск JWT токена рабочей смены врача (8 часов) и запись аудита сессии
 */
export async function issueStaffSessionToken(params: {
	orgId: string;
	user: typeof users.$inferSelect;
	request: FastifyRequest;
	actionType: "unlock" | "role_switch";
	isSwitchingToAnotherUser?: boolean | undefined;
	callerUserId?: string | null | undefined;
}): Promise<StaffAuthSuccessResult> {
	const { orgId, user, request, actionType, isSwitchingToAnotherUser, callerUserId } = params;
	const sessionId = crypto.randomUUID();

	// Обновление ID текущей сессии сотрудника в БД
	try {
		await withTenantCtx(orgId, async (tx) => {
			await tx
				.update(users)
				.set({ currentSessionId: sessionId })
				.where(and(eq(users.id, user.id), eq(users.organizationId, orgId)));
		});
	} catch (sessErr) {
		request.log.warn({ sessErr }, "[STAFF_SESSION_UPDATE_WARN]");
	}

	// Выпуск JWT токена на 8 часов рабочей смены
	const staffToken = signToken(
		{
			userId: user.id,
			fullName: user.fullName,
			role: user.role,
			organizationId: orgId,
			sessionId,
		},
		TOKEN_SECRET(),
		60 * 60 * 8,
	);

	// Аудит входа под RLS-контекстом тенанта
	try {
		await withTenantCtx(orgId, async (tx) => {
			if (actionType === "unlock") {
				await tx.insert(auditEvents).values({
					organizationId: orgId,
					actorUserId: user.id,
					entityType: "user",
					entityId: user.id,
					action: "staff_unlock_success",
					reason: `Сотрудник ${user.fullName} начал сессию.`,
				});
			} else {
				const dbRole = String(user.role ?? "").toLowerCase();
				await tx.insert(auditEvents).values({
					organizationId: orgId,
					actorUserId: callerUserId ?? user.id,
					entityType: "user",
					entityId: user.id,
					action: "staff_role_switch",
					reason: isSwitchingToAnotherUser
						? `Смена сотрудника у кресла: вход за «${user.fullName}» (роль ${dbRole}) подтверждён ПИН-кодом.`
						: `Сотрудник ${user.fullName} продлил сессию в роли: ${dbRole}`,
				});
			}
		});
	} catch (auditErr) {
		request.log.warn({ auditErr }, "[STAFF_AUDIT_LOG_WARN]");
	}

	return {
		ok: true,
		staffToken,
		user: {
			id: user.id,
			fullName: user.fullName,
			role: user.role,
			phone: user.phone,
			email: user.email,
		},
	};
}

/**
 * Мгновенная смена профиля в демо-контуре (для выставочного стенда и демо-показов)
 */
export function handleDemoRoleSwitch(params: {
	orgId: string;
	targetRole: string;
	targetUserId?: string | undefined;
}): StaffAuthSuccessResult | null {
	const { orgId, targetRole, targetUserId } = params;

	if (!demoLoginAllowed() && orgId !== DEMO_SHOWCASE_ORG_ID) {
		return null;
	}

	let userId = targetUserId || DEMO_DOCTOR_1_ID;
	let fullName = "Д-р Соколов А. В.";

	if (targetRole === "owner") {
		userId = DEMO_OWNER_ID;
		fullName = "Доктор Романов И. В. (Владелец)";
	} else if (targetRole === "administrator" || targetRole === "receptionist") {
		userId = DEMO_ADMIN_ID;
		fullName = "Смирнова А. К. (Администратор)";
	} else if (targetRole === "doctor") {
		if (userId === DEMO_DOCTOR_ORTHOPEDIST_ID) {
			fullName = "Д-р Орлов А. В. (Ортопед)";
		} else if (userId === DEMO_DOCTOR_SURGEON_ID) {
			fullName = "Д-р Громов К. Д. (Хирург)";
		} else if (userId === DEMO_DOCTOR_2_ID) {
			fullName = "Д-р Морозова Е. И. (Ортодонт)";
		} else {
			userId = DEMO_DOCTOR_1_ID;
			fullName = "Д-р Соколов А. В. (Терапевт)";
		}
	}

	const newStaffToken = signToken(
		{
			userId,
			fullName,
			role: targetRole,
			organizationId: orgId,
			sessionId: crypto.randomUUID(),
		},
		TOKEN_SECRET(),
		60 * 60 * 8,
	);

	return {
		ok: true,
		staffToken: newStaffToken,
		user: {
			id: userId,
			fullName,
			role: targetRole,
			email: "demo@dente.pro",
		},
	};
}
