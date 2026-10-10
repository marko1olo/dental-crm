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
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
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
	// Safety: only seed if no patients exist yet for this org
	const existing = await db
		.select({ id: schema.patients.id })
		.from(schema.patients)
		.where(eq(schema.patients.organizationId, organizationId))
		.limit(1);
	if (existing.length > 0) return; // don't double-seed

	const existingChairs = await db
		.select({ id: schema.clinicChairs.id })
		.from(schema.clinicChairs)
		.where(eq(schema.clinicChairs.organizationId, organizationId))
		.limit(1);
	if (existingChairs.length === 0) {
		const flags = WORKSPACE_PRESETS[preset as Exclude<PresetName, "custom">];
		const chairCount = numberOfChairs
			? numberOfChairs
			: flags?.hasMultipleChairs
				? 4
				: 1;
		const [clinic] = await db
			.select({ id: schema.clinics.id })
			.from(schema.clinics)
			.where(eq(schema.clinics.organizationId, organizationId))
			.limit(1);
		if (clinic) {
			const chairsToInsert = Array.from({ length: chairCount }).map((_, i) => ({
				organizationId,
				clinicId: clinic.id,
				name: chairCount === 1 ? "Главный кабинет" : `Кресло ${i + 1}`,
				status: "active",
			}));
			if (chairsToInsert.length > 0) {
				await db.insert(schema.clinicChairs).values(chairsToInsert);
			}
		}
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

		const patients = await db
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
			await db.insert(schema.visits).values(visitsToInsert);

			const appointmentsToInsert = patients.map((patient) => ({
				organizationId,
				patientId: patient.id,
				status: "planned" as const,
				startsAt: new Date(Date.now() + 86400000),
				endsAt: new Date(Date.now() + 86400000 + 3600000),
				reason: "Лечение кариеса 47 зуба",
			}));
			await db.insert(schema.appointments).values(appointmentsToInsert);
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

		const patients = await db
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
			await db.insert(schema.visits).values(visitsToInsert);

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
			await db
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
			await db.insert(schema.appointments).values(appointmentsToInsert);
		}
	}
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

		const [organization] = await db
			.select({ flags: schema.organizations.workspaceFeatureFlags })
			.from(schema.organizations)
			.where(eq(schema.organizations.id, organizationId))
			.limit(1);

		return reply.send(workspaceFlagsFromStorage(organization?.flags));
	} catch (error) {
		console.error("[GET /api/workspace/profile] Error:", error);
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

		const chairs = await db
			.select({ id: schema.chairs.id, name: schema.chairs.name })
			.from(schema.chairs)
			.where(eq(schema.chairs.organizationId, organizationId))
			.orderBy(schema.chairs.name);

		return reply.send({ success: true, data: chairs });
	} catch (error) {
		console.error("[GET /api/workspace/chairs] Error:", error);
		return reply.code(500).send({ error: "Internal Server Error" });
	}
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

		/*
		 * Order (AUTH-first DoD, same as diary/preset):
		 *   1) auth → 401
		 *   2) body safeParse → 400 ValidationError RU (before any DB)
		 *   3) org lookup → 404
		 *   4) merge + write
		 * Body BEFORE org: inject tests use a signed token whose org is not in DB;
		 * if lookup ran first, array/string bodies returned 404 and hid the Zod
		 * guard. Arrays are typeof object in JS — bare guard used to accept [].
		 *
		 * ЧТО БЫЛО. Здесь из тела разбирались семнадцать признаков — и не писался
		 * НИ ОДИН: `.set({ updatedAt: new Date() })`, после чего ответ { ok: true }.
		 * То есть «Сохранить» на вкладке «Модули» и выбор в мастере первого запуска
		 * уходили в пустоту, а программа отвечала, что всё сохранено.
		 *
		 * ЧТО СТАЛО. Признаки сливаются с уже сохранённым набором и пишутся в
		 * organizations.workspace_feature_flags. Слияние, а не замена: клиент
		 * присылает Partial (WorkspaceFeaturesSelector отправляет один
		 * переключённый признак), и замена целиком сбросила бы остальные к
		 * умолчаниям — то есть включила бы обратно всё, что клиника выключила.
		 *
		 * Тело проходит через workspaceFlagsFromStorage: неизвестные ключи в базу не
		 * попадают, а значения не того типа отбрасываются. Иначе одна строка вместо
		 * true легла бы в базу и вернулась на клиент, где признак читается как
		 * булев.
		 */
		// AUTH already passed. Non-object body (array/string/number) → 400 RU.
		// null/undefined → empty partial (no-op merge is valid gameplay).
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

		const [existing] = await db
			.select({ flags: schema.organizations.workspaceFeatureFlags })
			.from(schema.organizations)
			.where(eq(schema.organizations.id, organizationId))
			.limit(1);
		if (!existing) {
			return reply.code(404).send({
				error: "OrganizationNotFound",
				message: "Клиника не найдена. Войдите в рабочий кабинет заново.",
			});
		}

		const merged = workspaceFlagsFromStorage({
			...workspaceFlagsFromStorage(existing.flags),
			...incoming,
		});

		await db
			.update(schema.organizations)
			.set({
				workspaceFeatureFlags: merged,
				updatedAt: new Date(),
			})
			.where(eq(schema.organizations.id, organizationId));

		// Возвращаем сохранённый набор: клиент видит, что именно легло в базу.
		return reply.send({ ok: true, ...merged });
	} catch (error) {
		console.error("[POST /api/workspace/profile] Error:", error);
		return reply.code(500).send({ error: "Internal Server Error" });
	}
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
		const flags =
			WORKSPACE_PRESETS[presetName as Exclude<PresetName, "custom">];
		if (!flags)
			return reply
				.code(400)
				.send({ error: `Unknown preset: ${presetName}` });

		// Body optional: missing/undefined → empty overrides. Non-object / bad types → 400.
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

		/*
		 * ЧТО БЫЛО. `.set({ ...finalFlags, updatedAt })` — признаки пресета
		 * раскладывались так, будто это КОЛОНКИ таблицы organizations. Колонок с
		 * такими именами нет; drizzle собирает SET только из известных колонок, а
		 * остальные ключи молча отбрасывает. То есть применение пресета не меняло
		 * ничего, кроме updatedAt, и отвечало { ok: true, preset, flags } — клиент
		 * видел выбранный пресет, база о нём не знала.
		 *
		 * Ошибку не поймали типы: значения WORKSPACE_PRESETS описаны свободно, и
		 * проверка типов на этом выражении проходит.
		 *
		 * Признаки складываются с уже сохранёнными: пресет задаёт не все, а
		 * незаданные не должны сбрасываться к умолчаниям. Имя пресета пишется тем же
		 * значением, что вернётся клиенту.
		 */
		const [existing] = await db
			.select({ flags: schema.organizations.workspaceFeatureFlags })
			.from(schema.organizations)
			.where(eq(schema.organizations.id, organizationId))
			.limit(1);
		if (!existing) {
			return reply.code(404).send({
				error: "OrganizationNotFound",
				message: "Клиника не найдена. Войдите в рабочий кабинет заново.",
			});
		}
		const savedFlags = workspaceFlagsFromStorage({
			...workspaceFlagsFromStorage(existing.flags),
			...finalFlags,
			workspacePreset: presetName,
		});

		await db
			.update(schema.organizations)
			.set({ workspaceFeatureFlags: savedFlags, updatedAt: new Date() })
			.where(eq(schema.organizations.id, organizationId));

		// Async seeding — don't block response
		seedDemoDataForPreset(
			organizationId,
			presetName,
			parsedBody.data.numberOfChairs,
		).catch((e) => console.error("[workspace preset] seeding error:", e));

		// Отдаём то, что легло в базу, а не то, что было в справочнике пресетов.
		return reply.send({ ok: true, preset: presetName, flags: savedFlags });
	} catch (error) {
		console.error("[POST /api/workspace/preset/:name] Error:", error);
		return reply.code(500).send({ error: "Internal Server Error" });
	}
}
