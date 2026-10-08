import { and, eq, isNull, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	resolveOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { visitDiaries } from "../../db/schema.js";
import {
	DiarySigningError,
	computeDiaryHash,
	resolveSignatureForStorage,
	runDiarySigningCeremony,
} from "../../services/clinical/DiarySigningCeremonyService.js";
import {
	DIARY_CLINIC_UNKNOWN_SIGN_MESSAGE,
	DIARY_SIGNING_ROLE_MESSAGE,
	isDoctorOrClinicalSigner,
	diaryIdParamsSchema,
	diaryLockBodySchema,
} from "./types.js";

export { registerSigningRoutes as registerDiarySigningRoutes };
export async function registerSigningRoutes(app: FastifyInstance): Promise<void> {

	app.post("/api/diaries/:id/lock", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "lock diary")))
			return;
		const parsedIdParams = diaryIdParamsSchema.safeParse(req.params);
		if (!parsedIdParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор дневника в адресе должен быть UUID (id).",
			});
		}
		const { id } = parsedIdParams.data;
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
		const userContext = req.user;
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
		if (!isDoctorOrClinicalSigner(role)) {
			return reply.code(403).send({
				error: "OnlyDoctorsCanLock",
				message: DIARY_SIGNING_ROLE_MESSAGE,
			});
		}

		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: DIARY_CLINIC_UNKNOWN_SIGN_MESSAGE,
			});

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
		/*
		 * Повторная УКЭП после admin-revise.
		 *
		 * БЫЛО: revise обнуляет crypto_signature_pkcs7 (хеш уже другой — старый
		 * PKCS#7 врал бы «подпись ↔ содержимое»), но /lock при is_locked сразу
		 * отвечал 409 AlreadyLocked. Клиент после правки показывал штамп
		 * «ЭЦП (SHA-256)» по одному diaryHash, без PKCS#7, и повторно приложить
		 * подпись к новому хешу было нечем. Печать 043/у выглядела заверенной
		 * УКЭП, хотя оттиска в БД нет.
		 *
		 * СТАЛО: locked + crypto_signature_pkcs7 IS NULL + в теле есть PKCS#7 →
		 * только прикрепляем подпись и пересчитываем hash по строке (без
		 * повторной складской церемонии — услуги/склад уже закрыты первым lock).
		 * locked + PKCS#7 уже есть → по-прежнему 409.
		 *
		 * DEFECT #85: re-attach must serialize on the locked 043/у row.
		 * БЫЛО: outer SELECT without FOR UPDATE, then bare UPDATE by id+org.
		 * Concurrent double POST /lock after revise both saw null PKCS#7 and
		 * both wrote crypto_signature_pkcs7 / diaryHash — last writer won,
		 * first УКЭП silently discarded; concurrent /revise could change SOAP
		 * between hash snapshot and UPDATE so PKCS#7 sealed the wrong text.
		 * СТАЛО: FOR UPDATE inside transaction; hash + author fill from locked
		 * row; UPDATE WHERE is_locked=true AND crypto still empty; zero rows →
		 * AlreadyLocked (same pattern as draft #73 / lock #76 / revise #84).
		 */
		if (existing.isLocked) {
			const incomingPkcs7 =
				typeof pkcs7Signature === "string" && pkcs7Signature.length > 0
					? pkcs7Signature
					: null;

			const lockedAtIsoFrom = (
				lockedAt: Date | string | null | undefined,
			): string | null =>
				lockedAt instanceof Date
					? lockedAt.toISOString()
					: typeof lockedAt === "string"
						? lockedAt
						: null;

			if (!incomingPkcs7) {
				const lockedAtIso = lockedAtIsoFrom(existing.lockedAt);
				const hasPkcs7 =
					typeof existing.cryptoSignaturePkcs7 === "string" &&
					existing.cryptoSignaturePkcs7.length > 0;
				/*
				 * БЫЛО: 409 отдавал hash, но не lockedAt. Клиент doLock на 409 ставил
				 * isLocked=true и hash, а lockedAt оставался null — печать 043/у и
				 * штамп «Подписан:» показывали «—» / дату с ПК, хотя в БД locked_at есть.
				 */
				return reply.code(409).send({
					error: "AlreadyLocked",
					hash: existing.diaryHash,
					lockedAt: lockedAtIso,
					cryptoSignatureAttached: hasPkcs7,
					message: hasPkcs7
						? "Дневник этого приёма уже подписан и заблокирован, второй раз подписывать его не нужно. Если нужна правка, внесите её через ревизию («Исправленному верить») — прежний текст надёжно сохранится в истории версий."
						: "Дневник уже закрыт замком, но оттиск УКЭП после правки сброшен. Откройте подписание и приложите подпись КриптоПро или простую подпись к текущему отпечатку — склад и услуги повторно не спишутся.",
				});
			}

			type ReattachTxResult =
				| { kind: "not_found" }
				| { kind: "not_locked" }
				| {
						kind: "already";
						hash: string | null;
						lockedAt: string | null;
						hasPkcs7: boolean;
				  }
				| { kind: "pin_rejected"; code: string; message: string }
				| {
						kind: "ok";
						hash: string;
						lockedAt: string | null;
						attached: boolean;
				  };

			const reattachResult: ReattachTxResult = await db.transaction(
				async (tx) => {
					const [row] = await tx
						.select()
						.from(visitDiaries)
						.where(
							and(
								eq(visitDiaries.id, id),
								eq(visitDiaries.organizationId, orgId),
							),
						)
						.for("update");

					if (!row) return { kind: "not_found" as const };
					if (!row.isLocked) return { kind: "not_locked" as const };

					const lockedAtIso = lockedAtIsoFrom(row.lockedAt);
					const hasPkcs7 =
						typeof row.cryptoSignaturePkcs7 === "string" &&
						row.cryptoSignaturePkcs7.length > 0;
					if (hasPkcs7) {
						return {
							kind: "already" as const,
							hash: row.diaryHash,
							lockedAt: lockedAtIso,
							hasPkcs7: true,
						};
					}

					const reattachHash = computeDiaryHash(
						row.visitId,
						row.patientId ?? "",
						row.anamnesis,
						row.statusLocalis,
						row.treatmentDescription,
						row.diagnosisIcd10,
						row.diagnosisTooth,
						row.complications,
						row.comorbidities,
						row.instrumentTrayBarcode,
					);
					const resolvedReattach = await resolveSignatureForStorage({
						pkcs7Signature: incomingPkcs7,
						userId,
						organizationId: orgId,
						diaryHashForMark: reattachHash,
					});
					if (!resolvedReattach.ok) {
						return {
							kind: "pin_rejected" as const,
							code: resolvedReattach.code,
							message: resolvedReattach.message,
						};
					}

					const now = new Date();
					/*
					 * DEFECT #39: progressive fill author/doctor on re-attach.
					 * БЫЛО: reattach писал только coSignedByUserId. Legacy-строки
					 * (до DEFECT #35) оставались с doctorId/authorId = null даже
					 * после повторной УКЭП — BI/print/toothHistory без врача.
					 * СТАЛО: заполняем authorId/doctorId/lockedByUserId ТОЛЬКО
					 * если колонка ещё null. После revise исходный doctorId
					 * сохраняется — re-attach не подменяет лечащего врача.
					 */
					const updatedRows = await tx
						.update(visitDiaries)
						.set({
							diaryHash: reattachHash,
							cryptoSignaturePkcs7: resolvedReattach.stored,
							coSignedByUserId: userId,
							authorId: row.authorId ?? userId,
							doctorId: row.doctorId ?? userId,
							lockedByUserId: row.lockedByUserId ?? userId,
							updatedAt: now,
						})
						.where(
							and(
								eq(visitDiaries.id, id),
								eq(visitDiaries.organizationId, orgId),
								eq(visitDiaries.isLocked, true),
								/* only first successful re-attach wins the empty PKCS#7 slot */
								or(
									isNull(visitDiaries.cryptoSignaturePkcs7),
									eq(visitDiaries.cryptoSignaturePkcs7, ""),
								),
							),
						)
						.returning({ id: visitDiaries.id });

					if (updatedRows.length === 0) {
						const [again] = await tx
							.select({
								diaryHash: visitDiaries.diaryHash,
								lockedAt: visitDiaries.lockedAt,
								cryptoSignaturePkcs7: visitDiaries.cryptoSignaturePkcs7,
							})
							.from(visitDiaries)
							.where(
								and(
									eq(visitDiaries.id, id),
									eq(visitDiaries.organizationId, orgId),
								),
							)
							.limit(1);
						const againHas =
							typeof again?.cryptoSignaturePkcs7 === "string" &&
							again.cryptoSignaturePkcs7.length > 0;
						return {
							kind: "already" as const,
							hash: again?.diaryHash ?? row.diaryHash,
							lockedAt: lockedAtIsoFrom(again?.lockedAt ?? row.lockedAt),
							hasPkcs7: againHas,
						};
					}

					return {
						kind: "ok" as const,
						hash: reattachHash,
						lockedAt: lockedAtIso,
						attached: Boolean(resolvedReattach.stored),
					};
				},
			);

			if (reattachResult.kind === "not_found") {
				return reply.code(404).send({
					error: "NotFound",
					message:
						"Дневник приёма не найден в этой клинике, подписывать нечего. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён. Откройте приём заново, нажмите «Сохранить черновик» и повторите подписание.",
				});
			}
			if (reattachResult.kind === "pin_rejected") {
				return reply.code(403).send({
					error: reattachResult.code,
					message: reattachResult.message,
				});
			}
			if (reattachResult.kind === "already") {
				return reply.code(409).send({
					error: "AlreadyLocked",
					hash: reattachResult.hash,
					lockedAt: reattachResult.lockedAt,
					cryptoSignatureAttached: reattachResult.hasPkcs7,
					message: reattachResult.hasPkcs7
						? "Дневник этого приёма уже подписан и заблокирован, второй раз подписывать его не нужно. Если нужна правка, внесите её через ревизию («Исправленному верить») — прежний текст надёжно сохранится в истории версий."
						: "Дневник уже закрыт замком, но оттиск УКЭП после правки сброшен. Откройте подписание и приложите подпись КриптоПро или простую подпись к текущему отпечатку — склад и услуги повторно не спишутся.",
				});
			}
			if (reattachResult.kind === "ok") {
				return reply.send({
					success: true,
					hash: reattachResult.hash,
					lockedAt: reattachResult.lockedAt,
					cryptoSignatureAttached: reattachResult.attached,
					reattached: true,
				});
			}
			/* not_locked: row unlocked between outer read and FOR UPDATE — fall through to ceremony */
		}

		// Церемония — общая с POST /api/diaries, см. runDiarySigningCeremony.
		// PIN:… → verify + opaque mark ДО транзакции (pbkdf2 вне tx-критики).
		try {
			const resolvedLock = await resolveSignatureForStorage({
				pkcs7Signature: pkcs7Signature ?? null,
				userId,
				organizationId: orgId,
				diaryHashForMark: existing.diaryHash,
			});
			if (!resolvedLock.ok) {
				const statusCode =
					resolvedLock.code === "PepDoctorForbidden" ? 422 : 403;
				return reply.code(statusCode).send({
					error: resolvedLock.code,
					message: resolvedLock.message,
				});
			}
			const signing = await db.transaction((tx) =>
				runDiarySigningCeremony(tx, {
					diaryId: id,
					organizationId: orgId,
					userId,
					pkcs7Signature: resolvedLock.stored,
				}),
			);
			return reply.send({
				success: true,
				hash: signing.hash,
				lockedAt: signing.lockedAt.toISOString(),
				cryptoSignatureAttached: Boolean(
					resolvedLock.stored && String(resolvedLock.stored).length > 0,
				),
			});
		} catch (err) {
			if (err instanceof DiarySigningError) {
				// Те же две ветки, что и в POST выше, теряли здесь готовую русскую
				// причину из err.message — при том, что третья, соседняя, её отдавала.
				if (err.code === "AlreadyLocked") {
					/*
					 * Race TOCTOU: внешний SELECT ещё не locked, церемония FOR UPDATE
					 * увидела is_locked. БЫЛО: 409 только {error, message} — без hash
					 * и lockedAt. Клиент doLock на 409 ставил isLocked=true, но
					 * diaryHash/lockedAt оставались null → печать 043/у без ЭЦП-штампа
					 * и без даты подписи, хотя в БД оба поля уже есть.
					 */
					const [lockedRow] = await db
						.select({
							diaryHash: visitDiaries.diaryHash,
							lockedAt: visitDiaries.lockedAt,
						})
						.from(visitDiaries)
						.where(
							and(
								eq(visitDiaries.id, id),
								eq(visitDiaries.organizationId, orgId),
							),
						)
						.limit(1);
					return reply.code(409).send({
						error: "AlreadyLocked",
						hash: lockedRow?.diaryHash ?? null,
						lockedAt:
							lockedRow?.lockedAt instanceof Date
								? lockedRow.lockedAt.toISOString()
								: typeof lockedRow?.lockedAt === "string"
									? lockedRow.lockedAt
									: null,
						message: err.message,
					});
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
				if (
					err.code === "Icd10Required" ||
					err.code === "Icd10Invalid" ||
					err.code === "ToothRequired" ||
					err.code === "ToothInvalid" ||
					err.code === "PepDoctorForbidden"
				) {
					return reply
						.code(422)
						.send({ error: err.code, message: err.message });
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
}
