import { calculateDmsCoverage } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { insuranceContracts } from "../../../db/schema.js";
import {
	INSURANCE_CONTRACT_NOT_FOUND,
	INSURER_DIRECTORY,
} from "../constants.js";
import { calculateCoverageBodySchema } from "../types.js";

export async function registerPolicyQueryRoutes(app: FastifyInstance) {
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

	// GET all known statutory insurers and clinic's active contracts
	app.get("/api/insurance/insurers", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"insurance insurers read",
		);
		if (!orgId) return;

		const activeContracts = await db
			.select()
			.from(insuranceContracts)
			.where(
				and(
					eq(insuranceContracts.organizationId, orgId),
					eq(insuranceContracts.isActive, true),
				),
			)
			.orderBy(insuranceContracts.companyName);

		const statutoryList = Object.entries(INSURER_DIRECTORY).map(([key, info]) => ({
			key,
			name: info.name,
			shortName: info.name,
			inn: info.inn,
			isPartner: activeContracts.some((c) =>
				c.companyName.toLowerCase().includes(info.name.toLowerCase()),
			),
		}));

		const contractInsurers = activeContracts.map((c) => ({
			key: `contract_${c.id}`,
			name: c.companyName,
			shortName: c.companyName,
			contractId: c.id,
			annualLimitRub: c.annualLimitRub,
			patientFranchisePct: c.patientFranchisePct,
			isPartner: true,
		}));

		return reply.code(200).send({
			insurers: statutoryList,
			contracts: contractInsurers,
		});
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
}
