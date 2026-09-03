/**
 * export.ts — Защищенные эндпоинты экспорта данных картотеки и лидов (152-ФЗ / 323-ФЗ ст. 13).
 *
 * БЕЗОПАСНОСТЬ:
 * 1. Экспорт полной базы пациентов маркетологам КАТЕГОРИЧЕСКИ ЗАПРЕЩЕН (403 Forbidden).
 * 2. Экспорт базы пациентов для уполномоченного персонала очищается от всех клинических полей
 *    (диагнозы, МКБ-10, формулы зубов, анамнез, статус локалис).
 * 3. Экспорт лидов доступен маркетингу и регистратуре, но любые клинические термины в примечаниях (notes)
 *    аппаратно маскируются по 152-ФЗ.
 */

import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { getPatientsFromDb } from "../db/patientsQuery.js";
import { crmLeads } from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";
import {
	evaluateClinicalAccess,
	sanitizeClinicalString,
	stripDiagnosisPayload,
} from "../security/medicalSecrecyWarden.js";

function escapeCsvField(value: unknown): string {
	if (value === null || value === undefined) return "";
	const str = String(value);
	if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export async function registerExportRoutes(app: FastifyInstance) {
	/**
	 * GET /api/export/patients
	 * Экспорт картотеки пациентов.
	 *
	 * 152-ФЗ / 323-ФЗ ст. 13:
	 * Маркетологам экспорт пациентов ЗАПРЕЩЕН.
	 * Клинические поля исключены даже для администратора.
	 */
	app.get("/api/export/patients", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "export patients");
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const reqAny = request as unknown as { user?: { role?: string | null } };
		const staffRole = identity.role ?? reqAny.user?.role ?? null;

		// Маркетологам экспорт базы пациентов категорически запрещен
		if (staffRole === "marketer" || staffRole === "marketing") {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "patients.export",
				role: staffRole,
				message:
					"Экспорт базы пациентов маркетологам категорически запрещен (152-ФЗ / 323-ФЗ ст. 13).",
			});
		}

		try {
			const dbPatients = await getPatientsFromDb(orgId);
			// Аппаратная очистка от медицинской тайны
			const sanitizedPatients = stripDiagnosisPayload(dbPatients);

			const format = ((request.query as { format?: string })?.format || "json").toLowerCase();
			if (format === "csv") {
				const headers = "id,fullName,phone,birthDate,status,notes,balanceRub\n";
				const rows = sanitizedPatients
					.map((p) => {
						const notesSanitized = p.notes ? sanitizeClinicalString(p.notes) : "";
						return [
							escapeCsvField(p.id),
							escapeCsvField(p.fullName),
							escapeCsvField(p.phone),
							escapeCsvField(p.birthDate),
							escapeCsvField(p.status),
							escapeCsvField(notesSanitized),
							escapeCsvField(p.balanceRub ?? 0),
						].join(",");
					})
					.join("\n");

				reply.header("Content-Type", "text/csv; charset=utf-8");
				reply.header(
					"Content-Disposition",
					`attachment; filename="patients-export-${orgId}.csv"`,
				);
				return reply.send(headers + rows);
			}

			// JSON format
			return reply.code(200).send(
				sanitizedPatients.map((p) => ({
					id: p.id,
					fullName: p.fullName,
					phone: p.phone,
					birthDate: p.birthDate,
					status: p.status,
					notes: p.notes ? sanitizeClinicalString(p.notes) : null,
					balanceRub: p.balanceRub ?? 0,
				})),
			);
		} catch (err) {
			request.log.error({ err }, "[Export] Error exporting patients");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось сформировать экспорт пациентов",
			});
		}
	});

	/**
	 * GET /api/export/leads
	 * Экспорт CRM-лидов.
	 *
	 * 152-ФЗ / 323-ФЗ ст. 13:
	 * Доступен маркетингу и регистратуре, однако любые клинические термины,
	 * диагнозы МКБ-10 и номера зубов в примечаниях (notes) аппаратно маскируются.
	 */
	app.get("/api/export/leads", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "export leads");
		if (!orgId) return;

		try {
			const leads = await db
				.select()
				.from(crmLeads)
				.where(eq(crmLeads.organizationId, orgId));

			const format = ((request.query as { format?: string })?.format || "json").toLowerCase();

			if (format === "csv") {
				const headers = "id,name,phone,source,status,notes,expectedRevenue\n";
				const rows = leads
					.map((lead) => {
						const notesClean = lead.notes ? sanitizeClinicalString(lead.notes) : "";
						return [
							escapeCsvField(lead.id),
							escapeCsvField(lead.name),
							escapeCsvField(lead.phone),
							escapeCsvField(lead.source),
							escapeCsvField(lead.status),
							escapeCsvField(notesClean),
							escapeCsvField(lead.expectedRevenue),
						].join(",");
					})
					.join("\n");

				reply.header("Content-Type", "text/csv; charset=utf-8");
				reply.header(
					"Content-Disposition",
					`attachment; filename="leads-export-${orgId}.csv"`,
				);
				return reply.send(headers + rows);
			}

			// JSON format
			return reply.code(200).send(
				leads.map((lead) => ({
					id: lead.id,
					name: lead.name,
					phone: lead.phone,
					source: lead.source,
					status: lead.status,
					notes: lead.notes ? sanitizeClinicalString(lead.notes) : null,
					expectedRevenue: lead.expectedRevenue,
					createdAt: lead.createdAt,
				})),
			);
		} catch (err) {
			request.log.error({ err }, "[Export] Error exporting leads");
			return reply.code(500).send({
				error: "InternalServerError",
				message: "Не удалось сформировать экспорт лидов",
			});
		}
	});
}
