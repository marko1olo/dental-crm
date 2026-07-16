import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	patients,
	toothStates,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";

const toothStateValues = [
	"Caries",
	"Pulpitis",
	"Missing",
	"Crown",
	"Implant",
	"Filled",
	"Healthy",
	"Planned_Implant",
] as const;

const batchToothStateSchema = z.object({
	toothNumbers: z.array(z.number().int().min(11).max(99)).min(1).max(64),
	state: z.enum(toothStateValues),
	surfaces: z.array(z.string()).optional(),
});

const treatmentPlanItemSchema = z.object({
	toothNumber: z.number().int().min(11).max(99).optional().nullable(),
	priceId: z.string().trim().min(1).max(200),
	name: z.string().trim().max(500).optional(),
	quantity: z.number().int().min(1).max(999).default(1),
	price: z.number().finite().min(0).max(100_000_000),
	discount: z.number().finite().min(0).max(100_000_000).default(0),
	phase: z.number().int().min(1).max(12).default(1),
	isAuto: z.boolean().optional(),
});

const treatmentPlanUpsertSchema = z.object({
	id: z.string().uuid().optional().nullable(),
	name: z.string().trim().min(1).max(300).default("Комплексный план лечения"),
	patientSignature: z.string().max(2_000_000).optional().nullable(),
	items: z.array(treatmentPlanItemSchema).max(500).default([]),
});

type TreatmentPlanRow = typeof treatmentPlans.$inferSelect;
type TreatmentPlanItemRow = typeof treatmentPlanItemsNew.$inferSelect;

async function ensurePatientInOrganization(
	patientId: string,
	organizationId: string,
) {
	const [patient] = await db
		.select({ id: patients.id })
		.from(patients)
		.where(
			and(
				eq(patients.id, patientId),
				eq(patients.organizationId, organizationId),
			),
		)
		.limit(1);
	return patient ?? null;
}

