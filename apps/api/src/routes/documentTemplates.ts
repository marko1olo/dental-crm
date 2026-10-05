import { randomInt } from "node:crypto";
import {
	ALL_DEFAULT_TEMPLATES_BY_ALIAS,
	ALL_DOCUMENT_TEMPLATE_VARIABLES,
	buildTemplateVariablesMap,
	getDefaultTemplateContentHtml,
	renderDocumentTemplate,
	type TemplateExecutionContext,
} from "@dental/shared";
import { type SQL, and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalReadAccess,
	resolveOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	appointments,
	documentTemplateCategories,
	documentTemplates,
	documentTemplateVariables,
	organizations,
	patients,
	payments,
	users,
	visits,
} from "../db/schema.js";

/**
 * Валидация UUID
 */
const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parsePassportFromString(str: string | null | undefined): {
	series?: string | undefined;
	number?: string | undefined;
	issuedDate?: string | undefined;
	issuedBy?: string | undefined;
	divisionCode?: string | undefined;
} {
	if (!str || !str.trim()) return {};
	const trimmed = str.trim();

	// Попытка найти серию и номер вида "4510 123456" или "45 10 123456"
	const match = trimmed.match(/(?:паспорт|рф)?\s*(\d{2}\s*\d{2}|\d{4})\s*№?\s*(\d{6})/i);
	const series = match ? match[1]?.replace(/\s+/g, "") : "";
	const number = match ? match[2] : "";

	// Дата выдачи
	const dateMatch = trimmed.match(/(?:выдан|от)\s*(\d{2}\.\d{2}\.\d{4})/i);
	const issuedDate = dateMatch ? dateMatch[1] : "";

	// Кем выдан
	let issuedBy = "";
	const issuedByMatch = trimmed.match(/(?:выдан|выдачи)\s*(?:[0-9.]+\s*)?([^,.]+)/i);
	if (issuedByMatch) {
		issuedBy = issuedByMatch[1]?.trim() ?? "";
	}

	// Код подразделения
	const divMatch = trimmed.match(/(?:код|подразделения)?\s*(\d{3}-\d{3})/i);
	const divisionCode = divMatch ? divMatch[1] : "";

	return {
		series: series || undefined,
		number: number || undefined,
		issuedDate: issuedDate || undefined,
		issuedBy: issuedBy || undefined,
		divisionCode: divisionCode || undefined,
	};
}

