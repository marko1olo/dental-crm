import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { computePayloadHash, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { dmsGuaranteeLetters, insuranceContracts, patients } from "../../../db/schema.js";
import { idempotencyKeys } from "../../../db/schema/idempotency.js";
import {
	INSURANCE_COMPANY_NAME_REQUIRED,
	INSURANCE_CONTRACT_NOT_FOUND,
	INSURER_NAMES,
} from "../constants.js";
import {
	insuranceCreateBodySchema,
	insuranceUpdateBodySchema,
} from "../types.js";

export async function registerPolicyMutationRoutes(app: FastifyInstance) {
	// POST create a new insurance contract
	app.post<{
		Body: {
			companyName: string;
			policyNumberMask?: string;
			coverageTherapyPct?: number;
			coverageSurgeryPct?: number;
			coverageOrthoPct?: number;
			coverageHygienePct?: number;
			annualLimitRub?: number;
		};
	}>("/api/insurance/contracts", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"insurance contract create",
		);
		if (!orgId) return;

		const parsedCreate = insuranceCreateBodySchema.safeParse(request.body);
		if (!parsedCreate.success) {
			return reply.code(400).send({
				error: "CompanyNameRequired",
				message: INSURANCE_COMPANY_NAME_REQUIRED,
			});
		}
		const {
			companyName,
			policyNumberMask,
			coverageTherapyPct = 0,
			coverageSurgeryPct = 0,
			coverageOrthoPct = 0,
			coverageHygienePct = 0,
			annualLimitRub,
			patientFranchisePct = 0,
			requiresGuaranteeLetter = true,
		} = parsedCreate.data;

		if (!companyName?.trim()) {
			return reply.code(400).send({
				error: "CompanyNameRequired",
				message: INSURANCE_COMPANY_NAME_REQUIRED,
			});
		}

		// Mandate 8zp/8bo: Idempotency-Key support
		const rawBodyMutationId = (request.body as { clientMutationId?: unknown })?.clientMutationId;
		const rawIdemKey =
			(request.headers["idempotency-key"] as string | undefined) ||
			(request.headers["x-idempotency-key"] as string | undefined) ||
			(typeof rawBodyMutationId === "string" ? rawBodyMutationId : undefined);
		const idempotencyKey =
			typeof rawIdemKey === "string" && rawIdemKey.trim().length > 0
				? rawIdemKey.trim()
				: undefined;

		if (idempotencyKey) {
			const [existingRecord] = await db
				.select()
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, orgId),
						eq(idempotencyKeys.key, idempotencyKey),
					),
				)
				.limit(1);

			if (existingRecord) {
				if (existingRecord.status === "completed" && existingRecord.responseBody) {
					reply.header("Idempotency-Key", idempotencyKey);
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply.code(existingRecord.responseCode || 201).send(existingRecord.responseBody);
				}
				if (existingRecord.status === "in_flight") {
					return reply.code(409).header("Retry-After", "1").send({
						error: "Conflict",
						message: "Операция создания договора ДМС с данным Idempotency-Key уже выполняется.",
					});
				}
			}
		}

		// Clamp all coverage values to [0, 100]
		const clamp = (v: number) => Math.min(100, Math.max(0, v));

		const created = await db.transaction(async (tx) => {
			const [inserted] = await tx
				.insert(insuranceContracts)
				.values({
					organizationId: orgId,
					companyName: companyName.trim(),
					policyNumberMask: policyNumberMask?.trim() ?? null,
					coverageTherapyPct: clamp(coverageTherapyPct),
					coverageSurgeryPct: clamp(coverageSurgeryPct),
					coverageOrthoPct: clamp(coverageOrthoPct),
					coverageHygienePct: clamp(coverageHygienePct),
					annualLimitRub: annualLimitRub ?? null,
					patientFranchisePct: clamp(patientFranchisePct),
					requiresGuaranteeLetter,
					isActive: true,
				})
				.returning();

			if (inserted && idempotencyKey) {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: inserted,
						responseCode: 201,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: inserted,
							responseCode: 201,
						},
					});
			}

			return inserted;
		});

		if (!created)
			return reply.code(500).send({
				error: "ContractNotSaved",
				message:
					"Договор ДМС не сохранён: сервер не подтвердил запись. Введённое осталось на экране — не закрывайте окно, повторите сохранение, а если снова не выйдет, сообщите администратору клиники.",
			});

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}
		return reply.code(201).send(created);
	});

	// PUT update an existing insurance contract
	app.put<{
		Params: { contractId: string };
		Body: {
			companyName?: string;
			policyNumberMask?: string;
			coverageTherapyPct?: number;
			coverageSurgeryPct?: number;
			coverageOrthoPct?: number;
			coverageHygienePct?: number;
			annualLimitRub?: number;
			patientFranchisePct?: number;
			requiresGuaranteeLetter?: boolean;
			isActive?: boolean;
		};
	}>("/api/insurance/contracts/:contractId", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"insurance contract update",
		);
		if (!orgId) return;

		const { contractId } = request.params;

		const parsedUpdate = insuranceUpdateBodySchema.safeParse(request.body);
		if (!parsedUpdate.success) {
			return reply.code(400).send({
				error: "CompanyNameRequired",
				message: INSURANCE_COMPANY_NAME_REQUIRED,
			});
		}
		const {
			companyName,
			policyNumberMask,
			coverageTherapyPct,
			coverageSurgeryPct,
			coverageOrthoPct,
			coverageHygienePct,
			annualLimitRub,
			patientFranchisePct,
			requiresGuaranteeLetter,
			isActive,
		} = parsedUpdate.data;

		if (companyName !== undefined && !companyName.trim()) {
			return reply.code(400).send({
				error: "CompanyNameRequired",
				message: INSURANCE_COMPANY_NAME_REQUIRED,
			});
		}

		const clamp = (v: number) => Math.min(100, Math.max(0, v));

		const txResult = await db.transaction(async (tx) => {
			const [existing] = await tx
				.select({ id: insuranceContracts.id })
				.from(insuranceContracts)
				.where(
					and(
						eq(insuranceContracts.id, contractId),
						eq(insuranceContracts.organizationId, orgId),
					),
				)
				.for("update")
				.limit(1);

			if (!existing) {
				return { status: 404, error: { error: "ContractNotFound", message: INSURANCE_CONTRACT_NOT_FOUND } };
			}

			const [updated] = await tx
				.update(insuranceContracts)
				.set({
					...(companyName !== undefined && { companyName: companyName.trim() }),
					...(policyNumberMask !== undefined && {
						policyNumberMask: policyNumberMask.trim() || null,
					}),
					...(coverageTherapyPct !== undefined && {
						coverageTherapyPct: clamp(coverageTherapyPct),
					}),
					...(coverageSurgeryPct !== undefined && {
						coverageSurgeryPct: clamp(coverageSurgeryPct),
					}),
					...(coverageOrthoPct !== undefined && {
						coverageOrthoPct: clamp(coverageOrthoPct),
					}),
					...(coverageHygienePct !== undefined && {
						coverageHygienePct: clamp(coverageHygienePct),
					}),
					...(annualLimitRub !== undefined && { annualLimitRub }),
					...(patientFranchisePct !== undefined && {
						patientFranchisePct: clamp(patientFranchisePct),
					}),
					...(requiresGuaranteeLetter !== undefined && {
						requiresGuaranteeLetter,
					}),
					...(isActive !== undefined && { isActive }),
				})
				.where(
					and(
						eq(insuranceContracts.id, contractId),
						eq(insuranceContracts.organizationId, orgId),
					),
				)
				.returning();

			if (!updated) {
				return {
					status: 500,
					error: {
						error: "ContractNotSaved",
						message:
							"Изменения договора ДМС не сохранены: сервер не подтвердил запись. Введённое осталось на экране — не закрывайте окно, повторите сохранение, а если снова не выйдет, сообщите администратору клиники.",
					},
				};
			}

			return { status: 200, data: updated };
		});

		if (txResult.status !== 200 || !txResult.data) {
			return reply.code(txResult.status).send(txResult.error);
		}

		return txResult.data;
	});

	// DELETE (soft-delete / deactivate) an insurance contract
	app.delete<{ Params: { contractId: string } }>(
		"/api/insurance/contracts/:contractId",
		async (request, reply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"insurance contract delete",
			);
			if (!orgId) return;

			const { contractId } = request.params;

			const deleteResult = await db.transaction(async (tx) => {
				const [existing] = await tx
					.select({ id: insuranceContracts.id })
					.from(insuranceContracts)
					.where(
						and(
							eq(insuranceContracts.id, contractId),
							eq(insuranceContracts.organizationId, orgId),
						),
					)
					.for("update")
					.limit(1);

				if (!existing) {
					return { status: 404, error: { error: "ContractNotFound", message: INSURANCE_CONTRACT_NOT_FOUND } };
				}

				const [deactivated] = await tx
					.update(insuranceContracts)
					.set({ isActive: false })
					.where(
						and(
							eq(insuranceContracts.id, contractId),
							eq(insuranceContracts.organizationId, orgId),
						),
					)
					.returning({ id: insuranceContracts.id });

				if (!deactivated) {
					return { status: 404, error: { error: "ContractNotFound", message: INSURANCE_CONTRACT_NOT_FOUND } };
				}

				return { status: 200, data: { success: true } };
			});

			if (deleteResult.status !== 200) {
				return reply.code(deleteResult.status).send(deleteResult.error);
			}

			return { success: true };
		},
	);

	/**
	 * 1-клик прикрепление номера полиса ДМС и страховой компании (СОГАЗ, Ингосстрах, РЕСО, АльфаСтрахование)
	 * без 20 полей бюрократии.
	 */
	app.post<{
		Body: {
			patientId: string;
			insurerKey: string;
			policyNumber: string;
			patientFullName?: string;
			patientBirthDate?: string;
			isEmergency?: boolean;
			maxCoverageRub?: number;
			maxCoverageKopecks?: number;
			limitKopecks?: number;
		};
	}>("/api/insurance/quick-attach", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"insurance quick attach policy",
		);
		if (!orgId) return;

		const body = request.body;
		if (!body || !body.patientId || !body.insurerKey || !body.policyNumber?.trim()) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Укажите пациента, страховую компанию и номер полиса ДМС.",
			});
		}

		// Mandate 8z: BOLA/IDOR protection - verify patient belongs to current clinic organization
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(
					eq(patients.id, body.patientId),
					eq(patients.organizationId, orgId),
				),
			)
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в текущей клинике",
			});
		}

		// Mandate 8zp/8bo: Idempotency-Key support
		const rawBodyMutationId = (request.body as { clientMutationId?: unknown })?.clientMutationId;
		const rawIdemKey =
			(request.headers["idempotency-key"] as string | undefined) ||
			(request.headers["x-idempotency-key"] as string | undefined) ||
			(typeof rawBodyMutationId === "string" ? rawBodyMutationId : undefined);
		const idempotencyKey =
			typeof rawIdemKey === "string" && rawIdemKey.trim().length > 0
				? rawIdemKey.trim()
				: undefined;

		if (idempotencyKey) {
			const [existingRecord] = await db
				.select()
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, orgId),
						eq(idempotencyKeys.key, idempotencyKey),
					),
				)
				.limit(1);

			if (existingRecord) {
				if (existingRecord.status === "completed" && existingRecord.responseBody) {
					reply.header("Idempotency-Key", idempotencyKey);
					reply.header("idempotency-replayed", "true");
					reply.header("x-idempotency-replayed", "true");
					return reply.code(existingRecord.responseCode || 201).send(existingRecord.responseBody);
				}
				if (existingRecord.status === "in_flight") {
					return reply.code(409).header("Retry-After", "1").send({
						error: "Conflict",
						message: "Операция экспресс-прикрепления полиса ДМС с данным Idempotency-Key уже выполняется.",
					});
				}
			}
		}

		const insurerName = INSURER_NAMES[body.insurerKey] || "Страховая компания ДМС";
		const todayIso = new Date().toISOString().slice(0, 10);
		const oneYearLaterIso = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

		const maxCoverageKop =
			body.maxCoverageKopecks ??
			body.limitKopecks ??
			(body.maxCoverageRub && body.maxCoverageRub > 0 ? rublesToKopecks(body.maxCoverageRub) : 5000000);
		const maxCoverage = kopecksToRubles(maxCoverageKop);
		const letterNumber = body.isEmergency
			? `ЭКСТРЕННО-${Date.now().toString().slice(-6)}`
			: `ДМС-${Date.now().toString().slice(-6)}`;

		const created = await db.transaction(async (tx) => {
			const [inserted] = await tx
				.insert(dmsGuaranteeLetters)
				.values({
					organizationId: orgId,
					patientId: body.patientId,
					patientFullName: body.patientFullName || "Пациент ДМС",
					patientBirthDate: body.patientBirthDate || null,
					policyNumber: body.policyNumber.trim(),
					insurerKey: body.insurerKey,
					insurerName,
					letterNumber,
					issueDate: todayIso,
					validFrom: todayIso,
					validUntil: oneYearLaterIso,
					maxCoverageRub: maxCoverage,
					usedAmountRub: 0,
					franchisePct: 0,
					franchiseType: "percent",
					franchiseFixedRub: 0,
					programExclusions: [],
					approvedServiceCodes: [],
					approvedTeethFdi: [],
					approvedDiagnosisCodes: [],
					curatorFullName: null,
					curatorPhone: null,
					notes: body.isEmergency
						? "Экстренный приём (острая боль). Требуется досылка гарантийного письма ДМС."
						: "Экспресс-прикрепление полиса ДМС",
					status: "active",
				})
				.returning();

			const responsePayload = {
				success: true,
				letter: inserted,
				warning: body.isEmergency ? "Требуется досылка гарантийного письма ДМС" : undefined,
			};

			if (inserted && idempotencyKey) {
				await tx
					.insert(idempotencyKeys)
					.values({
						clinicId: orgId,
						key: idempotencyKey,
						status: "completed",
						payloadHash: computePayloadHash(request.body ?? {}),
						responseBody: responsePayload,
						responseCode: 201,
					})
					.onConflictDoUpdate({
						target: [idempotencyKeys.clinicId, idempotencyKeys.key],
						set: {
							status: "completed",
							responseBody: responsePayload,
							responseCode: 201,
						},
					});
			}

			return responsePayload;
		});

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		return reply.code(201).send(created);
	});
}
