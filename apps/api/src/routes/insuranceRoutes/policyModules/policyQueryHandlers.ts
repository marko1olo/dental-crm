import { calculateDmsCoverage, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { defineStreamRoute } from "../../../core/routeFactories.js";
import { withTenantReadCtx } from "../../../db/rls.js";
import { insuranceContracts } from "../../../db/schema.js";
import {
	INSURANCE_CONTRACT_NOT_FOUND,
	INSURER_DIRECTORY,
} from "../constants.js";
import {
	formatInsuranceContractResponse,
	isValidUuid,
	resolveDbKopecks,
} from "../guaranteeLetterModules/guaranteeLetterFormatters.js";
import { calculateCoverageBodySchema } from "../types.js";

export async function registerPolicyQueryRoutes(app: FastifyInstance) {
	// GET all insurance contracts for the organization
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/insurance/contracts",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"insurance contracts read",
			);
			if (!orgId) return;

			const contracts = await withTenantReadCtx(orgId, (tx) =>
				tx
					.select()
					.from(insuranceContracts)
					.where(
						and(
							eq(insuranceContracts.organizationId, orgId),
							eq(insuranceContracts.isActive, true),
						),
					)
					.orderBy(insuranceContracts.companyName),
			);

			return contracts.map(formatInsuranceContractResponse);
		},
	});

	// GET all known statutory insurers and clinic's active contracts
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/insurance/insurers",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"insurance insurers read",
			);
			if (!orgId) return;

			const activeContracts = await withTenantReadCtx(orgId, (tx) =>
				tx
					.select()
					.from(insuranceContracts)
					.where(
						and(
							eq(insuranceContracts.organizationId, orgId),
							eq(insuranceContracts.isActive, true),
						),
					)
					.orderBy(insuranceContracts.companyName),
			);

			const statutoryList = Object.entries(INSURER_DIRECTORY).map(([key, info]) => ({
				key,
				name: info.name,
				shortName: info.name,
				inn: info.inn,
				isPartner: activeContracts.some((c) =>
					c.companyName.toLowerCase().includes(info.name.toLowerCase()),
				),
			}));

			const contractInsurers = activeContracts.map((c) => {
				const formatted = formatInsuranceContractResponse(c);
				return {
					key: `contract_${c.id}`,
					name: c.companyName,
					shortName: c.companyName,
					contractId: c.id,
					annualLimitRub: formatted.annualLimitRub,
					annualLimitKopecks: formatted.annualLimitKopecks,
					patientFranchisePct: formatted.patientFranchisePct,
					isPartner: true,
				};
			});

			return reply.code(200).send({
				insurers: statutoryList,
				contracts: contractInsurers,
			});
		},
	});

	// GET a single contract by id
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/insurance/contracts/:contractId",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"insurance contract read",
			);
			if (!orgId) return;

			const { contractId } = request.params as { contractId: string };
			if (!isValidUuid(contractId)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Параметр contractId должен быть валидным UUID.",
				});
			}

			const [contract] = await withTenantReadCtx(orgId, (tx) =>
				tx
					.select()
					.from(insuranceContracts)
					.where(
						and(
							eq(insuranceContracts.id, contractId),
							eq(insuranceContracts.organizationId, orgId),
						),
					)
					.limit(1),
			);

			if (!contract)
				return reply.code(404).send({
					error: "ContractNotFound",
					message: INSURANCE_CONTRACT_NOT_FOUND,
				});
			return formatInsuranceContractResponse(contract);
		},
	});

	// POST calculate coverage and co-payment for an invoice or treatment plan
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/insurance/contracts/:contractId/calculate-coverage",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"insurance calculate coverage",
			);
			if (!orgId) return;

			const { contractId } = request.params as { contractId: string };
			if (!isValidUuid(contractId)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Параметр contractId должен быть валидным UUID.",
				});
			}

			const [contract] = await withTenantReadCtx(orgId, (tx) =>
				tx
					.select()
					.from(insuranceContracts)
					.where(
						and(
							eq(insuranceContracts.id, contractId),
							eq(insuranceContracts.organizationId, orgId),
						),
					)
					.limit(1),
			);

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
					details: parsed.error.issues,
				});
			}

			const { items, usedAnnualAmountRub, usedAnnualAmountKopecks } = parsed.data;
			const usedAnnualKop =
				usedAnnualAmountKopecks !== undefined
					? usedAnnualAmountKopecks
					: rublesToKopecks(usedAnnualAmountRub);
			const contractAnnualKop = resolveDbKopecks(contract.annualLimitKopecks, contract.annualLimitRub);
			const contractAnnualRub =
				contractAnnualKop > 0
					? kopecksToRubles(contractAnnualKop)
					: contract.annualLimitRub != null
						? Number(contract.annualLimitRub)
						: null;

			const result = calculateDmsCoverage(
				{
					id: contract.id,
					companyName: contract.companyName,
					coverageTherapyPct: Number(contract.coverageTherapyPct),
					coverageSurgeryPct: Number(contract.coverageSurgeryPct),
					coverageOrthoPct: Number(contract.coverageOrthoPct),
					coverageHygienePct: Number(contract.coverageHygienePct),
					annualLimitRub: contractAnnualRub,
				},
				items,
				kopecksToRubles(usedAnnualKop),
			);

			return reply.code(200).send(result);
		},
	});
}
