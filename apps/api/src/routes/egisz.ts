import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../accessGuard.js";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { requireOrganizationId } from "../security/identity.js";
import {
	type EgiszCdaParams,
	generateDentalCdaXml,
} from "../services/egiszCdaGenerator.js";
import { isValidSnils, normalizeSnils } from "../utils/snils.js";

/**
 * POST /api/clinical/egisz/validate-doctor-snils: было bare cast
 * `(request.body || {}) as { snils?: unknown }`.
 * Array body truthy → cast → normalizeSnils may mis-read shape.
 * Zod safeParse после AUTH → 400 ValidationError; InvalidSnils* сохранены.
 */
const validateDoctorSnilsBodySchema = z.object({
	snils: z.unknown().optional(),
});

/**
 * GET /api/egisz/visits/:visitId/cda: было bare cast
 * `request.params as { visitId: string }`.
 * Non-object params or non-UUID visitId → cast still yields a string that
 * hits the DB and returns VisitNotFound (404), masking bad route input.
 * Zod safeParse after AUTH → 400 ValidationError with a clear message;
 * existing 404 VisitNotFound for unknown-but-well-formed ids is unchanged.
 */
const visitCdaParamsSchema = z.object({
	visitId: z.string().uuid(),
});

/**
 * Модуль ЕГИСЗ (ФРМО / ФРМР / РЭМД).
 *
 * ЧТО ЗДЕСЬ ИЗМЕНИЛОСЬ И ПОЧЕМУ
 *
 * 1. `/integration-status` раньше безусловно отдавал
 *    `frmoStatus: "CONNECTED", frmrStatus: "CONNECTED", remdStatus: "READY"` —
 *    строковые литералы. Ни одной переменной окружения для N3.Health в проекте
 *    нет (`grep -i "egisz\|n3\|frmo\|frmr\|remd" .env.example` → пусто), шлюз
 *    никуда не подключён. Экран настроек показывал «подключено» там, где
 *    интеграции не существует, и клиника считала, что документы уходят в
 *    Минздрав. Теперь статус выводится из фактической конфигурации.
 *
 * 2. Проверка СНИЛС сводилась к `length !== 11`. У СНИЛС есть контрольная
 *    сумма (см. utils/snils.ts); без неё в ФРМР уходили опечатки и случай
 *    обслуживания отклонялся уже на стороне Минздрава. Теперь считается
 *    контрольное число.
 *
 * 3. `/api/clinical/custom-examination-form-catalogs` объявлялся и здесь, и в
 *    routes/clinical.ts:85. Fastify падает на старте при дубле пути, из-за чего
 *    этот файл нельзя было зарегистрировать вообще. Каталог форм осмотра к
 *    ЕГИСЗ отношения не имеет — он остался в clinical.ts, отсюда удалён.
 *
 * 4. Появился реальный экспорт СЭМД: services/egiszCdaGenerator.ts генерирует
 *    корректный CDA R2, но его единственным потребителем был собственный тест.
 *    Endpoint `/api/egisz/visits/:visitId/cda` собирает параметры из живых
 *    таблиц и отдаёт документ.
 *
 * ЧЕГО ЗДЕСЬ ПО-ПРЕЖНЕМУ НЕТ (и это не скрывается от клиента):
 * подписи УКЭП над CDA и транспорта в N3.Health/РЭМД. `/integration-status`
 * честно возвращает `NOT_CONFIGURED`, пока не задан шлюз.
 */

interface EgiszGatewayConfig {
	baseUrl: string | null;
	guid: string | null;
	lpuId: string | null;
	frmoId: string | null;
	clinicOid: string | null;
}

function readGatewayConfig(): EgiszGatewayConfig {
	const pick = (name: string) => {
		const raw = process.env[name];
		return raw && raw.trim().length > 0 ? raw.trim() : null;
	};
	return {
		baseUrl: pick("EGISZ_N3_BASE_URL"),
		guid: pick("EGISZ_N3_GUID"),
		lpuId: pick("EGISZ_N3_LPU_ID"),
		frmoId: pick("EGISZ_FRMO_ID"),
		clinicOid: pick("EGISZ_CLINIC_OID"),
	};
}

type ComponentStatus = "CONNECTED" | "NOT_CONFIGURED";

function componentStatus(...required: (string | null)[]): ComponentStatus {
	return required.every((value) => value !== null)
		? "CONNECTED"
		: "NOT_CONFIGURED";
}

