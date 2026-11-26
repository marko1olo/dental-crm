import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireClinicalReadContext } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	invoiceItems,
	patientInvoices,
	patients,
	treatmentItems,
	visitDiaries,
	visits,
} from "../../db/schema.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { ensureClinicalStaffAccess } from "../../security/tenantContext.js";
import { sendPatientNotFound, sendPatientRouteValidationError } from "./helpers.js";

const recentVisitsParamsSchema = z
	.object({
		patientId: z.string().uuid("Некорректный идентификатор пациента (ожидается UUID)"),
	})
	.strict();

export interface RecentVisitServiceSummary {
	id: string;
	title: string;
	toothCode: string | null;
	serviceCode: string | null;
	quantity: number;
	unitPriceKopecks: number;
	totalPriceKopecks: number;
}

export interface RecentVisitSummaryItem {
	id: string;
	appointmentId: string | null;
	status: string;
	visitDate: string;
	signedAt: string | null;
	diagnosis: string | null;
	complaint: string | null;
	objectiveStatus: string | null;
	treatmentPlan: string | null;
	recommendations: string | null;
	services: RecentVisitServiceSummary[];
}

function extractRecommendations(
	draftAutosave: unknown,
	doctorSummary: string | null,
): string | null {
	if (draftAutosave && typeof draftAutosave === "object") {
		const record = draftAutosave as {
			draft?: { recommendations?: unknown } | null;
			recommendations?: unknown;
		};
		if (
			record.draft &&
			typeof record.draft === "object" &&
			typeof record.draft.recommendations === "string" &&
			record.draft.recommendations.trim().length > 0
		) {
			return record.draft.recommendations.trim();
		}
		if (
			typeof record.recommendations === "string" &&
			record.recommendations.trim().length > 0
		) {
			return record.recommendations.trim();
		}
	}
	if (typeof doctorSummary === "string" && doctorSummary.trim().length > 0) {
		return doctorSummary.trim();
	}
	return null;
}

/**
 * GET /api/patients/:patientId/visits/recent-summary
 * Возвращает до 3 последних завершённых/подписанных визитов пациента для быстрого
 * повторного приёма («Повторить как в прошлый раз»).
 */
