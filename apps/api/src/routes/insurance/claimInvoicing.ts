/**
 * Claim Invoicing & Split Calculation Routes for DMS.
 * Layer 2: Handlers for calculating insurance coverage and guarantee letter co-pay split.
 */
import {
	calculateDmsCoverage,
	calculateDmsGuaranteeSplit,
	type DmsGuaranteeLetter,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { dmsGuaranteeLetters, insuranceContracts } from "../../db/schema.js";
import {
	calculateCoverageBodySchema,
	INSURANCE_CONTRACT_NOT_FOUND,
	splitInvoiceBodySchema,
} from "./schemas.js";
import type { CalculateCoverageBody, ContractParams } from "./types.js";

export function registerClaimInvoicingRoutes(app: FastifyInstance): void {
	// POST calculate coverage and co-payment for an invoice or treatment plan
	app.post<{
		Params: ContractParams;
		Body: CalculateCoverageBody;
	}>(
		"/api/insurance/contracts/:contractId/calculate-coverage",
		async (request, reply) => {
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
				const msg =
					parsed.error.issues[0]?.message ??
					"Проверьте список услуг для расчёта покрытия ДМС.";
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
					annualLimitRub:
						contract.annualLimitRub != null
							? Number(contract.annualLimitRub)
							: null,
				},
				items,
				usedAnnualAmountRub,
			);

			return reply.code(200).send(result);
		},
	);

	// POST /api/insurance/split-invoice: calculate exact split between DMS share and patient co-pay
	app.post("/api/insurance/split-invoice", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"insurance split invoice",
		);
		if (!orgId) return;

		const parsed = splitInvoiceBodySchema.safeParse(request.body);
		if (!parsed.success) {
			const msg =
				parsed.error.issues[0]?.message ??
				"Проверьте перечень услуг для разделения счёта.";
			return reply.code(400).send({
				error: "ValidationError",
				message: msg,
			});
		}

		const { letterId, contractId, visitDate, items } = parsed.data;

		// 1. Поиск гарантийного письма из базы данных PostgreSQL
		let letter: DmsGuaranteeLetter | null = null;
		if (letterId) {
			const [foundLetter] = await db
				.select()
				.from(dmsGuaranteeLetters)
				.where(
					and(
						eq(dmsGuaranteeLetters.id, letterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				)
				.limit(1);

			if (foundLetter) {
				letter = {
					id: foundLetter.id,
					organizationId: foundLetter.organizationId,
					contractId: foundLetter.contractId,
					patientId: foundLetter.patientId,
					patientFullName: foundLetter.patientFullName,
					patientBirthDate: foundLetter.patientBirthDate,
					policyNumber: foundLetter.policyNumber,
					insurerKey: foundLetter.insurerKey,
					insurerName: foundLetter.insurerName,
					letterNumber: foundLetter.letterNumber,
					issueDate: foundLetter.issueDate,
					validFrom: foundLetter.validFrom,
					validUntil: foundLetter.validUntil,
					maxCoverageRub: Number(foundLetter.maxCoverageRub),
					usedAmountRub: Number(foundLetter.usedAmountRub),
					franchisePct: Number(foundLetter.franchisePct),
					franchiseType:
						(foundLetter.franchiseType as "percent" | "fixed_rub") ||
						"percent",
					franchiseFixedRub: Number(foundLetter.franchiseFixedRub),
					programExclusions:
						(foundLetter.programExclusions as string[]) || [],
					approvedServiceCodes:
						(foundLetter.approvedServiceCodes as string[]) || [],
					approvedTeethFdi:
						(foundLetter.approvedTeethFdi as string[]) || [],
					approvedDiagnosisCodes:
						(foundLetter.approvedDiagnosisCodes as string[]) || [],
					curatorFullName: foundLetter.curatorFullName,
					curatorPhone: foundLetter.curatorPhone,
					notes: foundLetter.notes,
					status:
						(foundLetter.status as DmsGuaranteeLetter["status"]) ||
						"active",
					createdAt: foundLetter.createdAt.toISOString(),
					updatedAt: foundLetter.updatedAt.toISOString(),
				};
			}
		}

		// 2. Поиск договора ДМС (если передан contractId)
		let contract: {
			coverageTherapyPct: number;
			coverageSurgeryPct: number;
			coverageOrthoPct: number;
			coverageHygienePct: number;
			annualLimitRub: number | null;
		} | null = null;

		if (contractId) {
			const [found] = await db
				.select()
				.from(insuranceContracts)
				.where(
					and(
						eq(insuranceContracts.id, contractId),
						eq(insuranceContracts.organizationId, orgId),
					),
				)
				.limit(1);

			if (found && found.isActive) {
				contract = {
					coverageTherapyPct: Number(found.coverageTherapyPct),
					coverageSurgeryPct: Number(found.coverageSurgeryPct),
					coverageOrthoPct: Number(found.coverageOrthoPct),
					coverageHygienePct: Number(found.coverageHygienePct),
					annualLimitRub:
						found.annualLimitRub != null
							? Number(found.annualLimitRub)
							: null,
				};
			}
		}

		const splitResult = calculateDmsGuaranteeSplit(letter, items, {
			visitDate: visitDate || new Date().toISOString().slice(0, 10),
			contract,
			isEmergency: parsed.data.isEmergency,
			hasAcutePain: parsed.data.hasAcutePain,
		});

		return reply.code(200).send(splitResult);
	});
}
