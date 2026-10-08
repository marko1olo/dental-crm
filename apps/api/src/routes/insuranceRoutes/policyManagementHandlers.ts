import { calculateDmsCoverage } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { dmsGuaranteeLetters, insuranceContracts } from "../../db/schema.js";
import {
	INSURANCE_COMPANY_NAME_REQUIRED,
	INSURANCE_CONTRACT_NOT_FOUND,
	INSURER_NAMES,
} from "./constants.js";
import {
	calculateCoverageBodySchema,
	insuranceCreateBodySchema,
	insuranceUpdateBodySchema,
} from "./types.js";

export async function registerPolicyManagementRoutes(app: FastifyInstance) {
	// GET all insurance contracts for the organization
	app.get("/api/insurance/contracts", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"insurance contracts read",
		);
		if (!orgId) return;

		const contracts = await db
			.select()
			.from(insuranceContracts)
			.where(
				and(
					eq(insuranceContracts.organizationId, orgId),
					eq(insuranceContracts.isActive, true),
				),
			)
			.orderBy(insuranceContracts.companyName);

		return contracts;
	});

	// GET a single contract by id
	app.get<{ Params: { contractId: string } }>(
		"/api/insurance/contracts/:contractId",
		async (request, reply) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"insurance contract read",
			);
			if (!orgId) return;

			const { contractId } = request.params;
			const [contract] = await db
				.select()
				.from(insuranceContracts)
				.where(
					and(
						eq(insuranceContracts.id, contractId),
						eq(insuranceContracts.organizationId, orgId),
					),
				)
				.limit(1);

			if (!contract)
				return reply.code(404).send({
					error: "ContractNotFound",
					message: INSURANCE_CONTRACT_NOT_FOUND,
				});
			return contract;
		},
	);

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

	// POST calculate coverage and co-payment for an invoice or treatment plan
	app.post<{
		Params: { contractId: string };
		Body: {
			usedAnnualAmountRub?: number;
			items: Array<{
				serviceId: string;
				serviceName?: string;
				category:
					| "consultation"
					| "therapy"
					| "surgery"
					| "prosthetics"
					| "orthodontics"
					| "periodontology"
					| "hygiene"
					| "imaging"
					| "documents"
					| "other";
				priceRub: number;
				quantity?: number;
			}>;
		};
	}>("/api/insurance/contracts/:contractId/calculate-coverage", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"insurance calculate coverage",
		);
		if (!orgId) return;

		const { contractId } = request.params;
		const [contract] = await db
			.select()
			.from(insuranceContracts)
			.where(
				and(
					eq(insuranceContracts.id, contractId),
					eq(insuranceContracts.organizationId, orgId),
				),
			)
			.limit(1);

		if (!contract || !contract.isActive) {
			return reply.code(404).send({
				error: "ContractNotFound",
				message: INSURANCE_CONTRACT_NOT_FOUND,
			});
		}

		const parsed = calculateCoverageBodySchema.safeParse(request.body);
		if (!parsed.success) {
			const msg = parsed.error.issues[0]?.message ?? "Проверьте список услуг для расчёта покрытия ДМС.";
			return reply.code(400).send({
				error: "ValidationError",
				message: msg,
			});
		}

		const { items, usedAnnualAmountRub } = parsed.data;

		const result = calculateDmsCoverage(
			{
				id: contract.id,
				companyName: contract.companyName,
				coverageTherapyPct: Number(contract.coverageTherapyPct),
				coverageSurgeryPct: Number(contract.coverageSurgeryPct),
				coverageOrthoPct: Number(contract.coverageOrthoPct),
				coverageHygienePct: Number(contract.coverageHygienePct),
				annualLimitRub: contract.annualLimitRub != null ? Number(contract.annualLimitRub) : null,
			},
			items,
			usedAnnualAmountRub,
		);

		return reply.code(200).send(result);
	});

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
