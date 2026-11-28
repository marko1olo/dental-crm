/**
 * workspaceProfileHandlers.ts — Layer 3/4: Fastify Handlers for Workspace Profile, Chairs & Scale Presets.
 *
 * GET  /api/workspace/profile        — load feature flags for current org
 * GET  /api/workspace/chairs         — list clinic chairs
 * POST /api/workspace/profile        — save feature flags (individual toggles)
 * POST /api/workspace/preset/:name   — apply a named preset + seed demo data
 */

import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isDemoShowcaseMode } from "../../accessGuard.js";
import { withTenantCtx, withTenantReadCtx, withTenantWriteCtx, type TenantDb } from "../../db/rls.js";
import * as schema from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import {
	type PresetName,
	type WorkspaceFeatureFlags,
	workspacePresetBodySchema,
	workspaceProfileBodySchema,
} from "./types.js";
import { WORKSPACE_PRESETS } from "./workspaceFlagDefaults.js";
import { workspaceFlagsFromStorage } from "./workspaceFlagStorageHelpers.js";

/**
 * БЫЛО: организация бралась из заголовка x-organization-id без всякой проверки,
 * иначе подставлялся жёстко зашитый UUID. Любой анонимный запрос мог прочитать и
 * ПЕРЕЗАПИСАТЬ настройки рабочего пространства любой клиники, а POST /preset/:name
 * ещё и засеивал/затирал демо-данные. Теперь организация только из подписанного
 * токена; при его отсутствии обработчик обязан вернуть 401.
 */
export function resolveOrganizationId(req: FastifyRequest): string | null {
	return getRequestIdentity(req).organizationId;
}

// ————————————————————————————————————————————————————————————————————————————
// Demo seeding data per preset (uses actual schema field names: birthDate)
// ————————————————————————————————————————————————————————————————————————————
export async function seedDemoDataForPreset(
	organizationId: string,
	preset: PresetName,
	numberOfChairs?: number,
): Promise<void> {
	await withTenantCtx(organizationId, async (tx) => {
		// Safety: only seed if no patients exist yet for this org
		const existing = await tx
			.select({ id: schema.patients.id })
			.from(schema.patients)
			.where(eq(schema.patients.organizationId, organizationId))
			.limit(1);
		if (existing.length > 0) return; // don't double-seed

		const existingChairs = await tx
			.select({ id: schema.chairs.id })
			.from(schema.chairs)
			.where(eq(schema.chairs.organizationId, organizationId))
			.limit(1);
		if (existingChairs.length === 0) {
			const flags = WORKSPACE_PRESETS[preset as Exclude<PresetName, "custom">];
			const chairCount = numberOfChairs
				? numberOfChairs
				: flags?.hasMultipleChairs
					? 4
					: 1;
			const [clinic] = await tx
				.select({ id: schema.clinics.id })
				.from(schema.clinics)
				.where(eq(schema.clinics.organizationId, organizationId))
				.limit(1);
			if (clinic) {
				const chairsToInsert = Array.from({ length: chairCount }).map((_, i) => ({
					organizationId,
					clinicId: clinic.id,
					name: chairCount === 1 ? "Главный кабинет" : `Кресло ${i + 1}`,
					isActive: true,
				}));
				if (chairsToInsert.length > 0) {
					await tx.insert(schema.chairs).values(chairsToInsert);
				}
			}
		}

		if (!isDemoShowcaseMode() && !organizationId.startsWith("demo-")) {
			return;
		}

		if (preset === "solo_therapist") {
			const patientDefs = [
				{
					fullName: "Анна Петровна Соколова",
					birthDate: "1985-03-12",
					phone: "+79101234567",
				},
				{
					fullName: "Игорь Васильевич Ким",
					birthDate: "1978-07-22",
					phone: "+79201112233",
				},
				{
					fullName: "Ольга Сергеевна Шаль",
					birthDate: "1992-11-05",
					phone: "+79305556677",
				},
			];
			const patientsToInsert = patientDefs.map((p) => ({
				organizationId,
				fullName: p.fullName,
				birthDate: p.birthDate,
				phone: p.phone,
				isSynced: false,
				version: 1,
			}));

			const patients = await tx
				.insert(schema.patients)
				.values(patientsToInsert)
				.returning({ id: schema.patients.id });

			if (patients.length > 0) {
				const visitsToInsert = patients.map((patient) => ({
					organizationId,
					patientId: patient.id,
					status: "signed" as const,
					complaint: "Боль в нижней правой челюсти на холодное",
					diagnosis: "Средний кариес 46 зуба",
					treatmentPlan:
						"Анестезия, препарирование, пломба светового отверждения (композит).",
					doctorSummary:
						"Проведено лечение среднего кариеса 46 зуба по протоколу.",
				}));
				await tx.insert(schema.visits).values(visitsToInsert);

				const appointmentsToInsert = patients.map((patient) => ({
					organizationId,
					patientId: patient.id,
					status: "planned" as const,
					startsAt: new Date(Date.now() + 86400000),
					endsAt: new Date(Date.now() + 86400000 + 3600000),
					reason: "Лечение кариеса 47 зуба",
				}));
				await tx.insert(schema.appointments).values(appointmentsToInsert);
			}
		}

		if (preset === "prosthodontist") {
			const patientDefs = [
				{
					fullName: "Виктор Михайлович Азаров",
					birthDate: "1960-05-18",
					phone: "+79401234567",
				},
				{
					fullName: "Наталья Ивановна Громова",
					birthDate: "1955-09-30",
					phone: "+79509876543",
				},
			];
			const patientsToInsert = patientDefs.map((p) => ({
				organizationId,
				fullName: p.fullName,
				birthDate: p.birthDate,
				phone: p.phone,
			}));

			const patients = await tx
				.insert(schema.patients)
				.values(patientsToInsert)
				.returning({ id: schema.patients.id });

			if (patients.length > 0) {
				const visitsToInsert = patients.map((patient) => ({
					organizationId,
					patientId: patient.id,
					status: "draft" as const,
					complaint: "Отсутствует зуб, эстетический дефект",
					diagnosis: "Частичная вторичная адентия 24 зуба",
					treatmentPlan:
						"Снятие слепков. Изготовление коронки из диоксида циркония на имплантате 24.",
				}));
				await tx.insert(schema.visits).values(visitsToInsert);

				const communicationTasksToInsert = patients.map((patient) => ({
					organizationId,
					patientId: patient.id,
					assignedRole: "doctor" as const,
					channel: "in_person" as const,
					intent: "general" as const,
					status: "queued" as const,
					priority: "normal" as const,
					dueAt: new Date(Date.now() + 86400000 * 5),
					title: "Изготовление циркониевой коронки",
					body: "Цвет A2, транслуцентный край. Отправлено в фрезерный центр.",
				}));
				await tx
					.insert(schema.communicationTasks)
					.values(communicationTasksToInsert);

				const appointmentsToInsert = patients.map((patient) => ({
					organizationId,
					patientId: patient.id,
					status: "planned" as const,
					startsAt: new Date(Date.now() + 86400000 * 2),
					endsAt: new Date(Date.now() + 86400000 * 2 + 3600000),
					reason: "Примерка каркаса",
				}));
				await tx.insert(schema.appointments).values(appointmentsToInsert);
			}
		}
	});
}

