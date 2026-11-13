/**
 * clinicalBundlesRoutes.ts — Fastify роуты готовых клинических пакетов «под ключ» DENTE CRM.
 * (Мандат 8e: Автономия врача, Мандат 8n: Соло-практика, Высшая Конституция THE HAMMER).
 *
 * Интегрирован с PostgreSQL 18 на 127.0.0.1:5432, tenant isolation (organizationId),
 * точные цены в копейках (Kopecks), чистый семантический язык без советского канцелярита.
 */

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	treatmentPlanItemsNew,
	treatmentPlanStages,
	treatmentPlans,
} from "../db/schema.js";

import {
	CANONICAL_CLINICAL_BUNDLES,
	type ClinicalBundleDefinition as ApiClinicalBundle,
	type ClinicalBundleItemTemplate as ApiBundleItemTemplate,
} from "@dental/shared/clinical/bundles";

export type { ApiBundleItemTemplate, ApiClinicalBundle };
export { CANONICAL_CLINICAL_BUNDLES };

const applyBundleBodySchema = z.object({
	bundleId: z.string().trim().min(1, "Укажите ID клинического пакета"),
	toothNumber: z.number().int().min(11).max(85).optional().nullable(),
	patientId: z.string().uuid("Идентификатор пациента должен быть корректным UUID").optional().nullable(),
	planId: z.string().uuid("Идентификатор плана лечения должен быть корректным UUID").optional().nullable(),
	selectedItemIds: z.array(z.string()).optional(),
	doctorId: z.string().uuid().optional().nullable(),
});

export const clinicalBundlesRoutes: FastifyPluginAsync = async (server) => {
	// 1. GET /api/clinical-bundles и /api/v1/clinical-bundles
	const listBundlesHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalReadContext(request, reply, "list clinical bundles");
		if (!context) return;

		return reply.code(200).send({
			success: true,
			bundles: CANONICAL_CLINICAL_BUNDLES,
			total: CANONICAL_CLINICAL_BUNDLES.length,
		});
	};

	server.get("/api/clinical-bundles", listBundlesHandler);
	server.get("/api/v1/clinical-bundles", listBundlesHandler);

	// 2. GET /api/clinical-bundles/:id
	const getBundleHandler = async (
		request: FastifyRequest<{ Params: { id: string } }>,
		reply: FastifyReply,
	) => {
		const context = await requireClinicalReadContext(request, reply, "get clinical bundle");
		if (!context) return;

		const target = CANONICAL_CLINICAL_BUNDLES.find((b) => b.id === request.params.id);
		if (!target) {
			return reply.code(404).send({
				error: "BundleNotFound",
				message: `Клинический пакет с ID «${request.params.id}» не найден`,
			});
		}

		return reply.code(200).send({
			success: true,
			bundle: target,
		});
	};

	server.get<{ Params: { id: string } }>("/api/clinical-bundles/:id", getBundleHandler);
	server.get<{ Params: { id: string } }>("/api/v1/clinical-bundles/:id", getBundleHandler);

	// 3. POST /api/clinical-bundles/apply
	const applyBundleHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "apply clinical bundle");
		if (!context) return;

		const parsed = applyBundleBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры применения клинического пакета",
				issues: parsed.error.issues,
			});
		}

		const data = parsed.data;
		const targetBundle = CANONICAL_CLINICAL_BUNDLES.find((b) => b.id === data.bundleId);
		if (!targetBundle) {
			return reply.code(404).send({
				error: "BundleNotFound",
				message: `Клинический пакет с ID «${data.bundleId}» не найден`,
			});
		}

		const effectiveTooth = targetBundle.requiresTooth
			? data.toothNumber || targetBundle.defaultTooth
			: undefined;

		const selectedItems = data.selectedItemIds && data.selectedItemIds.length > 0
			? targetBundle.items.filter((it) => data.selectedItemIds!.includes(it.id))
			: targetBundle.items.filter((it) => it.defaultSelected !== false);

		if (selectedItems.length === 0) {
			return reply.code(400).send({
				error: "EmptySelection",
				message: "Не выбрано ни одной позиции из клинического пакета",
			});
		}

		let totalRub = 0;
		let totalKopecks = 0;
		const constructedItems = selectedItems.map((it) => {
			totalRub += it.defaultPriceRub;
			totalKopecks += it.defaultPriceKopecks;
			const toothPrefix = effectiveTooth ? `[Зуб ${effectiveTooth}] ` : "";
			return {
				id: randomUUID(),
				bundleId: targetBundle.id,
				serviceCode: it.serviceCode,
				code804n: it.code804n || it.serviceCode,
				name: `${toothPrefix}${it.name}`,
				category: it.category,
				toothNumber: effectiveTooth ?? null,
				priceRub: it.defaultPriceRub,
				priceKopecks: it.defaultPriceKopecks,
				unitPriceRub: it.defaultPriceRub,
				discountRub: 0,
				quantity: 1,
				phase: targetBundle.stageNumber,
				stageKind: targetBundle.stageKind,
				materials: it.materials,
				clinicalRationale: it.clinicalRationale,
			};
		});

		// Если передан существующий planId, привязываем позиции напрямую в PostgreSQL 18
		if (data.planId) {
			const [plan] = await db
				.select({ id: treatmentPlans.id })
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.id, data.planId),
						eq(treatmentPlans.organizationId, context.organizationId),
					),
				)
				.limit(1);

			if (!plan) {
				return reply.code(404).send({
					error: "TreatmentPlanNotFound",
					message: "Указанный план лечения не найден в вашей клинике",
				});
			}

			// Транзакционная вставка в treatmentPlanItemsNew
			await db.transaction(async (tx) => {
				for (const item of constructedItems) {
					await tx.insert(treatmentPlanItemsNew).values({
						organizationId: context.organizationId,
						planId: data.planId!,
						toothNumber: item.toothNumber,
						priceId: item.serviceCode,
						quantity: item.quantity,
						price: item.priceRub.toFixed(2),
						discount: item.discountRub.toFixed(2),
						phase: item.phase,
						isBundle: true,
						doctorId: data.doctorId || null,
					});
				}
			});
		}

		return reply.code(200).send({
			success: true,
			bundleId: targetBundle.id,
			bundleTitle: targetBundle.title,
			toothNumber: effectiveTooth ?? null,
			totalRub,
			totalKopecks,
			itemsCount: constructedItems.length,
			items: constructedItems,
		});
	};

	server.post("/api/clinical-bundles/apply", applyBundleHandler);
	server.post("/api/v1/clinical-bundles/apply", applyBundleHandler);
};

export default clinicalBundlesRoutes;
