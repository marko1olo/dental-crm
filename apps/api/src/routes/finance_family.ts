import {
	kopecksToNumericString,
	parseKopecks,
	positiveMoneyRubSchema,
} from "@dental/shared";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { familyGroups, patients, payments } from "../db/schema.js";
import { enforcePermissionWhenStaffKnown } from "../security/permissions.js";
import { wsBroker } from "../services/websocketBroker.js";

const familyPaymentSchema = z.object({
	organizationId: z.string().uuid().optional(),
	patientId: z.string().uuid(),
	familyGroupId: z.string().uuid(),
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
	clientMutationId: z.string().min(1).max(128),
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
	clientMutationId: z.string().min(1).max(128),
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
		if (!patient || !patient.familyGroupId) {
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

		// Check if it has members
		const members = await familyMembersForOrganization(id, organizationId);
		if (members.length > 0) {
			return reply
				.code(400)
				.send({ error: "Cannot delete family group with members" });
		}

		/*
		 * УДАЛЕНИЕ СЕМЬИ С ДЕНЬГАМИ НА КОШЕЛЬКЕ ОСТАНОВЛЕНО.
		 *
		 * ЧТО БЫЛО. Проверялись только участники. Группа без участников, но с
		 * остатком на балансе, удалялась `db.delete(familyGroups)` вместе с
		 * кошельком: строка исчезала, а деньги, которые семья внесла авансом
		 * (маршрут `topup` пишет их со статусом `planned`, то есть это ещё НЕ
		 * выручка клиники, а обязательство перед семьёй), переставали
		 * существовать как обязательство. В журнале платежей пополнение при этом
		 * оставалось — то есть после удаления клиника получала запись «семья
		 * внесла деньги» без строки, где эти деньги лежат. Ни вернуть, ни
		 * потратить их после этого нечем.
		 *
		 * Условие «нет участников» этому не мешает: главу семьи можно отвязать, а
		 * баланс остаётся. Поэтому проверка отдельная и стоит ПОСЛЕ проверки
		 * участников — так администратор видит сначала более понятную причину.
		 *
		 * Отрицательный баланс тоже блокирует удаление: это долг семьи клинике, и
		 * стереть его так же нельзя, как и остаток. Сравнение идёт в целых
		 * копейках — `Number(balance) !== 0` на строке "0.00" из драйвера дал бы
		 * верный ответ случайно, а на "0.001" (испорченные данные) — молча ложный.
		 */
		const family = await familyGroupForOrganization(id, organizationId);
		if (!family) {
			return reply.code(404).send({ error: "Family group not found" });
		}
		const balanceKopecks = parseKopecks(family.balance);
		if (balanceKopecks !== 0) {
			return reply.code(409).send({
				error: "FamilyWalletNotEmpty",
				message:
					`На семейном кошельке ${kopecksToNumericString(balanceKopecks)} ₽. ` +
					"Группу с ненулевым балансом удалить нельзя: вместе с ней исчезнут деньги семьи. " +
					"Верните остаток или израсходуйте его, а затем удаляйте группу.",
			});
		}

		const [deleted] = await db
			.delete(familyGroups)
			.where(
				and(
					eq(familyGroups.id, id),
					eq(familyGroups.organizationId, organizationId),
				),
			)
			.returning({ id: familyGroups.id });

		if (!deleted)
			return reply.code(404).send({ error: "Family group not found" });
		wsBroker.broadcastToOrganization(organizationId, {
			type: "FAMILY_GROUP_DELETED",
			payload: { id },
		});
		return { success: true };
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
		const payload = payParsed.data;

		try {
			const result = await db.transaction(async (tx) => {
				const [patient] = await tx
					.select({ id: patients.id, familyGroupId: patients.familyGroupId })
					.from(patients)
					.where(
						and(
							eq(patients.id, payload.patientId),
							eq(patients.organizationId, organizationId),
						),
					)
					.limit(1);

				if (!patient || patient.familyGroupId !== payload.familyGroupId) {
					throw new FamilyFinanceError(
						"Пациент не найден в семейной группе клиники",
						404,
					);
				}

				// 1. Get Family Group & Lock it
				const [family] = await tx
					.select()
					.from(familyGroups)
					.where(
						and(
							eq(familyGroups.id, payload.familyGroupId),
							eq(familyGroups.organizationId, organizationId),
						),
					)
					.limit(1)
					.for("update");
				if (!family) {
					throw new FamilyFinanceError("Семейная группа не найдена", 404);
				}

				// Повтор с тем же ключом не списывает деньги второй раз, а возвращает
				// ранее созданный платёж. Проверка внутри транзакции и после
				// блокировки строки семьи, чтобы два параллельных повтора не
				// проскочили одновременно.
				const [duplicate] = await tx
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, organizationId),
							eq(payments.clientMutationId, payload.clientMutationId),
						),
					)
					.limit(1);
				if (duplicate) {
					if (
						parseKopecks(duplicate.amountRub) !==
							parseKopecks(payload.amountRub) ||
						duplicate.patientId !== payload.patientId ||
						duplicate.method !== "family_wallet"
					) {
						throw new FamilyFinanceError(
							"Клиентская операция уже записала другую оплату.",
							409,
						);
					}
					return {
						payment: duplicate,
						newBalance: kopecksToNumericString(parseKopecks(family.balance)),
						duplicate: true,
					};
				}

				// Весь расчёт идёт целыми копейками. Раньше баланс читался через
				// Number(), вычитание шло в плавающей точке, а в базу писался
				// Math.round(newBalance): при балансе 150.50 и платеже 100 руб. в
				// базу попадало 51, а клиентам по WebSocket уходило 50.50 — после
				// перезагрузки страницы сумма менялась сама.
				const currentKopecks = parseKopecks(family.balance);
				const amountKopecks = parseKopecks(payload.amountRub);
				if (currentKopecks < amountKopecks) {
					throw new FamilyFinanceError(
						"Недостаточно средств на семейном балансе",
						402,
					);
				}

				// 2. Deduct Balance
				const newBalance = kopecksToNumericString(
					currentKopecks - amountKopecks,
				);
				/*
				 * БЫЛО: UPDATE family_groups SET balance=... WHERE id=family.id
				 * (organizationId только в SELECT FOR UPDATE выше). После
				 * SELECT-then-UPDATE по одному id чужая клиника с тем же UUID
				 * (копия базы, ошибка сида, ручной SQL) могла получить чужое
				 * списание. organizationId в SET при этом не защищал строку —
				 * он лишь перезаписывал то же значение.
				 * СТАЛО: organizationId + id в WHERE; SET только balance;
				 * пустой RETURNING → ошибка (не «успешная» оплата без списания).
				 */
				const [debited] = await tx
					.update(familyGroups)
					.set({ balance: newBalance })
					.where(
						and(
							eq(familyGroups.id, family.id),
							eq(familyGroups.organizationId, organizationId),
						),
					)
					.returning({ id: familyGroups.id });
				if (!debited) {
					throw new FamilyFinanceError("Семейная группа не найдена", 404);
				}

				// 3. Create Payment Record
				const [payment] = await tx
					.insert(payments)
					.values({
						organizationId,
						patientId: payload.patientId,
						// Validated as an integer above; debit and record match exactly.
						amountRub: payload.amountRub,
						method: "family_wallet",
						documentId: payload.documentId,
						visitId: payload.visitId,
						status: "paid",
						clientMutationId: payload.clientMutationId ?? null,
					})
					.returning();

				return { payment, newBalance, duplicate: false };
			});

			wsBroker.broadcastToOrganization(organizationId, {
				type: "FAMILY_BALANCE_UPDATED",
				payload: {
					organizationId,
					familyGroupId: payload.familyGroupId,
					balance: result.newBalance,
				},
			});
			wsBroker.broadcastToOrganization(organizationId, {
				type: "PAYMENT_CREATED",
				payload: result.payment,
			});

			return result;
		} catch (err: any) {
			const statusCode = err.statusCode || 500;
			const message = err.message || "Internal Server Error";
			return reply.code(statusCode).send({
				error: statusCode === 402 ? "InsufficientFunds" : "PaymentFailed",
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
		const payload = parsed.data;

		try {
			const result = await db.transaction(async (tx) => {
				// Пациент должен принадлежать этой клинике и этой семье.
				const [patient] = await tx
					.select({ id: patients.id, familyGroupId: patients.familyGroupId })
					.from(patients)
					.where(
						and(
							eq(patients.id, payload.patientId),
							eq(patients.organizationId, organizationId),
						),
					)
					.limit(1);
				if (!patient || patient.familyGroupId !== payload.familyGroupId) {
					throw new FamilyFinanceError(
						"Пациент не найден в семейной группе клиники",
						404,
					);
				}

				// Блокируем строку семьи: параллельные пополнения не потеряют друг друга.
				const [family] = await tx
					.select()
					.from(familyGroups)
					.where(
						and(
							eq(familyGroups.id, payload.familyGroupId),
							eq(familyGroups.organizationId, organizationId),
						),
					)
					.limit(1)
					.for("update");
				if (!family) {
					throw new FamilyFinanceError("Семейная группа не найдена", 404);
				}

				// Повтор с тем же ключом не зачисляет деньги второй раз.
				const [duplicate] = await tx
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, organizationId),
							eq(payments.clientMutationId, payload.clientMutationId),
						),
					)
					.limit(1);
				if (duplicate) {
					if (
						parseKopecks(duplicate.amountRub) !==
							parseKopecks(payload.amountRub) ||
						duplicate.patientId !== payload.patientId ||
						duplicate.method !== payload.method ||
						duplicate.status !== "planned"
					) {
						throw new FamilyFinanceError(
							"Клиентская операция уже записала другое пополнение.",
							409,
						);
					}
					return {
						payment: duplicate,
						newBalance: kopecksToNumericString(parseKopecks(family.balance)),
						duplicate: true,
					};
				}

				// Пополнение считается там же в копейках. Раньше здесь складывались
				// Number(строка) и целые рубли, и результат записывался БЕЗ
				// округления — а списание, наоборот, округляло. Из-за асимметрии
				// копейки попадали в кошелёк при пополнении и терялись при оплате.
				const newBalance = kopecksToNumericString(
					parseKopecks(family.balance) + parseKopecks(payload.amountRub),
				);
				/*
				 * БЫЛО: UPDATE по id без organizationId в WHERE (см. pay выше).
				 * СТАЛО: organizationId + id; RETURNING обязателен.
				 */
				const [credited] = await tx
					.update(familyGroups)
					.set({ balance: newBalance, updatedAt: new Date() })
					.where(
						and(
							eq(familyGroups.id, family.id),
							eq(familyGroups.organizationId, organizationId),
						),
					)
					.returning({ id: familyGroups.id });
				if (!credited) {
					throw new FamilyFinanceError("Семейная группа не найдена", 404);
				}

				// Пополнение фиксируется в журнале платежей со статусом "planned":
				// это ещё не выручка клиники, а аванс семьи. Иначе пополнение
				// попало бы в отчёт о выручке дважды — при внесении и при оплате.
				const [payment] = await tx
					.insert(payments)
					.values({
						organizationId,
						patientId: payload.patientId,
						amountRub: payload.amountRub,
						method: payload.method,
						status: "planned",
						clientMutationId: payload.clientMutationId ?? null,
					})
					.returning();

				return { payment, newBalance, duplicate: false };
			});

			wsBroker.broadcastToOrganization(organizationId, {
				type: "FAMILY_BALANCE_UPDATED",
				payload: {
					organizationId,
					familyGroupId: payload.familyGroupId,
					balance: result.newBalance,
				},
			});

			return result;
		} catch (err: any) {
			const statusCode = err.statusCode || 500;
			return reply.code(statusCode).send({
				error: statusCode === 404 ? "NotFound" : "TopupFailed",
				message: err.message || "Не удалось пополнить семейный счёт",
			});
		}
	});
}
