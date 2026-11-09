/**
 * leadConsentBridge.ts — Sync communication consents on lead conversion.
 * Mandate 8b (Strict <= 80 lines). Mandate 8e & 8n (Solo Doctor Autonomy & Relational Truth).
 */

import { sql } from "drizzle-orm";
import type { db } from "../../db/client.js";
import { patientCommunicationConsents } from "../../db/schema.js";

import type { DbExecutor } from "./patientCreationBridge.js";

export interface LeadConsentParams {
	organizationId: string;
	patientId: string;
	consentMedical?: boolean | null | undefined;
	consentMarketing?: boolean | null | undefined;
	decidedByUserId?: string | null | undefined;
}

export async function saveLeadCommunicationConsents(
	tx: DbExecutor,
	params: LeadConsentParams,
): Promise<void> {
	const { organizationId, patientId, consentMedical, consentMarketing, decidedByUserId } = params;
	const now = new Date();
	const channels = ["sms", "phone", "whatsapp"] as const;

	type ConsentEntry = typeof patientCommunicationConsents.$inferInsert;
	const entries: ConsentEntry[] = [];

	if (consentMedical !== undefined && consentMedical !== null) {
		const state = consentMedical ? "granted" : "revoked";
		for (const channel of channels) {
			entries.push({
				organizationId,
				patientId,
				channel,
				scope: "service",
				state,
				source: "lead_conversion",
				decidedByUserId: decidedByUserId || null,
				decidedAt: now,
				updatedAt: now,
			});
		}
	}

	if (consentMarketing !== undefined && consentMarketing !== null) {
		const state = consentMarketing ? "granted" : "revoked";
		for (const channel of channels) {
			entries.push({
				organizationId,
				patientId,
				channel,
				scope: "marketing",
				state,
				source: "lead_conversion",
				decidedByUserId: decidedByUserId || null,
				decidedAt: now,
				updatedAt: now,
			});
		}
	}

	if (entries.length === 0) return;

	await tx
		.insert(patientCommunicationConsents)
		.values(entries)
		.onConflictDoUpdate({
			target: [
				patientCommunicationConsents.organizationId,
				patientCommunicationConsents.patientId,
				patientCommunicationConsents.channel,
				patientCommunicationConsents.scope,
			],
			set: {
				state: sql`EXCLUDED.state`,
				source: sql`EXCLUDED.source`,
				decidedByUserId: sql`EXCLUDED.decided_by_user_id`,
				decidedAt: now,
				updatedAt: now,
			},
		});
}
