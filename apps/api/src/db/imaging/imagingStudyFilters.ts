import type { ImagingStudy } from "@dental/shared";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { mapImagingStudy } from "./imagingMappers.js";

export interface ImagingStudiesQueryFilters {
	patientId?: string | null | undefined;
	modality?: string | null | undefined;
	bindingStatus?: string | null | undefined;
	search?: string | null | undefined;
	limit?: number | undefined;
	offset?: number | undefined;
}

export async function getImagingStudiesWithFilters(
	organizationId: string,
	filters: ImagingStudiesQueryFilters = {},
): Promise<ImagingStudy[]> {
	const conditions = [eq(schema.imagingStudies.organizationId, organizationId)];

	if (filters.patientId) {
		conditions.push(eq(schema.imagingStudies.patientId, filters.patientId));
	}
	if (filters.modality) {
		conditions.push(sql`lower(${schema.imagingStudies.modality}) = lower(${filters.modality})`);
	}
	if (filters.bindingStatus) {
		conditions.push(eq(schema.imagingStudies.bindingStatus, filters.bindingStatus));
	}
	if (filters.search && filters.search.trim().length > 0) {
		const searchPattern = `%${filters.search.trim().toLowerCase()}%`;
		conditions.push(
			or(
				sql`lower(${schema.imagingStudies.title}) LIKE ${searchPattern}`,
				sql`lower(${schema.imagingStudies.dicomPatientName}) LIKE ${searchPattern}`,
				sql`lower(${schema.patients.fullName}) LIKE ${searchPattern}`,
			)!,
		);
	}

	let query = db
		.select({
			study: schema.imagingStudies,
			patientFullName: schema.patients.fullName,
		})
		.from(schema.imagingStudies)
		.leftJoin(
			schema.patients,
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, schema.imagingStudies.patientId),
			),
		)
		.where(and(...conditions))
		.orderBy(desc(schema.imagingStudies.capturedAt));

	if (filters.limit && filters.limit > 0) {
		query = query.limit(filters.limit) as typeof query;
	}
	if (filters.offset && filters.offset > 0) {
		query = query.offset(filters.offset) as typeof query;
	}

	const rows = await query;
	return rows.map((r) => mapImagingStudy(r.study, r.patientFullName));
}

export async function getImagingStudiesForPatient(
	organizationId: string,
	patientId: string,
): Promise<ImagingStudy[]> {
	return getImagingStudiesWithFilters(organizationId, { patientId });
}

export async function getAllImagingStudies(
	organizationId: string,
): Promise<ImagingStudy[]> {
	return getImagingStudiesWithFilters(organizationId);
}
