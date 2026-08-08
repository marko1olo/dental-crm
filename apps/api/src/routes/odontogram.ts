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
		console.warn(
			"[toothStateHistory] Не удалось подготовить таблицу истории:",
			error,
		);
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

/*
 * Номера зубов по FDI (ISO 3950) проверяет `fdiToothNumberSchema` из общего
 * контракта — `packages/shared`, рядом с `clinicalToothRowsSchema`. Там же
 * записана и история правила: диапазон `min(11).max(99)` пропускал 19, 20, 29,
 * 30, 39, 40, 49, 50, 56–60, 66–70, 76–80 и 86–99, ни одно из которых зубом не
 * является, и опечатка «49» вместо «48» уходила в план лечения со стоимостью.
 *
 * Держать набор здесь было нельзя: клиент проверяет ТО ЖЕ правило и с сервера
 * его не видел, поэтому 19 проходил проверку сметы, а сервер отклонял ВЕСЬ план
 * лечения. Копию списка не делаем — скопированный список расходится.
 */

const batchToothStateSchema = z.object({
	toothNumbers: z.array(fdiToothNumberSchema).min(1).max(64),
	state: z.enum(toothStateValues),
	surfaces: z.array(z.string()).optional(),
});

/*
 * Цена и скидка позиции сметы — деньги клиники, не «просто number».
 * `z.number().finite().min(0)` пропускал 1500.505 (третья цифра после запятой),
 * и отказ приходил только из `chargeLineKopecks` как 422. Единый контракт
 * `nonNegativeMoneyRubSchema` режет подкопеечные суммы на входе (400), как прайс
 * в settings. Верхняя граница — прежний потолок маршрута.
 */
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

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * ПРОВОДКА СМЕТЫ В КНИГУ ЛЕЧЕНИЯ: ЗАЧЕМ ЭТОТ МАРШРУТ ПИШЕТ ДВЕ ТАБЛИЦЫ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. План лечения на 3 491,49 ₽ сохранялся, маршрут
 * отвечал 200, а деньги его не видели: главный экран показывал «назначено 0 ₽»,
 * отчёт дебиторки — «долг 0 ₽ у 0 должников», счёт пациенту уходил с пустой
 * суммой. По данным программы пациент лечился бесплатно, и взыскивать было
 * нечего. Причина: смета ложилась в `treatment_plans` и
 * `treatment_plan_items_new`, а ВСЕ восемь денежных читателей клиники читают
 * `treatment_items`, у которой писателя в боевом коде не было ни одного.
 *
 * ПОЧЕМУ ЭТО НЕ ВТОРАЯ КОПИЯ ОДНОЙ СУЩНОСТИ. Таблицы разные по смыслу, и разбор
 * с уликами лежит в `.agents/lead/recon-treatment-items-vs-plan-items.md`:
 *   • `treatment_plan_items_new` — строка подписываемой СМЕТЫ-ДОКУМЕНТА: ребёнок
 *     `plan_id`, есть этап `phase` (его читают recall хирургии и история зуба),
 *     нет ни пациента, ни статуса, ни визита;
 *   • `treatment_items` — строка КНИГИ ЛЕЧЕНИЯ пациента: обязательство заплатить,
 *     со своим статусом `proposed → approved → in_progress → completed →
 *     cancelled` и с привязкой к приёму.
 * Отношение между ними — «документ и его проводка», а не копия. Поэтому смета
 * остаётся на месте, а здесь появляется её проводка.
 *
 * ПИСАТЕЛЬ ОДИН, А НЕ ВТОРОЙ. В боевом коде в `treatment_items` не писал никто:
 * единственные вставки были в демо-сеялке снимков и в тестах. Этот маршрут
 * становится ПЕРВЫМ писателем, в той же транзакции, что и смета: либо клиника
 * получает и документ, и деньги, либо не получает ничего.
 *
 * КАК ПОЗИЦИЯ КНИГИ СВЯЗАНА СО СВОИМ ПЛАНОМ БЕЗ МИГРАЦИИ. Колонки `plan_id` в
 * `treatment_items` нет (проверено в `information_schema` живой базы: 17 колонок,
 * ссылки на план среди них нет), а миграции в этой правке запрещены. Связь
 * поэтому лежит в САМОМ идентификаторе строки: первые 32 символа UUID берутся у
 * плана, последние 4 шестнадцатеричных разряда — номер слота. Приём в этом дереве
 * уже используется — ровно так `tests/support/fixtureOrganizations.ts` выдаёт
 * идентификаторы фикстур, и так же построены идентификаторы демо-сеялки.
 *
 * Почему не проще. Удалять «все непривязанные позиции пациента» нельзя: у
 * пациента может быть второй план, в том числе ПОДПИСАННЫЙ (правку подписанного
 * маршрут запрещает), и такая уборка стёрла бы его деньги. Писать ссылку в
 * `notes` тоже нельзя: это человеческое поле, оно объявлено в общем контракте
 * (`treatmentPlanItemSchema.notes`) и доезжает до экрана — врач увидел бы там
 * машинный идентификатор.
 */