export function registerPatientRecentVisitsRoutes(app: FastifyInstance) {
	app.get(
		"/api/patients/:patientId/visits/recent-summary",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"patient recent visits summary",
			);
			if (!context) return reply;
			if (
				!ensureClinicalStaffAccess(
					request,
					reply,
					"сводке недавних приёмов пациента",
				)
			) {
				return reply;
			}
			const orgId = context.organizationId;

			const parsedParams = recentVisitsParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return sendPatientRouteValidationError(reply);
			}
			const { patientId } = parsedParams.data;

			const result = await withTenantCtx(orgId, async (tx) => {
				const [patientRow] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(
						and(
							eq(patients.id, patientId),
							eq(patients.organizationId, orgId),
						),
					)
					.limit(1);

				if (!patientRow) {
					return { kind: "not_found" as const };
				}

				const visitRows = await tx
					.select({
						id: visits.id,
						appointmentId: visits.appointmentId,
						status: visits.status,
						complaint: visits.complaint,
						objectiveStatus: visits.objectiveStatus,
						diagnosis: visits.diagnosis,
						treatmentPlan: visits.treatmentPlan,
						doctorSummary: visits.doctorSummary,
						draftAutosave: visits.draftAutosave,
						signedAt: visits.signedAt,
						createdAt: visits.createdAt,
						updatedAt: visits.updatedAt,
						appointmentStartsAt: appointments.startsAt,
					})
					.from(visits)
					.leftJoin(
						appointments,
						and(
							eq(appointments.id, visits.appointmentId),
							eq(appointments.organizationId, orgId),
						),
					)
					.where(
						and(
							eq(visits.organizationId, orgId),
							eq(visits.patientId, patientId),
							or(
								eq(visits.status, "signed"),
								eq(appointments.status, "completed"),
							),
						),
					)
					.orderBy(
						desc(
							sql`coalesce(${visits.signedAt}, ${appointments.startsAt}, ${visits.updatedAt}, ${visits.createdAt})`,
						),
					)
					.limit(3);

				if (visitRows.length === 0) {
					return { kind: "ok" as const, items: [] as RecentVisitSummaryItem[] };
				}

				const visitIds = visitRows.map((v) => v.id);

				const [diaries, tItems, invoicesRows] = await Promise.all([
					tx
						.select({
							visitId: visitDiaries.visitId,
							complaint: visitDiaries.complaint,
							statusLocalis: visitDiaries.statusLocalis,
							diagnosisIcd10: visitDiaries.diagnosisIcd10,
							treatmentDescription: visitDiaries.treatmentDescription,
						})
						.from(visitDiaries)
						.where(
							and(
								eq(visitDiaries.organizationId, orgId),
								inArray(visitDiaries.visitId, visitIds),
							),
						)
						.orderBy(desc(visitDiaries.createdAt)),
					tx
						.select({
							id: treatmentItems.id,
							visitId: treatmentItems.visitId,
							title: treatmentItems.title,
							toothCode: treatmentItems.toothCode,
							quantity: treatmentItems.quantity,
							unitPriceKopecks: treatmentItems.unitPriceKopecks,
							priceKopecks: treatmentItems.priceKopecks,
						})
						.from(treatmentItems)
						.where(
							and(
								eq(treatmentItems.organizationId, orgId),
								inArray(treatmentItems.visitId, visitIds),
							),
						),
					tx
						.select({
							id: patientInvoices.id,
							visitId: patientInvoices.visitId,
						})
						.from(patientInvoices)
						.where(
							and(
								eq(patientInvoices.organizationId, orgId),
								inArray(patientInvoices.visitId, visitIds),
							),
						),
				]);

				const invoiceIds = invoicesRows.map((inv) => inv.id);
				const invItems =
					invoiceIds.length > 0
						? await tx
								.select({
									id: invoiceItems.id,
									invoiceId: invoiceItems.invoiceId,
									name: invoiceItems.name,
									toothCode: invoiceItems.toothCode,
									serviceCode: invoiceItems.serviceCode,
									quantity: invoiceItems.quantity,
									unitPriceKopecks: invoiceItems.unitPriceKopecks,
									totalPriceKopecks: invoiceItems.totalPriceKopecks,
								})
								.from(invoiceItems)
								.where(
									and(
										eq(invoiceItems.organizationId, orgId),
										inArray(invoiceItems.invoiceId, invoiceIds),
									),
								)
						: [];

				const invoiceToVisitId = new Map<string, string>();
				for (const inv of invoicesRows) {
					if (inv.visitId) {
						invoiceToVisitId.set(inv.id, inv.visitId);
					}
				}

				const diaryByVisitId = new Map<
					string,
					(typeof diaries)[number]
				>();
				for (const d of diaries) {
					if (!diaryByVisitId.has(d.visitId)) {
						diaryByVisitId.set(d.visitId, d);
					}
				}

				const servicesByVisitId = new Map<string, RecentVisitServiceSummary[]>();
				for (const ti of tItems) {
					if (!ti.visitId) continue;
					const list = servicesByVisitId.get(ti.visitId) ?? [];
					list.push({
						id: ti.id,
						title: ti.title,
						toothCode: ti.toothCode ?? null,
						serviceCode: null,
						quantity: Number(ti.quantity ?? 1) || 1,
						unitPriceKopecks: Number(ti.unitPriceKopecks ?? 0),
						totalPriceKopecks: Number(ti.priceKopecks ?? 0),
					});
					servicesByVisitId.set(ti.visitId, list);
				}

				for (const ii of invItems) {
					const targetVisitId = invoiceToVisitId.get(ii.invoiceId);
					if (!targetVisitId) continue;
					// Если по визиту не было treatmentItems — дополняем позициями из счёта визита
					const existingList = servicesByVisitId.get(targetVisitId) ?? [];
					if (!tItems.some((ti) => ti.visitId === targetVisitId)) {
						existingList.push({
							id: ii.id,
							title: ii.name,
							toothCode: ii.toothCode ?? null,
							serviceCode: ii.serviceCode ?? null,
							quantity: Number(ii.quantity ?? 1) || 1,
							unitPriceKopecks: Number(ii.unitPriceKopecks ?? 0),
							totalPriceKopecks: Number(ii.totalPriceKopecks ?? 0),
						});
						servicesByVisitId.set(targetVisitId, existingList);
					}
				}

				const items: RecentVisitSummaryItem[] = visitRows.map((v) => {
					const diary = diaryByVisitId.get(v.id);
					const rawDate =
						v.signedAt ??
						v.appointmentStartsAt ??
						v.updatedAt ??
						v.createdAt;
					return {
						id: v.id,
						appointmentId: v.appointmentId ?? null,
						status: v.status,
						visitDate:
							rawDate instanceof Date
								? rawDate.toISOString()
								: String(rawDate),
						signedAt: v.signedAt ? v.signedAt.toISOString() : null,
						diagnosis: v.diagnosis || diary?.diagnosisIcd10 || null,
						complaint: v.complaint || diary?.complaint || null,
						objectiveStatus: v.objectiveStatus || diary?.statusLocalis || null,
						treatmentPlan:
							v.treatmentPlan || diary?.treatmentDescription || null,
						recommendations: extractRecommendations(
							v.draftAutosave,
							v.doctorSummary ?? null,
						),
						services: servicesByVisitId.get(v.id) ?? [],
					};
				});

				return { kind: "ok" as const, items };
			});

			if (result.kind === "not_found") {
				return sendPatientNotFound(reply);
			}

			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				patientId,
				action: "VIEW_PATIENT_RECENT_VISITS_SUMMARY",
			});

			return reply.code(200).send({
				success: true,
				patientId,
				data: result.items,
				visits: result.items,
			});
		},
	);
}
