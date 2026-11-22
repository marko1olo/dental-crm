/**
 * branchesRoutes.ts — API управления филиалами и отделениями сети клиник.
 * 
 * Домен 30: Сеть клиник, Франшиза, Филиалы, Межфилиальный трансфер.
 * Мандаты 8e, 8n, 8x, 8bf, 8bg, 8bo, 8az.
 */

import { and, asc, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import {
	requireSettingsAccess,
	requireSettingsMutationAccess,
} from "./helpers.js";

export const createBranchSchema = z.object({
	name: z.string().trim().min(1, "Наименование филиала обязательно").max(255),
	address: z.string().trim().max(500).nullable().optional(),
	phone: z.string().trim().max(80).nullable().optional(),
	timezone: z.string().trim().max(100).default("Europe/Samara"),
});

export const updateBranchSchema = z.object({
	name: z.string().trim().min(1).max(255).optional(),
	address: z.string().trim().max(500).nullable().optional(),
	phone: z.string().trim().max(80).nullable().optional(),
	timezone: z.string().trim().max(100).optional(),
});

export const branchIdParamSchema = z.object({
	id: z.string().uuid("Некорректный UUID филиала"),
});

export function registerBranchesRoutes(app: FastifyInstance): void {
	// GET /api/branches — Получение всех филиалов организации с подсчетом кресел
	app.get("/api/branches", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;

		const branchRows = await db
			.select({
				id: schema.clinics.id,
				organizationId: schema.clinics.organizationId,
				name: schema.clinics.name,
				address: schema.clinics.address,
				phone: schema.clinics.phone,
				timezone: schema.clinics.timezone,
				createdAt: schema.clinics.createdAt,
			})
			.from(schema.clinics)
			.where(eq(schema.clinics.organizationId, orgId))
			.orderBy(asc(schema.clinics.createdAt));

		// Подсчет активных кресел в каждом отделении
		const chairsCountRows = await db
			.select({
				clinicId: schema.chairs.clinicId,
				count: sql<number>`count(*)::int`,
			})
			.from(schema.chairs)
			.where(
				and(
					eq(schema.chairs.organizationId, orgId),
					eq(schema.chairs.isActive, true),
				),
			)
			.groupBy(schema.chairs.clinicId);

		const chairCountMap = new Map<string, number>();
		for (const row of chairsCountRows) {
			if (row.clinicId) {
				chairCountMap.set(row.clinicId, Number(row.count) || 0);
			}
		}

		const branches = branchRows.map((b) => ({
			...b,
			chairCount: chairCountMap.get(b.id) ?? 0,
		}));

		return reply.code(200).send({
			success: true,
			data: branches,
			total: branches.length,
		});
	});

	// GET /api/branches/:id — Получение данных конкретного филиала
	app.get("/api/branches/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;

		const parsedParams = branchIdParamSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный ID филиала.",
			});
		}

		const [branch] = await db
			.select()
			.from(schema.clinics)
			.where(
				and(
					eq(schema.clinics.id, parsedParams.data.id),
					eq(schema.clinics.organizationId, orgId),
				),
			)
			.limit(1);

		if (!branch) {
			return reply.code(404).send({
				error: "NotFound",
				message: "Филиал не найден.",
			});
		}

		const chairs = await db
			.select()
			.from(schema.chairs)
			.where(
				and(
					eq(schema.chairs.clinicId, branch.id),
					eq(schema.chairs.organizationId, orgId),
				),
			);

		return reply.code(200).send({
			success: true,
			data: {
				...branch,
				chairs,
				chairCount: chairs.filter((c) => c.isActive).length,
			},
		});
	});

	// POST /api/branches — Создание нового филиала клиники
	app.post("/api/branches", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireSettingsMutationAccess(request, reply);
		if (!orgId) return;

		const parsed = createBranchSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message || "Некорректные параметры филиала.",
			});
		}

		const { name, address, phone, timezone } = parsed.data;

		const [created] = await db
			.insert(schema.clinics)
			.values({
				organizationId: orgId,
				name,
				address: address ?? null,
				phone: phone ?? null,
				timezone: timezone || "Europe/Samara",
			})
			.returning();

		return reply.code(201).send({
			success: true,
			data: created,
		});
	});

	// PATCH /api/branches/:id — Обновление филиала клиники
	app.patch("/api/branches/:id", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireSettingsMutationAccess(request, reply);
		if (!orgId) return;

		const parsedParams = branchIdParamSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный ID филиала.",
			});
		}

		const parsedBody = updateBranchSchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsedBody.error.issues[0]?.message || "Некорректные параметры обновления.",
			});
		}

		const updateData: Partial<typeof schema.clinics.$inferInsert> = {};
		if (parsedBody.data.name !== undefined) updateData.name = parsedBody.data.name;
		if (parsedBody.data.address !== undefined) updateData.address = parsedBody.data.address;
		if (parsedBody.data.phone !== undefined) updateData.phone = parsedBody.data.phone;
		if (parsedBody.data.timezone !== undefined) updateData.timezone = parsedBody.data.timezone;

		if (Object.keys(updateData).length === 0) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Нет данных для обновления.",
			});
		}

		const [updated] = await db
			.update(schema.clinics)
			.set(updateData)
			.where(
				and(
					eq(schema.clinics.id, parsedParams.data.id),
					eq(schema.clinics.organizationId, orgId),
				),
			)
			.returning();

		if (!updated) {
			return reply.code(404).send({
				error: "NotFound",
				message: "Филиал не найден.",
			});
		}

		return reply.code(200).send({
			success: true,
			data: updated,
		});
	});
}
