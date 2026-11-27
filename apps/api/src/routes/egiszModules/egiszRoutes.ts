import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	namedDevelopmentModeActive,
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { db, type TenantDb } from "../../db/client.js";
import { withSuperuserBypass, withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import * as schema from "../../db/schema.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { canonicalizeCdaXml, egiszRemdPackageSchema, type EgiszRemdPackage } from "../../services/cda/index.js";
import { createDemonstrationGostSignature } from "@dental/shared/cda";
import { isValidUuid } from "@dental/shared";
import { extractIdempotencyKey } from "../../utils/httpIdempotency.js";
import { generateDentalCdaXml } from "../../services/egiszCdaGenerator.js";
import { assembleVisitCdaParams } from "../egisz/visitCda/buildVisitCdaParams.js";
import { fetchDiaryRow, fetchVisitRow, resolveDoctorFromAppointmentOrDiary } from "../egisz/visitCda/fetchVisitCdaData.js";
import { EgiszOutboxDispatcher } from "../../services/egisz/EgiszOutboxDispatcher.js";
import { extractIcd10, readGatewayConfig, readGenderFromProfile, readSnilsFromProfile, splitFullName } from "../egisz/helpers.js";
import { registerN3HealthRoutes } from "../egisz/n3HealthRoutes.js";
import { resolveN3HealthConfig } from "../egisz/n3/n3Config.js";
import { registerEgiszOutboxRoutes } from "../egisz/outboxRoutes.js";
import { registerVisitCdaExportRoute } from "../egisz/visitCdaExport.js";
import {
	resolveEgiszIntegrationStatus,
	verifyDoctorFrmrProfile,
	verifyDoctorSnilsForFrmr,
} from "./egiszAuthService.js";
import {
	egiszBlankPermissionsPatchSchema,
	egiszLogsParamsSchema,
	egiszMultipleDiagnosesQuerySchema,
	egiszSendBodySchema,
	validateDoctorSnilsBodySchema,
} from "./egiszTypes.js";
import { dispatchPackageToVimis } from "./egiszVimisSender.js";

function normalizeBlankLabel(code: string, title: string): { formCode: string; fieldName: string } {
	if (code.includes("043") || title.includes("043") || title.toLowerCase().includes("медицинская карта")) {
		return { formCode: "Медицинская карта приёма", fieldName: "Анамнез, дневник приёма и зубная формула" };
	}
	if (code.includes("101") || title.toLowerCase().includes("консультац")) {
		return { formCode: "Протокол консультации и осмотра", fieldName: "Первичный и повторный осмотр врача-стоматолога" };
	}
	if (code.includes("108") || title.includes("КЛКТ") || title.toLowerCase().includes("исследован")) {
		return { formCode: "Протокол КЛКТ 3D и рентген-снимков", fieldName: "Описание КЛКТ 3D, панорамных и прицельных снимков" };
	}
	if (code.includes("ИДС") || title.toLowerCase().includes("согласие")) {
		return { formCode: "Информированное добровольное согласие (ИДС)", fieldName: "Согласие пациента на стоматологическое вмешательство" };
	}
	if (code.includes("1151156") || title.toLowerCase().includes("налогов") || title.toLowerCase().includes("справка")) {
		return { formCode: "Справка об оплате медицинских услуг для налогового вычета", fieldName: "Данные об оплаченных услугах для оформления вычета" };
	}
	return { formCode: code, fieldName: title };
}

async function checkEgiszBlankPermissionsAndOptOut(params: {
	orgId: string;
	patientId: string;
	docTypeNsiCode?: string | undefined;
	targetDb?: TenantDb;
}): Promise<{ allowed: true } | { allowed: false; status: 403; error: string; message: string }> {
	const { orgId, patientId, docTypeNsiCode, targetDb = db } = params;
	const permissionRows = await targetDb
		.select({
			blankCode: schema.egiszBlankPermissions.blankCode,
			blankTitle: schema.egiszBlankPermissions.blankTitle,
			isAllowed: schema.egiszBlankPermissions.isAllowed,
			patientOptOutRespect: schema.egiszBlankPermissions.patientOptOutRespect,
		})
		.from(schema.egiszBlankPermissions)
		.where(eq(schema.egiszBlankPermissions.organizationId, orgId));

	const matchingRows = permissionRows.filter((row) => {
		const codeLower = (row.blankCode || "").toLowerCase();
		const titleLower = (row.blankTitle || "").toLowerCase();
		if (docTypeNsiCode && (codeLower.includes(docTypeNsiCode.toLowerCase()) || titleLower.includes(docTypeNsiCode.toLowerCase()))) {
			return true;
		}
		if (docTypeNsiCode === "108" || !docTypeNsiCode) {
			return (
				codeLower.includes("медицинская карта") ||
				codeLower.includes("протокол") ||
				codeLower.includes("043") ||
				codeLower === "all"
			);
		}
		return false;
	});

	const blockedBlank = matchingRows.find((r) => r.isAllowed === false);
	if (blockedBlank) {
		return {
			allowed: false,
			status: 403,
			error: "EgiszBlankExportForbidden",
			message: `Выгрузка бланка «${blockedBlank.blankTitle || blockedBlank.blankCode}» в ЕГИСЗ запрещена политикой клиники.`,
		};
	}

	const respectOptOut =
		matchingRows.length === 0
			? true
			: matchingRows.some((r) => r.patientOptOutRespect !== false);

	if (respectOptOut) {
		const [consents, patientRows] = await Promise.all([
			targetDb
				.select({
					kind: schema.patientConsents.kind,
					grantedAt: schema.patientConsents.grantedAt,
					revokedAt: schema.patientConsents.revokedAt,
				})
				.from(schema.patientConsents)
				.where(
					and(
						eq(schema.patientConsents.organizationId, orgId),
						eq(schema.patientConsents.patientId, patientId),
					),
				),
			targetDb
				.select({ administrativeProfile: schema.patients.administrativeProfile })
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.id, patientId),
						eq(schema.patients.organizationId, orgId),
					),
				)
				.limit(1),
		]);

		const hasRefusalConsent = consents.some((c) => {
			const kindLower = (c.kind || "").toLowerCase();
			if (
				kindLower === "egisz_opt_out" ||
				kindLower === "otkaz_v_peredache_dannykh_v_egisz" ||
				kindLower === "egisz_refusal"
			) {
				return c.grantedAt !== null && c.revokedAt === null;
			}
			if (kindLower === "egisz_transfer" || kindLower === "egisz") {
				return c.revokedAt !== null;
			}
			return false;
		});

		const adminProfile = patientRows[0]?.administrativeProfile as Record<string, unknown> | null | undefined;
		const consentSignatures = adminProfile?.consentSignatures as Record<string, unknown> | null | undefined;
		const hasProfileOptOut =
			adminProfile?.egiszOptOut === true ||
			adminProfile?.otkazVPeredacheDannykhVEgisz === true ||
			consentSignatures?.egiszOptOut === true ||
			consentSignatures?.otkaz_v_peredache_dannykh_v_egisz === true;

		if (hasRefusalConsent || hasProfileOptOut) {
			return {
				allowed: false,
				status: 403,
				error: "PatientEgiszOptOut",
				message: "Пациент оформил отказ от передачи медицинских данных в ЕГИСЗ.",
			};
		}
	}

	return { allowed: true };
}

