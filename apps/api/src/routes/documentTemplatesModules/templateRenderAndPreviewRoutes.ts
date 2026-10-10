import { randomInt } from "node:crypto";
import {
	buildTemplateVariablesMap,
	renderDocumentTemplate,
	type TemplateExecutionContext,
} from "@dental/shared";
import { type SQL, and, eq, isNull, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { resolveOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	appointments,
	documentTemplates,
	organizations,
	patients,
	payments,
	users,
	visits,
} from "../../db/schema.js";
import {
	parsePassportFromString,
	resolveRenderTemplateContentHtml,
} from "./defaultStatutoryTemplates.js";
import {
	type DocumentTemplateIdParams,
	renderDocumentBodySchema,
	UUID_REGEX,
} from "./typesAndSchemas.js";

/**
 * Маршрут рендеринга и предпросмотра готового HTML бланка с подстановкой данных пациента/визита
 */
export async function registerTemplateRenderAndPreviewRoutes(
	app: FastifyInstance,
): Promise<void> {
	/**
	 * POST /api/document-templates/:id/render
	 * Рендеринг готового HTML бланка с подстановкой реальных данных пациента/визита
	 */
	app.post(
		"/api/document-templates/:id/render",
		async (
			request: FastifyRequest<{ Params: DocumentTemplateIdParams }>,
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

			const templateName = templateRecord?.name ?? identifier;
			const systemAlias = templateRecord?.systemAlias ?? identifier;
			const templateHtml = resolveRenderTemplateContentHtml(
				identifier,
				templateName,
				templateRecord?.contentHtml,
			);

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
					org.medicalLicenseIssuer ||
					"Департамент здравоохранения города Москвы",
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
					.where(
						and(
							eq(patients.id, body.patientId),
							eq(patients.organizationId, org.id),
						),
					)
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
						somaticStatus:
							(adminProfile as any)?.somaticStatus ?? patientRecord.notes ?? "",
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
			let appointmentContextData: TemplateExecutionContext["appointment"] =
				undefined;
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
					.where(
						and(
							eq(visits.id, body.visitId),
							eq(visits.organizationId, org.id),
						),
					)
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
							dentalFormulaContextData =
								autosave.draft.quality.detectedToothStates;
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
					.where(
						and(
							eq(appointments.id, body.appointmentId),
							eq(appointments.organizationId, org.id),
						),
					)
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
					.where(
						and(
							eq(payments.visitId, body.visitId),
							eq(payments.organizationId, org.id),
						),
					);

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
					.where(
						and(
							eq(users.id, body.doctorId),
							eq(users.organizationId, org.id),
						),
					)
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
					.where(
						and(
							eq(users.id, body.administratorId),
							eq(users.organizationId, org.id),
						),
					)
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