/** Длина «плановой» части идентификатора: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxx`. */
const LEDGER_ID_PREFIX_LENGTH = 32;

/**
 * Слотов ровно столько, сколько разрядов осталось от UUID. Позиций в плане не
 * больше 500 (`treatmentPlanUpsertSchema`), так что упереться в предел можно
 * только накопив за 65 536 сохранений столько выполненных позиций, которые
 * смета уже не вправе переписывать. Тогда правильный ответ — громкий отказ, а не
 * тихо потерянная позиция.
 */
const LEDGER_MAX_SLOT = 0xffff;

/** Идентификатор позиции книги лечения: план + номер слота. */
function ledgerRowId(planId: string, slot: number): string {
	return `${planId.slice(0, LEDGER_ID_PREFIX_LENGTH)}${slot
		.toString(16)
		.padStart(4, "0")}`;
}

/**
 * Статусы, в которых позиция книги ещё принадлежит смете и может быть
 * перезаписана её правкой.
 *
 * Всё, что дальше по жизненному циклу (`in_progress`, `completed`), — уже
 * оказанная или начатая услуга: смета не вправе её переоценить или снять.
 * Отменённую (`cancelled`) правка сметы тоже не воскрешает.
 */
const LEDGER_STATUSES_OWNED_BY_PLAN = new Set<string>(["proposed", "approved"]);