const renderDocumentBodySchema = z.object({
	patientId: z.string().trim().optional(),
	appointmentId: z.string().trim().optional(),
	visitId: z.string().trim().optional(),
	doctorId: z.string().trim().optional(),
	administratorId: z.string().trim().optional(),
	representative: z
		.object({
			fullName: z.string().trim().optional(),
			relationType: z.string().trim().optional(),
			phone: z.string().trim().optional(),
			passport: z
				.object({
					series: z.string().trim().optional(),
					number: z.string().trim().optional(),
					issuedDate: z.string().trim().optional(),
					issuedBy: z.string().trim().optional(),
					divisionCode: z.string().trim().optional(),
				})
				.optional(),
			birthDate: z.string().trim().optional(),
			address: z.string().trim().optional(),
			basis: z.string().trim().optional(),
			snils: z.string().trim().optional(),
		})
		.optional(),
	authorizedPerson: z
		.object({
			fullName: z.string().trim().optional(),
			phone: z.string().trim().optional(),
			passport: z
				.object({
					series: z.string().trim().optional(),
					number: z.string().trim().optional(),
					issuedDate: z.string().trim().optional(),
					issuedBy: z.string().trim().optional(),
					divisionCode: z.string().trim().optional(),
				})
				.optional(),
			birthDate: z.string().trim().optional(),
			address: z.string().trim().optional(),
			snils: z.string().trim().optional(),
		})
		.optional(),
	financial: z
		.object({
			amountKopecks: z.number().int().optional(),
			amountRubles: z.number().optional(),
			invoiceNumber: z.string().optional(),
			invoiceDate: z.union([z.string(), z.date()]).optional(),
			contractNumber: z.string().optional(),
			contractDate: z.union([z.string(), z.date()]).optional(),
			actNumber: z.string().optional(),
			actDate: z.union([z.string(), z.date()]).optional(),
			comment: z.string().optional(),
		})
		.optional(),
	clinicalExamination: z
		.object({
			examinationDate: z.union([z.string(), z.date()]).optional(),
			doctorFullName: z.string().optional(),
			doctorInitials: z.string().optional(),
			complaints: z.string().optional(),
			anamnesis: z.string().optional(),
			pastDiseases: z.string().optional(),
			diseaseHistory: z.string().optional(),
			externalExam: z.string().optional(),
			bite: z.string().optional(),
			mucousCondition: z.string().optional(),
			xray: z.string().optional(),
			objective: z.string().optional(),
			diagnosis: z.string().optional(),
			treatment: z.string().optional(),
			recommendations: z.string().optional(),
			treatmentDateTime: z.union([z.string(), z.date()]).optional(),
		})
		.optional(),
	dentalFormula: z.union([z.record(z.unknown()), z.array(z.unknown())]).optional(),
	currentUser: z
		.object({
			fullName: z.string().optional(),
			initials: z.string().optional(),
			position: z.string().optional(),
			specialty: z.string().optional(),
		})
		.optional(),
	overrides: z.record(z.unknown()).optional(),
	emptyPlaceholder: z.string().optional().default(""),
});

/**
 * Регистрация Fastify маршрутов каталога и шаблонизатора документов DENTE CRM
 */
