import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { generatedDocuments, patientConsents, patients } from "../../db/schema.js";
import type { SaveConsentBody } from "./types.js";

export async function fetchPatientConsentsList(orgId: string, patientId: string) {
	const consents = await db
		.select({
			id: patientConsents.id,
			organizationId: patientConsents.organizationId,
			patientId: patientConsents.patientId,
			kind: patientConsents.kind,
			grantedAt: patientConsents.grantedAt,
			revokedAt: patientConsents.revokedAt,
			documentId: patientConsents.documentId,
		})
		.from(patientConsents)
		.where(
			and(
				eq(patientConsents.organizationId, orgId),
				eq(patientConsents.patientId, patientId),
			),
		)
		.orderBy(desc(patientConsents.grantedAt));

	return consents;
}

export async function recordPatientConsentEntry(
	orgId: string,
	patientId: string,
	body: SaveConsentBody,
) {
	const now = new Date();
	const existing = await db
		.select({ id: patientConsents.id })
		.from(patientConsents)
		.where(
			and(
				eq(patientConsents.organizationId, orgId),
				eq(patientConsents.patientId, patientId),
				eq(patientConsents.kind, body.kind),
			),
		)
		.limit(1);

	if (existing.length > 0 && existing[0]) {
		const [updated] = await db
			.update(patientConsents)
			.set({
				grantedAt: now,
				revokedAt: null,
				documentId: body.documentId ?? null,
			})
			.where(
				and(
					eq(patientConsents.id, existing[0].id),
					eq(patientConsents.organizationId, orgId),
				),
			)
			.returning();
		return updated;
	}

	const [created] = await db
		.insert(patientConsents)
		.values({
			organizationId: orgId,
			patientId,
			kind: body.kind,
			grantedAt: now,
			documentId: body.documentId ?? null,
		})
		.returning();

	return created;
}

export async function syncDocumentToPatientConsent(
	orgId: string,
	patientId: string,
	kind: string,
	docId: string,
	grantedAtDate?: Date,
) {
	const now = grantedAtDate ?? new Date();
	const existing = await db
		.select({ id: patientConsents.id })
		.from(patientConsents)
		.where(
			and(
				eq(patientConsents.organizationId, orgId),
				eq(patientConsents.patientId, patientId),
				eq(patientConsents.kind, kind),
			),
		)
		.limit(1);

	if (existing.length > 0 && existing[0]) {
		await db
			.update(patientConsents)
			.set({ grantedAt: now, revokedAt: null, documentId: docId })
			.where(
				and(
					eq(patientConsents.id, existing[0].id),
					eq(patientConsents.organizationId, orgId),
				),
			);
	} else {
		await db.insert(patientConsents).values({
			organizationId: orgId,
			patientId,
			kind,
			grantedAt: now,
			documentId: docId,
		});
	}
}