export async function registerEgiszModularRoutes(app: FastifyInstance) {
	await registerN3HealthRoutes(app);

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/clinical/egisz/integration-status",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz status check"))) return;
			return reply.status(200).send(resolveEgiszIntegrationStatus());
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/egisz/validate-doctor-snils",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz snils validation"))) return;
			const parsed = validateDoctorSnilsBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({ ok: false, error: "ValidationError", message: "Тело запроса должно быть JSON-объектом с полем snils или doctorId." });
			}
			const identity = getRequestIdentity(request);
			const orgId = identity.organizationId;
			const targetDoctorId = parsed.data.doctorId || (parsed.data.snils ? undefined : identity.userId);

			// Если передан doctorId или проверяется текущий вошедший пользователь — делаем глубокую проверку в БД users
			if (targetDoctorId) {
				const verifyParams = {
					doctorId: targetDoctorId,
					snils: parsed.data.snils,
					organizationId: orgId || undefined,
				};
				const profileRes = orgId
					? await withTenantReadCtx(orgId, (tx) => verifyDoctorFrmrProfile(tx, verifyParams))
					: await withSuperuserBypass((tx) => verifyDoctorFrmrProfile(tx, verifyParams));
				if (!profileRes.valid) {
					return reply.status(200).send({
						ok: false,
						status: profileRes.status,
						error: profileRes.error,
						message: profileRes.message,
						snilsFormatted: profileRes.snilsFormatted,
						validForFrmr: false,
					});
				}
				return reply.status(200).send({
					ok: true,
					status: profileRes.status,
					snilsFormatted: profileRes.snilsFormatted,
					validForFrmr: true,
					doctor: profileRes.doctor,
				});
			}

			// Быстрая проверка формата/контрольной суммы СНИЛС
			const res = verifyDoctorSnilsForFrmr(parsed.data.snils);
			if (!res.valid) {
				return reply.status(400).send({ ok: false, error: res.error, message: res.message });
			}
			return reply.status(200).send({ ok: true, snilsFormatted: res.snilsFormatted, validForFrmr: true });
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/integrations/egisz-blank-permissions",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz permissions check"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			let rows = await withTenantReadCtx(orgId, (tx) =>
				tx
					.select()
					.from(schema.egiszBlankPermissions)
					.where(eq(schema.egiszBlankPermissions.organizationId, orgId)),
			);

			if (rows.length === 0) {
				rows = await withTenantWriteCtx(orgId, async (tx) => {
					const existing = await tx
						.select()
						.from(schema.egiszBlankPermissions)
						.where(eq(schema.egiszBlankPermissions.organizationId, orgId));
					if (existing.length > 0) return existing;

					const [org] = await tx
						.select({ id: schema.organizations.id })
						.from(schema.organizations)
						.where(eq(schema.organizations.id, orgId))
						.limit(1);

					if (org) {
						const [doc] = await tx
							.select({ id: schema.users.id })
							.from(schema.users)
							.where(eq(schema.users.organizationId, orgId))
							.limit(1);

						const doctorId = doc?.id;
						if (doctorId) {
							const defaults = [
								{ organizationId: orgId, doctorId, blankCode: "Медицинская карта приёма", blankTitle: "Анамнез, дневник приёма и зубная формула", isAllowed: true, patientOptOutRespect: true },
								{ organizationId: orgId, doctorId, blankCode: "Протокол консультации и осмотра", blankTitle: "Первичный и повторный осмотр врача-стоматолога", isAllowed: true, patientOptOutRespect: true },
								{ organizationId: orgId, doctorId, blankCode: "Протокол КЛКТ 3D и рентген-снимков", blankTitle: "Описание КЛКТ 3D, панорамных и прицельных снимков", isAllowed: true, patientOptOutRespect: true },
								{ organizationId: orgId, doctorId, blankCode: "Информированное добровольное согласие (ИДС)", blankTitle: "Согласие пациента на стоматологическое вмешательство", isAllowed: true, patientOptOutRespect: true },
								{ organizationId: orgId, doctorId, blankCode: "Справка об оплате медицинских услуг для налогового вычета", blankTitle: "Данные об оплаченных услугах для оформления вычета", isAllowed: false, patientOptOutRespect: true },
							];

							await tx
								.insert(schema.egiszBlankPermissions)
								.values(defaults)
								.onConflictDoNothing();

							return tx
								.select()
								.from(schema.egiszBlankPermissions)
								.where(eq(schema.egiszBlankPermissions.organizationId, orgId));
						}
					}
					return existing;
				});
			}

			return reply.status(200).send(rows.map((r) => {
				const norm = normalizeBlankLabel(r.blankCode, r.blankTitle);
				return { id: r.id, formCode: norm.formCode, fieldName: norm.fieldName, isExportAllowed: r.isAllowed, patientOptOutRespect: r.patientOptOutRespect, requiredStaffRole: "Главврач / Врач / Админ" };
			}));
		},
	});

	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/integrations/egisz-blank-permissions/:id",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await requireClinicalMutationAccess(request, reply, "egisz permissions update"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const rawParams = request.params as { id?: string };
			const permissionId = rawParams.id?.trim();
			if (!permissionId || !isValidUuid(permissionId)) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Идентификатор правила выгрузки бланка должен быть валидным UUID.",
				});
			}

			const parsed = egiszBlankPermissionsPatchSchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры обновления прав выгрузки бланка ЕГИСЗ.",
					details: parsed.error.issues,
				});
			}
			const body = parsed.data;
			const updated = await withTenantWriteCtx(orgId, async (tx) => {
				const [existing] = await tx
					.select()
					.from(schema.egiszBlankPermissions)
					.where(and(eq(schema.egiszBlankPermissions.id, permissionId), eq(schema.egiszBlankPermissions.organizationId, orgId)))
					.limit(1);
				if (!existing) {
					return "not_found" as const;
				}

				const [saved] = await tx
					.update(schema.egiszBlankPermissions)
					.set({
						...(typeof body.isExportAllowed === "boolean" && { isAllowed: body.isExportAllowed }),
						...(typeof body.patientOptOutRespect === "boolean" && { patientOptOutRespect: body.patientOptOutRespect }),
					})
					.where(and(eq(schema.egiszBlankPermissions.id, permissionId), eq(schema.egiszBlankPermissions.organizationId, orgId)))
					.returning();
				return saved ?? null;
			});

			if (updated === "not_found") {
				return reply.status(404).send({ error: "PermissionNotFound", message: "Правило выгрузки бланка ЕГИСЗ не найдено в вашей клинике." });
			}
			if (!updated) {
				return reply.status(500).send({ error: "UpdateFailed", message: "Не удалось сохранить правило выгрузки бланка в ЕГИСЗ." });
			}
			return reply.status(200).send({ id: updated.id, formCode: updated.blankCode, fieldName: updated.blankTitle, isExportAllowed: updated.isAllowed, patientOptOutRespect: updated.patientOptOutRespect, requiredStaffRole: "Врач-стоматолог / Главный врач" });
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/egisz/multiple-diagnoses",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz multiple diagnoses read"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsedQuery = egiszMultipleDiagnosesQuerySchema.safeParse(request.query);
			if (!parsedQuery.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Параметр patientId обязателен и должен быть валидным UUID.",
				});
			}

			// Запрещаем утечку врачебной тайны: строгая изоляция по organizationId и patientId
			const diagnoses = await withTenantReadCtx(orgId, (tx) =>
				tx
					.select()
					.from(schema.egiszMultipleDiagnoses)
					.where(
						and(
							eq(schema.egiszMultipleDiagnoses.organizationId, orgId),
							eq(schema.egiszMultipleDiagnoses.patientId, parsedQuery.data.patientId),
						),
					),
			);
			return reply.send(diagnoses);
		},
	});

	registerVisitCdaExportRoute(app);

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/egisz/logs/:patientId",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz logs read"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const parsed = egiszLogsParamsSchema.safeParse(request.params);
			if (!parsed.success) return reply.status(400).send({ error: "ValidationError", message: "Идентификатор пациента в адресе должен быть UUID." });

			const logs = await withTenantReadCtx(orgId, (tx) =>
				tx.select({ id: schema.egiszLogs.id, visitId: schema.egiszLogs.visitId, status: schema.egiszLogs.status, errorDetails: schema.egiszLogs.errorDetails, createdAt: schema.egiszLogs.createdAt })
					.from(schema.egiszLogs).where(and(eq(schema.egiszLogs.patientId, parsed.data.patientId), eq(schema.egiszLogs.organizationId, orgId))),
			);
			return reply.status(200).send({ logs });
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/egisz/send",
		permission: "public",
		handler: async ({ request, reply }) => {
			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
				});
			}

			if (!(await requireClinicalMutationAccess(request, reply, "egisz send"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const body = egiszSendBodySchema.parse(request.body);

			const reqPkgMeta =
				body.pkg && typeof body.pkg.metadata === "object" && body.pkg.metadata !== null
					? (body.pkg.metadata as Record<string, unknown>)
					: null;
			const reqDocTypeCode =
				typeof reqPkgMeta?.docTypeNsiCode === "string" ? reqPkgMeta.docTypeNsiCode : "108";
			const identity = getRequestIdentity(request);

			const preflight = await withTenantReadCtx(orgId, async (tx) => {
				const [patient] = await tx.select({ id: schema.patients.id }).from(schema.patients).where(and(eq(schema.patients.id, body.patientId), eq(schema.patients.organizationId, orgId))).limit(1);
				if (!patient) return { kind: "err" as const, status: 404, payload: { error: "PatientNotFound", message: "Пациент не найден в текущей клинике." } };

				const row = await fetchVisitRow(body.visitId, orgId, tx);
				if (!row) return { kind: "err" as const, status: 404, payload: { error: "VisitNotFound", message: "Приём не найден в текущей клинике." } };
				if (row.visit.patientId !== body.patientId) return { kind: "err" as const, status: 400, payload: { error: "VisitPatientMismatch", message: "Указанный приём принадлежит другому пациенту." } };

				const permissionCheck = await checkEgiszBlankPermissionsAndOptOut({
					orgId,
					patientId: body.patientId,
					docTypeNsiCode: reqDocTypeCode,
					targetDb: tx,
				});
				if (!permissionCheck.allowed) {
					return { kind: "err" as const, status: permissionCheck.status, payload: { error: permissionCheck.error, message: permissionCheck.message } };
				}

				const diaryRow = await fetchDiaryRow(body.visitId, orgId, tx);
				const doctorRes = await resolveDoctorFromAppointmentOrDiary(row.visit.appointmentId, diaryRow, orgId, tx);
				let doctorId = diaryRow?.doctorId || identity.userId || null;
				if (!doctorId) {
					const [fallbackDoc] = await tx
						.select({ id: schema.users.id })
						.from(schema.users)
						.where(eq(schema.users.organizationId, orgId))
						.limit(1);
					doctorId = fallbackDoc?.id ?? null;
				}
				if (!doctorId) {
					return {
						kind: "err" as const,
						status: 422,
						payload: {
							error: "DoctorRequired",
							message: "Не удалось определить лечащего врача для отправки документа в ЕГИСЗ.",
						},
					};
				}

				const n3Res = body.pkg ? null : await resolveN3HealthConfig(orgId, tx);
				const [clinicRow] = body.pkg
					? [undefined]
					: await tx.select({ address: schema.clinics.address, phone: schema.clinics.phone }).from(schema.clinics).where(eq(schema.clinics.organizationId, orgId)).limit(1);

				return { kind: "ok" as const, row, diaryRow, doctorRes, doctorId, n3Res, clinicRow };
			});

			if (preflight.kind === "err") {
				return reply.status(preflight.status).send(preflight.payload);
			}

			const { row, diaryRow, doctorRes, doctorId, n3Res, clinicRow } = preflight;
			const dispatcher = new EgiszOutboxDispatcher();
			let pkg: EgiszRemdPackage;
			if (body.pkg) {
				const parsedPkg = egiszRemdPackageSchema.safeParse(body.pkg);
				if (!parsedPkg.success) {
					return reply.status(400).send({
						error: "ValidationError",
						message: "Некорректный формат пакета СЭМД РЭМД ЕГИСЗ (pkg)",
						issues: parsedPkg.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
					});
				}
				pkg = parsedPkg.data;
			} else {
				const birthStr = typeof row.patient.birthDate === "string" ? row.patient.birthDate.trim() : "";
				if (!birthStr) {
					return reply.status(422).send({
						error: "PatientBirthDateRequired",
						message: "Для формирования СЭМД РЭМД ЕГИСЗ необходима дата рождения пациента.",
					});
				}
				const clinicOid = n3Res?.config?.clinicOid || readGatewayConfig().clinicOid || "";
				const patientSnilsDigits = readSnilsFromProfile(row.patient.administrativeProfile);
				const diaryIcd = typeof diaryRow?.diagnosisIcd10 === "string" ? diaryRow.diagnosisIcd10.trim() : "";
				const effectiveDiagnosis = typeof row.visit.diagnosis === "string" && row.visit.diagnosis.trim() ? row.visit.diagnosis.trim() : (diaryIcd || "K02.1");
				const resolvedIcd10 = diaryIcd || extractIcd10(effectiveDiagnosis) || "K02.1";
				const parsedGender = readGenderFromProfile(row.patient.administrativeProfile);
				const patientGender: "male" | "female" = parsedGender === "female" ? "female" : "male";
				const patientNameParts = splitFullName(typeof row.patient.fullName === "string" ? row.patient.fullName : "Пациент");
				const clinicName = typeof row.organization.name === "string" && row.organization.name.trim() ? row.organization.name.trim() : "Стоматологическая клиника";

				const cdaParams = assembleVisitCdaParams({
					row,
					clinicRow,
					diaryRow,
					doctorName: doctorRes.doctorName,
					doctorContact: doctorRes.doctorContact,
					doctorPosition: doctorRes.doctorPosition,
					doctorPositionCode: doctorRes.doctorPositionCode,
					resolvedIcd10,
					effectiveDiagnosis,
					encounterDate: doctorRes.encounterDate || row.visit.createdAt,
					clinicOid,
					clinicName,
					patientNameParts,
					patientSnilsDigits,
					birthStr,
					patientGender,
					anamnesis: (typeof diaryRow?.anamnesis === "string" ? diaryRow.anamnesis.trim() : "") || (typeof row.visit.anamnesis === "string" ? row.visit.anamnesis.trim() : ""),
					objectiveStatus: (typeof diaryRow?.statusLocalis === "string" ? diaryRow.statusLocalis.trim() : "") || (typeof row.visit.objectiveStatus === "string" ? row.visit.objectiveStatus.trim() : ""),
					complications: typeof diaryRow?.complications === "string" ? diaryRow.complications.trim() : undefined,
					comorbidities: typeof diaryRow?.comorbidities === "string" ? diaryRow.comorbidities.trim() : undefined,
					instrumentTrayBarcode: typeof diaryRow?.instrumentTrayBarcode === "string" ? diaryRow.instrumentTrayBarcode.trim() : undefined,
					diagnosisTooth: typeof diaryRow?.diagnosisTooth === "string" ? diaryRow.diagnosisTooth.trim() : undefined,
					treatmentPlan: (typeof diaryRow?.treatmentDescription === "string" ? diaryRow.treatmentDescription.trim() : "") || (typeof row.visit.treatmentPlan === "string" ? row.visit.treatmentPlan.trim() : ""),
				});
				const cdaRes = generateDentalCdaXml(cdaParams);
				if (!cdaRes.success) {
					return reply.status(422).send({ error: "CdaGenerationFailed", message: "Ошибка схемы CDA.", details: cdaRes.error.issues });
				}
				const canonicalXml = cdaRes.xml;
				if (!namedDevelopmentModeActive()) {
					return reply.status(422).send({
						error: "MissingDoctorSignature",
						message: "Документ не подписан УКЭП врача. Отправка неподписанного СЭМД в ЕГИСЗ запрещена (63-ФЗ, 323-ФЗ).",
					});
				}
				const doctorFullName = `${doctorRes.doctorName.last} ${doctorRes.doctorName.first}`.trim() || "Врач-стоматолог";
				const docSig = createDemonstrationGostSignature({
					doctorName: doctorFullName,
					doctorSnils: "000-000-000 00",
					clinicName,
				});
				pkg = {
					documentId: body.visitId,
					documentVersion: 1,
					xmlCanonicalPayload: canonicalXml,
					doctorSignature: docSig,
					metadata: {
						patientSnils: patientSnilsDigits || undefined,
						clinicOid,
						docTypeNsiCode: "108",
					},
				};
			}

			const enqueueRes = await dispatcher.enqueueSignedPackage({
				organizationId: orgId,
				patientId: body.patientId,
				visitId: body.visitId,
				doctorId,
				documentId: pkg.documentId || body.visitId,
				pkg,
				actorUserId: identity.userId || undefined,
			});

			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}

			return reply.status(200).send({
				success: true,
				logId: enqueueRes.logId,
				outboxId: enqueueRes.outboxId,
				status: enqueueRes.status,
			});
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/egisz/packages",
		permission: "public",
		handler: async ({ request, reply }) => {
			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
				});
			}

			if (!(await requireClinicalMutationAccess(request, reply, "egisz package submit"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const rawInput =
				request.body && typeof request.body === "object" && !Array.isArray(request.body)
					? (request.body as Record<string, unknown>)
					: null;
			const preservedVisitId =
				rawInput && typeof rawInput.visitId === "string" ? rawInput.visitId : undefined;

			let bodyToParse: Record<string, unknown> | unknown = request.body;
			if (rawInput && (rawInput.cdaXml || rawInput.visitId) && (!rawInput.xmlCanonicalPayload || !rawInput.documentId)) {
				const metadata =
					rawInput.metadata && typeof rawInput.metadata === "object"
						? (rawInput.metadata as Record<string, unknown>)
						: {};
				bodyToParse = {
					documentId: rawInput.documentId || rawInput.visitId,
					documentVersion: typeof rawInput.documentVersion === "number" ? rawInput.documentVersion : 1,
					xmlCanonicalPayload: canonicalizeCdaXml(String(rawInput.xmlCanonicalPayload || rawInput.cdaXml || "")),
					doctorSignature: rawInput.doctorSignature,
					...(rawInput.moSignature || rawInput.clinicSignature ? { moSignature: rawInput.moSignature || rawInput.clinicSignature } : {}),
					metadata: {
						patientSnils: String(metadata.patientSnils || rawInput.patientSnils || "").replace(/\D/g, ""),
						clinicOid: String(metadata.clinicOid || rawInput.clinicOid || (await resolveN3HealthConfig(orgId)).config?.clinicOid || readGatewayConfig().clinicOid || ""),
						...(metadata.clinicOgrn || rawInput.clinicOgrn ? { clinicOgrn: String(metadata.clinicOgrn || rawInput.clinicOgrn) } : {}),
						docTypeNsiCode: String(metadata.docTypeNsiCode || rawInput.docType || "108"),
					},
				};
			}

			const parsed = egiszRemdPackageSchema.safeParse(bodyToParse);
			if (!parsed.success) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректный формат пакета СЭМД РЭМД ЕГИСЗ", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
			}
			const pkg = parsed.data;

			const rawVisitId = preservedVisitId ?? pkg.documentId;
			const isVisitUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawVisitId);
			if (!isVisitUuid) {
				return reply.status(404).send({ error: "VisitNotFound", message: "Идентификатор приёма должен быть валидным UUID." });
			}

			const parsedQuery = z.object({ sync: z.enum(["true", "false"]).optional() }).strict().safeParse(request.query ?? {});
			if (!parsedQuery.success) {
				return reply.status(400).send({ error: "ValidationError", message: "Некорректные параметры запроса sync." });
			}
			const isSync = parsedQuery.data.sync === "true";
			const identity = getRequestIdentity(request);

			const pkgPreflight = await withTenantReadCtx(orgId, async (tx) => {
				const [visit] = await tx.select({ id: schema.visits.id, patientId: schema.visits.patientId }).from(schema.visits).where(and(eq(schema.visits.id, rawVisitId), eq(schema.visits.organizationId, orgId))).limit(1);
				if (!visit) return { kind: "err" as const, status: 404, payload: { error: "VisitNotFound", message: "Приём не найден в текущей клинике." } };

				const pkgPermissionCheck = await checkEgiszBlankPermissionsAndOptOut({
					orgId,
					patientId: visit.patientId,
					docTypeNsiCode: pkg.metadata?.docTypeNsiCode || "108",
					targetDb: tx,
				});
				if (!pkgPermissionCheck.allowed) {
					return { kind: "err" as const, status: pkgPermissionCheck.status, payload: { error: pkgPermissionCheck.error, message: pkgPermissionCheck.message } };
				}

				let resolvedDoctorId = identity.userId ?? null;
				if (!resolvedDoctorId) {
					const [fallbackDoc] = await tx
						.select({ id: schema.users.id })
						.from(schema.users)
						.where(eq(schema.users.organizationId, orgId))
						.limit(1);
					resolvedDoctorId = fallbackDoc?.id ?? null;
				}
				if (!resolvedDoctorId) {
					return { kind: "err" as const, status: 422, payload: { error: "DoctorRequired", message: "Не удалось определить врача для регистрации отправки в ЕГИСЗ." } };
				}

				return { kind: "ok" as const, visit, resolvedDoctorId };
			});

			if (pkgPreflight.kind === "err") {
				return reply.status(pkgPreflight.status).send(pkgPreflight.payload);
			}

			const result = await dispatchPackageToVimis({
				organizationId: orgId,
				patientId: pkgPreflight.visit.patientId,
				visitId: pkgPreflight.visit.id,
				doctorId: pkgPreflight.resolvedDoctorId,
				pkg,
				actorUserId: identity.userId || undefined,
				isSync,
			});

			if (!result.success && result.status === "Rejected") {
				return reply.status(422).send({ error: "InvalidSnils", message: "Некорректный СНИЛС пациента в метаданных пакета ЕГИСЗ.", issues: result.flkErrors });
			}
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}
			return reply.status(200).send(result);
		},
	});

	registerEgiszOutboxRoutes(app);
}
