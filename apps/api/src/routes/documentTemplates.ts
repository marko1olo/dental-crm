import {
	ALL_DEFAULT_TEMPLATES_BY_ALIAS,
	ALL_DOCUMENT_TEMPLATE_VARIABLES,
	buildTemplateVariablesMap,
	getDefaultTemplateContentHtml,
	renderDocumentTemplate,
	type TemplateExecutionContext,
} from "@dental/shared";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
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
			const conditions: any[] = [];
			if (organizationId) {
				// Системные шаблоны (organizationId IS NULL) либо шаблоны данной клиники
				conditions.push(
					or(
						eq(documentTemplates.organizationId, organizationId),
						sql`${documentTemplates.organizationId} IS NULL`,
					),
				);
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
				conditions.push(
					or(
						ilike(documentTemplates.name, searchTerm),
						ilike(documentTemplates.systemAlias, searchTerm),
					),
				);
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

			const conditions: any[] = [];
			if (UUID_REGEX.test(identifier)) {
				conditions.push(eq(documentTemplates.id, identifier));
			} else if (/^\d+$/.test(identifier)) {
				conditions.push(
					eq(documentTemplates.stomxId, Number.parseInt(identifier, 10)),
				);
			} else {
				conditions.push(eq(documentTemplates.systemAlias, identifier));
			}

			const [template] = await db
				.select()
				.from(documentTemplates)
				.where(or(...conditions))
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

			// 1. Поиск шаблона
			const templateConditions: any[] = [];
			if (UUID_REGEX.test(identifier)) {
				templateConditions.push(eq(documentTemplates.id, identifier));
			} else if (/^\d+$/.test(identifier)) {
				templateConditions.push(
					eq(documentTemplates.stomxId, Number.parseInt(identifier, 10)),
				);
			} else {
				templateConditions.push(eq(documentTemplates.systemAlias, identifier));
			}

			const [templateRecord] = await db
				.select()
				.from(documentTemplates)
				.where(or(...templateConditions))
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

			// 2. Сбор контекста выполнения
			const organizationId = await resolveOrganizationId(request);

			// Данные клиники
			let clinicData = {
				name: 'ООО "Денте Стоматология"',
				inn: "7701234567",
				kpp: "773601001",
				address: "г. Москва, ул. Стоматологов, д. 15",
				phone: "+7 (495) 123-45-67",
				licenseNumber: "ЛО41-01137-77/00368421",
				licenseIssuedDate: "25.01.2020",
				licenseValidity: "Бессрочно",
				licenseIssuer: "Департамент здравоохранения города Москвы",
			};

			if (organizationId && UUID_REGEX.test(organizationId)) {
				const [org] = await db
					.select()
					.from(organizations)
					.where(eq(organizations.id, organizationId))
					.limit(1);

				if (org) {
					clinicData = {
						name: org.name || clinicData.name,
						inn: org.inn || clinicData.inn,
						kpp: org.kpp || clinicData.kpp,
						address: org.legalAddress || clinicData.address,
						phone: org.email || clinicData.phone,
						licenseNumber:
							org.medicalLicenseNumber || clinicData.licenseNumber,
						licenseIssuedDate:
							org.medicalLicenseIssuedAt || clinicData.licenseIssuedDate,
						licenseValidity: "Бессрочно",
						licenseIssuer:
							org.medicalLicenseIssuer || clinicData.licenseIssuer,
					};
				}
			}

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
					.where(eq(patients.id, body.patientId))
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

			// Данные приема/визита
			let appointmentContextData: TemplateExecutionContext["appointment"] = undefined;
			if (body.visitId && UUID_REGEX.test(body.visitId)) {
				const [visitRecord] = await db
					.select()
					.from(visits)
					.where(eq(visits.id, body.visitId))
					.limit(1);

				if (visitRecord) {
					appointmentContextData = {
						id: visitRecord.id,
						date: visitRecord.signedAt ?? visitRecord.createdAt,
					};
				}
			} else if (body.appointmentId && UUID_REGEX.test(body.appointmentId)) {
				const [appRecord] = await db
					.select()
					.from(appointments)
					.where(eq(appointments.id, body.appointmentId))
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

			// Данные активного врача
			let doctorContextData: TemplateExecutionContext["doctor"] = {
				fullName: "Васильев Иван Петрович",
				position: "Врач-стоматолог терапевт",
				specialty: "Стоматология терапевтическая",
			};

			if (body.doctorId && UUID_REGEX.test(body.doctorId)) {
				const [docUser] = await db
					.select()
					.from(users)
					.where(eq(users.id, body.doctorId))
					.limit(1);

				if (docUser) {
					doctorContextData = {
						fullName: docUser.fullName,
						position: docUser.role ?? "Врач-стоматолог",
						specialty: "Стоматология",
					};
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
				appointment: appointmentContextData,
				currentDate: new Date(),
				document: {
					number: `БЛ-${Math.floor(1000 + Math.random() * 9000)}`,
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
