import {
	createPatientSchema,
	patientSchema,
	updatePatientSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import {
	createPatientInDb,
	createPatientSafeInDb,
	getPatientByIdFromDb,
	getPatientsFromDb,
	updatePatientInDb,
} from "../../db/patientsQuery.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import {
	evaluateClinicalAccess,
	isClinicalSearchQuery,
	shouldStripMedicalData,
	stripDiagnosisPayload,
} from "../../security/medicalSecrecyWarden.js";
import {
	findPatientDuplicate,
	type PatientDuplicateInput,
	type PatientDuplicateResult,
} from "../../services/patients/duplicateDetection.js";
import {
	PATIENT_ID_UUID_PATTERN,
	parsePatientPayload,
	patientCreateValidationMessage,
	patientUpdateValidationMessage,
	requireClinicOrganizationId,
	sendPatientDuplicate,
	sendPatientNameOnlyDuplicate,
	sendPatientNotFound,
	sendPatientRouteValidationError,
} from "./helpers.js";
import { filterPatientsBySearchQuery } from "./patientSearchFilter.js";
import { registerPatientRecordsRoutes } from "./patientRecordsRoutes.js";

export function registerPatientCrudRoutes(app: FastifyInstance) {
	// Регистрация суб-маршрутов клинических записей формы 043/у
	registerPatientRecordsRoutes(app);

	app.get("/api/patients", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const query = (request.query || {}) as {
			search?: string;
			q?: string;
			includeMerged?: string | boolean;
			limit?: string | number;
			offset?: string | number;
		};
		const searchRaw = (query.search ?? query.q ?? "").trim();

		// 152-ФЗ / 323-ФЗ ст. 13: Защита от inference-атак (выявления больных через поиск по МКБ-10 и диагнозам)
		if (searchRaw) {
			const isMedicalSearch = isClinicalSearchQuery(searchRaw);
			if (isMedicalSearch) {
				const identity = getRequestIdentity(request);
				const reqAny = request as unknown as { user?: { role?: string | null } };
				const staffRole = identity.role ?? reqAny.user?.role ?? null;
				const evalAccess = evaluateClinicalAccess(staffRole);
				if (!evalAccess.hasClinicalAccess) {
					return reply.code(403).send({
						error: "MedicalSearchForbidden",
						permission: "patients.search.clinical",
						role: staffRole,
						message:
							"Поиск пациентов по клиническим диагнозам и кодам МКБ-10 для неклинического персонала запрещен (152-ФЗ / 323-ФЗ ст. 13).",
					});
				}
			}
		}

		const rawLimit =
			query.limit !== undefined
				? Number.parseInt(String(query.limit), 10)
				: undefined;
		const limit =
			Number.isFinite(rawLimit) && rawLimit! > 0
				? Math.min(rawLimit!, 500)
				: searchRaw
					? 50
					: undefined;
		const rawOffset =
			query.offset !== undefined
				? Number.parseInt(String(query.offset), 10)
				: undefined;
		const offset =
			Number.isFinite(rawOffset) && rawOffset! >= 0 ? rawOffset : undefined;

		try {
			let dbPatients = await getPatientsFromDb(orgId, {
				includeMerged:
					query.includeMerged === true || query.includeMerged === "true",
				search: searchRaw || undefined,
				limit,
				offset,
			});

			if (searchRaw) {
				dbPatients = filterPatientsBySearchQuery(dbPatients, searchRaw);
			}

			if (shouldStripMedicalData(request)) {
				const stripped = stripDiagnosisPayload(dbPatients);
				return stripped.map((patient) => patientSchema.parse(patient));
			}

			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				action: "VIEW_PATIENT_LIST",
				diagnosis: "Реестр пациентов клиники (152-ФЗ)",
				metadata: { count: dbPatients.length },
			});

			return dbPatients.map((patient) => patientSchema.parse(patient));
		} catch (e) {
			console.error("[Patients] Error fetching from DB:", e);
			return reply.code(500).send({
				error: "DatabaseError",
				message:
					"Сервер клиники не смог прочитать список пациентов. Не считайте, что картотека пуста — повторите через минуту, а если повторится, сообщите администратору.",
			});
		}
	});

	app.get("/api/patients/:patientId", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const params = request.params as { patientId?: string };
		if (
			!params.patientId ||
			!PATIENT_ID_UUID_PATTERN.test(params.patientId.trim())
		) {
			return sendPatientRouteValidationError(reply);
		}
		const patientId = params.patientId.trim();

		try {
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return sendPatientNotFound(reply);
			}

			// 152-ФЗ / 323-ФЗ ст. 13: Аудит доступа к медицинской карте
			const identity = getRequestIdentity(request);
			const reqAny = request as unknown as {
				user?: {
					role?: string | null;
					canSignMedicalRecords?: boolean;
					clinicalRole?: string | null;
				};
				headers: Record<string, string | string[] | undefined>;
			};
			const authenticatedRole = identity.role ?? reqAny.user?.role ?? null;
			const isSuperAdmin =
				authenticatedRole === "super_admin" ||
				authenticatedRole === "system" ||
				authenticatedRole === "owner" ||
				authenticatedRole === "admin";
			const staffRole =
				(isSuperAdmin
					? (typeof reqAny.headers["x-user-role"] === "string"
							? reqAny.headers["x-user-role"]
							: null) ??
						(typeof reqAny.headers["x-staff-role"] === "string"
							? reqAny.headers["x-staff-role"]
							: null)
					: null) ?? authenticatedRole;

			if (staffRole) {
				const evalAccess = evaluateClinicalAccess(staffRole, {
					clinicalRole:
						(identity as unknown as { clinicalRole?: string | null })
							.clinicalRole ??
						reqAny.user?.clinicalRole ??
						(isSuperAdmin &&
						typeof reqAny.headers["x-clinical-role"] === "string"
							? reqAny.headers["x-clinical-role"]
							: null),
					canSignMedicalRecords:
						(identity as unknown as { canSignMedicalRecords?: boolean })
							.canSignMedicalRecords ??
						reqAny.user?.canSignMedicalRecords ??
						(isSuperAdmin &&
							reqAny.headers["x-can-sign-medical-records"] === "true"),
				});

				if (evalAccess.hasClinicalAccess) {
					await auditMedicalAccessFromRequest(request, {
						organizationId: orgId,
						patientId,
						action: "VIEW_PATIENT_MEDICAL_RECORD",
					});
				} else {
					await auditMedicalAccessFromRequest(request, {
						organizationId: orgId,
						patientId,
						action: "DIAGNOSIS_ACCESS_STRIPPED",
						diagnosis: "Врачебная тайна скрыта согласно 152-ФЗ",
					});
				}
			}

			if (patient.status === "archived") {
				const evalAccess = staffRole
					? evaluateClinicalAccess(staffRole, {
							clinicalRole:
								(identity as unknown as { clinicalRole?: string | null })
									.clinicalRole ??
								reqAny.user?.clinicalRole ??
								(typeof reqAny.headers["x-clinical-role"] === "string"
									? reqAny.headers["x-clinical-role"]
									: null),
							canSignMedicalRecords:
								(identity as unknown as { canSignMedicalRecords?: boolean })
									.canSignMedicalRecords ??
								reqAny.user?.canSignMedicalRecords ??
								reqAny.headers["x-can-sign-medical-records"] === "true",
						})
					: { hasClinicalAccess: false, reason: "Анонимный запрос без роли медработника" };

				if (!evalAccess.hasClinicalAccess) {
					await auditMedicalAccessFromRequest(request, {
						organizationId: orgId,
						patientId,
						action: "ACCESS_DENIED_ARCHIVED_PATIENT",
						diagnosis: "Попытка извлечения медицинской карты архивированного пациента неклиническим персоналом (152-ФЗ / 323-ФЗ ст. 13)",
					});
					return reply.code(403).send({
						error: "PermissionDenied",
						permission: "patients.archived.read",
						role: staffRole,
						message: `Отказ в доступе к медицинской карте архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): извлечение данных архивированных пациентов неклиническим персоналом («${staffRole ?? "unauthorized"}») запрещено.`,
					});
				}
			}

			if (shouldStripMedicalData(request)) {
				const stripped = stripDiagnosisPayload(patient);
				return reply.send(patientSchema.parse(stripped));
			}

			return reply.send(patientSchema.parse(patient));
		} catch (e) {
			console.error("[Patients] Error fetching patient by ID:", e);
			return reply.code(500).send({
				error: "DatabaseError",
				message: "Не удалось загрузить данные карточки пациента.",
			});
		}
	});

	app.post("/api/patients", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const input = parsePatientPayload(createPatientSchema, request.body);
		if (!input) {
			return reply.code(400).send({
				error: "PatientValidationError",
				message: patientCreateValidationMessage,
			});
		}

		const rawPayloadCreate = (request.body && typeof request.body === "object" ? request.body : {}) as {
			administrativeProfile?: { isAnonymous?: boolean; insurancePolicyNumber?: string | null; snils?: string | null };
			isAnonymous?: boolean;
		};
		const isAnonCreate =
			Boolean(rawPayloadCreate.isAnonymous) ||
			Boolean(rawPayloadCreate.administrativeProfile?.isAnonymous) ||
			Boolean(input.fullName?.startsWith("UUID_ANON")) ||
			Boolean(input.fullName?.toLowerCase().includes("аноним"));
		const policyCreate =
			typeof rawPayloadCreate.administrativeProfile?.insurancePolicyNumber === "string"
				? rawPayloadCreate.administrativeProfile.insurancePolicyNumber.trim()
				: "";
		if (isAnonCreate && policyCreate.length > 0) {
			return reply.code(422).send({
				error: "Decree659OmsForbiddenError",
				message:
					"Блокировка по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 Федерального закона № 326-ФЗ: привязка полиса ОМС к анонимной карте категорически запрещена. Для использования полиса ОМС требуется деанонимизация пациента с предъявлением паспорта РФ и СНИЛС.",
			});
		}
		const rawBody =
			request.body && typeof request.body === "object"
				? (request.body as Record<string, unknown>)
				: {};
		const inputWithSnils = {
			...input,
			snils:
				(rawBody.snils as string | undefined) ??
				(rawPayloadCreate.administrativeProfile?.snils as string | undefined) ??
				null,
		};
		try {
			const safeResult = await createPatientSafeInDb(
				orgId,
				inputWithSnils,
				(patients, inp) => {
					return findPatientDuplicate(patients, inp, undefined, {
						requireDistinguishingData: true,
					});
				},
			);

			if (safeResult.type === "duplicate") {
				const dup = safeResult.duplicate as PatientDuplicateResult | null;
				if (rawBody.allowDuplicate === true || (input as { allowDuplicate?: boolean }).allowDuplicate === true) {
					const created = await createPatientInDb(orgId, inputWithSnils);
					return reply.code(201).send(patientSchema.parse(created));
				}
				if (dup?.isNameOnlyDuplicate) {
					return sendPatientNameOnlyDuplicate(reply, dup.candidate);
				}
				return sendPatientDuplicate(reply, dup ?? undefined);
			}

			return reply.code(201).send(patientSchema.parse(safeResult.patient));
		} catch (e) {
			console.error("[Patients] Create error:", e);
			return reply.code(500).send({
				error: "DatabaseError",
				message:
					"Сервер клиники не подтвердил запись — пациент мог не сохраниться. Найдите его в списке перед повторным созданием, иначе на одного человека появятся две карты.",
			});
		}
	});

	app.put("/api/patients/:patientId", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const params = request.params as { patientId?: string };
		if (!params.patientId) return sendPatientRouteValidationError(reply);
		const input = parsePatientPayload(updatePatientSchema, request.body);
		if (!input) {
			return reply.code(400).send({
				error: "PatientValidationError",
				message: patientUpdateValidationMessage,
			});
		}

		const rawPayload = (request.body && typeof request.body === "object" ? request.body : {}) as {
			administrativeProfile?: { isAnonymous?: boolean; insurancePolicyNumber?: string | null };
		};
		const isAnonUpdate =
			Boolean(input.isAnonymous) ||
			Boolean(rawPayload.administrativeProfile?.isAnonymous) ||
			Boolean(input.fullName?.startsWith("UUID_ANON")) ||
			Boolean(input.fullName?.toLowerCase().includes("аноним"));
		const policyUpdate =
			typeof rawPayload.administrativeProfile?.insurancePolicyNumber === "string"
				? rawPayload.administrativeProfile.insurancePolicyNumber.trim()
				: "";
		if (isAnonUpdate && policyUpdate.length > 0) {
			return reply.code(422).send({
				error: "Decree659OmsForbiddenError",
				message:
					"Блокировка по Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 Федерального закона № 326-ФЗ: привязка полиса ОМС к анонимной карте категорически запрещена. Для использования полиса ОМС требуется деанонимизация пациента с предъявлением паспорта РФ и СНИЛС.",
			});
		}

		try {
			const dbPatients = await getPatientsFromDb(orgId);
			const rawBody =
				request.body && typeof request.body === "object"
					? (request.body as Record<string, unknown>)
					: {};
			const inputWithSnils: PatientDuplicateInput = {
				fullName: input.fullName,
				birthDate: input.birthDate,
				phone: input.phone,
				snils: (rawBody.snils as string | undefined) ?? null,
				administrativeProfile: (rawBody.administrativeProfile as Record<string, unknown> | undefined) ?? null,
			};
			const duplicate = findPatientDuplicate(
				dbPatients,
				inputWithSnils,
				params.patientId,
			);
			if (duplicate) return sendPatientDuplicate(reply, duplicate);

			const patient = await updatePatientInDb(orgId, params.patientId, input);
			if (!patient) return sendPatientNotFound(reply);
			return patientSchema.parse(patient);
		} catch (e) {
			const msg = e instanceof Error ? e.message : "";
			if (
				msg.includes("семейная группа не найдена") ||
				msg.includes("уже состоит в другой семейной группе")
			) {
				return reply.code(400).send({
					error: "PatientValidationError",
					message: msg,
				});
			}

			request.log.error({ err: e }, "[Patients] Ошибка обновления пациента");
			return reply.code(500).send({
				error: "PatientUpdateFailed",
				message:
					"Не удалось сохранить изменения. Данные могли быть записаны — обновите карточку перед повторным вводом.",
			});
		}
	});
}
