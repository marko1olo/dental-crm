/**
 * apps/api/src/routes/demo/demoRoutes.ts
 *
 * DENTE Dental CRM — Demo Mode & Exhibition Showcase API Routes.
 * (MANDATES: 8b, 8c, 8e, 8y, Fail-Closed Multi-Tenant Isolation)
 *
 * Dedicated endpoints powering the Demo Tour Selector, live role switching,
 * idempotent PostgreSQL 18 tenant seeding, and state verification.
 */

import { and, count, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	DEMO_ADMIN_ID,
	DEMO_CLINIC_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_OWNER_ID,
	DEMO_PATIENT_1_ID,
	DEMO_PATIENT_2_ID,
	DEMO_PATIENT_3_ID,
	DEMO_PATIENT_4_ID,
	DEMO_SHOWCASE_ORG_ID,
} from "@dental/shared";
import {
	namedDevelopmentModeActive,
	unguardedBypassAllowed,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
import { ensureDemoShowcaseTenant } from "../../services/demo/deepDemoSeeder.js";

const demoSeedBodySchema = z
	.object({
		forceReset: z.boolean().optional(),
	})
	.optional();

const switchRoleBodySchema = z.object({
	role: z.enum([
		"therapist",
		"orthopedist",
		"orthodontist",
		"surgeon",
		"owner",
		"administrator",
		"admin",
	]),
});

const ROLE_METADATA_MAP = {
	therapist: {
		staffId: DEMO_DOCTOR_1_ID,
		tokenSuffix: "therapist",
		fullName: "Д-р Соколов А. В.",
		staffRole: "doctor" as const,
		specialization: "Стоматолог-терапевт",
		targetPatientId: DEMO_PATIENT_1_ID,
		targetView: "patients",
	},
	orthopedist: {
		staffId: DEMO_DOCTOR_ORTHOPEDIST_ID,
		tokenSuffix: "orthopedist",
		fullName: "Д-р Орлов А. В.",
		staffRole: "doctor" as const,
		specialization: "Стоматолог-ортопед",
		targetPatientId: DEMO_PATIENT_2_ID,
		targetView: "patients",
	},
	orthodontist: {
		staffId: DEMO_DOCTOR_2_ID,
		tokenSuffix: "orthodontist",
		fullName: "Д-р Морозова Е. И.",
		staffRole: "doctor" as const,
		specialization: "Стоматолог-ортодонт",
		targetPatientId: DEMO_PATIENT_3_ID,
		targetView: "patients",
	},
	surgeon: {
		staffId: DEMO_DOCTOR_SURGEON_ID,
		tokenSuffix: "surgeon",
		fullName: "Д-р Громов К. Д.",
		staffRole: "doctor" as const,
		specialization: "Хирург-имплантолог",
		targetPatientId: DEMO_PATIENT_4_ID,
		targetView: "patients",
	},
	owner: {
		staffId: DEMO_OWNER_ID,
		tokenSuffix: "owner",
		fullName: "Д-р Воронов М. С.",
		staffRole: "owner" as const,
		specialization: "Главный врач клиники",
		targetPatientId: DEMO_PATIENT_1_ID,
		targetView: "analytics",
	},
	administrator: {
		staffId: DEMO_ADMIN_ID,
		tokenSuffix: "administrator",
		fullName: "Смирнова А. П.",
		staffRole: "administrator" as const,
		specialization: "Старший администратор",
		targetPatientId: DEMO_PATIENT_1_ID,
		targetView: "schedule",
	},
	admin: {
		staffId: DEMO_ADMIN_ID,
		tokenSuffix: "administrator",
		fullName: "Смирнова А. П.",
		staffRole: "administrator" as const,
		specialization: "Старший администратор",
		targetPatientId: DEMO_PATIENT_1_ID,
		targetView: "schedule",
	},
} as const;

export function isDemoOperationAllowed(request?: FastifyRequest): boolean {
	if (unguardedBypassAllowed("DENTE_ALLOW_DEMO_LOGIN")) return true;
	if (namedDevelopmentModeActive()) return true;
	if (
		process.env.DENTE_ALLOW_DEMO_LOGIN === "true" ||
		process.env.DENTE_DEMO_SHOWCASE_ENABLED === "true"
	) {
		return true;
	}

	if (request) {
		const clinicToken = request.headers["x-dente-clinic-token"];
		const staffToken = request.headers["x-dente-staff-token"];
		const clinicStr = Array.isArray(clinicToken) ? clinicToken[0] : clinicToken;
		const staffStr = Array.isArray(staffToken) ? staffToken[0] : staffToken;

		if (typeof clinicStr === "string" && clinicStr.startsWith("demo-")) {
			return true;
		}
		if (typeof staffStr === "string" && staffStr.startsWith("demo-")) {
			return true;
		}
	}

	return false;
}

export async function registerDemoRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * POST /api/demo/seed
	 * Идемпотентный засев демонстрационного тенанта в PostgreSQL 18.
	 */
	app.post("/api/demo/seed", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!isDemoOperationAllowed(request)) {
			request.log.warn(
				{ url: request.url },
				"[DEMO_SEED_FORBIDDEN] Инициализация демо-контура заблокирована в текущем окружении.",
			);
			return reply.code(403).send({
				error: "Forbidden",
				message: "Демо-контур недоступен в данной конфигурации сервера.",
			});
		}

		let forceReset = false;
		if (request.body) {
			const parsed = demoSeedBodySchema.safeParse(request.body);
			if (parsed.success && parsed.data?.forceReset) {
				forceReset = true;
			}
		}

		try {
			const result = await ensureDemoShowcaseTenant(undefined, { forceReset });
			return reply.send({
				ok: true,
				...result,
			});
		} catch (err) {
			request.log.error({ err }, "[DEMO_SEED_FAIL] Ошибка засева демо-тенанта в БД");
			return reply.code(500).send({
				error: "DemoSeedError",
				message: "Не удалось инициализировать демонстрационный тенант.",
			});
		}
	});

	/**
	 * GET /api/demo/state
	 * Проверка статуса демо-контура в PostgreSQL 18.
	 */
	app.get("/api/demo/state", async (_request: FastifyRequest, reply: FastifyReply) => {
		try {
			const [orgRow] = await withSuperuserBypass(async (tx) =>
				tx
					.select({ id: organizations.id, name: organizations.name })
					.from(organizations)
					.where(eq(organizations.id, DEMO_SHOWCASE_ORG_ID))
					.limit(1),
			);

			if (!orgRow) {
				return reply.send({
					isDemoMode: true,
					seeded: false,
					organizationId: DEMO_SHOWCASE_ORG_ID,
					clinicId: DEMO_CLINIC_ID,
					patientsCount: 0,
					appointmentsCount: 0,
					staffCount: 0,
				});
			}

			const [counts] = await withTenantCtx(DEMO_SHOWCASE_ORG_ID, async (tx) => {
				const [pCount] = await tx
					.select({ value: count() })
					.from(patients)
					.where(eq(patients.organizationId, DEMO_SHOWCASE_ORG_ID));
				const [aCount] = await tx
					.select({ value: count() })
					.from(appointments)
					.where(eq(appointments.organizationId, DEMO_SHOWCASE_ORG_ID));
				const [sCount] = await tx
					.select({ value: count() })
					.from(users)
					.where(eq(users.organizationId, DEMO_SHOWCASE_ORG_ID));
				return [
					{
						patients: Number(pCount?.value ?? 0),
						appointments: Number(aCount?.value ?? 0),
						staff: Number(sCount?.value ?? 0),
					},
				];
			});

			return reply.send({
				isDemoMode: true,
				seeded: true,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				clinicId: DEMO_CLINIC_ID,
				patientsCount: counts.patients,
				appointmentsCount: counts.appointments,
				staffCount: counts.staff,
				availableRoles: Object.keys(ROLE_METADATA_MAP),
			});
		} catch (err) {
			requestLog(reply, err);
			return reply.code(500).send({
				error: "DemoStateError",
				message: "Ошибка при получении состояния демо-контура.",
			});
		}
	});

	/**
	 * POST /api/demo/switch-role
	 * Переключение клинической роли в демо-туре с выдачей токенов и контекста.
	 */
	app.post("/api/demo/switch-role", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!isDemoOperationAllowed(request)) {
			return reply.code(403).send({
				error: "Forbidden",
				message: "Переключение демо-роли недоступно.",
			});
		}

		const parsed = switchRoleBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Неверный идентификатор клинической роли.",
			});
		}

		const roleKey = parsed.data.role;
		const meta = ROLE_METADATA_MAP[roleKey];

		// Гарантируем, что демо-тенант засеян в PostgreSQL
		try {
			await ensureDemoShowcaseTenant();
		} catch (seedErr) {
			request.log.error({ seedErr }, "[DEMO_SWITCH_SEED_ERROR] Авто-засев при переключении роли");
		}

		const clinicToken = "demo-showcase-token";
		const staffToken = `demo-showcase-staff-token-${meta.tokenSuffix}`;

		return reply.send({
			ok: true,
			organizationId: DEMO_SHOWCASE_ORG_ID,
			clinicId: DEMO_CLINIC_ID,
			clinicToken,
			staffToken,
			staffUser: {
				id: meta.staffId,
				organizationId: DEMO_SHOWCASE_ORG_ID,
				fullName: meta.fullName,
				role: meta.staffRole,
				specialization: meta.specialization,
			},
			targetPatientId: meta.targetPatientId,
			targetView: meta.targetView,
		});
	});
}

function requestLog(reply: FastifyReply, err: unknown): void {
	reply.log.error({ err }, "[DEMO_ROUTE_ERROR]");
}
