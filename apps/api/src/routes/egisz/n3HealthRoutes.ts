/**
 * ═══════════════════════════════════════════════════════════════════════════
 * N3.HEALTH VIPNET EGISZ FASTIFY ROUTES (ИЭМК + PIX + NSI FHIR + EVENTLOG)
 * (ПРИКАЗ 911Н / ПОСТАНОВЛЕНИЕ 555 / 152-ФЗ / 63-ФЗ / VIPNET GATEWAY)
 *
 * REST API для взаимодействия с защищенным шлюзом N3.Health (ЭлНетМед):
 * 1. Конфигурация: чтение из БД (tenant workspaceFeatureFlags) с fallback на .env
 * 2. EMKService: генерация и отправка AddDocument, SendDocument, CloseCase
 * 3. PixService: регистрация и сопоставление пациентов AddPatient, FindPatients
 * 4. EventLog API: проверка статусов СЭМД в РЭМД с авторизацией "N3 <token>"
 * 5. NSI FHIR: получение справочников Минздрава РФ (CodeSystem, ValueSet)
 *
 * ⚠️ БЕЗОПАСНОСТЬ:
 * - Секретные токены маскируются при чтении статуса.
 * - Полная изоляция организаций (requireOrganizationId).
 * - Строгий контроль доступа врачебной тайны (Medical Secrecy Warden).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { requireOrganizationId } from "../../security/identity.js";

import {
	buildEmkAddDocumentSoapXml,
	buildEmkCloseCaseSoapXml,
	buildEmkSendDocumentSoapXml,
	buildPixAddPatientSoapXml,
	buildPixFindPatientsSoapXml,
	buildPixUpdatePatientSoapXml,
	formatEventLogAuthHeader,
	N3EventLogClient,
	N3FhirTerminologyClient,
	N3HealthVipnetGateway,
	n3HealthVipnetConfigSchema,
	type EmkAddDocumentPayload,
	type EmkCloseCasePayload,
	type EmkSendDocumentPayload,
	type N3HealthVipnetConfig,
	type PixFindPatientsCriteria,
	type PixPatientPayload,
} from "../../../../../packages/shared/src/egisz/index.js";

// ─── 1. Zod схемы запросов ──────────────────────────────────────────────────

export const n3ConfigUpdateBodySchema = z.object({
	authGuid: z.string().min(1).optional(),
	idLpu: z.string().min(1).optional(),
	clinicOid: z.string().min(5).optional(),
	emkServiceUrl: z.string().url().optional(),
	pixServiceUrl: z.string().url().optional(),
	nsiFhirUrl: z.string().url().optional(),
	eventLogApiUrl: z.string().url().optional(),
	eventLogToken: z.string().min(1).optional(),
	isVipnetChannelActive: z.boolean().optional(),
	timeoutMs: z.number().int().positive().optional(),
});

const emkAddDocumentBodySchema = z.object({
	dryRun: z.boolean().optional().default(false),
	idDocumentMis: z.string().min(1),
	idCaseMis: z.string().optional(),
	documentType: z.string().default("108"),
	documentName: z.string().min(2),
	documentDate: z.string(),
	cdaXmlContent: z.string().min(50),
	patient: z.object({
		idPatientMis: z.string().min(1),
		snils: z.string().min(11),
		familyName: z.string().min(1),
		givenName: z.string().min(1),
		middleName: z.string().optional(),
		birthDate: z.string(),
		gender: z.enum(["1", "2"]),
	}),
	doctor: z.object({
		snils: z.string().min(11),
		familyName: z.string().min(1),
		givenName: z.string().min(1),
		middleName: z.string().optional(),
		positionCode: z.string().optional(),
		specialtyCode: z.string().optional(),
	}),
	signatures: z
		.array(
			z.object({
				signatureType: z.enum(["Doctor", "Clinic"]),
				signatureBase64: z.string().min(1),
				signerSnils: z.string().optional(),
			}),
		)
		.optional(),
});

const emkSendDocumentBodySchema = z.object({
	idDocumentMis: z.string().min(1),
	idCaseMis: z.string().optional(),
	targetSystem: z.enum(["REMD", "IEMK", "ALL"]).default("REMD"),
	dryRun: z.boolean().optional().default(false),
});

const emkCloseCaseBodySchema = z.object({
	idCaseMis: z.string().min(1),
	closeDate: z.string(),
	resultCode: z.string().optional().default("301"),
	outcomeCode: z.string().optional().default("301"),
	dryRun: z.boolean().optional().default(false),
});

const pixPatientBodySchema = z.object({
	dryRun: z.boolean().optional().default(false),
	idPatientMis: z.string().min(1),
	familyName: z.string().min(1),
	givenName: z.string().min(1),
	middleName: z.string().optional(),
	birthDate: z.string(),
	gender: z.enum(["1", "2"]),
	snils: z.string().min(11),
	omsPolicy: z
		.object({
			number: z.string().min(1),
			type: z.string().optional(),
			issuer: z.string().optional(),
		})
		.optional(),
	document: z
		.object({
			docType: z.string().min(1),
			series: z.string().optional(),
			number: z.string().min(1),
			issueDate: z.string().optional(),
			issuer: z.string().optional(),
		})
		.optional(),
	phone: z.string().optional(),
});

const pixFindPatientsBodySchema = z.object({
	dryRun: z.boolean().optional().default(false),
	idPatientMis: z.string().optional(),
	snils: z.string().optional(),
	familyName: z.string().optional(),
	givenName: z.string().optional(),
	middleName: z.string().optional(),
	birthDate: z.string().optional(),
	omsNumber: z.string().optional(),
});

const eventLogReexportBodySchema = z.object({
	idDocumentMis: z.string().min(1),
	queue: z.enum(["REMD", "IEMK"]).default("REMD"),
});

// ─── 2. Чтение конфигурации: Тенант БД + Переменные окружения ────────────────

export async function resolveN3HealthConfig(
	orgId: string,
): Promise<{ config: N3HealthVipnetConfig | null; source: "database" | "environment" | "none" }> {
	// 1. Попытка чтения из настроек организации в БД (workspaceFeatureFlags.n3HealthVipnetConfig)
	try {
		const orgRows = await db
			.select({ flags: schema.organizations.workspaceFeatureFlags })
			.from(schema.organizations)
			.where(eq(schema.organizations.id, orgId))
			.limit(1);

		const rawFlags = orgRows[0]?.flags;
		if (rawFlags && typeof rawFlags === "object" && "n3HealthVipnetConfig" in rawFlags) {
			const dbConfig = (rawFlags as Record<string, unknown>).n3HealthVipnetConfig;
			const parseResult = n3HealthVipnetConfigSchema.safeParse(dbConfig);
			if (parseResult.success) {
				return { config: parseResult.data, source: "database" };
			}
		}
	} catch {
		// При ошибке чтения БД переходим к переменным окружения
	}

	// 2. Fallback на переменные окружения
	const pick = (name: string) => {
		const raw = process.env[name];
		return raw && raw.trim().length > 0 ? raw.trim() : undefined;
	};

	const envCandidate = {
		authGuid: pick("EGISZ_N3_AUTH_GUID") || pick("EGISZ_N3_GUID"),
		idLpu: pick("EGISZ_N3_ID_LPU") || pick("EGISZ_N3_LPU_ID"),
		clinicOid: pick("EGISZ_CLINIC_OID"),
		emkServiceUrl: pick("EGISZ_N3_EMK_URL") || "http://b2b.n3health.ru/emk/EMKService.svc",
		pixServiceUrl: pick("EGISZ_N3_PIX_URL") || "http://b2b.n3health.ru/emk/PixService.svc",
		nsiFhirUrl: pick("EGISZ_N3_NSI_FHIR_URL") || "http://b2b.n3health.ru/nsi/fhir/term/",
		eventLogApiUrl: pick("EGISZ_N3_EVENTLOG_URL") || "https://api.n3health.ru/eventlog/",
		eventLogToken: pick("EGISZ_N3_EVENTLOG_TOKEN") || pick("EGISZ_N3_API_KEY"),
		isVipnetChannelActive: process.env.EGISZ_N3_VIPNET_ACTIVE === "true" || process.env.EGISZ_N3_VIPNET_ACTIVE === "1",
		timeoutMs: 15000,
	};

	const envParse = n3HealthVipnetConfigSchema.safeParse(envCandidate);
	if (envParse.success) {
		return { config: envParse.data, source: "environment" };
	}

	return { config: null, source: "none" };
}

/**
 * Маскирует секретный токен для отображения в UI/API:
 * 'b98392e5-45cc-a345-aa70-51485e3833a7' -> 'b983...33a7'
 */
