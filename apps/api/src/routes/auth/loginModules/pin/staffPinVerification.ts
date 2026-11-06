/**
 * apps/api/src/routes/auth/loginModules/pin/staffPinVerification.ts
 *
 * DENTE Dental CRM — Staff PIN Verification, Rate Limiting & Chairside Search.
 * Mandates: 8e (Doctor Autonomy, Chairside Quick Switch), Zero-Simulation Law.
 */

import { and, eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { withTenantCtx } from "../../../../db/rls.js";
import { users } from "../../../../db/schema.js";
import {
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_SHOWCASE_ORG_ID,
} from "../../../../services/demo/deepDemoSeeder.js";
import { verifyCredential, verifyToken } from "../../../../utils/cryptoHelper.js";
import { demoLoginAllowed, TOKEN_SECRET } from "../../tokenHelpers.js";
import {
	checkStaffPinRateLimit,
	getStaffPinRateLimitKey,
	recordStaffPinFailure,
	resetStaffPinRateLimit,
} from "../loginRateLimiter.js";

/**
 * Разрешение payload токена клиники из заголовка x-dente-clinic-token
 */
export function extractClinicPayload(request: FastifyRequest): {
	organizationId: string;
} | null {
	const clinicHeader = request.headers["x-dente-clinic-token"];
	const clinicToken = Array.isArray(clinicHeader)
		? clinicHeader[0]
		: clinicHeader;

	if (!clinicToken) return null;

	if (
		clinicToken.startsWith("demo-showcase-token") ||
		clinicToken.startsWith("demo-showcase-clinic-token")
	) {
		return { organizationId: DEMO_SHOWCASE_ORG_ID };
	}

	const verified = verifyToken(clinicToken, TOKEN_SECRET());
	if (verified && typeof verified.organizationId === "string") {
		return { organizationId: verified.organizationId };
	}

	return null;
}

/**
 * Проверка лимита попыток ввода PIN (5 попыток -> 5 минут блокировки)
 */
export function verifyBruteForceLimit(
	orgId: string,
	userId: string | undefined,
	ip: string,
): { allowed: boolean; retryAfterSeconds?: number | undefined; rateLimitKey: string } {
	const rateLimitKey = getStaffPinRateLimitKey(orgId, userId || "chairside", ip);
	const limitStatus = checkStaffPinRateLimit(rateLimitKey);
	return {
		allowed: limitStatus.allowed,
		retryAfterSeconds: limitStatus.retryAfterSeconds,
		rateLimitKey,
	};
}

/**
 * Поиск сотрудника в БД под RLS тенанта клиники
 */
export async function findStaffUserById(
	orgId: string,
	userId?: string,
	log?: FastifyRequest["log"],
): Promise<typeof users.$inferSelect | undefined> {
	if (!userId) return undefined;

	try {
		const results = await withTenantCtx(orgId, async (tx) => {
			return tx
				.select()
				.from(users)
				.where(
					and(
						eq(users.id, userId),
						eq(users.organizationId, orgId),
						eq(users.isActive, true),
					),
				)
				.limit(1);
		});
		return results[0];
	} catch (dbErr) {
		log?.error({ dbErr }, "[STAFF_UNLOCK_DB_ERR] Ошибка поиска сотрудника");
		return undefined;
	}
}

/**
 * Резолвинг пользователя для демо-контура
 */
export function resolveDemoUser(
	orgId: string,
	userId?: string,
): typeof users.$inferSelect | undefined {
	if (!demoLoginAllowed() || orgId !== DEMO_SHOWCASE_ORG_ID) {
		return undefined;
	}
	if (!userId || userId === DEMO_DOCTOR_1_ID) {
		return {
			id: DEMO_DOCTOR_1_ID,
			organizationId: DEMO_SHOWCASE_ORG_ID,
			fullName: "Д-р Соколов А. В.",
			role: "doctor",
			email: "doctor@clinic.com",
			phone: "+7 (999) 111-22-33",
			pinCodeHash: null,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		} as unknown as typeof users.$inferSelect;
	}
	return undefined;
}

/**
 * Комплексная проверка PIN-кода для выбранного сотрудника клиники.
 * Защита от BOLA/IDOR: тотальный перебор всех сотрудников клиники (allClinicStaff) СТРОГО ЗАПРЕЩЁН.
 * Проверка выполняется исключительно для целевого пользователя (userId).
 */
export async function verifyAndMatchStaffUser(params: {
	orgId: string;
	userId?: string | undefined;
	pinCode: string;
	log?: FastifyRequest["log"] | undefined;
}): Promise<{ user?: typeof users.$inferSelect | undefined; isMatch: boolean }> {
	const { orgId, userId, pinCode, log } = params;

	let user = await findStaffUserById(orgId, userId, log);

	if (!user) {
		user = resolveDemoUser(orgId, userId);
	}

	let isMatch = false;
	if (user) {
		const storedPinHash = user.pinCodeHash;
		isMatch = storedPinHash
			? await verifyCredential(pinCode, storedPinHash)
			: demoLoginAllowed() && orgId === DEMO_SHOWCASE_ORG_ID && pinCode === "1234";
	}

	return { user, isMatch };
}

/**
 * Валидация прав и PIN-кода при смене роли / пользователя у кресла
 */
export async function validateRoleSwitchPin(params: {
	orgId: string;
	dbUser: typeof users.$inferSelect;
	targetRole: string;
	callerUserId: string | null;
	pinCode?: string | undefined;
	ip: string;
}): Promise<
	| { valid: true }
	| { valid: false; statusCode: number; error: string; message: string }
> {
	const { orgId, dbUser, targetRole, callerUserId, pinCode, ip } = params;

	const dbRole = String(dbUser.role ?? "").toLowerCase();
	if (dbRole !== targetRole) {
		return {
			valid: false,
			statusCode: 403,
			error: "RoleMismatch",
			message:
				`Роль «${dbRole || "не задана"}» назначена сотруднику «${dbUser.fullName}» в настройках клиники. ` +
				"Выдать себе другую роль через смену пользователя нельзя: её назначает владелец клиники в карточке сотрудника.",
		};
	}

	const isSwitchingToAnotherUser = callerUserId !== dbUser.id;
	if (isSwitchingToAnotherUser) {
		if (!dbUser.pinCodeHash) {
			return {
				valid: false,
				statusCode: 403,
				error: "PinRequired",
				message:
					`У сотрудника «${dbUser.fullName}» не задан ПИН-код, поэтому войти за него нельзя. ` +
					"Попросите владельца клиники задать ПИН-код в настройках сотрудника.",
			};
		}

		const pinOk =
			pinCode &&
			(await verifyCredential(pinCode, dbUser.pinCodeHash));

		if (!pinOk) {
			recordStaffPinFailure(getStaffPinRateLimitKey(orgId, dbUser.id, ip));
			return {
				valid: false,
				statusCode: 401,
				error: "InvalidPin",
				message: "Неверный ПИН-код сотрудника.",
			};
		}
	}

	return { valid: true };
}