// ————————————————————————————————————————————————————————————————————————————
// Route Handlers
// ————————————————————————————————————————————————————————————————————————————

export const defaultResponseSchema = {
	200: { type: "object", additionalProperties: true },
	400: { type: "object", additionalProperties: true },
	401: { type: "object", additionalProperties: true },
	404: { type: "object", additionalProperties: true },
	500: { type: "object", additionalProperties: true },
};

export async function fetchWorkspaceProfileFlags(
	tx: TenantDb,
	organizationId: string,
): Promise<WorkspaceFeatureFlags> {
	const [organization] = await tx
		.select({ flags: schema.organizations.workspaceFeatureFlags })
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.limit(1);

	return workspaceFlagsFromStorage(organization?.flags);
}

export async function fetchWorkspaceChairs(
	tx: TenantDb,
	organizationId: string,
): Promise<Array<{ id: string; name: string }>> {
	return tx
		.select({ id: schema.chairs.id, name: schema.chairs.name })
		.from(schema.chairs)
		.where(eq(schema.chairs.organizationId, organizationId))
		.orderBy(schema.chairs.name);
}

/**
 * GET /api/workspace/profile — какие модули включены у ЭТОЙ клиники.
 */
export async function getWorkspaceProfileHandler(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const organizationId = await resolveOrganizationId(req);
		if (!organizationId)
			return reply.code(401).send({ error: "Unauthorized" });

		const flags = await withTenantReadCtx(organizationId, (tx) =>
			fetchWorkspaceProfileFlags(tx, organizationId),
		);

		return reply.send(flags);
	} catch (error) {
		req.log.error({ err: error }, "Failed to get workspace profile");
		return reply.code(500).send({ error: "Internal Server Error" });
	}
}

/**
 * GET /api/workspace/chairs — список кресел организации.
 */
export async function getWorkspaceChairsHandler(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const organizationId = await resolveOrganizationId(req);
		if (!organizationId)
			return reply.code(401).send({ error: "Unauthorized" });

		const chairs = await withTenantReadCtx(organizationId, (tx) =>
			fetchWorkspaceChairs(tx, organizationId),
		);

		return reply.send({ success: true, data: chairs });
	} catch (error) {
		req.log.error({ err: error }, "Failed to get workspace chairs");
		return reply.code(500).send({ error: "Internal Server Error" });
	}
}

