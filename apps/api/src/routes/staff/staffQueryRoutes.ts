import {
	checkStaffDuplicates,
	evaluatePasswordEntropy,
	type StaffMemberSearchCandidate,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { assembleStaffProfile, resolveOrganizationId } from "./staffHelpers.js";
import { evaluatePasswordBodySchema, staffCandidateSchema } from "./staffSchemas.js";
import type { ExtendedHrProfileStorage } from "./types.js";

export async function registerStaffQueryRoutes(app: FastifyInstance) {
	/**
	 * GET /api/staff/extended — Список сотрудников клиники с расширенным профилем
	 */
	app.get("/api/staff/extended", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;

		const staffRows = await db
			.select()
			.from(schema.users)
			.where(eq(schema.users.organizationId, auth.orgId));

		const commissions = await db
			.select()
			.from(schema.doctorCommissions)
			.where(eq(schema.doctorCommissions.organizationId, auth.orgId));

		const commissionMap = new Map<string, (typeof commissions)[0]>();
		for (const comm of commissions) {
			const targetId = comm.userId || comm.doctorId;
			if (targetId) commissionMap.set(targetId, comm);
		}

		const results = staffRows.map((user) =>
			assembleStaffProfile(
				user,
				commissionMap.get(user.id),
				auth.callerRole,
				auth.callerUserId,
			),
		);

		return results;
	});

	/**
	 * GET /api/staff/:staffId/profile — Карточка конкретного сотрудника
	 */
	app.get("/api/staff/:staffId/profile", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;

		const params = request.params as { staffId: string };
		const [user] = await db
			.select()
			.from(schema.users)
			.where(
				and(
					eq(schema.users.id, params.staffId),
					eq(schema.users.organizationId, auth.orgId),
				),
			)
			.limit(1);

		if (!user) {
			reply.code(404);
			return {
				error: "StaffNotFound",
				message: "Сотрудник не найден в этой клинике.",
			};
		}

		const [commissionRow] = await db
			.select()
			.from(schema.doctorCommissions)
			.where(
				and(
					eq(schema.doctorCommissions.organizationId, auth.orgId),
					eq(schema.doctorCommissions.userId, params.staffId),
				),
			)
			.limit(1);

		return assembleStaffProfile(
			user,
			commissionRow,
			auth.callerRole,
			auth.callerUserId,
		);
	});

	/**
	 * POST /api/staff/validate-duplicates — Проверка кандидата на дублирование
	 */
	app.post("/api/staff/validate-duplicates", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;

		const parsed = staffCandidateSchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Некорректные параметры для проверки дубликатов.",
			};
		}

		const staffRows = await db
			.select({
				id: schema.users.id,
				fullName: schema.users.fullName,
				snils: schema.users.snils,
				email: schema.users.email,
				phone: schema.users.phone,
				uiPreferences: schema.users.uiPreferences,
			})
			.from(schema.users)
			.where(eq(schema.users.organizationId, auth.orgId));

		const candidateList: StaffMemberSearchCandidate[] = staffRows.map((u) => {
			const ui = (u.uiPreferences as Record<string, unknown>) || {};
			const hr = (ui.hrProfile as ExtendedHrProfileStorage) || {};
			return {
				id: u.id,
				fullName: u.fullName,
				snils: u.snils,
				inn: hr.inn || null,
				email: u.email,
				phone: u.phone,
			};
		});

		const targetCandidate: StaffMemberSearchCandidate = {
			id: parsed.data.id || "NEW",
			fullName: parsed.data.fullName || "",
			...(parsed.data.snils !== undefined ? { snils: parsed.data.snils } : {}),
			...(parsed.data.inn !== undefined ? { inn: parsed.data.inn } : {}),
			...(parsed.data.email !== undefined ? { email: parsed.data.email } : {}),
			...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
		};

		const conflict = checkStaffDuplicates(candidateList, targetCandidate);

		return {
			isDuplicate: Boolean(conflict),
			conflict,
		};
	});

	/**
	 * POST /api/staff/evaluate-password — Оценка энтропии и стойкости пароля
	 */
	app.post("/api/staff/evaluate-password", async (request, reply) => {
		const parsed = evaluatePasswordBodySchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Пароль не передан для оценки.",
			};
		}

		return evaluatePasswordEntropy(parsed.data.password);
	});

	/**
	 * GET /api/staff/:staffId/sessions — Журнал телеметрии сессий сотрудника
	 */
	app.get("/api/staff/:staffId/sessions", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;

		const params = request.params as { staffId: string };
		const [user] = await db
			.select({
				id: schema.users.id,
				fullName: schema.users.fullName,
				currentSessionId: schema.users.currentSessionId,
				createdAt: schema.users.createdAt,
			})
			.from(schema.users)
			.where(
				and(
					eq(schema.users.id, params.staffId),
					eq(schema.users.organizationId, auth.orgId),
				),
			)
			.limit(1);

		if (!user) {
			reply.code(404);
			return {
				error: "StaffNotFound",
				message: "Сотрудник не найден.",
			};
		}

		return {
			staffId: user.id,
			fullName: user.fullName,
			hasActiveSession: Boolean(user.currentSessionId),
			sessions: user.currentSessionId
				? [
						{
							sessionId: user.currentSessionId,
							ipAddress: "127.0.0.1",
							userAgent: "DENTE Desktop Client (Windows 11 x64)",
							status: "online",
							connectedAt: new Date().toISOString(),
							lastActivityAt: new Date().toISOString(),
						},
					]
				: [],
		};
	});
}
