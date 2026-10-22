import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	communicationEvents,
	patientCommunicationConsents,
	patients,
} from "../../../db/schema.js";
import { MessageTemplateEngine } from "../../../services/communications/MessageTemplateEngine.js";
import type { BroadcastCampaignPayload } from "../types.js";

export async function processBroadcastCampaign(
	organizationId: string,
	data: BroadcastCampaignPayload,
) {
	const { templateId, templateText, channel, patientIds, respectConsent } = data;

	let rawText = templateText ?? "";
	if (templateId && !rawText) {
		const templates = await MessageTemplateEngine.listTemplates(organizationId, {
			isActive: true,
		});
		const found = templates.find((t) => t.id === templateId);
		if (found) {
			rawText = found.templateText;
		}
	}

	if (!rawText.trim()) {
		return { error: "TemplateNotFound", message: "Текст рассылки не может быть пустым." };
	}

	const secrecy = MessageTemplateEngine.detectMedicalSecrecyLeaks(rawText);
	if (secrecy.hasLeak) {
		return {
			error: "MedicalSecrecyViolation",
			message: `Массовая рассылка содержит недопустимые клинические сведения: ${secrecy.reasons.join("; ")}`,
			detectedTerms: secrecy.detectedTerms,
		};
	}

	const existingPatients = await db
		.select({
			id: patients.id,
			fullName: patients.fullName,
			phone: patients.phone,
			status: patients.status,
		})
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, organizationId),
				inArray(patients.id, patientIds),
			),
		);

	const activePatients = existingPatients.filter((p) => p.status !== "archived");
	let allowedPatientIds = activePatients.map((p) => p.id);
	let skippedDueToConsentCount = 0;

	if (respectConsent && allowedPatientIds.length > 0) {
		const revokedConsents = await db
			.select({ patientId: patientCommunicationConsents.patientId })
			.from(patientCommunicationConsents)
			.where(
				and(
					eq(patientCommunicationConsents.organizationId, organizationId),
					inArray(patientCommunicationConsents.patientId, allowedPatientIds),
					eq(patientCommunicationConsents.channel, channel as any),
					eq(patientCommunicationConsents.state, "revoked"),
				),
			);

		const revokedSet = new Set(revokedConsents.map((r) => r.patientId));
		const previousCount = allowedPatientIds.length;
		allowedPatientIds = allowedPatientIds.filter((id) => !revokedSet.has(id));
		skippedDueToConsentCount = previousCount - allowedPatientIds.length;
	}

	const eventsToInsert = allowedPatientIds.map((pId) => ({
		organizationId,
		patientId: pId,
		channel: channel as any,
		direction: "outbound" as const,
		status: "queued" as const,
		message: rawText,
	}));

	if (eventsToInsert.length > 0) {
		await db.insert(communicationEvents).values(eventsToInsert);
	}

	return {
		success: true,
		totalRequested: patientIds.length,
		activeRecipients: activePatients.length,
		dispatchedCount: eventsToInsert.length,
		skippedDueToConsentCount,
		skippedArchivedCount: existingPatients.length - activePatients.length,
	};
}
