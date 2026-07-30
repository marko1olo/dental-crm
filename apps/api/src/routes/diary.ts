import crypto from "crypto";
import { and, count, desc, eq, isNull, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	resolveOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	clinicalAuditLogs,
	doctorCommissions,
	inventoryItems,
	inventoryTransactions,
	procedureMaterialRules,
	treatmentItems,
	visitDiaries,
	visitDiaryRevisions,
} from "../db/schema.js";
import { clinicNotIdentifiedMessage } from "../utils/clinicSessionRefusal.js";

/**
 * ДНЕВНИК ПРИЁМА ОТКАЗЫВАЛ КОДОМ, А НЕ ПРИЧИНОЙ.
 *
 * ЧТО БЫЛО. Доказано запросом в процессе (`app.inject`, не дев-сервер): чтение
 * дневника, чтение истории правок, сохранение дневника и его исправление
 * отвечали телом `{"error":"OrgRequired"}` — без поля `message`. Пятая ветка, в
 * подписании (`/lock`), текст имела, но СВОЙ, третьей копией той же фразы в
 * дереве.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Живой клиент подписания
 * (`apps/web/src/components/useVisitDiaryLogic.ts:530-540`) печатает поле
 * `message` тостом ДОСЛОВНО, а без него строит подсказку по коду ответа. Для 403
 * это «войдите в смену заново или попросите администратора открыть доступ» —
 * ложное указание: смена тут не при чём, не определён кабинет клиники. Дневник
 * приёма — юридический документ, и врач, не понявший отказ, либо теряет
 * набранный текст, либо переписывает его во второй записи.
 *
 * ЧЕГО СЕРВЕР НЕ ЗНАЕТ, ТОГО И НЕ УТВЕРЖДАЕТ. `resolveOrganizationId` возвращает
 * null и когда токена кабинета нет, и когда `verifyToken` его отверг
 * (`security/identity.ts`): различить эти два состояния здесь нечем. Поэтому
 * текст называет обе возможные причины и одно действие, которое лечит любую.
 *
 * Коды ответа и значения поля `error` сохранены дословно. Текст живёт в общем
 * доме `utils/clinicSessionRefusal.ts`, чтобы четвёртой копии не появилось.
 */
const DIARY_CLINIC_UNKNOWN_READ_MESSAGE = clinicNotIdentifiedMessage(
	"дневник приёма не открыть",
);
const DIARY_CLINIC_UNKNOWN_REVISIONS_MESSAGE = clinicNotIdentifiedMessage(
	"историю правок дневника не показать",
);
const DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE = clinicNotIdentifiedMessage(
	"дневник приёма не сохранить",
	"набранный текст остаётся на экране, не закрывайте приём",
);
const DIARY_CLINIC_UNKNOWN_SIGN_MESSAGE = clinicNotIdentifiedMessage(
	"подписать дневник нельзя",
	"набранный текст остаётся на экране",
);
const DIARY_CLINIC_UNKNOWN_REVISE_MESSAGE = clinicNotIdentifiedMessage(
	"исправить подписанный дневник нельзя",
);

/**
 * «Дневника нет» на чтении истории и на исправлении. Причина у сервера
 * установлена точно: строки с таким номером в этой клинике не существует.
 * Действие названо, потому что оно есть и оно одно — открыть приём заново;
 * прежний голый 404 клиент превращал в «программа клиники обновлена не
 * полностью, сообщите администратору», то есть отправлял врача не туда.
 */
const DIARY_NOT_FOUND_REVISIONS_MESSAGE =
	"Дневник этого приёма не найден в этой клинике, поэтому истории правок у него нет. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён или заведён заново. Откройте приём заново и посмотрите историю ещё раз.";
const DIARY_NOT_FOUND_REVISE_MESSAGE =
	"Дневник этого приёма не найден в этой клинике, исправлять нечего. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён или заведён заново. Откройте приём заново и повторите исправление.";

const diaryUpsertSchema = z.object({
	visitId: z.string().uuid(),
	patientId: z.string().uuid(),
	anamnesis: z.string().optional(),
	statusLocalis: z.string().optional(),
	diagnosisIcd10: z.string().optional(),
	diagnosisTooth: z.string().optional(),
	treatmentDescription: z.string().optional(),
	complications: z.string().optional(),
	comorbidities: z.string().optional(),
	organizationId: z.string().uuid().optional(),
	status: z.enum(["draft", "signed"]).optional(),
	instrumentTrayBarcode: z.string().optional(),
	/**
	 * УКЭП врача. Раньше поле принимал только маршрут /lock, поэтому подпись
	 * через POST физически не могла сохранить оттиск в crypto_signature_pkcs7:
	 * дневник помечался подписанным без самой подписи.
	 */
	pkcs7Signature: z.string().optional(),
});

/**
 * POST /api/diaries/:id/lock и /revise: тела раньше — bare cast.
 * Zod safeParse после requireClinicalMutationAccess (+ role/org gates где они
 * стоят раньше чтения полей) → 400 при non-object; поля остаются optional.
 */
