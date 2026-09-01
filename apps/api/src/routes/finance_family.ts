import {
	kopecksToNumericString,
	nonNegativeMoneyRubSchema,
	parseKopecks,
	positiveMoneyRubSchema,
	rubToKopecks,
} from "@dental/shared";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { familyGroups, patients, payments, serviceCatalogItems } from "../db/schema.js";
import { enforcePermissionWhenStaffKnown } from "../security/permissions.js";
import {
	FamilyWalletError,
	familyWalletService,
} from "../services/familyWallet/FamilyWalletService.js";
import { wsBroker } from "../services/websocketBroker.js";

const familyPaymentSchema = z.object({
	organizationId: z.string().uuid().optional(),
	patientId: z.string().uuid(),
	familyGroupId: z.string().uuid(),
	serviceId: z.string().uuid().optional(),
	catalogItemId: z.string().uuid().optional(),
	discountRub: nonNegativeMoneyRubSchema.optional(),
	discountPercent: z.number().min(0).max(100).refine((val) => typeof val === "number" && Number.isFinite(val) && !Number.isNaN(val)).optional(),
	/*
	 * КОПЕЙКИ. Здесь стояло `z.number().int().positive()` с обоснованием
	 * «The payments ledger stores whole rubles (integer column)». Обоснование
	 * было ЛОЖНЫМ, и это проверяется по объявлению схемы, а не по памяти:
	 * `payments.amount_rub` — `numeric(12, 2)` (`db/schema.ts`, миграция 0131),
	 * `family_groups.balance` — `numeric(12, 2)` (миграция 0000). Обе колонки
	 * копейки хранят с самого начала.
	 *
	 * ЧТО ЭТО СТОИЛО КЛИНИКЕ. Оплатить с семейного кошелька 1 500,50 ₽ было
	 * нельзя вовсе — маршрут отвечал 400 на законную сумму. При этом ПОПОЛНЕНИЕ
	 * шло через ту же дверь с тем же ограничением, а баланс всё равно умел
	 * держать копейки (например, после прямой правки в базе или переноса из
	 * старой системы): такие копейки с кошелька было не снять НИКОГДА — ни одна
	 * разрешённая сумма их не выбирала. Деньги семьи оставались в базе
	 * неизрасходуемыми.
	 *
	 * `positiveMoneyRubSchema` — тот же контракт денег, что у кассы
	 * (`createPaymentSchema.amountRub`): третий знак после запятой отвергается,
	 * ноль и минус отвергаются.
	 */
	amountRub: positiveMoneyRubSchema,
	documentId: z.string().uuid().optional(),
	visitId: z.string().uuid().optional(),
	// Ключ идемпотентности. Без него повтор запроса после обрыва связи списывал
	// деньги с семейного баланса ВТОРОЙ раз за то же лечение: маршрут читал
	// баланс, вычитал и вставлял платёж, не проверяя, не сделал ли он это уже.
	// Блокировка .for("update") защищает только от одновременных запросов,
	// но не от повторной отправки.
	clientMutationId: z.string().min(1).max(128).optional(),
});

/**
 * Пополнение семейного кошелька.
 *
 * БЫЛО: эндпоинта пополнения не существовало вообще. Баланс инициализировался
 * нулём и только УМЕНЬШАЛСЯ при оплате, поэтому проверка «достаточно ли средств»
 * отклоняла КАЖДУЮ оплату с семейного счёта: способ оплаты был нерабочим,
 * а любой ненулевой баланс мог появиться только прямым SQL-запросом в базу.
 */
const familyTopupSchema = z.object({
	familyGroupId: z.string().uuid(),
	/*
	 * Копейки — по той же причине, что и у оплаты выше: `family_groups.balance`
	 * объявлен `numeric(12, 2)`. Прежний комментарий «Баланс хранится в целых
	 * рублях (integer)» противоречил объявлению колонки в этом же репозитории.
	 * Верхний предел оставлен прежним: 10 000 000 ₽ за одно пополнение — это
	 * защита от опечатки в кассе, а не свойство денег.
	 */
	amountRub: positiveMoneyRubSchema.refine((value) => value <= 10_000_000, {
		message: "сумма одного пополнения не может превышать 10 000 000 ₽",
	}),
	// Кто внёс деньги — обычно глава семьи. Нужен для журнала платежей.
	patientId: z.string().uuid(),
	method: z
		.enum(["cash", "card", "bank_transfer", "online", "other"])
		.default("cash"),
	comment: z.string().trim().max(500).optional(),
	// Тот же ключ идемпотентности, что и при оплате: повтор после обрыва связи
	// не должен зачислить деньги дважды.
	clientMutationId: z.string().min(1).max(128).optional(),
});

