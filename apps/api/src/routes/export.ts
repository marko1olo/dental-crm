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

import { Readable } from "node:stream";
import { rublesToKopecks } from "@dental/shared";
import { asc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { defineStreamRoute } from "../core/routeFactories.js";
import { getPatientsFromDb } from "../db/patientsQuery.js";
import { handleExportPricelist } from "./pricelist/handlersExportAndReprice.js";
import { crmLeads } from "../db/schema.js";
import {
	fetchRoleMatrixOverrides,
	permissionRefusalMessage,
	roleHasPermissionWithOverrides,
} from "../security/permissionsModules/index.js";
import {
	sanitizeClinicalString,
	stripDiagnosisPayload,
} from "../security/medicalSecrecyWarden.js";

const EXPORT_BATCH_SIZE = 500;

const exportFormatQuerySchema = z.object({
	format: z.string().optional(),
});

function escapeCsvField(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "number") {
		return Number.isFinite(value) ? String(value) : "";
	}
	const raw = String(value);
	// Neutralize CSV/Excel formula injection (=, +, @, leading tab/CR, or non-numeric leading -)
	const safe =
		/^[\t\r]*[=+@]/.test(raw) || /^[\t\r]*-(?!\d+(?:[.,]\d+)?$)/.test(raw)
			? `'${raw}`
			: raw;
	if (safe.includes(",") || safe.includes('"') || safe.includes("\n") || safe.includes("\r")) {
		return `"${safe.replace(/"/g, '""')}"`;
	}
	return safe;
}