/** Строка прайса подставляется в `service_id` только если это настоящий UUID. */
const UUID_SHAPE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
			const toothNumbers: number[] = [
				...new Set<number>(parsed.data.toothNumbers),
			];
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
							eq(toothStates.organizationId, organizationId),
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
			const now = new Date();

			let planId: string | null = null;
			let totalPriceKopecks = 0;
			try {
				/*
				 * Итог считается в ЦЕЛЫХ КОПЕЙКАХ, а не в рублях с плавающей точкой.
				 * Прежнее выражение `item.price * item.quantity - item.discount` в
				 * рублях измеримо теряло копейку: 1 500,10 × 3 давало
				 * 4500.299999999999, и маршрут возвращал врачу именно это число,
				 * тогда как колонка `numeric(12,2)` молча писала 4500.30 — в ответе
				 * маршрута и в базе оказывались РАЗНЫЕ суммы за одно лечение.
				 *
				 * Формула строки — `цена × количество − скидка`, не ниже нуля, и она
				 * не написана здесь заново: `chargeLineKopecks` берётся из
				 * `money/patientDebt.ts`, единственного дома этой формулы. Там же
				 * записано, почему порядок действий именно такой (скидка задана
				 * строкой позиции целиком, поэтому вычитается один раз из итога
				 * строки, а не умножается на количество).
				 *
				 * Сумма мельче копейки (1500.505) уже отсекается схемой позиции
				 * (`nonNegativeMoneyRubSchema` → 400). `chargeLineKopecks` остаётся
				 * второй линией: если кто-то обойдёт Zod, бросит
				 * `MoneyPrecisionError` со `statusCode = 422`. Тихое округление
				 * подтвердило бы чужую потерю точности подписью клиники.
				 */
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
						/*
						 * БЫЛО: SELECT/UPDATE плана по id+patientId без organizationId;
						 * DELETE позиций сметы — только по planId. Смета — денежный документ
						 * (totalPrice → книга лечения). СТАЛО: organizationId в WHERE на
						 * SELECT, UPDATE и DELETE позиций (колонка есть, INSERT её пишет).
						 */
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
								/*
								 * ПРИНАДЛЕЖНОСТЬ КЛИНИКЕ ЗАДАЁТСЯ ЯВНО.
								 *
								 * Её здесь не было, хотя `organizationId` лежит в области
								 * видимости строкой выше — строкой плана. Колонка
								 * нуллябельна и в базе, и в объявлении, поэтому база
								 * молчала, а позиции подписываемой сметы ложились БЕЗ
								 * владельца.
								 *
								 * Чем это опасно. Строка без организации не принадлежит
								 * никому: запрос с отбором по клинике её не видит, а
								 * запрос без отбора видит её у ВСЕХ клиник. Ровно из
								 * этого класса выросла межклиничная утечка приёмов, где
								 * `POST /api/appointments` принимал пациента, врача и
								 * кресло другой клиники и отвечал 201, а ФИО чужого
								 * пациента было видно в расписании (закрыто `f18a261bb`).
								 * Здесь речь о сметах — документе, под которым пациент
								 * ставит подпись.
								 *
								 * Сегодня строк в таблице ноль, то есть наблюдать утечку
								 * не на чем — но ружьё было заряжено, и первая же
								 * сохранённая смета его взводила.
								 */
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

					/*
					 * ПРОВОДКА СМЕТЫ В КНИГУ ЛЕЧЕНИЯ. Ниже — единственное место в
					 * боевом коде, которое создаёт строки `treatment_items`, то есть
					 * то самое, чего у клиники не было и из-за чего долг пациента
					 * читался нулём. Шаги идут в этой транзакции: смета и её деньги
					 * либо появляются вместе, либо не появляются вовсе.
					 */
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

					/*
					 * Правка сметы переписывает только то, что смете ещё принадлежит:
					 * позиция без приёма и в статусе `proposed`/`approved`. Как только
					 * лечение начали, выполнили или отменили, оно вышло из-под власти
					 * сметы — переоценить или снять его правкой сметы нельзя, иначе
					 * клиника потеряет оказанную услугу, а пациент получит счёт на
					 * сумму, которой в его лечении не было.
					 */
					const rewritableIds = ownedRows
						.filter(
							(row) =>
								row.visitId === null &&
								LEDGER_STATUSES_OWNED_BY_PLAN.has(row.status),
						)
						.map((row) => row.id);
					if (rewritableIds.length > 0) {
						/*
						 * БЫЛО: DELETE только по inArray(id). Ids отобраны SELECT'ом
						 * с organizationId, но сам DELETE шёл без tenant-ключа:
						 * defense-in-depth того же класса, что family wallet /
						 * appointments UPDATE — чужая строка с совпавшим UUID
						 * (копия базы, сид) могла уйти. Смета пациента — деньги
						 * и план лечения.
						 * СТАЛО: organizationId + id в WHERE удаления.
						 */
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
						/*
						 * Ссылка на прайс, а не только название: без `service_id`
						 * назначенное лечение «висит в воздухе» — правила списания
						 * материалов его не находят, а изменение цены в прайсе ни с
						 * чем не связано. Подставляется только тот `priceId`, который
						 * действительно есть в прайсе ЭТОЙ клиники: колонка — внешний
						 * ключ, и чужой или самодельный идентификатор уронил бы
						 * сохранение плана целиком.
						 */
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

						/*
						 * ПРОВЕРКА КЛИНИЧЕСКИХ ПРАВИЛ ДО ЗАПИСИ (Race Condition Fix)
						 * Валидация Clinical Rules Engine ранее происходила только в `/evaluate`,
						 * что позволяло сохранить план с противопоказаниями в обход блокировок.
						 * Теперь мы принудительно проверяем правила внутри транзакции.
						 */
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

						// NOTE: evaluateClinicalRulesInDb reads clinicalRules via global `db` (org-level config,
						// not transactional data). Using global db here is intentional and safe — these rules
						// are configuration, not rows mutated by this transaction. The dynamic import() was
						// removed to eliminate cold-module-load latency and double pool connection on hot path.
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
							(err as any).statusCode = 400;
							throw err;
						}

						/*
						 * Подписанный пациентом план — это согласие на лечение, поэтому
						 * его позиции идут статусом `approved`, а не `proposed`.
						 * Денежные читатели считают назначенным и то и другое (канон
						 * отбирает `status <> 'cancelled'`), так что на долг статус не
						 * влияет — он влияет на то, что видит врач в карточке.
						 */
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
							/*
							 * `unit_price_rub` — каноническая цена за единицу, из
							 * которой все восемь читателей считают деньги.
							 * `price_rub` не читает никто, но колонка `not null`;
							 * принятая в дереве конвенция для такой парной колонки —
							 * то же значение (`tests/routes/serviceCatalogWriteProof.ts`:
							 * «вторая денежная колонка заполнена тем же»).
							 */
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
								// Приёма ещё не было: назначенное лечение не привязано к
								// визиту, и привязку делает не смета.
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
				/*
				 * Итог отдаётся числом (контракт ждёт `number`), но получается ОДНИМ
				 * делением целых копеек на 100, а не сложением рублей. Раньше здесь
				 * уходила сумма, накопленная в плавающей точке: врач видел
				 * 4500.299999999999 там, где в базе лежало 4500.30.
				 */
				totalPrice: rublesFromKopecks(totalPriceKopecks),
				plan: savedPlan ?? null,
			});
		},
	);
}
