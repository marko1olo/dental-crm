import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "./client.js";
import * as schema from "./schema.js";
import { withTenantCtx } from "./rls.js";

export interface ImagingMeasurementRecord {
	id: string;
	organizationId: string;
	studyId: string;
	patientId: string;
	toothCode: string | null;
	toothNumber: string | null;
	annotationType: string;
	coordinates: Record<string, unknown>;
	measurements: Record<string, unknown> | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export async function getImagingAnnotationsForStudy(
	organizationId: string,
	studyId: string,
): Promise<ImagingMeasurementRecord[]> {
	return withTenantCtx(organizationId, async () => {
		const records = await db
			.select()
			.from(schema.imagingAnnotations)
			.where(
				and(
					eq(schema.imagingAnnotations.organizationId, organizationId),
					eq(schema.imagingAnnotations.studyId, studyId),
				),
			)
			.orderBy(schema.imagingAnnotations.createdAt);

		return records.map((r) => ({
			id: r.id,
			organizationId: r.organizationId,
			studyId: r.studyId,
			patientId: r.patientId,
			toothCode: r.toothCode,
			toothNumber: r.toothCode,
			annotationType: r.annotationType,
			coordinates: r.coordinates as Record<string, unknown>,
			measurements: r.measurements as Record<string, unknown> | null,
			notes: r.notes,
			createdAt: r.createdAt.toISOString(),
			updatedAt: r.updatedAt.toISOString(),
		}));
	});
}

export async function saveImagingMeasurementsForStudy(
	organizationId: string,
	studyId: string,
	patientId: string,
	measurements: Array<{
		id?: string | undefined;
		toothCode?: string | null | undefined;
		annotationType?: string | undefined;
		coordinates: Record<string, unknown>;
		measurements?: Record<string, unknown> | null | undefined;
		notes?: string | null | undefined;
	}>,
): Promise<ImagingMeasurementRecord[]> {
	return withTenantCtx(organizationId, async () => {
		// Atomic replace for study measurements
		await db
			.delete(schema.imagingAnnotations)
			.where(
				and(
					eq(schema.imagingAnnotations.organizationId, organizationId),
					eq(schema.imagingAnnotations.studyId, studyId),
				),
			);

		if (measurements.length === 0) return [];

		const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		const now = new Date();
		const inserted = await db
			.insert(schema.imagingAnnotations)
			.values(
				measurements.map((m) => ({
					id: m.id && UUID_REGEX.test(m.id) ? m.id : randomUUID(),
					organizationId,
					studyId,
					patientId,
					toothCode: m.toothCode ?? null,
					annotationType: m.annotationType ?? "distance",
					coordinates: m.coordinates,
					measurements: m.measurements ?? null,
					notes: m.notes ?? null,
					createdAt: now,
					updatedAt: now,
				})),
			)
			.returning();

		return inserted.map((r) => ({
			id: r.id,
			organizationId: r.organizationId,
			studyId: r.studyId,
			patientId: r.patientId,
			toothCode: r.toothCode,
			toothNumber: r.toothCode,
			annotationType: r.annotationType,
			coordinates: r.coordinates as Record<string, unknown>,
			measurements: r.measurements as Record<string, unknown> | null,
			notes: r.notes,
			createdAt: r.createdAt.toISOString(),
			updatedAt: r.updatedAt.toISOString(),
		}));
	});
}
