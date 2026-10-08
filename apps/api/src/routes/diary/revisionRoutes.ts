import type { FastifyInstance } from "fastify";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	resolveOrganizationId,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { db } from "../../db/client.js";
import {
	sterilizationLogs,
	users,
	visitDiaries,
	visitDiaryRevisions,
} from "../../db/schema.js";
import {
	computeDiaryHash,
	syncVisitEmkFromDiarySoap,
} from "../../services/clinical/DiarySigningCeremonyService.js";
import {
	DIARY_CLINIC_UNKNOWN_REVISE_MESSAGE,
	DIARY_CLINIC_UNKNOWN_REVISIONS_MESSAGE,
	DIARY_NOT_FOUND_REVISE_MESSAGE,
	DIARY_NOT_FOUND_REVISIONS_MESSAGE,
	diaryIdParamsSchema,
	diaryReviseBodySchema,
	isDoctorOrClinicalSigner,
} from "./types.js";

export function registerDiaryRevisionRoutes(app: FastifyInstance): void {
	app.get("/api/diaries/:id/revisions", async (req, reply) => {
		if (!(await requireClinicalReadAccess(req, reply, "read diary revisions")))
			return;
		const parsedIdParams = diaryIdParamsSchema.safeParse(req.params);
		if (!parsedIdParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор дневника в адресе должен быть UUID (id).",
			});
		}
		const { id } = parsedIdParams.data;
		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: DIARY_CLINIC_UNKNOWN_REVISIONS_MESSAGE,
			});

		// 152-ФЗ / 323-ФЗ: Ревизии дневника 043/у содержат врачебную тайну
		const identity = getRequestIdentity(req);
		const staffRole = identity.role ?? req.user?.role ?? null;
		if (staffRole) {
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.diary.read",
					role: staffRole,
					message: `Отказ в доступе к ревизиям дневника 043/у (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}
		}

		// Verify diary belongs to org
		const [diary] = await db
			.select({
				id: visitDiaries.id,
				patientId: visitDiaries.patientId,
				diagnosisIcd10: visitDiaries.diagnosisIcd10,
			})
			.from(visitDiaries)
			.where(
				and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
			);

		if (!diary)
			return reply.code(404).send({
				error: "NotFound",
				message: DIARY_NOT_FOUND_REVISIONS_MESSAGE,
			});

		// 152-ФЗ: Аудит просмотра ревизий и истории изменений дневника 043/у
		await auditMedicalAccessFromRequest(req, {
			organizationId: orgId,
			patientId: diary.patientId ?? "unknown",
			action: "VIEW_DIARY_REVISIONS",
			diagnosis: diary.diagnosisIcd10 ?? "Ревизии дневника 043/у",
		});

		/*
		 * Tenant isolation: organizationId на каждом запросе.
		 * БЫЛО: where только по diaryId — при известном UUID дневника чужой
		 * клиники (или битой строке ревизии с чужим org) forensic-история
		 * 043/у могла уйти не тому арендатору. diaryId уже проверен выше,
		 * orgId в where — второй замок по правилу изоляции.
		 */
		const revisions = await db
			.select()
			.from(visitDiaryRevisions)
			.where(
				and(
					eq(visitDiaryRevisions.diaryId, id),
					eq(visitDiaryRevisions.organizationId, orgId),
				),
			)
			.orderBy(desc(visitDiaryRevisions.revisedAt));

		/*
		 * DEFECT #44: кто правил 043/у — ФИО, не UUID.
		 * БЫЛО: GET …/revisions отдавал revisedByUserId сырым UUID;
		 * клиент Forensic UI показывал только when + reason + previous_*.
		 * Суд/проверка качества не видели, КТО внёс правку после подписи.
		 * СТАЛО: batch-resolve fullName внутри org → revisedByFullName.
		 */
		const reviserIds = Array.from(
			new Set(
				revisions
					.map((r) => r.revisedByUserId)
					.filter(
						(uid): uid is string => typeof uid === "string" && uid.length > 0,
					),
			),
		);
		const reviserNameById = new Map<string, string>();
		if (reviserIds.length > 0) {
			const reviserRows = await db
				.select({ id: users.id, fullName: users.fullName })
				.from(users)
				.where(
					and(inArray(users.id, reviserIds), eq(users.organizationId, orgId)),
				);
			for (const row of reviserRows) {
				const name =
					typeof row.fullName === "string" ? row.fullName.trim() : "";
				if (name) reviserNameById.set(row.id, name);
			}
		}
		const revisionsWithAuthor = revisions.map((r) => {
			const uid =
				typeof r.revisedByUserId === "string" && r.revisedByUserId.length > 0
					? r.revisedByUserId
					: null;
			const revisedByFullName = uid ? (reviserNameById.get(uid) ?? null) : null;
			return { ...r, revisedByFullName };
		});

		return reply.send({ revisions: revisionsWithAuthor });
	});

	app.post("/api/diaries/:id/revise", async (req, reply) => {
		if (
			!(await requireClinicalMutationAccess(req, reply, "revise locked diary"))
		)
			return;
		const parsedIdParams = diaryIdParamsSchema.safeParse(req.params);
		if (!parsedIdParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор дневника в адресе должен быть UUID (id).",
			});
		}
		const { id } = parsedIdParams.data;
		/* Body Zod before role gate (как /lock): non-object → 400, не 403 oracle. */
		const parsedReviseBody = diaryReviseBodySchema.safeParse(req.body ?? {});
		if (!parsedReviseBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Тело запроса ревизии дневника должно быть JSON-объектом.",
			});
		}
		const identity = getRequestIdentity(req);
		const userContext = req.user;
		const userId: string | null = identity.userId ?? userContext?.id ?? null;
		const role: string = identity.role ?? userContext?.role ?? "assistant";

		const isPrivilegedRole = isDoctorOrClinicalSigner(role);

		if (!isPrivilegedRole) {
			return reply.code(403).send({
				error: "DoctorOrClinicalSignerRequired",
				message:
					"Исправить уже подписанный дневник приёма может лечащий врач или администратор клиники. Обратитесь к лечащему врачу или администратору клиники — он внесёт правку с пометкой «Исправленному верить», а прежний текст надёжно сохранится в истории версий.",
			});
		}

		const orgId = await resolveOrganizationId(req);
		if (!orgId)
			return reply.code(403).send({
				error: "OrgRequired",
				message: DIARY_CLINIC_UNKNOWN_REVISE_MESSAGE,
			});

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
			complications:
				typeof parsedReviseBody.data.complications === "string"
					? parsedReviseBody.data.complications
					: undefined,
			comorbidities:
				typeof parsedReviseBody.data.comorbidities === "string"
					? parsedReviseBody.data.comorbidities
					: undefined,
			/*
			 * Лоток: string в теле (в т.ч. "") → переписать; undefined → оставить.
			 * Пустая строка снимает ошибочный barcode с 043/у.
			 */
			instrumentTrayBarcode:
				typeof parsedReviseBody.data.instrumentTrayBarcode === "string"
					? parsedReviseBody.data.instrumentTrayBarcode
					: undefined,
			revisionReason:
				typeof parsedReviseBody.data.revisionReason === "string"
					? parsedReviseBody.data.revisionReason
					: undefined,
		};

		/*
		 * DEFECT #84: admin revise of signed Form 043/у must serialize on the row.
		 * БЫЛО: SELECT outside the transaction (no FOR UPDATE), then tx only
		 * inserted visit_diary_revisions + UPDATE from that stale snapshot.
		 * Two concurrent POST /revise both read previous_*=X, both write
		 * forensic rows with previous=X, both bump version to N+1 — intermediate
		 * SOAP Y is lost from the legal revision chain and diary_hash/version
		 * can collide under READ COMMITTED.
		 * СТАЛО: entire revise ceremony in one transaction: FOR UPDATE, re-check
		 * is_locked, build previous_* + hash + version from the locked row, then
		 * insert revision + UPDATE (same pattern as draft #73 / lock #76 / tray #82).
		 */
		type ReviseTxResult =
			| { kind: "not_found" }
			| { kind: "not_locked" }
			| { kind: "forbidden" }
			| { kind: "invalid_tray" }
			/*
			 * DEFECT #113: zero-row revise UPDATE (locked/version belt lost).
			 * Must not commit a forensic insert without the diary write.
			 */
			| { kind: "update_lost" }
			| { kind: "ok"; hash: string; revisionCount: number };

		const reviseResult: ReviseTxResult = await db.transaction(async (tx) => {
			const [existing] = await tx
				.select()
				.from(visitDiaries)
				.where(
					and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)),
				)
				.for("update");

			if (!existing) return { kind: "not_found" as const };
			if (!existing.isLocked) return { kind: "not_locked" as const };

			const isAuthorized =
				isDoctorOrClinicalSigner(role) ||
				(Boolean(userId) &&
					(existing.doctorId === userId ||
						existing.authorId === userId ||
						existing.lockedByUserId === userId));

			if (!isAuthorized) {
				return { kind: "forbidden" as const };
			}

			/*
			 * Непустой новый barcode — только если журнал стерилизации клиники
			 * подтвердил цикл (тот же критерий, что POST /api/sterilization/link).
			 * Иначе админ мог бы вписать произвольный штрихкод в подписанную 043/у.
			 * Check inside the row lock so tray default uses the locked snapshot.
			 */
			const nextTrayBarcode =
				body.instrumentTrayBarcode !== undefined
					? body.instrumentTrayBarcode.trim()
					: (existing.instrumentTrayBarcode ?? "");
			if (
				body.instrumentTrayBarcode !== undefined &&
				nextTrayBarcode.length > 0
			) {
				const [trayLog] = await tx
					.select({
						id: sterilizationLogs.id,
						status: sterilizationLogs.status,
					})
					.from(sterilizationLogs)
					.where(
						and(
							eq(sterilizationLogs.organizationId, orgId),
							eq(sterilizationLogs.barcode, nextTrayBarcode),
						),
					)
					.orderBy(desc(sterilizationLogs.timestamp))
					.limit(1);
				// Автономия врача и опциональность медсестры:
				// Если лоток не внесён медсестрой в CRM (ведётся бумажный журнал СанПиН
				// или упакован в стороннем ЦСО), не блокируем врача ошибкой invalid_tray —
				// штрихкод сохраняется в 043/у. Отклоняем только при явной отметке о браке/аварии автоклава ('failed').
				if (trayLog && trayLog.status === "failed") {
					return { kind: "invalid_tray" as const };
				}
			}

			const newHash = computeDiaryHash(
				existing.visitId,
				existing.patientId ?? "",
				body.anamnesis ?? existing.anamnesis,
				body.statusLocalis ?? existing.statusLocalis,
				body.treatmentDescription ?? existing.treatmentDescription,
				body.diagnosisIcd10 ?? existing.diagnosisIcd10,
				body.diagnosisTooth ?? existing.diagnosisTooth,
				body.complications ?? existing.complications,
				body.comorbidities ?? existing.comorbidities,
				nextTrayBarcode,
			);

			const priorVersion = existing.version ?? 1;

			/*
			 * DEFECT #113: admin revise UPDATE must prove the row write.
			 *
			 * БЫЛО (#84): FOR UPDATE + UPDATE WHERE is_locked=true, but
			 * visit_diary_revisions INSERT ran BEFORE the UPDATE, and the
			 * UPDATE had no .returning() / row-count check. If the belt
			 * matched zero rows (unlocked between snapshot and write, or
			 * version drift), the transaction still committed an orphan
			 * forensic row while diary SOAP/hash/version stayed old; the
			 * HTTP 200 claimed success with a hash that was never stored.
			 * Lock #76 / draft #73 / re-attach #85 all fail closed on
			 * zero returning rows — revise did not.
			 *
			 * СТАЛО: UPDATE first with .returning() and optimistic
			 * version belt (id+org+is_locked+version). Zero rows →
			 * update_lost (no forensic insert). Only after a proven
			 * diary write do we insert visit_diary_revisions previous_*
			 * from the locked snapshot (existing still holds pre-image).
			 *
			 * PKCS#7 still cleared: old signature must not seal new hash.
			 * is_locked and locked_at stay (re-УКЭП is a separate step).
			 */
			const updatedRows = await tx
				.update(visitDiaries)
				.set({
					anamnesis: body.anamnesis ?? existing.anamnesis,
					statusLocalis: body.statusLocalis ?? existing.statusLocalis,
					diagnosisIcd10: body.diagnosisIcd10 ?? existing.diagnosisIcd10,
					diagnosisTooth: body.diagnosisTooth ?? existing.diagnosisTooth,
					treatmentDescription:
						body.treatmentDescription ?? existing.treatmentDescription,
					complications: body.complications ?? existing.complications,
					comorbidities: body.comorbidities ?? existing.comorbidities,
					instrumentTrayBarcode:
						body.instrumentTrayBarcode !== undefined
							? nextTrayBarcode || null
							: existing.instrumentTrayBarcode,
					diaryHash: newHash,
					cryptoSignaturePkcs7: null,
					version: priorVersion + 1,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(visitDiaries.id, id),
						eq(visitDiaries.organizationId, orgId),
						/* belt: only revise while still locked (Form 043/у signed) */
						eq(visitDiaries.isLocked, true),
						/* DEFECT #113: optimistic version — concurrent revise loses cleanly */
						eq(visitDiaries.version, priorVersion),
					),
				)
				.returning({ id: visitDiaries.id });

			if (updatedRows.length === 0) {
				return { kind: "update_lost" as const };
			}

			/*
			 * Forensic previous_* snapshot from the locked pre-image (existing).
			 * Insert only after UPDATE returned a row so the legal chain never
			 * records a revision that did not change the signed diary.
			 *
			 * previous_diagnosis_tooth + revision_reason (миграция 0116),
			 * complications/comorbidities (0149), instrument tray (0150).
			 */
			await tx.insert(visitDiaryRevisions).values({
				organizationId: orgId,
				diaryId: existing.id,
				previousAnamnesis: existing.anamnesis,
				previousStatusLocalis: existing.statusLocalis,
				previousDiagnosisIcd10: existing.diagnosisIcd10,
				previousDiagnosisTooth: existing.diagnosisTooth,
				previousTreatmentDescription: existing.treatmentDescription,
				previousComplications: existing.complications,
				previousComorbidities: existing.comorbidities,
				previousInstrumentTrayBarcode: existing.instrumentTrayBarcode,
				revisionReason: body.revisionReason,
				revisedByUserId: userId,
			});

			/*
			 * DEFECT #46: admin revise of signed 043 must update EMK/EGISZ source.
			 * Without this, forensic 043 shows new text but CDA still has old visits.*.
			 */
			await syncVisitEmkFromDiarySoap(tx, {
				visitId: existing.visitId,
				organizationId: orgId,
				anamnesis: body.anamnesis ?? existing.anamnesis,
				statusLocalis: body.statusLocalis ?? existing.statusLocalis,
				diagnosisIcd10: body.diagnosisIcd10 ?? existing.diagnosisIcd10,
				diagnosisTooth: body.diagnosisTooth ?? existing.diagnosisTooth,
				treatmentDescription:
					body.treatmentDescription ?? existing.treatmentDescription,
			});

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
			return {
				kind: "ok" as const,
				hash: newHash,
				revisionCount: tally?.total ?? 0,
			};
		});

		if (reviseResult.kind === "not_found") {
			return reply
				.code(404)
				.send({ error: "NotFound", message: DIARY_NOT_FOUND_REVISE_MESSAGE });
		}
		if (reviseResult.kind === "not_locked") {
			return reply.code(409).send({
				error: "NotLocked",
				message: "Дневник не подписан — просто редактируйте его.",
			});
		}
		if (reviseResult.kind === "forbidden") {
			return reply.code(403).send({
				error: "DoctorOrClinicalSignerRequired",
				message:
					"Исправить уже подписанный дневник приёма может лечащий врач или администратор клиники. Обратитесь к лечащему врачу или администратору клиники — он внесёт правку так, что прежний текст останется в истории дневника.",
			});
		}
		if (reviseResult.kind === "invalid_tray") {
			return reply.code(400).send({
				error: "InvalidTrayBarcode",
				message:
					"Лоток отмечен в журнале стерилизации как забракованный (авария или сбой автоклава). Замените лоток на стерильный или очистите поле лотка.",
			});
		}
		if (reviseResult.kind === "update_lost") {
			return reply.code(409).send({
				error: "ReviseConflict",
				message:
					"Исправление подписанного дневника не применилось: запись уже изменилась или снята с подписи. Откройте приём заново и повторите исправление.",
			});
		}

		/*
		 * cryptoSignatureAttached: false — PKCS#7 обнулён вместе с newHash.
		 * Клиент обязан снять hasCryptoSignature, иначе печать 043/у продолжит
		 * показывать штамп «ЭЦП» без оттиска в БД.
		 */
		return reply.send({
			success: true,
			hash: reviseResult.hash,
			revisionCount: reviseResult.revisionCount,
			cryptoSignatureAttached: false,
		});
	});
}