export async function registerExportRoutes(app: FastifyInstance) {
	/**
	 * GET /api/export/patients
	 * Экспорт картотеки пациентов (потоковый CSV батчами по 500 строк).
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/export/patients",
		querySchema: exportFormatQuerySchema,
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		permission: {
			customCheck: async (principal, _request, reply) => {
				if (principal.role === "marketer" || principal.role === "marketing") {
					reply.code(403).send({
						error: "PermissionDenied",
						permission: "patients.export",
						role: principal.role,
						message:
							"Экспорт базы пациентов маркетологам категорически запрещен (152-ФЗ / 323-ФЗ ст. 13).",
					});
					return false;
				}
				if (
					principal.authMode === "admin_secret" ||
					principal.authMode === "clinic_token"
				) {
					return true;
				}
				const overrides = await fetchRoleMatrixOverrides(principal.organizationId);
				if (roleHasPermissionWithOverrides(principal.role, "patients.read", overrides)) {
					return true;
				}
				reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.read",
					role: principal.role,
					message: permissionRefusalMessage(principal.role, "patients.read"),
				});
				return false;
			},
		},
		handler: async ({ organizationId, query, runReadTx, request, reply }) => {
			if (!organizationId) {
				return reply.code(401).send({ error: "Unauthorized", message: "Контекст клиники не определён." });
			}
			const orgId = organizationId;
			try {
				const format = (query?.format || "json").toLowerCase();
				if (format === "csv") {
					reply.header("Content-Type", "text/csv; charset=utf-8");
					reply.header(
						"Content-Disposition",
						`attachment; filename="patients-export-${orgId}.csv"`,
					);

					const csvStream = Readable.from(
						(async function* () {
							yield "\uFEFFid,fullName,phone,birthDate,status,notes,balanceRub\n";
							let offset = 0;
							let isFirstRow = true;

							while (true) {
								const batch = await runReadTx((tx) =>
									getPatientsFromDb(
										orgId,
										{
											limit: EXPORT_BATCH_SIZE,
											offset,
										},
										tx,
									),
								);
								if (batch.length === 0) break;

								const sanitizedPatients = stripDiagnosisPayload(batch, {
									strict: true,
								});
								const lines: string[] = [];
								for (const p of sanitizedPatients) {
									const notesSanitized = p.notes
										? sanitizeClinicalString(p.notes, { strict: true })
										: "";
									const line = [
										escapeCsvField(p.id),
										escapeCsvField(p.fullName),
										escapeCsvField(p.phone),
										escapeCsvField(p.birthDate),
										escapeCsvField(p.status),
										escapeCsvField(notesSanitized),
										escapeCsvField(p.balanceRub ?? 0),
									].join(",");
									lines.push(isFirstRow ? line : `\n${line}`);
									isFirstRow = false;
								}
								if (lines.length > 0) {
									yield lines.join("");
								}

								if (batch.length < EXPORT_BATCH_SIZE) break;
								offset += batch.length;
							}
						})(),
					);

					return reply.send(csvStream);
				}

				const dbPatients = await runReadTx((tx) =>
					getPatientsFromDb(orgId, {}, tx),
				);
				const sanitizedPatients = stripDiagnosisPayload(dbPatients, { strict: true });

				return reply.code(200).send({
					success: true,
					data: sanitizedPatients.map((p) => ({
						id: p.id,
						fullName: p.fullName,
						phone: p.phone,
						birthDate: p.birthDate,
						status: p.status,
						notes: p.notes ? sanitizeClinicalString(p.notes, { strict: true }) : null,
						balanceRub: p.balanceRub ?? 0,
						balanceKopecks: rublesToKopecks(p.balanceRub ?? 0),
					})),
				});
			} catch (err) {
				request.log.error({ err }, "[Export] Error exporting patients");
				return reply.code(500).send({
					error: "InternalServerError",
					message: "Не удалось сформировать экспорт пациентов",
				});
			}
		},
	});

	/**
	 * GET /api/export/leads
	 * Экспорт CRM-лидов (потоковый CSV батчами по 500 строк).
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/export/leads",
		querySchema: exportFormatQuerySchema,
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		permission: {
			customCheck: async (principal, _request, reply) => {
				if (
					principal.role === "marketer" ||
					principal.role === "marketing" ||
					principal.authMode === "admin_secret" ||
					principal.authMode === "clinic_token"
				) {
					return true;
				}
				const overrides = await fetchRoleMatrixOverrides(principal.organizationId);
				if (
					roleHasPermissionWithOverrides(principal.role, "communications.read", overrides) ||
					roleHasPermissionWithOverrides(principal.role, "patients.read", overrides)
				) {
					return true;
				}
				reply.code(403).send({
					error: "PermissionDenied",
					permission: "communications.read",
					role: principal.role,
					message: permissionRefusalMessage(principal.role, "communications.read"),
				});
				return false;
			},
		},
		handler: async ({ organizationId, query, runReadTx, request, reply }) => {
			if (!organizationId) {
				return reply.code(401).send({ error: "Unauthorized", message: "Контекст клиники не определён." });
			}
			const orgId = organizationId;
			try {
				const format = (query?.format || "json").toLowerCase();

				if (format === "csv") {
					reply.header("Content-Type", "text/csv; charset=utf-8");
					reply.header(
						"Content-Disposition",
						`attachment; filename="leads-export-${orgId}.csv"`,
					);

					const csvStream = Readable.from(
						(async function* () {
							yield "\uFEFFid,name,phone,source,status,notes,expectedRevenue\n";
							let offset = 0;
							let isFirstRow = true;

							while (true) {
								const batch = await runReadTx((tx) =>
									tx
										.select()
										.from(crmLeads)
										.where(eq(crmLeads.organizationId, orgId))
										.orderBy(asc(crmLeads.createdAt), asc(crmLeads.id))
										.limit(EXPORT_BATCH_SIZE)
										.offset(offset),
								);
								if (batch.length === 0) break;

								const lines: string[] = [];
								for (const lead of batch) {
									const notesClean = lead.notes
										? sanitizeClinicalString(lead.notes, { strict: true })
										: "";
									const line = [
										escapeCsvField(lead.id),
										escapeCsvField(lead.name),
										escapeCsvField(lead.phone),
										escapeCsvField(lead.source),
										escapeCsvField(lead.status),
										escapeCsvField(notesClean),
										escapeCsvField(lead.expectedRevenue),
									].join(",");
									lines.push(isFirstRow ? line : `\n${line}`);
									isFirstRow = false;
								}
								if (lines.length > 0) {
									yield lines.join("");
								}

								if (batch.length < EXPORT_BATCH_SIZE) break;
								offset += batch.length;
							}
						})(),
					);

					return reply.send(csvStream);
				}

				const leads = await runReadTx((tx) =>
					tx
						.select()
						.from(crmLeads)
						.where(eq(crmLeads.organizationId, orgId)),
				);

				return reply.code(200).send({
					success: true,
					data: leads.map((lead) => ({
						id: lead.id,
						name: lead.name,
						phone: lead.phone,
						source: lead.source,
						status: lead.status,
						notes: lead.notes ? sanitizeClinicalString(lead.notes, { strict: true }) : null,
						expectedRevenue: lead.expectedRevenue,
						createdAt: lead.createdAt,
					})),
				});
			} catch (err) {
				request.log.error({ err }, "[Export] Error exporting leads");
				return reply.code(500).send({
					error: "InternalServerError",
					message: "Не удалось сформировать экспорт лидов",
				});
			}
		},
	});

	/**
	 * GET /api/export/pricelist
	 * Канонический экспорт прейскуранта услуг клиники.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/export/pricelist",
		permission: "public",
		handler: async ({ request, reply }) => {
			return handleExportPricelist(request, reply);
		},
	});
}