function numeric(value: unknown): number {
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

function splitStoredPriceId(value: string | null) {
	const stored = value ?? "";
	const separatorIndex = stored.indexOf("::");
	if (separatorIndex < 0) return { priceId: stored, name: stored };
	return {
		priceId: stored.slice(0, separatorIndex),
		name: stored.slice(separatorIndex + 2) || stored.slice(0, separatorIndex),
	};
}

function serializeTreatmentPlan(
	plan: TreatmentPlanRow,
	items: TreatmentPlanItemRow[],
) {
	return {
		id: plan.id,
		patientId: plan.patientId,
		name: plan.name,
		status: plan.status,
		totalPrice: numeric(plan.totalPrice),
		patientSignature: plan.patientSignature ?? null,
		createdAt: plan.createdAt.toISOString(),
		updatedAt: plan.updatedAt.toISOString(),
		items: items.map((item) => {
			const { priceId, name } = splitStoredPriceId(item.priceId);
			return {
				id: item.id,
				toothNumber: item.toothNumber ?? undefined,
				priceId,
				name,
				quantity: item.quantity,
				price: numeric(item.price),
				discount: numeric(item.discount),
				phase: item.phase,
				isAuto: item.isBundle,
			};
		}),
	};
}

async function loadTreatmentPlansForPatient(patientId: string) {
	const plans = await db
		.select()
		.from(treatmentPlans)
		.where(eq(treatmentPlans.patientId, patientId))
		.orderBy(desc(treatmentPlans.updatedAt));

	if (plans.length === 0) return [];

	const planIds = plans.map((plan) => plan.id);
	const items = await db
		.select()
		.from(treatmentPlanItemsNew)
		.where(inArray(treatmentPlanItemsNew.planId, planIds));
	const itemsByPlanId = new Map<string, TreatmentPlanItemRow[]>();
	for (const item of items) {
		const group = itemsByPlanId.get(item.planId) ?? [];
		group.push(item);
		itemsByPlanId.set(item.planId, group);
	}

	return plans.map((plan) =>
		serializeTreatmentPlan(plan, itemsByPlanId.get(plan.id) ?? []),
	);
}

export async function registerOdontogramRoutes(app: FastifyInstance) {
	app.get("/api/patients/:patientId/tooth-states", async (request, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"tooth states read",
		);
		if (!organizationId) return;
		const { patientId } = request.params as { patientId: string };
		if (!(await ensurePatientInOrganization(patientId, organizationId))) {
			return reply.code(404).send({ error: "PatientNotFound" });
		}

		const states = await db
			.select({
				toothNumber: toothStates.toothNumber,
				state: toothStates.state,
				surfaces: toothStates.surfaces,
			})
			.from(toothStates)
			.where(eq(toothStates.patientId, patientId));

		return reply.send({ success: true, states });
	});

	app.post(
		"/api/patients/:patientId/tooth-states/batch",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"tooth states update",
			);
			if (!organizationId) return;
			const { patientId } = request.params as { patientId: string };
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const parsed = batchToothStateSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ToothStateValidationError",
					message: "Ошибка валидации. Проверьте отправленные данные.",
				});
			}

			const toothNumbers = [...new Set(parsed.data.toothNumbers)];
			if (toothNumbers.length === 0)
				return reply.send({ success: true, states: [] });

			await db
				.delete(toothStates)
				.where(
					and(
						eq(toothStates.patientId, patientId),
						inArray(toothStates.toothNumber, toothNumbers),
					),
				);
			const now = new Date();
			const inserted = await db
				.insert(toothStates)
				.values(
					toothNumbers.map((toothNumber) => ({
						patientId,
						toothNumber,
						state: parsed.data.state,
						surfaces: parsed.data.surfaces || null,
						updatedAt: now,
						isSynced: false,
						version: 1,
					})),
				)
				.returning({
					toothNumber: toothStates.toothNumber,
					state: toothStates.state,
					surfaces: toothStates.surfaces,
				});

			wsBroker.broadcastToOrganization(organizationId, {
				type: "UPDATE_ODONTOGRAM",
				payload: { patientId, states: inserted },
			});
			return reply.send({ success: true, states: inserted });
		},
	);

	app.get(
		"/api/patients/:patientId/treatment-plans",
		async (request, reply) => {
			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"treatment plans read",
			);
			if (!organizationId) return;
			const { patientId } = request.params as { patientId: string };
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const plans = await loadTreatmentPlansForPatient(patientId);
			return reply.send({ success: true, plans });
		},
	);

	app.post(
		"/api/patients/:patientId/treatment-plans",
		async (request, reply) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"treatment plan upsert",
			);
			if (!organizationId) return;
			const { patientId } = request.params as { patientId: string };
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const parsed = treatmentPlanUpsertSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "TreatmentPlanValidationError",
					message: "План лечения не сохранен: проверьте услуги, цены и этапы.",
				});
			}

			const input = parsed.data;
			const totalPrice = input.items.reduce(
				(sum, item) =>
					sum + Math.max(0, item.price * item.quantity - item.discount),
				0,
			);
			const now = new Date();

			let planId: string | null = null;
			try {
				planId = await db.transaction(async (tx) => {
					let savedPlanId = input.id ?? null;
					if (savedPlanId) {
						const [existing] = await tx
							.select({
								id: treatmentPlans.id,
								patientSignature: treatmentPlans.patientSignature,
							})
							.from(treatmentPlans)
							.where(
								and(
									eq(treatmentPlans.id, savedPlanId),
									eq(treatmentPlans.patientId, patientId),
								),
							)
							.for("update")
							.limit(1);
						if (!existing) return null;

						if (existing.patientSignature) {
							const err = new Error(
								"Запрещено изменять подписанный план лечения. Создайте новый.",
							);
							(err as any).statusCode = 409;
							throw err;
						}

						await tx
							.update(treatmentPlans)
							.set({
								name: input.name,
								totalPrice: totalPrice.toString(),
								...(input.patientSignature !== undefined
									? { patientSignature: input.patientSignature }
									: {}),
								updatedAt: now,
								isSynced: false,
								version: sql`${treatmentPlans.version} + 1`,
							})
							.where(
								and(
									eq(treatmentPlans.id, savedPlanId),
									eq(treatmentPlans.patientId, patientId),
								),
							);
						await tx
							.delete(treatmentPlanItemsNew)
							.where(eq(treatmentPlanItemsNew.planId, savedPlanId));
					} else {
						const [created] = await tx
							.insert(treatmentPlans)
							.values({
								patientId,
								name: input.name,
								totalPrice: totalPrice.toString(),
								patientSignature: input.patientSignature ?? null,
								isSynced: false,
								version: 1,
								updatedAt: now,
							})
							.returning({ id: treatmentPlans.id });
						savedPlanId = created?.id ?? null;
					}

					if (!savedPlanId) return null;

					if (input.items.length > 0) {
						await tx.insert(treatmentPlanItemsNew).values(
							input.items.map((item) => ({
								planId: savedPlanId,
								toothNumber: item.toothNumber ?? null,
								priceId: item.name
									? `${item.priceId}::${item.name}`
									: item.priceId,
								quantity: item.quantity,
								price: item.price.toString(),
								discount: item.discount.toString(),
								phase: item.phase,
								isBundle: Boolean(item.isAuto),
							})),
						);
					}

					return savedPlanId;
				});
			} catch (err: any) {
				if (err.statusCode) {
					return reply.code(err.statusCode).send({
						error: "TreatmentPlanValidationError",
						message: err.message,
					});
				}
				throw err;
			}

			if (!planId)
				return reply.code(input.id ? 404 : 500).send({
					error: input.id ? "TreatmentPlanNotFound" : "TreatmentPlanSaveFailed",
				});

			const [savedPlan] = await loadTreatmentPlansForPatient(patientId);
			return reply.send({
				success: true,
				planId,
				totalPrice,
				plan: savedPlan ?? null,
			});
		},
	);
}