class FamilyFinanceError extends Error {
	constructor(
		message: string,
		public statusCode: number,
	) {
		super(message);
		this.name = "FamilyFinanceError";
	}
}

/**
 * БЫЛО: все три выборки семейной группы принимали не только свою организацию,
 * но и группы с organizationId IS NULL, а эта функция вдобавок «присваивала»
 * найденную бесхозную группу той клинике, которая обратилась к ней первой.
 *
 * Через семейную группу проходит кошелёк с деньгами. Любая клиника могла
 * прочитать чужую группу без организации, забрать её себе и списать баланс.
 * Колонка organization_id объявлена nullable, то есть такие строки были
 * достижимы штатно, а не только после сбоя.
 *
 * СТАЛО: выборка строго по своей организации. Унаследованные строки без
 * организации восстанавливаются миграцией
 * 0119_family_groups_require_organization.sql (привязка по головному пациенту),
 * после чего колонка становится NOT NULL.
 */
async function familyGroupForOrganization(
	familyGroupId: string,
	organizationId: string,
) {
	const [family] = await db
		.select()
		.from(familyGroups)
		.where(
			and(
				eq(familyGroups.id, familyGroupId),
				eq(familyGroups.organizationId, organizationId),
			),
		)
		.limit(1);
	return family ?? null;
}

async function familyMembersForOrganization(
	familyGroupId: string,
	organizationId: string,
) {
	return db
		.select({
			id: patients.id,
			fullName: patients.fullName,
			phone: patients.phone,
		})
		.from(patients)
		.where(
			and(
				eq(patients.familyGroupId, familyGroupId),
				eq(patients.organizationId, organizationId),
			),
		);
}