export default async function registerEgiszRoutes(app: FastifyInstance) {
	/**
	 * Состояние интеграции. Выводится из конфигурации, а не из литералов.
	 * `configured: false` означает, что отправка в ЕГИСЗ физически невозможна.
	 */
	app.get(
		"/api/clinical/egisz/integration-status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(request, reply, "egisz status check"))
			)
				return;

			const config = readGatewayConfig();
			const frmoStatus = componentStatus(config.frmoId);
			const frmrStatus = componentStatus(config.guid, config.lpuId);
			const remdStatus = componentStatus(
				config.baseUrl,
				config.guid,
				config.lpuId,
			);
			const configured =
				frmoStatus === "CONNECTED" &&
				frmrStatus === "CONNECTED" &&
				remdStatus === "CONNECTED";

			const missing = [
				config.baseUrl === null ? "EGISZ_N3_BASE_URL" : null,
				config.guid === null ? "EGISZ_N3_GUID" : null,
				config.lpuId === null ? "EGISZ_N3_LPU_ID" : null,
				config.frmoId === null ? "EGISZ_FRMO_ID" : null,
				/* DEFECT #67: CDA needs MO OID; surface in status */
				config.clinicOid === null ? "EGISZ_CLINIC_OID" : null,
			].filter((value): value is string => value !== null);

			return reply.status(200).send({
				ok: true,
				configured,
				frmoStatus,
				frmrStatus,
				remdStatus,
				// Транспорт в РЭМД и подпись УКЭП над CDA ещё не реализованы.
				// Клиент должен видеть это, а не «READY».
				capabilities: {
					cdaGeneration: true,
					ukepSigning: false,
					remdTransmission: false,
				},
				missingConfiguration: missing,
				checkedAt: new Date().toISOString(),
			});
		},
	);

	/**
	 * Проверка СНИЛС врача перед регистрацией в ФРМР.
	 */
	app.post(
		"/api/clinical/egisz/validate-doctor-snils",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"egisz snils validation",
				))
			)
				return;

			// No `?? {}`: null/undefined must fail object gate (400 ValidationError),
			// not coerce into empty object and look like a missing snils field.
			const parsedBody = validateDoctorSnilsBodySchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.status(400).send({
					ok: false,
					error: "ValidationError",
					message: "Тело запроса должно быть JSON-объектом с полем snils.",
				});
			}

			const digits = normalizeSnils(parsedBody.data.snils);

			if (digits.length !== 11) {
				return reply.status(400).send({
					ok: false,
					error: "InvalidSnilsFormat",
					message: "СНИЛС должен содержать 11 цифр в формате 000-000-000 00",
				});
			}

			if (!isValidSnils(digits)) {
				return reply.status(400).send({
					ok: false,
					error: "InvalidSnilsChecksum",
					message:
						"Контрольное число СНИЛС не сходится — вероятна опечатка. ФРМР отклонит такой номер.",
				});
			}

			return reply.status(200).send({
				ok: true,
				snilsFormatted: `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)} ${digits.slice(9, 11)}`,
				validForFrmr: true,
			});
		},
	);

	/**
	 * Сопутствующие диагнозы случая обслуживания.
	 * Пустая таблица — это пустой список, а не выдуманные пациенты.
	 */
	app.get(
		"/api/egisz/multiple-diagnoses",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"egisz multiple diagnoses read",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const items = await db
				.select()
				.from(schema.egiszMultipleDiagnoses)
				.where(eq(schema.egiszMultipleDiagnoses.organizationId, orgId));

			return reply.send(items);
		},
	);

	/**
	 * Генерация СЭМД «Протокол стоматологического осмотра» (CDA R2) по приёму.
	 *
	 * Документ НЕ подписывается и НЕ отправляется — эндпоинт отдаёт XML для
	 * выгрузки. Отсутствие подписи явно указано в ответе `/integration-status`.
	 */
	app.get(
		"/api/egisz/visits/:visitId/cda",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(request, reply, "egisz cda export"))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsedParams = visitCdaParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.status(400).send({
					ok: false,
					error: "ValidationError",
					message: "Идентификатор приёма в адресе должен быть UUID (visitId).",
				});
			}
			const { visitId } = parsedParams.data;

			const [row] = await db
				.select({
					visit: schema.visits,
					patient: schema.patients,
					organization: schema.organizations,
				})
				.from(schema.visits)
				.innerJoin(
					schema.patients,
					eq(schema.visits.patientId, schema.patients.id),
				)
				.innerJoin(
					schema.organizations,
					eq(schema.visits.organizationId, schema.organizations.id),
				)
				// Приём ищется вместе с организацией: без этого условия по прямой
				// ссылке читался бы приём чужой клиники.
				.where(
					and(
						eq(schema.visits.id, visitId),
						eq(schema.visits.organizationId, orgId),
					),
				)
				.limit(1);

			if (!row) {
				return reply
					.status(404)
					.send({ error: "VisitNotFound", message: "Приём не найден." });
			}

			/*
			 * DEFECT #46: diagnosis may live only in visit_diaries (043 SOAP).
			 * Load diary before the gate so empty visits.diagnosis is not a hard
			 * stop when the signed 043 already has МКБ.
			 */
			const [diaryRow] = await db
				.select({
					anamnesis: schema.visitDiaries.anamnesis,
					statusLocalis: schema.visitDiaries.statusLocalis,
					diagnosisIcd10: schema.visitDiaries.diagnosisIcd10,
					diagnosisTooth: schema.visitDiaries.diagnosisTooth,
					treatmentDescription: schema.visitDiaries.treatmentDescription,
					/* DEFECT #48: 043 complications/comorbidities → CDA */
					complications: schema.visitDiaries.complications,
					comorbidities: schema.visitDiaries.comorbidities,
					/* DEFECT #57: 043 tray barcode → CDA (printed + diary_hash) */
					instrumentTrayBarcode: schema.visitDiaries.instrumentTrayBarcode,
					doctorId: schema.visitDiaries.doctorId,
					/* DEFECT #63: signer fallback when doctorId empty (pre-#35 locks) */
					lockedByUserId: schema.visitDiaries.lockedByUserId,
					authorId: schema.visitDiaries.authorId,
					/* DEFECT #59: draft 043 must not become EGISZ CDA */
					isLocked: schema.visitDiaries.isLocked,
					/* DEFECT #61: CDA versionNumber after 043 revise */
					version: schema.visitDiaries.version,
					/* DEFECT #72: ClinicalDocument effectiveTime = diary sign time */
					lockedAt: schema.visitDiaries.lockedAt,
				})
				.from(schema.visitDiaries)
				.where(
					and(
						eq(schema.visitDiaries.visitId, visitId),
						eq(schema.visitDiaries.organizationId, orgId),
					),
				)
				.limit(1);

			/*
			 * DEFECT #59: EGISZ CDA must not export unlocked 043 draft SOAP.
			 * БЫЛО: /cda читал visit_diaries без isLocked — черновик с неполным
			 * диагнозом/лечением уходил в XML как «протокол осмотра», хотя врач
			 * ещё не подписал карту (lock). РЭМД/архив получали нефинальный текст.
			 * СТАЛО: при наличии строки 043 требуем isLocked=true (подпись/замок).
			 * Визиты без дневника по-прежнему могут собрать CDA из EMK visits.*.
			 */
			if (diaryRow && diaryRow.isLocked !== true) {
				return reply.status(422).send({
					error: "DiaryNotLocked",
					message:
						"Для выгрузки в ЕГИСЗ дневник 043/у должен быть подписан (заблокирован). Сохраните и подпишите карту, затем повторите выгрузку.",
				});
			}

			const diaryDiagnosisParts: string[] = [];
			const diaryIcd =
				typeof diaryRow?.diagnosisIcd10 === "string"
					? diaryRow.diagnosisIcd10.trim()
					: "";
			const diaryTooth =
				typeof diaryRow?.diagnosisTooth === "string"
					? diaryRow.diagnosisTooth.trim()
					: "";
			if (diaryIcd) diaryDiagnosisParts.push(diaryIcd);
			if (diaryTooth) diaryDiagnosisParts.push(`Зуб ${diaryTooth}`);
			const diaryDiagnosisText = diaryDiagnosisParts.join(" | ");

			/*
			 * DEFECT #51/#52: diagnosis priority — 043 diary when it has МКБ.
			 * #51: visits.diagnosis must not override signed 043 diagnosisIcd10.
			 * #52: tooth-only 043 (diagnosisTooth, empty diagnosisIcd10) must NOT
			 * hide EMK text that still carries МКБ — otherwise CDA LOINC 29548-5
			 * becomes «Зуб 36» with empty CD@code while visits.diagnosis had K02.1.
			 * СТАЛО: diary wins only if diagnosisIcd10 present; else EMK, then
			 * tooth-only diary as last resort.
			 */
			const visitDiagnosis =
				typeof row.visit.diagnosis === "string" && row.visit.diagnosis.trim()
					? row.visit.diagnosis.trim()
					: "";
			const effectiveDiagnosis = diaryIcd
				? diaryDiagnosisText
				: visitDiagnosis || diaryDiagnosisText;

			if (!effectiveDiagnosis) {
				return reply.status(422).send({
					error: "DiagnosisRequired",
					message:
						"Для выгрузки в ЕГИСЗ у случая обслуживания должен быть заполнен диагноз.",
				});
			}

			// Врач приёма определяется через связанную запись расписания.
			let doctorName: { first: string; last: string; middle?: string } = {
				first: "",
				last: "Не указан",
			};
			/* DEFECT #58: specialty for CDA assignedAuthor — was never loaded */
			let doctorPosition: string | undefined;
			/* Real physician contact (users.phone/email) resolved alongside the
			 * signer user row; generator emits nullFlavor only when absent. */
			let doctorContact:
				| { phone?: string | null; email?: string | null }
				| undefined;
			/*
			 * DEFECT #56: CDA documentationOf/serviceEvent must use encounter time.
			 * БЫЛО: visitDate: row.visit.createdAt — момент создания строки EMK
			 * (часто день записи/черновика), а не дата приёма в расписании.
			 * После #55 РЭМД получил documentationOf, но с неверной датой случая.
			 * СТАЛО: appointments.startsAt (slot) when linked; else createdAt.
			 */
			let encounterDate: Date = row.visit.createdAt;
			if (row.visit.appointmentId) {
				const [appointment] = await db
					.select({
						doctorUserId: schema.appointments.doctorUserId,
						startsAt: schema.appointments.startsAt,
					})
					.from(schema.appointments)
					.where(
						and(
							eq(schema.appointments.id, row.visit.appointmentId),
							eq(schema.appointments.organizationId, orgId),
						),
					)
					.limit(1);
				if (appointment?.startsAt instanceof Date) {
					encounterDate = appointment.startsAt;
				} else if (
					appointment?.startsAt &&
					typeof appointment.startsAt === "string"
				) {
					const parsed = new Date(appointment.startsAt);
					if (!Number.isNaN(parsed.getTime())) encounterDate = parsed;
				}
				if (appointment?.doctorUserId) {
					const [doctor] = await db
						.select({
							fullName: schema.users.fullName,
							specialties: schema.users.specialties,
							phone: schema.users.phone,
							email: schema.users.email,
						})
						.from(schema.users)
						.where(
							and(
								eq(schema.users.id, appointment.doctorUserId),
								eq(schema.users.organizationId, orgId),
							),
						)
						.limit(1);
					if (doctor) {
						doctorName = splitFullName(doctor.fullName);
						const pos = formatDoctorSpecialtyLabelForCda(doctor.specialties);
						if (pos) doctorPosition = pos;
						doctorContact = { phone: doctor.phone, email: doctor.email };
					}
				}
			}

			const clinicOid = readGatewayConfig().clinicOid;
			/*
			 * DEFECT #67: EGISZ/REMD CDA must carry real MO OID (EGISZ_CLINIC_OID).
			 * БЫЛО: clinicOid optional — generator fell back to generic
			 * 1.2.643.5.1.13.13.12.2 and custodian extension="" when env unset.
			 * XML looked valid but was not attributable to the clinic in РЭМД.
			 * СТАЛО: 422 ClinicOidRequired until EGISZ_CLINIC_OID is configured.
			 */
			if (!clinicOid) {
				return reply.status(422).send({
					error: "ClinicOidRequired",
					message:
						"Для выгрузки в ЕГИСЗ задайте OID медицинской организации (переменная EGISZ_CLINIC_OID).",
				});
			}
			/*
			 * DEFECT #46: prefer 043 diary SOAP over visits EMK when diary has text.
			 * Write-path sync fills visits.*, but already-signed diaries created
			 * before the fix still need a correct CDA on export.
			 */
			/*
			 * DEFECT #50: visits.complaint is the EMK "жалобы" field and is merged
			 * into diary S-block on the web (soapPrefillFromVisitNote), but CDA only
			 * read diary.anamnesis || visit.anamnesis — so a visit with complaint and
			 * empty diary anamnesis exported blank LOINC 10164-2. Mirror UI merge:
			 * complaint + anamnesis (deduped), diary text still wins when present.
			 */
			const diaryAnamnesis =
				typeof diaryRow?.anamnesis === "string"
					? diaryRow.anamnesis.trim()
					: "";
			const visitAnamnesis =
				typeof row.visit.anamnesis === "string"
					? row.visit.anamnesis.trim()
					: "";
			const visitComplaint =
				typeof row.visit.complaint === "string"
					? row.visit.complaint.trim()
					: "";
			const visitSParts: string[] = [];
			if (visitComplaint) visitSParts.push(visitComplaint);
			if (visitAnamnesis && visitAnamnesis !== visitComplaint) {
				visitSParts.push(visitAnamnesis);
			}
			const visitSBlock = visitSParts.join("\n");
			const anamnesis = diaryAnamnesis || visitSBlock;

			const diaryTreatment =
				typeof diaryRow?.treatmentDescription === "string"
					? diaryRow.treatmentDescription.trim()
					: "";
			const visitTreatment =
				typeof row.visit.treatmentPlan === "string"
					? row.visit.treatmentPlan.trim()
					: "";
			const treatmentPlan = diaryTreatment || visitTreatment;

			/*
			 * DEFECT #47: O-block was never exported to EGISZ CDA.
			 * Prefer 043 statusLocalis over visits.objectiveStatus (same as S/P).
			 */
			const diaryObjective =
				typeof diaryRow?.statusLocalis === "string"
					? diaryRow.statusLocalis.trim()
					: "";
			const visitObjective =
				typeof row.visit.objectiveStatus === "string"
					? row.visit.objectiveStatus.trim()
					: "";
			const objectiveStatus = diaryObjective || visitObjective;

			/*
			 * DEFECT #48: complications/comorbidities live only on visit_diaries
			 * (no EMK twin on visits). Without this, signed 043 text never
			 * reaches EGISZ CDA.
			 */
			const complications =
				typeof diaryRow?.complications === "string"
					? diaryRow.complications.trim()
					: "";
			const comorbidities =
				typeof diaryRow?.comorbidities === "string"
					? diaryRow.comorbidities.trim()
					: "";
			/*
			 * DEFECT #57: instrument tray is on visit_diaries only (print 043 + hash).
			 * Without export, signed sterilization link never reaches EGISZ CDA.
			 */
			const instrumentTrayBarcode =
				typeof diaryRow?.instrumentTrayBarcode === "string"
					? diaryRow.instrumentTrayBarcode.trim()
					: "";
			/*
			 * DEFECT #74: diagnosis_tooth is on visit_diaries (043 SOAP + diary_hash).
			 * Without export, signed tooth number never reaches EGISZ CDA diagnosis.
			 */
			const diagnosisTooth =
				typeof diaryRow?.diagnosisTooth === "string"
					? diaryRow.diagnosisTooth.trim()
					: "";

			// Врач 043 (doctorId) приоритетнее appointment.doctorUserId — это кто вёл карту.
			if (diaryRow?.doctorId) {
				const [diaryDoctor] = await db
					.select({
						fullName: schema.users.fullName,
						specialties: schema.users.specialties,
						phone: schema.users.phone,
						email: schema.users.email,
					})
					.from(schema.users)
					.where(
						and(
							eq(schema.users.id, diaryRow.doctorId),
							eq(schema.users.organizationId, orgId),
						),
					)
					.limit(1);
				if (diaryDoctor?.fullName) {
					doctorName = splitFullName(diaryDoctor.fullName);
					const pos = formatDoctorSpecialtyLabelForCda(diaryDoctor.specialties);
					if (pos) doctorPosition = pos;
					doctorContact = {
						phone: diaryDoctor.phone,
						email: diaryDoctor.email,
					};
				}
			}

			/*
			 * DEFECT #63: CDA assignedAuthor must not be «Не указан».
			 * БЫЛО: author = appointment.doctorUserId, then diary.doctorId only.
			 * Diaries locked before #35 (or without appointment link) could have
			 * lockedByUserId/authorId set but doctorId null → CDA exported with
			 * <family>Не указан</family> and empty given — РЭМД rejects / wrong
			 * legal author on the protocol.
			 * СТАЛО: fallback lockedByUserId → authorId; 422 DoctorRequired if
			 * still unresolved.
			 */
			const doctorStillUnset =
				!doctorName.last || doctorName.last === "Не указан";
			if (doctorStillUnset && diaryRow) {
				const fallbackIds = [diaryRow.lockedByUserId, diaryRow.authorId].filter(
					(id): id is string => typeof id === "string" && id.trim().length > 0,
				);
				if (fallbackIds.length > 0) {
					const fallbackUsers = await db
						.select({
							id: schema.users.id,
							fullName: schema.users.fullName,
							specialties: schema.users.specialties,
							phone: schema.users.phone,
							email: schema.users.email,
						})
						.from(schema.users)
						.where(
							and(
								inArray(schema.users.id, fallbackIds),
								eq(schema.users.organizationId, orgId),
							),
						);

					for (const uid of fallbackIds) {
						const u = fallbackUsers.find((fu) => fu.id === uid);
						if (u?.fullName && u.fullName.trim()) {
							doctorName = splitFullName(u.fullName);
							const pos = formatDoctorSpecialtyLabelForCda(u.specialties);
							if (pos) doctorPosition = pos;
							doctorContact = { phone: u.phone, email: u.email };
							break;
						}
					}
				}
			}

			if (!doctorName.last || doctorName.last === "Не указан") {
				return reply.status(422).send({
					error: "DoctorRequired",
					message:
						"Для выгрузки в ЕГИСЗ должен быть указан врач приёма (в расписании или в подписанном дневнике 043/у).",
				});
			}

			/*
			 * DEFECT #60: patient SNILS is mandatory for EGISZ/REMD CDA.
			 * БЫЛО: readSnilsFromProfile could return "" and CDA still went out with
			 * <id root="1.2.643.100.3" extension=""/> — РЭМД/ФРМР reject empty SNILS
			 * after clinic already thought the protocol was exported.
			 * СТАЛО: 422 PatientSnilsRequired when profile has no valid 11-digit SNILS
			 * (checksum checked via isValidSnils when length is 11).
			 */
			const patientSnilsDigits = readSnilsFromProfile(
				row.patient.administrativeProfile,
			);
			if (
				patientSnilsDigits.length !== 11 ||
				!isValidSnils(patientSnilsDigits)
			) {
				return reply.status(422).send({
					error: "PatientSnilsRequired",
					message:
						"Для выгрузки в ЕГИСЗ у пациента должен быть указан корректный СНИЛС в административной карточке.",
				});
			}

			/*
			 * DEFECT #62: empty МКБ-10 must not reach EGISZ/REMD CDA.
			 * БЫЛО: DiagnosisRequired only checked free-text presence; icd10Code =
			 * diaryIcd || extractIcd10(effectiveDiagnosis) could stay "" when EMK/043
			 * diagnosis is prose without a code (or tooth-only). CDA still emitted
			 * <value xsi:type="CD" code="" .../> — РЭМД rejects empty codeSystem value
			 * after the clinic already downloaded the protocol.
			 * СТАЛО: 422 Icd10Required when no extractable/signed ICD-10 code.
			 */
			const resolvedIcd10 = diaryIcd || extractIcd10(effectiveDiagnosis);
			if (!resolvedIcd10) {
				return reply.status(422).send({
					error: "Icd10Required",
					message:
						"Для выгрузки в ЕГИСЗ у диагноза должен быть указан код МКБ-10 (в дневнике 043/у или в тексте диагноза EMK).",
				});
			}

			/*
			 * DEFECT #64: fake birthTime 19000101 must not reach EGISZ/REMD CDA.
			 * БЫЛО: generateDentalCdaXml substituted "19000101" when patientBirthDate
			 * was null — identity mismatch with ФРМР/РЭМД (SNILS + DOB) and silent
			 * acceptance of incomplete patient cards as if DOB were known.
			 * СТАЛО: 422 PatientBirthDateRequired when birthDate missing/invalid.
			 */
			const rawBirth = row.patient.birthDate;
			const birthStr = typeof rawBirth === "string" ? rawBirth.trim() : "";
			const birthParsed = birthStr ? new Date(birthStr) : null;
			if (!birthStr || !birthParsed || Number.isNaN(birthParsed.getTime())) {
				return reply.status(422).send({
					error: "PatientBirthDateRequired",
					message:
						"Для выгрузки в ЕГИСЗ у пациента должна быть указана дата рождения.",
				});
			}

			/*
			 * DEFECT #68: patient gender must be male/female for EGISZ/REMD CDA.
			 * БЫЛО: readGenderFromProfile could return null; generator mapped
			 * null/other → administrativeGenderCode code="0". РЭМД/identity
			 * match with SNILS+DOB rejects unknown sex; clinic already had XML.
			 * СТАЛО: 422 PatientGenderRequired when profile has no male/female.
			 */
			const patientGender = readGenderFromProfile(
				row.patient.administrativeProfile,
			);
			if (patientGender !== "male" && patientGender !== "female") {
				return reply.status(422).send({
					error: "PatientGenderRequired",
					message:
						"Для выгрузки в ЕГИСЗ у пациента должен быть указан пол (мужской или женский) в административной карточке.",
				});
			}

			/*
			 * DEFECT #70: empty patient name must not reach EGISZ/REMD CDA.
			 * БЫЛО: patientName: splitFullName(row.patient.fullName) without gate.
			 * fullName is NOT NULL but can be "" / whitespace — split → last:"",
			 * first:"" → <family/><given/>. РЭМД/identity match with SNILS rejects
			 * empty name after clinic already downloaded the protocol.
			 * СТАЛО: 422 PatientNameRequired when trimmed fullName empty or last empty.
			 */
			const patientFullNameRaw =
				typeof row.patient.fullName === "string" ? row.patient.fullName : "";
			const patientNameParts = splitFullName(patientFullNameRaw);
			if (!patientFullNameRaw.trim() || !patientNameParts.last.trim()) {
				return reply.status(422).send({
					error: "PatientNameRequired",
					message:
						"Для выгрузки в ЕГИСЗ у пациента должно быть указано ФИО в карточке.",
				});
			}

			/*
			 * DEFECT #71: empty clinic name must not reach EGISZ/REMD CDA.
			 * БЫЛО: clinicName: row.organization.name without trim/gate.
			 * organizations.name is NOT NULL but can be "" / whitespace —
			 * custodian <name></name> and author representedOrganization blank.
			 * РЭМД rejects unattributable MO name after clinic downloaded XML.
			 * СТАЛО: 422 ClinicNameRequired when trimmed name empty.
			 */
			const [clinicRow] = await db
				.select({
					address: schema.clinics.address,
					phone: schema.clinics.phone,
				})
				.from(schema.clinics)
				.where(eq(schema.clinics.organizationId, orgId))
				.limit(1);
			const clinicNameRaw =
				typeof row.organization.name === "string" ? row.organization.name : "";
			const clinicName = clinicNameRaw.trim();
			if (!clinicName) {
				return reply.status(422).send({
					error: "ClinicNameRequired",
					message:
						"Для выгрузки в ЕГИСЗ у медицинской организации должно быть указано наименование.",
				});
			}

			/*
			 * Real contact model wiring (see HAMMER MANDATE — no nullFlavor spam):
			 * pull patient / clinic (MO) / doctor contact from the DB where it
			 * exists; the generator falls back to nullFlavor ONLY when absent.
			 * We never invent an address, phone, or email here.
			 */
			const patientContact = row.patient.administrativeProfile
				? (row.patient.administrativeProfile as {
						residentialAddress?: string | null;
						registrationAddress?: string | null;
					})
				: undefined;
			const patientPhone =
				typeof row.patient.phone === "string" ? row.patient.phone : undefined;
			const patientEmail =
				typeof row.patient.email === "string" ? row.patient.email : undefined;
			const patientAddress =
				patientContact?.residentialAddress ||
				patientContact?.registrationAddress ||
				undefined;

			const clinicPhone =
				typeof clinicRow?.phone === "string" ? clinicRow.phone : undefined;
			const clinicAddress =
				typeof clinicRow?.address === "string" ? clinicRow.address : undefined;
			const clinicEmail =
				typeof row.organization.email === "string"
					? row.organization.email
					: undefined;
			const clinicLegalAddress =
				typeof row.organization.legalAddress === "string"
					? row.organization.legalAddress
					: undefined;

			/*
			 * The physician's own contact comes from the same user row resolved
			 * for the CDA signer/author above (users.phone / users.email).
			 */
			const doctorPhone =
				typeof doctorContact?.phone === "string"
					? doctorContact.phone
					: undefined;
			const doctorEmail =
				typeof doctorContact?.email === "string"
					? doctorContact.email
					: undefined;

			const params: EgiszCdaParams = {
				patientId: row.patient.id,
				patientName: patientNameParts,
				// СНИЛС пациента живёт в административном профиле (jsonb).
				patientSnils: patientSnilsDigits,
				patientBirthDate: birthStr,
				patientGender,
				/*
				 * Real patient contact (patients.phone/email + administrativeProfile
				 * residential/registration address). Generator emits nullFlavor
				 * only when the chart has none of these.
				 */
				...(patientPhone ? { patientPhone } : {}),
				...(patientEmail ? { patientEmail } : {}),
				...(patientAddress ? { patientAddress } : {}),
				clinicName,
				/*
				 * Real MO contact (clinics.address/phone + organizations.email).
				 * Generator emits nullFlavor only when the DB has none.
				 */
				...(clinicAddress ? { clinicAddress } : {}),
				...(clinicPhone ? { clinicPhone } : {}),
				...(clinicEmail ? { clinicEmail } : {}),
				...(clinicLegalAddress ? { clinicLegalAddress } : {}),
				doctorName,
				/*
				 * Real physician contact (users.phone/email). Doctor has no
				 * address column, so only telecom is wired.
				 */
				...(doctorPhone ? { doctorPhone } : {}),
				...(doctorEmail ? { doctorEmail } : {}),
				...(doctorPosition ? { doctorPosition } : {}),
				icd10Code: resolvedIcd10,
				diagnosisText: effectiveDiagnosis,
				visitDate: encounterDate,
				/*
				 * DEFECT #89: ClinicalDocument/id must be unique per diary version.
				 * БЫЛО (#88): documentId === visit.id === documentSetId — setId
				 * was stable but id never changed across revise, so REMD saw
				 * versionNumber=2 with the same ClinicalDocument/id as v1
				 * (HL7 CDA R2 requires id unique within the set; setId stable).
				 * СТАЛО: documentId = "{visitId}-v{N}" when diary.version known;
				 * without diary fall back to visit.id (EMK-only export, v1).
				 * documentSetId stays visit.id (DEFECT #88). encounterId stays
				 * visit.id (DEFECT #87).
				 */
				documentId: (() => {
					const ver =
						typeof diaryRow?.version === "number" &&
						Number.isFinite(diaryRow.version) &&
						diaryRow.version >= 1
							? Math.floor(diaryRow.version)
							: null;
					return ver != null ? `${row.visit.id}-v${ver}` : row.visit.id;
				})(),
				/*
				 * DEFECT #87: encompassingEncounter extension = visit id.
				 * БЫЛО (#86): generator reused documentId for encounter id —
				 * ClinicalDocument/id and componentOf/id were the same key.
				 * REMD cannot join SEMD to visits as a separate encounter when
				 * documentId later becomes diary/export UUID.
				 * СТАЛО: pass visit.id explicitly as encounterId (generator
				 * falls back to documentId only if encounterId omitted).
				 */
				encounterId: row.visit.id,
				/*
				 * DEFECT #88: ClinicalDocument/setId = stable document SET key.
				 * БЫЛО: generator setId.extension === documentId (same as
				 * ClinicalDocument/id). After diary revise, versionNumber bumps
				 * but setId still equaled id — HL7/REMD cannot link version N
				 * to version 1 as one document set.
				 * СТАЛО: documentSetId = visit.id (stable across revise);
				 * documentId is versioned instance id (DEFECT #89).
				 */
				documentSetId: row.visit.id,

				/* DEFECT #61: revised 043 must not re-export as version 1 */

				...(typeof diaryRow?.version === "number" &&
				Number.isFinite(diaryRow.version) &&
				diaryRow.version >= 1
					? { documentVersion: Math.floor(diaryRow.version) }
					: {}),
				/*
				 * DEFECT #90: relatedDocument RPLC → prior ClinicalDocument/id.
				 * БЫЛО: versionNumber + setId/id (#61/#88/#89) without RPLC
				 * pointer — REMD saw v2 with no link to which document it
				 * replaces. СТАЛО: when diary.version >= 2, point at
				 * "{visitId}-v{N-1}" (same scheme as DEFECT #89 documentId).
				 * v1 / EMK-only: omit replacesDocumentId (no relatedDocument).
				 */
				...(typeof diaryRow?.version === "number" &&
				Number.isFinite(diaryRow.version) &&
				diaryRow.version >= 2
					? {
							replacesDocumentId: `${row.visit.id}-v${Math.floor(diaryRow.version) - 1}`,
						}
					: {}),

				/*
				 * DEFECT #72: ClinicalDocument + author effectiveTime = diary sign.
				 * БЫЛО: generator always used wall-clock "now" on each CDA download —
				 * re-export weeks after sign rewrote effectiveTime away from
				 * visit_diaries.locked_at and Form 043/у stamp.
				 * СТАЛО: pass lockedAt as documentTime when present/valid.
				 */
				...((): { documentTime?: Date } => {
					const raw = diaryRow?.lockedAt as Date | string | null | undefined;
					if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
						return { documentTime: raw };
					}
					if (typeof raw === "string" && raw.trim()) {
						const parsed = new Date(raw);
						if (!Number.isNaN(parsed.getTime())) {
							return { documentTime: parsed };
						}
					}
					return {};
				})(),
				clinicOid,
				...(anamnesis ? { anamnesis } : {}),
				...(objectiveStatus ? { objectiveStatus } : {}),
				...(complications ? { complications } : {}),
				...(comorbidities ? { comorbidities } : {}),
				...(instrumentTrayBarcode ? { instrumentTrayBarcode } : {}),
				/* DEFECT #74: ISO 3950 tooth → CDA diagnosis targetSiteCode */
				...(diagnosisTooth ? { diagnosisTooth } : {}),
				...(treatmentPlan ? { treatmentDescription: treatmentPlan } : {}),
			};
			const cdaResult = generateDentalCdaXml(params);
			if (!cdaResult.success) {
				console.error(
					"[egisz] generateDentalCdaXml safeParse failed:",
					cdaResult.error,
				);
				return reply.status(422).send({
					error: "CdaGenerationFailed",
					message: "Внутренняя ошибка генерации документа (ошибка схемы CDA).",
					details: cdaResult.error.issues,
				});
			}
			const xml = cdaResult.xml;
			/*
			 * JJ1: forensic trail for CDA export into tenant-scoped egisz_logs.
			 * BYLO: successful GET .../cda returned XML only — zero insert call sites
			 * for egisz_logs, so the clinic journal never recorded an export attempt.
			 * STALO: after generate, insert Pending row with organizationId +
			 * patientId + visitId. Soft-fail: export XML is primary; log failure must
			 * not block the download (column may be missing until 0145 applied).
			 */
			try {
				await db.insert(schema.egiszLogs).values({
					organizationId: orgId,
					patientId: row.patient.id,
					visitId: row.visit.id,
					status: "Pending",
				});
			} catch (logErr) {
				const detail =
					logErr instanceof Error ? logErr.message : String(logErr);
				console.error(
					"[egisz] failed to write egisz_logs on CDA export:",
					detail,
				);
			}
			return reply
				.header("content-type", "application/xml; charset=utf-8")
				.header(
					"content-disposition",
					`attachment; filename="cda-${row.visit.id}.xml"`,
				)
				.status(200)
				.send(xml);
		},
	);

	/**
	 * POST /api/egisz/send — инициирует выгрузку визита в ЕГИСЗ.
	 *
	 * Фронтенд: EgiszMonitor.tsx:164. Контракт из contract-breach-proofs.test.ts.
	 * Реальная интеграция с РЭМД ещё не реализована — маршрут создаёт запись
	 * в журнале egisz_logs со статусом Pending и возвращает её id.
	 */
	const egiszSendBodySchema = z.object({
		patientId: z.string().uuid(),
		visitId: z.string().uuid(),
	});

	app.post(
		"/api/egisz/send",
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				if (!(await requireClinicalReadAccess(request, reply, "egisz send")))
					return;
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return;

				const parsed = egiszSendBodySchema.safeParse(request.body);
				if (!parsed.success) {
					return reply.status(400).send({
						error: "ValidationError",
						message: parsed.error.issues.map((i) => i.message).join("; "),
					});
				}

				const [logEntry] = await db
					.insert(schema.egiszLogs)
					.values({
						organizationId: orgId,
						patientId: parsed.data.patientId,
						visitId: parsed.data.visitId,
						status: "Pending",
					})
					.returning({
						id: schema.egiszLogs.id,
						status: schema.egiszLogs.status,
					});

				if (!logEntry) {
					return reply.status(500).send({
						error: "InternalServerError",
						message: "Не удалось создать запись в журнале ЕГИСЗ",
					});
				}

				return reply.status(202).send({
					ok: true,
					logId: logEntry.id,
					status: logEntry.status,
					message:
						"Выгрузка поставлена в очередь. Статус обновится автоматически.",
				});
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при постановке выгрузки в очередь",
				});
			}
		},
	);

	/**
	 * GET /api/integrations/egisz-blank-permissions — список разрешений на бланки.
	 *
	 * Фронтенд: EgiszBlankPermissionsWidget.tsx:105.
	 * Контракт из contract-breach-proofs.test.ts.
	 */
	app.get(
		"/api/integrations/egisz-blank-permissions",
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				if (
					!(await requireClinicalReadAccess(
						request,
						reply,
						"egisz blank permissions",
					))
				)
					return;
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return;

				const rows = await db
					.select()
					.from(schema.egiszBlankPermissions)
					.where(eq(schema.egiszBlankPermissions.organizationId, orgId));

				return reply.status(200).send({ permissions: rows });
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Не удалось получить разрешения на бланки ЕГИСЗ",
				});
			}
		},
	);
}

