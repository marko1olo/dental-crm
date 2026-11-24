import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { dmsGuaranteeLetters, insuranceContracts, patients } from "../../../db/schema.js";
import {
	INSURANCE_COMPANY_NAME_REQUIRED,
	INSURANCE_CONTRACT_NOT_FOUND,
	INSURER_NAMES,
} from "../constants.js";
import {
	formatGuaranteeLetterResponse,
	formatInsuranceContractResponse,
	isValidUuid,
} from "../guaranteeLetterModules/guaranteeLetterFormatters.js";
import {
	insuranceCreateBodySchema,
	insuranceUpdateBodySchema,
	quickAttachBodySchema,
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
			annualLimitKopecks?: number | null;
		};
	}>("/api/insurance/contracts", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"insurance contract create",
		);
		if (!orgId) return;

		if (request.body == null || typeof request.body !== "object" || Array.isArray(request.body)) {
			return reply.code(400).send({
				error: "CompanyNameRequired",
				message: INSURANCE_COMPANY_NAME_REQUIRED,
			});
		}

		const parsedCreate = insuranceCreateBodySchema.safeParse(request.body);
		if (!parsedCreate.success) {
			const rawCompanyName = (request.body as { companyName?: unknown }).companyName;
			if (typeof rawCompanyName !== "string" || !rawCompanyName.trim()) {
				return reply.code(400).send({
					error: "CompanyNameRequired",
					message: INSURANCE_COMPANY_NAME_REQUIRED,
				});
			}
			const msg = parsedCreate.error.issues[0]?.message ?? "Проверьте параметры договора ДМС.";
			return reply.code(400).send({
				error: "ValidationError",
				message: msg,
				details: parsedCreate.error.issues,
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
			annualLimitKopecks,
			patientFranchisePct = 0,
			requiresGuaranteeLetter = true,
		} = parsedCreate.data;

		if (!companyName?.trim()) {
			return reply.code(400).send({
				error: "CompanyNameRequired",
				message: INSURANCE_COMPANY_NAME_REQUIRED,
			});
		}

		// Clamp all coverage values to [0, 100]
		const clamp = (v: number) => Math.min(100, Math.max(0, v));

		const resolvedAnnualLimitKop =
			annualLimitKopecks !== undefined
				? annualLimitKopecks !== null
					? BigInt(annualLimitKopecks)
					: 0n
				: annualLimitRub !== undefined
					? BigInt(rublesToKopecks(annualLimitRub))
					: 0n;
		const resolvedAnnualLimitRub =
			annualLimitKopecks !== undefined
				? annualLimitKopecks !== null
					? kopecksToRubles(annualLimitKopecks)
					: null
				: annualLimitRub !== undefined
					? annualLimitRub
					: null;

		const created = await withTenantCtx(orgId, async (tx) => {
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
					annualLimitRub: resolvedAnnualLimitRub,
					annualLimitKopecks: resolvedAnnualLimitKop,
					patientFranchisePct: clamp(patientFranchisePct),
					requiresGuaranteeLetter,
					isActive: true,
				})
				.returning();

			return inserted ?? null;
		});

		if (!created)
			return reply.code(500).send({
				error: "ContractNotSaved",
				message:
					"Договор ДМС не сохранён: сервер не подтвердил запись. Введённое осталось на экране — не закрывайте окно, повторите сохранение, а если снова не выйдет, сообщите администратору клиники.",
			});

		return reply.code(201).send(formatInsuranceContractResponse(created));
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
			annualLimitRub?: number | null;
			annualLimitKopecks?: number | null;
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
		if (!isValidUuid(contractId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Параметр contractId должен быть валидным UUID.",
			});
		}

		if (request.body == null || typeof request.body !== "object" || Array.isArray(request.body)) {
			return reply.code(400).send({
				error: "CompanyNameRequired",
				message: INSURANCE_COMPANY_NAME_REQUIRED,
			});
		}

		const parsedUpdate = insuranceUpdateBodySchema.safeParse(request.body);
		if (!parsedUpdate.success) {
			if (parsedUpdate.error.issues.some((issue) => issue.path[0] === "companyName")) {
				return reply.code(400).send({
					error: "CompanyNameRequired",
					message: INSURANCE_COMPANY_NAME_REQUIRED,
				});
			}
			const msg = parsedUpdate.error.issues[0]?.message ?? "Проверьте параметры обновления договора ДМС.";
			return reply.code(400).send({
				error: "ValidationError",
				message: msg,
				details: parsedUpdate.error.issues,
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
			annualLimitKopecks,
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

		const txResult = await withTenantCtx(orgId, async (tx) => {
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
					...(annualLimitKopecks !== undefined
						? {
								annualLimitKopecks: annualLimitKopecks !== null ? BigInt(annualLimitKopecks) : 0n,
								annualLimitRub: annualLimitKopecks !== null ? kopecksToRubles(annualLimitKopecks) : null,
							}
						: annualLimitRub !== undefined
							? {
									annualLimitRub,
									annualLimitKopecks: annualLimitRub !== null ? BigInt(rublesToKopecks(annualLimitRub)) : 0n,
								}
							: {}),
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

			return { status: 200, data: formatInsuranceContractResponse(updated) };
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
			if (!isValidUuid(contractId)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Параметр contractId должен быть валидным UUID.",
				});
			}

			const deleteResult = await withTenantCtx(orgId, async (tx) => {
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

		const parsed = quickAttachBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Укажите пациента, страховую компанию и номер полиса ДМС.",
				details: parsed.error.issues,
			});
		}
		const body = parsed.data;
		if (!body.policyNumber.trim()) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Укажите пациента, страховую компанию и номер полиса ДМС.",
			});
		}

		const insurerName = INSURER_NAMES[body.insurerKey] || "";
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

		const txResult = await withTenantCtx(orgId, async (tx) => {
			// Mandate 8z: BOLA/IDOR protection - verify patient belongs to current clinic organization
			const [patient] = await tx
				.select({
					id: patients.id,
					fullName: patients.fullName,
					birthDate: patients.birthDate,
				})
				.from(patients)
				.where(
					and(
						eq(patients.id, body.patientId),
						eq(patients.organizationId, orgId),
					),
				)
				.limit(1);

			if (!patient) {
				return {
					status: 404,
					error: {
						error: "PatientNotFound",
						message: "Пациент не найден в текущей клинике",
					},
				};
			}

			const [inserted] = await tx
				.insert(dmsGuaranteeLetters)
				.values({
					organizationId: orgId,
					patientId: body.patientId,
					patientFullName: body.patientFullName?.trim() || patient.fullName,
					patientBirthDate: body.patientBirthDate || patient.birthDate || null,
					policyNumber: body.policyNumber.trim(),
					insurerKey: body.insurerKey,
					insurerName,
					letterNumber,
					issueDate: todayIso,
					validFrom: todayIso,
					validUntil: oneYearLaterIso,
					maxCoverageRub: maxCoverage,
					maxCoverageKopecks: BigInt(maxCoverageKop),
					usedAmountRub: 0,
					usedAmountKopecks: 0n,
					franchisePct: 0,
					franchiseType: "percent",
					franchiseFixedRub: 0,
					franchiseFixedKopecks: 0n,
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

			if (!inserted) {
				return {
					status: 500,
					error: {
						error: "LetterNotSaved",
						message: "Не удалось прикрепить полис ДМС в базе данных.",
					},
				};
			}

			return {
				status: 201,
				data: {
					success: true,
					letter: formatGuaranteeLetterResponse(inserted, todayIso),
					...(body.isEmergency ? { warning: "Требуется досылка гарантийного письма ДМС" } : {}),
				},
			};
		});

		if (txResult.status !== 201 || !txResult.data) {
			return reply.code(txResult.status).send(txResult.error);
		}

		return reply.code(201).send(txResult.data);
	});
}