export async function registerFamilyFinanceRoutes(app: FastifyInstance) {
	// GET /api/finance/family - search families
	app.get("/api/finance/family", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"family finance read",
		);
		if (!organizationId) return;

		const { search } = req.query as { search?: string };
		const families = await db
			.select({
				id: familyGroups.id,
				name: familyGroups.name,
				balance: familyGroups.balance,
				headPatientId: familyGroups.headPatientId,
				organizationId: familyGroups.organizationId,
				createdAt: familyGroups.createdAt,
				updatedAt: familyGroups.updatedAt,
				headPatientName: patients.fullName,
				headPatientPhone: patients.phone,
			})
			.from(familyGroups)
			.leftJoin(patients, eq(familyGroups.headPatientId, patients.id))
			.where(
				search
					? and(
							eq(familyGroups.organizationId, organizationId),
							or(
								ilike(familyGroups.name, `%${search}%`),
								ilike(patients.phone, `%${search}%`),
								ilike(patients.fullName, `%${search}%`),
							),
						)
					: eq(familyGroups.organizationId, organizationId),
			)
			.orderBy(desc(familyGroups.createdAt))
			.limit(20);

		return families;
	});

	/*
	 * ВАЖНО: литеральный сегмент `/patient/` регистрируем ДО
	 * параметрического `/:familyGroupId`. Иначе find-my-way может
	 * захватить path `/family/patient/<uuid>` как familyGroupId="patient"
	 * на урезанных путях, а в смежных роутерах (pay/topup) тот же паттерн
	 * уже ломал live-проверки. Статика раньше параметров — правило Fastify.
	 */
	// GET /api/finance/family/patient/:patientId — fetch family by patient ID
	app.get("/api/finance/family/patient/:patientId", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"family finance read",
		);
		if (!organizationId) return;

		const { patientId } = req.params as { patientId: string };
		const [patient] = await db
			.select({ familyGroupId: patients.familyGroupId })
			.from(patients)
			.where(
				and(
					eq(patients.id, patientId),
					eq(patients.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!patient?.familyGroupId) {
			return reply.code(404).send({ error: "Patient has no family group" });
		}

		const family = await familyGroupForOrganization(
			patient.familyGroupId,
			organizationId,
		);
		if (!family)
			return reply.code(404).send({ error: "Family group not found" });

		const members = await familyMembersForOrganization(
			patient.familyGroupId,
			organizationId,
		);

		return {
			...family,
			members,
		};
	});

	// GET /api/finance/family/:familyGroupId — fetch family group and members
	app.get("/api/finance/family/:familyGroupId", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"family finance read",
		);
		if (!organizationId) return;

		const { familyGroupId } = req.params as { familyGroupId: string };
		/*
		 * Защита от случайного захвата литерала "patient" как UUID группы
		 * (если клиент дернул /family/patient без id).
		 */
		if (
			familyGroupId === "patient" ||
			familyGroupId === "pay" ||
			familyGroupId === "topup"
		) {
			return reply.code(404).send({ error: "Family group not found" });
		}

		const family = await familyGroupForOrganization(
			familyGroupId,
			organizationId,
		);
		if (!family)
			return reply.code(404).send({ error: "Family group not found" });

		const members = await familyMembersForOrganization(
			familyGroupId,
			organizationId,
		);
		/*
		 * БЫЛО: members.length === 0 → 404 «Family group not found».
		 * После create без head (или при сбое привязки) группа в БД есть,
		 * а GET врал, что её нет: UI показывал «создать семью» поверх
		 * уже существующей, плодились пустые family_groups.
		 * СТАЛО: группа найдена по id+org — отдаём её, members может быть [].
		 */
		return {
			...family,
			members,
		};
	});

	// POST /api/finance/family — create a family group
	app.post("/api/finance/family", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"family finance write",
		);
		if (!organizationId) return;
		// Роль решает, кто двигает деньги: врач и ассистент к семейному
		// кошельку не допущены. Раньше единственным барьером был общий
		// секрет клиники, одинаковый для чтения и записи.
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const createParsed = z
			.object({
				name: z.string().min(1),
				headPatientId: z.string().uuid().optional(),
			})
			.safeParse(req.body);
		if (!createParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте данные семейной группы: нужно непустое имя.",
			});
		}
		const data = createParsed.data;

		/*
		 * БЫЛО: INSERT family_groups с head_patient_id, но patients.family_group_id
		 * не трогали. UI (PatientFamilyCard) делал второй PUT /patients/:id —
		 * до фикса контракта/updatePatientInDb поле вырезалось Zod'ом, пациент
		 * оставался без привязки. Даже после фикса PUT это два запроса: при
		 * сбое второго семья создана, глава — нет. Оплата с семейного кошелька:
		 * 400 «Patient is not a member…». GET /family/:id при 0 members → 404.
		 *
		 * СТАЛО: одна транзакция — создать группу и сразу привязать главу.
		 * Пациент из этой org; если уже в другой семье — 409.
		 * Второй PUT из UI остаётся идемпотентным (тот же familyGroupId).
		 */
		if (data.headPatientId) {
			const [headPatient] = await db
				.select({ id: patients.id, familyGroupId: patients.familyGroupId })
				.from(patients)
				.where(
					and(
						eq(patients.id, data.headPatientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);
			if (!headPatient) {
				return reply.code(403).send({
					error: "Forbidden",
					message: "Указанный пациент не найден в вашей клинике",
				});
			}
			if (headPatient.familyGroupId) {
				return reply.code(409).send({
					error: "PatientAlreadyInFamily",
					message: "Пациент уже состоит в другой семейной группе",
				});
			}
		}

		const family = await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(familyGroups)
				.values({
					organizationId,
					name: data.name,
					headPatientId: data.headPatientId || null,
					// numeric(12, 2) принимает строку — так значение не проходит через double.
					balance: kopecksToNumericString(0),
				})
				.returning();

			if (data.headPatientId && created) {
				await tx
					.update(patients)
					.set({
						familyGroupId: created.id,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(patients.id, data.headPatientId),
							eq(patients.organizationId, organizationId),
						),
					);
			}

			return created;
		});

		wsBroker.broadcastToOrganization(organizationId, {
			type: "FAMILY_GROUP_CREATED",
			payload: family,
		});
		return family;
	});

	// PUT /api/finance/family/:id — update a family group
	app.put("/api/finance/family/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"family finance write",
		);
		if (!organizationId) return;
		// Роль решает, кто двигает деньги: врач и ассистент к семейному
		// кошельку не допущены. Раньше единственным барьером был общий
		// секрет клиники, одинаковый для чтения и записи.
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const { id } = req.params as { id: string };
		const updateParsed = z
			.object({
				name: z.string().min(1).optional(),
				headPatientId: z.string().uuid().nullable().optional(),
			})
			.safeParse(req.body);
		if (!updateParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте данные семейной группы.",
			});
		}
		const data = updateParsed.data;

		/*
		 * Смена главы семьи. БЫЛО: обновляли только family_groups.head_patient_id,
		 * patients.family_group_id нового главы не трогали — тот же баг, что и
		 * при create: GET members пустой / оплата 400. СТАЛО: в транзакции
		 * пишем head и привязываем пациента к этой группе (если он ещё не в ней
		 * и не в чужой).
		 */
		if (data.headPatientId) {
			const [headPatient] = await db
				.select({ id: patients.id, familyGroupId: patients.familyGroupId })
				.from(patients)
				.where(
					and(
						eq(patients.id, data.headPatientId),
						eq(patients.organizationId, organizationId),
					),
				)
				.limit(1);
			if (!headPatient) {
				return reply.code(403).send({
					error: "Forbidden",
					message: "Указанный пациент не найден в вашей клинике",
				});
			}
			if (headPatient.familyGroupId && headPatient.familyGroupId !== id) {
				return reply.code(409).send({
					error: "PatientAlreadyInFamily",
					message: "Пациент уже состоит в другой семейной группе",
				});
			}
		}

		const family = await db.transaction(async (tx) => {
			const [updated] = await tx
				.update(familyGroups)
				.set(data)
				.where(
					and(
						eq(familyGroups.id, id),
						eq(familyGroups.organizationId, organizationId),
					),
				)
				.returning();

			if (!updated) return null;

			if (data.headPatientId) {
				await tx
					.update(patients)
					.set({
						familyGroupId: id,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(patients.id, data.headPatientId),
							eq(patients.organizationId, organizationId),
						),
					);
			}

			return updated;
		});

		if (!family)
			return reply.code(404).send({ error: "Family group not found" });
		wsBroker.broadcastToOrganization(organizationId, {
			type: "FAMILY_GROUP_UPDATED",
			payload: family,
		});
		return family;
	});

	// DELETE /api/finance/family/:id — delete a family group
	app.delete("/api/finance/family/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"family finance write",
		);
		if (!organizationId) return;
		// Роль решает, кто двигает деньги: врач и ассистент к семейному
		// кошельку не допущены. Раньше единственным барьером был общий
		// секрет клиники, одинаковый для чтения и записи.
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const { id } = req.params as { id: string };

		const deleteResult = await db.transaction(async (tx) => {
			// Check if it has members
			const members = await familyMembersForOrganization(id, organizationId);
			if (members.length > 0) {
				return {
					status: 400,
					body: { error: "Cannot delete family group with members" },
				};
			}

			const family = await familyGroupForOrganization(id, organizationId);
			if (!family) {
				return { status: 404, body: { error: "Family group not found" } };
			}
			const balanceKopecks = parseKopecks(family.balance);
			if (balanceKopecks !== 0) {
				return {
					status: 409,
					body: {
						error: "FamilyWalletNotEmpty",
						message:
							`На семейном кошельке ${kopecksToNumericString(balanceKopecks)} ₽. ` +
							"Группу с ненулевым балансом удалить нельзя: вместе с ней исчезнут деньги семьи. " +
							"Верните остаток или израсходуйте его, а затем удаляйте группу.",
					},
				};
			}

			const [deleted] = await tx
				.delete(familyGroups)
				.where(
					and(
						eq(familyGroups.id, id),
						eq(familyGroups.organizationId, organizationId),
					),
				)
				.returning({ id: familyGroups.id });

			if (!deleted) {
				return { status: 404, body: { error: "Family group not found" } };
			}

			return { status: 200, body: { success: true } };
		});

		if (deleteResult.status === 200) {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "FAMILY_GROUP_DELETED",
				payload: { id },
			});
		}
		return reply.code(deleteResult.status).send(deleteResult.body);
	});

	// POST /api/finance/family/pay — deduct balance in transaction
	app.post("/api/finance/family/pay", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"family finance payment",
		);
		if (!organizationId) return;
		// Роль решает, кто двигает деньги: врач и ассистент к семейному
		// кошельку не допущены. Раньше единственным барьером был общий
		// секрет клиники, одинаковый для чтения и записи.
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;
		const payParsed = familyPaymentSchema.safeParse(req.body);
		if (!payParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Проверьте оплату с семейного счёта: нужны patientId, familyGroupId и сумма больше нуля с точностью до копейки.",
			});
		}
		const headerIdempotencyKey =
			(req.headers["idempotency-key"] as string | undefined) ||
			(req.headers["x-idempotency-key"] as string | undefined);
		const effectiveMutationId =
			payParsed.data.clientMutationId?.trim() || headerIdempotencyKey?.trim();

		if (!effectiveMutationId) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Ключ операции (clientMutationId или заголовок Idempotency-Key) обязателен для предотвращения двойных списаний.",
			});
		}
		const payload = {
			...payParsed.data,
			clientMutationId: effectiveMutationId,
		};

		try {
			const result = await familyWalletService.debit({
				organizationId,
				familyGroupId: payload.familyGroupId,
				patientId: payload.patientId,
				amountRub: payload.amountRub,
				serviceId: payload.serviceId,
				catalogItemId: payload.catalogItemId,
				discountRub: payload.discountRub,
				discountPercent: payload.discountPercent,
				clientMutationId: payload.clientMutationId,
				documentId: payload.documentId,
				visitId: payload.visitId,
			});

			return {
				payment: result.payment,
				newBalance: kopecksToNumericString(rubToKopecks(result.newBalanceRub)),
				duplicate: result.duplicate,
			};
		} catch (err: any) {
			const statusCode = err.statusCode || (err instanceof FamilyWalletError ? err.statusCode : 500);
			const message = err.message || "Internal Server Error";
			return reply.code(statusCode).send({
				error: statusCode === 402 ? "InsufficientFunds" : statusCode === 409 ? "IdempotencyConflict" : statusCode === 404 ? "NotFound" : "PaymentFailed",
				message,
			});
		}
	});

	// POST /api/finance/family/topup — пополнение семейного кошелька
	app.post("/api/finance/family/topup", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"family wallet topup",
		);
		if (!organizationId) return;
		// Роль решает, кто двигает деньги: врач и ассистент к семейному
		// кошельку не допущены. Раньше единственным барьером был общий
		// секрет клиники, одинаковый для чтения и записи.
		if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;

		const parsed = familyTopupSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Проверьте сумму пополнения: нужна сумма больше нуля с точностью до копейки.",
			});
		}
		const headerIdempotencyKey =
			(req.headers["idempotency-key"] as string | undefined) ||
			(req.headers["x-idempotency-key"] as string | undefined);
		const effectiveMutationId =
			parsed.data.clientMutationId?.trim() || headerIdempotencyKey?.trim();

		if (!effectiveMutationId) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Ключ операции (clientMutationId или заголовок Idempotency-Key) обязателен для предотвращения повторного пополнения.",
			});
		}
		const payload = {
			...parsed.data,
			clientMutationId: effectiveMutationId,
		};

		try {
			const result = await familyWalletService.topup({
				organizationId,
				familyGroupId: payload.familyGroupId,
				patientId: payload.patientId,
				amountRub: payload.amountRub,
				method: payload.method,
				clientMutationId: payload.clientMutationId,
			});

			return {
				payment: result.payment,
				newBalance: kopecksToNumericString(rubToKopecks(result.newBalanceRub)),
				duplicate: result.duplicate,
			};
		} catch (err: any) {
			const statusCode = err.statusCode || (err instanceof FamilyWalletError ? err.statusCode : 500);
			return reply.code(statusCode).send({
				error: statusCode === 404 ? "NotFound" : statusCode === 409 ? "IdempotencyConflict" : "TopupFailed",
				message: err.message || "Не удалось пополнить семейный счёт",
			});
		}
	});
}
