import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	type EgiszCdaParams,
	generateDentalCdaXml,
} from "../../services/egiszCdaGenerator.js";
import { isValidSnils } from "../../utils/snils.js";
import {
	extractIcd10,
	formatDoctorSpecialtyLabelForCda,
	formatDoctorSpecialtyNsiCodeForCda,
	readGatewayConfig,
	readGenderFromProfile,
	readSnilsFromProfile,
	splitFullName,
} from "./helpers.js";

const visitCdaParamsSchema = z.object({
	visitId: z.string().uuid(),
});

export function registerVisitCdaExportRoute(app: FastifyInstance): void {
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

			// 152-ФЗ / 323-ФЗ: СЭМД CDA XML содержит полный клинический диагноз
			const identity = getRequestIdentity(request);
			const staffRole =
				identity.role ??
				(request as unknown as { user?: { role?: string | null } }).user?.role ??
				null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					ok: false,
					error: "PermissionDenied",
					permission: "clinical.cda.export",
					role: staffRole,
					message: `Отказ в выгрузке СЭМД CDA (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}

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

			const [diaryRow] = await db
				.select({
					anamnesis: schema.visitDiaries.anamnesis,
					statusLocalis: schema.visitDiaries.statusLocalis,
					diagnosisIcd10: schema.visitDiaries.diagnosisIcd10,
					diagnosisTooth: schema.visitDiaries.diagnosisTooth,
					treatmentDescription: schema.visitDiaries.treatmentDescription,
					complications: schema.visitDiaries.complications,
					comorbidities: schema.visitDiaries.comorbidities,
					instrumentTrayBarcode: schema.visitDiaries.instrumentTrayBarcode,
					doctorId: schema.visitDiaries.doctorId,
					lockedByUserId: schema.visitDiaries.lockedByUserId,
					authorId: schema.visitDiaries.authorId,
					isLocked: schema.visitDiaries.isLocked,
					version: schema.visitDiaries.version,
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

			let doctorName: { first: string; last: string; middle?: string } = {
				first: "",
				last: "Не указан",
			};
			let doctorPosition: string | undefined;
			let doctorPositionCode: string | undefined;
			let doctorContact:
				| { phone?: string | null; email?: string | null }
				| undefined;
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
						const posCode = formatDoctorSpecialtyNsiCodeForCda(doctor.specialties);
						if (posCode) doctorPositionCode = posCode;
						doctorContact = { phone: doctor.phone, email: doctor.email };
					}
				}
			}

			const clinicOid = readGatewayConfig().clinicOid;
			if (!clinicOid) {
				return reply.status(422).send({
					error: "ClinicOidRequired",
					message:
						"Для выгрузки в ЕГИСЗ укажите идентификатор организации в настройках интеграции.",
				});
			}

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

			const diaryObjective =
				typeof diaryRow?.statusLocalis === "string"
					? diaryRow.statusLocalis.trim()
					: "";
			const visitObjective =
				typeof row.visit.objectiveStatus === "string"
					? row.visit.objectiveStatus.trim()
					: "";
			const objectiveStatus = diaryObjective || visitObjective;

			const complications =
				typeof diaryRow?.complications === "string"
					? diaryRow.complications.trim()
					: "";
			const comorbidities =
				typeof diaryRow?.comorbidities === "string"
					? diaryRow.comorbidities.trim()
					: "";
			const instrumentTrayBarcode =
				typeof diaryRow?.instrumentTrayBarcode === "string"
					? diaryRow.instrumentTrayBarcode.trim()
					: "";
			const diagnosisTooth =
				typeof diaryRow?.diagnosisTooth === "string"
					? diaryRow.diagnosisTooth.trim()
					: "";

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
						if (u?.fullName?.trim()) {
							doctorName = splitFullName(u.fullName);
							const pos = formatDoctorSpecialtyLabelForCda(u.specialties);
							if (pos) doctorPosition = pos;
							const posCode = formatDoctorSpecialtyNsiCodeForCda(u.specialties);
							if (posCode) doctorPositionCode = posCode;
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

			const resolvedIcd10 = diaryIcd || extractIcd10(effectiveDiagnosis);
			if (!resolvedIcd10) {
				return reply.status(422).send({
					error: "Icd10Required",
					message:
						"Для выгрузки в ЕГИСЗ у диагноза должен быть указан код МКБ-10 (в дневнике 043/у или в тексте диагноза EMK).",
				});
			}

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
				patientSnils: patientSnilsDigits,
				patientBirthDate: birthStr,
				patientGender,
				...(patientPhone ? { patientPhone } : {}),
				...(patientEmail ? { patientEmail } : {}),
				...(patientAddress ? { patientAddress } : {}),
				clinicName,
				...(typeof row.organization.ogrn === "string" && row.organization.ogrn.trim()
					? { clinicOgrn: row.organization.ogrn.trim() }
					: {}),
				...(typeof row.organization.inn === "string" && row.organization.inn.trim()
					? { clinicInn: row.organization.inn.trim() }
					: {}),
				...(clinicAddress ? { clinicAddress } : {}),
				...(clinicPhone ? { clinicPhone } : {}),
				...(clinicEmail ? { clinicEmail } : {}),
				...(clinicLegalAddress ? { clinicLegalAddress } : {}),
				doctorName,
				...(doctorPhone ? { doctorPhone } : {}),
				...(doctorEmail ? { doctorEmail } : {}),
				...(doctorPosition ? { doctorPosition } : {}),
				...(doctorPositionCode ? { doctorPositionCode } : {}),
				icd10Code: resolvedIcd10,
				diagnosisText: effectiveDiagnosis,
				visitDate: encounterDate,
				documentId: (() => {
					const ver =
						typeof diaryRow?.version === "number" &&
						Number.isFinite(diaryRow.version) &&
						diaryRow.version >= 1
							? Math.floor(diaryRow.version)
							: null;
					return ver != null ? `${row.visit.id}-v${ver}` : row.visit.id;
				})(),
				encounterId: row.visit.id,
				documentSetId: row.visit.id,
				...(typeof diaryRow?.version === "number" &&
				Number.isFinite(diaryRow.version) &&
				diaryRow.version >= 1
					? { documentVersion: Math.floor(diaryRow.version) }
					: {}),
				...(typeof diaryRow?.version === "number" &&
				Number.isFinite(diaryRow.version) &&
				diaryRow.version >= 2
					? {
							replacesDocumentId: `${row.visit.id}-v${Math.floor(diaryRow.version) - 1}`,
						}
					: {}),
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
}
