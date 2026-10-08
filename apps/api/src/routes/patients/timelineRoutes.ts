import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	getPatientByIdFromDb,
	recordPatientConsentInDb,
} from "../../db/patientsQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	generatedDocuments,
	patientInvoices,
	patients,
	treatmentPlans,
	users,
	visitDiaries,
} from "../../db/schema.js";
import {
	PATIENT_ID_UUID_PATTERN,
	patientNotFoundMessage,
	requireClinicOrganizationId,
	sendPatientNotFound,
	sendPatientRouteValidationError,
} from "./helpers.js";

export function registerPatientTimelineRoutes(app: FastifyInstance) {
	/**
	 * Сохранение подписанного согласия пациента (ИДС по 323-ФЗ / Приказ № 1051н).
	 * Фиксирует векторную SVG-подпись, SHA-256 хеш целостности и вносит запись в карту.
	 */
	app.post(
		"/api/patients/:patientId/consents",
		async (request, reply) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;

			const { patientId } = request.params as { patientId?: string };
			if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId.trim())) {
				return sendPatientRouteValidationError(reply);
			}

			const payload = request.body as {
				templateKey?: string;
				code?: string;
				title?: string;
				fullTextContent?: string;
				patientName?: string;
				birthDate?: string;
				passport?: string;
				doctorName?: string;
				clinicName?: string;
				diagnosisIcd?: string;
				toothNumbers?: string;
				signatureSvg?: string;
				signaturePngBase64?: string;
				// biome-ignore lint/suspicious/noExplicitAny: vector math payload
				vectorData?: any;
				integrityHash?: string;
				signedAt?: string;
				verificationMethod?: string;
				smsOtpCode?: string | null;
				attachedToForm043u?: boolean;
				visitId?: string | null;
			};

			if (!payload || (!payload.signatureSvg && !payload.signaturePngBase64)) {
				return reply.code(400).send({
					error: "MissingSignatureError",
					message: "Требуется графическая подпись пациента (SVG/PNG)",
				});
			}

			if (!payload.integrityHash) {
				return reply.code(400).send({
					error: "MissingIntegrityHashError",
					message: "Отсутствует криптографический хеш целостности SHA-256",
				});
			}

			try {
				const existingPatient = await getPatientByIdFromDb(orgId, patientId.trim());
				if (!existingPatient) {
					return sendPatientNotFound(reply);
				}

				const result = await recordPatientConsentInDb(orgId, patientId.trim(), {
					templateKey: payload.templateKey,
					code: payload.code,
					title: payload.title,
					fullTextContent: payload.fullTextContent,
					patientName: payload.patientName,
					birthDate: payload.birthDate,
					passport: payload.passport,
					doctorName: payload.doctorName,
					clinicName: payload.clinicName,
					diagnosisIcd: payload.diagnosisIcd,
					toothNumbers: payload.toothNumbers,
					signatureSvg: payload.signatureSvg || "",
					signaturePngBase64: payload.signaturePngBase64,
					vectorData: payload.vectorData,
					integrityHash: payload.integrityHash,
					signedAt: payload.signedAt,
					verificationMethod: payload.verificationMethod || "touch_tablet",
					smsOtpCode: payload.smsOtpCode,
					attachedToForm043u: payload.attachedToForm043u,
					visitId: payload.visitId,
				});

				return reply.code(201).send(result);
			} catch (e) {
				request.log.error({ err: e }, "[Patients] Ошибка фиксации согласия пациента");
				return reply.code(500).send({
					error: "PatientConsentRecordFailed",
					message: "Не удалось сохранить подписанное согласие в карте пациента",
				});
			}
		},
	);

	/**
	 * Получение журнала информированных согласий пациента.
	 */
	app.get(
		"/api/patients/:patientId/consents",
		async (request, reply) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;

			const { patientId } = request.params as { patientId?: string };
			if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId.trim())) {
				return sendPatientRouteValidationError(reply);
			}

			try {
				const patient = await getPatientByIdFromDb(orgId, patientId.trim());
				if (!patient) return sendPatientNotFound(reply);

				const profile =
					(patient.administrativeProfile as Record<string, unknown> | null) || {};
				const consents = profile.consentSignatures || {};
				return reply.code(200).send(consents);
			} catch (e) {
				request.log.error({ err: e }, "[Patients] Ошибка чтения согласий пациента");
				return reply.code(500).send({
					error: "PatientConsentsReadFailed",
					message: "Не удалось прочитать согласия пациента",
				});
			}
		},
	);

	/**
	 * Журнал обращений пациента: звонки и сообщения, прошедшие через клинику.
	 *
	 * БЫЛО ДВА ДЕФЕКТА, ОБА ИСПРАВЛЕНЫ ЗДЕСЬ.
	 *
	 * 1. Параметр :patientId сначала не читался вовсе — в карточке КАЖДОГО
	 *    пациента показывалась переписка ВСЕХ пациентов клиники. Это раскрытие
	 *    персональных данных внутри интерфейса.
	 * 2. Затем он читался, но источником была patient_communication_timelines —
	 *    таблица без единого писателя в проекте и без колонки patient_id: связь с
	 *    карточкой делалась сравнением ФИО строкой. То есть обе панели карточки
	 *    отвечали «звонков и сообщений нет» ВСЕГДА. Администратор звонил второй
	 *    раз или не звонил вовсе, считая, что коллега отработал.
	 *
	 * Теперь читается communication_events — единственный живой источник со
	 * связью по uuid и пятью настоящими писателями по пяти каналам. Подробности и
	 * границы утверждения — в services/patients/patientCommunicationLog.ts.
	 */
	app.get(
		"/api/patients/:patientId/communication-timelines",
		async (request, reply) => {
			const orgId = requireClinicOrganizationId(request, reply);
			if (!orgId) return reply;

			const { patientId } = request.params as { patientId?: string };
			// Проверка формата до обращения к базе: patients.id и
			// communication_events.patient_id — колонки типа uuid, и на строке
			// «undefined» PostgreSQL отвечает ошибкой разбора. Она превратилась бы в 500
			// «сбой чтения» вместо понятного «карта не выбрана».
			if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId.trim())) {
				return sendPatientRouteValidationError(reply);
			}

			const requestedLimit = (
				request.query as { limit?: unknown } | null | undefined
			)?.limit;

			try {
				const { findPatientCommunicationLog } = await import(
					"../../services/patients/patientCommunicationLog.js"
				);
				const log = await findPatientCommunicationLog(orgId, patientId.trim(), {
					limit: requestedLimit,
				});
				// Пациента нет в этой клинике — это 404, а не пустой журнал. Пустой журнал
				// оператор читает как «с человеком не связывались»; отсутствие карты и
				// отсутствие обращений — разные ответы, и путать их нельзя (тот же приём,
				// что в archive-status ниже).
				if (!log) return sendPatientNotFound(reply);
				return reply.status(200).send(log);
			} catch (e) {
				// Отказ базы не выдаётся за пустой журнал: это самая дорогая ошибка на
				// этом экране. Сообщение обязано назвать и причину, и что делать.
				//
				// ЗДЕСЬ СТОЯЛ РАЗДЕЛ «Общение» — пункта меню с таким именем в программе нет
				// ни в одном режиме клиники. Реестр разделов один, apps/web/src/workspaceShell.tsx,
				// viewLabels: связь называется «Связь», а «Обращения» — это другой раздел
				// (leads, заявки до записи). Тот же дефект на экранной части уже исправлен и
				// закреплён стражем apps/web/src/tests/patientCommunicationLogPanel.test.ts,
				// а здесь остался: администратора отправляли искать несуществующий пункт
				// меню в момент, когда журнал не прочитался и решение принимается вслепую.
				request.log.error(
					{ err: e },
					"[Patients] Ошибка чтения журнала обращений пациента",
				);
				return reply.code(500).send({
					error: "PatientCommunicationLogUnavailable",
					message:
						"Не удалось прочитать звонки и сообщения по этой карте. Не считайте, что обращений не было: повторите чтение, а до этого проверьте раздел «Связь».",
				});
			}
		},
	);

	/**
	 * GET /api/patients/:patientId/portal
	 * Предоставление актуальных данных личного кабинета пациента (профиль, визиты, планы, счета, документы, записи)
	 * для интеграции с PWA/CRM и предпросмотра портала с соблюдением 152-ФЗ.
	 */
	app.get("/api/patients/:patientId/portal", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const { patientId } = request.params as { patientId?: string };
		if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId)) {
			return sendPatientRouteValidationError(reply);
		}

		return withTenantCtx(orgId, async () => {
			const [patientRow] = await db
				.select()
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);

			if (!patientRow) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: patientNotFoundMessage,
				});
			}

			const visits = await db
				.select()
				.from(visitDiaries)
				.where(and(eq(visitDiaries.patientId, patientId), eq(visitDiaries.organizationId, orgId)));

			const plans = await db
				.select()
				.from(treatmentPlans)
				.where(and(eq(treatmentPlans.patientId, patientId), eq(treatmentPlans.organizationId, orgId)));

			const invoices = await db
				.select()
				.from(patientInvoices)
				.where(and(eq(patientInvoices.patientId, patientId), eq(patientInvoices.organizationId, orgId)));

			const documents = await db
				.select()
				.from(generatedDocuments)
				.where(
					and(
						eq(generatedDocuments.patientId, patientId),
						eq(generatedDocuments.organizationId, orgId),
						eq(generatedDocuments.status, "issued"),
					),
				);

			const patientAppointments = await db
				.select({
					id: appointments.id,
					doctorUserId: appointments.doctorUserId,
					chairId: appointments.chairId,
					startsAt: appointments.startsAt,
					endsAt: appointments.endsAt,
					status: appointments.status,
					reason: appointments.reason,
					comment: appointments.comment,
				})
				.from(appointments)
				.where(and(eq(appointments.patientId, patientId), eq(appointments.organizationId, orgId)))
				.orderBy(desc(appointments.startsAt));

			const clinicDoctors = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					specialties: users.specialties,
				})
				.from(users)
				.where(
					and(
						eq(users.organizationId, orgId),
						eq(users.role, "doctor"),
						eq(users.isActive, true),
					),
				);

			const doctorMap = new Map(clinicDoctors.map((d) => [d.id, d]));
			const enrichedAppointments = patientAppointments.map((apt) => {
				const doc = apt.doctorUserId ? doctorMap.get(apt.doctorUserId) : null;
				return {
					...apt,
					doctorName: doc?.fullName || "Лечащий врач",
					doctorSpecialtyRu: doc?.specialties?.[0] || "Стоматолог",
				};
			});

			// 152-ФЗ / Врачебная тайна: Защита от утечки служебных заметок врача/ресепшн
			const { notes: _internalNotes, ...safePatient } = patientRow;
			let safeAdminProfile = patientRow.administrativeProfile;
			if (safeAdminProfile && typeof safeAdminProfile === "object") {
				const {
					curatorCommissionPercent: _comm,
					curatorNotes: _curNotes,
					dataProcessingBasisNote: _dpNote,
					...cleanProfile
				} = safeAdminProfile as Record<string, unknown>;
				safeAdminProfile = cleanProfile as any;
			}
			const sanitizedPatient = {
				...safePatient,
				notes: null,
				administrativeProfile: safeAdminProfile,
			};

			return reply.send({
				success: true,
				patient: sanitizedPatient,
				visits,
				plans,
				invoices,
				documents,
				appointments: enrichedAppointments,
				doctors: clinicDoctors,
			});
		});
	});
}
