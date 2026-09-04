/**
 * treatmentConsumables.ts — Fastify API routes for Treatment Consumables & Stock Auto-Deductions.
 */

import {
	consumableLinkCreateSchema,
	consumableLinkUpdateSchema,
	stockAvailabilityCheckRequestSchema,
	toothTreatmentStockDeductionRequestSchema,
	visitStockDeductionRequestSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	InsufficientStockError,
	TreatmentConsumablesService,
	TreatmentConsumablesServiceError,
} from "../services/treatmentConsumablesService.js";

const listLinksQuerySchema = z.object({
	serviceId: z.string().optional(),
	inventoryItemId: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1).optional(),
	pageSize: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

const linkOptionsQuerySchema = z.object({
	q: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(30).optional(),
});

const alertsQuerySchema = z.object({
	expiringWithinDays: z.coerce.number().int().min(1).max(365).default(30).optional(),
});

export const treatmentConsumablesRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// GET /:organizationId/links — List all consumable links
	server.get<{
		Params: { organizationId: string };
		Querystring: {
			serviceId?: string;
			inventoryItemId?: string;
			page?: number;
			pageSize?: number;
		};
	}>("/:organizationId/links", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables read links",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedQuery = listLinksQuerySchema.safeParse(request.query ?? {});
		const query = parsedQuery.success ? parsedQuery.data : {};

		const result = await TreatmentConsumablesService.listLinks(
			db,
			organizationId,
			query,
		);
		return result;
	});

	// GET /:organizationId/links/:linkId — Get a single consumable link
	server.get<{
		Params: { organizationId: string; linkId: string };
	}>("/:organizationId/links/:linkId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables read single link",
		);
		if (!resolvedOrgId) return;

		const { organizationId, linkId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const link = await TreatmentConsumablesService.getLink(
			db,
			organizationId,
			linkId,
		);
		if (!link) {
			return reply.status(404).send({
				error: "LinkNotFound",
				message: "Связь расходного материала не найдена",
			});
		}
		return link;
	});

	// POST /:organizationId/links — Create a new consumable link
	server.post<{
		Params: { organizationId: string };
		Body: {
			serviceId: string;
			inventoryItemId: string;
			quantity: number;
			note?: string | null;
		};
	}>("/:organizationId/links", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables create link",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = consumableLinkCreateSchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		try {
			const link = await TreatmentConsumablesService.createLink(
				db,
				organizationId,
				parsedBody.data,
			);
			return reply.status(201).send(link);
		} catch (err) {
			if (err instanceof TreatmentConsumablesServiceError) {
				return reply.status(err.statusCode).send({
					error: err.code,
					message: err.message,
				});
			}
			throw err;
		}
	});

	// PUT /:organizationId/links/:linkId — Update a consumable link
	server.put<{
		Params: { organizationId: string; linkId: string };
		Body: {
			quantity?: number;
			note?: string | null;
		};
	}>("/:organizationId/links/:linkId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables update link",
		);
		if (!resolvedOrgId) return;

		const { organizationId, linkId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = consumableLinkUpdateSchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		try {
			const link = await TreatmentConsumablesService.updateLink(
				db,
				organizationId,
				linkId,
				parsedBody.data,
			);
			return link;
		} catch (err) {
			if (err instanceof TreatmentConsumablesServiceError) {
				return reply.status(err.statusCode).send({
					error: err.code,
					message: err.message,
				});
			}
			throw err;
		}
	});

	// DELETE /:organizationId/links/:linkId — Delete a consumable link
	server.delete<{
		Params: { organizationId: string; linkId: string };
	}>("/:organizationId/links/:linkId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables delete link",
		);
		if (!resolvedOrgId) return;

		const { organizationId, linkId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		try {
			const result = await TreatmentConsumablesService.deleteLink(
				db,
				organizationId,
				linkId,
			);
			return result;
		} catch (err) {
			if (err instanceof TreatmentConsumablesServiceError) {
				return reply.status(err.statusCode).send({
					error: err.code,
					message: err.message,
				});
			}
			throw err;
		}
	});

	// GET /:organizationId/service/:serviceId — Get full BOM recipe for service
	server.get<{
		Params: { organizationId: string; serviceId: string };
	}>("/:organizationId/service/:serviceId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables read service recipe",
		);
		if (!resolvedOrgId) return;

		const { organizationId, serviceId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		try {
			const recipe = await TreatmentConsumablesService.getRecipeForService(
				db,
				organizationId,
				serviceId,
			);
			return recipe;
		} catch (err) {
			if (err instanceof TreatmentConsumablesServiceError) {
				return reply.status(err.statusCode).send({
					error: err.code,
					message: err.message,
				});
			}
			throw err;
		}
	});

	// GET /:organizationId/options — Get picker options for linking
	server.get<{
		Params: { organizationId: string };
		Querystring: { q?: string; limit?: number };
	}>("/:organizationId/options", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables read options",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedQuery = linkOptionsQuerySchema.safeParse(request.query ?? {});
		const q = parsedQuery.success ? parsedQuery.data.q : undefined;
		const limit = parsedQuery.success ? parsedQuery.data.limit : 30;

		const options = await TreatmentConsumablesService.getLinkOptions(
			db,
			organizationId,
			q,
			limit,
		);
		return options;
	});

	// POST /:organizationId/deduct/visit — Auto-deduct consumables for visit (doctor instant solo writeoff)
	server.post<{
		Params: { organizationId: string };
		Body: {
			visitId: string;
			userId?: string | null;
			transactionType?: "auto_deduct" | "manual_writeoff";
			services?: Array<{ serviceId: string; quantity?: number }>;
			items?: Array<{ inventoryItemId: string; quantity: number; reason?: string | null }>;
			carpulesCount?: number;
			drugName?: string;
			paperJournalAcknowledged?: boolean;
			allowOverdraft?: boolean;
		};
	}>("/:organizationId/deduct/visit", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables deduct visit",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = visitStockDeductionRequestSchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		try {
			const result = await db.transaction(async (tx) => {
				return TreatmentConsumablesService.deductForVisit(tx, {
					organizationId,
					visitId: parsedBody.data.visitId,
					...(parsedBody.data.userId !== undefined ? { userId: parsedBody.data.userId } : { userId: (request.user as any)?.id ?? null }),
					...(parsedBody.data.transactionType !== undefined ? { transactionType: parsedBody.data.transactionType } : {}),
					...(parsedBody.data.services !== undefined ? { services: parsedBody.data.services } : {}),
					...(parsedBody.data.items !== undefined ? { items: parsedBody.data.items } : {}),
					...(parsedBody.data.carpulesCount !== undefined ? { carpulesCount: parsedBody.data.carpulesCount } : {}),
					...(parsedBody.data.drugName !== undefined ? { drugName: parsedBody.data.drugName } : {}),
					...(parsedBody.data.paperJournalAcknowledged !== undefined ? { paperJournalAcknowledged: parsedBody.data.paperJournalAcknowledged } : {}),
					...(parsedBody.data.allowOverdraft !== undefined ? { allowOverdraft: parsedBody.data.allowOverdraft } : {}),
				});
			});
			return result;
		} catch (err: unknown) {
			const isInsufficientStock =
				err instanceof InsufficientStockError ||
				(err as any)?.error === "InsufficientStock" ||
				(err as any)?.name === "InsufficientStockError" ||
				(err as any)?.code === "InsufficientStock";

			if (isInsufficientStock) {
				// Клинический закон: задержка накладной снабженцем не должна блокировать операцию и лечение зуба.
				// Мягкий овердрафт: отдаем 200 OK с предупреждением о дефиците партии вместо блокирующего 409.
				const itemErr = err as any;
				const invItemId = itemErr.inventoryItemId ?? "unknown";
				const invItemName = itemErr.inventoryItemName ?? "Материал";
				const avail = Number(itemErr.availableStock ?? 0);
				const req = Number(itemErr.requiredStock ?? 1);
				return reply.status(200).send({
					success: true,
					isOverdraft: true,
					warning: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}). Приём проведён без блокировки.`,
					inventoryItemId: invItemId,
					inventoryItemName: invItemName,
					availableStock: avail,
					requiredStock: req,
					deductions: [],
					warnings: [
						{
							type: "out_of_stock",
							itemId: invItemId,
							itemName: invItemName,
							message: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}).`,
							currentStock: avail - req,
							criticalThreshold: 0,
						},
					],
				});
			}
			throw err;
		}
	});

	// POST /:organizationId/deduct/tooth-treatment — Deduct consumables for tooth procedure
	server.post<{
		Params: { organizationId: string };
		Body: {
			treatmentItemId: string;
			serviceId: string;
			toothNumber?: number | null;
			quantity?: number;
			visitId?: string | null;
			userId?: string | null;
			transactionType?: "auto_deduct" | "manual_writeoff";
		};
	}>("/:organizationId/deduct/tooth-treatment", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables deduct tooth treatment",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = toothTreatmentStockDeductionRequestSchema.safeParse(
			request.body,
		);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		try {
			const result = await db.transaction(async (tx) => {
				return TreatmentConsumablesService.deductForToothTreatment(tx, {
					organizationId,
					treatmentItemId: parsedBody.data.treatmentItemId,
					serviceId: parsedBody.data.serviceId,
					...(parsedBody.data.toothNumber !== undefined ? { toothNumber: parsedBody.data.toothNumber } : {}),
					...(parsedBody.data.quantity !== undefined ? { quantity: parsedBody.data.quantity } : {}),
					...(parsedBody.data.visitId !== undefined ? { visitId: parsedBody.data.visitId } : {}),
					...(parsedBody.data.userId !== undefined ? { userId: parsedBody.data.userId } : { userId: (request.user as any)?.id ?? null }),
					...(parsedBody.data.transactionType !== undefined ? { transactionType: parsedBody.data.transactionType } : {}),
				});
			});
			return result;
		} catch (err: unknown) {
			const isInsufficientStock =
				err instanceof InsufficientStockError ||
				(err as any)?.error === "InsufficientStock" ||
				(err as any)?.name === "InsufficientStockError" ||
				(err as any)?.code === "InsufficientStock";

			if (isInsufficientStock) {
				// Клинический закон: задержка накладной снабженцем не должна блокировать операцию и лечение зуба.
				// Мягкий овердрафт: отдаем 200 OK с предупреждением о дефиците партии вместо блокирующего 409.
				const itemErr = err as any;
				const invItemId = itemErr.inventoryItemId ?? "unknown";
				const invItemName = itemErr.inventoryItemName ?? "Материал";
				const avail = Number(itemErr.availableStock ?? 0);
				const req = Number(itemErr.requiredStock ?? 1);
				return reply.status(200).send({
					success: true,
					isOverdraft: true,
					warning: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}). Процедура проведена без блокировки.`,
					inventoryItemId: invItemId,
					inventoryItemName: invItemName,
					availableStock: avail,
					requiredStock: req,
					deductions: [],
					warnings: [
						{
							type: "out_of_stock",
							itemId: invItemId,
							itemName: invItemName,
							message: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}).`,
							currentStock: avail - req,
							criticalThreshold: 0,
						},
					],
				});
			}
			throw err;
		}
	});

	// POST /:organizationId/check-availability — Pre-flight check stock sufficiency
	server.post<{
		Params: { organizationId: string };
		Body: {
			items: Array<{ serviceId: string; quantity: number }>;
		};
	}>("/:organizationId/check-availability", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables check availability",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedBody = stockAvailabilityCheckRequestSchema.safeParse(
			request.body,
		);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		const result = await TreatmentConsumablesService.checkStockSufficiency(
			db,
			organizationId,
			parsedBody.data.items,
		);
		return result;
	});

	// GET /:organizationId/alerts — Low stock & batch expiration alerts
	server.get<{
		Params: { organizationId: string };
		Querystring: { expiringWithinDays?: number };
	}>("/:organizationId/alerts", async (request, reply) => {
		const resolvedOrgId = await requireResolvedOrganizationId(
			request,
			reply,
			"treatment consumables read alerts",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsedQuery = alertsQuerySchema.safeParse(request.query ?? {});
		const expiringWithinDays = parsedQuery.success
			? parsedQuery.data.expiringWithinDays
			: 30;

		const alerts = await TreatmentConsumablesService.getInventoryAlerts(
			db,
			organizationId,
			...(expiringWithinDays !== undefined ? [{ expiringWithinDays }] : []),
		);
		return alerts;
	});

	// POST /:organizationId/deduct/emergency-writeoff — Emergency write-off with guaranteed soft overdraft
	server.post<{
		Params: { organizationId: string };
		Body: {
			items: Array<{
				inventoryItemId: string;
				quantity: number;
				reason?: string | null;
			}>;
			visitId?: string | null;
			userId?: string | null;
			notes?: string | null;
		};
	}>("/:organizationId/deduct/emergency-writeoff", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables emergency writeoff",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const emergencySchema = z.object({
			items: z
				.array(
					z.object({
						inventoryItemId: z.string().min(1, "Идентификатор материала обязателен"),
						quantity: z.number().positive("Количество должно быть больше 0"),
						reason: z.string().nullable().optional(),
					}),
				)
				.min(1, { message: "Список позиций для списания не может быть пустым" }),
			visitId: z.string().nullable().optional(),
			userId: z.string().nullable().optional(),
			notes: z.string().nullable().optional(),
		});

		const parsedBody = emergencySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса",
			});
		}

		try {
			const result = await db.transaction(async (tx) => {
				return TreatmentConsumablesService.deductManualItems(tx, {
					organizationId,
					items: parsedBody.data.items,
					visitId: parsedBody.data.visitId,
					userId: parsedBody.data.userId ?? (request.user as any)?.id ?? null,
					notes: parsedBody.data.notes,
					allowOverdraft: true,
				});
			});
			return result;
		} catch (err: unknown) {
			const isInsufficientStock =
				err instanceof InsufficientStockError ||
				(err as any)?.error === "InsufficientStock" ||
				(err as any)?.name === "InsufficientStockError" ||
				(err as any)?.code === "InsufficientStock";

			if (isInsufficientStock) {
				const itemErr = err as any;
				const invItemId = itemErr.inventoryItemId ?? "unknown";
				const invItemName = itemErr.inventoryItemName ?? "Материал";
				const avail = Number(itemErr.availableStock ?? 0);
				const req = Number(itemErr.requiredStock ?? 1);
				return reply.status(200).send({
					success: true,
					isOverdraft: true,
					warning: `Мягкий овердрафт склада: дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}). Операция проведена без блокировки.`,
					inventoryItemId: invItemId,
					inventoryItemName: invItemName,
					availableStock: avail,
					requiredStock: req,
					deductions: [],
					warnings: [
						{
							type: "out_of_stock",
							itemId: invItemId,
							itemName: invItemName,
							message: `Мягкий овердрафт склада: дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}).`,
							currentStock: avail - req,
							criticalThreshold: 0,
						},
					],
				});
			}
			throw err;
		}
	});

	// POST /:organizationId/quick-writeoff-carpules — 1-Click carpules writeoff by nurse
	server.post<{
		Params: { organizationId: string };
		Body: {
			carpulesCount?: number;
			drugName?: string;
			visitId?: string | null;
			userId?: string | null;
			notes?: string | null;
		};
	}>("/:organizationId/quick-writeoff-carpules", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"treatment consumables quick writeoff carpules",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const body = request.body ?? {};
		const result = await db.transaction(async (tx) => {
			return TreatmentConsumablesService.quickWriteoffCarpules(tx, {
				organizationId,
				carpulesCount: body.carpulesCount,
				drugName: body.drugName,
				visitId: body.visitId ?? null,
				userId: body.userId ?? (request.user as any)?.id ?? null,
				notes: body.notes ?? null,
			});
		});

		return result;
	});
};
