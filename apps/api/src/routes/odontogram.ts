import {
	fdiToothNumberSchema,
	nonNegativeMoneyRubSchema,
	sumKopecks,
} from "@dental/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { evaluateClinicalRulesInDb } from "../db/clinicalQuery.js";
import {
	patients,
	serviceCatalogItems,
	toothStateHistory,
	toothStates,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../db/schema.js";
import {
	chargeLineKopecks,
	debtNumericText,
	rublesFromKopecks,
} from "../money/patientDebt.js";
import { getRequestIdentity } from "../security/identity.js";
import { wsBroker } from "../services/websocketBroker.js";

/**
 * Создаёт таблицу истории переходов состояний зубов, если миграция ещё не применена.
 */
let toothStateHistoryTableReady = false;
async function ensureToothStateHistoryTable(): Promise<void> {
	if (toothStateHistoryTableReady) return;
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "tooth_state_history" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_id" uuid NOT NULL,
				"tooth_number" integer NOT NULL,
				"previous_state" text,
				"new_state" text NOT NULL,
				"previous_surfaces" jsonb,
				"new_surfaces" jsonb,
				"changed_by_user_id" uuid,
				"visit_id" uuid,
				"reason" text,
				"changed_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS "idx_tooth_state_history_patient_tooth"
				ON "tooth_state_history" ("patient_id", "tooth_number", "changed_at");
		`);
		toothStateHistoryTableReady = true;
	} catch (error) {
		console.warn(
			"[toothStateHistory] Не удалось подготовить таблицу истории:",
			error,
		);
	}
}

export const CLINICAL_TOOTH_STATE_VALUES = [
	"Healthy",
	"Caries",
	"Pulpitis",
	"Periodontitis",
	"Root_Canal_Treated",
	"Filled",
	"Crown",
	"Bridge",
	"Bridge_Abutment",
	"Implant",
	"Planned_Implant",
	"Missing",
	"Extracted",
	"Impacted",
	"Mobility_I",
	"Mobility_II",
	"Mobility_III",
	"Mobility_IV",
	"Furcation_I",
	"Furcation_II",
	"Furcation_III",
] as const;

export type ClinicalToothState = (typeof CLINICAL_TOOTH_STATE_VALUES)[number];

const batchToothStateSchema = z.object({
	toothNumbers: z.array(fdiToothNumberSchema).min(1).max(64),
	state: z.enum(CLINICAL_TOOTH_STATE_VALUES),
	surfaces: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
});

const treatmentPlanMoneyRubSchema = nonNegativeMoneyRubSchema.refine(
	(value) => value <= 100_000_000,
	{ message: "сумма позиции плана не помещается в допустимый диапазон" },
);

const treatmentPlanItemSchema = z.object({
	toothNumber: fdiToothNumberSchema.optional().nullable(),
	priceId: z.string().trim().min(1).max(200),
	name: z.string().trim().max(500).optional(),
	quantity: z.number().int().min(1).max(999).default(1),
	price: treatmentPlanMoneyRubSchema,
	discount: treatmentPlanMoneyRubSchema.default(0),
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

const LEDGER_ID_PREFIX_LENGTH = 32;
const LEDGER_MAX_SLOT = 0xffff;

function ledgerRowId(planId: string, slot: number): string {
	return `${planId.slice(0, LEDGER_ID_PREFIX_LENGTH)}${slot
		.toString(16)
		.padStart(4, "0")}`;
}

const LEDGER_STATUSES_OWNED_BY_PLAN = new Set<string>(["proposed", "approved"]);
const UUID_SHAPE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ensurePatientInOrganization(
	patientId: string,
	organizationId: string,
): Promise<{ id: string } | null> {
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

function splitStoredPriceId(value: string | null): { priceId: string; name: string } {
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
		updatedAt: (plan.updatedAt ?? plan.createdAt).toISOString(),
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

async function loadTreatmentPlansForPatient(
	patientId: string,
	organizationId: string,
) {
	const plans = await db
		.select()
		.from(treatmentPlans)
		.where(
			and(
				eq(treatmentPlans.patientId, patientId),
				eq(treatmentPlans.organizationId, organizationId),
			),
		)
		.orderBy(desc(treatmentPlans.updatedAt));

	if (plans.length === 0) return [];

	const planIds = plans.map((plan) => plan.id);
	const items = await db
		.select()
		.from(treatmentPlanItemsNew)
		.where(
			and(
				inArray(treatmentPlanItemsNew.planId, planIds),
				eq(treatmentPlanItemsNew.organizationId, organizationId),
			),
		);

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
		if (!UUID_SHAPE.test(patientId)) {
			return reply.code(400).send({ error: "InvalidPatientId" });
		}
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
			.where(
				and(
					eq(toothStates.organizationId, organizationId),
					eq(toothStates.patientId, patientId),
				),
			);

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
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const parsed = batchToothStateSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ToothStateValidationError",
					message: "Ошибка валидации зубной формулы. Проверьте номера зубов и статус.",
					details: parsed.error.format(),
				});
			}

			const toothNumbers: number[] = [
				...new Set<number>(parsed.data.toothNumbers),
			];
			if (toothNumbers.length === 0)
				return reply.send({ success: true, states: [] });

			await ensureToothStateHistoryTable();
			const actorUserId = getRequestIdentity(request).userId;
			const now = new Date();

			const inserted = await db.transaction(async (tx) => {
				const previousStates = await tx
					.select({
						toothNumber: toothStates.toothNumber,
						state: toothStates.state,
						surfaces: toothStates.surfaces,
					})
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.patientId, patientId),
							inArray(toothStates.toothNumber, toothNumbers),
						),
					);

				type PreviousToothState = {
					toothNumber: number;
					state: string;
					surfaces: unknown;
				};
				const previousByTooth = new Map<number, PreviousToothState>(
					(previousStates as PreviousToothState[]).map((row) => [
						row.toothNumber,
						row,
					]),
				);

				await tx
					.delete(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.patientId, patientId),
							inArray(toothStates.toothNumber, toothNumbers),
						),
					);

				const changedTeeth = toothNumbers.filter((toothNumber) => {
					const previous = previousByTooth.get(toothNumber);
					return !previous || previous.state !== parsed.data.state;
				});

				if (changedTeeth.length > 0) {
					await tx.insert(toothStateHistory).values(
						changedTeeth.map((toothNumber) => ({
							organizationId,
							patientId,
							toothNumber,
							previousState: previousByTooth.get(toothNumber)?.state ?? null,
							newState: parsed.data.state,
							previousSurfaces:
								previousByTooth.get(toothNumber)?.surfaces ?? null,
							newSurfaces: parsed.data.surfaces || null,
							changedByUserId: actorUserId,
							changedAt: now,
						})),
					);
				}

				return await tx
					.insert(toothStates)
					.values(
						toothNumbers.map((toothNumber) => ({
							organizationId,
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
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const plans = await loadTreatmentPlansForPatient(patientId, organizationId);
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
			if (!UUID_SHAPE.test(patientId)) {
				return reply.code(400).send({ error: "InvalidPatientId" });
			}
			if (!(await ensurePatientInOrganization(patientId, organizationId))) {
				return reply.code(404).send({ error: "PatientNotFound" });
			}

			const parsed = treatmentPlanUpsertSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "TreatmentPlanValidationError",
					message: "План лечения не сохранен: проверьте услуги, цены и этапы.",
					details: parsed.error.format(),
				});
			}

			const input = parsed.data;
			const now = new Date();
			let planId: string | null = null;
			let totalPriceKopecks = 0;

			try {
				const lineKopecks = input.items.map((item) =>
					chargeLineKopecks({
						patientId,
						status: "proposed",
						unitPriceRub: item.price,
						quantity: item.quantity,
						discountRub: item.discount,
					}),
				);
				totalPriceKopecks = sumKopecks(lineKopecks);
				const totalPriceText = debtNumericText(totalPriceKopecks);

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
									eq(treatmentPlans.organizationId, organizationId),
								),
							)
							.for("update")
							.limit(1);

						if (!existing) return null;

						if (existing.patientSignature) {
							const err = new Error(
								"Запрещено изменять подписанный план лечения. Создайте новый.",
							);
							// biome-ignore lint/suspicious/noExplicitAny: error mapping
							(err as any).statusCode = 409;
							throw err;
						}

						const [planUpdated] = await tx
							.update(treatmentPlans)
							.set({
								name: input.name,
								totalPrice: totalPriceText,
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
									eq(treatmentPlans.organizationId, organizationId),
								),
							)
							.returning({ id: treatmentPlans.id });
						if (!planUpdated) return null;

						await tx
							.delete(treatmentPlanItemsNew)
							.where(
								and(
									eq(treatmentPlanItemsNew.planId, savedPlanId),
									eq(treatmentPlanItemsNew.organizationId, organizationId),
								),
							);
					} else {
						const [created] = await tx
							.insert(treatmentPlans)
							.values({
								organizationId,
								patientId,
								name: input.name,
								totalPrice: totalPriceText,
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
								organizationId,
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

					const ledgerPrefix = savedPlanId.slice(0, LEDGER_ID_PREFIX_LENGTH);
					const ownedRows = await tx
						.select({
							id: treatmentItems.id,
							status: treatmentItems.status,
							visitId: treatmentItems.visitId,
						})
						.from(treatmentItems)
						.where(
							and(
								eq(treatmentItems.organizationId, organizationId),
								eq(treatmentItems.patientId, patientId),
								sql`left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))}) = ${ledgerPrefix}`,
							),
						);

					const rewritableIds = ownedRows
						.filter(
							(row) =>
								row.visitId === null &&
								LEDGER_STATUSES_OWNED_BY_PLAN.has(row.status),
						)
						.map((row) => row.id);

					if (rewritableIds.length > 0) {
						await tx
							.delete(treatmentItems)
							.where(
								and(
									eq(treatmentItems.organizationId, organizationId),
									inArray(treatmentItems.id, rewritableIds),
								),
							);
					}
					const keptSlots = new Set(
						ownedRows
							.filter((row) => !rewritableIds.includes(row.id))
							.map((row) => row.id.toLowerCase()),
					);

					if (input.items.length > 0) {
						const priceIdCandidates = [
							...new Set(
								input.items
									.map((item) => item.priceId)
									.filter((priceId) => UUID_SHAPE.test(priceId)),
							),
						];
						const knownServiceIds = new Set<string>(
							priceIdCandidates.length === 0
								? []
								: (
										await tx
											.select({ id: serviceCatalogItems.id })
											.from(serviceCatalogItems)
											.where(
												and(
													eq(
														serviceCatalogItems.organizationId,
														organizationId,
													),
													inArray(serviceCatalogItems.id, priceIdCandidates),
												),
											)
									).map((row) => row.id),
						);

						const completedItems = await tx
							.select({ serviceId: treatmentItems.serviceId })
							.from(treatmentItems)
							.where(
								and(
									eq(treatmentItems.organizationId, organizationId),
									eq(treatmentItems.patientId, patientId),
									eq(treatmentItems.status, "completed"),
								),
							);

						const evaluation = await evaluateClinicalRulesInDb(organizationId, {
							patientId,
							serviceIds: Array.from(knownServiceIds),
							completedServiceIds: completedItems
								.map((r) => r.serviceId)
								.filter(Boolean) as string[],
							enforceBlockers: true,
						});

						const blockingRule = evaluation.evaluations.find(
							(e) => !e.resolved && e.severity === "blocker",
						);
						if (blockingRule) {
							const err = new Error(
								`Отказ: план содержит противопоказание. ${blockingRule.message}`,
							);
							// biome-ignore lint/suspicious/noExplicitAny: error mapping
							(err as any).statusCode = 400;
							throw err;
						}

						const ledgerStatus = input.patientSignature
							? "approved"
							: "proposed";

						let slot = 0;
						const ledgerValues = input.items.map((item, index) => {
							while (
								slot <= LEDGER_MAX_SLOT &&
								keptSlots.has(ledgerRowId(savedPlanId, slot).toLowerCase())
							) {
								slot += 1;
							}
							if (slot > LEDGER_MAX_SLOT) {
								throw new Error(
									`Позиции плана лечения некуда записать: свободных слотов книги лечения не осталось (позиция ${index + 1}).`,
								);
							}
							const id = ledgerRowId(savedPlanId, slot);
							slot += 1;

							const unitPriceRub = rublesFromKopecks(
								chargeLineKopecks({
									patientId,
									status: ledgerStatus,
									unitPriceRub: item.price,
									quantity: 1,
									discountRub: 0,
								}),
							);
							return {
								id,
								organizationId,
								patientId,
								visitId: null,
								serviceId: knownServiceIds.has(item.priceId)
									? item.priceId
									: null,
								toothCode:
									item.toothNumber === null || item.toothNumber === undefined
										? null
										: String(item.toothNumber),
								title: item.name?.trim() || item.priceId,
								quantity: String(item.quantity),
								priceRub: unitPriceRub,
								unitPriceRub,
								discountRub: rublesFromKopecks(
									chargeLineKopecks({
										patientId,
										status: ledgerStatus,
										unitPriceRub: item.discount,
										quantity: 1,
										discountRub: 0,
									}),
								),
								status: ledgerStatus as "proposed" | "approved",
								notes: null,
							};
						});
						await tx.insert(treatmentItems).values(ledgerValues);
					}

					return savedPlanId;
				});
				// biome-ignore lint/suspicious/noExplicitAny: error mapping
			} catch (err: any) {
				if (err.statusCode) {
					return reply.code(err.statusCode).send({
						error: "TreatmentPlanValidationError",
						message: err.message,
					});
				}
				throw err;
			}

			if (!planId) {
				return reply.code(input.id ? 404 : 500).send({
					error: input.id ? "TreatmentPlanNotFound" : "TreatmentPlanSaveFailed",
				});
			}

			const [savedPlan] = await loadTreatmentPlansForPatient(patientId, organizationId);
			return reply.send({
				success: true,
				planId,
				totalPrice: rublesFromKopecks(totalPriceKopecks),
				plan: savedPlan ?? null,
			});
		},
	);
}