export async function executeWorkspaceProfileUpdateTx(
	tx: TenantDb,
	organizationId: string,
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const idempotencyKey = extractIdempotencyKey(req);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const rawBody = req.body;
	const bodyCandidate =
		rawBody === undefined || rawBody === null ? {} : rawBody;
	const parsedBody = workspaceProfileBodySchema.safeParse(bodyCandidate);
	if (!parsedBody.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message:
				"Проверьте тело запроса: нужен JSON-объект с признаками модулей клиники (не массив и не строка).",
		});
	}
	const incoming = parsedBody.data;

	const [existing] = await tx
		.select({ flags: schema.organizations.workspaceFeatureFlags })
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.for("update")
		.limit(1);
	if (!existing) {
		return reply.code(404).send({
			error: "OrganizationNotFound",
			message: "Клиника не найдена. Войдите в рабочий кабинет заново.",
		});
	}

	const existingRaw =
		existing.flags &&
		typeof existing.flags === "object" &&
		!Array.isArray(existing.flags)
			? (existing.flags as Record<string, unknown>)
			: {};

	const merged = workspaceFlagsFromStorage({
		...workspaceFlagsFromStorage(existing.flags),
		...incoming,
	});

	await tx
		.update(schema.organizations)
		.set({
			workspaceFeatureFlags: {
				...existingRaw,
				...merged,
			},
			updatedAt: new Date(),
		})
		.where(eq(schema.organizations.id, organizationId));

	return { ok: true, ...merged };
}

/**
 * POST /api/workspace/profile — сохранить частичные признаки модулей.
 */
export async function updateWorkspaceProfileHandler(
	req: FastifyRequest<{ Body: Partial<WorkspaceFeatureFlags> }>,
	reply: FastifyReply,
) {
	try {
		const organizationId = await resolveOrganizationId(req);
		if (!organizationId)
			return reply.code(401).send({ error: "Unauthorized" });

		const result = await withTenantWriteCtx(organizationId, (tx) =>
			executeWorkspaceProfileUpdateTx(tx, organizationId, req, reply),
		);
		if (reply.sent) return reply;
		return reply.send(result);
	} catch (error) {
		req.log.error({ err: error }, "Failed to update workspace profile");
		return reply.code(500).send({ error: "Internal Server Error" });
	}
}

export async function executeWorkspacePresetApplyTx(
	tx: TenantDb,
	organizationId: string,
	presetName: PresetName,
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const idempotencyKey = extractIdempotencyKey(req);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const flags =
		WORKSPACE_PRESETS[presetName as Exclude<PresetName, "custom">];
	if (!flags) {
		return reply
			.code(400)
			.send({ error: `Unknown preset: ${presetName}` });
	}

	const rawBody = req.body;
	const bodyCandidate =
		rawBody === undefined || rawBody === null ? {} : rawBody;
	const parsedBody = workspacePresetBodySchema.safeParse(bodyCandidate);
	if (!parsedBody.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message:
				"Тело запроса должно быть JSON-объектом с опциональными numberOfChairs (целое > 0) и hasPediatricMode (boolean).",
		});
	}

	const finalFlags = { ...flags };
	if (parsedBody.data.hasPediatricMode !== undefined) {
		finalFlags.hasPediatricMode = parsedBody.data.hasPediatricMode;
	}

	const [existing] = await tx
		.select({ flags: schema.organizations.workspaceFeatureFlags })
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.for("update")
		.limit(1);
	if (!existing) {
		return reply.code(404).send({
			error: "OrganizationNotFound",
			message: "Клиника не найдена. Войдите в рабочий кабинет заново.",
		});
	}
	const existingRaw =
		existing.flags &&
		typeof existing.flags === "object" &&
		!Array.isArray(existing.flags)
			? (existing.flags as Record<string, unknown>)
			: {};
	const savedFlags = workspaceFlagsFromStorage({
		...workspaceFlagsFromStorage(existing.flags),
		...finalFlags,
		workspacePreset: presetName,
	});

	await tx
		.update(schema.organizations)
		.set({
			workspaceFeatureFlags: {
				...existingRaw,
				...savedFlags,
			},
			updatedAt: new Date(),
		})
		.where(eq(schema.organizations.id, organizationId));

	const numberOfChairs = parsedBody.data.numberOfChairs;
	setImmediate(() => {
		seedDemoDataForPreset(
			organizationId,
			presetName,
			numberOfChairs,
		).catch((e) => req.log.error({ err: e }, "Workspace preset demo seeding failed"));
	});

	return { ok: true, preset: presetName, flags: savedFlags };
}

/**
 * POST /api/workspace/preset/:name — применить именованный пресет и засеять данные.
 */
export async function applyWorkspacePresetHandler(
	req: FastifyRequest<{
		Params: { name: string };
		Body?: { numberOfChairs?: number; hasPediatricMode?: boolean };
	}>,
	reply: FastifyReply,
) {
	try {
		const organizationId = await resolveOrganizationId(req);
		if (!organizationId)
			return reply.code(401).send({ error: "Unauthorized" });

		const presetName = req.params.name as PresetName;
		const result = await withTenantWriteCtx(organizationId, (tx) =>
			executeWorkspacePresetApplyTx(
				tx,
				organizationId,
				presetName,
				req,
				reply,
			),
		);
		if (reply.sent) return reply;
		return reply.send(result);
	} catch (error) {
		req.log.error({ err: error }, "Failed to apply workspace preset");
		return reply.code(500).send({ error: "Internal Server Error" });
	}
}