function maskSecretToken(token?: string | null): string | null {
	if (!token || token.length <= 8) return null;
	return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

// ─── 3. Регистрация Fastify-роутов ──────────────────────────────────────────

export async function registerN3HealthRoutes(app: FastifyInstance) {
	/**
	 * GET /api/egisz/n3health/status — текущее состояние шлюза N3.Health ViPNet.
	 */
	app.get(
		"/api/egisz/n3health/status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz n3health status"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { config, source } = await resolveN3HealthConfig(orgId);

			if (!config) {
				return reply.status(200).send({
					ok: true,
					configured: false,
					source,
					isVipnetChannelActive: false,
					clinicOid: null,
					idLpu: null,
					authGuidMasked: null,
					eventLogTokenMasked: null,
					emkServiceUrl: "http://b2b.n3health.ru/emk/EMKService.svc",
					pixServiceUrl: "http://b2b.n3health.ru/emk/PixService.svc",
					nsiFhirUrl: "http://b2b.n3health.ru/nsi/fhir/term/",
					eventLogApiUrl: "https://api.n3health.ru/eventlog/",
					message: "Интеграция N3.Health ViPNet не настроена. Укажите GUID и idLPU в настройках или .env.",
				});
			}

			return reply.status(200).send({
				ok: true,
				configured: true,
				source,
				isVipnetChannelActive: config.isVipnetChannelActive,
				clinicOid: config.clinicOid,
				idLpu: config.idLpu,
				authGuidMasked: maskSecretToken(config.authGuid),
				eventLogTokenMasked: maskSecretToken(config.eventLogToken),
				emkServiceUrl: config.emkServiceUrl,
				pixServiceUrl: config.pixServiceUrl,
				nsiFhirUrl: config.nsiFhirUrl,
				eventLogApiUrl: config.eventLogApiUrl,
				timeoutMs: config.timeoutMs,
			});
		},
	);

	/**
	 * POST /api/egisz/n3health/config — сохранение настроек N3.Health ViPNet для организации.
	 */
	app.post(
		"/api/egisz/n3health/config",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalMutationAccess(request, reply, "egisz n3health config update"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsed = n3ConfigUpdateBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					ok: false,
					error: "ValidationError",
					message: "Некорректный формат параметров конфигурации N3.Health.",
					issues: parsed.error.issues,
				});
			}

			// Получаем текущие флаги организации
			const orgRows = await db
				.select({ flags: schema.organizations.workspaceFeatureFlags })
				.from(schema.organizations)
				.where(eq(schema.organizations.id, orgId))
				.limit(1);

			const existingFlags = (orgRows[0]?.flags ?? {}) as Record<string, unknown>;
			const existingN3 = (existingFlags.n3HealthVipnetConfig ?? {}) as Record<string, unknown>;

			const mergedN3Config = {
				...existingN3,
				...parsed.data,
			};

			const validation = n3HealthVipnetConfigSchema.safeParse(mergedN3Config);
			if (!validation.success) {
				return reply.status(400).send({
					ok: false,
					error: "InvalidConfig",
					message: "Неполная конфигурация: требуются authGuid, idLpu, clinicOid и eventLogToken.",
					issues: validation.error.issues,
				});
			}

			const updatedFlags = {
				...existingFlags,
				n3HealthVipnetConfig: validation.data,
			};

			await db
				.update(schema.organizations)
				.set({ workspaceFeatureFlags: updatedFlags, updatedAt: new Date() })
				.where(eq(schema.organizations.id, orgId));

			return reply.status(200).send({
				ok: true,
				configured: true,
				message: "Параметры интеграции N3.Health ViPNet успешно сохранены.",
				clinicOid: validation.data.clinicOid,
				idLpu: validation.data.idLpu,
			});
		},
	);

	/**
	 * POST /api/egisz/n3health/emk/add-document — регистрация документа в ИЭМК через EMKService.
	 */
	app.post(
		"/api/egisz/n3health/emk/add-document",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalMutationAccess(request, reply, "egisz n3health add document"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsed = emkAddDocumentBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					ok: false,
					error: "ValidationError",
					message: "Некорректные параметры документа для EMKService.",
					issues: parsed.error.issues,
				});
			}

			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) {
				return reply.status(400).send({
					ok: false,
					error: "N3NotConfigured",
					message: "Шлюз N3.Health ViPNet не настроен для данной организации.",
				});
			}

			const payload: EmkAddDocumentPayload = {
				idDocumentMis: parsed.data.idDocumentMis,
				idCaseMis: parsed.data.idCaseMis,
				documentType: parsed.data.documentType,
				documentName: parsed.data.documentName,
				documentDate: parsed.data.documentDate,
				cdaXmlContent: parsed.data.cdaXmlContent,
				patient: parsed.data.patient,
				doctor: parsed.data.doctor,
				signatures: parsed.data.signatures,
			};

			// Если запрошен режим симуляции/проверки XML (dryRun)
			if (parsed.data.dryRun) {
				const generatedXml = buildEmkAddDocumentSoapXml(config, payload);
				return reply.status(200).send({
					ok: true,
					dryRun: true,
					soapAction: "http://tempuri.org/IEMKService/AddDocument",
					endpointUrl: config.emkServiceUrl,
					generatedSoapEnvelopeLength: generatedXml.length,
					previewSnippet: generatedXml.slice(0, 500),
				});
			}

			const gateway = new N3HealthVipnetGateway(config);
			const result = await gateway.emkAddDocument(payload);

			return reply.status(result.success ? 200 : 502).send({
				ok: result.success,
				httpStatusCode: result.httpStatusCode,
				idDocumentGlobal: result.idDocumentGlobal,
				faultString: result.faultString,
				errorCode: result.errorCode,
			});
		},
	);

	/**
	 * POST /api/egisz/n3health/emk/send-document — отправка документа в РЭМД/ИЭМК.
	 */
	app.post(
		"/api/egisz/n3health/emk/send-document",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalMutationAccess(request, reply, "egisz n3health send document"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsed = emkSendDocumentBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					ok: false,
					error: "ValidationError",
					message: "Некорректные параметры SendDocument.",
				});
			}

			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) {
				return reply.status(400).send({
					ok: false,
					error: "N3NotConfigured",
					message: "Шлюз N3.Health ViPNet не настроен.",
				});
			}

			const payload: EmkSendDocumentPayload = {
				idDocumentMis: parsed.data.idDocumentMis,
				idCaseMis: parsed.data.idCaseMis,
				targetSystem: parsed.data.targetSystem,
			};

			if (parsed.data.dryRun) {
				const generatedXml = buildEmkSendDocumentSoapXml(config, payload);
				return reply.status(200).send({
					ok: true,
					dryRun: true,
					soapAction: "http://tempuri.org/IEMKService/SendDocument",
					previewSnippet: generatedXml.slice(0, 500),
				});
			}

			const gateway = new N3HealthVipnetGateway(config);
			const result = await gateway.emkSendDocument(payload);

			return reply.status(result.success ? 200 : 502).send({
				ok: result.success,
				httpStatusCode: result.httpStatusCode,
				idDocumentGlobal: result.idDocumentGlobal,
				faultString: result.faultString,
			});
		},
	);

	/**
	 * POST /api/egisz/n3health/emk/close-case — закрытие случая обслуживания в ИЭМК.
	 */
	app.post(
		"/api/egisz/n3health/emk/close-case",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalMutationAccess(request, reply, "egisz n3health close case"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsed = emkCloseCaseBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					ok: false,
					error: "ValidationError",
					message: "Некорректные параметры закрытия случая.",
				});
			}

			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) {
				return reply.status(400).send({
					ok: false,
					error: "N3NotConfigured",
					message: "Шлюз N3.Health ViPNet не настроен.",
				});
			}

			const payload: EmkCloseCasePayload = {
				idCaseMis: parsed.data.idCaseMis,
				closeDate: parsed.data.closeDate,
				resultCode: parsed.data.resultCode,
				outcomeCode: parsed.data.outcomeCode,
			};

			if (parsed.data.dryRun) {
				const generatedXml = buildEmkCloseCaseSoapXml(config, payload);
				return reply.status(200).send({
					ok: true,
					dryRun: true,
					soapAction: "http://tempuri.org/IEMKService/CloseCase",
					previewSnippet: generatedXml.slice(0, 500),
				});
			}

			const gateway = new N3HealthVipnetGateway(config);
			const result = await gateway.emkCloseCase(payload);

			return reply.status(result.success ? 200 : 502).send({
				ok: result.success,
				httpStatusCode: result.httpStatusCode,
				faultString: result.faultString,
			});
		},
	);

	/**
	 * POST /api/egisz/n3health/pix/add-patient — регистрация пациента в PIX.
	 */
	app.post(
		"/api/egisz/n3health/pix/add-patient",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalMutationAccess(request, reply, "egisz n3health add pix patient"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsed = pixPatientBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					ok: false,
					error: "ValidationError",
					message: "Некорректные данные пациента для PixService.",
					issues: parsed.error.issues,
				});
			}

			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) {
				return reply.status(400).send({
					ok: false,
					error: "N3NotConfigured",
					message: "Шлюз N3.Health ViPNet не настроен.",
				});
			}

			const payload: PixPatientPayload = {
				idPatientMis: parsed.data.idPatientMis,
				familyName: parsed.data.familyName,
				givenName: parsed.data.givenName,
				middleName: parsed.data.middleName,
				birthDate: parsed.data.birthDate,
				gender: parsed.data.gender,
				snils: parsed.data.snils,
				omsPolicy: parsed.data.omsPolicy,
				document: parsed.data.document,
				phone: parsed.data.phone,
			};

			if (parsed.data.dryRun) {
				const generatedXml = buildPixAddPatientSoapXml(config, payload);
				return reply.status(200).send({
					ok: true,
					dryRun: true,
					soapAction: "http://tempuri.org/IPixService/AddPatient",
					previewSnippet: generatedXml.slice(0, 500),
				});
			}

			const gateway = new N3HealthVipnetGateway(config);
			const result = await gateway.pixAddPatient(payload);

			return reply.status(result.success ? 200 : 502).send({
				ok: result.success,
				httpStatusCode: result.httpStatusCode,
				idPatientGlobal: result.idPatientGlobal,
				faultString: result.faultString,
			});
		},
	);

	/**
	 * POST /api/egisz/n3health/pix/find-patients — поиск пациентов в PIX.
	 */
	app.post(
		"/api/egisz/n3health/pix/find-patients",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz n3health find pix patients"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsed = pixFindPatientsBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					ok: false,
					error: "ValidationError",
					message: "Некорректные критерии поиска пациента.",
				});
			}

			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) {
				return reply.status(400).send({
					ok: false,
					error: "N3NotConfigured",
					message: "Шлюз N3.Health ViPNet не настроен.",
				});
			}

			const criteria: PixFindPatientsCriteria = {
				idPatientMis: parsed.data.idPatientMis,
				snils: parsed.data.snils,
				familyName: parsed.data.familyName,
				givenName: parsed.data.givenName,
				middleName: parsed.data.middleName,
				birthDate: parsed.data.birthDate,
				omsNumber: parsed.data.omsNumber,
			};

			if (parsed.data.dryRun) {
				const generatedXml = buildPixFindPatientsSoapXml(config, criteria);
				return reply.status(200).send({
					ok: true,
					dryRun: true,
					soapAction: "http://tempuri.org/IPixService/FindPatients",
					previewSnippet: generatedXml.slice(0, 500),
				});
			}

			const gateway = new N3HealthVipnetGateway(config);
			const result = await gateway.pixFindPatients(criteria);

			return reply.status(result.success ? 200 : 502).send({
				ok: result.success,
				httpStatusCode: result.httpStatusCode,
				faultString: result.faultString,
			});
		},
	);

	/**
	 * GET /api/egisz/n3health/eventlog/status/:idDocumentMis — мониторинг статуса документа в EventLog.
	 */
	app.get(
		"/api/egisz/n3health/eventlog/status/:idDocumentMis",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz n3health eventlog status"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const params = request.params as { idDocumentMis: string };
			if (!params.idDocumentMis) {
				return reply.status(400).send({
					ok: false,
					error: "ValidationError",
					message: "Параметр idDocumentMis обязателен.",
				});
			}

			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) {
				return reply.status(400).send({
					ok: false,
					error: "N3NotConfigured",
					message: "Шлюз N3.Health ViPNet не настроен.",
				});
			}

			const client = new N3EventLogClient(config);
			const statusRecord = await client.getDocumentStatus(params.idDocumentMis);

			return reply.status(200).send({
				ok: true,
				...statusRecord,
			});
		},
	);

	/**
	 * POST /api/egisz/n3health/eventlog/reexport — постановка документа в очередь перевыгрузки в EventLog.
	 */
	app.post(
		"/api/egisz/n3health/eventlog/reexport",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalMutationAccess(request, reply, "egisz n3health eventlog reexport"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsed = eventLogReexportBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					ok: false,
					error: "ValidationError",
					message: "Параметры idDocumentMis и queue обязательны.",
				});
			}

			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) {
				return reply.status(400).send({
					ok: false,
					error: "N3NotConfigured",
					message: "Шлюз N3.Health ViPNet не настроен.",
				});
			}

			const client = new N3EventLogClient(config);
			const result = await client.queueForReexport(parsed.data.idDocumentMis, parsed.data.queue);

			return reply.status(result.success ? 200 : 502).send({
				ok: result.success,
				message: result.message,
			});
		},
	);

	/**
	 * GET /api/egisz/n3health/eventlog/queues — статистика очередей EventLog.
	 */
	app.get(
		"/api/egisz/n3health/eventlog/queues",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz n3health eventlog queues"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) {
				return reply.status(400).send({
					ok: false,
					error: "N3NotConfigured",
					message: "Шлюз N3.Health ViPNet не настроен.",
				});
			}

			const client = new N3EventLogClient(config);
			const stats = await client.getQueueStats();

			return reply.status(200).send({
				ok: true,
				stats,
			});
		},
	);

	/**
	 * GET /api/egisz/n3health/nsi/codesystem — получение справочника НСИ Минздрава по OID.
	 */
	app.get(
		"/api/egisz/n3health/nsi/codesystem",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz n3health nsi fhir"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const query = request.query as { oid?: string };
			if (!query.oid) {
				return reply.status(400).send({
					ok: false,
					error: "ValidationError",
					message: "Параметр oid обязателен.",
				});
			}

			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) {
				return reply.status(400).send({
					ok: false,
					error: "N3NotConfigured",
					message: "Шлюз N3.Health ViPNet не настроен.",
				});
			}

			const fhir = new N3FhirTerminologyClient(config);
			const data = await fhir.getCodeSystem(query.oid);

			if (!data) {
				return reply.status(404).send({
					ok: false,
					error: "NotFound",
					message: `Справочник НСИ с OID ${query.oid} не найден или сервер недоступен.`,
				});
			}

			return reply.status(200).send({
				ok: true,
				data,
			});
		},
	);

	/**
	 * GET /api/egisz/n3health/nsi/valueset — получение ValueSet НСИ с фильтрацией.
	 */
	app.get(
		"/api/egisz/n3health/nsi/valueset",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz n3health nsi valueset"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const query = request.query as { url?: string; filter?: string };
			if (!query.url) {
				return reply.status(400).send({
					ok: false,
					error: "ValidationError",
					message: "Параметр url обязателен.",
				});
			}

			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) {
				return reply.status(400).send({
					ok: false,
					error: "N3NotConfigured",
					message: "Шлюз N3.Health ViPNet не настроен.",
				});
			}

			const fhir = new N3FhirTerminologyClient(config);
			const data = await fhir.expandValueSet(query.url, query.filter);

			if (!data) {
				return reply.status(404).send({
					ok: false,
					error: "NotFound",
					message: `Набор значений (ValueSet) ${query.url} не найден или сервер недоступен.`,
				});
			}

			return reply.status(200).send({
				ok: true,
				data,
			});
		},
	);
}