const diaryLockBodySchema = z.object({
	pkcs7Signature: z.unknown().optional(),
});

const diaryReviseBodySchema = z.object({
	anamnesis: z.unknown().optional(),
	statusLocalis: z.unknown().optional(),
	diagnosisIcd10: z.unknown().optional(),
	diagnosisTooth: z.unknown().optional(),
	treatmentDescription: z.unknown().optional(),
	revisionReason: z.unknown().optional(),
});

function computeDiaryHash(
	visitId: string,
	patientId: string,
	anamnesis: string | null | undefined,
	statusLocalis: string | null | undefined,
	treatmentDescription: string | null | undefined,
): string {
	const raw = `${visitId}|${patientId}|${anamnesis ?? ""}|${statusLocalis ?? ""}|${treatmentDescription ?? ""}`;
	return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Списывать со склада можно только конечное положительное количество.
 *
 * Проверяется КАЖДЫЙ множитель расхода отдельно, а не итоговое произведение:
 * правило со списанием -3 при количестве услуги -2 даёт +6, то есть две ошибки в
 * данных превратились бы в списание, которого никто не назначал. Ни одна из трёх
 * колонок (quantity_to_deduct, treatment_items.quantity, stock_quantity) не имеет
 * в базе ни одного CHECK-ограничения — проверено чтением pg_constraint на живой
 * базе, — поэтому отрицательное количество там физически может лежать.
 */
function isDeductibleQuantity(value: number): boolean {
	return Number.isFinite(value) && value > 0;
}

/** Транзакция drizzle — тип берётся у самого db, чтобы не тянуть внутренние пути ORM. */
type DiaryDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/*
 * `NotSaved` отделён от `NotFound` НЕ ради красоты кода, а потому что это два
 * разных состояния с разными действиями врача и разными кодами ответа:
 * «дневника нет» лечится повторным сохранением черновика, «дневник не удалось
 * сохранить» повторным сохранением НЕ лечится и означает сбой сервера. Раньше
 * оба состояния носили код `NotFound`, отдавались одним 404 и различались бы
 * только сравнением текста `err.message` — ровно тем приёмом, который этот файл
 * уже однажды признал негодным (см. комментарий к DiarySigningError ниже).
 */
type DiarySigningFailureCode =
	| "NotFound"
	| "NotSaved"
	| "AlreadyLocked"
	| "InsufficientStock";

/**
 * Отказ церемонии подписания. Раньше оба состояния передавались через
 * `new Error("AlreadyLocked")` и разбирались сравнением `err.message` со
 * строкой — любое совпадение текста из драйвера базы дало бы тот же ответ.
 */
class DiarySigningError extends Error {
	constructor(
		readonly code: DiarySigningFailureCode,
		message: string,
	) {
		super(message);
		this.name = "DiarySigningError";
	}
}

interface DiaryStockDeduction {
	inventoryItemId: string;
	inventoryItemName: string;
	quantityChanged: string;
}

interface DiarySigningResult {
	diaryId: string;
	hash: string;
	lockedAt: Date;
	completedTreatmentItems: number;
	deductions: DiaryStockDeduction[];
	auditLogId: string | null;
}

/**
 * Единственная церемония подписания дневника.
 *
 * БЫЛО: подписать приём можно было двумя маршрутами, и они делали РАЗНОЕ.
 * `POST /api/diaries` со `status: "signed"` ставил только is_locked, время и хеш.
 * `POST /api/diaries/:id/lock` дополнительно закрывал услуги визита, списывал
 * расходники со склада, писал строки inventory_transactions, заводил ставку врача
 * и оставлял запись в clinical_audit_logs. То есть от того, какой маршрут вызвал
 * экран, зависело, спишется ли материал и останется ли юридический след — при
 * одном и том же действии врача «подписать приём». Остатки склада и журнал
 * расходились молча, и расхождение обнаруживалось только на инвентаризации.
 *
 * СТАЛО: церемония существует один раз, здесь, и оба маршрута её вызывают.
 * Копия отсутствует, поэтому разойтись им больше нечем.
 *
 * Вызывать только внутри транзакции: списание склада и журнал обязаны попасть в
 * базу вместе с замком либо не попасть вовсе.
 */
async function runDiarySigningCeremony(
	tx: DiaryDbTransaction,
	params: {
		diaryId: string;
		organizationId: string;
		userId: string | null;
		pkcs7Signature: string | null;
	},
): Promise<DiarySigningResult> {
	const { diaryId, organizationId, userId } = params;

	// 0. Перечитать дневник FOR UPDATE внутри транзакции и заново проверить замок.
	// Проверка снаружи читает ещё незаблокированную строку (TOCTOU): два
	// одновременных подписанта проходят её оба, входят сюда оба и списывают
	// материал дважды. Блокировка строки их сериализует: второй ждёт коммита
	// первого и видит is_locked = true до любого списания.
	const [diary] = await tx
		.select()
		.from(visitDiaries)
		.where(
			and(
				eq(visitDiaries.id, diaryId),
				eq(visitDiaries.organizationId, organizationId),
			),
		)
		.limit(1)
		.for("update");
	if (!diary) {
		// Текст говорит врачу и причину, и следующий шаг. Прежнее «Дневник не
		// найден.» причину называло, а действие — нет, и до экрана всё равно не
		// доходило: ветка ответа выбрасывала message целиком.
		throw new DiarySigningError(
			"NotFound",
			"Дневник приёма не найден в этой клинике, подписывать нечего. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён. Откройте приём заново, нажмите «Сохранить черновик» и повторите подписание.",
		);
	}
	if (diary.isLocked) {
		throw new DiarySigningError("AlreadyLocked", "Дневник уже подписан.");
	}

	// Хеш считается по СОХРАНЁННОЙ строке, а не по телу запроса.
	// БЫЛО: POST хешировал присланные поля. Фронтенд сохраняет черновик отдельно и
	// при подписании часто не присылает клинические поля вовсе — тогда в печать
	// уходил хеш от пустых строк, тогда как в карте оставался прежний текст.
	// Печать заверяла не то содержимое, которое хранится, и любая позднейшая
	// проверка целостности не сошлась бы. Теперь источник один — строка в базе.
	const hash = computeDiaryHash(
		diary.visitId,
		diary.patientId ?? "",
		diary.anamnesis,
		diary.statusLocalis,
		diary.treatmentDescription,
	);
	const lockedAt = new Date();

	// 1. Замок и печать
	await tx
		.update(visitDiaries)
		.set({
			isLocked: true,
			lockedAt,
			lockedByUserId: userId,
			coSignedByUserId: userId,
			diaryHash: hash,
			cryptoSignaturePkcs7: params.pkcs7Signature,
			updatedAt: lockedAt,
		})
		.where(
			and(
				eq(visitDiaries.id, diaryId),
				eq(visitDiaries.organizationId, organizationId),
			),
		);

	// 2. Закрыть услуги визита и списать расходники.
	// Все чтения ограничены организацией дневника. БЫЛО: правила материалов
	// выбирались по одному serviceId, а позиция склада — по одному id, без
	// организации. Правило чужой клиники, ссылающееся на её же позицию склада,
	// списывало остаток ЧУЖОЙ клиники, а строка inventory_transactions при этом
	// записывалась на нашу — то есть запись о расходе и сам расход оказывались в
	// разных клиниках.
	const deductions: DiaryStockDeduction[] = [];
	let completedTreatmentItems = 0;
	if (diary.visitId) {
		const visitTreatmentItems = await tx
			.select()
			.from(treatmentItems)
			.where(
				and(
					eq(treatmentItems.visitId, diary.visitId),
					eq(treatmentItems.organizationId, organizationId),
				),
			);
		if (visitTreatmentItems.length > 0) {
			await tx
				.update(treatmentItems)
				.set({ status: "completed" })
				.where(
					and(
						eq(treatmentItems.visitId, diary.visitId),
						eq(treatmentItems.organizationId, organizationId),
					),
				);
			completedTreatmentItems = visitTreatmentItems.length;

			for (const item of visitTreatmentItems) {
				if (!item.serviceId) continue;
				// Правило материалов может быть НИЧЬИМ, и это норма для этого
				// продукта: единственный маршрут, который их создаёт
				// (routes/inventory.ts:410-417), не заполняет organization_id, а
				// колонка nullable — проверено в information_schema живой базы.
				// Требование точного совпадения организации выбрасывало такие
				// правила из выборки, и подписание приёма НЕ СПИСЫВАЛО материал
				// вовсе: измерено на живой базе — остаток 10 -> 10, ноль строк
				// inventory_transactions, при ответе 200 и подписанном дневнике.
				// До 87e367c40 то же правило списывало (10 -> 6): ограничение по
				// организации, закрывшее межклиничную утечку, заодно молча
				// отключило склад для правил, которые продукт создаёт сам. Тихое
				// несписание на подписанном приёме хуже расхождения остатка —
				// инвентаризация не сойдётся, а следа в журнале не останется.
				// Правило ЧУЖОЙ клиники (organization_id заполнен и не наш)
				// по-прежнему не подходит, а позиция склада ниже читается только
				// внутри нашей организации — списать чужой остаток нечем.
				const rules = await tx
					.select()
					.from(procedureMaterialRules)
					.where(
						and(
							eq(procedureMaterialRules.serviceId, item.serviceId),
							or(
								eq(procedureMaterialRules.organizationId, organizationId),
								isNull(procedureMaterialRules.organizationId),
							),
						),
					);
				for (const rule of rules) {
					if (!rule.inventoryItemId) continue;
					const [inv] = await tx
						.select()
						.from(inventoryItems)
						.where(
							and(
								eq(inventoryItems.id, rule.inventoryItemId),
								eq(inventoryItems.organizationId, organizationId),
							),
						)
						.for("update");
					if (!inv) continue;

					// ЧТО ЗДЕСЬ БЫЛО СЛОМАНО НА САМОМ ДЕЛЕ (измерено, а не выведено).
					// Предыдущий комментарий на этом месте — и заголовок коммита
					// 1f65d674b — утверждали, что подписание с ПУСТОЙ полки
					// (stock_quantity = 0) увеличивало остаток, потому что `||`
					// принимал ноль за отсутствующее значение. Это НЕВЕРНО и не
					// воспроизводится: на 1f65d674b^ пустая полка отвечала
					// 400 TransactionFailed при остатке 0. Причина в том, что
					// schema.ts объявляет все три колонки numeric, а drizzle для
					// numeric вызывает String(value) (PgNumeric.mapFromDriverValue),
					// поэтому в маршрут приходит строка "0" — истинная. `||` не имел
					// шанса провалиться, и замена его на `??` была защитной
					// гигиеной, а не исправлением склада.
					//
					// Настоящие два дефекта, оба воспроизведены на 1f65d674b^:
					//  1. ОТРИЦАТЕЛЬНОЕ quantity_to_deduct (-3 при количестве услуги
					//     2) поднимало остаток 10 -> 16 и писало ПОЛОЖИТЕЛЬНУЮ строку
					//     расхода "+6" с типом auto_deduct. Подписание приёма
					//     создавало материал из ничего.
					//  2. Правило со списанием 0 писало мусорную строку движения на 0.
					//     Оно списывало именно 0, а не 1, как утверждал тот коммит.
					const ruleQuantity = Number(rule.quantityToDeduct);
					const serviceQuantity = Number(item.quantity);
					if (
						!isDeductibleQuantity(ruleQuantity) ||
						!isDeductibleQuantity(serviceQuantity)
					) {
						continue;
					}
					const qtyToDeduct = ruleQuantity * serviceQuantity;
					// Остаток читается ровно так же, как его читает единственный
					// другой читатель этой колонки — routes/inventory.ts:143. Раньше
					// здесь стоял фолбэк `?? inv.currentQty`: для строки с
					// stock_quantity NULL церемония списывала из устаревшей
					// current_qty и записывала результат в stock_quantity, то есть
					// позиция, которую склад показывает как 0, ПОЛУЧАЛА остаток.
					// В живой базе stock_quantity объявлен NOT NULL (проверено в
					// information_schema), поэтому ветка была недостижима, а
					// current_qty в продукте не пишет никто — брать остаток оттуда
					// значит подставлять выдуманное значение вместо неизвестного.
					// Неизвестный остаток должен приводить к отказу, а не к расходу.
					const currentStock = Number(inv.stockQuantity ?? 0);
					if (!Number.isFinite(currentStock) || currentStock < qtyToDeduct) {
						throw new DiarySigningError(
							"InsufficientStock",
							`Недостаточно материалов: ${inv.name}`,
						);
					}
					// ДОЛГ, РЕШЕНИЕ ЗА ВЕДУЩИМ: в живой базе stock_quantity,
					// quantity_changed и quantity_to_deduct имеют тип integer, хотя
					// schema.ts объявляет их numeric, а treatment_items.quantity —
					// настоящий numeric(10,2). Поэтому услуга с количеством 1.5 при
					// правиле 1 требует записать "8.5" в integer-колонку: PostgreSQL
					// отвергает запрос, ошибка драйвера не является DiarySigningError
					// и уходит в обработчик server.ts как 500. Измерено: подписание
					// падает, транзакция откатывается целиком (остаток 10, ноль строк
					// расхода, дневник не подписан). Округлять здесь нельзя — это
					// выдуманная политика на материалах. Нужна миграция колонок в
					// numeric, вне рамок этого пакета.
					const quantityChanged = String(-qtyToDeduct);
					await tx
						.update(inventoryItems)
						.set({ stockQuantity: String(currentStock - qtyToDeduct) })
						.where(
							and(
								eq(inventoryItems.id, inv.id),
								eq(inventoryItems.organizationId, organizationId),
							),
						);

					await tx.insert(inventoryTransactions).values({
						organizationId,
						visitId: diary.visitId,
						inventoryItemId: inv.id,
						quantityChanged,
						unitCostRub: inv.unitCostRub != null ? String(inv.unitCostRub) : null,
						transactionType: "auto_deduct",
						userId,
					});
					deductions.push({
						inventoryItemId: inv.id,
						inventoryItemName: inv.name,
						quantityChanged,
					});
				}
			}
		}
	}

	// 3. Ставка врача, если её ещё нет
	if (userId) {
		const [existingCommission] = await tx
			.select()
			.from(doctorCommissions)
			.where(
				and(
					eq(doctorCommissions.userId, userId),
					eq(doctorCommissions.organizationId, organizationId),
				),
			)
			.limit(1);

		if (!existingCommission) {
			await tx.insert(doctorCommissions).values({
				organizationId,
				userId,
				specialty: "universal",
				serviceCategory: "therapy",
				commissionPct: "30.00",
				materialCostDeductionPct: "100.00",
				isActive: true,
			});
		}
	}

	// 4. Клинический журнал
	const [auditLog] = await tx
		.insert(clinicalAuditLogs)
		.values({
			organizationId,
			patientId: diary.patientId,
			action: "VISIT_SIGNED_AND_LOCKED",
			userId,
			entityType: "visit_diary",
			entityId: diaryId,
		})
		.returning({ id: clinicalAuditLogs.id });

	return {
		diaryId,
		hash,
		lockedAt,
		completedTreatmentItems,
		deductions,
		auditLogId: auditLog?.id ?? null,
	};
}

/**
 * Кто вправе подписать дневник приёма. Один текст на два маршрута подписания
 * (POST /api/diaries со статусом «signed» и POST /api/diaries/:id/lock), потому
 * что действие человека в обоих случаях одно и то же, а расходящиеся
 * формулировки одного отказа — это тот же дефект в рассрочку.
 *
 * Перечисления «кто может» из ролевой матрицы здесь нет намеренно: право
 * проверяется прямо в этих двух маршрутах сравнением роли смены с «doctor» и
 * «admin», и фраза описывает именно это сравнение, а не матрицу
 * security/permissions.ts, которая к нему не применяется.
 */
const DIARY_SIGNING_ROLE_MESSAGE =
	"Дневник приёма подписывает только врач или администратор клиники: у вашей смены такого права нет, и повторный вход его не добавит. Позовите врача, который вёл приём, — подписать может он.";

export default async function registerDiaryRoutes(app: FastifyInstance) {
	app.get("/api/diaries/visit/:visitId", async (req, reply) => {
		if (!(await requireClinicalReadAccess(req, reply, "read diary"))) return;
		const { visitId } = req.params as { visitId: string };
		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply
				.code(403)
				.send({ error: "OrgRequired", message: DIARY_CLINIC_UNKNOWN_READ_MESSAGE });

		const [diary] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.visitId, visitId),
					eq(visitDiaries.organizationId, orgId),
				),
			);

		return reply.send({ diary: diary ?? null });
	});

	app.get("/api/diaries/:id/revisions", async (req, reply) => {
		if (!(await requireClinicalReadAccess(req, reply, "read diary revisions")))
			return;
		const { id } = req.params as { id: string };
		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: DIARY_CLINIC_UNKNOWN_REVISIONS_MESSAGE,
			});

		// Verify diary belongs to org
		const [diary] = await db
			.select({ id: visitDiaries.id })
			.from(visitDiaries)
			.where(
				and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
			);

		if (!diary)
			return reply
				.code(404)
				.send({ error: "NotFound", message: DIARY_NOT_FOUND_REVISIONS_MESSAGE });

		const revisions = await db
			.select()
			.from(visitDiaryRevisions)
			.where(eq(visitDiaryRevisions.diaryId, id))
			.orderBy(desc(visitDiaryRevisions.revisedAt));

		return reply.send({ revisions });
	});

	app.post("/api/diaries", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "write diary")))
			return;
		const parsedUpsert = diaryUpsertSchema.safeParse(req.body);
		if (!parsedUpsert.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте поля дневника приёма. Нужны корректные visitId и patientId (UUID).",
			});
		}
		const data = parsedUpsert.data;
		const userContext = (req as any).user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";

		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply
				.code(403)
				.send({ error: "OrgRequired", message: DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE });
		data.organizationId = orgId;

		const isSigning = data.status === "signed";

		if (isSigning && role !== "doctor" && role !== "admin") {
			// Голый код отказа здесь давал самое вредное из возможных указаний:
			// клиент строит по 403 «войдите в смену заново или попросите
			// администратора открыть доступ», а повторный вход ассистенту права
			// подписывать дневник не добавит НИКОГДА. Причина у сервера установлена
			// точно — роль смены не врач и не администратор, — и названа она без
			// внутреннего ключа роли, который человеку ничего не говорит.
			return reply.code(403).send({
				error: "OnlyDoctorsCanSign",
				message: DIARY_SIGNING_ROLE_MESSAGE,
			});
		}

		try {
			// Черновик и подписание — одна транзакция. БЫЛО: три отдельных запроса
			// без транзакции, поэтому упавшее списание оставляло дневник уже
			// подписанным, а склад — нетронутым.
			const outcome = await db.transaction(async (tx) => {
				const [existing] = await tx
					.select()
					.from(visitDiaries)
					.where(
						and(
							eq(visitDiaries.visitId, data.visitId),
							eq(visitDiaries.organizationId, orgId),
						),
					)
					.limit(1);

				if (existing?.isLocked) {
					throw new DiarySigningError(
						"AlreadyLocked",
						"Дневник подписан и заблокирован.",
					);
				}

				let diaryId: string;
				if (existing) {
					await tx
						.update(visitDiaries)
						// БЫЛО: `data.X ?? existing.X` по всем клиническим полям. Пустая
						// строка — это не undefined, но фронтенд часто не присылает поле
						// вовсе, и врач НЕ МОГ удалить ошибочно внесённый текст: он стирал
						// поле, сохранял, а прежняя запись молча возвращалась. Для истории
						// болезни это опаснее опечатки — в карте остаётся неверный анамнез
						// или несуществующее осложнение.
						// Теперь поле переписывается, если оно ПРИСУТСТВУЕТ в запросе
						// (включая пустую строку), и сохраняется, только если не передано.
						.set({
							anamnesis: data.anamnesis !== undefined ? data.anamnesis : existing.anamnesis,
							statusLocalis:
								data.statusLocalis !== undefined ? data.statusLocalis : existing.statusLocalis,
							diagnosisIcd10:
								data.diagnosisIcd10 !== undefined ? data.diagnosisIcd10 : existing.diagnosisIcd10,
							diagnosisTooth:
								data.diagnosisTooth !== undefined ? data.diagnosisTooth : existing.diagnosisTooth,
							treatmentDescription:
								data.treatmentDescription !== undefined
									? data.treatmentDescription
									: existing.treatmentDescription,
							complications:
								data.complications !== undefined ? data.complications : existing.complications,
							comorbidities:
								data.comorbidities !== undefined ? data.comorbidities : existing.comorbidities,
							updatedAt: new Date(),
							instrumentTrayBarcode:
								data.instrumentTrayBarcode !== undefined
									? data.instrumentTrayBarcode
									: existing.instrumentTrayBarcode,
						})
						.where(
							and(
								eq(visitDiaries.id, existing.id),
								eq(visitDiaries.organizationId, orgId),
							),
						);
					diaryId = existing.id;
				} else {
					// Дневник всегда рождается черновиком. БЫЛО: при status "signed"
					// вставка сразу ставила is_locked, время и хеш — дневник появлялся
					// уже подписанным, минуя церемонию целиком.
					const inserted = await tx
						.insert(visitDiaries)
						.values({
							organizationId: orgId,
							visitId: data.visitId,
							patientId: data.patientId,
							anamnesis: data.anamnesis,
							statusLocalis: data.statusLocalis,
							diagnosisIcd10: data.diagnosisIcd10,
							diagnosisTooth: data.diagnosisTooth,
							treatmentDescription: data.treatmentDescription,
							complications: data.complications,
							comorbidities: data.comorbidities,
							draftAuthorId: userId,
							instrumentTrayBarcode: data.instrumentTrayBarcode,
						})
						.returning({ id: visitDiaries.id });
					const insertedId = inserted[0]?.id;
					if (!insertedId) {
						// Дневник приёма — юридический документ. Первое, что человек
						// обязан услышать, — что набранный текст ещё на экране и его
						// нельзя терять; «повторите» здесь было бы ложью, потому что
						// повтор соберёт тот же запрос.
						throw new DiarySigningError(
							"NotSaved",
							"Дневник приёма не удалось сохранить на сервере, поэтому он не подписан. Не закрывайте приём: набранный текст ещё на экране, скопируйте его в надёжное место и позовите администратора клиники.",
						);
					}
					diaryId = insertedId;
				}

				if (!isSigning) {
					return { diaryId, signing: null as DiarySigningResult | null };
				}

				const signing = await runDiarySigningCeremony(tx, {
					diaryId,
					organizationId: orgId,
					userId,
					pkcs7Signature: data.pkcs7Signature ?? null,
				});
				return { diaryId, signing };
			});

			return reply.send({
				success: true,
				id: outcome.diaryId,
				hash: outcome.signing?.hash ?? null,
			});
		} catch (err) {
			if (err instanceof DiarySigningError) {
				if (err.code === "AlreadyLocked") {
					return reply
						.code(403)
						.send({ error: "DiaryLocked", message: err.message });
				}
				if (err.code === "InsufficientStock") {
					return reply
						.code(400)
						.send({ error: "TransactionFailed", message: err.message });
				}
				/*
				 * ЧТО БЫЛО СЛОМАНО. Здесь стояло `return reply.code(404).send({ error:
				 * "NotFound" })` — то есть две соседние ветки того же catch передавали
				 * причину наружу, а третья её выбрасывала, хотя в err.message лежала
				 * готовая русская фраза. Без message клиент строит текст по коду
				 * ответа, и для 404 это «сервер не знает такого раздела — скорее всего
				 * программа клиники обновлена не полностью, сообщите администратору»
				 * (apps/web/src/lib/panelStateText.ts:125-127). Это не безликий текст,
				 * а ЛОЖНОЕ указание: маршрут существует и работает, а врача отправляют
				 * звать администратора вместо одного нажатия «Сохранить черновик».
				 *
				 * И два состояния разведены по кодам, потому что действия у них
				 * противоположные: «дневника нет» лечится повторным сохранением
				 * (404), «дневник не удалось сохранить» не лечится ничем на стороне
				 * врача и обязано читаться как сбой сервера (500).
				 */
				if (err.code === "NotSaved") {
					return reply
						.code(500)
						.send({ error: "DiaryNotSaved", message: err.message });
				}
				return reply
					.code(404)
					.send({ error: "NotFound", message: err.message });
			}
			throw err;
		}
	});

	app.post("/api/diaries/:id/lock", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "lock diary")))
			return;
		const { id } = req.params as { id: string };
		const parsedLockBody = diaryLockBodySchema.safeParse(req.body ?? {});
		if (!parsedLockBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Тело запроса подписания дневника должно быть JSON-объектом.",
			});
		}
		const pkcs7Signature =
			typeof parsedLockBody.data.pkcs7Signature === "string"
				? parsedLockBody.data.pkcs7Signature
				: undefined;
		const userContext = (req as any).user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";

		/*
		 * ЭТО МЕСТО ДОКАЗАНО ЗАПРОСОМ, а не выведено чтением, и оно вреднее ветки в
		 * POST выше: сюда стучится живой клиент подписания
		 * (apps/web/src/components/useVisitDiaryLogic.ts:507), и он строит текст
		 * тоста ровно из поля message, а без него — по коду ответа (:530-540).
		 * Голые отказы ниже давали врачу три ложных указания подряд: 403 читалось
		 * как «войдите в смену заново» (ассистенту это не поможет никогда), 404 —
		 * как «программа клиники обновлена не полностью, сообщите администратору»
		 * (маршрут существует и работает). Дневник приёма — юридический документ, и
		 * врач, не понявший отказ, либо теряет заполненный текст, либо переписывает
		 * его во второй записи.
		 */
		if (role !== "doctor" && role !== "admin") {
			return reply.code(403).send({
				error: "OnlyDoctorsCanLock",
				message: DIARY_SIGNING_ROLE_MESSAGE,
			});
		}

		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply
				.code(403)
				.send({ error: "OrgRequired", message: DIARY_CLINIC_UNKNOWN_SIGN_MESSAGE });

		const [existing] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
			);

		if (!existing)
			return reply.code(404).send({
				error: "NotFound",
				message:
					"Дневник приёма не найден в этой клинике, подписывать нечего. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён. Откройте приём заново, нажмите «Сохранить черновик» и повторите подписание.",
			});
		if (existing.isLocked)
			return reply.code(409).send({
				error: "AlreadyLocked",
				hash: existing.diaryHash,
				message:
					"Дневник этого приёма уже подписан и заблокирован, второй раз подписывать его не нужно. Если нужна правка подписанного дневника, её проводит администратор клиники через ревизию.",
			});

		// Церемония — общая с POST /api/diaries, см. runDiarySigningCeremony.
		try {
			const signing = await db.transaction((tx) =>
				runDiarySigningCeremony(tx, {
					diaryId: id,
					organizationId: orgId,
					userId,
					pkcs7Signature: pkcs7Signature ?? null,
				}),
			);
			return reply.send({
				success: true,
				hash: signing.hash,
				lockedAt: signing.lockedAt.toISOString(),
			});
		} catch (err) {
			if (err instanceof DiarySigningError) {
				// Те же две ветки, что и в POST выше, теряли здесь готовую русскую
				// причину из err.message — при том, что третья, соседняя, её отдавала.
				if (err.code === "AlreadyLocked") {
					return reply
						.code(409)
						.send({ error: "AlreadyLocked", message: err.message });
				}
				if (err.code === "NotFound") {
					return reply
						.code(404)
						.send({ error: "NotFound", message: err.message });
				}
				if (err.code === "NotSaved") {
					return reply
						.code(500)
						.send({ error: "DiaryNotSaved", message: err.message });
				}
				return reply
					.code(400)
					.send({ error: "TransactionFailed", message: err.message });
			}
			// БЫЛО: `catch (err: any)` возвращал 400 с err.message на ЛЮБОЙ сбой,
			// включая ошибки драйвера базы — клиенту уходили внутренние подробности
			// схемы, а отказ инфраструктуры выглядел как ошибка запроса. Теперь
			// неожидаемые ошибки уходят обработчику server.ts, который их обезличивает.
			throw err;
		}
	});

	app.post("/api/diaries/:id/revise", async (req, reply) => {
		if (
			!(await requireClinicalMutationAccess(req, reply, "revise locked diary"))
		)
			return;
		const { id } = req.params as { id: string };
		/* Body Zod before role gate (как /lock): non-object → 400, не 403 oracle. */
		const parsedReviseBody = diaryReviseBodySchema.safeParse(req.body ?? {});
		if (!parsedReviseBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Тело запроса ревизии дневника должно быть JSON-объектом.",
			});
		}
		const userContext = (req as any).user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";

		if (role !== "admin") {
			/*
			 * Прежний текст назывался «Ревизия заблокированного дневника доступна
			 * только администратору.» — причину он называл, а действие нет, и слово
			 * «ревизия» на экране приёма читается как бухгалтерская проверка. Без
			 * следующего шага врач, которому нужно исправить подписанный дневник,
			 * упирается в отказ и не узнаёт, что исправление вообще возможно — а
			 * дневник приёма это юридический документ, и переписывать его второй
			 * записью нельзя.
			 */
			return reply.code(403).send({
				error: "OnlyAdminsCanRevise",
				message:
					"Исправить уже подписанный дневник приёма может только администратор клиники, и повторный вход этого права не добавит. Позовите администратора клиники — он внесёт правку так, что прежний текст останется в истории дневника.",
			});
		}

		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: DIARY_CLINIC_UNKNOWN_REVISE_MESSAGE,
			});

		const [existing] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
			);

		if (!existing)
			return reply
				.code(404)
				.send({ error: "NotFound", message: DIARY_NOT_FOUND_REVISE_MESSAGE });
		if (!existing.isLocked)
			return reply.code(409).send({
				error: "NotLocked",
				message: "Дневник не подписан — просто редактируйте его.",
			});

		/*
		 * ДОЛГ, НЕ ЗАКРЫТ ЗДЕСЬ: причина ревизии принимается, но сохранить её
		 * некуда — в модели drizzle нет колонки. В САМОЙ БАЗЕ она есть:
		 * миграция 0116_add_soap_template_fields.sql добавила
		 * visit_diary_revisions.revision_reason TEXT и
		 * visit_diary_revisions.previous_diagnosis_tooth VARCHAR(10) (проверено
		 * чтением information_schema на 127.0.0.1:5432). Отстала только
		 * apps/api/src/db/schema.ts:1421-1434, а её правка вне рамок этого
		 * пакета. Пока строка ревизии не хранит ни причину, ни прежний номер зуба.
		 */
		const body = {
			anamnesis:
				typeof parsedReviseBody.data.anamnesis === "string"
					? parsedReviseBody.data.anamnesis
					: undefined,
			statusLocalis:
				typeof parsedReviseBody.data.statusLocalis === "string"
					? parsedReviseBody.data.statusLocalis
					: undefined,
			diagnosisIcd10:
				typeof parsedReviseBody.data.diagnosisIcd10 === "string"
					? parsedReviseBody.data.diagnosisIcd10
					: undefined,
			diagnosisTooth:
				typeof parsedReviseBody.data.diagnosisTooth === "string"
					? parsedReviseBody.data.diagnosisTooth
					: undefined,
			treatmentDescription:
				typeof parsedReviseBody.data.treatmentDescription === "string"
					? parsedReviseBody.data.treatmentDescription
					: undefined,
			revisionReason:
				typeof parsedReviseBody.data.revisionReason === "string"
					? parsedReviseBody.data.revisionReason
					: undefined,
		};

		const newHash = computeDiaryHash(
			existing.visitId,
			existing.patientId ?? "",
			body.anamnesis ?? existing.anamnesis,
			body.statusLocalis ?? existing.statusLocalis,
			body.treatmentDescription ?? existing.treatmentDescription,
		);

		// Одна транзакция на запись ревизии и правку дневника. БЫЛО: два отдельных
		// запроса — упавшая правка оставляла в журнале ревизию об изменении,
		// которого не произошло.
		const revisionCount = await db.transaction(async (tx) => {
			await tx.insert(visitDiaryRevisions).values({
				organizationId: orgId,
				diaryId: existing.id,
				previousAnamnesis: existing.anamnesis,
				previousStatusLocalis: existing.statusLocalis,
				previousDiagnosisIcd10: existing.diagnosisIcd10,
				previousTreatmentDescription: existing.treatmentDescription,
				revisedByUserId: userId,
			});

			// Update the diary (unlock for new content, then re-lock immediately)
			await tx
				.update(visitDiaries)
				.set({
					anamnesis: body.anamnesis ?? existing.anamnesis,
					statusLocalis: body.statusLocalis ?? existing.statusLocalis,
					diagnosisIcd10: body.diagnosisIcd10 ?? existing.diagnosisIcd10,
					diagnosisTooth: body.diagnosisTooth ?? existing.diagnosisTooth,
					treatmentDescription:
						body.treatmentDescription ?? existing.treatmentDescription,
					diaryHash: newHash,
					version: (existing.version ?? 1) + 1,
					updatedAt: new Date(),
				})
				.where(
					and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
				);

			// БЫЛО: `revisionCount: 1` — константа вместо настоящего числа ревизий.
			// Ответ утверждал «ревизия первая» и на десятой правке карты.
			const [tally] = await tx
				.select({ total: count() })
				.from(visitDiaryRevisions)
				.where(
					and(
						eq(visitDiaryRevisions.diaryId, existing.id),
						eq(visitDiaryRevisions.organizationId, orgId),
					),
				);
			return tally?.total ?? 0;
		});

		return reply.send({ success: true, hash: newHash, revisionCount });
	});

	// Legacy endpoint: sync-progress + plan signature (kept for backwards compat)
	app.post("/api/diaries/sync-progress", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "sync progress")))
			return;
		return reply.send({ success: true });
	});

	app.put("/api/treatment-plans/:planId/signature", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "sign plan"))) return;
		return reply.send({ success: true });
	});
}
