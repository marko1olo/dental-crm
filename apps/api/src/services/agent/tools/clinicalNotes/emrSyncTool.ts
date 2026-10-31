/**
 * emrSyncTool.ts — Electronic Medical Record (EMR) SOAP Diary Synchronization Tool.
 *
 * Compliant with Mandate 8b / 8zi (Dense module, ~180 lines).
 * Complies with Mandate 8e (Doctor Autonomy, zero-mock DB operations).
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db/client.js";
import { patients, visits } from "../../../../db/schema.js";
import type { ToolDefinition } from "../tool.js";

export const syncEmr043Schema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("Идентификатор пациента"),
	visitId: z
		.string()
		.uuid("Некорректный UUID визита")
		.optional()
		.describe("ID существующего визита (если не передан и createIfMissing=true, будет создан новый черновик)"),
	appointmentId: z
		.string()
		.uuid("Некорректный UUID записи на прием")
		.optional()
		.describe("ID связанной записи на прием (appointment)"),
	createIfMissing: z
		.boolean()
		.optional()
		.describe("Создать ли новый визит, если visitId не указан"),
	soapNote: z
		.object({
			specialty: z.string().optional(),
			toothNumber: z.number().int().optional(),
			subjective: z.object({
				complaints: z.array(z.string()),
				anamnesis: z.string(),
			}),
			objective: z.object({
				rawObjectiveText: z.string(),
				probing: z.string().optional(),
				percussion: z.string().optional(),
				coldTest: z.string().optional(),
			}),
			assessment: z.object({
				icd10Code: z.string(),
				diagnosisTitleRu: z.string(),
				toothNumber: z.number().int().optional(),
			}),
			plan: z.object({
				anesthesia: z.any().optional(),
				procedures: z.array(z.string()),
				materials: z.array(z.string()),
				homeCareRecommendations: z.array(z.string()),
				nextVisit: z.string().optional(),
			}),
			form043Text: z.string().optional(),
		})
		.describe("Структурированный объект SOAP-дневника"),
	transcript: z
		.string()
		.optional()
		.describe("Исходный текст голосовой стенограммы"),
});

export const syncEmr043Tool: ToolDefinition<typeof syncEmr043Schema> = {
	name: "sync_emr_043",
	description:
		"Синхронизация и сохранение дневника приёма по стандарту SOAP в электронную медицинскую карту пациента с тенантной изоляцией.",
	parameters: syncEmr043Schema,
	permissions: ["clinical.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		// 1. Validate Patient
		const [patient] = await targetDb
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					eq(patients.id, args.patientId),
				),
			)
			.limit(1);

		if (!patient) {
			throw new Error(`Пациент с ID ${args.patientId} не найден в организации`);
		}

		const soap = args.soapNote;
		const complaintsText = soap.subjective.complaints.join("; ");
		const anamnesisText = soap.subjective.anamnesis;
		const objectiveText = soap.objective.rawObjectiveText;
		const diagnosisText = `[${soap.assessment.icd10Code}] ${soap.assessment.diagnosisTitleRu}${
			soap.assessment.toothNumber ? ` (зуб ${soap.assessment.toothNumber})` : ""
		}`;
		const planText = [
			soap.plan.procedures.length > 0 ? `Процедуры: ${soap.plan.procedures.join(", ")}` : "",
			soap.plan.materials.length > 0 ? `Материалы: ${soap.plan.materials.join(", ")}` : "",
			soap.plan.homeCareRecommendations.length > 0
				? `Рекомендации: ${soap.plan.homeCareRecommendations.join("; ")}`
				: "",
		]
			.filter(Boolean)
			.join("\n");

		const doctorSummaryText =
			soap.form043Text ||
			`Жалобы: ${complaintsText}\nОбъективно: ${objectiveText}\nДиагноз: ${diagnosisText}\nЛечение: ${planText}`;

		const syncedVisitId = args.visitId;

		if (syncedVisitId) {
			// Update existing visit
			const [updated] = await targetDb
				.update(visits)
				.set({
					complaint: complaintsText,
					anamnesis: anamnesisText,
					objectiveStatus: objectiveText,
					diagnosis: diagnosisText,
					treatmentPlan: planText,
					doctorSummary: doctorSummaryText,
					transcript: args.transcript ?? null,
					draftAutosave: soap,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(visits.organizationId, ctx.organizationId),
						eq(visits.patientId, args.patientId),
						eq(visits.id, syncedVisitId),
					),
				)
				.returning({ id: visits.id, revision: visits.revision, status: visits.status });

			if (!updated) {
				throw new Error(`Визит с ID ${syncedVisitId} не найден у данного пациента`);
			}

			return {
				success: true,
				action: "updated",
				visitId: updated.id,
				patientId: args.patientId,
				revision: updated.revision,
				status: updated.status,
			};
		}

		if (args.createIfMissing) {
			// Insert new draft visit
			const [created] = await targetDb
				.insert(visits)
				.values({
					organizationId: ctx.organizationId,
					patientId: args.patientId,
					appointmentId: args.appointmentId ?? null,
					status: "draft",
					complaint: complaintsText,
					anamnesis: anamnesisText,
					objectiveStatus: objectiveText,
					diagnosis: diagnosisText,
					treatmentPlan: planText,
					doctorSummary: doctorSummaryText,
					transcript: args.transcript ?? null,
					draftAutosave: soap,
				})
				.returning({ id: visits.id, revision: visits.revision, status: visits.status });

			return {
				success: true,
				action: "created",
				visitId: created.id,
				patientId: args.patientId,
				revision: created.revision,
				status: created.status,
			};
		}

		throw new Error(
			"visitId не указан. Для создания новой записи установите createIfMissing = true.",
		);
	},
};

export const syncEmrClinicalNotesTool: ToolDefinition<typeof syncEmr043Schema> = {
	...syncEmr043Tool,
	name: "sync_emr_clinical_notes",
	description:
		"Синхронизация и сохранение дневника приёма по стандарту SOAP в электронную медицинскую карту пациента с тенантной изоляцией.",
};