export async function registerDocumentTemplateRoutes(app: FastifyInstance) {
	/**
	 * GET /api/document-templates/variables
	 * Реестр доступных 74+ токенов подстановки для редактора шаблонов
	 */
	app.get(
		"/api/document-templates/variables",
		async (_request: FastifyRequest, reply: FastifyReply) => {
			// Чтение переменных из базы
			const dbVariables = await db
				.select()
				.from(documentTemplateVariables)
				.orderBy(
					asc(documentTemplateVariables.domain),
					asc(documentTemplateVariables.name),
				);

			const list =
				dbVariables.length > 0 ? dbVariables : ALL_DOCUMENT_TEMPLATE_VARIABLES;

			// Группировка по доменам
			const domainsMap: Record<string, typeof list[number][]> = {};
			for (const item of list) {
				const d = item.domain || "general";
				if (!domainsMap[d]) domainsMap[d] = [];
				domainsMap[d].push(item);
			}

			const domains = Object.keys(domainsMap).map((d) => ({
				domain: d,
				count: domainsMap[d]?.length ?? 0,
				variables: domainsMap[d] ?? [],
			}));

			return reply.send({
				ok: true,
				totalCount: list.length,
				domains,
				variables: list,
			});
		},
	);

	/**
	 * GET /api/document-templates
	 * Каталог шаблонов с группировкой по 10 рубрикам Минздрава РФ
	 */
	app.get(
		"/api/document-templates",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const query = request.query as {
				categoryId?: string;
				systemAlias?: string;
				search?: string;
				type?: string;
				isEgisz?: string;
			};

			const organizationId = await resolveOrganizationId(request);

			// Загрузка 10 рубрик
			const categories = await db
				.select()
				.from(documentTemplateCategories)
				.orderBy(asc(documentTemplateCategories.order));

			// Построение условий фильтрации
			const conditions: SQL[] = [];
			if (organizationId) {
				// Системные шаблоны (organizationId IS NULL) либо шаблоны данной клиники
				conditions.push(
					or(
						eq(documentTemplates.organizationId, organizationId),
						isNull(documentTemplates.organizationId),
					)!,
				);
			} else {
				// Если организация не указана, возвращаем только системные шаблоны
				conditions.push(isNull(documentTemplates.organizationId));
			}

			if (query.categoryId) {
				const catIdNum = Number.parseInt(query.categoryId, 10);
				if (!Number.isNaN(catIdNum)) {
					conditions.push(eq(documentTemplates.categoryId, catIdNum));
				}
			}

			if (query.systemAlias) {
				conditions.push(
					eq(documentTemplates.systemAlias, query.systemAlias.trim()),
				);
			}

			if (query.type) {
				conditions.push(eq(documentTemplates.type, query.type.trim()));
			}

			if (query.isEgisz !== undefined) {
				const egiszBool = query.isEgisz === "true" || query.isEgisz === "1";
				conditions.push(eq(documentTemplates.isEgisz, egiszBool));
			}

			if (query.search && query.search.trim()) {
				const searchTerm = `%${query.search.trim()}%`;
				const searchCondition = or(
					ilike(documentTemplates.name, searchTerm),
					ilike(documentTemplates.systemAlias, searchTerm),
				);
				if (searchCondition) conditions.push(searchCondition);
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined;

			const templatesList = await db
				.select()
				.from(documentTemplates)
				.where(whereClause)
				.orderBy(asc(documentTemplates.name));

			// Группировка по 10 категориям
			const categoriesWithTemplates = categories.map((cat) => {
				const catTemplates = templatesList.filter(
					(t) => t.categoryId === cat.id,
				);
				return {
					id: cat.id,
					name: cat.name,
					order: cat.order,
					count: catTemplates.length,
					templates: catTemplates,
				};
			});

			return reply.send({
				ok: true,
				totalCount: templatesList.length,
				categories: categoriesWithTemplates,
				templates: templatesList,
			});
		},
	);

	/**
	 * GET /api/document-templates/:id
	 * Получение одного шаблона по UUID, stomxId или systemAlias
	 */
	app.get(
		"/api/document-templates/:id",
		async (
			request: FastifyRequest<{ Params: { id: string } }>,
			reply: FastifyReply,
		) => {
			const identifier = request.params.id?.trim();
			if (!identifier) {
				return reply.code(400).send({
					error: "MissingId",
					message: "Не указан идентификатор шаблона документа.",
				});
			}

			const conditions: SQL[] = [];
			if (UUID_REGEX.test(identifier)) {
				conditions.push(eq(documentTemplates.id, identifier));
			} else if (/^\d+$/.test(identifier)) {
				conditions.push(
					eq(documentTemplates.stomxId, Number.parseInt(identifier, 10)),
				);
			} else {
				conditions.push(eq(documentTemplates.systemAlias, identifier));
			}

			const organizationId = await resolveOrganizationId(request);
			const tenantFilter = organizationId
				? or(
						eq(documentTemplates.organizationId, organizationId),
						isNull(documentTemplates.organizationId),
				  )!
				: isNull(documentTemplates.organizationId);

			const [template] = await db
				.select()
				.from(documentTemplates)
				.where(and(or(...conditions), tenantFilter))
				.limit(1);

			if (!template) {
				const isNumeric = /^\d+$/.test(identifier);
				const stomxIdNum = isNumeric ? Number.parseInt(identifier, 10) : undefined;
				const alias = !isNumeric ? identifier : undefined;
				const knownHtml =
					(alias ? ALL_DEFAULT_TEMPLATES_BY_ALIAS[alias] : undefined) ??
					(stomxIdNum ? ALL_DEFAULT_TEMPLATES_BY_ALIAS[getDefaultTemplateContentHtml(stomxIdNum)] : undefined);

				if (knownHtml) {
					return reply.send({
						ok: true,
						template: {
							id: null,
							stomxId: stomxIdNum ?? null,
							systemAlias: identifier,
							name: identifier,
							categoryId: 1,
							contentHtml: knownHtml,
							isEgisz: false,
							esiaRequired: false,
							isXrayIds: false,
							isBlock: false,
						},
					});
				}

				return reply.code(404).send({
					error: "TemplateNotFound",
					message: `Шаблон документа с идентификатором «${identifier}» не найден в библиотеке клиники.`,
				});
			}

			// Получение названия категории
			let categoryName = "Общее";
			if (template.categoryId) {
				const [cat] = await db
					.select()
					.from(documentTemplateCategories)
					.where(eq(documentTemplateCategories.id, template.categoryId))
					.limit(1);
				if (cat) categoryName = cat.name;
			}

			return reply.send({
				ok: true,
				template: {
					...template,
					categoryName,
				},
			});
		},
	);

	/**
	 * POST /api/document-templates/:id/render
	 * Рендеринг готового HTML бланка с подстановкой реальных данных пациента/визита
	 */
	app.post(
		"/api/document-templates/:id/render",
		async (
			request: FastifyRequest<{ Params: { id: string } }>,
			reply: FastifyReply,
		) => {
			const identifier = request.params.id?.trim();
			if (!identifier) {
				return reply.code(400).send({
					error: "MissingId",
					message: "Не указан идентификатор шаблона документа.",
				});
			}

			const parseResult = renderDocumentBodySchema.safeParse(request.body);
			if (!parseResult.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры запроса рендеринга документа.",
					details: parseResult.error.format(),
				});
			}
			const body = parseResult.data;

			// 1. Определение организации (клиники) с fail-closed защитой
			const organizationId = await resolveOrganizationId(request);
			if (!organizationId) {
				return reply.status(401).send({
					error: "Unauthorized",
					message: "Не указана организация (tenant) для генерации документа.",
				});
			}

			let org: typeof organizations.$inferSelect | undefined;
			if (UUID_REGEX.test(organizationId)) {
				const [foundOrg] = await db
					.select()
					.from(organizations)
					.where(eq(organizations.id, organizationId))
					.limit(1);
				org = foundOrg;
			}

			if (!org) {
				return reply.status(404).send({
					error: "OrganizationNotFound",
					message: "Организация не найдена в базе данных. Доступ запрещен.",
				});
			}

			// 2. Поиск шаблона с учетом изоляции тенанта (системные либо принадлежащие данной клинике)
			const templateConditions: SQL[] = [];
			if (UUID_REGEX.test(identifier)) {
				templateConditions.push(eq(documentTemplates.id, identifier));
			} else if (/^\d+$/.test(identifier)) {
				templateConditions.push(
					eq(documentTemplates.stomxId, Number.parseInt(identifier, 10)),
				);
			} else {
				templateConditions.push(eq(documentTemplates.systemAlias, identifier));
			}

			const tenantTemplateFilter = or(
				eq(documentTemplates.organizationId, org.id),
				isNull(documentTemplates.organizationId),
			)!;

			const [templateRecord] = await db
				.select()
				.from(documentTemplates)
				.where(and(or(...templateConditions), tenantTemplateFilter))
				.limit(1);

			let templateHtml = templateRecord?.contentHtml;
			let templateName = templateRecord?.name ?? identifier;
			let systemAlias = templateRecord?.systemAlias ?? identifier;

			if (!templateHtml || !templateHtml.trim()) {
				const isNumeric = /^\d+$/.test(identifier);
				templateHtml = getDefaultTemplateContentHtml(
					isNumeric ? Number.parseInt(identifier, 10) : undefined,
					!isNumeric ? identifier : undefined,
					templateName,
				);
			}

			const clinicData = {
				name: org.name || "",
				inn: org.inn || "",
				kpp: org.kpp || "",
				address: org.legalAddress || "",
				phone: org.email || "",
				licenseNumber: org.medicalLicenseNumber || "",
				licenseIssuedDate: org.medicalLicenseIssuedAt || "",
				licenseValidity: "Бессрочно",
				licenseIssuer:
					org.medicalLicenseIssuer || "Департамент здравоохранения города Москвы",
			};

			// Данные пациента
			let patientContextData: TemplateExecutionContext["patient"] = undefined;
			let representativeContextData: TemplateExecutionContext["representative"] =
				body.representative
					? {
							fullName: body.representative.fullName,
							relationType: body.representative.relationType,
							phone: body.representative.phone,
							passport: body.representative.passport,
							birthDate: body.representative.birthDate,
							address: body.representative.address,
							basis: body.representative.basis,
							snils: body.representative.snils,
						}
					: undefined;

			if (body.patientId && UUID_REGEX.test(body.patientId)) {
				const [patientRecord] = await db
					.select()
					.from(patients)
					.where(and(eq(patients.id, body.patientId), eq(patients.organizationId, org.id)))
					.limit(1);

				if (patientRecord) {
					const adminProfile = patientRecord.administrativeProfile;
					const parsedPassport = parsePassportFromString(
						adminProfile?.identityDocument,
					);

					patientContextData = {
						id: patientRecord.id,
						fullName: patientRecord.fullName,
						birthDate: patientRecord.birthDate,
						phone: patientRecord.phone,
						email: patientRecord.email,
						address: adminProfile?.registrationAddress ?? "",
						actualAddress:
							adminProfile?.residentialAddress ??
							adminProfile?.registrationAddress ??
							"",
						inn: adminProfile?.taxpayerInn ?? "",
						snils: adminProfile?.snils ?? "",
						omsPolicy: adminProfile?.insurancePolicyNumber ?? "",
						specialNotes: patientRecord.notes ?? "",
						comment: patientRecord.notes ?? "",
						somaticStatus: (adminProfile as any)?.somaticStatus ?? patientRecord.notes ?? "",
						allergyStatus: (adminProfile as any)?.allergyStatus ?? "",
						drugIntolerance: (adminProfile as any)?.drugIntolerance ?? "",
						gender: adminProfile?.gender,
						passport: {
							series: parsedPassport.series,
							number: parsedPassport.number,
							issuedDate: parsedPassport.issuedDate,
							issuedBy: parsedPassport.issuedBy,
							divisionCode: parsedPassport.divisionCode,
						},
					};

					// Если у пациента указан представитель в анкете, подтягиваем его
					if (
						!representativeContextData?.fullName &&
						adminProfile?.legalRepresentativeFullName
					) {
						const repParsedPassport = parsePassportFromString(
							adminProfile.legalRepresentativeIdentityDocument,
						);
						representativeContextData = {
							fullName: adminProfile.legalRepresentativeFullName,
							relationType:
								adminProfile.legalRepresentativeRelationship ?? "родитель",
							phone: adminProfile.legalRepresentativePhone ?? "",
							basis: adminProfile.legalRepresentativeIdentityDocument
								? "Паспорт"
								: "",
							passport: {
								series: repParsedPassport.series,
								number: repParsedPassport.number,
								issuedDate: repParsedPassport.issuedDate,
								issuedBy: repParsedPassport.issuedBy,
								divisionCode: repParsedPassport.divisionCode,
							},
						};
					}
				}
			}

			// Данные приема/визита и клинического протокола
			let appointmentContextData: TemplateExecutionContext["appointment"] = undefined;
			let clinicalExamContextData: TemplateExecutionContext["clinicalExamination"] =
				body.clinicalExamination
					? {
							examinationDate: body.clinicalExamination.examinationDate,
							doctorFullName: body.clinicalExamination.doctorFullName,
							doctorInitials: body.clinicalExamination.doctorInitials,
							complaints: body.clinicalExamination.complaints,
							anamnesis: body.clinicalExamination.anamnesis,
							pastDiseases: body.clinicalExamination.pastDiseases,
							diseaseHistory: body.clinicalExamination.diseaseHistory,
							externalExam: body.clinicalExamination.externalExam,
							bite: body.clinicalExamination.bite,
							mucousCondition: body.clinicalExamination.mucousCondition,
							xray: body.clinicalExamination.xray,
							objective: body.clinicalExamination.objective,
							diagnosis: body.clinicalExamination.diagnosis,
							treatment: body.clinicalExamination.treatment,
							recommendations: body.clinicalExamination.recommendations,
							treatmentDateTime: body.clinicalExamination.treatmentDateTime,
						}
					: undefined;

			let dentalFormulaContextData: TemplateExecutionContext["dentalFormula"] =
				body.dentalFormula as any;

			if (body.visitId && UUID_REGEX.test(body.visitId)) {
				const [visitRecord] = await db
					.select()
					.from(visits)
					.where(and(eq(visits.id, body.visitId), eq(visits.organizationId, org.id)))
					.limit(1);

				if (visitRecord) {
					appointmentContextData = {
						id: visitRecord.id,
						date: visitRecord.signedAt ?? visitRecord.createdAt,
					};

					// Извлечение протокола клинического осмотра из визита
					if (!clinicalExamContextData) {
						clinicalExamContextData = {
							examinationDate: visitRecord.signedAt ?? visitRecord.createdAt,
							complaints: visitRecord.complaint ?? undefined,
							anamnesis: visitRecord.anamnesis ?? undefined,
							objective: visitRecord.objectiveStatus ?? undefined,
							diagnosis: visitRecord.diagnosis ?? undefined,
							treatment: visitRecord.treatmentPlan ?? undefined,
							recommendations: visitRecord.doctorSummary ?? undefined,
							treatmentDateTime: visitRecord.signedAt ?? visitRecord.createdAt,
						};
					}

					// Извлечение зубной формулы из черновика визита при наличии
					if (!dentalFormulaContextData && visitRecord.draftAutosave) {
						const autosave = visitRecord.draftAutosave as Record<string, any>;
						if (autosave.draft?.quality?.detectedToothStates) {
							dentalFormulaContextData = autosave.draft.quality.detectedToothStates;
						} else if (autosave.teeth) {
							dentalFormulaContextData = autosave.teeth;
						} else if (autosave.dentalFormula) {
							dentalFormulaContextData = autosave.dentalFormula;
						}
					}
				}
			} else if (body.appointmentId && UUID_REGEX.test(body.appointmentId)) {
				const [appRecord] = await db
					.select()
					.from(appointments)
					.where(and(eq(appointments.id, body.appointmentId), eq(appointments.organizationId, org.id)))
					.limit(1);

				if (appRecord) {
					const appDate = appRecord.startsAt;
					appointmentContextData = {
						id: appRecord.id,
						date: appDate,
						time: appDate
							? `${String(appDate.getHours()).padStart(2, "0")}:${String(appDate.getMinutes()).padStart(2, "0")}`
							: undefined,
					};
				}
			}

			// Финансовый контекст (сумма, договор, акт, счет)
			let financialContextData: TemplateExecutionContext["financial"] =
				body.financial;
			if (!financialContextData && body.visitId && UUID_REGEX.test(body.visitId)) {
				const visitPayments = await db
					.select()
					.from(payments)
					.where(and(eq(payments.visitId, body.visitId), eq(payments.organizationId, org.id)));

				if (visitPayments.length > 0) {
					const totalRub = visitPayments.reduce(
						(sum, p) => sum + (Number(p.amountRub) || 0),
						0,
					);
					financialContextData = {
						amountRubles: totalRub,
						amountKopecks: Math.round(totalRub * 100),
						actNumber: visitPayments[0]?.documentId ?? undefined,
						actDate: visitPayments[0]?.createdAt ?? undefined,
					};
				}
			}

			// Данные активного врача
			let doctorContextData: TemplateExecutionContext["doctor"] = {
				fullName: "___________________",
				position: "Лечащий врач-стоматолог",
				specialty: "Стоматология",
			};

			if (body.doctorId && UUID_REGEX.test(body.doctorId)) {
				const [docUser] = await db
					.select()
					.from(users)
					.where(and(eq(users.id, body.doctorId), eq(users.organizationId, org.id)))
					.limit(1);

				if (docUser) {
					doctorContextData = {
						fullName: docUser.fullName,
						position: docUser.role ?? "Врач-стоматолог",
						specialty: "Стоматология",
					};
				}
			}

			// Данные администратора клиники
			let administratorContextData: TemplateExecutionContext["administrator"] =
				undefined;
			if (body.administratorId && UUID_REGEX.test(body.administratorId)) {
				const [adminUser] = await db
					.select()
					.from(users)
					.where(and(eq(users.id, body.administratorId), eq(users.organizationId, org.id)))
					.limit(1);

				if (adminUser) {
					administratorContextData = {
						fullName: adminUser.fullName,
						position: adminUser.role ?? "Администратор",
						specialty: "Администрация",
					};
				}
			}

			// Текущий пользователь системы (врач, администратор или сессия)
			let currentUserContextData: TemplateExecutionContext["currentUser"] =
				body.currentUser;
			if (!currentUserContextData) {
				const sessionUser = (request as any).user;
				if (sessionUser?.fullName) {
					currentUserContextData = {
						fullName: sessionUser.fullName,
						position: sessionUser.role ?? "Сотрудник клиники",
						specialty: "Стоматология",
					};
				} else if (
					doctorContextData &&
					doctorContextData.fullName !== "___________________"
				) {
					currentUserContextData = doctorContextData;
				} else if (administratorContextData) {
					currentUserContextData = administratorContextData;
				}
			}

			const authorizedPersonContextData: TemplateExecutionContext["authorizedPerson"] =
				body.authorizedPerson
					? {
							fullName: body.authorizedPerson.fullName,
							phone: body.authorizedPerson.phone,
							passport: body.authorizedPerson.passport,
							birthDate: body.authorizedPerson.birthDate,
							address: body.authorizedPerson.address,
							snils: body.authorizedPerson.snils,
						}
					: undefined;

			// Объединение контекста
			const executionContext: TemplateExecutionContext = {
				clinic: clinicData,
				patient: patientContextData,
				representative: representativeContextData,
				authorizedPerson: authorizedPersonContextData,
				doctor: doctorContextData,
				administrator: administratorContextData,
				currentUser: currentUserContextData,
				appointment: appointmentContextData,
				financial: financialContextData,
				clinicalExamination: clinicalExamContextData,
				dentalFormula: dentalFormulaContextData,
				currentDate: new Date(),
				document: {
					number: `БЛ-${randomInt(1000, 10000)}`,
					createdAt: new Date(),
				},
				...(body.overrides as Partial<TemplateExecutionContext>),
			};

			// Рендеринг HTML
			const renderedHtml = renderDocumentTemplate(
				templateHtml,
				executionContext,
				{
					emptyPlaceholder: body.emptyPlaceholder,
					preserveUnknownTokens: false,
				},
			);

			const appliedVariables = buildTemplateVariablesMap(executionContext);

			return reply.send({
				ok: true,
				template: {
					id: templateRecord?.id ?? null,
					stomxId: templateRecord?.stomxId ?? null,
					name: templateName,
					systemAlias,
					categoryId: templateRecord?.categoryId ?? 1,
				},
				renderedHtml,
				variablesCount: Object.keys(appliedVariables).length,
				appliedVariables,
			});
		},
	);
}

/**
 * Единая консолидированная точка монтирования шаблонов клиники:
 * 1. Бланки официальных документов (ИДС, договоры, справки) -> /api/document-templates
 * 2. Клинические протоколы приёма (Дневник приёма / протокол осмотра) -> /api/templates
 */
export async function registerAllTemplateRoutes(app: FastifyInstance) {
	await registerDocumentTemplateRoutes(app);
	const registerTemplateRoutes = (await import("./templates.js")).default;
	await registerTemplateRoutes(app);
}
