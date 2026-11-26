import {
	checkStaffDuplicates,
	evaluatePasswordEntropy,
	type StaffMemberSearchCandidate,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { withTenantCtx } from "../../db/rls.js";
import * as schema from "../../db/schema.js";
import { assembleStaffProfile, resolveOrganizationId } from "./staffHelpers.js";
import { evaluatePasswordBodySchema, staffCandidateSchema } from "./staffSchemas.js";
import type { ExtendedHrProfileStorage, StaffSessionTelemetry } from "./types.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function registerStaffQueryRoutes(app: FastifyInstance) {
	/**
	 * GET /api/staff/extended — Список сотрудников клиники с расширенным профилем
	 */
	app.get("/api/staff/extended", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;

		const { staffRows, commissions } = await withTenantCtx(
			auth.orgId,
			async (tx) => {
				const rows = await tx
					.select()
					.from(schema.users)
					.where(eq(schema.users.organizationId, auth.orgId));

				const commRows = await tx
					.select()
					.from(schema.doctorCommissions)
					.where(eq(schema.doctorCommissions.organizationId, auth.orgId));

				return { staffRows: rows, commissions: commRows };
			},
		);

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
		if (!UUID_PATTERN.test(params.staffId)) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Некорректный идентификатор сотрудника.",
			};
		}
		const { user, commissionRow } = await withTenantCtx(auth.orgId, async (tx) => {
			const [u] = await tx
				.select()
				.from(schema.users)
				.where(
					and(
						eq(schema.users.id, params.staffId),
						eq(schema.users.organizationId, auth.orgId),
					),
				)
				.limit(1);

			if (!u) return { user: null, commissionRow: undefined };

			const [comm] = await tx
				.select()
				.from(schema.doctorCommissions)
				.where(
					and(
						eq(schema.doctorCommissions.organizationId, auth.orgId),
						eq(schema.doctorCommissions.userId, params.staffId),
					),
				)
				.limit(1);

			return { user: u, commissionRow: comm };
		});

		if (!user) {
			reply.code(404);
			return {
				error: "StaffNotFound",
				message: "Сотрудник не найден в этой клинике.",
			};
		}

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

		const staffRows = await withTenantCtx(auth.orgId, (tx) =>
			tx
				.select({
					id: schema.users.id,
					fullName: schema.users.fullName,
					snils: schema.users.snils,
					email: schema.users.email,
					phone: schema.users.phone,
					uiPreferences: schema.users.uiPreferences,
				})
				.from(schema.users)
				.where(eq(schema.users.organizationId, auth.orgId)),
		);

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
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;

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
		if (!UUID_PATTERN.test(params.staffId)) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Некорректный идентификатор сотрудника.",
			};
		}
		const { user, liveEnforcements } = await withTenantCtx(
			auth.orgId,
			async (tx) => {
				const [u] = await tx
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

				if (!u) return { user: null, liveEnforcements: [] };

				const enforcements = await tx
					.select({
						id: schema.singleSessionEnforcements.id,
						activeSessionToken:
							schema.singleSessionEnforcements.activeSessionToken,
						clientIp: schema.singleSessionEnforcements.clientIp,
						userAgent: schema.singleSessionEnforcements.userAgent,
						lastActiveAt: schema.singleSessionEnforcements.lastActiveAt,
					})
					.from(schema.singleSessionEnforcements)
					.where(
						and(
							eq(schema.singleSessionEnforcements.userId, params.staffId),
							eq(schema.singleSessionEnforcements.organizationId, auth.orgId),
						),
					);

				return { user: u, liveEnforcements: enforcements };
			},
		);

		if (!user) {
			reply.code(404);
			return {
				error: "StaffNotFound",
				message: "Сотрудник не найден.",
			};
		}

		const activeSessions: StaffSessionTelemetry[] = liveEnforcements.map((s) => ({
			sessionId: s.activeSessionToken || s.id,
			ipAddress: s.clientIp,
			userAgent: s.userAgent,
			status: "online",
			connectedAt: s.lastActiveAt ? s.lastActiveAt.toISOString() : null,
			lastActivityAt: s.lastActiveAt ? s.lastActiveAt.toISOString() : null,
		}));

		if (activeSessions.length === 0 && user.currentSessionId) {
			activeSessions.push({
				sessionId: user.currentSessionId,
				ipAddress: null,
				userAgent: null,
				status: "online",
				connectedAt: user.createdAt ? user.createdAt.toISOString() : null,
				lastActivityAt: null,
			});
		}

		return {
			staffId: user.id,
			fullName: user.fullName,
			hasActiveSession: activeSessions.length > 0,
			sessions: activeSessions,
		};
	});
}
