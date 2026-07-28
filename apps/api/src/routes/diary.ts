import crypto from "crypto";
import { and, count, desc, eq } from "drizzle-orm";
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

/** Транзакция drizzle — тип берётся у самого db, чтобы не тянуть внутренние пути ORM. */
type DiaryDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type DiarySigningFailureCode =
	| "NotFound"
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
		throw new DiarySigningError("NotFound", "Дневник не найден.");
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
				const rules = await tx
					.select()
					.from(procedureMaterialRules)
					.where(
						and(
							eq(procedureMaterialRules.serviceId, item.serviceId),
							eq(procedureMaterialRules.organizationId, organizationId),
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

					// БЫЛО: `Number(rule.quantityToDeduct || 1)` и
					// `Number(inv.stockQuantity || inv.currentQty || 0)`.
					// `||` не отличает «нет значения» от настоящего нуля:
					//  - правило со списанием 0 превращалось в списание 1;
					//  - ПУСТАЯ полка (stock_quantity = 0) считалась «значение не
					//    задано», остаток брался из устаревшей колонки current_qty,
					//    проверка достаточности проходила, и склад после подписания
					//    ВЫРАСТАЛ с нуля. В живой базе stock_quantity имеет тип
					//    integer, поэтому драйвер отдаёт настоящий 0, а не строку "0",
					//    и ветка срабатывала. Теперь ноль — это ноль.
					const qtyToDeduct =
						Number(rule.quantityToDeduct ?? 1) * Number(item.quantity ?? 1);
					const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
					// Нечисловой или неположительный расход не является списанием:
					// строка движения на 0 или NaN только засоряет журнал склада.
					if (!Number.isFinite(qtyToDeduct) || qtyToDeduct <= 0) continue;
					if (!Number.isFinite(currentStock) || currentStock < qtyToDeduct) {
						throw new DiarySigningError(
							"InsufficientStock",
							`Недостаточно материалов: ${inv.name}`,
						);
					}
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

export default async function registerDiaryRoutes(app: FastifyInstance) {
	// GET /api/diaries/visit/:visitId — fetch diary for a visit
	app.get("/api/diaries/visit/:visitId", async (req, reply) => {
		if (!(await requireClinicalReadAccess(req, reply, "read diary"))) return;
		const { visitId } = req.params as { visitId: string };
		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

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

	// GET /api/diaries/:id/revisions — audit trail for a diary
	app.get("/api/diaries/:id/revisions", async (req, reply) => {
		if (!(await requireClinicalReadAccess(req, reply, "read diary revisions")))
			return;
		const { id } = req.params as { id: string };
		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

		// Verify diary belongs to org
		const [diary] = await db
			.select({ id: visitDiaries.id })
			.from(visitDiaries)
			.where(
				and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
			);

		if (!diary) return reply.code(404).send({ error: "NotFound" });

		const revisions = await db
			.select()
			.from(visitDiaryRevisions)
			.where(eq(visitDiaryRevisions.diaryId, id))
			.orderBy(desc(visitDiaryRevisions.revisedAt));

		return reply.send({ revisions });
	});

	// POST /api/diaries — upsert (create or update) diary draft
	app.post("/api/diaries", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "write diary")))
			return;
		const data = diaryUpsertSchema.parse(req.body);
		const userContext = (req as any).user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";

		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });
		data.organizationId = orgId;

		const isSigning = data.status === "signed";

		if (isSigning && role !== "doctor" && role !== "admin") {
			return reply.code(403).send({ error: "OnlyDoctorsCanSign" });
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
						throw new DiarySigningError(
							"NotFound",
							"Дневник не удалось создать.",
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
				return reply.code(404).send({ error: "NotFound" });
			}
			throw err;
		}
	});

	// POST /api/diaries/:id/lock — forensic lock with SHA-256 seal + revision record
	app.post("/api/diaries/:id/lock", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "lock diary")))
			return;
		const { id } = req.params as { id: string };
		const { pkcs7Signature } = (req.body as { pkcs7Signature?: string }) || {};
		const userContext = (req as any).user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";

		if (role !== "doctor" && role !== "admin") {
			return reply.code(403).send({ error: "OnlyDoctorsCanLock" });
		}

		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

		const [existing] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
			);

		if (!existing) return reply.code(404).send({ error: "NotFound" });
		if (existing.isLocked)
			return reply
				.code(409)
				.send({ error: "AlreadyLocked", hash: existing.diaryHash });

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
				if (err.code === "AlreadyLocked") {
					return reply.code(409).send({ error: "AlreadyLocked" });
				}
				if (err.code === "NotFound") {
					return reply.code(404).send({ error: "NotFound" });
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

	// POST /api/diaries/:id/revise — post-lock forced revision (audit court trail)
	app.post("/api/diaries/:id/revise", async (req, reply) => {
		if (
			!(await requireClinicalMutationAccess(req, reply, "revise locked diary"))
		)
			return;
		const { id } = req.params as { id: string };
		const userContext = (req as any).user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";

		if (role !== "admin") {
			return reply.code(403).send({
				error: "OnlyAdminsCanRevise",
				message:
					"Ревизия заблокированного дневника доступна только администратору.",
			});
		}

		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired" });

		const [existing] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
			);

		if (!existing) return reply.code(404).send({ error: "NotFound" });
		if (!existing.isLocked)
			return reply.code(409).send({
				error: "NotLocked",
				message: "Дневник не подписан — просто редактируйте его.",
			});

		const body = req.body as {
			anamnesis?: string;
			statusLocalis?: string;
			diagnosisIcd10?: string;
			diagnosisTooth?: string;
			treatmentDescription?: string;
			/**
			 * ДОЛГ, НЕ ЗАКРЫТ ЗДЕСЬ: причина ревизии принимается, но сохранить её
			 * некуда — в модели drizzle нет колонки. В САМОЙ БАЗЕ она есть:
			 * миграция 0116_add_soap_template_fields.sql добавила
			 * visit_diary_revisions.revision_reason TEXT и
			 * visit_diary_revisions.previous_diagnosis_tooth VARCHAR(10) (проверено
			 * чтением information_schema на 127.0.0.1:5432). Отстала только
			 * apps/api/src/db/schema.ts:1421-1434, а её правка вне рамок этого
			 * пакета. Пока строка ревизии не хранит ни причину, ни прежний номер зуба.
			 */
			revisionReason?: string;
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
