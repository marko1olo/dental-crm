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

			if (!row.visit.diagnosis) {
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
			if (row.visit.appointmentId) {
				const [appointment] = await db
					.select({ doctorUserId: schema.appointments.doctorUserId })
					.from(schema.appointments)
					.where(eq(schema.appointments.id, row.visit.appointmentId))
					.limit(1);
				if (appointment?.doctorUserId) {
					const [doctor] = await db
						.select({ fullName: schema.users.fullName })
						.from(schema.users)
						.where(
							and(
								eq(schema.users.id, appointment.doctorUserId),
								eq(schema.users.organizationId, orgId),
							),
						)
						.limit(1);
					if (doctor) doctorName = splitFullName(doctor.fullName);
				}
			}

			const clinicOid = readGatewayConfig().clinicOid;
			const { anamnesis, treatmentPlan } = row.visit;

			const params: EgiszCdaParams = {
				patientId: row.patient.id,
				patientName: splitFullName(row.patient.fullName),
				// СНИЛС пациента живёт в административном профиле (jsonb).
				patientSnils: readSnilsFromProfile(row.patient.administrativeProfile),
				patientBirthDate: row.patient.birthDate,
				patientGender: readGenderFromProfile(row.patient.administrativeProfile),
				clinicName: row.organization.name,
				doctorName,
				icd10Code: extractIcd10(row.visit.diagnosis),
				diagnosisText: row.visit.diagnosis,
				visitDate: row.visit.createdAt,
				documentId: row.visit.id,
				...(clinicOid ? { clinicOid } : {}),
				...(anamnesis ? { anamnesis } : {}),
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
 */
function extractIcd10(diagnosis: string): string {
	const match = diagnosis.match(/\b([A-ZА-Я]\d{2}(?:\.\d{1,2})?)\b/);
	return match?.[1] ?? "";
}
