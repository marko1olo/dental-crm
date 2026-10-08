import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	resolveOrganizationId,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { db } from "../../db/client.js";
import { users, visitDiaries, visits } from "../../db/schema.js";
import {
	DiarySigningError,
	type DiarySigningResult,
	computeDiaryHash,
	formatDoctorSpecialtyLabel,
	redactLegacyPinSignature,
	resolveSignatureForStorage,
	runDiarySigningCeremony,
	syncVisitEmkFromDiarySoap,
} from "../../services/clinical/DiarySigningCeremonyService.js";
import {
	DIARY_CLINIC_UNKNOWN_READ_MESSAGE,
	DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE,
	DIARY_SIGNING_ROLE_MESSAGE,
	isDoctorOrClinicalSigner,
	diaryVisitParamsSchema,
	diaryUpsertSchema,
	shiftsPayloadSchema,
} from "./types.js";

export async function registerDiaryCrudRoutes(app: FastifyInstance): Promise<void> {
	app.get("/api/diaries/visit/:visitId", async (req, reply) => {
		if (!(await requireClinicalReadAccess(req, reply, "read diary"))) return;
		const parsedVisitParams = diaryVisitParamsSchema.safeParse(req.params);
		if (!parsedVisitParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор приёма в адресе должен быть UUID (visitId).",
			});
		}
		const { visitId } = parsedVisitParams.data;
		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: DIARY_CLINIC_UNKNOWN_READ_MESSAGE,
			});

		// 152-ФЗ / 323-ФЗ: Дневники 043/у содержат врачебную тайну — доступ только клиническому персоналу
		const identity = getRequestIdentity(req);
		const staffRole = identity.role ?? req.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			await auditMedicalAccessFromRequest(req, {
				organizationId: orgId,
				patientId: "unknown",
				action: "ACCESS_DENIED_DIARY",
				diagnosis: "Попытка несанкционированного доступа к дневнику 043/у (152-ФЗ)",
			});
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.diary.read",
				role: staffRole,
				message: `Отказ в доступе к дневнику 043/у (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		/*
		 * БЫЛО: нет строки visit_diaries → { diary: null } и для чужого UUID,
		 * и для реального приёма без дневника. Клиент рисовал «пустой SOAP»
		 * как новый приём. СТАЛО: visit ∉ org → 404; пустой дневник — null.
		 */
		const [visitRow] = await db
			.select({ id: visits.id, patientId: visits.patientId })
			.from(visits)
			.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
			.limit(1);
		if (!visitRow) {
			return reply.code(404).send({
				error: "VisitNotFound",
				message:
					"Приём не найден в этой клинике, дневник 043/у открыть нельзя.",
			});
		}

		const [diary] = await db
			.select()
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.visitId, visitId),
					eq(visitDiaries.organizationId, orgId),
				),
			);

		if (!diary) {
			return reply.send({ diary: null });
		}

		// 152-ФЗ: Юридически значимый аудит чтения карты/дневника пациента врачом
		await auditMedicalAccessFromRequest(req, {
			organizationId: orgId,
			patientId: visitRow.patientId ?? diary.patientId,
			action: "VIEW_DIARY_043U",
			diagnosis: diary.diagnosisIcd10
				? `${diary.diagnosisIcd10} (${diary.diagnosisTooth ? `зуб ${diary.diagnosisTooth}` : "без зуба"})`
				: "Дневник 043/у",
		});
		/*
		 * DEFECT #36: ФИО врача для печати 043/у.
		 * БЫЛО: GET отдавал только UUID doctorId/lockedByUserId; клиент печати
		 * брал ctx.activeDoctor (кто СЕЙЧАС в смене). Админ/другой врач
		 * печатал чужой подписанный дневник — в «Врач:» попадало чужое ФИО.
		 * СТАЛО: резолвим ФИО по doctorId → lockedByUserId → authorId →
		 * draftAuthorId внутри org и отдаём doctorFullName / doctorSpecialty.
		 */
		const signingUserId =
			diary.doctorId ??
			diary.lockedByUserId ??
			diary.authorId ??
			diary.draftAuthorId ??
			null;
		let doctorFullName: string | null = null;
		let doctorSpecialty: string | null = null;
		if (typeof signingUserId === "string" && signingUserId.length > 0) {
			const [docUser] = await db
				.select({
					fullName: users.fullName,
					specialties: users.specialties,
				})
				.from(users)
				.where(
					and(eq(users.id, signingUserId), eq(users.organizationId, orgId)),
				)
				.limit(1);
			if (docUser) {
				doctorFullName =
					typeof docUser.fullName === "string" && docUser.fullName.trim()
						? docUser.fullName.trim()
						: null;
				/*
				 * DEFECT #41: specialty from users.specialties jsonb.
				 * БЫЛО: doctorSpecialty = null всегда — печать 043/у «Врач: ФИО»
				 * без «(терапия)» после F5 / чужой смены.
				 */
				doctorSpecialty = formatDoctorSpecialtyLabel(docUser.specialties);
			}
		}
		/*
		 * Не отдаём legacy PIN:<digits> в браузер: оттиск был, цифр PIN — нет.
		 * SIMPLE_PIN_EP|… и PKCS#7 проходят как есть (цифр PIN в них нет).
		 */
		return reply.send({
			diary: {
				...diary,
				cryptoSignaturePkcs7: redactLegacyPinSignature(
					diary.cryptoSignaturePkcs7,
				),
				doctorFullName,
				doctorSpecialty,
			},
		});
	});

	app.post("/api/diaries", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "write diary")))
			return;

		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE,
			});

		// 152-ФЗ / 323-ФЗ: Запись дневника 043/у разрешена исключительно медицинскому персоналу
		const identity = getRequestIdentity(req);
		const staffRole = identity.role ?? req.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.diary.write",
				role: staffRole,
				message: `Отказ в записи дневника 043/у (152-ФЗ / 323-ФЗ): ${evalAccess.reason}. Набранный текст остаётся в форме, не закрывайте окно приёма. Обратитесь к администратору клиники.`,
			});
		}

		const parsedUpsert = diaryUpsertSchema.safeParse(req.body);
		if (!parsedUpsert.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Проверьте поля дневника приёма. Нужны корректные visitId и patientId (UUID).",
			});
		}
		const data = parsedUpsert.data;
		const userContext = req.user;
		const userId: string | null = userContext?.id ?? null;
		const role: string = userContext?.role ?? "assistant";
		data.organizationId = orgId;

		/*
		 * Привязка 043/у к реальному приёму клиники.
		 * БЫЛО: insert/update visit_diaries с visitId/patientId из тела без
		 * проверки visits. У visit_diaries.visit_id НЕТ FK — любой UUID
		 * принимался. Можно было завести дневник на чужой/несуществующий
		 * приём или подменить patientId (хеш 043/у и печать — на «левом»
		 * пациенте). СТАЛО: visit ∈ org, patientId совпадает с карточкой
		 * приёма — до транзакции и до записи на диск/в БД.
		 */
		const [visitForDiary] = await db
			.select({ id: visits.id, patientId: visits.patientId })
			.from(visits)
			.where(and(eq(visits.id, data.visitId), eq(visits.organizationId, orgId)))
			.limit(1);
		if (!visitForDiary) {
			return reply.code(403).send({
				error: "VisitNotInClinic",
				message:
					"Приём не найден в этой клинике — дневник 043/у к нему не привязать. Откройте приём заново из расписания.",
			});
		}
		if (visitForDiary.patientId !== data.patientId) {
			return reply.code(400).send({
				error: "PatientVisitMismatch",
				message:
					"Пациент в запросе не совпадает с карточкой этого приёма. Обновите страницу приёма и сохраните дневник снова.",
			});
		}

		const isSigning = data.status === "signed";

		if (isSigning && !isDoctorOrClinicalSigner(role)) {
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
				/*
				 * DEFECT #73: Form 043/у clinical fields immutable when is_locked.
				 *
				 * БЫЛО: SELECT without FOR UPDATE, then UPDATE by id+org only.
				 * Concurrent POST /lock could commit is_locked=true between the
				 * read and the write; draft save still rewrote anamnesis /
				 * diagnosis / treatment / tray on the already-signed 043/у.
				 * Signing ceremony already uses FOR UPDATE; draft path did not.
				 *
				 * СТАЛО: row lock via FOR UPDATE, re-check isLocked, and UPDATE
				 * WHERE is_locked=false. Zero matched rows → AlreadyLocked.
				 */
				const [existing] = await tx
					.select()
					.from(visitDiaries)
					.where(
						and(
							eq(visitDiaries.visitId, data.visitId),
							eq(visitDiaries.organizationId, orgId),
						),
					)
					.limit(1)
					.for("update");

				if (existing?.isLocked) {
					throw new DiarySigningError(
						"AlreadyLocked",
						"Дневник подписан и заблокирован.",
					);
				}

				let diaryId: string;
				if (existing) {
					/*
					 * АТОМАРНЫЙ ЧАСТИЧНЫЙ UPDATE (DEFECT #MULTI-DEVICE-LWW):
					 * БЫЛО: в .set({...}) безусловно передавались все клинические поля
					 * через `data.X !== undefined ? data.X : existing.X`.
					 * При одновременной работе нескольких устройств (например, врач на планшете
					 * пишет анамнез, а ассистент на десктопе отмечает лоток или статус)
					 * снимок existing одного устройства затирал свежие данные другого.
					 * СТАЛО: в diaryUpdateData попадают ТОЛЬКО поля, переданные в запросе
					 * (data.X !== undefined). Непереданные клинические поля не затрагиваются.
					 */
					const diaryUpdateData: Partial<typeof visitDiaries.$inferInsert> = {
						updatedAt: new Date(),
						draftAuthorId: userId,
					};
					if (!existing.authorId) {
						diaryUpdateData.authorId = userId;
					}
					if (!existing.doctorId) {
						diaryUpdateData.doctorId = userId;
					}
					if (data.anamnesis !== undefined) {
						diaryUpdateData.anamnesis = data.anamnesis;
					}
					if (data.statusLocalis !== undefined) {
						diaryUpdateData.statusLocalis = data.statusLocalis;
					}
					if (data.diagnosisIcd10 !== undefined) {
						diaryUpdateData.diagnosisIcd10 = data.diagnosisIcd10;
					}
					if (data.diagnosisTooth !== undefined) {
						diaryUpdateData.diagnosisTooth = data.diagnosisTooth;
					}
					if (data.treatmentDescription !== undefined) {
						diaryUpdateData.treatmentDescription = data.treatmentDescription;
					}
					if (data.complications !== undefined) {
						diaryUpdateData.complications = data.complications;
					}
					if (data.comorbidities !== undefined) {
						diaryUpdateData.comorbidities = data.comorbidities;
					}
					if (data.instrumentTrayBarcode !== undefined) {
						diaryUpdateData.instrumentTrayBarcode =
							data.instrumentTrayBarcode.trim() || null;
					}

					const updatedRows = await tx
						.update(visitDiaries)
						.set(diaryUpdateData)
						.where(
							and(
								eq(visitDiaries.id, existing.id),
								eq(visitDiaries.organizationId, orgId),
								/* DEFECT #73: never rewrite clinical columns on locked 043/у */
								eq(visitDiaries.isLocked, false),
							),
						)
						.returning({ id: visitDiaries.id });
					if (updatedRows.length === 0) {
						throw new DiarySigningError(
							"AlreadyLocked",
							"Дневник подписан и заблокирован.",
						);
					}
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
							/*
							 * DEFECT #35: progressive fill author/doctor on first draft.
							 * Lock ceremony overwrites with signing user (authoritative).
							 */
							authorId: userId,
							doctorId: userId,
							instrumentTrayBarcode:
								typeof data.instrumentTrayBarcode === "string"
									? data.instrumentTrayBarcode.trim() || null
									: (data.instrumentTrayBarcode ?? null),
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
					/*
					 * Отпечаток содержимого черновика — до подписания.
					 *
					 * БЫЛО: diary_hash писался только в runDiarySigningCeremony (/lock).
					 * POST draft возвращал hash: null. CryptoProSigner подписывает
					 * diaryHash; у неподписанного дневника он всегда null → вкладка
					 * «КриптоПро» навсегда CRYPTO_SIGNING_UNAVAILABLE_TEXT, hasEcp=false
					 * в печати 043/у до lock, а к lock без хеша КриптоПро не доходит.
					 *
					 * СТАЛО: после upsert считаем computeDiaryHash по строке в БД,
					 * пишем diary_hash (замок is_locked не трогаем) и отдаём hash
					 * клиенту — doSave кладёт его в state, окно ЭЦП может подписать.
					 */
					const [savedRow] = await tx
						.select()
						.from(visitDiaries)
						.where(
							and(
								eq(visitDiaries.id, diaryId),
								eq(visitDiaries.organizationId, orgId),
							),
						)
						.limit(1);
					if (!savedRow) {
						return {
							diaryId,
							signing: null as DiarySigningResult | null,
							draftHash: null as string | null,
						};
					}
					const draftHash = computeDiaryHash(
						savedRow.visitId,
						savedRow.patientId ?? "",
						savedRow.anamnesis,
						savedRow.statusLocalis,
						savedRow.treatmentDescription,
						savedRow.diagnosisIcd10,
						savedRow.diagnosisTooth,
						savedRow.complications,
						savedRow.comorbidities,
						savedRow.instrumentTrayBarcode,
					);
					await tx
						.update(visitDiaries)
						.set({ diaryHash: draftHash, updatedAt: new Date() })
						.where(
							and(
								eq(visitDiaries.id, diaryId),
								eq(visitDiaries.organizationId, orgId),
								/* DEFECT #73: draft hash only while unlocked */
								eq(visitDiaries.isLocked, false),
							),
						);
					/*
					 * DEFECT #46: push 043 SOAP → visits EMK on draft save.
					 * Same transaction as diary_hash write so EGISZ/EMK never
					 * see a saved 043 without mirrored clinical fields.
					 */
					await syncVisitEmkFromDiarySoap(tx, {
						visitId: savedRow.visitId,
						organizationId: orgId,
						anamnesis: savedRow.anamnesis,
						statusLocalis: savedRow.statusLocalis,
						diagnosisIcd10: savedRow.diagnosisIcd10,
						diagnosisTooth: savedRow.diagnosisTooth,
						treatmentDescription: savedRow.treatmentDescription,
					});
					return {
						diaryId,
						signing: null as DiarySigningResult | null,
						draftHash,
					};
				}

				/*
				 * PIN:… нельзя класть в crypto_signature_pkcs7 как есть.
				 * Резолв до ceremony; при отказе — throw DiarySigningError-подобный
				 * через отдельный код (ниже catch → 403).
				 */
				const resolvedPost = await resolveSignatureForStorage({
					pkcs7Signature: data.pkcs7Signature ?? null,
					userId,
					organizationId: orgId,
					diaryHashForMark: null,
				});
				if (!resolvedPost.ok) {
					throw new DiarySigningError(
						resolvedPost.code === "PepDoctorForbidden"
							? "PepDoctorForbidden"
							: resolvedPost.code === "PinInvalid" ||
								resolvedPost.code === "PinNotSet" ||
								resolvedPost.code === "PinRequired" ||
								resolvedPost.code === "UserRequired"
								? "PinRejected"
								: "NotFound",
						resolvedPost.message,
					);
				}
				const signing = await runDiarySigningCeremony(tx, {
					diaryId,
					organizationId: orgId,
					userId,
					pkcs7Signature: resolvedPost.stored,
				});
				return {
					diaryId,
					signing,
					draftHash: null as string | null,
				};
			});

			return reply.send({
				success: true,
				id: outcome.diaryId,
				hash: outcome.signing?.hash ?? outcome.draftHash ?? null,
			});
		} catch (err) {
			if (err instanceof DiarySigningError) {
				if (err.code === "AlreadyLocked") {
					return reply
						.code(403)
						.send({ error: "DiaryLocked", message: err.message });
				}
				if (
					err.code === "Icd10Required" ||
					err.code === "Icd10Invalid" ||
					err.code === "ToothRequired" ||
					err.code === "ToothInvalid"
				) {
					return reply
						.code(422)
						.send({ error: err.code, message: err.message });
				}
				if (err.code === "InsufficientStock") {
					return reply
						.code(400)
						.send({ error: "TransactionFailed", message: err.message });
				}
				if (err.code === "PepDoctorForbidden") {
					return reply
						.code(422)
						.send({ error: "PepDoctorForbidden", message: err.message });
				}
				if (err.code === "PinRejected") {
					return reply
						.code(403)
						.send({ error: "PinRejected", message: err.message });
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

	// Legacy endpoint: sync-progress + plan signature (kept for backwards compat)
	app.post("/api/diaries/sync-progress", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "sync progress")))
			return;

		const { patientId } = req.body as { patientId?: string };
		const orgId = await resolveOrganizationId(req);
		if (orgId && patientId) {
			const { treatmentPlans, patients } = await import("../../db/schema.js");
			await db
				.select()
				.from(treatmentPlans)
				.innerJoin(patients, eq(treatmentPlans.patientId, patients.id))
				.where(
					and(
						eq(treatmentPlans.patientId, patientId),
						eq(patients.organizationId, orgId),
					),
				);
		}

		return reply.send({ success: true });
	});

	app.put("/api/treatment-plans/:planId/signature", async (req, reply) => {
		if (!(await requireClinicalMutationAccess(req, reply, "sign plan"))) return;

		const paramsParsed = z
			.object({ planId: z.string().uuid("Идентификатор плана лечения должен быть корректным UUID") })
			.safeParse(req.params);
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор плана лечения.",
				details: paramsParsed.error.issues,
			});
		}
		const { planId } = paramsParsed.data;

		const bodyParsed = z
			.object({ patientSignature: z.string().trim().min(1, "Подпись пациента обязательна") })
			.safeParse(req.body);
		if (!bodyParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Подпись пациента обязательна для сохранения.",
				details: bodyParsed.error.issues,
			});
		}
		const { patientSignature } = bodyParsed.data;

		const orgId = await resolveOrganizationId(req);
		if (!orgId) return reply.code(403).send({ error: "OrgRequired", message: "Не удалось определить клинику. Войдите в кабинет клиники и повторите действие." });

		const { treatmentPlans, patients } = await import("../../db/schema.js");
		const updateResult = await db.transaction(async (tx) => {
			const [plan] = await tx
				.select()
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.id, planId),
						eq(treatmentPlans.organizationId, orgId),
					),
				)
				.for("update")
				.limit(1);
			if (!plan) return { kind: "plan_not_found" as const };

			const [patient] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(
						eq(patients.id, plan.patientId),
						eq(patients.organizationId, orgId),
					),
				)
				.limit(1);
			if (!patient) return { kind: "forbidden" as const };

			await tx
				.update(treatmentPlans)
				.set({ patientSignature, updatedAt: new Date() })
				.where(
					and(
						eq(treatmentPlans.id, planId),
						eq(treatmentPlans.organizationId, orgId),
					),
				);

			return { kind: "ok" as const };
		});

		if (updateResult.kind === "plan_not_found") {
			return reply.code(404).send({ error: "Not found", message: "План лечения не найден. Обновите страницу и выберите существующий план." });
		}
		if (updateResult.kind === "forbidden") {
			return reply.code(403).send({ error: "Forbidden", message: "Нет доступа к плану лечения этого пациента. Выберите план своей клиники." });
		}

		return reply.send({ success: true });
	});

	// Doctor Shifts Persistence (Schedule & Roster sync, Mandates 8e, 8n)
	const getShiftsFilePath = (): string => {
		const dataDir = path.resolve(process.cwd(), ".data");
		if (!fs.existsSync(dataDir)) {
			try {
				fs.mkdirSync(dataDir, { recursive: true });
			} catch (err: unknown) {
				app.log.warn({ err }, "[diaryRoutes] Failed to create .data directory for doctor shifts");
			}
		}
		return path.join(dataDir, "doctor-shifts.json");
	};

	let inMemoryShiftsCache: Array<Record<string, unknown>> = [];

	const handleDoctorShiftsGet = async (
		_req: FastifyRequest,
		reply: FastifyReply,
	) => {
		try {
			const filePath = getShiftsFilePath();
			if (fs.existsSync(filePath)) {
				const content = fs.readFileSync(filePath, "utf-8");
				const parsed = JSON.parse(content);
				if (Array.isArray(parsed)) {
					return reply.send({ ok: true, shifts: parsed });
				}
			}
			return reply.send({ ok: true, shifts: inMemoryShiftsCache });
		} catch {
			return reply.send({ ok: true, shifts: inMemoryShiftsCache });
		}
	};

	const handleDoctorShiftsPost = async (
		req: FastifyRequest,
		reply: FastifyReply,
	) => {
		const parsed = shiftsPayloadSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message:
					"Некорректная структура смен врачей (поле shifts обязательно).",
			});
		}
		const { shifts } = parsed.data;
		inMemoryShiftsCache = shifts as unknown as Array<Record<string, unknown>>;
		try {
			const filePath = getShiftsFilePath();
			fs.writeFileSync(filePath, JSON.stringify(shifts, null, 2), "utf-8");
		} catch (err) {
			req.log.warn(
				{ err },
				"Could not persist doctor-shifts.json to disk; using in-memory cache",
			);
		}
		return reply.send({ ok: true, savedCount: shifts.length });
	};

	app.get("/api/diary/shifts", handleDoctorShiftsGet);
	app.post("/api/diary/shifts", handleDoctorShiftsPost);
}
