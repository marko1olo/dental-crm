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
	toothStateHistory,
	toothStates,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";
import { wsBroker } from "../services/websocketBroker.js";

/**
 * Создаёт таблицу истории, если миграция ещё не применена.
 *
 * Клиника может обновить код раньше, чем выполнит SQL-миграцию, и запись приёма
 * не должна из-за этого падать.
 *
 * ЗДЕСЬ СТОЯЛА ССЫЛКА «тот же приём, что и в
 * db/patientCommunicationTimelinesQuery.ts». Она была неверна: в том модуле
 * никакого CREATE TABLE IF NOT EXISTS не было, он просто читал таблицу без
 * писателя. Сам модуль удалён вместе с переводом журнала обращений на живой
 * источник, и ссылаться теперь не на что: этот приём в apps/api/src остался в
 * единственном экземпляре — здесь.
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
		console.warn("[toothStateHistory] Не удалось подготовить таблицу истории:", error);
	}
}

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

/**
 * Допустимые номера зубов по двухцифровой системе FDI (ISO 3950).
 *
 * БЫЛО: z.number().int().min(11).max(99) — диапазон пропускал 19, 20, 29, 30,
 * 39, 40, 49, 50, 56–60, 66–70, 76–80 и 86–99. Ни один из них зубом не является.
 * Опечатка «49» вместо «48» сохранялась, попадала в план лечения со стоимостью,
 * но не отображалась в одонтограмме: врач видел строку без зуба, а вмешательство
 * планировалось для несуществующей позиции.
 */
const VALID_FDI_TOOTH_NUMBERS = new Set<number>([
	// Постоянные зубы
	11, 12, 13, 14, 15, 16, 17, 18,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
	// Молочные зубы
	51, 52, 53, 54, 55,
	61, 62, 63, 64, 65,
	71, 72, 73, 74, 75,
	81, 82, 83, 84, 85,
]);

const fdiToothNumberSchema = z
	.number()
	.int()
	.refine((value) => VALID_FDI_TOOTH_NUMBERS.has(value), {
		message:
			"Недопустимый номер зуба. Система FDI: 11–18, 21–28, 31–38, 41–48 (постоянные), 51–55, 61–65, 71–75, 81–85 (молочные).",
	});

const batchToothStateSchema = z.object({
	toothNumbers: z.array(fdiToothNumberSchema).min(1).max(64),
	state: z.enum(toothStateValues),
	surfaces: z.array(z.string()).optional(),
});

const treatmentPlanItemSchema = z.object({
	toothNumber: fdiToothNumberSchema.optional().nullable(),
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

			// Явный тип: схема валидации гарантирует числа, но вывод типов из
			// zod-схемы с .refine() до этого места не доходит.
			const toothNumbers: number[] = [...new Set<number>(parsed.data.toothNumbers)];
			if (toothNumbers.length === 0)
				return reply.send({ success: true, states: [] });

			await ensureToothStateHistoryTable();
			// Кто именно меняет состояние — раньше в истории всегда стоял «System».
			const actorUserId = getRequestIdentity(request).userId;

			const now = new Date();
			const inserted = await db.transaction(async (tx) => {
				// БЫЛО: delete + insert без сохранения предыдущего состояния —
				// история лечения зуба стиралась при каждом изменении.
				// Сначала читаем текущее состояние, чтобы записать переход.
				const previousStates = await tx
					.select({
						toothNumber: toothStates.toothNumber,
						state: toothStates.state,
						surfaces: toothStates.surfaces,
					})
					.from(toothStates)
					.where(
						and(
							eq(toothStates.patientId, patientId),
							inArray(toothStates.toothNumber, toothNumbers),
						),
					);
				// Тип указан явно: вывод типов из результата запроса здесь
				// неоднозначен, и обращение к .state/.surfaces могло не пройти
				// проверку компилятора.
				type PreviousToothState = {
					toothNumber: number;
					state: string;
					surfaces: unknown;
				};
				const previousByTooth = new Map<number, PreviousToothState>(
					(previousStates as PreviousToothState[]).map((row) => [row.toothNumber, row]),
				);

				await tx
					.delete(toothStates)
					.where(
						and(
							eq(toothStates.patientId, patientId),
							inArray(toothStates.toothNumber, toothNumbers),
						),
					);

				// Историю пишем в ТОЙ ЖЕ транзакции: смена состояния и запись
				// о ней либо происходят вместе, либо не происходят вовсе.
				const changedTeeth = toothNumbers.filter((toothNumber) => {
					const previous = previousByTooth.get(toothNumber);
					// Повторное сохранение того же состояния историю не засоряет.
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
							previousSurfaces: previousByTooth.get(toothNumber)?.surfaces ?? null,
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
								organizationId,
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
