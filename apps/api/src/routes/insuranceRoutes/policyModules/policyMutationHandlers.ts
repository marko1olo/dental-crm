import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { dmsGuaranteeLetters, insuranceContracts } from "../../../db/schema.js";
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

		// Clamp all coverage values to [0, 100]
		const clamp = (v: number) => Math.min(100, Math.max(0, v));

		const [created] = await db
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

		if (!created)
			return reply.code(500).send({
				error: "ContractNotSaved",
				message:
					"Договор ДМС не сохранён: сервер не подтвердил запись. Введённое осталось на экране — не закрывайте окно, повторите сохранение, а если снова не выйдет, сообщите администратору клиники.",
			});
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
		const [existing] = await db
			.select({ id: insuranceContracts.id })
			.from(insuranceContracts)
			.where(
				and(
					eq(insuranceContracts.id, contractId),
					eq(insuranceContracts.organizationId, orgId),
				),
			)
			.limit(1);

		if (!existing)
			return reply.code(404).send({
				error: "ContractNotFound",
				message: INSURANCE_CONTRACT_NOT_FOUND,
			});

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

		const [updated] = await db
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

		if (!updated)
			return reply.code(500).send({
				error: "ContractNotSaved",
				message:
					"Изменения договора ДМС не сохранены: сервер не подтвердил запись. Введённое осталось на экране — не закрывайте окно, повторите сохранение, а если снова не выйдет, сообщите администратору клиники.",
			});
		return updated;
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
			const [existing] = await db
				.select({ id: insuranceContracts.id })
				.from(insuranceContracts)
				.where(
					and(
						eq(insuranceContracts.id, contractId),
						eq(insuranceContracts.organizationId, orgId),
					),
				)
				.limit(1);

			if (!existing)
				return reply.code(404).send({
					error: "ContractNotFound",
					message: INSURANCE_CONTRACT_NOT_FOUND,
				});

			const [deactivated] = await db
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
				return reply.code(404).send({
					error: "ContractNotFound",
					message: INSURANCE_CONTRACT_NOT_FOUND,
				});
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

		const insurerName = INSURER_NAMES[body.insurerKey] || "Страховая компания ДМС";
		const todayIso = new Date().toISOString().slice(0, 10);
		const oneYearLaterIso = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

		const maxCoverage = body.maxCoverageRub && body.maxCoverageRub > 0 ? body.maxCoverageRub : 50000;
		const letterNumber = body.isEmergency
			? `ЭКСТРЕННО-${Date.now().toString().slice(-6)}`
			: `ДМС-${Date.now().toString().slice(-6)}`;

		const [created] = await db
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
					: "Экспресс-прикрепление ДМС в 1 клик",
				status: "active",
			})
			.returning();

		return reply.code(201).send({
			success: true,
			letter: created,
			warning: body.isEmergency ? "Требуется досылка гарантийного письма ДМС" : undefined,
		});
	});
}