/**
 * DEFECT #58: RU specialty label for CDA assignedAuthor (mirrors diary #41).
 * users.specialties jsonb string[]; prefer non-universal codes.
 */
const EGISZ_DENTAL_SPECIALTY_LABELS: Record<string, string> = {
	therapist: "врач-стоматолог-терапевт",
	orthopedist: "врач-стоматолог-ортопед",
	surgeon: "врач-стоматолог-хирург",
	orthodontist: "врач-стоматолог-ортодонт",
	periodontist: "врач-стоматолог-пародонтолог",
	hygienist: "гигиенист стоматологический",
	pediatric: "детский стоматолог",
	implantologist: "врач-стоматолог-хирург (имплантология)",
	radiologist: "врач-рентгенолог",
	universal: "врач-стоматолог",
};

function formatDoctorSpecialtyLabelForCda(raw: unknown): string | null {
	const codes: string[] = Array.isArray(raw)
		? raw.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)
		: typeof raw === "string" && raw.trim()
			? [raw.trim()]
			: [];
	if (codes.length === 0) return null;
	const meaningful = codes.filter((c) => c !== "universal");
	const list = meaningful.length > 0 ? meaningful : codes;
	const labels = list.map((c) => EGISZ_DENTAL_SPECIALTY_LABELS[c] ?? c);
	const joined = labels.join(", ").trim();
	return joined.length > 0 ? joined : null;
}

