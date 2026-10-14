/**
 * marketingCampaignCrudHandlers.ts — Layer 2/3: Обработчики CRUD рекламных источников,
 * настроек обязательности полей пациента и маркетинговых отчетов с транзакционной безопасностью.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db/client.js";
import {
	crmLeads,
	organizations,
	payments,
} from "../../db/schema.js";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import {
	patientFieldRequirementsSchema,
	DEFAULT_PATIENT_FIELD_REQUIREMENTS,
} from "./marketingSchemas.js";
import { generateMarketingReportsSummary } from "./marketingAnalyticsEngine.js";

export type DatabaseTransaction = TenantDb;

/**
 * Чтение настроек обязательности полей карточки пациента из БД.
 */
export async function fetchPatientFieldRequirementsFromDb(
	orgId: string,
	tx?: DatabaseTransaction,
): Promise<z.infer<typeof patientFieldRequirementsSchema>> {
	const executor = tx || db;
	const [org] = await executor
		.select({ flags: organizations.workspaceFeatureFlags })
		.from(organizations)
		.where(eq(organizations.id, orgId))
		.limit(1);

	const flags = (org?.flags as Record<string, unknown>) || {};
	return (
		(flags.patientFieldRequirements as z.infer<typeof patientFieldRequirementsSchema> | undefined) ||
		DEFAULT_PATIENT_FIELD_REQUIREMENTS
	);
}

/**
 * Транзакционное сохранение настроек обязательности полей карточки пациента.
 */
export async function updatePatientFieldRequirementsInDb(
	orgId: string,
	requirements: z.infer<typeof patientFieldRequirementsSchema>,
	tx?: DatabaseTransaction,
): Promise<z.infer<typeof patientFieldRequirementsSchema>> {
	const applyUpdate = async (client: DatabaseTransaction) => {
		const [org] = await client
			.select({ flags: organizations.workspaceFeatureFlags })
			.from(organizations)
			.where(eq(organizations.id, orgId))
			.limit(1);

		const existingFlags = (org?.flags as Record<string, unknown>) || {};
		const updatedFlags = {
			...existingFlags,
			patientFieldRequirements: requirements,
		};

		await client
			.update(organizations)
			.set({ workspaceFeatureFlags: updatedFlags })
			.where(eq(organizations.id, orgId));

		return requirements;
	};

	if (tx) {
		return applyUpdate(tx);
	}
	return withTenantCtx(orgId, async (tenantTx) => {
		return applyUpdate(tenantTx);
	});
}

/**
 * GET /api/marketing/patient-field-requirements
 */
export async function handleGetPatientFieldRequirements(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const readAllowed = await requireClinicalReadAccess(request, reply, "patient field requirements");
	if (!readAllowed) return;

	const orgId = await requireResolvedOrganizationId(request, reply, "patient field requirements");
	if (!orgId) return;

	try {
		const requirements = await fetchPatientFieldRequirementsFromDb(orgId);
		return reply.code(200).send(requirements);
	} catch (err) {
		request.log.error({ err }, "[Marketing] Error fetching patient field requirements");
		return reply.code(500).send({
			error: "InternalServerError",
			message: "Не удалось загрузить настройки обязательности полей",
		});
	}
}

/**
 * PUT /api/marketing/patient-field-requirements
 */
export async function handlePutPatientFieldRequirements(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const mutateAllowed = await requireClinicalMutationAccess(request, reply, "update patient field requirements");
	if (!mutateAllowed) return;

	const orgId = await requireResolvedOrganizationId(request, reply, "update patient field requirements");
	if (!orgId) return;

	const parsed = patientFieldRequirementsSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный формат настроек обязательности полей",
		});
	}

	try {
		const saved = await updatePatientFieldRequirementsInDb(orgId, parsed.data);
		return reply.code(200).send({
			success: true,
			requirements: saved,
		});
	} catch (err) {
		request.log.error({ err }, "[Marketing] Error updating patient field requirements");
		return reply.code(500).send({
			error: "InternalServerError",
			message: "Не удалось сохранить настройки обязательности полей",
		});
	}
}

/**
 * GET /api/marketing/reports
 */
export async function handleGetMarketingReports(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(request, reply, "marketing reports");
	if (!orgId) return;

	try {
		const [allLeads, allPayments] = await Promise.all([
			db.select().from(crmLeads).where(eq(crmLeads.organizationId, orgId)),
			db.select().from(payments).where(and(eq(payments.organizationId, orgId), eq(payments.status, "paid"))),
		]);

		const { totalRevenueKopecks, channelCounts } = generateMarketingReportsSummary({
			allLeads,
			allPayments,
		});

		const format = ((request.query as { format?: string })?.format || "json").toLowerCase();
		if (format === "csv") {
			const headers = "channel,leadsCount,category\n";
			const rows = Object.entries(channelCounts)
				.map(([channel, stats]) => `${channel},${stats.leads},marketing_funnel`)
				.join("\n");
			reply.header("Content-Type", "text/csv; charset=utf-8");
			reply.header(
				"Content-Disposition",
				`attachment; filename="marketing-report-${orgId}.csv"`,
			);
			return reply.send(headers + rows);
		}

		return reply.code(200).send({
			organizationId: orgId,
			reportKind: "marketing_attribution_summary",
			totalLeads: allLeads.length,
			totalPaidTransactions: allPayments.length,
			totalRevenueKopecks,
			channels: Object.entries(channelCounts).map(([key, data]) => ({
				channel: key,
				leadsCount: data.leads,
			})),
		});
	} catch (err) {
		request.log.error({ err }, "[Marketing] Error generating marketing reports");
		return reply.code(500).send({
			error: "InternalServerError",
			message: "Не удалось сформировать маркетинговый отчет",
		});
	}
}
