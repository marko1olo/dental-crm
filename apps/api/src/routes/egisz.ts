import { and, eq } from "drizzle-orm";
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
	return required.every((value) => value !== null) ? "CONNECTED" : "NOT_CONFIGURED";
}

export default async function registerEgiszRoutes(app: FastifyInstance) {
	/**
	 * Состояние интеграции. Выводится из конфигурации, а не из литералов.
	 * `configured: false` означает, что отправка в ЕГИСЗ физически невозможна.
	 */
	app.get(
		"/api/clinical/egisz/integration-status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz status check")))
				return;

			const config = readGatewayConfig();
			const frmoStatus = componentStatus(config.frmoId);
			const frmrStatus = componentStatus(config.guid, config.lpuId);
			const remdStatus = componentStatus(config.baseUrl, config.guid, config.lpuId);
			const configured =
				frmoStatus === "CONNECTED" &&
				frmrStatus === "CONNECTED" &&
				remdStatus === "CONNECTED";

			const missing = [
				config.baseUrl === null ? "EGISZ_N3_BASE_URL" : null,
				config.guid === null ? "EGISZ_N3_GUID" : null,
				config.lpuId === null ? "EGISZ_N3_LPU_ID" : null,
				config.frmoId === null ? "EGISZ_FRMO_ID" : null,
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
				!(await requireClinicalReadAccess(request, reply, "egisz snils validation"))
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
			if (!(await requireClinicalReadAccess(request, reply, "egisz cda export")))
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { visitId } = request.params as { visitId: string };

			const [row] = await db
				.select({
					visit: schema.visits,
					patient: schema.patients,
					organization: schema.organizations,
				})
				.from(schema.visits)
				.innerJoin(schema.patients, eq(schema.visits.patientId, schema.patients.id))
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
					}
				}
			}

			const clinicOid = readGatewayConfig().clinicOid;
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
				typeof diaryRow?.anamnesis === "string" ? diaryRow.anamnesis.trim() : "";
			const visitAnamnesis =
				typeof row.visit.anamnesis === "string" ? row.visit.anamnesis.trim() : "";
			const visitComplaint =
				typeof row.visit.complaint === "string" ? row.visit.complaint.trim() : "";
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

			// Врач 043 (doctorId) приоритетнее appointment.doctorUserId — это кто вёл карту.
			if (diaryRow?.doctorId) {
				const [diaryDoctor] = await db
					.select({
						fullName: schema.users.fullName,
						specialties: schema.users.specialties,
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
				for (const uid of fallbackIds) {
					const [u] = await db
						.select({
							fullName: schema.users.fullName,
							specialties: schema.users.specialties,
						})
						.from(schema.users)
						.where(
							and(
								eq(schema.users.id, uid),
								eq(schema.users.organizationId, orgId),
							),
						)
						.limit(1);
					if (u?.fullName && u.fullName.trim()) {
						doctorName = splitFullName(u.fullName);
						const pos = formatDoctorSpecialtyLabelForCda(u.specialties);
						if (pos) doctorPosition = pos;
						break;
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
			if (patientSnilsDigits.length !== 11 || !isValidSnils(patientSnilsDigits)) {
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

			const params: EgiszCdaParams = {
				patientId: row.patient.id,
				patientName: splitFullName(row.patient.fullName),
				// СНИЛС пациента живёт в административном профиле (jsonb).
				patientSnils: patientSnilsDigits,
				patientBirthDate: row.patient.birthDate,
				patientGender: readGenderFromProfile(row.patient.administrativeProfile),
				clinicName: row.organization.name,
				doctorName,
				...(doctorPosition ? { doctorPosition } : {}),
				icd10Code: resolvedIcd10,
				diagnosisText: effectiveDiagnosis,
				visitDate: encounterDate,
				documentId: row.visit.id,
				/* DEFECT #61: revised 043 must not re-export as version 1 */
				...(typeof diaryRow?.version === "number" &&
				Number.isFinite(diaryRow.version) &&
				diaryRow.version >= 1
					? { documentVersion: Math.floor(diaryRow.version) }
					: {}),
				...(clinicOid ? { clinicOid } : {}),
				...(anamnesis ? { anamnesis } : {}),
				...(objectiveStatus ? { objectiveStatus } : {}),
				...(complications ? { complications } : {}),
				...(comorbidities ? { comorbidities } : {}),
				...(instrumentTrayBarcode
					? { instrumentTrayBarcode }
					: {}),
				...(treatmentPlan ? { treatmentDescription: treatmentPlan } : {}),
			};

			const xml = generateDentalCdaXml(params);
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
		? raw
				.map((x) => (typeof x === "string" ? x.trim() : ""))
				.filter(Boolean)
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
		if (value === "male" || value === "female" || value === "other") return value;
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
