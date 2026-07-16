import { eq, and } from "drizzle-orm";
import { db } from "./client.js";
import * as schema from "./schema.js";

export async function getProtocolTemplatesFromDb(organizationId: string) {
	return db
		.select()
		.from(schema.protocolTemplates)
		.where(eq(schema.protocolTemplates.organizationId, organizationId));
}

export async function createProtocolTemplateInDb(
	organizationId: string,
	data: {
		specialty: string;
		title: string;
		visitReason: string;
		defaultDurationMinutes: number;
		complaintPrompt?: string;
		objectiveTemplate?: string;
		diagnosisHints?: any;
		treatmentPlanTemplate?: string;
		requiredDocuments?: any;
		suggestedImaging?: any;
		safetyWarnings?: any;
	},
) {
	const [inserted] = await db
		.insert(schema.protocolTemplates)
		.values({
			organizationId,
			specialty: data.specialty as any,
			title: data.title,
			visitReason: data.visitReason,
			defaultDurationMinutes: data.defaultDurationMinutes,
			complaintPrompt: data.complaintPrompt || "",
			objectiveTemplate: data.objectiveTemplate || "",
			diagnosisHints: data.diagnosisHints || [],
			treatmentPlanTemplate: data.treatmentPlanTemplate || "",
			requiredDocuments: data.requiredDocuments || [],
			suggestedImaging: data.suggestedImaging || [],
			safetyWarnings: data.safetyWarnings || [],
		})
		.returning();
	return inserted;
}

export async function updateProtocolTemplateInDb(
	organizationId: string,
	templateId: string,
	data: Partial<{
		specialty: string;
		title: string;
		visitReason: string;
		defaultDurationMinutes: number;
		complaintPrompt: string;
		objectiveTemplate: string;
		diagnosisHints: any;
		treatmentPlanTemplate: string;
		requiredDocuments: any;
		suggestedImaging: any;
		safetyWarnings: any;
	}>,
) {
	const [updated] = await db
		.update(schema.protocolTemplates)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(schema.protocolTemplates.id, templateId),
				eq(schema.protocolTemplates.organizationId, organizationId),
			),
		)
		.returning();
	return updated;
}

export async function deleteProtocolTemplateInDb(
	organizationId: string,
	templateId: string,
) {
	await db
		.delete(schema.protocolTemplates)
		.where(
			and(
				eq(schema.protocolTemplates.id, templateId),
				eq(schema.protocolTemplates.organizationId, organizationId),
			),
		);
}