/** «Иванов Иван Иванович» → { last, first, middle }. */
function splitFullName(fullName: string): {
	first: string;
	last: string;
	middle?: string;
} {
	const parts = fullName.trim().split(/\s+/);
	const middle = parts[2];
	// exactOptionalPropertyTypes: ключ либо есть со значением string, либо
	// отсутствует. Присвоить ему undefined нельзя.
	return {
		last: parts[0] ?? "",
		first: parts[1] ?? "",
		...(middle ? { middle } : {}),
	};
}

function readSnilsFromProfile(profile: unknown): string {
	if (profile && typeof profile === "object" && "snils" in profile) {
		const value = (profile as { snils?: unknown }).snils;
		if (typeof value === "string") return normalizeSnils(value);
	}
	return "";
}

function readGenderFromProfile(
	profile: unknown,
): "male" | "female" | "other" | null {
	if (profile && typeof profile === "object" && "gender" in profile) {
		const value = (profile as { gender?: unknown }).gender;
		if (value === "male" || value === "female" || value === "other")
			return value;
	}
	return null;
}

/**
 * Достаёт код МКБ-10 из текста диагноза («K02.1 Кариес дентина» → «K02.1»).
 * Если кода нет, возвращается пустая строка — CDA соберётся, но Минздрав его
 * отклонит, и это лучше молчаливой подстановки произвольного кода.
 *
 * DEFECT #54: was case-sensitive [A-ZА-Я] and only \d{1,2} after the dot.
 * EMK free-text often has «k02.1 …» or extended subcodes (K05.31). Empty
 * extract left CDA CD@code blank while diagnosisText still showed the line —
 * РЭМД rejects empty codeSystem value. Align with web icd10CodeFromDiagnosisText:
 * case-insensitive, A–T/V–Z (not U), up to 4 fraction digits, uppercase result.
 */
function extractIcd10(diagnosis: string): string {
	const trimmed = diagnosis.trim();
	if (!trimmed) return "";
	const match = trimmed.match(/\b([A-TV-Za-tv-z]\d{2}(?:\.\d{1,4})?)\b/);
	return match?.[1] ? match[1].toUpperCase() : "";
}
