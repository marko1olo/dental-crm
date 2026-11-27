/**
 * clinicalBundlesRoutes.ts — Fastify роуты готовых клинических пакетов «под ключ» DENTE CRM.
 * (Мандат 8e: Автономия врача, Мандат 8n: Соло-практика, Высшая Конституция THE HAMMER).
 *
 * Интегрирован с PostgreSQL 18 на 127.0.0.1:5432, tenant isolation (organizationId),
 * точные цены в копейках (Kopecks), чистый семантический язык без советского канцелярита.
 */

import { randomUUID } from "node:crypto";
import { kopecksToNumericString, kopecksToRubles } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { defineTenantMutation, defineTenantQuery } from "../core/routeFactories.js";
import {
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../db/schema.js";

import {
	CANONICAL_CLINICAL_BUNDLES,
	type ClinicalBundleDefinition as ApiClinicalBundle,
	type ClinicalBundleItemTemplate as ApiBundleItemTemplate,
} from "@dental/shared/clinical/bundles";

export type { ApiBundleItemTemplate, ApiClinicalBundle };
export { CANONICAL_CLINICAL_BUNDLES };

const applyBundleBodySchema = z
	.object({
		bundleId: z.string().trim().min(1, "Укажите ID клинического пакета"),
		toothNumber: z.number().int().min(11).max(85).optional().nullable(),
		patientId: z.string().uuid("Идентификатор пациента должен быть корректным UUID").optional().nullable(),
		planId: z.string().uuid("Идентификатор плана лечения должен быть корректным UUID").optional().nullable(),
		selectedItemIds: z.array(z.string()).optional(),
		doctorId: z.string().uuid().optional().nullable(),
	})
	.strict();

export const clinicalBundlesRoutes: FastifyPluginAsync = async (server) => {
	const bundleAuthRead = {
		allowClinicTokenWithoutStaff: true,
		allowAdminSecretBypass: true,
		allowUnverifiedHeaderRead: true,
	} as const;

	const bundleAuthWrite = {
		allowClinicTokenWithoutStaff: true,
		allowAdminSecretBypass: true,
	} as const;

	const registerListBundles = (path: string) => {
		defineTenantQuery(server, {
			path,
			permission: "clinical.read",
			authOptions: bundleAuthRead,
			query: async () => ({
				success: true,
				bundles: CANONICAL_CLINICAL_BUNDLES,
				total: CANONICAL_CLINICAL_BUNDLES.length,
			}),
		});
	};

	const registerGetBundle = (path: string) => {
		defineTenantQuery(server, {
			path,
			permission: "clinical.read",
			authOptions: bundleAuthRead,
			query: async ({ request, reply }) => {
				const { id } = request.params as { id: string };
				const target = CANONICAL_CLINICAL_BUNDLES.find((b) => b.id === id);
				if (!target) {
					return reply.code(404).send({
						error: "BundleNotFound",
						message: `Клинический пакет с ID «${id}» не найден`,
					});
				}
				return {
					success: true,
					bundle: target,
				};
			},
		});
	};

	const registerApplyBundle = (path: string) => {
		defineTenantMutation(server, {
			method: "POST",
			path,
			permission: "clinical.write",
			authOptions: bundleAuthWrite,
			idempotency: "optional_header",
			execute: async ({ tx, principal, request, reply }) => {
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

				const selectedItemIds = data.selectedItemIds;
				const selectedItems =
					selectedItemIds && selectedItemIds.length > 0
						? targetBundle.items.filter((it) => selectedItemIds.includes(it.id))
						: targetBundle.items.filter((it) => it.defaultSelected !== false);

				if (selectedItems.length === 0) {
					return reply.code(400).send({
						error: "EmptySelection",
						message: "Не выбрано ни одной позиции из клинического пакета",
					});
				}

				let totalKopecks = 0;
				const constructedItems = selectedItems.map((it) => {
					const itemKopecks = Math.round(it.defaultPriceKopecks);
					totalKopecks += itemKopecks;
					const toothPrefix = effectiveTooth ? `[Зуб ${effectiveTooth}] ` : "";
					const itemRub = kopecksToRubles(itemKopecks);
					return {
						id: randomUUID(),
						bundleId: targetBundle.id,
						serviceCode: it.serviceCode,
						code804n: it.code804n || it.serviceCode,
						name: `${toothPrefix}${it.name}`,
						category: it.category,
						toothNumber: effectiveTooth ?? null,
						priceKopecks: itemKopecks,
						unitPriceKopecks: itemKopecks,
						discountKopecks: 0,
						priceRub: itemRub,
						unitPriceRub: itemRub,
						discountRub: 0,
						quantity: 1,
						phase: targetBundle.stageNumber,
						stageKind: targetBundle.stageKind,
						materials: it.materials,
						clinicalRationale: it.clinicalRationale,
					};
				});
				const totalRub = kopecksToRubles(totalKopecks);

				const targetPlanId = data.planId;
				if (targetPlanId) {
					const [plan] = await tx
						.select({
							id: treatmentPlans.id,
							patientId: treatmentPlans.patientId,
						})
						.from(treatmentPlans)
						.where(
							and(
								eq(treatmentPlans.id, targetPlanId),
								eq(treatmentPlans.organizationId, principal.organizationId),
							),
						)
						.limit(1);

					if (!plan) {
						return reply.code(404).send({
							error: "TreatmentPlanNotFound",
							message: "Указанный план лечения не найден в вашей клинике",
						});
					}
					if (data.patientId && plan.patientId !== data.patientId) {
						return reply.code(409).send({
							error: "PatientPlanMismatch",
							message: "Указанный план лечения принадлежит другому пациенту",
						});
					}

					await tx.insert(treatmentPlanItemsNew).values(
						constructedItems.map((item) => ({
							organizationId: principal.organizationId,
							planId: targetPlanId,
							toothNumber: item.toothNumber,
							priceId: item.serviceCode,
							quantity: item.quantity,
							price: kopecksToNumericString(item.priceKopecks),
							priceKopecks: BigInt(item.priceKopecks),
							discount: kopecksToNumericString(0),
							discountKopecks: 0n,
							commissionKopecks: 0n,
							phase: item.phase,
							isBundle: true,
							doctorId: data.doctorId || null,
						})),
					);
				}

				return {
					success: true,
					bundleId: targetBundle.id,
					bundleTitle: targetBundle.title,
					toothNumber: effectiveTooth ?? null,
					totalKopecks,
					totalRub,
					itemsCount: constructedItems.length,
					items: constructedItems,
				};
			},
		});
	};

	registerListBundles("/api/clinical-bundles");
	registerListBundles("/api/v1/clinical-bundles");
	registerGetBundle("/api/clinical-bundles/:id");
	registerGetBundle("/api/v1/clinical-bundles/:id");
	registerApplyBundle("/api/clinical-bundles/apply");
	registerApplyBundle("/api/v1/clinical-bundles/apply");
};

export default clinicalBundlesRoutes;
